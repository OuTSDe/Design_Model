// Asset library (vendor assets) and vendors, as plain folders in Design_Model:
//   Library/taxonomy.json                                  the folder system and the fixed form of each kind of asset
//   Library/<Group>/<Sub>/<Leaf>/<asset-id>/asset.json     one asset: vendor, fields, tags
//                                    …/images/<slot>.jpg   what the vendor sent (front, side, axo, face, seamless, reflection …)
//                                    …/std/<slot>.png      the standardised version made by Codex
//   Vendors/<vendor-id>/vendor.json                        the vendor (location, contact, categories, price band)
import fs from 'node:fs'
import path from 'node:path'
import { TAXONOMY, COMMON_FIELDS, flattenTaxonomy } from './taxonomy.mjs'

export function createAssets(ctx) {
  const { ROOT, DIR, ensure, readJson, writeJson, safe, slug, now, rel, fileUrl, IMG } = ctx
  const TAXF = path.join(DIR.library, 'taxonomy.json')
  const tax = () => readJson(TAXF) || TAXONOMY
  const nodes = () => flattenTaxonomy(tax())
  const node = (id) => nodes().find((n) => n.id === id)
  const folderOf = (n) => path.join(DIR.library, ...n.names.map((x) => safe(x).replace(/\//g, '-')))

  function seed() {
    ensure(DIR.library)
    if (!fs.existsSync(TAXF)) writeJson(TAXF, TAXONOMY)
    // a flat copy for Codex: every folder, its path on disk, its image slots and its fields
    writeJson(path.join(DIR.library, '_taxonomy-flat.json'), { note: 'Generated from taxonomy.json on every engine start. Do not edit; edit taxonomy.json.', common_fields: COMMON_FIELDS,
      nodes: nodes().map((n) => ({ id: n.id, leaf: n.leaf, folder: path.relative(DIR.library, folderOf(n)).split(path.sep).join('/'), slots: n.slots, fields: n.fields })) })
  }

  /* ── the asset index: every asset.json under Library ── */
  let cache = null
  const invalidate = () => { cache = null }
  function scan() {
    if (cache) return cache
    const out = []
    const walk = (d, depth) => { if (depth > 6 || !fs.existsSync(d)) return
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (!e.isDirectory() || e.name.startsWith('_') || e.name.startsWith('.')) continue
        const p = path.join(d, e.name), j = path.join(p, 'asset.json')
        if (fs.existsSync(j)) { const a = readJson(j); if (a?.id) out.push({ ...a, _dir: p }) } else walk(p, depth + 1)
      } }
    walk(DIR.library, 0); cache = out; return out
  }
  const byId = (id) => scan().find((a) => a.id === id)
  const imgFile = (dir, kind, slot) => { const d = path.join(dir, kind); if (!fs.existsSync(d)) return null; const f = fs.readdirSync(d).find((x) => IMG.test(x) && path.parse(x).name === slot); return f ? path.join(d, f) : null }
  const THUMB_ORDER = ['front', 'face', 'axo', 'swatch', 'seamless', 'lit', 'side', 'drape', 'context', 'laid']
  function thumbOf(a) {
    for (const kind of ['std', 'images']) for (const s of THUMB_ORDER) { const f = imgFile(a._dir, kind, s); if (f) return fileUrl(f) }
    for (const kind of ['std', 'images']) { const d = path.join(a._dir, kind); if (fs.existsSync(d)) { const f = fs.readdirSync(d).find((x) => IMG.test(x)); if (f) return fileUrl(path.join(d, f)) } }
    return null
  }
  const vendorsMap = () => Object.fromEntries(listVendors().map((v) => [v.id, v]))
  function summary(a, vm = vendorsMap()) {
    const n = node(a.category)
    return { id: a.id, category: a.category, categoryNames: n?.names || [a.category], name: a.fields?.name || a.id, vendor_id: a.vendor_id, vendor: vm[a.vendor_id]?.name || a.vendor || '',
      city: vm[a.vendor_id]?.city || '', price_inr: a.fields?.price_inr ?? null, price_unit: a.fields?.price_unit || '', thumb: thumbOf(a), styles: a.ai?.styles || {}, rooms: a.ai?.rooms || [],
      category2_shared: !!a.ai?.category2_shared, ornamentation: a.ai?.ornamentation ?? null, colours: a.ai?.colours || [], tagged: !!a.ai?.taggedAt,
      standardised: fs.existsSync(path.join(a._dir, 'std')) && fs.readdirSync(path.join(a._dir, 'std')).some((x) => IMG.test(x)),
      missing: missingOf(a, n), source: a.source || 'vendor', updatedAt: a.updatedAt }
  }
  function missingOf(a, n = node(a.category)) {
    if (!n) return []
    const m = n.slots.filter((s) => s.required && !imgFile(a._dir, 'images', s.key)).map((s) => s.label)
    ;[...COMMON_FIELDS, ...n.fields].filter((f) => f.required && (a.fields?.[f.key] === undefined || a.fields?.[f.key] === '' || a.fields?.[f.key] === null)).forEach((f) => m.push(f.label))
    return m
  }
  function full(a) {
    const n = node(a.category)
    const slot = (s) => { const o = imgFile(a._dir, 'images', s.key), t = imgFile(a._dir, 'std', s.key); return { ...s, original: o ? fileUrl(o) : null, standard: t ? fileUrl(t) : null } }
    const extra = ['images', 'std'].flatMap((k) => { const d = path.join(a._dir, k); return fs.existsSync(d) ? fs.readdirSync(d).filter((f) => IMG.test(f) && !(n?.slots || []).some((s) => s.key === path.parse(f).name)).map((f) => ({ kind: k, name: f, url: fileUrl(path.join(d, f)) })) : [] })
    return { ...summary(a), fields: a.fields || {}, ai: a.ai || null, node: n ? { id: n.id, names: n.names, fields: [...COMMON_FIELDS, ...n.fields] } : null, slots: (n?.slots || []).map(slot), extra, folder: rel(a._dir), createdAt: a.createdAt, history: a.history || [] }
  }
  const saveAsset = (a) => { const { _dir, ...data } = a; data.updatedAt = now(); writeJson(path.join(_dir, 'asset.json'), data); invalidate(); return { ...data, _dir } }

  function create({ category, vendor_id, fields = {}, source = 'vendor' }) {
    const n = node(category); if (!n) throw new Error('Choose a category')
    if (!n.leaf) throw new Error('Choose the exact kind (a folder with no sub-folders), e.g. Chair')
    const name = String(fields.name || '').trim(); if (!name) throw new Error('Give the product a name')
    const id = `${slug(vendor_id || 'vendor').slice(0, 16)}-${slug(name).slice(0, 28)}-${Math.random().toString(36).slice(2, 6)}`
    const dir = path.join(folderOf(n), id); ensure(path.join(dir, 'images'))
    return saveAsset({ id, category: n.id, vendor_id: vendor_id || '', fields: cleanFields(fields, n), source, createdAt: now(), _dir: dir })
  }
  function cleanFields(fields, n) {
    const out = {}
    for (const f of [...COMMON_FIELDS, ...n.fields]) {
      let v = fields[f.key]; if (v === undefined || v === '') continue
      if (f.type === 'number') { v = Number(String(v).replace(/[^\d.-]/g, '')); if (!Number.isFinite(v)) continue }
      if (f.type === 'bool') v = v === true || v === 'true' || v === 'yes'
      if (f.type === 'list' && !Array.isArray(v)) v = String(v).split(',').map((x) => x.trim()).filter(Boolean)
      if (typeof v === 'string') v = v.slice(0, 4000)
      out[f.key] = v
    }
    // keep fields the form does not know (from Codex or an older form) instead of losing them
    Object.keys(fields).forEach((k) => { if (!(k in out) && ![...COMMON_FIELDS, ...n.fields].some((f) => f.key === k) && fields[k] !== '') out[k] = fields[k] })
    return out
  }
  function update(id, body) {
    let a = byId(id); if (!a) throw new Error('Asset not found')
    if (body.category && body.category !== a.category) { // move to the new folder
      const n = node(body.category); if (!n?.leaf) throw new Error('Choose the exact kind')
      const to = path.join(folderOf(n), a.id); ensure(path.dirname(to)); fs.cpSync(a._dir, to, { recursive: true })
      const old = a._dir; a = { ...a, category: n.id, _dir: to }
      try { fs.rmSync(old, { recursive: true, force: true }) } catch { /* Drive may keep it; harmless */ }
    }
    if (body.vendor_id !== undefined) a.vendor_id = body.vendor_id
    if (body.fields) a.fields = cleanFields({ ...a.fields, ...body.fields }, node(a.category))
    return saveAsset(a)
  }
  function setImage(id, kind, slot, buf, ext) {
    const a = byId(id); if (!a) throw new Error('Asset not found')
    const d = path.join(a._dir, kind); ensure(d)
    const old = imgFile(a._dir, kind, slot)
    if (old) { const bin = path.join(a._dir, '_removed'); ensure(bin); fs.renameSync(old, path.join(bin, `${Date.now()}-${kind}-${path.basename(old)}`)) }
    fs.writeFileSync(path.join(d, `${slug(slot) || 'image'}.${ext}`), buf)
    saveAsset({ ...a, history: [...(a.history || []), { at: now(), what: `${kind === 'std' ? 'standard' : 'original'} ${slot} image` }].slice(-50) })
  }
  function removeImage(id, kind, slot) {
    const a = byId(id); if (!a) throw new Error('Asset not found')
    const f = imgFile(a._dir, kind, slot); if (!f) throw new Error('No image')
    const bin = path.join(a._dir, '_removed'); ensure(bin); fs.renameSync(f, path.join(bin, `${Date.now()}-${kind}-${path.basename(f)}`)); invalidate()
  }

  /* ── vendors ── */
  function listVendors() {
    ensure(DIR.vendors)
    return fs.readdirSync(DIR.vendors, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith('_')).map((e) => readJson(path.join(DIR.vendors, e.name, 'vendor.json'))).filter(Boolean)
  }
  const VENDOR_KEYS = ['name', 'city', 'area', 'address', 'state', 'website', 'instagram', 'contact_person', 'phone', 'email', 'categories', 'styles', 'price_band', 'gst', 'delivery', 'showroom', 'notes', 'rating', 'map_url']
  function saveVendor(body, id) {
    const vid = id || slug(body.name); if (!vid) throw new Error('Give the vendor a name')
    const f = path.join(DIR.vendors, vid, 'vendor.json'); const old = readJson(f) || {}
    if (!id && fs.existsSync(f)) throw new Error('A vendor with this name already exists')
    const v = { ...old, id: vid }
    VENDOR_KEYS.forEach((k) => { if (body[k] !== undefined) v[k] = typeof body[k] === 'string' ? body[k].slice(0, 2000) : body[k] })
    if (typeof v.categories === 'string') v.categories = v.categories.split(',').map((x) => x.trim()).filter(Boolean)
    v.updatedAt = now(); v.createdAt = v.createdAt || now(); writeJson(f, v); return v
  }
  function vendorDetail(id) {
    const v = readJson(path.join(DIR.vendors, path.basename(id), 'vendor.json')); if (!v) throw new Error('Vendor not found')
    const vm = { [v.id]: v }; const assets = scan().filter((a) => a.vendor_id === v.id).map((a) => summary(a, vm))
    return { ...v, assets }
  }
  function vendorList() {
    const all = scan(), vm = vendorsMap()
    return listVendors().map((v) => { const mine = all.filter((a) => a.vendor_id === v.id); const prices = mine.map((a) => a.fields?.price_inr).filter((x) => x > 0)
      return { ...v, assetCount: mine.length, groups: [...new Set(mine.map((a) => node(a.category)?.names?.[0]).filter(Boolean))], priceMin: prices.length ? Math.min(...prices) : null, priceMax: prices.length ? Math.max(...prices) : null,
        thumbs: mine.slice(0, 4).map((a) => thumbOf(a)).filter(Boolean), _vm: undefined } }).sort((a, b) => b.assetCount - a.assetCount || a.name.localeCompare(b.name))
  }

  /* ── theme filter: the assets that fit a style (for the library and for mood boards) ── */
  function forStyle(styleId, { category2 = false, min = 0.6, group } = {}) {
    return scan().filter((a) => a.ai?.styles && ((a.ai.styles[styleId] || 0) >= min || (category2 && a.ai.category2_shared && (a.ai.styles[styleId] || 0) >= min - 0.15)))
      .filter((a) => !group || a.category.startsWith(group)).sort((x, y) => (y.ai.styles[styleId] || 0) - (x.ai.styles[styleId] || 0))
  }

  /* ── HTTP ── */
  function routes(app, h, upload, fetchImage, queue) {
    app.get('/api/taxonomy', h(() => ({ tree: tax(), nodes: nodes(), common: COMMON_FIELDS })))
    app.put('/api/taxonomy', h((req) => { const t = req.body; if (!Array.isArray(t?.groups) || !t.groups.length) throw new Error('taxonomy needs groups'); flattenTaxonomy(t); writeJson(TAXF, t); seed(); return { ok: true } }))
    app.get('/api/assets', h((req) => {
      const { cat, vendor, style, q } = req.query; const min = Number(req.query.min || 0.6); const vm = vendorsMap()
      let list = scan()
      if (cat) list = list.filter((a) => a.category === cat || a.category.startsWith(cat + '/'))
      if (vendor) list = list.filter((a) => a.vendor_id === vendor)
      if (style) list = list.filter((a) => (a.ai?.styles?.[style] || 0) >= min).sort((x, y) => (y.ai.styles[style] || 0) - (x.ai.styles[style] || 0))
      if (q) { const s = String(q).toLowerCase(); list = list.filter((a) => JSON.stringify([a.fields, a.ai?.keywords, vm[a.vendor_id]?.name]).toLowerCase().includes(s)) }
      return list.map((a) => summary(a, vm))
    }))
    app.get('/api/assets/counts', h(() => { const c = {}; scan().forEach((a) => { const parts = a.category.split('/'); parts.forEach((_, i) => { const k = parts.slice(0, i + 1).join('/'); c[k] = (c[k] || 0) + 1 }) }); return c }))
    app.get('/api/assets/:id', h((req) => { const a = byId(req.params.id); if (!a) throw new Error('Asset not found'); return full(a) }))
    app.post('/api/assets', h((req) => { const a = create(req.body); return full(a) }))
    app.put('/api/assets/:id', h((req) => full(update(req.params.id, req.body))))
    app.post('/api/assets/:id/images/:slot', upload.array('files', 1), h(async (req) => {
      const kind = req.query.kind === 'std' ? 'std' : 'images'; let buf, ext
      const f = (req.files || [])[0]
      if (f) { if (!/^image\//.test(f.mimetype)) throw new Error('Not an image'); buf = f.buffer; ext = (path.extname(f.originalname).slice(1) || 'jpg').toLowerCase() }
      else if (req.body?.urls) { const r = await fetchImage([].concat(req.body.urls)[0]); buf = r.buf; ext = r.ext } else throw new Error('No image received')
      setImage(req.params.id, kind, req.params.slot, buf, ext.replace('jpeg', 'jpg')); return { saved: [req.params.slot] }
    }))
    app.delete('/api/assets/:id/images/:slot', h((req) => { removeImage(req.params.id, req.query.kind === 'std' ? 'std' : 'images', req.params.slot); return { ok: true } }))
    app.post('/api/assets/:id/codex', h((req) => { const a = byId(req.params.id); if (!a) throw new Error('Asset not found')
      const steps = { tag: ['asset-tag'], standardise: ['asset-standardise'], both: ['asset-tag', 'asset-standardise'] }[req.body.kind || 'both']; if (!steps) throw new Error('Unknown kind')
      return queue(steps, { assetId: a.id }) }))
    app.post('/api/assets-codex-all', h((req) => { // tag / standardise every asset that is not done yet
      const list = scan().filter((a) => (req.body.kind === 'standardise' ? !summary(a).standardised : !a.ai?.taggedAt))
      const steps = req.body.kind === 'standardise' ? ['asset-standardise'] : ['asset-tag']
      list.forEach((a) => queue(steps, { assetId: a.id })); return { queued: list.length } }))
    app.get('/api/vendors', h(() => vendorList()))
    app.get('/api/vendors/:id', h((req) => vendorDetail(req.params.id)))
    app.post('/api/vendors', h((req) => saveVendor(req.body)))
    app.put('/api/vendors/:id', h((req) => saveVendor(req.body, path.basename(req.params.id))))
  }

  return { seed, scan, byId, full, summary, node, nodes, folderOf, invalidate, routes, listVendors, saveVendor, forStyle, imgFile, saveAsset, create, cleanFields, missingOf, tax }
}
