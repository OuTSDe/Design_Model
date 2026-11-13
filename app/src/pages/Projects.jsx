import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Page, Badge, useLoad } from '../components/ui.jsx'

export default function Projects() {
  const { data, loading } = useLoad('/api/projects'); const nav = useNavigate()
  return <Page title="Projects" subtitle="One folder per residence in Design_Model/Projects. Start a project from the Overview.">
    {!loading && !data?.length && <div className="empty"><h3>No projects yet</h3>Start one from the Overview: Ready for design.</div>}
    <div className="mod-cards">{(data || []).map((p) => <a key={p.id} className="mod-card" style={{ '--c': 'var(--m-accord)', cursor: 'pointer' }} onClick={() => nav('/projects/' + encodeURIComponent(p.id))}>
      {p.cover && <img src={p.cover} alt="" className="proj-cover" />}
      <div className="row between"><h3>{p.name}</h3><Badge>{p.status}</Badge></div>
      <p className="small muted">{p.type} · floor {p.floor} · {[p.persona, p.palette].filter(Boolean).join(' · ') || 'no persona yet'}</p>
      <p className="small">{p.roomCount} rooms · {p.refCount} references · {p.renderCount} renders</p></a>)}</div>
  </Page>
}
