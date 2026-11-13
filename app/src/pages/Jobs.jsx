import React, { useState } from 'react'
import { Page, Card, Button, Seg, useLoad, useNotify } from '../components/ui.jsx'
import { api } from '../api.js'
import { JobRow } from './Project.jsx'

const VIEWS = [['all', 'All'], ['queued', 'Waiting'], ['running', 'Running'], ['done', 'Done'], ['failed', 'Failed'], ['cancelled', 'Cancelled']]

export default function Jobs() {
  const J = useLoad('/api/jobs', 4000); const notify = useNotify(); const [view, setView] = useState('all')
  const js = J.data || []; const n = (s) => js.filter((j) => j.status === s).length
  const run = async (fn, msg) => { try { const r = await fn(); notify(msg(r)); J.reload() } catch (e) { notify(e.message, 'bad') } }
  const clearQueue = () => confirm(`Remove all ${n('queued')} waiting job(s) from the Codex queue? Running jobs carry on.`) && run(() => api.post('/api/queue/clear', {}), (r) => `${r.waiting} waiting job(s) removed`)
  const stopAll = () => confirm(`Stop everything? ${n('queued')} waiting job(s) are removed and ${n('running')} running job(s) are stopped. Files Codex already wrote are kept.`) && run(() => api.post('/api/queue/clear', { running: true }), (r) => `${r.waiting} removed · ${r.stopped} stopped`)
  const clearDone = () => confirm('Delete the records of all finished jobs (done, failed, cancelled)? The images and files they made stay in the folders.') && run(() => api.post('/api/jobs-clear', {}), (r) => `${r.removed} job record(s) deleted`)
  const shown = view === 'all' ? js : js.filter((j) => j.status === view)
  return <Page title="Codex jobs" subtitle="Every Codex CLI run: the command, the full prompt and the output. Open a job to read it; Re-run sends the same inputs again."
    actions={<>
      <Button size="sm" disabled={!n('queued')} onClick={clearQueue}>Clear queue ({n('queued')})</Button>
      <Button size="sm" variant="danger" disabled={!n('queued') && !n('running')} onClick={stopAll}>Stop all</Button>
      <Button size="sm" variant="ghost" disabled={!(n('done') + n('failed') + n('cancelled'))} onClick={clearDone}>Delete finished</Button>
    </>}>
    <div style={{ marginBottom: 12 }}><Seg value={view} onChange={setView} options={VIEWS.map(([v, l]) => ({ value: v, label: v === 'all' ? `${l} ${js.length}` : `${l} ${n(v)}` }))} /></div>
    <Card>{!shown.length ? <div className="empty">No jobs here.</div> : shown.map((j) => <JobRow key={j.id} j={j} onChange={J.reload} showWhere />)}</Card>
  </Page>
}
