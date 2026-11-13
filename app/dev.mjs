// npm run dev: installs packages if they are missing, then starts the engine (:4317) and the UI (:5174) together.
// No extra tools needed; Ctrl+C stops both.
import { spawn, spawnSync, execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const win = process.platform === 'win32'
if (/my drive|google drive/i.test(here) || /^[a-z]:\\?$/i.test(path.parse(here).root) && /\\My Drive\\/i.test(here)) {
  console.error('This copy is inside Google Drive, where npm cannot install packages.\nClose this window and double-click "Start Design Engine.cmd" in the Design_Model folder instead.\nIt runs the app from this PC and keeps every project in Drive.')
  process.exit(1)
}
// An engine left running from an earlier start (closing the window does not always stop it) holds ports 4317 and 5174. Stop it first.
function freePorts(ports) {
  try {
    if (win) {
      const out = execSync('netstat -ano -p tcp', { encoding: 'utf8' })
      const pids = new Set(out.split(/\r?\n/).filter((l) => /LISTENING/i.test(l) && ports.some((p) => new RegExp(`:${p}\\s`).test(l))).map((l) => l.trim().split(/\s+/).pop()).filter((p) => p && p !== '0' && p !== String(process.pid)))
      pids.forEach((pid) => { try { execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' }); console.log(`Stopped an earlier engine (process ${pid}).`) } catch { /* already gone */ } })
    } else {
      ports.forEach((p) => { try { execSync(`fuser -k ${p}/tcp`, { stdio: 'ignore' }) } catch { /* nothing listening */ } })
    }
  } catch { /* netstat missing: carry on */ }
}
freePorts([4317, 5174])
const need = ['express', 'multer', 'xlsx', 'react', 'vite', '@vitejs/plugin-react'].filter((m) => !fs.existsSync(path.join(here, 'node_modules', m, 'package.json')))
if (need.length) {
  console.log(`Installing packages (missing: ${need.join(', ')}). This takes a minute the first time…`)
  const r = spawnSync(win ? 'npm.cmd' : 'npm', ['install', '--no-audit', '--no-fund', '--include=dev'], { cwd: here, stdio: 'inherit', shell: win })
  if (r.status !== 0) {
    console.error('\nnpm install failed. See the messages above (network, or a folder npm cannot write to).')
    process.exit(1)
  }
}
// "Update and restart" in the app: the engine exits with code 75; we copy the latest app code from Design_Model\app
// (when running from the local copy the launcher made) and start the engine again. The UI reloads by itself.
function syncFromDrive() {
  const src = process.env.DESIGN_MODEL && path.join(process.env.DESIGN_MODEL, 'app')
  if (!src || path.resolve(src) === path.resolve(here) || !fs.existsSync(src)) return
  fs.cpSync(src, here, { recursive: true, force: true, filter: (f) => !/[\\/](node_modules|dist)([\\/]|$)/.test(f.slice(src.length)) })
}
// Everything the window shows is also written to Design_Model\.engine\console.log, so problems can be read without the screen.
const LOG = process.env.DESIGN_MODEL ? path.join(process.env.DESIGN_MODEL, '.engine', 'console.log') : path.join(here, 'console.log')
try { fs.mkdirSync(path.dirname(LOG), { recursive: true }); if (fs.existsSync(LOG) && fs.statSync(LOG).size > 2e6) fs.renameSync(LOG, LOG + '.old') } catch { /* */ }
const log = (l) => { console.log(l); try { fs.appendFileSync(LOG, `${new Date().toISOString()} ${l}\n`) } catch { /* */ } }
log('--- start ' + process.version + ' in ' + here)
const kids = new Map()
let crashes = 0
const run = (name, args) => {
  const p = spawn(process.execPath, args, { cwd: here, stdio: ['inherit', 'pipe', 'pipe'], env: process.env })
  const tag = (d) => d.toString().split(/\r?\n/).filter(Boolean).forEach((l) => log(`[${name}] ${l}`))
  p.stdout.on('data', tag); p.stderr.on('data', tag)
  p.on('exit', (c) => {
    if (name === 'engine' && c === 75) { try { syncFromDrive(); log('Updated from Design_Model\\app.'); if (process.argv.includes('--server')) buildUI() } catch (e) { log('Update failed: ' + e.stack) } return run('engine', args) }
    log(`[${name}] stopped (${c})`)
    // the engine crashed: keep the UI up and try again a few times (a fix in Drive is picked up on each try)
    if (name === 'engine' && crashes++ < 5) { setTimeout(() => { try { syncFromDrive() } catch { /* */ } run('engine', args) }, 5000); return }
    kids.forEach((k) => k.kill()); process.exit(c || 0)
  })
  kids.set(name, p)
}
// --server (Start Design Server.cmd): this laptop serves the team. The UI is built once and served by the engine itself
// on port 4317 to the whole network (DESIGN_HOST=0.0.0.0); after "Update and restart" the UI is rebuilt too.
const SERVER = process.argv.includes('--server')
const buildUI = () => { const r = spawnSync(process.execPath, [path.join('node_modules', 'vite', 'bin', 'vite.js'), 'build'], { cwd: here, stdio: 'inherit' }); if (r.status !== 0) log('UI build failed') }
if (SERVER) {
  process.env.DESIGN_HOST = process.env.DESIGN_HOST || '0.0.0.0'
  log('Server mode: building the UI…'); buildUI()
  run('engine', ['engine/server.mjs', '--serve'])
} else {
  run('engine', ['engine/server.mjs'])
  run('ui', [path.join('node_modules', 'vite', 'bin', 'vite.js')])
}
process.on('SIGINT', () => { kids.forEach((k) => k.kill()); process.exit(0) })
