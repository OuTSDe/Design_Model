// Space vocabulary: the design brain shared by every project. One folder per style in Design_Model/Vocabulary/styles.
import React, { useEffect, useState } from 'react'
import { Page, Card, Button, Badge, Field, Textarea, useLoad, useNotify } from '../components/ui.jsx'
import { api } from '../api.js'
import ImageDrop from '../components/ImageDrop.jsx'

export default function Vocabulary() {
  const V = useLoad('/api/vocabulary'); const notify = useNotify()
  const J = useLoad('/api/jobs', 5000)
  const vjobs = (J.data || []).filter((j) => j.type === 'style-references')
  const bjobs = (J.data || []).filter((j) => j.type === 'style-brief' && ['queued', 'running'].includes(j.status))
  const busyFor = (id) => vjobs.find((j) => j.styleId === id && ['queued', 'running'].includes(j.status))
  const doneKey = (J.data || []).filter((j) => j.type.startsWith('style-') && j.status === 'done').map((j) => j.id).join()
  useEffect(() => { if (doneKey) V.reload() }, [doneKey]) // eslint-disable-line
  const find = async (body) => { try { const r = await api.post('/api/vocabulary-find', body); J.reload(); notify(`Codex is searching Pinterest for ${r.queued} style(s)`) } catch (e) { notify(e.message, 'bad') } }
  const [sel, setSel] = useState(null)
  const list = V.data || []
  const s = list.find((x) => x.id === sel) || list[0]
  const [v, setV] = useState({ brief: '', styleMd: '' })
  useEffect(() => { if (s) setV({ brief: s.brief, styleMd: s.styleMd }) }, [s?.id, s?.brief, s?.styleMd])
  const save = async () => { try { await api.put('/api/vocabulary/' + s.id, v); V.reload(); notify(s.name + ' saved') } catch (e) { notify(e.message, 'bad') } }
  const cats = [[2, 'Category 2 · shared furniture pool'], [1, 'Category 1']]
  const running = vjobs.filter((j) => ['queued', 'running'].includes(j.status)).length
  return <Page actions={<><Button disabled={bjobs.length > 0} onClick={() => find({ all: true, kind: 'brief' })}>{bjobs.length ? `Writing ${bjobs.length} brief(s)…` : 'Write every brief with Codex'}</Button><Button variant="primary" disabled={running > 0} onClick={() => find({ all: true })}>{running ? `Codex: ${running} style(s) in progress` : 'Fill every style from Pinterest'}</Button></>} title={<>Space <em>vocabulary</em></>} subtitle="What each style means to OuTSDe, the render values Codex follows (light, colour temperature, frame, focus), and the reference images for render style and mood-board layout. Shared by every project.">
    <div className="split-r split">
      <Card title="Styles">{cats.map(([c, l]) => <div key={c}><div className="label" style={{ margin: '6px 0' }}>{l}</div>
        {list.filter((x) => x.category === c).map((x) => <button key={x.id} className={'room-btn' + (x.id === s?.id ? ' on' : '')} style={x.parent ? { paddingLeft: 22 } : null} onClick={() => setSel(x.id)}>
          {x.renderRef[0] ? <img src={x.renderRef[0].url} alt="" /> : <span className="room-ph">{x.name[0]}</span>}
          <span><b>{x.name}</b><small>{busyFor(x.id) ? (busyFor(x.id).status === 'running' ? 'Codex searching Pinterest… · ' : 'queued · ') : ''}{x.renderRef.length} render refs · {x.moodboardRef.length} board refs{/placeholder/i.test(x.brief) ? ' · brief to write' : ''}</small></span></button>)}</div>)}</Card>
      {s && <div>
        <Card title={s.name} actions={<><Badge>{'Category ' + s.category}</Badge><Button size="sm" disabled={bjobs.some((j) => j.styleId === s.id)} onClick={() => find({ styleId: s.id, kind: 'brief' })}>{bjobs.some((j) => j.styleId === s.id) ? 'Writing…' : 'Write brief'}</Button><Button size="sm" disabled={!!busyFor(s.id)} onClick={() => find({ styleId: s.id })}>{busyFor(s.id) ? (busyFor(s.id).status === 'running' ? 'Codex searching…' : 'Queued') : 'Find on Pinterest'}</Button><Button variant="primary" size="sm" onClick={save}>Save</Button></>}>
          <div className="grid g2" style={{ marginBottom: 0 }}>
            <Field label="brief.md · what this style means" hint="Your words. Goes to Codex with every job in this style."><Textarea rows={16} className="input textarea mono-ta" value={v.brief} onChange={(e) => setV({ ...v, brief: e.target.value })} /></Field>
            <Field label="style.md · render values" hint="Light quality, colour temperature, mood, camera, framing, focus, what to avoid."><Textarea rows={16} className="input textarea mono-ta" value={v.styleMd} onChange={(e) => setV({ ...v, styleMd: e.target.value })} /></Field>
          </div>
        </Card>
        <div className="grid g2" style={{ marginBottom: 0 }}>
          <Card title={`Render reference · ${s.renderRef.length}`} actions={<span className="small muted">Light and frame to follow</span>}>
            <ImageDrop url={`/api/vocabulary/${s.id}/render-ref`} onDone={V.reload} hint="1 to 3 renders whose light and framing this style must follow." />
            <div className="thumbs">{s.renderRef.map((f) => <div key={f.name} className="thumb"><img src={f.url} alt="" /></div>)}</div></Card>
          <Card title={`Mood-board reference · ${s.moodboardRef.length}`} actions={<span className="small muted">How a board should look</span>}>
            <ImageDrop url={`/api/vocabulary/${s.id}/moodboard-ref`} onDone={V.reload} hint="Examples of an OuTSDe mood board for this style." />
            <div className="thumbs">{s.moodboardRef.map((f) => <div key={f.name} className="thumb"><img src={f.url} alt="" /></div>)}</div></Card>
        </div>
      </div>}
    </div>
  </Page>
}
