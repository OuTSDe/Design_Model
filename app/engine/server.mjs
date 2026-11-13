// Accord Design Engine · local engine server (OuTSDe)
// Runs on the design PC. The web UI cannot start Codex CLI or touch Drive files, so this does it:
//   - reads clients, residences and Accord experience sessions from the nightly Accord export (read-only, no money or contact fields)
//   - keeps projects, rooms, references, vocabulary and the job log as plain files inside Design_Model
//   - runs Codex CLI jobs (codex exec) one at a time, with images attached, and records every input and output
// Nothing outside Design_Model is written.

import express from 'express'
import multer from 'multer'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import os from 'node:os'
import XLSX from 'xlsx'
import { STYLES, briefFor, styleMdFor, roomsFor } from './seed.mjs'
import { createAssets } from './assets.mjs'
import { createCrm } from './crm.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const APP = path.resolve(HERE, '..')
// Design_Model: the folder that holds app/, or DESIGN_MODEL when the launcher runs the app from a local copy
// (npm cannot install into the Google Drive H: disk, so the code runs from C: and the data stays in Drive).
const ROOT = process.env.DESIGN_MODEL ? path.resolve(process.env.DESIGN_MODEL) : path.resolve(APP, '..')
const CFG = JSON.parse(fs.readFileSync(path.join(HERE, 'config.json'), 'utf8'))
const EXPORT = path.resolve(ROOT, CFG.accordExport)
const DIR = { vocab: path.join(ROOT, 'Vocabulary'), styles: path.join(ROOT, 'Vocabulary', 'styles'), projects: path.join(ROOT, 'Projects'),
  library: path.join(ROOT, 'Library'), vendors: path.join(ROOT, 'Vendors'), state: path.join(ROOT, '.engine') }
const IMG = /\.(png|jpe?g|webp|gif|avif)$/i

/* ── small file helpers ─────────────────────────────────────── */
const ensure = (p) => fs.mkdirSync(p, { recursive: true })
const readJson = (p, dflt = null) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return dflt } }
const writeJson = (p, v) => { ensure(path.dirname(p)); fs.writeFileSync(p + '.tmp', JSON.stringify(v, null, 2)); fs.renameSync(p + '.tmp', p) }
const readText = (p, dflt = '') => { try { return fs.readFileSync(p, 'utf8') } catch { return dflt } }
const safe = (s) => String(s || '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80)
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
const now = () => new Date().toISOString()
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/')
const fileUrl = (p) => '/files/' + rel(p).split('/').map(encodeURIComponent).join('/')
const inside = (base, p) => { const r = path.relative(base, p); return r && !r.startsWith('..') && !path.isAbsolute(r) }
const images = (dir) => { try { return fs.readdirSync(dir).filter((f) => IMG.test(f)).sort().map((f) => ({ name: f, url: fileUrl(path.join(dir, f)), path: path.join(dir, f) })) } catch { return [] } }

const A = createAssets({ ROOT, DIR, ensure, readJson, writeJson, safe, slug, now, rel, fileUrl, IMG })

/* ── first run: vocabulary and folders ──────────────────────── */
function seedVocabulary() {
  ;[DIR.styles, DIR.projects, DIR.library, DIR.vendors, DIR.state].forEach(ensure)
  const sj = path.join(DIR.vocab, 'styles.json')
  if (!fs.existsSync(sj)) writeJson(sj, { note: 'The Accord styles. category 2 = shared furniture pool. Edit names or add styles here; each id has a folder in styles/.', styles: STYLES })
  const all = flatStyles()
  for (const s of all) {
    const d = path.join(DIR.styles, s.id); ensure(path.join(d, 'render-ref')); ensure(path.join(d, 'moodboard-ref'))
    if (!fs.existsSync(path.join(d, 'brief.md'))) fs.writeFileSync(path.join(d, 'brief.md'), briefFor(s))
    if (!fs.existsSync(path.join(d, 'style.md'))) fs.writeFileSync(path.join(d, 'style.md'), styleMdFor(s))
  }
  A.seed()
  const readme = path.join(ROOT, 'README.md')
  if (!fs.existsSync(readme)) fs.writeFileSync(readme, '# Design_Model\n\nThe Accord Design Engine. See DESIGN_ENGINE_SPEC.md, and app/README.md to run it.\n')
}
function flatStyles() {
  const list = readJson(path.join(DIR.vocab, 'styles.json'), { styles: STYLES }).styles || STYLES
  const out = []
  list.forEach((s) => { out.push({ ...s, parent: null }); (s.subs || []).forEach((x) => out.push({ ...x, category: s.category, parent: s.id })) })
  return out
}

/* ── Accord export (read-only) ──────────────────────────────── */
let accordCache = { mtime: 0, data: null }
function sheetRows(wb, name) {
  const ws = wb.Sheets[name]; if (!ws) return []
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
  const keys = rows[1] || []
  return rows.slice(2).map((r) => { const o = {}; keys.forEach((k, i) => { if (k) o[k] = r[i] })
    if (o._extra) { try { Object.assign(o, JSON.parse(o._extra)) } catch { /* */ } delete o._extra }
    return o })
}
// the bookings and experience sessions a designer may see: from the test CRM on this server when it has data, else from the Accord export
const readAccord = () => crmLink?.accord() || readAccordExport()
function readAccordExport() {
  let st; try { st = fs.statSync(EXPORT) } catch { return { ok: false, path: EXPORT, error: 'Accord export not found. Check accordExport in engine/config.json.', clients: [], sessions: [] } }
  if (accordCache.data && accordCache.mtime === st.mtimeMs) return accordCache.data
  const wb = XLSX.read(fs.readFileSync(EXPORT), { type: 'buffer' })
  const units = {}; sheetRows(wb, 'units').forEach((u) => { if (u.unit) units[String(u.unit)] = u })
  // only what a designer needs: no phone, e-mail, address, PAN, money
  const clients = sheetRows(wb, 'clients').filter((c) => c.bookingId && c.unit).map((c) => {
    const u = units[String(c.unit)] || {}
    return { bookingId: c.bookingId, clientId: c.clientId, unit: String(c.unit), title: c.title || '', name: c.name || '', status: c.status || '', owner: c.owner || '',
      occupant: c.occupant || '', familyProfile: c.familyProfile || '', purpose: c.purpose || '', type: u.type || c.config || '', area: u.area || '', floor: u.floor ?? Math.floor(Number(c.unit) / 100), pos: u.pos || '', band: u.band || '' }
  }).sort((a, b) => Number(a.unit) - Number(b.unit))
  const sessions = sheetRows(wb, 'accordSessions').filter((s) => s.id).map((s) => ({ id: s.id, buyer: s.buyer, unitRef: s.unitRef, recordId: s.recordId, residence: s.residence,
    persona: s.persona || '', palette: s.palette || '', register: s.register || '', coherence: s.coherence ?? '', configId: s.configId || '', screen: s.screen || '', by: s.by || '', unit: s.unit || '', floor: s.floor || '', updatedAt: s.updatedAt || s.startedAt || '' }))
  const data = { ok: true, path: EXPORT, exportedAt: new Date(st.mtimeMs).toISOString(), clients, sessions }
  accordCache = { mtime: st.mtimeMs, data }
  return data
}
const sessionsOf = (acc, c) => acc.sessions.filter((s) => (c.clientId && s.recordId === c.clientId) || String(s.unitRef || '').replace(/\D/g, '') === String(c.unit))
  .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))

/* ── projects ───────────────────────────────────────────────── */
const projDir = (id) => { const d = path.join(DIR.projects, id); if (!inside(DIR.projects, d)) throw new Error('Bad project id'); return d }
const roomDir = (pid, rid) => path.join(projDir(pid), 'rooms', slug(rid))
function listProjects() {
  ensure(DIR.projects)
  return fs.readdirSync(DIR.projects, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => readJson(path.join(DIR.projects, d.name, 'project.json'))).filter(Boolean)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
}
function productView(x) {
  const dir = path.join(DIR.vendors, x.dir || '')
  return { ...x, imageUrls: (x.images || []).filter((f) => fs.existsSync(path.join(dir, f))).map((f) => ({ name: f, url: fileUrl(path.join(dir, f)) })) }
}
function hydrate(p) {
  const rooms = p.rooms.map((r) => { const d = roomDir(p.id, r.id)
    return { ...r, principal: images(path.join(d, 'principal')), blank: images(path.join(d, 'blank')), moodboard: images(path.join(d, 'moodboard')), renders: images(path.join(d, 'renders')),
      needs: readJson(path.join(d, 'needs.json')),
      references: (readJson(path.join(d, 'expanded', 'references.json'), { items: [] }).items || []).filter((x) => x.file && fs.existsSync(path.join(d, 'expanded', x.file))).map((x) => ({ ...x, url: fileUrl(path.join(d, 'expanded', x.file)) })),
      products: (readJson(path.join(d, 'products.json'), { items: [] }).items || []).map((x) => { if (!x.asset_id) return productView(x); const a = A.byId(x.asset_id); if (!a) return null
        const s = A.summary(a); return { ...s, element: x.element, imageUrls: s.thumb ? [{ name: 'front', url: s.thumb }] : [], material: a.fields?.material, finish: a.fields?.finish, dimensions_mm: [a.fields?.width_mm, a.fields?.depth_mm, a.fields?.height_mm].filter(Boolean).join(' x ') || a.fields?.size_mm, lead_time: a.fields?.lead_time_days ? a.fields.lead_time_days + ' days' : '', url: a.fields?.url, price_note: a.fields?.price_type, assetId: a.id } }).filter(Boolean) } })
  return { ...p, rooms }
}
const saveProject = (p) => { p.updatedAt = now(); writeJson(path.join(projDir(p.id), 'project.json'), p); return p }
function roomFolders(pid, r) { const d = roomDir(pid, r.id); ['principal', 'expanded', 'moodboard', 'blank', 'renders'].forEach((x) => ensure(path.join(d, x))) }

/* ── jobs: codex exec, one at a time ────────────────────────── */
const JOBS = path.join(DIR.state, 'jobs.json')
let jobs = []
const running = new Map()
let draining = false // set by "restart when idle"
// Codex usage limit: the whole queue waits until the time Codex gives ("try again at 1:26 PM"), then carries on by itself
let pausedUntil = 0, pauseReason = ''
const LIMIT = /usage limit|rate limit|too many requests|quota/i
function limitTime(log) {
  const m = log.match(/try again (?:at|in) ([^\n.]+)/i); const now = new Date()
  if (m) { const t = m[1].trim()
    const hm = t.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i)
    if (hm) { const d = new Date(now); let h = Number(hm[1]) % 12; if (/pm/i.test(hm[3])) h += 12; d.setHours(h, Number(hm[2] || 0), 30, 0); if (d <= now) d.setDate(d.getDate() + 1); return d.getTime() }
    const mins = t.match(/(\d+)\s*(minute|min|hour|hr)/i); if (mins) return now.getTime() + Number(mins[1]) * (/h/i.test(mins[2]) ? 3600e3 : 60e3) + 30e3 }
  return now.getTime() + 60 * 60e3
}
const saveJobs = () => writeJson(JOBS, jobs.slice(0, 500))
const fill = (tpl, v) => tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (v[k] ?? '').toString())
const quote = (s) => (process.platform === 'win32' ? `"${String(s).replace(/"/g, '\\"')}"` : `'${String(s).replace(/'/g, `'\\''`)}'`)

function codexCheck() {
  return new Promise((res) => {
    let out = ''; const p = spawn(CFG.codex.bin, ['--version'], { shell: process.platform === 'win32' })
    p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d))
    p.on('error', () => res({ ok: false, detail: 'Codex CLI not found. Install it (npm i -g @openai/codex) and sign in with `codex login`.' }))
    p.on('close', (code) => res({ ok: code === 0, detail: out.trim() || 'exit ' + code }))
  })
}

// Job types. cwd = where Codex works (its sandbox can write only there); output = the file that proves the job worked.
const PIPELINE = ['research-room', 'find-references', 'compose-moodboard', 'vendor-research', 'render-room']
const JOB_LABEL = { 'research-room': 'Research the room', 'find-references': 'Find references', 'compose-moodboard': 'Make the mood board', 'vendor-research': 'Find vendor products',
  'render-room': 'Render', 'style-references': 'Style references', 'style-brief': 'Style brief and render values', 'find-principal': 'Principal references (Pinterest)', 'make-blank': 'Blank view (Codex)', 'asset-tag': 'Research and tag', 'asset-standardise': 'Standardise images', 'analyse-reference': 'Research the room', ping: 'Test Codex', free: 'Free prompt' }
const seq = (dir, prefix, ext) => { const n = (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.startsWith(prefix) && f.endsWith(ext)).length : 0) + 1; return `${prefix}${String(n).padStart(3, '0')}${ext}` }

const RULES = `

Working rules (from the engine): work ONLY inside the current folder and use relative paths; never write to H:\\ or any Google Drive path, the engine copies your results there. Keep temporary files in a _tmp folder and delete it at the end. Batch downloads in one script. If one image or product fails, skip it and carry on; finish with whatever you have rather than stopping.`
const busyRoom = (projectId, roomId) => roomId && jobs.some((j) => j.projectId === projectId && j.roomId === roomId && ['queued', 'running'].includes(j.status))
function buildJob(type, { projectId, roomId, prompt, output, then, styleId, assetId } = {}) {
  if (type === 'analyse-reference') type = 'research-room'
  const tplPath = path.join(HERE, 'prompts', type + '.md')
  if (!fs.existsSync(tplPath)) throw new Error('No prompt template for ' + type)
  let cwd = DIR.state, imgs = [], out = '', v = { prompt: prompt || '' }
  const id = 'J' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 4).toUpperCase()
  let extra = []
  if (type === 'asset-tag' || type === 'asset-standardise') {
    const a = A.byId(assetId); if (!a) throw new Error('Asset not found')
    const n = A.node(a.category), fa = A.full(a)
    const have = (n?.slots || []).filter((sl) => A.imgFile(a._dir, 'images', sl.key))
    Object.assign(v, { assetName: a.fields?.name || a.id, category: (n?.names || [a.category]).join(' / '), vendor: fa.vendor || a.vendor_id || '(unknown)', city: fa.city || '',
      fields: JSON.stringify(a.fields || {}, null, 1), styleIds: flatStyles().map((x) => `${x.id} (${x.name}, Cat ${x.category})`).join(', '),
      slotSpec: have.map((sl) => `- images/${path.basename(A.imgFile(a._dir, 'images', sl.key))} → std/${sl.key}.png : ${sl.label}. Make it: ${sl.std}`).join('\n') || '(no images yet)' })
    if (type === 'asset-standardise' && !have.length) throw new Error('Upload at least one image for this asset first.')
    imgs = have.slice(0, 6).map((sl) => [sl.label, A.imgFile(a._dir, 'images', sl.key)])
    cwd = a._dir; out = type === 'asset-tag' ? 'tags.json' : ''
  }
  if (type === 'style-references' || type === 'style-brief') {
    const st = flatStyles().find((x) => x.id === styleId); if (!st) throw new Error('Unknown style')
    const sd = path.join(DIR.styles, st.id); ensure(path.join(sd, 'render-ref')); ensure(path.join(sd, 'moodboard-ref'))
    Object.assign(v, { style: st.name, styleId: st.id, category: st.category, parentNote: st.parent ? ', a kind of ' + (flatStyles().find((x) => x.id === st.parent)?.name || st.parent) : '',
      brief: readText(path.join(sd, 'brief.md'), '(none)'), styleMd: readText(path.join(sd, 'style.md'), '(none)') })
    cwd = sd; out = type === 'style-brief' ? 'brief.md' : 'sources.json'
    if (type === 'style-brief') { // keep the first version of each file before Codex rewrites it
      ;['brief.md', 'style.md'].forEach((f) => { const b = path.join(sd, f.replace('.md', '.original.md')); if (!fs.existsSync(b) && fs.existsSync(path.join(sd, f))) fs.copyFileSync(path.join(sd, f), b) })
      imgs = [...images(path.join(sd, 'render-ref')).slice(0, 3).map((i) => ['render reference', i.path]), ...images(path.join(sd, 'moodboard-ref')).slice(0, 2).map((i) => ['mood-board reference', i.path])] }
  }
  if (projectId) {
    const p = readJson(path.join(projDir(projectId), 'project.json')); if (!p) throw new Error('Project not found')
    const r = roomId ? p.rooms.find((x) => x.id === roomId) : null
    if (roomId && !r) throw new Error('Room not found')
    v.project = `${p.name} · ${p.type}${p.area ? ' · ' + p.area + ' sft' : ''}${p.persona ? ' · persona ' + p.persona : ''}${p.palette ? ' · palette ' + p.palette : ''}${p.register ? ' · register ' + p.register : ''}`
    v.notes = [p.brief && 'Project brief: ' + p.brief, r?.notes && 'Room notes: ' + r.notes].filter(Boolean).join('\n\n') || '(none yet)'
    if (r) {
      const st = flatStyles().find((s) => s.id === (r.style || p.style))
      if (!st && type !== 'ping') throw new Error('Choose a style for this room (or the residence) first.')
      const sd = path.join(DIR.styles, st?.id || '_')
      const d = roomDir(projectId, roomId)
      Object.assign(v, { room: r.name, roomGroup: r.group || '', style: st?.name || '', styleId: st?.id || '', category: st?.category || '',
        brief: readText(path.join(sd, 'brief.md'), '(none)'), styleMd: readText(path.join(sd, 'style.md'), '(none)'),
        styleIds: flatStyles().map((s) => s.id).join(', '), roomDir: d, vendorsDir: DIR.vendors, jobId: id })
      cwd = d
      const principal = images(path.join(d, 'principal'))
      if (type === 'find-principal') { out = '' }
      if (type === 'make-blank') { imgs = principal.slice(0, 1).map((i) => ['principal reference (for the kind of space only; do NOT copy its furniture)', i.path]); out = 'blank/' + seq(path.join(d, 'blank'), 'blank-', '.png'); v.output = out }
      if (type === 'research-room') { imgs = principal.slice(0, 4).map((i) => ['principal reference', i.path]); out = 'needs.json' }
      if (type === 'find-references') {
        if (!fs.existsSync(path.join(d, 'needs.json'))) throw new Error('Run "Research the room" first.')
        v.needs = readText(path.join(d, 'needs.json')); imgs = principal.slice(0, 2).map((i) => ['principal reference (match this)', i.path]); out = 'expanded/references.json'
      }
      if (type === 'compose-moodboard') {
        const refs = readJson(path.join(d, 'expanded', 'references.json'))
        if (!refs?.items?.length && !principal.length) throw new Error('Find references (or add principal references) first.')
        imgs = images(path.join(sd, 'moodboard-ref')).slice(0, 3).map((i) => ['OuTSDe mood-board example (follow this layout language)', i.path])
        const prods = readJson(path.join(d, 'products.json'), { items: [] }).items || []
        // the asset library, filtered by this room's theme: only pieces whose style score fits are offered to the board
        const fit = A.forStyle(st.id, { category2: st.category === 2, min: 0.6 }).slice(0, 40)
        extra = fit.map((a) => { const f = ['std', 'images'].map((k) => ['front', 'face', 'axo', 'swatch', 'seamless', 'lit'].map((sl) => A.imgFile(a._dir, k, sl)).find(Boolean)).find(Boolean); return f ? { from: f, to: `library/${a.id}${path.extname(f)}`, a } : null }).filter(Boolean)
        v.library = extra.length ? JSON.stringify(extra.map((x) => ({ file: x.to, name: x.a.fields?.name, category: A.node(x.a.category)?.names?.join(' / '), vendor: x.a.vendor_id, price_inr: x.a.fields?.price_inr, price_unit: x.a.fields?.price_unit, score: x.a.ai.styles[st.id], standardised: x.from.includes(`${path.sep}std${path.sep}`) })), null, 1) : '(none yet: the asset library has no pieces tagged for this style)'
        v.assets = JSON.stringify({ references: (refs?.items || []).map((x) => ({ file: 'expanded/' + x.file, element: x.element, type: x.type, colours: x.colours })),
          products: prods.filter((x) => x.dir).map((x) => ({ file: path.relative(d, path.join(DIR.vendors, x.dir, x.images?.[0] || '')).split(path.sep).join('/'), name: x.name, vendor: x.vendor, price: x.price_inr })),
          principal: principal.map((i) => 'principal/' + i.name) }, null, 1)
        const n = seq(path.join(d, 'moodboard'), 'board-', '.png'); out = 'moodboard/' + n; v.output = out; v.layers = out.replace('.png', '.json')
      }
      if (type === 'vendor-research') {
        if (!fs.existsSync(path.join(d, 'needs.json'))) throw new Error('Run "Research the room" first.')
        v.needs = readText(path.join(d, 'needs.json')); v.knownVendors = JSON.stringify(listVendors().map((x) => ({ id: x.id, name: x.name, city: x.city, categories: x.categories })))
        cwd = DIR.library; out = `_runs/${id}.json`; v.output = out
      }
      if (type === 'render-room') {
        const blank = images(path.join(d, 'blank'))[0]; if (!blank) throw new Error('Upload a blank view for this room first.')
        const board = images(path.join(d, 'moodboard')); const refs = board.length ? board.slice(-1) : principal.slice(0, 3)
        if (!refs.length) throw new Error('Make a mood board (or add principal references) first.')
        imgs = [['blank view (keep this architecture and camera)', blank.path], ...refs.map((i) => [board.length ? 'mood board' : 'reference', i.path]),
          ...images(path.join(sd, 'render-ref')).slice(0, 2).map((i) => ['render reference (light and frame)', i.path])]
        out = 'renders/' + (output || seq(path.join(d, 'renders'), 'r', '.png')); v.output = out
      }
    }
  }
  v.imageList = imgs.length ? imgs.map((x, i) => `${i + 1}. ${x[0]} (${path.basename(x[1])})`).join('\n') : '(none)'
  return { id, type, label: (JOB_LABEL[type] || type) + (assetId ? ' · ' + (A.byId(assetId)?.fields?.name || assetId) : '') + (styleId ? ' · ' + (flatStyles().find((x) => x.id === styleId)?.name || styleId) : ''), styleId: styleId || '', projectId: projectId || '', roomId: roomId || '', status: 'queued', createdAt: now(), cwd: rel(cwd) || '.',
    extra: extra.map((x) => ({ from: rel(x.from), to: x.to })), assetId: assetId || '', images: imgs.map((x) => rel(x[1])), prompt: fill(fs.readFileSync(tplPath, 'utf8'), v) + RULES, output: out, then: then || [], attempt: 1, log: '' }
}

/* ── after a job: read what Codex wrote into the Library and Vendors database ── */
const LIB = path.join(DIR.library, 'index.json')
const lib = () => readJson(LIB, { note: 'Asset database: every reference and vendor product Codex found, with tags and style scores. Files stay where they were saved.', items: [] })
function addToLibrary(items) { const L = lib(); const ids = new Set(L.items.map((x) => x.id)); items.forEach((x) => { if (ids.has(x.id)) L.items[L.items.findIndex((y) => y.id === x.id)] = x; else L.items.push(x) }); writeJson(LIB, L) }
const listVendors = () => A.listVendors()
function afterJob(job) {
  A.invalidate()
  if (job.type === 'asset-tag') {
    const a = A.byId(job.assetId); const t = a && readJson(path.join(a._dir, 'tags.json'))
    if (t) A.saveAsset({ ...a, ai: { ...t, taggedAt: now(), job: job.id }, fields: A.cleanFields({ ...(t.fields_found || {}), ...a.fields }, A.node(a.category)) })
    return
  }
  if (!job.projectId || !job.roomId) return
  const d = roomDir(job.projectId, job.roomId), base = { project: job.projectId, room: job.roomId, addedAt: now(), job: job.id }
  if (job.type === 'find-references') {
    const R = readJson(path.join(d, 'expanded', 'references.json'), { items: [] })
    addToLibrary((R.items || []).filter((x) => x.file && fs.existsSync(path.join(d, 'expanded', x.file))).map((x) => ({ ...x, ...base, kind: 'reference', id: 'R-' + slug(job.projectId).slice(0, 12) + '-' + slug(job.roomId) + '-' + slug(x.file), path: rel(path.join(d, 'expanded', x.file)) })))
  }
  if (job.type === 'vendor-research' && fs.existsSync(path.join(DIR.library, job.output))) {
    const run = readJson(path.join(DIR.library, job.output), { assets: [], vendors: [] })
    ;(run.vendors || []).forEach((v) => { try { A.saveVendor(v, slug(v.id || v.name)) } catch { /* */ } })
    const vd = path.join(DIR.library, '_vendors'); if (fs.existsSync(vd)) fs.readdirSync(vd).filter((f) => f.endsWith('.json')).forEach((f) => { const v = readJson(path.join(vd, f)); if (v?.name) try { A.saveVendor(v, slug(v.id || v.name)) } catch { /* */ } })
    A.invalidate()
    const ids = new Set((run.assets || []).map((x) => x.id)); const P = readJson(path.join(d, 'products.json'), { items: [] })
    P.items = [...(P.items || []).filter((x) => !ids.has(x.asset_id)), ...(run.assets || []).filter((x) => A.byId(x.id)).map((x) => ({ asset_id: x.id, element: x.element }))]
    writeJson(path.join(d, 'products.json'), P)
    // new assets get tagged and standardised by Codex
    ;(run.assets || []).filter((x) => A.byId(x.id)).forEach((x) => { try { jobs.unshift(buildJob('asset-tag', { assetId: x.id, then: ['asset-standardise'] })) } catch { /* */ } })
    return
  }
  if (job.type === 'vendor-research') {
    const run = readJson(path.join(DIR.vendors, job.output), { products: [] })
    const prods = (run.products || []).map((x) => ({ ...x, dir: x.dir || `${x.vendor_id}/products/${x.id}` })).filter((x) => fs.existsSync(path.join(DIR.vendors, x.dir)))
    const P = readJson(path.join(d, 'products.json'), { items: [] }); const ids = new Set(prods.map((x) => x.id))
    P.items = [...(P.items || []).filter((x) => !ids.has(x.id)), ...prods.map((x) => ({ ...(readJson(path.join(DIR.vendors, x.dir, 'product.json')) || {}), ...x, element: x.element }))]
    writeJson(path.join(d, 'products.json'), P)
    addToLibrary(P.items.filter((x) => ids.has(x.id)).map((x) => ({ ...x, ...base, kind: 'product', id: 'P-' + x.id, path: rel(path.join(DIR.vendors, x.dir, (x.images || [])[0] || '')) })))
  }
}

function pump() {
  const max = CFG.maxParallelJobs || 1
  const q = jobs.filter((j) => j.status === 'queued').reverse()
  if (pausedUntil > Date.now()) return
  while (!draining && running.size < max && q.length) runJob(q.shift())
}
// Codex's Windows sandbox cannot set itself up inside the Google Drive H: disk, so each job works in a local scratch copy
// of its folder (in %TEMP%) and the engine copies new or changed files back into Design_Model when it ends.
const WORK = path.join(os.tmpdir(), 'AccordDesignEngine-work')
function copyTree(from, to, keep = () => true) {
  if (!fs.existsSync(from)) return
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (e.name === '_removed' || e.name === 'node_modules') continue
    const a = path.join(from, e.name), b = path.join(to, e.name)
    if (e.isDirectory()) { ensure(b); copyTree(a, b, keep) }
    else if (keep(a)) { ensure(to); fs.copyFileSync(a, b) }
  }
}
function copyBack(work, src, since) {
  let n = 0
  const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const a = path.join(dir, e.name); if (e.isDirectory()) { walk(a); continue }
    const r = path.relative(work, a); if (r.startsWith('library' + path.sep) || r.startsWith('_tmp' + path.sep)) continue
    const b = path.join(src, r); const st = fs.statSync(a)
    if (!fs.existsSync(b) || st.mtimeMs >= since || fs.statSync(b).size !== st.size) { ensure(path.dirname(b)); fs.copyFileSync(a, b); n++ } } }
  walk(work); return n
}
function runJob(job) {
  const src = path.join(ROOT, job.cwd); ensure(src)
  const local = CFG.codex.localWorkdir !== false
  const cwd = local ? path.join(WORK, job.id) : src
  if (local) { fs.rmSync(cwd, { recursive: true, force: true }); ensure(cwd)
    // a room folder is small: copy it all. The Vendors folder grows with images: copy only its JSON so Codex can merge vendor.json.
    copyTree(src, cwd, src === DIR.vendors || src === DIR.library ? (f) => f.endsWith('.json') : () => true)
    ;(job.extra || []).forEach((x) => { try { const to = path.join(cwd, x.to); ensure(path.dirname(to)); fs.copyFileSync(path.join(ROOT, x.from), to) } catch { /* skip */ } }) }
  job.workdir = cwd; const started = Date.now() - 1000
  const args = [...CFG.codex.args]
  job.images.forEach((im) => { const abs = path.join(ROOT, im); const r = path.relative(src, abs)
    args.push(CFG.codex.imageFlag, quote(local && !r.startsWith('..') ? path.join(cwd, r) : abs)) })
  const stdin = CFG.codex.promptFromStdin !== false
  args.push(stdin ? '-' : quote(job.prompt))
  job.status = 'running'; job.startedAt = now(); job.command = `${CFG.codex.bin} ${args.join(' ')}`; saveJobs()
  const jd = path.join(DIR.state, 'jobs', job.id); ensure(jd); fs.writeFileSync(path.join(jd, 'prompt.md'), job.prompt)
  let p
  try { p = spawn(CFG.codex.bin, args, { cwd, shell: true, env: process.env }) } catch (e) { return finish(job, 'failed', String(e.message)) }
  running.set(job.id, p)
  const add = (d) => { job.log = (job.log + d.toString()).slice(-60000) }
  p.stdout.on('data', add); p.stderr.on('data', add)
  p.on('error', (e) => add('\n' + e.message))
  // Codex that exits at once (not installed, not logged in) closes its input early: note it on the job, never crash the engine
  p.stdin.on('error', (e) => add('\n[engine] could not send the prompt to Codex: ' + e.code))
  if (stdin) { p.stdin.write(job.prompt); p.stdin.end() }
  const t = setTimeout(() => { add('\n[engine] timed out'); p.kill() }, (CFG.codex.timeoutMinutes || 20) * 60000)
  p.on('close', (code) => { clearTimeout(t); running.delete(job.id)
    if (local) { try { const n = copyBack(cwd, src, started); add(`\n[engine] copied ${n} file(s) back to ${job.cwd}`); fs.rmSync(cwd, { recursive: true, force: true }) } catch (e) { add('\n[engine] copy back failed: ' + e.message + ' (the files are still in ' + cwd + ')') } }
    const outOk = !job.output || fs.existsSync(path.join(src, job.output))
    if (job.cancelReq) return finish(job, 'cancelled', '\n[engine] cancelled by the team')
    finish(job, code === 0 && outOk ? 'done' : 'failed', code === 0 && !outOk ? `\n[engine] Codex finished but ${job.output} was not written.` : '') })
}
// stop a running job: the whole process tree (on Windows the shell's child codex.exe too); it ends as cancelled, not retried
function killJob(job) {
  const p = running.get(job.id); if (!p) return false
  job.cancelReq = true
  if (process.platform === 'win32' && p.pid) { try { spawn('taskkill', ['/pid', String(p.pid), '/T', '/F'], { shell: false }) } catch { p.kill() } } else p.kill()
  return true
}
function finish(job, status, extra = '') {
  job.status = status; job.finishedAt = now(); job.log += extra
  if (status === 'cancelled') { try { fs.writeFileSync(path.join(DIR.state, 'jobs', job.id, 'log.txt'), job.log) } catch { /* */ } saveJobs(); pump(); return }
  if (status === 'failed' && LIMIT.test(job.log.slice(-3000))) { // not the job's fault: put it back and pause the queue
    pausedUntil = Math.max(pausedUntil, limitTime(job.log.slice(-3000))); pauseReason = 'Codex usage limit'
    job.status = 'queued'; job.log += `\n[engine] Codex usage limit: queue paused until ${new Date(pausedUntil).toLocaleString('en-IN')}; this job will run again then.`
    try { fs.writeFileSync(path.join(DIR.state, 'jobs', job.id, 'log.txt'), job.log) } catch { /* */ }
    saveJobs(); clearTimeout(finish.t); finish.t = setTimeout(() => { pausedUntil = 0; pauseReason = ''; pump() }, Math.max(1000, pausedUntil - Date.now())); return
  }
  if (status === 'done') { try { afterJob(job) } catch (e) { job.log += '\n[engine] could not read the results: ' + e.message } }
  fs.writeFileSync(path.join(DIR.state, 'jobs', job.id, 'log.txt'), job.log)
  // a failed Codex step is tried once more before the pipeline stops
  const RETRY = ['asset-tag', 'asset-standardise', 'find-principal', 'research-room', 'find-references', 'compose-moodboard', 'vendor-research', 'make-blank', 'render-room', 'style-references', 'style-brief']
  if (status === 'failed' && RETRY.includes(job.type) && (job.attempt || 1) < 2) {
    try { const again = buildJob(job.type, { projectId: job.projectId, roomId: job.roomId, styleId: job.styleId, assetId: job.assetId, then: job.then }); again.attempt = (job.attempt || 1) + 1; again.retryOf = job.id; jobs.unshift(again) } catch (e) { job.log += '\n[engine] could not retry: ' + e.message }
  }
  // pipeline: queue the next step when this one worked
  if (status === 'done' && job.then?.length) {
    const [next, ...rest] = job.then
    try { jobs.unshift(buildJob(next, { projectId: job.projectId, roomId: job.roomId, styleId: job.styleId, assetId: job.assetId, then: rest })) } catch (e) { job.log += `\n[engine] pipeline stopped before "${next}": ${e.message}` }
  }
  saveJobs(); pump()
}

/* ── image intake: file upload or link (image, Pinterest pin, any page with og:image) ── */
async function fetchImage(url) {
  const UA = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36' }
  let r = await fetch(url, { headers: UA, redirect: 'follow' })
  if (!r.ok) throw new Error('Could not open the link (' + r.status + ')')
  let type = r.headers.get('content-type') || ''
  if (!type.startsWith('image/')) {
    const html = await r.text()
    const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i) || html.match(/content=["']([^"']+)["'][^>]+property=["']og:image/i)
    if (!m) throw new Error('No image found on that page')
    r = await fetch(m[1].replace(/&amp;/g, '&'), { headers: UA }); type = r.headers.get('content-type') || ''
    if (!r.ok || !type.startsWith('image/')) throw new Error('The page image could not be downloaded')
  }
  const ext = (type.split('/')[1] || 'jpg').replace('jpeg', 'jpg').split(';')[0]
  return { buf: Buffer.from(await r.arrayBuffer()), ext }
}
const stamp = () => new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)

/* ── HTTP ───────────────────────────────────────────────────── */
seedVocabulary()
jobs = readJson(JOBS, [])
// a job cut off by a closed window or a restart goes back in the queue (once)
jobs.forEach((j) => { if (j.status === 'running') { if ((j.attempt || 1) < 2) { j.status = 'queued'; j.attempt = (j.attempt || 1) + 1; j.log = (j.log || '') + '\n[engine] interrupted; queued again' } else j.status = 'failed' } })
const app = express()
// Who may talk to the engine from a browser: the app itself, and the GitHub Pages copy of the UI listed in config.allowedOrigins.
// Other websites are refused, so no outside page can start Codex jobs or read the files on this PC.
const ORIGINS = new Set(['http://localhost:5174', 'http://127.0.0.1:5174', 'http://localhost:4317', ...(CFG.allowedOrigins || [])].map((o) => o.replace(/\/$/, '')))
// Server mode: DESIGN_HOST=0.0.0.0 (Start Design Server.cmd) lets the other laptops reach this one. Then every request that
// does not come from this laptop itself must carry the access key (header x-engine-key, or ?k= on image links).
const HOST = process.env.DESIGN_HOST || CFG.host || '127.0.0.1'
const SERVER = HOST !== '127.0.0.1' && HOST !== 'localhost'
// the key lives in Design_Model/.engine/access-key.txt (in Drive), so it stays the same across restarts and updates;
// accessKey in config.json, if set, wins. Delete the file to get a new key.
const KEYF = path.join(DIR.state, 'access-key.txt')
if (!CFG.accessKey && fs.existsSync(KEYF)) CFG.accessKey = fs.readFileSync(KEYF, 'utf8').trim()
if (SERVER && !CFG.accessKey) { CFG.accessKey = Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 6)).join('-'); ensure(DIR.state); fs.writeFileSync(KEYF, CFG.accessKey) }
const cookieOf = (req, k) => decodeURIComponent((String(req.headers.cookie || '').split(/;\s*/).find((x) => x.startsWith(k + '=')) || '').slice(k.length + 1))
let crmLink = null // set below, once the routes exist
const isLocal = (req) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress) && !req.headers['x-forwarded-for'] && !req.headers['tailscale-user-login']
const sameOrigin = (req, o) => { try { return new URL(o).host === req.headers.host } catch { return false } }
app.use((req, res, next) => {
  const o = req.headers.origin
  if (o && (ORIGINS.has(o) || sameOrigin(req, o))) {
    res.setHeader('Access-Control-Allow-Origin', o); res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'content-type, x-engine-key')
    res.setHeader('Access-Control-Allow-Private-Network', 'true') // Chrome: a public page (GitHub Pages) calling this PC
  } else if (o && req.path.startsWith('/api') && req.method !== 'GET') return res.status(403).json({ error: `This page (${o}) is not allowed to use the engine. Add it to allowedOrigins in engine/config.json.` })
  if (req.method === 'OPTIONS') return res.sendStatus(o && (ORIGINS.has(o) || sameOrigin(req, o)) ? 204 : 403)
  // the test CRM's own data (accounts, client files) is never served as a plain file
  if (/^\/files\/(CRM_Test_Data|\.engine)(\/|$)/i.test(decodeURIComponent(req.path))) return res.status(403).send('Not served')
  // access key for everyone who is not on this laptop (the built UI itself, /index.html and /assets, stays open so the login screen loads).
  // The key comes as a header, ?k= or the de_k cookie (set by the Connect screen); someone signed in to the test CRM on this server also counts.
  const k = req.headers['x-engine-key'] || req.query.k || cookieOf(req, 'de_k')
  req.engineOk = !CFG.accessKey || isLocal(req) || k === CFG.accessKey || !!crmLink?.userOf(req)
  if (!req.engineOk && (req.path.startsWith('/api') || req.path.startsWith('/files'))) return res.status(401).json({ error: 'Access key needed', needKey: true })
  next()
})
app.use(express.json({ limit: '4mb' }))
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 40 * 1024 * 1024 } })
const h = (fn) => async (req, res) => { try { const v = await fn(req, res); if (v !== undefined) res.json(v) } catch (e) { res.status(400).json({ error: e.message }) } }

app.use('/files', express.static(ROOT, { dotfiles: 'deny', index: false }))

app.get('/api/health', h(async () => ({ engine: '0.6.0', root: ROOT, codexCommand: `${CFG.codex.bin} ${CFG.codex.args.join(' ')} ${CFG.codex.imageFlag} <image> … ${CFG.codex.promptFromStdin !== false ? '-' : '"<prompt>"'}`, export: fs.existsSync(EXPORT) ? EXPORT : null, codex: await codexCheck(), jobs: { running: running.size, queued: jobs.filter((j) => j.status === 'queued').length } })))

app.get('/api/accord', h(() => {
  const a = readAccord(); const projects = listProjects()
  return { ...a, clients: a.clients.map((c) => ({ ...c, sessions: sessionsOf(a, c), projectId: projects.find((p) => p.bookingId === c.bookingId)?.id || null })) }
}))

app.get('/api/projects', h(() => listProjects().map((p) => { const x = hydrate(p)
  return { ...p, roomCount: x.rooms.length, refCount: x.rooms.reduce((s, r) => s + r.principal.length, 0), renderCount: x.rooms.reduce((s, r) => s + r.renders.length, 0),
    cover: x.rooms.flatMap((r) => r.renders.concat(r.principal))[0]?.url || null } })))

app.post('/api/projects', h((req) => {
  const a = readAccord(); const c = a.clients.find((x) => x.bookingId === req.body.bookingId)
  if (!c) throw new Error('Booking not found in the Accord export')
  const existing = listProjects().find((p) => p.bookingId === c.bookingId); if (existing) return existing
  const s = sessionsOf(a, c)[0] || {}
  const id = safe(`${c.unit} ${c.name}`)
  const p = { id, bookingId: c.bookingId, clientId: c.clientId, unit: c.unit, name: `Residence ${c.unit} · ${c.name}`, client: [c.title, c.name].filter(Boolean).join(' '), type: c.type, area: c.area, floor: c.floor, band: c.band,
    status: 'Brief', designer: req.body.designer || '', createdAt: now(), session: s.id || '', persona: s.persona || '', palette: s.palette || '', register: s.register || '', sessionScreen: s.screen || '',
    style: '', brief: '', rooms: roomsFor(c.type).map((r) => ({ ...r, style: '', notes: '' })) }
  ensure(projDir(id)); p.rooms.forEach((r) => roomFolders(id, r)); saveProject(p)
  return p
}))

app.get('/api/projects/:id', h((req) => { const p = readJson(path.join(projDir(req.params.id), 'project.json')); if (!p) throw new Error('Project not found'); return hydrate(p) }))

app.put('/api/projects/:id', h((req) => {
  const p = readJson(path.join(projDir(req.params.id), 'project.json')); if (!p) throw new Error('Project not found')
  const allowed = ['status', 'designer', 'style', 'brief', 'rooms', 'persona', 'palette']
  allowed.forEach((k) => { if (req.body[k] !== undefined) p[k] = req.body[k] })
  p.rooms = (p.rooms || []).map((r) => ({ id: slug(r.id || r.name), name: String(r.name || '').slice(0, 60), group: r.group || '', style: r.style || '', notes: String(r.notes || '').slice(0, 4000) })).filter((r) => r.id)
  p.rooms.forEach((r) => roomFolders(p.id, r))
  return hydrate(saveProject(p))
}))

// images for a room: kind = principal | blank | moodboard
const KINDS = ['principal', 'blank', 'moodboard']
app.post('/api/projects/:id/rooms/:room/:kind', upload.array('files', 20), h(async (req) => {
  const { id, room, kind } = req.params; if (!KINDS.includes(kind)) throw new Error('Unknown image kind')
  const d = path.join(roomDir(id, room), kind); ensure(d); const saved = []
  for (const f of req.files || []) { if (!/^image\//.test(f.mimetype)) continue; const n = `${stamp()}-${slug(path.parse(f.originalname).name) || 'image'}${path.extname(f.originalname).toLowerCase() || '.jpg'}`; fs.writeFileSync(path.join(d, n), f.buffer); saved.push(n) }
  for (const url of [].concat(req.body?.urls || []).filter(Boolean)) { const { buf, ext } = await fetchImage(url); const n = `${stamp()}-link-${saved.length + 1}.${ext}`; fs.writeFileSync(path.join(d, n), buf); saved.push(n)
    fs.appendFileSync(path.join(d, 'sources.txt'), `${n}\t${url}\n`) }
  if (!saved.length) throw new Error('No image received')
  return { saved }
}))
app.delete('/api/projects/:id/rooms/:room/:kind/:file', h((req) => {
  const { id, room, kind, file } = req.params; if (!KINDS.includes(kind) && kind !== 'renders') throw new Error('Unknown image kind')
  const f = path.join(roomDir(id, room), kind, path.basename(file)); if (!fs.existsSync(f)) throw new Error('File not found')
  // nothing is deleted: the file moves to the room's _removed folder
  const bin = path.join(roomDir(id, room), '_removed'); ensure(bin); fs.renameSync(f, path.join(bin, `${stamp()}-${kind}-${path.basename(file)}`)); return { ok: true }
}))

// vocabulary
app.get('/api/vocabulary', h(() => flatStyles().map((s) => { const d = path.join(DIR.styles, s.id)
  return { ...s, brief: readText(path.join(d, 'brief.md')), styleMd: readText(path.join(d, 'style.md')), renderRef: images(path.join(d, 'render-ref')), moodboardRef: images(path.join(d, 'moodboard-ref')) } })))
app.put('/api/vocabulary/:style', h((req) => {
  const s = flatStyles().find((x) => x.id === req.params.style); if (!s) throw new Error('Unknown style')
  const d = path.join(DIR.styles, s.id); ensure(d)
  if (typeof req.body.brief === 'string') fs.writeFileSync(path.join(d, 'brief.md'), req.body.brief)
  if (typeof req.body.styleMd === 'string') fs.writeFileSync(path.join(d, 'style.md'), req.body.styleMd)
  return { ok: true }
}))
app.post('/api/vocabulary/:style/:kind', upload.array('files', 20), h(async (req) => {
  const s = flatStyles().find((x) => x.id === req.params.style); if (!s) throw new Error('Unknown style')
  if (!['render-ref', 'moodboard-ref'].includes(req.params.kind)) throw new Error('Unknown folder')
  const d = path.join(DIR.styles, s.id, req.params.kind); ensure(d); let n = 0
  for (const f of req.files || []) { if (!/^image\//.test(f.mimetype)) continue; fs.writeFileSync(path.join(d, `${stamp()}-${slug(path.parse(f.originalname).name)}${path.extname(f.originalname).toLowerCase()}`), f.buffer); n++ }
  for (const url of [].concat(req.body?.urls || []).filter(Boolean)) { const { buf, ext } = await fetchImage(url); fs.writeFileSync(path.join(d, `${stamp()}-link.${ext}`), buf); n++ }
  return { saved: n }
}))

// jobs
app.get('/api/jobs', h((req) => jobs.filter((j) => (!req.query.projectId || j.projectId === req.query.projectId) && (!req.query.roomId || j.roomId === req.query.roomId)).slice(0, 200).map(({ log, prompt, ...j }) => ({ ...j, tail: (log || '').slice(-400) }))))
app.get('/api/jobs/:id', h((req) => { const j = jobs.find((x) => x.id === req.params.id); if (!j) throw new Error('Job not found'); return j }))
app.post('/api/jobs', h((req) => { if (busyRoom(req.body.projectId, req.body.roomId)) throw new Error('Codex is already working on this room. Wait for it, or cancel it in Codex jobs.'); const j = buildJob(req.body.type, req.body); jobs.unshift(j); saveJobs(); pump(); return j }))
app.post('/api/jobs/:id/rerun', h((req) => { const o = jobs.find((x) => x.id === req.params.id); if (!o) throw new Error('Job not found')
  const j = buildJob(o.type, { projectId: o.projectId, roomId: o.roomId, styleId: o.styleId, assetId: o.assetId, prompt: req.body?.prompt }); if (req.body?.promptOverride) j.prompt = req.body.promptOverride
  j.rerunOf = o.id; jobs.unshift(j); saveJobs(); pump(); return j }))
app.post('/api/queue/resume', h(() => { pausedUntil = 0; pauseReason = ''; pump(); return { ok: true } }))
app.post('/api/jobs/:id/cancel', h((req) => { const j = jobs.find((x) => x.id === req.params.id); if (!j) throw new Error('Job not found')
  if (j.status === 'queued') { j.status = 'cancelled'; j.finishedAt = now(); saveJobs() } else killJob(j); return { ok: true } }))
// clear the Codex queue: every waiting job is cancelled; with {running:true} the running ones are stopped too
app.post('/api/queue/clear', h((req) => {
  let waiting = 0, stopped = 0
  for (const j of jobs) { if (j.status === 'queued') { j.status = 'cancelled'; j.finishedAt = now(); j.log = (j.log || '') + '\n[engine] removed from the queue'; waiting++ } else if (req.body?.running && j.status === 'running' && killJob(j)) stopped++ }
  pausedUntil = 0; pauseReason = ''; saveJobs(); return { waiting, stopped }
}))
// delete job records (not waiting or running ones): one, or all finished ones of the given statuses
const dropJob = (j) => { try { fs.rmSync(path.join(DIR.state, 'jobs', j.id), { recursive: true, force: true }) } catch { /* */ } }
app.delete('/api/jobs/:id', h((req) => { const j = jobs.find((x) => x.id === req.params.id); if (!j) throw new Error('Job not found')
  if (['queued', 'running'].includes(j.status)) throw new Error('Cancel the job first'); jobs = jobs.filter((x) => x !== j); dropJob(j); saveJobs(); return { ok: true } }))
app.post('/api/jobs-clear', h((req) => { const st = req.body?.statuses || ['done', 'failed', 'cancelled']
  const gone = jobs.filter((j) => st.includes(j.status) && !['queued', 'running'].includes(j.status)); gone.forEach(dropJob)
  jobs = jobs.filter((j) => !gone.includes(j)); saveJobs(); return { removed: gone.length } }))

// Codex fills a style's render and mood-board references (one style, or every style with { all: true })
app.post('/api/vocabulary-find', h((req) => {
  const ids = req.body.all ? flatStyles().map((s) => s.id) : [req.body.styleId]
  const busy = new Set(jobs.filter((j) => j.type === (req.body.kind === 'brief' ? 'style-brief' : 'style-references') && ['queued', 'running'].includes(j.status)).map((j) => j.styleId))
  const made = ids.filter((id) => !busy.has(id)).map((id) => { const j = buildJob(req.body.kind === 'brief' ? 'style-brief' : 'style-references', { styleId: id }); jobs.unshift(j); return j.id })
  saveJobs(); pump(); return { queued: made.length, skipped: ids.length - made.length }
}))
app.get('/api/vocabulary/:style/sources', h((req) => readJson(path.join(DIR.styles, path.basename(req.params.style), 'sources.json'), { items: [] })))

// vendor asset library and vendors (engine/assets.mjs)
const busyAsset = (assetId) => jobs.some((j) => j.assetId === assetId && ['queued', 'running'].includes(j.status))
A.routes(app, h, upload, fetchImage, (steps, opts) => { if (opts.assetId && busyAsset(opts.assetId)) throw new Error('Codex is already working on this asset.')
  const j = buildJob(steps[0], { ...opts, then: steps.slice(1) }); jobs.unshift(j); saveJobs(); pump(); return { id: j.id, steps } })

// Pinterest references found for rooms (Library/index.json)
app.get('/api/library', h(() => lib().items.map((x) => ({ ...x, url: x.path && fs.existsSync(path.join(ROOT, x.path)) ? fileUrl(path.join(ROOT, x.path)) : null })).reverse()))
// run the whole room with Codex, from a step onwards
app.post('/api/pipeline', h((req) => { const { projectId, roomId, from = PIPELINE[0], to, steps: only } = req.body
  if (busyRoom(projectId, roomId)) throw new Error('Codex is already working on this room. Wait for it, or cancel it in Codex jobs.')
  let steps = Array.isArray(only) && only.length ? only : PIPELINE.slice(PIPELINE.indexOf(from)); if (to) steps = steps.slice(0, steps.indexOf(to) + 1)
  const pr = readJson(path.join(projDir(projectId), 'project.json')); const d = roomDir(projectId, roomId)
  if (!images(path.join(d, 'blank')).length && !steps.includes('make-blank')) steps = steps.filter((x) => x !== 'render-room') // no blank view yet: stop at the mood board
  if (!steps.length) throw new Error('Nothing to run')
  const j = buildJob(steps[0], { projectId, roomId, then: steps.slice(1) }); jobs.unshift(j); saveJobs(); pump(); return { ...j, steps, project: pr?.name } }))

// the test copy of Accord CRM on this server, and the link between Accord Design and the engine (engine/crm.mjs)
crmLink = createCrm({ app, express, ROOT, readJson, writeJson, ensure, safe, slug, now, h, fileUrl, A, readAccord: readAccordExport, listProjects, hydrate, saveProject, projDir, roomFolders, roomsFor, STYLES })

// Update and restart: dev.mjs copies the latest code from Design_Model\app and starts the engine again (exit code 75).
// with { wait: true } the engine stops starting new jobs, waits for the running ones, then restarts; the queue carries on afterwards.
app.post('/api/restart', h((req) => {
  if (running.size && !req.body?.wait) throw new Error('Codex is working. Use "restart when idle" or wait for the jobs.')
  if (!running.size) { setTimeout(() => process.exit(75), 300); return { ok: true, now: true } }
  draining = true; const t = setInterval(() => { if (!running.size) { clearInterval(t); saveJobs(); process.exit(75) } }, 3000); return { ok: true, waitingFor: running.size } }))

// built UI (npm start)
const DIST = path.join(APP, 'dist')
if (process.argv.includes('--serve') && fs.existsSync(DIST)) { app.use(express.static(DIST)); app.get(/^\/(?!api|files|crm)/, (_, res) => res.sendFile(path.join(DIST, 'index.html'))) }

// Autorun: a plan file in Design_Model/.engine/autorun.json is queued when the engine starts, then renamed to autorun.done-<time>.json.
// { "tasks": [ { "kind": "style-references" | "style-brief", "all": true } | { "kind": "pipeline", "projectId": "", "roomId": "", "steps": [] } ] }
function autorun() {
  const f = path.join(DIR.state, 'autorun.json'); const plan = readJson(f); if (!plan?.tasks) return
  let n = 0
  for (const t of plan.tasks) {
    try {
      if (t.kind === 'style-references' || t.kind === 'style-brief') (t.all ? flatStyles().map((s) => s.id) : t.styles || []).forEach((id) => { jobs.unshift(buildJob(t.kind, { styleId: id })); n++ })
      if (t.kind === 'pipeline') { const steps = t.steps?.length ? t.steps : PIPELINE; jobs.unshift(buildJob(steps[0], { projectId: t.projectId, roomId: t.roomId, then: steps.slice(1) })); n++ }
    } catch (e) { console.log('autorun: skipped a task: ' + e.message) }
  }
  fs.renameSync(f, path.join(DIR.state, `autorun.done-${stamp()}.json`)); saveJobs()
  console.log(`  Autorun: queued ${n} Codex job(s) from autorun.json`)
}
try { autorun() } catch (e) { console.log('autorun failed: ' + e.message) }

// progress of the whole queue, for the Overview
app.get('/api/summary', h(() => { const c = {}; jobs.forEach((j) => { c[j.status] = (c[j.status] || 0) + 1 })
  const active = jobs.filter((j) => j.status === 'running').map((j) => ({ id: j.id, label: j.label, room: j.roomId, project: j.projectId, startedAt: j.startedAt }))
  return { counts: c, pausedUntil: pausedUntil > Date.now() ? new Date(pausedUntil).toISOString() : null, pauseReason, active, recentFailed: jobs.filter((j) => j.status === 'failed').slice(0, 8).map((j) => ({ id: j.id, label: j.label, room: j.roomId, tail: (j.log || '').slice(-300) })) } }))

app.get('/api/server', h((req) => { // how to reach this engine from the other laptops (the key only for this laptop's own screen)
  const ips = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address)
  return { server: SERVER, host: HOST, port: CFG.port, addresses: ips.map((ip) => `http://${ip}:${CFG.port}`), accessKey: isLocal(req) ? CFG.accessKey || '' : undefined, allowedOrigins: [...ORIGINS] }
}))

app.listen(CFG.port, HOST, () => {
  console.log(`Accord Design Engine on http://localhost:${CFG.port}${SERVER ? '  (server mode: other laptops can connect)' : ''}`)
  if (SERVER) {
    Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).forEach((i) => console.log(`  Team address: http://${i.address}:${CFG.port}`))
    console.log(`  Access key:   ${CFG.accessKey}   (give this to the team; a new one: delete .engine/access-key.txt and restart)`)
  }
  console.log(`  Design_Model: ${ROOT}`)
  console.log(`  Accord export: ${fs.existsSync(EXPORT) ? EXPORT : 'NOT FOUND (' + EXPORT + ')'}`)
  pump()
})
