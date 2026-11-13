import React from 'react'
import { Page, Card } from '../components/ui.jsx'
export default function Soon({ title, phase, text }) {
  return <Page title={title} subtitle={text}><Card><div className="empty"><h3>{phase}</h3>Built after Phase 1 is approved. See DESIGN_ENGINE_SPEC.md.</div></Card></Page>
}
