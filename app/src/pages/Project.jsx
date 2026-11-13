// A project after Start project: the brief, then room by room — principal references, what the room still needs,
// the blank view, the mood board and the Codex render. Every file lives in Design_Model/Projects/<flat> <client>/rooms/<room>/.
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Page, Card, Button, Badge, Seg, Field, Input, Textarea, Select, KV, Stat, useLoad, useNotify, dt } from '../components/ui.jsx'
import { api, roomUrl } from '../api.js'
import ImageDrop from '../components/ImageDrop.jsx'
import { EMBED, toCrm } from '../embed.js'

const STATUS = ['Brief', 'References', 'Mood boards', 'Rendering', 'Review', 'Approved', 'On hold']
const styleOptions = (vocab) => (vocab || []).map((s) => ({ value: s.id, label: `${s.parent ? '— ' : ''}${s.name} · Cat ${s.category}` }))

export default function Project() {
  const { id } = useParams()
  const pid = decodeURIComponent(id)
  const P = useLoad('/api/projects/' + encodeURIComponent(pid))
  const vocab = useLoad('/api/vocabulary')
  const jobs = useLoad('/api/jobs?projectId=' + encodeURIComponent(pid), 4000)
  const [tab, setTab] = useState('rooms')
  const notify = useNotify()
  const p = P.data
  // refresh files when a job finishes
  const doneKey = (jobs.data || []).filter((j) => j.status === 'done').map((j) => j.id).join()
  useEffect(() => { if (doneKey) P.reload() }, [doneKey]) // eslint-disable-line
  if (P.error) return <Page back="/projects" title="Project"><div className="note">{P.error}</div></Page>
  if (!p) return <Page title="Loading…" />
  const save = async (patch, msg) => { try { await api.put('/api/projects/' + encodeURIComponent(pid), { ...p, ...patch }); P.reload(); msg && notify(msg) } catch (e) { notify(e.message, 'bad') } }
  const styleName = (sid) => vocab.data?.find((s) => s.id === sid)?.name
  const js = jobs.data || []
  return <Page back="/projects" title={p.name}
    subtitle={`${p.client} · ${p.type} · ${p.area ? p.area + ' sft · ' : ''}floor ${p.floor}${p.band ? ' · ' + p.band : ''}`}
    actions={<>{p.crmId && <Button size="sm" onClick={() => (EMBED ? toCrm('/accord/' + p.crmId) : window.open('/crm/#/accord/' + p.crmId, '_blank'))}>Open in Accord · BOQ</Button>}<Seg options={[{ value: 'rooms', label: 'Rooms' }, { value: 'brief', label: 'Brief' }, { value: 'client', label: 'Client and residence' }]} value={tab} onChange={setTab} /></>}>
    <div className="stats g5" style={{ display: 'grid' }}>
      <Stat long label="Persona" value={p.persona || '–'} sub={p.palette || (p.sessionScreen ? 'Experience stopped at ' + p.sessionScreen : 'No experience session')} tone={p.persona ? 'good' : 'warn'} />
      <Stat long label="Residence style" value={styleName(p.style) || "–"} sub="Rooms can override it" tone="accent" />
      <Stat label="References" value={p.rooms.reduce((s, r) => s + r.principal.length, 0)} sub={`${p.rooms.filter((r) => r.principal.length).length} of ${p.rooms.length} rooms`} tone="info" />
      <Stat label="Renders" value={p.rooms.reduce((s, r) => s + r.renders.length, 0)} sub={`${p.rooms.filter((r) => r.renders.length).length} rooms rendered`} tone="good" />
      <Stat label="Codex" value={js.filter((j) => ['running', 'queued'].includes(j.status)).length} sub="jobs running or queued" tone="warn" />
    </div>
    {!p.persona && <div className="note">The Accord experience for this buyer is incomplete{p.sessionScreen ? ` (stopped at "${p.sessionScreen}")` : ''}, so there is no persona or palette yet. Choose the styles in the Brief, or finish the experience with the buyer and start again.</div>}
    {tab === 'rooms' && <Rooms p={p} vocab={vocab.data} jobs={js} reload={P.reload} reloadJobs={jobs.reload} save={save} />}
    {tab === 'brief' && <Brief p={p} vocab={vocab.data} save={save} />}
    {tab === 'client' && <Card title="Client and residence (from Accord, no money)"><KV rows={[['Client', p.client], ['Booking', p.bookingId], ['Client ID', p.clientId], ['Residence', p.unit], ['Type', p.type], ['Area', p.area && p.area + ' sft'], ['Floor', p.floor], ['Band', p.band],
      ['Experience session', p.session], ['Persona', p.persona], ['Palette', p.palette], ['Register', p.register], ['Project folder', 'Design_Model/Projects/' + p.id], ['Started', dt(p.createdAt)]]} /></Card>}
  </Page>
}

function Brief({ p, vocab, save }) {
  const [v, setV] = useState({ style: p.style, status: p.status, designer: p.designer, brief: p.brief })
  return <Card title="Project brief" actions={<Button variant="primary" onClick={() => save(v, 'Brief saved')}>Save</Button>}>
    <div className="grid g3">
      <Field label="Residence style" hint="The overall theme. Each room can take its own."><Select options={styleOptions(vocab)} value={v.style} onChange={(e) => setV({ ...v, style: e.target.value })} placeholder="Choose a style" /></Field>
      <Field label="Status"><Select options={STATUS} value={v.status} onChange={(e) => setV({ ...v, status: e.target.value })} /></Field>
      <Field label="Lead designer"><Input value={v.designer} onChange={(e) => setV({ ...v, designer: e.target.value })} /></Field>
    </div>
    <Field label="Brief" hint="Goes to Codex with every job: the client's wishes, what to keep, what to avoid, the overall mood board in words."><Textarea rows={9} value={v.brief} onChange={(e) => setV({ ...v, brief: e.target.value })} /></Field>
  </Card>
}

function Rooms({ p, vocab, jobs, reload, reloadJobs, save }) {
  const [sel, setSel] = useState(p.rooms[0]?.id)
  const r = p.rooms.find((x) => x.id === sel) || p.rooms[0]
  const addRoom = () => { const name = prompt('Room name (for example Study, Pooja room, Utility)'); if (name) save({ rooms: [...p.rooms, { id: name, name, group: 'Added', style: '', notes: '' }] }, name + ' added') }
  const groups = [...new Set(p.rooms.map((x) => x.group || 'Rooms'))]
  return <div className="split-r split">
    <Card title="Rooms" actions={<Button size="sm" onClick={addRoom}>+ Room</Button>}>
      {groups.map((g) => <div key={g}><div className="label" style={{ margin: '6px 0' }}>{g}</div>
        {p.rooms.filter((x) => (x.group || 'Rooms') === g).map((x) => { const thumb = x.renders.at(-1) || x.principal[0]
          return <button key={x.id} className={'room-btn' + (x.id === r?.id ? ' on' : '')} onClick={() => setSel(x.id)}>
            {thumb ? <img src={thumb.url} alt="" /> : <span className="room-ph">{x.name[0]}</span>}
            <span><b>{x.name}</b><small>{x.principal.length} refs · {x.blank.length ? 'blank ✓' : 'no blank'} · {x.renders.length} renders</small></span></button> })}</div>)}
    </Card>
    {r && <RoomPanel key={r.id} p={p} r={r} vocab={vocab} jobs={jobs.filter((j) => j.roomId === r.id)} reload={reload} reloadJobs={reloadJobs} save={save} />}
  </div>
}

const STEPS = [['research-room', 'Research the room', 'Codex studies the style and the references and lists every element the room needs.'],
  ['find-references', 'Find references', 'Searches the web for 2–4 images per element, downloads them and scores each for every style.'],
  ['compose-moodboard', 'Make the mood board', 'Cuts the pieces out and composes a collage of the real assets.'],
  ['vendor-research', 'Find vendor products', 'Finds buyable products in India with price, size, material and the standard image set.'],
  ['render-room', 'Render', 'Furnishes the blank view with the mood board, in the style\'s light and frame.']]

function RoomPanel({ p, r, vocab, jobs, reload, reloadJobs, save }) {
  const notify = useNotify()
  const [notes, setNotes] = useState(r.notes)
  const [full, setFull] = useState(null)
  const setRoom = (patch, msg) => save({ rooms: p.rooms.map((x) => (x.id === r.id ? { ...x, ...patch } : x)) }, msg)
  const effStyle = r.style || p.style
  const st = vocab?.find((s) => s.id === effStyle)
  const active = jobs.find((j) => ['queued', 'running'].includes(j.status))
  const run = async (type) => { try { await api.post('/api/jobs', { type, projectId: p.id, roomId: r.id }); reloadJobs(); notify('Sent to Codex') } catch (e) { notify(e.message, 'bad') } }
  const runAll = async (from) => { try { const j = await api.post('/api/pipeline', { projectId: p.id, roomId: r.id, from }); reloadJobs(); notify(`Codex will run: ${j.steps.length} steps`) } catch (e) { notify(e.message, 'bad') } }
  const remove = async (kind, f) => { if (!confirm('Remove this image? It moves to the room\'s _removed folder.')) return; try { await api.del(`${roomUrl(p.id, r.id, kind)}/${encodeURIComponent(f.name)}`); reload() } catch (e) { notify(e.message, 'bad') } }
  const done = { 'research-room': r.needs?.needs?.length || 0, 'find-references': r.references.length, 'compose-moodboard': r.moodboard.length, 'vendor-research': r.products.length, 'render-room': r.renders.length }
  const groups = [...new Set(r.references.map((x) => x.element))]
  return <div>
    <Card title={r.name} actions={<>{r.group === 'Added' && <Button size="sm" variant="ghost" onClick={() => confirm('Remove ' + r.name + ' from the project? Its files stay in the folder.') && save({ rooms: p.rooms.filter((x) => x.id !== r.id) }, r.name + ' removed')}>Remove room</Button>}
      <Button size="sm" variant="primary" disabled={!st || !!active} onClick={() => runAll('research-room')}>{active ? 'Codex is working…' : 'Run the whole room with Codex'}</Button></>}>
      <div className="grid g2" style={{ marginBottom: 14 }}>
        <Field label="Room style" hint={st ? (r.style ? 'Own style for this room' : 'Same as the residence') : 'Choose a style first: every Codex step works from it'}>
          <Select options={styleOptions(vocab)} value={r.style} onChange={(e) => setRoom({ style: e.target.value }, 'Style saved')} placeholder={p.style ? `Same as residence (${vocab?.find((s) => s.id === p.style)?.name || p.style})` : 'Choose a style'} /></Field>
        <Field label="Room notes" hint="Saved when you leave the box. Codex reads these in every step."><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== r.notes && setRoom({ notes }, 'Notes saved')} placeholder="Corner details, storage count, marble colour, what to keep from the references…" /></Field>
      </div>
      <div className="steps">{STEPS.map(([type, label, help], i) => { const j = jobs.find((x) => x.type === type); const busy = j && ['queued', 'running'].includes(j.status)
        return <div key={type} className={'step' + (done[type] ? ' ok' : '') + (busy ? ' busy' : '')}>
          <div className="step-n">{String(i + 1).padStart(2, '0')}</div>
          <div className="step-t"><b>{label}</b><small>{busy ? (j.status === 'running' ? 'Codex is working…' : 'Waiting in the queue') : done[type] ? `${done[type]} ${['needs', 'images', 'boards', 'products', 'renders'][i]}` : help}</small></div>
          <div className="row gap-s"><Button size="sm" disabled={!st || !!active} onClick={() => run(type)}>{done[type] ? 'Again' : 'Run'}</Button>
            {i < 4 && <Button size="sm" variant="ghost" disabled={!st || !!active} title="Run this step and every step after it" onClick={() => runAll(type)}>→ all</Button>}</div></div> })}</div>
      {!r.blank.length && <p className="small muted" style={{ margin: '10px 0 0' }}>Without a blank view, "Run the whole room" stops after the vendor products. Add the blank view below to render.</p>}
    </Card>

    {jobs.length > 0 && <Card title="Codex for this room">{jobs.slice(0, 6).map((j) => <JobRow key={j.id} j={j} onChange={reloadJobs} />)}</Card>}

    <Card title={`Principal references · ${r.principal.length}`} actions={<span className="small muted">Optional: your wide shots. Codex matches them.</span>}>
      <ImageDrop url={roomUrl(p.id, r.id, 'principal')} onDone={reload} hint="Two wide shots of the room. Drop files, or paste an image, Pinterest pin or page link." />
      <Thumbs list={r.principal} onOpen={setFull} onRemove={(f) => remove('principal', f)} />
    </Card>

    {r.needs && <Card title={`What the room needs · ${r.needs.needs?.length || 0}`}><Needs n={r.needs} /></Card>}

    {r.references.length > 0 && <Card title={`References found · ${r.references.length}`} actions={<span className="small muted">Saved in expanded/ and in the Asset library</span>}>
      {groups.map((g) => <div key={g} style={{ marginBottom: 14 }}><div className="label">{g}</div>
        <div className="thumbs">{r.references.filter((x) => x.element === g).map((x) => <div key={x.file} className="thumb" title={x.title}>
          <img src={x.url} alt="" onClick={() => setFull(x.url)} /><div className="thumb-cap">{topStyles(x.styles)}</div></div>)}</div></div>)}
    </Card>}

    {r.products.length > 0 && <Card title={`Vendor products · ${r.products.length}`} pad={false}><Products list={r.products} onOpen={setFull} /></Card>}

    <div className="grid g2" style={{ marginBottom: 0 }}>
      <Card title={`Mood board · ${r.moodboard.length}`} actions={<span className="small muted">Codex collage, or drop your own</span>}>
        <Thumbs list={[...r.moodboard].reverse()} big onOpen={setFull} onRemove={(f) => remove('moodboard', f)} />
        <div style={{ marginTop: 10 }}><ImageDrop url={roomUrl(p.id, r.id, 'moodboard')} onDone={reload} hint="Your own board, if you have one." /></div>
      </Card>
      <Card title="Blank view" actions={<span className="small muted">White volume, no furniture</span>}>
        <ImageDrop url={roomUrl(p.id, r.id, 'blank')} onDone={reload} hint="Plain white view of the room from the render camera (Rhino, SketchUp or a site photo)." />
        <Thumbs list={r.blank} onOpen={setFull} onRemove={(f) => remove('blank', f)} />
      </Card>
    </div>

    <Card title={`Renders · ${r.renders.length}`}>
      {!r.renders.length ? <p className="small muted" style={{ margin: 0 }}>Step 5 renders here: the blank view, furnished from the mood board in the style's light.</p> : <Thumbs list={[...r.renders].reverse()} big onOpen={setFull} onRemove={(f) => remove('renders', f)} />}
    </Card>
    {full && <div className="modal-bg" onClick={() => setFull(null)}><img src={full} alt="" style={{ maxWidth: '94vw', maxHeight: '90vh' }} /></div>}
  </div>
}

export const topStyles = (sc) => Object.entries(sc || {}).sort((a, b) => b[1] - a[1]).slice(0, 2).filter((x) => x[1] > 0.3).map(([k, v]) => `${k.replace(/-/g, ' ')} ${Math.round(v * 100)}`).join(' · ')
export const inr = (n) => (n ? '₹' + Number(n).toLocaleString('en-IN') : 'On request')
export function Products({ list, onOpen, showRoom }) {
  return <div style={{ overflowX: "auto" }}><table className="table dense"><thead><tr><th></th><th>Product</th><th>Element</th><th>Vendor</th><th>Price</th><th>Size (mm)</th><th>Material · finish</th><th>Lead time</th><th>Images</th></tr></thead>
    <tbody>{list.map((x) => <tr key={(x.dir || '') + x.id}>
      <td style={{ width: 64 }}>{x.imageUrls?.[0] ? <img src={x.imageUrls[0].url} alt="" className="prod-img" onClick={() => onOpen?.(x.imageUrls[0].url)} /> : null}</td>
      <td><b>{x.url ? <a href={x.url} target="_blank" rel="noreferrer">{x.name}</a> : x.name}</b><div className="small muted">{topStyles(x.styles)}</div></td>
      <td className="small">{x.element}{showRoom && x.room ? <div className="muted">{x.room}</div> : null}</td><td className="small">{x.vendor}</td>
      <td className="small"><b>{inr(x.price_inr)}</b><div className="muted">{x.price_note}</div></td><td className="small">{x.dimensions_mm}</td>
      <td className="small">{[x.material, x.finish].filter(Boolean).join(' · ')}</td><td className="small">{x.lead_time}</td>
      <td className="small">{(x.imageUrls || []).map((i) => <a key={i.name} className="img-tag" onClick={() => onOpen?.(i.url)}>{i.name.replace(/\.\w+$/, '')}</a>)}</td></tr>)}</tbody></table></div>
}

const Thumbs = ({ list, onOpen, onRemove, big }) => list.length ? <div className={'thumbs' + (big ? ' big' : '')}>{list.map((f) => <div key={f.name} className="thumb">
  <img src={f.url} alt="" onClick={() => onOpen(f.url)} /><button className="thumb-x" title="Remove" onClick={() => onRemove(f)}>×</button></div>)}</div> : null

function Needs({ n }) {
  return <div><div className="row between"><div className="label">{n.style ? 'Palette' : ''}</div>
    <div className="row gap-s">{(n.palette || []).map((c) => { const hex = c.hex || c; return <span key={hex} className="swatch" title={`${hex} ${c.name || ''} ${c.use || ''}`} style={{ background: hex }} /> })}</div></div>
    {n.summary && <p style={{ margin: '6px 0' }}>{n.summary}</p>}{n.lighting && <p className="small muted" style={{ margin: '0 0 6px' }}>Light: {n.lighting}</p>}
    {(n.materials || []).length > 0 && <p className="small muted" style={{ margin: '4px 0 8px' }}>{n.materials.join(' · ')}</p>}
    <table className="table dense"><thead><tr><th>P</th><th>Element</th><th>Type</th><th>Spec</th><th>Search terms</th></tr></thead>
      <tbody>{(n.needs || []).map((x, i) => <tr key={i}><td>{x.priority || ''}</td><td><b>{x.element}</b><div className="small muted">{x.why}</div></td><td><Badge>{x.type}</Badge></td><td className="small">{x.spec || x.from_reference}</td><td className="small">{(x.search_terms || []).join(' · ')}</td></tr>)}</tbody></table></div>
}

export function JobRow({ j, onChange, showWhere }) {
  const notify = useNotify(); const [open, setOpen] = useState(false); const [full, setFull] = useState(null)
  const tone = { done: 'good', failed: 'bad', running: 'warn', queued: 'info', cancelled: '' }[j.status]
  const toggle = async () => { if (!open) { try { setFull(await api.get('/api/jobs/' + j.id)) } catch (e) { notify(e.message, 'bad') } } setOpen(!open) }
  const act = async (a) => { try { if (a === 'delete') await api.del('/api/jobs/' + j.id); else await api.post(`/api/jobs/${j.id}/${a}`); onChange?.(); notify({ rerun: 'Sent to Codex again', cancel: 'Cancelled', delete: 'Job deleted' }[a]) } catch (e) { notify(e.message, 'bad') } }
  return <div className="job"><div className="check-row" style={{ cursor: 'pointer' }} onClick={toggle}>
    <span><Badge tone={tone}>{j.status}</Badge> <b>{j.label || j.type}</b> <span className="small muted">{showWhere && j.cwd + ' · '}{dt(j.createdAt)}{j.output ? ' → ' + j.output : ''}</span></span>
    <span className="row gap-s" onClick={(e) => e.stopPropagation()}>{['queued', 'running'].includes(j.status) ? <Button size="sm" variant="ghost" onClick={() => act('cancel')}>Cancel</Button> : <><Button size="sm" variant="ghost" onClick={() => act('rerun')}>Re-run</Button><Button size="sm" variant="ghost" onClick={() => act('delete')}>Delete</Button></>}</span></div>
    {open && full && <div className="job-detail">{j.status === 'failed' && <p className="small muted" style={{ marginTop: 0 }}>This record keeps the command it ran with. Re-run makes a new job with the engine's current settings.</p>}<div className="label">Command</div><pre>{full.command || '(not started)'}</pre><div className="label">Prompt</div><pre>{full.prompt}</pre><div className="label">Codex output</div><pre>{full.log || '(nothing yet)'}</pre></div>}
  </div>
}
