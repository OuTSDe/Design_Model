// Smoke test for the Design Engine (used by GitHub Actions; also runs locally with `npm test`).
// Starts the engine against an empty, temporary Design_Model folder, then checks the main API end to end.
// Codex is not needed: jobs are not run, only queued and inspected.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'design-model-'))
const B = 'http://localhost:4317'
let failed = 0
const ok = (cond, msg) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) failed++ }
const j = async (url, opt = {}) => { const r = await fetch(B + url, { ...opt, headers: { 'content-type': 'application/json', ...(opt.headers || {}) } }); return { status: r.status, body: await r.json().catch(() => ({})) } }

const engine = spawn(process.execPath, [path.join(here, 'server.mjs')], { env: { ...process.env, DESIGN_MODEL: tmp }, stdio: ['ignore', 'pipe', 'pipe'] })
let out = ''; engine.stdout.on('data', (d) => (out += d)); engine.stderr.on('data', (d) => (out += d))
const stop = (code) => { engine.kill(); fs.rmSync(tmp, { recursive: true, force: true }); process.exit(code) }
setTimeout(() => { console.log('timed out\n' + out); stop(1) }, 60000)

for (let i = 0; i < 40 && !/Design Engine on/.test(out); i++) await new Promise((r) => setTimeout(r, 250))
try {
  const h = await j('/api/health'); ok(h.status === 200 && h.body.engine, `engine answers (${h.body.engine})`)
  const v = await j('/api/vocabulary'); ok(Array.isArray(v.body) && v.body.length >= 13, `vocabulary seeded (${v.body.length} styles)`)
  const t = await j('/api/taxonomy'); const chair = t.body.nodes?.find((n) => n.id === 'furniture/seating/chair'); const tile = t.body.nodes?.find((n) => n.id === 'surfaces/tiles/floor-tile')
  ok(t.body.nodes?.length > 50, `taxonomy (${t.body.nodes?.length} folders)`)
  ok(chair && ['front', 'side', 'axo', 'material'].every((k) => chair.slots.some((s) => s.key === k && s.required)), 'chair needs front, side, three-quarter and material images')
  ok(tile && ['face', 'seamless', 'reflection'].every((k) => tile.slots.some((s) => s.key === k)), 'tile needs face, seamless and reflection images')
  const vd = await j('/api/vendors', { method: 'POST', body: JSON.stringify({ name: 'Smoke Test Vendor', city: 'Mangaluru', categories: 'Furniture' }) }); ok(vd.body.id === 'smoke-test-vendor', 'vendor created')
  const a = await j('/api/assets', { method: 'POST', body: JSON.stringify({ category: 'furniture/seating/chair', vendor_id: 'smoke-test-vendor', fields: { name: 'Test chair', price_inr: '12,000', price_unit: 'piece', width_mm: 450 } }) })
  ok(a.body.id && a.body.price_inr === 12000, 'asset created, price parsed')
  ok(fs.existsSync(path.join(tmp, 'Library', 'Furniture', 'Seating', 'Chair', a.body.id, 'asset.json')), 'asset stored in Library/Furniture/Seating/Chair')
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
  const fd = new FormData(); fd.append('files', new Blob([png], { type: 'image/png' }), 'front.png')
  const up = await fetch(`${B}/api/assets/${a.body.id}/images/front`, { method: 'POST', body: fd }); ok(up.status === 200, 'front image uploaded')
  const full = await j('/api/assets/' + a.body.id); ok(full.body.slots?.find((s) => s.key === 'front')?.original, 'front image listed on the asset')
  ok(full.body.missing?.includes('Side view'), 'missing views reported')
  const list = await j('/api/assets?cat=furniture'); ok(list.body.length === 1, 'asset found in the Furniture folder')
  const vl = await j('/api/vendors'); ok(vl.body.find((x) => x.id === 'smoke-test-vendor')?.assetCount === 1, 'vendor library counts the asset')
  const q = await j(`/api/assets/${a.body.id}/codex`, { method: 'POST', body: JSON.stringify({ kind: 'tag' }) }); ok(q.body.id, 'Codex tag job queued')
  const jobs = await j('/api/jobs'); ok(jobs.body.some((x) => x.type === 'asset-tag'), 'job listed')
  const bad = await fetch(B + '/api/vendors', { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, body: '{"name":"x"}' }); ok(bad.status === 403, 'other websites are refused')
} catch (e) { ok(false, 'error: ' + e.message); console.log(out) }
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed')
stop(failed ? 1 : 0)
