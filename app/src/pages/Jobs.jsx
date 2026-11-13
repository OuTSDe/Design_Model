import React from 'react'
import { Page, Card, useLoad } from '../components/ui.jsx'
import { JobRow } from './Project.jsx'
export default function Jobs() {
  const J = useLoad('/api/jobs', 4000)
  return <Page title="Codex jobs" subtitle="Every Codex CLI run: the command, the full prompt and the output. Jobs run one at a time on this PC. Open a job to read it; Re-run sends the same inputs again.">
    <Card>{!(J.data || []).length ? <div className="empty">No jobs yet.</div> : J.data.map((j) => <JobRow key={j.id} j={j} onChange={J.reload} showWhere />)}</Card>
  </Page>
}
