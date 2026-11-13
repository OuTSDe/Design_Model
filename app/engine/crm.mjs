// Accord CRM (test copy) on the Design Engine server.
//
// 1. The test backend. The dummy CRM in Design_Model/CRM_Application talks to its Google backend through one set of
//    actions (login, pull, push, upload, …). This module answers the same actions, so the test CRM keeps its data in
//    Design_Model/CRM_Test_Data (in the Drive) and every device that opens <server>/crm/ shares it. The real Google
//    backend and the real CRM are not touched. Sign-in uses the CRM's own accounts (first sign-in: Accord2026).
// 2. The design link. Accord Design projects, the buyer's Accord experience session (the survey) and the vendor
//    directory are sent to the engine, and the engine's rooms, renders and products come back to the CRM.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

export const TEST_VERSION = '3.8.7'   // the backend version the CRM build asks for (store.jsx NEEDS_BACKEND)
const TEMP_PASSWORD = 'Accord2026'
const SECRET = ['pwSalt', 'pwHash', 'failed', 'lockedUntil', 'totpSecret', 'totpPending', 'totpLast', 'trust']
// the vendor fields the design side may hold: no bank, PAN or GST numbers
const VENDOR_SAFE = (v) => ({ name: v.name, city: v.city || '', area: v.area || '', address: v.address || '', website: v.website || '', contact_person: v.contactName || '',
  phone: v.phone || '', email: v.email || '', categories: [v.category, ...String(v.packages || '').split(/[,;\n]/)].map((x) => String(x || '').trim()).filter(Boolean).slice(0, 12),
  notes: [v.brands && 'Brands: ' + v.brands, v.leadTime && 'Lead time: ' + v.leadTime, v.moq && 'Minimum order: ' + v.moq, v.serviceMangaluru && 'Service in Mangaluru: ' + v.serviceMangaluru].filter(Boolean).join(' · '),
  crm_id: v.id, crm_status: v.status || '' })

/* ── TOTP (RFC 6238), the same as Code.gs ── */
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const b32enc = (buf) => { let bits = 0, val = 0, out = ''; for (const b of buf) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5 } } if (bits > 0) out += B32[(val << (5 - bits)) & 31]; return out }
const b32dec = (s) => { let bits = 0, val = 0; const out = []; for (const c of String(s).toUpperCase().replace(/[^A-Z2-7]/g, '')) { val = (val << 5) | B32.indexOf(c); bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8 } } return Buffer.from(out) }
const totpAt = (secret, step) => { const m = Buffer.alloc(8); m.writeBigUInt64BE(BigInt(step)); const h = crypto.createHmac('sha1', b32dec(secret)).update(m).digest(); const o = h[19] & 15
  return String(((h[o] & 127) << 24 | h[o + 1] << 16 | h[o + 2] << 8 | h[o + 3]) % 1e6).padStart(6, '0') }
const totpCheck = (secret, code, last) => { code = String(code || '').replace(/\D/g, ''); if (code.length !== 6 || !secret) return -1
  const now = Math.floor(Date.now() / 30000); for (let k = -1; k <= 1; k++) { const st = now + k; if (st > Number(last || 0) && totpAt(secret, st) === code) return st } return -1 }
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex')
const hashPw = (salt, pw) => sha(salt + '|' + pw)
const strong = (pw) => String(pw || '').length >= 8 && /[a-z]/i.test(pw) && /\d/.test(pw)
const cookie = (req, k) => (String(req.headers.cookie || '').split(/;\s*/).find((x) => x.startsWith(k + '=')) || '').slice(k.length + 1)

export function createCrm(ctx) {
  const { app, express, ROOT, readJson, writeJson, ensure, safe, slug, now, h, fileUrl, A, readAccord, listProjects, hydrate, saveProject, projDir, roomFolders, roomsFor, STYLES } = ctx
  const TD = path.join(ROOT, 'CRM_Test_Data'); const DBF = path.join(TD, 'db.json'); const SESSF = path.join(TD, 'sessions.json'); const FILES = path.join(TD, 'Files')
  const SITE = path.join(ROOT, 'CRM_Application', 'site')
  let db = readJson(DBF, null)
  const sessions = new Map(Object.entries(readJson(SESSF, {})))   // token → { id, at }
  let timer = null
  const save = () => { clearTimeout(timer); timer = setTimeout(() => { ensure(TD); const t = DBF + '.tmp'; fs.writeFileSync(t, JSON.stringify(db)); fs.renameSync(t, DBF); writeJson(SESSF, Object.fromEntries(sessions)) }, 300) }
  const bump = (c) => { db._ver = db._ver || {}; db._ver[c] = (db._ver[c] || 0) + 1 }
  const list = (c) => { if (!Array.isArray(db[c])) db[c] = []; return db[c] }
  const find = (c, id) => list(c).find((x) => String(x.id) === String(id))
  const put = (c, rec) => { const l = list(c); const i = l.findIndex((x) => String(x.id) === String(rec.id)); if (i >= 0) l[i] = rec; else l.unshift(rec); bump(c); if (c === 'vendors') mirrorVendor(rec) }
  // every vendor in the directory (and every onboarding form) is mirrored into the engine's vendor library, without bank, PAN or GST numbers
  function mirrorVendor(v) { try { if (!v?.name || v.status === 'Rejected') return; const all = A.listVendors(); const cur = all.find((x) => x.crm_id === v.id) || all.find((x) => x.id === slug(v.name)); A.saveVendor(VENDOR_SAFE(v), cur?.id || slug(v.name)) } catch (e) { console.log('[crm] vendor not mirrored: ' + e.message) } }
  const del = (c, id) => { db[c] = list(c).filter((x) => String(x.id) !== String(id)); bump(c) }
  const settings = () => list('settings')[0] || {}
  const publicUser = (u) => ({ id: u.id, photo: u.photo, name: u.name, username: u.username, appRole: u.appRole, workspaces: u.workspaces, designation: u.designation, email: u.email,
    extraAccess: u.extraAccess || [], mustChange: u.mustChange === 'Yes', mfa: !!u.totpSecret })
  const userOf = (token) => { const s = token && sessions.get(token); if (!s || Date.now() - s.at > 7 * 864e5) return null; const u = db && find('users', s.id); return u && u.active !== 'No' ? u : null }
  const auth = (token, allowUnenrolled) => { const u = userOf(token); if (!u) throw new Error('Session expired, please sign in again')
    if (!allowUnenrolled && !u.totpSecret && settings().authMode !== 'password') throw new Error('Link your authenticator app first (sign in again)'); return u }
  const empty = () => !db || !list('users').length
  const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  const clock = () => new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })

  // design-safe test clients and their experience sessions from the Accord export, so there are bookings to design for
  function testClients() {
    const a = readAccord(); if (!a.ok) return { clients: [], sessions: [] }
    return { clients: a.clients.map((c) => ({ id: c.bookingId, bookingId: c.bookingId, clientId: c.clientId, unit: c.unit, title: c.title, name: c.name, status: c.status || 'Booked', owner: c.owner,
      config: c.type, area: c.area, occupant: c.occupant, familyProfile: c.familyProfile, purpose: c.purpose, interests: [], _test: 'From the Accord export (no contact details or money)' })),
      sessions: a.sessions.map((s) => ({ ...s, startedAt: s.updatedAt })) }
  }

  const ACT = {
    ping: () => ({ ok: true, version: TEST_VERSION, test: true, empty: empty(), sheet: 'Accord test database (Design_Model / CRM_Test_Data)', users: db ? list('users').length : 0, folder: 'Design_Model/CRM_Test_Data', serverTime: now() }),
    seed: (req) => {
      if (!empty()) { const u = auth(req.token); if (u.appRole !== 'admin') throw new Error('Only an admin can seed') }
      const old = db; const src = req.db || {}; db = { _ver: (old && old._ver) || {} }
      Object.keys(src).forEach((c) => { if (Array.isArray(src[c]) && c !== 'audit') { db[c] = src[c]; bump(c) } })
      // keep everyone's sign-in when an admin seeds again
      if (old) list('users').forEach((x) => { const c = (old.users || []).find((y) => y.id === x.id); if (c) SECRET.concat(['mustChange']).forEach((k) => { if (c[k] !== undefined) x[k] = c[k] }) })
      const s = list('settings'); if (!s.length) s.push({ id: 'main' })
      list('vendors').forEach(mirrorVendor)
      if (!list('clients').length) { const t = testClients(); db.clients = t.clients; db.accordSessions = [...list('accordSessions'), ...t.sessions.filter((x) => !find('accordSessions', x.id))]; bump('clients'); bump('accordSessions') }
      save(); return { ok: true, serverTime: now(), clients: list('clients').length }
    },
    login: (req) => {
      if (empty()) throw new Error('The test database is empty. Reload the page; it is set up on the first visit.')
      const uname = String(req.username || '').trim().toLowerCase()
      const u = list('users').find((x) => String(x.username || '').toLowerCase() === uname)
      if (!u || u.active === 'No' || u.appRole === 'none') throw new Error('Unknown username or code')
      const mode = settings().authMode === 'password' ? 'password' : 'authenticator'; const enrolled = !!u.totpSecret
      const dev = String(req.deviceId || ''); const tr = (u.trust || {})[dev]
      let trusted = false
      if (req.trustToken && tr && tr.hash === sha(req.trustToken) && new Date(tr.until) > new Date()) trusted = true
      else if (mode === 'authenticator' && enrolled) { const st = totpCheck(u.totpSecret, req.code, u.totpLast); if (st < 0) throw new Error('That code is not right. Open your authenticator app and type the 6 digits shown for Accord.'); u.totpLast = st }
      else if (!u.pwHash) { if (String(req.password || '') !== TEMP_PASSWORD) throw new Error('Unknown username or temporary password (the test copy uses Accord2026)') }
      else if (hashPw(u.pwSalt, String(req.password || '')) !== u.pwHash) throw new Error('Unknown username or password')
      let trust = null; const days = Number(settings().trustDays ?? 3)
      if (req.trust && days > 0 && !trusted && dev) { const t = crypto.randomUUID() + crypto.randomUUID(); u.trust = { ...(u.trust || {}), [dev]: { hash: sha(t), until: new Date(Date.now() + days * 864e5).toISOString() } }; trust = { token: t, until: u.trust[dev].until } }
      bump('users'); const token = crypto.randomUUID(); sessions.set(token, { id: u.id, at: Date.now() }); save()
      const pu = publicUser(u); pu.mustEnrol = mode === 'authenticator' && !enrolled
      return { token, user: pu, serverTime: now(), trust, trusted, _cookie: token }
    },
    logout: (req) => { try { const u = userOf(req.token); if (u && req.ops?.length) ACT.push({ ...req, token: req.token }) } catch { /* */ } sessions.delete(String(req.token || '')); save(); return { ok: true, _cookie: '' } },
    emailCode: () => { throw new Error('E-mailed codes are not available in the test copy. Use your password or authenticator.') },
    enrolStart: (req) => { const u = auth(req.token, true); u.totpPending = b32enc(crypto.randomBytes(20)); bump('users'); save()
      return { ok: true, secret: u.totpPending, uri: `otpauth://totp/${encodeURIComponent('Accord (test)')}:${encodeURIComponent(u.username)}?secret=${u.totpPending}&issuer=Accord&digits=6&period=30` } },
    enrolConfirm: (req) => { const u = auth(req.token, true); const st = totpCheck(u.totpPending, req.code, 0); if (st < 0) throw new Error('That code does not match. Check the phone clock is set automatically, then try the newest code.')
      Object.assign(u, { totpSecret: u.totpPending, totpPending: '', totpLast: st, mustChange: 'No', pwSalt: crypto.randomBytes(8).toString('hex') }); u.pwHash = hashPw(u.pwSalt, crypto.randomUUID()) // the temporary password stops working
     ; if (req.email && !u.email) u.email = String(req.email).slice(0, 120); bump('users'); save(); return { ok: true, user: publicUser(u) } },
    changePassword: (req) => { const u = auth(req.token, true)
      if (u.pwHash ? hashPw(u.pwSalt, String(req.old || '')) !== u.pwHash : String(req.old || '') !== TEMP_PASSWORD) throw new Error('Current password is wrong')
      if (!strong(req.password)) throw new Error('Use at least 8 characters with a letter and a number')
      u.pwSalt = crypto.randomBytes(8).toString('hex'); u.pwHash = hashPw(u.pwSalt, req.password); u.mustChange = 'No'; bump('users'); save(); return { ok: true, user: publicUser(u) } },
    setPassword: (req) => { const a = auth(req.token); if (a.appRole !== 'admin') throw new Error('Only an admin can reset sign-in'); const u = find('users', req.userId); if (!u) throw new Error('Unknown user')
      if (!strong(req.password)) throw new Error('Use at least 8 characters with a letter and a number')
      Object.assign(u, { pwSalt: crypto.randomBytes(8).toString('hex'), mustChange: 'Yes', totpSecret: '', totpPending: '', totpLast: '', trust: {} }); u.pwHash = hashPw(u.pwSalt, req.password); bump('users'); save(); return { ok: true } },
    pull: (req) => { const u = auth(req.token); const out = {}, tok = {}; const have = req.have || {}
      Object.keys(db).filter((c) => Array.isArray(db[c])).forEach((c) => { tok[c] = `${(db._ver || {})[c] || 0}.${u.id}.${u.appRole}`
        if (have[c] === tok[c]) return
        out[c] = c === 'users' ? db.users.map((x) => { const y = { ...x }; SECRET.forEach((k) => delete y[k]); y.hasPassword = !!x.pwHash; y.mfa = x.totpSecret ? 'Set' : 'Not set'; if (u.appRole !== 'admin') delete y.devices; return y })
          : c === 'audit' ? (u.appRole === 'admin' ? db.audit.slice(0, 1000) : []) : db[c] })
      return { db: out, tok, serverTime: now(), user: publicUser(u), version: TEST_VERSION } },
    push: (req) => { const u = auth(req.token); const refused = [], renamed = [], remap = {}
      for (const op of req.ops || []) { try {
        const c = op.coll; if (!/^[a-zA-Z]+$/.test(c || '')) { refused.push(String(c)); continue }
        if (op.op === 'delete') { const id = remap[op.id] || op.id
          if (u.appRole !== 'admin' && !['tasks', 'notifications'].includes(c)) { refused.push(c + ' delete'); continue } del(c, id); continue }
        const rec = { ...(op.rec || {}) }; if (!rec.id) { refused.push(c + ' (no id)'); continue }
        if (c === 'settings' && u.appRole !== 'admin') { refused.push('settings'); continue }
        if (c === 'users' && u.appRole !== 'admin' && rec.id !== u.id) { refused.push('users'); continue }
        Object.keys(remap).forEach((k) => Object.keys(rec).forEach((f) => { if (rec[f] === k) rec[f] = remap[k] }))
        const cur = find(c, rec.id)
        if (cur && op.isNew && rec._cid && cur._cid && cur._cid !== rec._cid) {   // a colleague already used this number: take the next free one
          const m = String(rec.id).match(/^(.*?)(\d+)$/); if (m) { let max = 0; list(c).forEach((x) => { const k = String(x.id); if (k.startsWith(m[1])) max = Math.max(max, Number(k.slice(m[1].length)) || 0) })
            const nid = m[1] + String(max + 1).padStart(m[2].length, '0'); remap[rec.id] = nid; renamed.push({ coll: c, from: rec.id, to: nid }); rec.id = nid } }
        const keep = c === 'users' && cur ? Object.fromEntries(SECRET.filter((k) => cur[k] !== undefined).map((k) => [k, cur[k]])) : {}
        rec.updatedAt = now(); rec.updatedBy = u.name
        put(c, { ...(find(c, rec.id) || {}), ...rec, ...keep })
      } catch (e) { refused.push(`${op.coll} (not saved: ${String(e.message).slice(0, 100)})`) } }
      save(); return { ok: true, refused, renamed } },
    punch: (req) => { const u = auth(req.token); const allowed = ['in', 'out', 'break', 'resume', 'site', 'office', 'remote']; let type = req.type
      if (!allowed.includes(type)) throw new Error('Unknown punch type')
      const d = today(), t = clock(), at = now(); let a = list('attendance').find((x) => x.userId === u.id && x.date === d)
      if (type === 'in') { if (a && !a.out) return { ok: true, attendance: a, serverTime: at }
        a = a || { id: `AT-${d.replace(/-/g, '')}-${u.id}`, userId: u.id, name: u.name, date: d, in: t, events: [] }; const mode = req.mode || 'office'
        Object.assign(a, { out: '', mode, state: mode, status: u.shiftStart && t > u.shiftStart ? 'Late' : 'Present', where: 'Test copy (location not checked)' }) }
      else { if (!a || a.out) throw new Error('You are not punched in'); if (type === 'out') a.out = t; else a.state = type === 'resume' ? (a.mode || 'office') : type }
      a.events = [...(a.events || []), { type, t: at, note: req.note || '' }]; put('attendance', a); save(); return { ok: true, attendance: a, serverTime: at, geo: { ok: true, where: a.where } } },
    upload: (req) => { const u = auth(req.token); if (!req.data) throw new Error('No file')
      const m = req.meta || {}; const ext = (String(req.origName || '').match(/\.[a-z0-9]{2,5}$/i) || [''])[0]
      const folder = String(req.folder || 'Unsorted').split('/').map((x) => safe(x)).filter((x) => x && x !== '.' && x !== '..'); const dir = path.join(FILES, ...folder); ensure(dir)
      const base = safe(req.name || 'file'); let name = base + ext, n = 1; while (fs.existsSync(path.join(dir, name))) name = `${base}_${++n}${ext}`
      fs.writeFileSync(path.join(dir, name), Buffer.from(req.data, 'base64'))
      const id = 'F-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 4)
      const rec = { id, at: now(), by: u.name, kind: m.kind || '', recordId: m.recordId || '', label: m.label || '', category: m.category || '', doc: m.doc || '', name, url: `../crm-file/${id}`,
        folder: folder.join('/'), path: path.relative(TD, path.join(dir, name)).split(path.sep).join('/'), _test: m.test ? 'Yes' : '' }
      put('files', rec); save(); return { ok: true, url: rec.url, id, name, file: rec, folderUrl: '' } },
    fileGet: (req) => { auth(req.token); const f = find('files', req.id); if (!f) throw new Error('File not found')
      const p = path.join(TD, f.path); const buf = fs.readFileSync(p); return { ok: true, name: f.name, mime: mimeOf(f.name), data: buf.toString('base64') } },
    fileDelete: (req) => { const u = auth(req.token); const f = find('files', req.id); if (!f) throw new Error('File not found')
      if (u.appRole !== 'admin' && f.by !== u.name) throw new Error('Only the person who uploaded it, or an admin, can delete this file')
      try { const p = path.join(TD, f.path), bin = path.join(TD, '_removed'); ensure(bin); fs.renameSync(p, path.join(bin, Date.now() + '_' + path.basename(p))) } catch { /* */ }
      del('files', f.id); save(); return { ok: true, deleted: f.id } },
    setPhoto: (req) => { const u = auth(req.token); const id = req.userId || u.id; if (id !== u.id && u.appRole !== 'admin') throw new Error('Only admins can change someone else\'s picture')
      const x = find('users', id); if (!x) throw new Error('Unknown user'); x.photo = String(req.photo || '').slice(0, 45000); bump('users'); save(); return { ok: true } },
    approveDevice: (req) => { const a = auth(req.token); if (a.appRole !== 'admin') throw new Error('Only an admin can approve devices'); const u = find('users', req.userId); if (!u) throw new Error('Unknown user')
      u.devices = (u.devices || []).map((d) => (d.id === req.deviceId ? { ...d, approved: req.approve !== false } : d)).filter((d) => req.approve !== false || d.id !== req.deviceId); bump('users'); save(); return { ok: true, devices: u.devices } },
    releaseDevice: (req) => { const a = auth(req.token); if (a.appRole !== 'admin') throw new Error('Only an admin can release devices'); const u = find('users', req.userId); if (!u) throw new Error('Unknown user')
      u.devices = (u.devices || []).filter((d) => d.id !== req.deviceId); bump('users'); save(); return { ok: true, devices: u.devices } },
    dedupeUsers: (req) => { auth(req.token); return { ok: true, removed: 0 } },
    logo: (req) => { auth(req.token); return { ok: true } },
    exportNow: (req) => { const u = auth(req.token); if (u.appRole !== 'admin') throw new Error('Only an admin can export'); writeJson(path.join(TD, 'Exports', `accord-test-${today()}.json`), db); return { ok: true, url: '', folderUrl: '' } },
    sendEmail: () => { throw new Error('The test copy does not send e-mails.') },
    apply: (req) => { const rec = req.rec || {}; if (!rec.name || !rec.phone) throw new Error('Name and phone are required')
      let max = 0; list('vendors').forEach((v) => { const m = String(v.id).match(/^V-(\d+)$/); if (m) max = Math.max(max, Number(m[1])) })
      const clean = { ...rec, id: 'V-' + String(max + 1).padStart(3, '0'), status: 'Applied', source: 'Onboarding form', appliedOn: today(), updatedAt: now(), updatedBy: 'Vendor (public form)' }
      put('vendors', clean); save(); return { ok: true, id: clean.id } },
    clientForm: (req) => { const c = find('clients', req.b); if (!c || String(c.formToken || '') !== String(req.k || '') || String(req.k || '').length < 12) throw new Error('This link has expired. Please ask your client advisor for a new one.')
      const id = 'CF-' + Date.now().toString(36).toUpperCase(); put('clientForms', { id, bookingId: c.bookingId, clientId: c.clientId, unit: c.unit, name: c.name, submittedAt: now(), status: 'New', data: req.rec || {} }); save(); return { ok: true, id } },
    inboundLead: (req) => { const s = settings(); if (!s.inboundKey || String(req.key || '') !== String(s.inboundKey)) throw new Error('Not allowed')
      const done = []; (req.leads || [req.lead || req]).slice(0, 50).forEach((x) => { const id = 'IN-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase()
        put('leadInbox', { id, at: now(), source: String(x.source || 'Inbound').slice(0, 60), name: String(x.name || '').slice(0, 200), phone: String(x.phone || '').slice(0, 30), email: String(x.email || '').slice(0, 120), message: String(x.message || '').slice(0, 1500), status: 'New' }); done.push(id) })
      save(); return { ok: true, received: done.length, ids: done } },
  }
  const mimeOf = (n) => ({ '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })[path.extname(n).toLowerCase()] || 'application/octet-stream'

  // the CRM posts text/plain JSON (no CORS preflight against Google); same here
  app.post('/crm-api', express.text({ type: '*/*', limit: '60mb' }), (req, res) => {
    let body; try { body = JSON.parse(req.body || '{}') } catch { return res.json({ error: 'Bad request' }) }
    const fn = ACT[body.action]; if (!fn) return res.json({ error: `"${body.action}" is not part of the test copy of the backend` })
    try { const out = fn(body) || {}
      if ('_cookie' in out) { res.setHeader('Set-Cookie', `crm_t=${out._cookie}; Path=/; HttpOnly; SameSite=Lax${out._cookie ? '; Max-Age=604800' : '; Max-Age=0'}`); delete out._cookie }
      res.json(out) } catch (e) { res.json({ error: e.message }) }
  })
  // uploaded files: only for someone signed in to the test CRM (or the engine itself)
  app.get('/crm-file/:id', (req, res) => { const ok = userOf(cookie(req, 'crm_t')) || req.engineOk; const f = db && find('files', req.params.id)
    if (!ok) return res.status(401).send('Sign in to Accord first'); if (!f) return res.status(404).send('File not found'); res.sendFile(path.join(TD, f.path)) })

  // the test CRM site, with its backend pointed at this server
  app.get(['/crm/accord.config.js'], (req, res) => res.type('js').send(`// written by the Design Engine: the test copy of Accord uses this server as its backend
window.ACCORD_CONFIG = { backendUrl: location.origin + '/crm-api', testBackend: true, designEngine: location.origin }\n`))
  app.get(/^\/crm$/, (req, res) => res.redirect('/crm/'))
  app.use('/crm', express.static(SITE, { index: 'index.html', dotfiles: 'deny' }))

  /* ── the design link ───────────────────────────────────────── */
  const KEYWORDS = [['rich-indian-traditional', /indian|heritage|temple|carved|jaali|ornate/i], ['antique-eclectic', /antique|eclectic|collector|vintage/i], ['biophilic', /biophil|green|garden|nature|botanic|living wall/i],
    ['farm-house', /farm|rustic|cottage/i], ['industrial', /industrial|loft|concrete|steel/i], ['minimalism', /minimal|quiet|calm|bare|zen|japandi|bone|white/i], ['mid-century-modern', /mid.?century|retro|teak|60s/i],
    ['maximal-traditional-minimal', /maximal.*minimal|layered|jewel|emerald|lacquer/i], ['traditional', /traditional|classic/i], ['modern', /modern|sleek|monochrome|black/i], ['contemporary', /warm|travertine|walnut|oak|contemporary/i]]
  const styleFor = (s = {}) => { const t = [s.persona, s.palette, s.register].filter(Boolean).join(' '); const hit = KEYWORDS.find(([, re]) => re.test(t)); return hit ? hit[0] : '' }
  const styleName = (id) => { for (const s of STYLES) { if (s.id === id) return s.name; const x = (s.subs || []).find((y) => y.id === id); if (x) return x.name } return id }
  const byCrm = (crmId) => listProjects().find((p) => p.crmId === crmId)
  const engineAuth = (req) => req.engineOk || userOf(cookie(req, 'crm_t'))

  app.get('/api/crm/link', h((req) => { const p = byCrm(String(req.query.crmId || '')); return { project: p ? hydrate(p) : null, styles: STYLES } }))
  // create or update the engine project for an Accord Design project: the booking facts, the latest experience session and the rooms
  app.post('/api/crm/link', h((req) => { const { crm = {}, facts = {}, session = {}, rooms = [] } = req.body || {}
    if (!crm.id) throw new Error('No Accord project')
    let p = byCrm(crm.id) || (facts.bookingId && listProjects().find((x) => x.bookingId === facts.bookingId))
    const isNew = !p
    if (!p) { const id = safe(facts.unitNo && facts.name ? `${facts.unitNo} ${facts.name}` : crm.name || crm.id); if (fs.existsSync(path.join(projDir(id), 'project.json'))) throw new Error(`An engine project called "${id}" already exists`)
      p = { id, createdAt: now(), status: 'Brief', style: '', brief: '', rooms: [] } }
    const suggested = styleFor(session)
    Object.assign(p, { crmId: crm.id, name: crm.name || p.name, bookingId: facts.bookingId || p.bookingId || '', clientId: facts.clientId || p.clientId || '', unit: facts.unitNo || p.unit || '', client: facts.name || p.client || '',
      type: facts.type || p.type || '', area: facts.area || p.area || '', floor: facts.floor ?? p.floor ?? '', band: facts.band || p.band || '', designer: crm.designer || p.designer || '', crmStatus: crm.status || '',
      budget: crm.budget || '', due: crm.due || '', session: session.id || p.session || '', persona: session.persona || p.persona || '', palette: session.palette || p.palette || '', register: session.register || p.register || '',
      sessionScreen: session.screen || p.sessionScreen || '', suggestedStyle: suggested || p.suggestedStyle || '' })
    if (!p.style && suggested) p.style = suggested
    const crmBrief = [crm.notes, session.id && `Accord experience ${session.id}: persona ${session.persona || '–'}, palette ${session.palette || '–'}, register ${session.register || '–'}${session.coherence ? ', coherence ' + session.coherence : ''}`].filter(Boolean).join('\n\n')
    if (crmBrief && !String(p.brief || '').includes(crmBrief.slice(0, 60))) p.brief = [p.brief, crmBrief].filter(Boolean).join('\n\n')
    const have = new Set((p.rooms || []).map((r) => r.name.toLowerCase()))
    const add = (rooms.length ? rooms.map((r) => ({ id: slug(r.name), name: r.name, group: 'Accord', crmRoomId: r.id })) : p.rooms?.length ? [] : roomsFor(p.type).map((r) => ({ ...r })))
    add.forEach((r) => { if (!have.has(r.name.toLowerCase())) { p.rooms = [...(p.rooms || []), { style: '', notes: '', ...r }]; have.add(r.name.toLowerCase()) } else if (r.crmRoomId) { const x = p.rooms.find((y) => y.name.toLowerCase() === r.name.toLowerCase()); x.crmRoomId = r.crmRoomId } })
    ensure(projDir(p.id)); p.rooms.forEach((r) => roomFolders(p.id, r)); saveProject(p)
    return { project: hydrate(p), created: isNew, style: p.style ? styleName(p.style) : '' } }))
  // everything the design produced for the BOQ: products per room with vendor and price
  app.get('/api/crm/boq', h((req) => { const p = byCrm(String(req.query.crmId || '')); if (!p) throw new Error('This project has not been sent to the Design Engine')
    const x = hydrate(p); return x.rooms.flatMap((r) => (r.products || []).filter(Boolean).map((a) => ({ room: r.name, crmRoomId: r.crmRoomId || '', element: a.element || '', name: a.name, asset_id: a.id || '', vendor: a.vendor || '',
      vendor_id: a.vendor_id || '', vendorCrmId: (a.vendor_id && A.listVendors().find((v) => v.id === a.vendor_id)?.crm_id) || '', price_inr: a.price_inr ?? null, price_unit: a.price_unit || '', url: a.url || '', thumb: a.thumb || a.imageUrls?.[0]?.url || '' }))) }))
  // the CRM vendor directory into the engine's vendor library (no bank, PAN or GST numbers)
  app.post('/api/crm/vendors', h((req) => { const all = A.listVendors(); let made = 0, updated = 0
    for (const v of (req.body?.vendors || []).filter((x) => x && x.name)) { const cur = all.find((x) => x.crm_id === v.id) || all.find((x) => x.id === slug(v.name))
      A.saveVendor(VENDOR_SAFE(v), cur?.id || slug(v.name)); cur ? updated++ : made++ }
    return { made, updated } }))
  // engine vendors (with their library size) for the CRM: the ones Codex found that are not in the directory yet come back for review
  app.get('/api/crm/vendors', h(() => A.listVendors().map((v) => ({ id: v.id, name: v.name, city: v.city || '', area: v.area || '', website: v.website || '', categories: v.categories || [], crm_id: v.crm_id || '', price_band: v.price_band || '' }))))

  return { engineAuth, userOf: (req) => userOf(cookie(req, 'crm_t')), isTestPath: (p) => p === '/crm-api' || p.startsWith('/crm/') || p === '/crm' || p.startsWith('/crm-file/') }
}
