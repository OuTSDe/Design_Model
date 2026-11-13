// Talks to the Design Engine. Which engine:
//   - the address saved on this computer (Connect screen: the server laptop, e.g. http://192.168.1.20:4317), else
//   - the build-time address (GitHub Pages build: http://localhost:4317), else
//   - the same address the page came from (dev: Vite proxies /api and /files; server: the engine serves the UI itself).
// A server laptop asks other computers for its access key, sent as x-engine-key (and ?k= on image links).
const read = (k) => { try { return localStorage.getItem(k) || '' } catch { return '' } }
export const ENGINE = (read('de.engine') || import.meta.env.VITE_ENGINE_URL || '').replace(/\/$/, '')
export const KEY = read('de.key')
export function connect(engine, key) { try { localStorage.setItem('de.engine', (engine || '').trim().replace(/\/$/, '')); localStorage.setItem('de.key', (key || '').trim()) } catch { /* */ } location.reload() }
const withKey = (u) => (KEY ? u + (u.includes('?') ? '&' : '?') + 'k=' + encodeURIComponent(KEY) : u)
// engine answers contain '/files/…' links; point them at the engine and add the key
export const fix = (v) => typeof v === 'string' ? (v.startsWith('/files/') ? withKey(ENGINE + v) : v) : Array.isArray(v) ? v.map(fix) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fix(x)])) : v
export const engineUrl = (u) => (u.startsWith('/') ? ENGINE + u : u)
export const headers = (h = {}) => (KEY ? { ...h, 'x-engine-key': KEY } : h)
export class NeedKey extends Error {}

async function call(method, url, body) {
  const opt = { method, headers: headers() }
  if (body instanceof FormData) opt.body = body
  else if (body !== undefined) { opt.headers['content-type'] = 'application/json'; opt.body = JSON.stringify(body) }
  let r
  try { r = await fetch(engineUrl(url), opt) } catch (e) { throw new Error(`The Design Engine is not reachable${ENGINE ? ' at ' + ENGINE : ''}. Start it on the server laptop.`) }
  const j = fix(await r.json().catch(() => ({})))
  if (r.status === 401) throw new NeedKey(j.error || 'Access key needed')
  if (!r.ok) throw new Error(j.error || 'Engine error ' + r.status)
  return j
}
export const api = {
  get: (u) => call('GET', u), post: (u, b) => call('POST', u, b ?? {}), put: (u, b) => call('PUT', u, b), del: (u) => call('DELETE', u),
  upload: (u, files, urls = []) => { const f = new FormData(); [...files].forEach((x) => f.append('files', x)); urls.forEach((x) => f.append('urls', x)); return call('POST', u, f) }
}
export const roomUrl = (pid, rid, kind) => `/api/projects/${encodeURIComponent(pid)}/rooms/${encodeURIComponent(rid)}/${kind}`
