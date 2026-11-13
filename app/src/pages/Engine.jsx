import React from 'react'
import { Page, Card, Button, Badge, KV, useLoad, useNotify } from '../components/ui.jsx'
import { api } from '../api.js'
export default function Engine() {
  const H = useLoad('/api/health'); const notify = useNotify(); const h = H.data
  const test = async () => { try { await api.post('/api/jobs', { type: 'ping' }); notify('Test sent. Open Codex jobs to see the answer.') } catch (e) { notify(e.message, 'bad') } }
  const restart = async () => { try { await api.post('/api/restart'); notify('Restarting with the latest code…'); setTimeout(() => location.reload(), 6000) } catch (e) { notify(e.message, 'bad') } }
  return <Page title="Engine and Codex" subtitle="The local engine server on this PC: where it keeps files, where it reads Accord from, and whether Codex CLI answers.">
    <Card title="Status" actions={<><Button size="sm" onClick={H.reload}>Check again</Button><Button size="sm" onClick={restart}>Update and restart</Button><Button size="sm" variant="primary" onClick={test}>Test Codex</Button></>}>
      {H.error ? <div className="note">{H.error}</div> : h && <KV rows={[['Engine', h.engine], ['Design_Model folder', h.root], ['Accord export', h.export || 'Not found: set accordExport in engine/config.json'],
        ['Codex CLI', <span key="c"><Badge tone={h.codex.ok ? 'good' : 'bad'}>{h.codex.ok ? 'Found' : 'Not found'}</Badge> <span className="small muted">{h.codex.detail}</span></span>], ['Codex command', <span key="cc" className="mono small">{h.codexCommand}</span>], ['Jobs', `${h.jobs.running} running · ${h.jobs.queued} queued`]]} />}
    </Card>
    <Card title="Settings (engine/config.json)"><ul className="small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
      <li><span className="mono">codex.args</span>: the flags for <span className="mono">codex exec</span>. Default: <span className="mono">exec --skip-git-repo-check --sandbox workspace-write</span>.</li>
      <li><span className="mono">codex.imageFlag</span>: how images are attached (<span className="mono">-i</span>).</li>
      <li><span className="mono">accordExport</span>: the nightly Accord Excel export, read only.</li>
      <li>Prompts for each job are in <span className="mono">engine/prompts/</span>. Edit them to change how Codex is asked.</li></ul></Card>
  </Page>
}
