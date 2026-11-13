// Talks to the local engine server (engine/server.mjs). In development Vite proxies /api and /files to it.
// The GitHub Pages build sets VITE_ENGINE_URL=http://localhost:4317, so the hosted page talks to the engine on this PC.
export const ENGINE = (import.meta.env.VITE_ENGINE_URL || '').replace(/\/$/, '')
// engine answers contain '/files/…' links; make them point at the engine too
export const fix = (v) => !ENGINE ? v : typeof v === 'string' ? (v.startsWith('/files/') ? ENGINE + v : v) : Array.isArray(v) ? v.map(fix) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fix(x)])) : v
export const engineUrl = (u) => (u.startsWith('/') ? ENGINE + u : u)
async function call(method, url, body) {
  const opt = { method, headers: {} }
  if (body instanceof FormData) opt.body = body
  else if (body !== undefined) { opt.headers['content-type'] = 'application/json'; opt.body = JSON.stringify(body) }
  let r
  try { r = await fetch(engineUrl(url), opt) } catch (e) { throw new Error('The engine is not running on this PC. Start it with Start Design Engine.cmd') }
  const j = fix(await r.json().catch(() => ({})))
  if (!r.ok) throw new Error(j.error || 'Engine error ' + r.status)
  return j
}
export const api = {
  get: (u) => call('GET', u), post: (u, b) => call('POST', u, b ?? {}), put: (u, b) => call('PUT', u, b), del: (u) => call('DELETE', u),
  upload: (u, files, urls = []) => { const f = new FormData(); [...files].forEach((x) => f.append('files', x)); urls.forEach((x) => f.append('urls', x)); return call('POST', u, f) }
}
export const roomUrl = (pid, rid, kind) => `/api/projects/${encodeURIComponent(pid)}/rooms/${encodeURIComponent(rid)}/${kind}`
