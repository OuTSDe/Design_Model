// Overview: who is ready for design (from the Accord experience), and Start project.
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page, Card, Button, Badge, Stat, Modal, Select, Field, useLoad, useNotify, d } from '../components/ui.jsx'
import { api } from '../api.js'

export const sessionLine = (s) => s ? ([s.persona, s.palette, s.register].filter(Boolean).join(' · ') || `Stopped at ${s.screen || 'the start'}`) : 'No experience session'
export function useStart() {
  const nav = useNavigate(); const notify = useNotify(); const [busy, setBusy] = useState(false)
  const start = async (bookingId) => { setBusy(true); try { const p = await api.post('/api/projects', { bookingId }); nav('/projects/' + encodeURIComponent(p.id)) } catch (e) { notify(e.message, 'bad') } setBusy(false) }
  return [start, busy]
}

export default function Overview() {
  const acc = useLoad('/api/accord'), projects = useLoad('/api/projects'), jobs = useLoad('/api/jobs', 8000), sum = useLoad('/api/summary', 8000)
  const [start, busy] = useStart()
  const [pick, setPick] = useState(null)
  const nav = useNavigate()
  const clients = acc.data?.clients || []
  const ready = clients.filter((c) => c.sessions.length && !c.projectId && !['Cancelled', 'Transferred'].includes(c.status))
  const ps = projects.data || [], js = jobs.data || []
  return <Page title={<>Design <em>engine</em></>} subtitle="From the client's design brief to a render of every room: principal references, expanded references, the asset library, mood boards, the blank view and Codex. A separate build; it joins Accord Design after approval.">
    <div className="stats g4" style={{ display: 'grid' }}>
      <Stat label="Ready for design" value={ready.length} sub="Experience done, no project yet" tone="accent" />
      <Stat label="Projects" value={ps.length} sub={`${ps.reduce((s, p) => s + p.roomCount, 0)} rooms`} tone="good" onClick={() => nav('/projects')} />
      <Stat label="Renders" value={ps.reduce((s, p) => s + p.renderCount, 0)} sub={`${ps.reduce((s, p) => s + p.refCount, 0)} principal references`} tone="info" />
      <Stat label="Codex jobs" value={js.filter((j) => j.status === 'running' || j.status === 'queued').length} sub={`${js.filter((j) => j.status === 'failed').length} failed · ${js.length} in all`} tone="warn" onClick={() => nav('/jobs')} />
    </div>
    {acc.data && !acc.data.ok && <div className="note">{acc.data.error}</div>}
    {sum.data?.pausedUntil && <div className="note"><b>Codex is paused until {new Date(sum.data.pausedUntil).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</b> ({sum.data.pauseReason}). The waiting jobs start again by themselves then. <a style={{ cursor: 'pointer' }} onClick={() => api.post('/api/queue/resume').then(sum.reload)}>Resume now</a></div>}
    {sum.data && (sum.data.counts.running || sum.data.counts.queued) ? <Card title="Codex queue" actions={<><span className="small muted">{sum.data.counts.running || 0} running · {sum.data.counts.queued || 0} waiting · {sum.data.counts.done || 0} done · {sum.data.counts.failed || 0} failed</span>{sum.data.counts.queued ? <Button size="sm" variant="ghost" onClick={() => confirm(`Remove all ${sum.data.counts.queued} waiting job(s) from the Codex queue?`) && api.post('/api/queue/clear', {}).then(sum.reload)}>Clear queue</Button> : null}<Button size="sm" variant="ghost" onClick={() => nav('/jobs')}>Manage</Button></>}>
      {sum.data.active.map((a) => <div key={a.id} className="check-row"><span><Badge tone="warn">running</Badge> <b>{a.label}</b> <span className="small muted">{a.project ? `${a.project} · ${a.room}` : ''}</span></span><span className="small muted">since {new Date(a.startedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span></div>)}
      <div className="hint" style={{ marginTop: 8 }}>Keep the Design Engine window open while Codex works. If it is closed, the interrupted jobs start again on the next launch.</div></Card> : null}
    <Card title={`Ready for design · ${ready.length}`} actions={<><span className="small muted">From the Accord export of {d(acc.data?.exportedAt)}</span><Button size="sm" onClick={() => setPick('')}>Start for another booking</Button></>}>
      {!ready.length && <div className="empty">{acc.loading ? 'Reading the Accord export…' : 'No buyer is waiting. Everyone who has done the Accord experience already has a project.'}</div>}
      {ready.map((c) => { const s = c.sessions[0]
        return <div key={c.bookingId} className="check-row"><span><b>{c.unit}</b> · {c.title} {c.name} <span className="small muted">· {c.type} · {sessionLine(s)}</span></span>
          <span className="row gap-s">{!s.persona && <Badge tone="warn">Brief incomplete</Badge>}<Button size="sm" variant="primary" disabled={busy} onClick={() => start(c.bookingId)}>Start project</Button></span></div> })}
    </Card>
    <Card title="Recent projects">{!ps.length ? <div className="empty">No projects yet.</div> : ps.slice(0, 6).map((p) =>
      <div key={p.id} className="check-row click" style={{ cursor: 'pointer' }} onClick={() => nav('/projects/' + encodeURIComponent(p.id))}><span><b>{p.name}</b> <span className="small muted">· {p.type} · {p.roomCount} rooms · {p.refCount} references · {p.renderCount} renders</span></span><Badge>{p.status}</Badge></div>)}</Card>
    <Modal open={pick !== null} onClose={() => setPick(null)} title="Start a project" footer={<><Button onClick={() => setPick(null)}>Cancel</Button><Button variant="primary" disabled={!pick || busy} onClick={() => start(pick)}>Start project</Button></>}>
      <Field label="Booking (from Accord Sales)" hint="Any live booking, with or without an experience session."><Select value={pick || ''} onChange={(e) => setPick(e.target.value)} placeholder="Choose a booking"
        options={clients.filter((c) => !c.projectId && c.status !== 'Cancelled').map((c) => ({ value: c.bookingId, label: `${c.unit} · ${c.name} · ${c.type}${c.sessions.length ? ' · experience' : ''}` }))} /></Field>
    </Modal>
  </Page>
}
