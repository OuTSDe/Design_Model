// One asset: the fixed image slots of its kind (front, side, axo … / face, seamless, reflection …), the original and
// the Codex-standardised image side by side, all the data fields of its kind, price, vendor, and the theme tags.
// /library/new?cat=furniture/seating/chair&vendor=x creates one with the same form.
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Page, Card, Button, Badge, Field, Input, Textarea, Select, useLoad, useNotify, dt } from '../components/ui.jsx'
import { api } from '../api.js'
import { JobRow, inr } from './Project.jsx'

export function FieldInput({ f, value, onChange }) {
  if (f.type === 'select') return <Select value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="—" options={f.options || []} />
  if (f.type === 'bool') return <Select value={value === true ? 'yes' : value === false ? 'no' : ''} onChange={(e) => onChange(e.target.value === '' ? '' : e.target.value === 'yes')} placeholder="—" options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} />
  if (f.type === 'textarea') return <Textarea rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
  if (f.type === 'list') return <Input value={Array.isArray(value) ? value.join(', ') : value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="comma separated" />
  return <Input type={f.type === 'number' ? 'text' : 'text'} inputMode={f.type === 'number' ? 'decimal' : undefined} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
}
const fieldLabel = (f) => `${f.label}${f.unit ? ` (${f.unit})` : ''}${f.required ? ' *' : ''}`

export function NewAsset() {
  const [sp] = useSearchParams(); const nav = useNavigate(); const notify = useNotify()
  const T = useLoad('/api/taxonomy'), VS = useLoad('/api/vendors')
  const [cat, setCat] = useState(sp.get('cat') || ''), [vendor, setVendor] = useState(sp.get('vendor') || ''), [vals, setVals] = useState({}), [busy, setBusy] = useState(false)
  const leaves = (T.data?.nodes || []).filter((n) => n.leaf), n = leaves.find((x) => x.id === cat)
  const fields = n ? [...(T.data?.common || []), ...n.fields] : []
  const create = async () => { setBusy(true); try { const a = await api.post('/api/assets', { category: cat, vendor_id: vendor, fields: vals }); notify('Saved. Now add the images.'); nav('/library/asset/' + encodeURIComponent(a.id), { replace: true }) } catch (e) { notify(e.message, 'bad') } setBusy(false) }
  return <Page back title="Add an asset" subtitle="Pick the exact kind: the form below changes to the images and data that kind needs. Save first, then upload each view.">
    <Card title="Kind and vendor"><div className="grid g2" style={{ marginBottom: 0 }}>
      <Field label="Kind *"><Select value={cat} onChange={(e) => setCat(e.target.value)} placeholder="Choose…" options={leaves.map((x) => ({ value: x.id, label: x.names.join(' › ') }))} /></Field>
      <Field label="Vendor" hint="Add new vendors in Vendors and products."><Select value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="No vendor yet" options={(VS.data || []).map((v) => ({ value: v.id, label: `${v.name}${v.city ? ' · ' + v.city : ''}` }))} /></Field>
    </div></Card>
    {n && <Card title={`${n.name}: data to collect`} actions={<Button variant="primary" disabled={busy} onClick={create}>Save and add images</Button>}>
      <div className="grid g3" style={{ marginBottom: 0 }}>{fields.map((f) => <Field key={f.key} label={fieldLabel(f)}><FieldInput f={f} value={vals[f.key]} onChange={(v) => setVals({ ...vals, [f.key]: v })} /></Field>)}</div>
      <div className="label" style={{ marginTop: 16 }}>Images this kind needs (upload after saving)</div>
      <div className="small muted">{n.slots.map((s) => s.label + (s.required ? ' *' : '')).join(' · ')}</div>
    </Card>}
  </Page>
}

export default function Asset() {
  const { id } = useParams(); const aid = decodeURIComponent(id); const notify = useNotify(); const nav = useNavigate()
  const A = useLoad('/api/assets/' + encodeURIComponent(aid)), VS = useLoad('/api/vendors'), V = useLoad('/api/vocabulary')
  const J = useLoad('/api/jobs', 4000)
  const [vals, setVals] = useState(null), [vendor, setVendor] = useState(''), [full, setFull] = useState(null), [busySlot, setBusySlot] = useState('')
  const a = A.data
  useEffect(() => { if (a) { setVals(a.fields); setVendor(a.vendor_id || '') } }, [a?.id, a?.updatedAt]) // eslint-disable-line
  const jobs = (J.data || []).filter((j) => j.assetId === aid)
  const active = jobs.find((j) => ['queued', 'running'].includes(j.status))
  const doneKey = jobs.filter((j) => j.status === 'done').map((j) => j.id).join()
  useEffect(() => { if (doneKey) A.reload() }, [doneKey]) // eslint-disable-line
  if (A.error) return <Page back title="Asset"><div className="note">{A.error}</div></Page>
  if (!a || !vals) return <Page title="Loading…" />
  const save = async () => { try { await api.put('/api/assets/' + encodeURIComponent(aid), { fields: vals, vendor_id: vendor }); A.reload(); notify('Saved') } catch (e) { notify(e.message, 'bad') } }
  const codex = async (kind) => { try { await api.post(`/api/assets/${encodeURIComponent(aid)}/codex`, { kind }); J.reload(); notify(kind === 'tag' ? 'Codex is researching and tagging' : kind === 'standardise' ? 'Codex is standardising the images' : 'Codex: tag, then standardise') } catch (e) { notify(e.message, 'bad') } }
  const upload = async (slot, files, urls = [], kind) => { setBusySlot(slot + (kind || '')); try { await api.upload(`/api/assets/${encodeURIComponent(aid)}/images/${slot}${kind === 'std' ? '?kind=std' : ''}`, files, urls); A.reload() } catch (e) { notify(e.message, 'bad') } setBusySlot('') }
  const remove = async (slot, kind) => { if (!confirm('Remove this image? It moves to the asset\'s _removed folder.')) return; try { await api.del(`/api/assets/${encodeURIComponent(aid)}/images/${slot}${kind === 'std' ? '?kind=std' : ''}`); A.reload() } catch (e) { notify(e.message, 'bad') } }
  const styleName = (sid) => V.data?.find((s) => s.id === sid)?.name || sid
  const scores = Object.entries(a.ai?.styles || {}).sort((x, y) => y[1] - x[1])
  const haveOriginals = a.slots.some((s) => s.original)
  return <Page back="/library" title={a.name} subtitle={`${a.categoryNames.join(' › ')} · ${a.vendor || 'no vendor'}${a.city ? ' · ' + a.city : ''} · ${a.price_inr ? inr(a.price_inr) + (a.price_unit ? ' / ' + a.price_unit : '') : 'price on request'}`}
    actions={<><Button disabled={!!active} onClick={() => codex('tag')}>Research and tag</Button><Button disabled={!!active || !haveOriginals} onClick={() => codex('standardise')}>Standardise images</Button><Button variant="primary" disabled={!!active || !haveOriginals} onClick={() => codex('both')}>{active ? 'Codex is working…' : 'Both with Codex'}</Button></>}>
    {a.missing?.length > 0 && <div className="note">Still missing from the vendor: <b>{a.missing.join(', ')}</b>.</div>}

    <Card title="Images" actions={<span className="small muted">Left: what the vendor sent · right: standardised by Codex</span>}>
      <div className="slots">{a.slots.map((s) => <div key={s.key} className="slot">
        <div className="row between"><b>{s.label}{s.required ? ' *' : ''}</b>{s.standard ? <Badge tone="good">standard</Badge> : s.original ? <Badge>original</Badge> : <Badge tone={s.required ? 'warn' : ''}>{s.required ? 'needed' : 'optional'}</Badge>}</div>
        <div className="small muted slot-hint">{s.hint}</div>
        <div className="slot-pair">
          <SlotImage url={s.original} label="Original" busy={busySlot === s.key} onFiles={(f, u) => upload(s.key, f, u)} onOpen={setFull} onRemove={() => remove(s.key)} />
          <SlotImage url={s.standard} label="Standard" busy={busySlot === s.key + 'std'} onFiles={(f, u) => upload(s.key, f, u, 'std')} onOpen={setFull} onRemove={() => remove(s.key, 'std')} />
        </div></div>)}</div>
      {a.extra?.length > 0 && <><div className="label" style={{ marginTop: 14 }}>Other files</div><div className="thumbs">{a.extra.map((x) => <div key={x.kind + x.name} className="thumb" title={x.name}><img src={x.url} alt="" onClick={() => setFull(x.url)} /><div className="thumb-cap">{x.kind === 'std' ? 'std · ' : ''}{x.name}</div></div>)}</div></>}
    </Card>

    <div className="split">
      <Card title="Data" actions={<Button variant="primary" size="sm" onClick={save}>Save</Button>}>
        <Field label="Vendor"><Select value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="No vendor" options={(VS.data || []).map((v) => ({ value: v.id, label: `${v.name}${v.city ? ' · ' + v.city : ''}` }))} /></Field>
        <div className="grid g2" style={{ marginBottom: 0, marginTop: 12 }}>{(a.node?.fields || []).map((f) => <Field key={f.key} label={fieldLabel(f)}><FieldInput f={f} value={vals[f.key]} onChange={(v) => setVals({ ...vals, [f.key]: v })} /></Field>)}</div>
        <p className="hint" style={{ marginTop: 10 }}>Folder: <span className="mono">{a.folder}</span>{a.source === 'codex' ? ' · found by Codex' : ''}</p>
      </Card>
      <Card title="Where it can be used" actions={a.ai?.taggedAt ? <span className="small muted">Tagged {dt(a.ai.taggedAt)}</span> : null}>
        {!a.ai ? <div className="empty" style={{ padding: 20 }}>Not tagged yet. "Research and tag" makes Codex study this piece and score it for every Accord theme.</div> : <>
          {a.ai.description && <p style={{ marginTop: 0 }}>{a.ai.description}</p>}
          <div className="scores">{scores.map(([k, v]) => <div key={k} className={'score' + (v >= 0.6 ? ' fit' : '')}><span>{styleName(k)}</span><span className="bar"><i style={{ width: `${Math.round(v * 100)}%` }} /></span><span className="mono small">{Math.round(v * 100)}</span></div>)}</div>
          {a.ai.why && <div style={{ marginTop: 10 }}>{Object.entries(a.ai.why).map(([k, w]) => <div key={k} className="small"><b>{styleName(k)}:</b> {w}</div>)}</div>}
          <div className="small muted" style={{ marginTop: 10 }}>{[a.ai.rooms?.length && 'Rooms: ' + a.ai.rooms.join(', '), a.ai.materials?.length && 'Materials: ' + a.ai.materials.join(', '), a.ai.craft && 'Craft: ' + a.ai.craft, a.ai.scale && 'Scale: ' + a.ai.scale, a.ai.category2_shared && 'Shared across Category 2 styles'].filter(Boolean).join(' · ')}</div>
          {a.ai.pairs_with?.length > 0 && <div className="small muted">Pairs with: {a.ai.pairs_with.join(', ')}</div>}
          <div className="row gap-s" style={{ marginTop: 8 }}>{(a.ai.colours || []).map((c) => <span key={c} className="swatch" style={{ background: c }} title={c} />)}</div>
          {a.ai.quality_notes && <p className="small muted">Image notes: {a.ai.quality_notes}</p>}</>}
      </Card>
    </div>
    {jobs.length > 0 && <Card title="Codex for this asset">{jobs.slice(0, 6).map((j) => <JobRow key={j.id} j={j} onChange={J.reload} />)}</Card>}
    {full && <div className="modal-bg" onClick={() => setFull(null)}><img src={full} alt="" style={{ maxWidth: '94vw', maxHeight: '90vh', background: '#fff' }} /></div>}
  </Page>
}

function SlotImage({ url, label, busy, onFiles, onOpen, onRemove }) {
  const [over, setOver] = useState(false)
  return <div className={'slot-img' + (over ? ' over' : '') + (url ? '' : ' empty')} onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
    onDrop={(e) => { e.preventDefault(); setOver(false); const f = [...e.dataTransfer.files].filter((x) => x.type.startsWith('image/')); const u = e.dataTransfer.getData('text/uri-list'); onFiles(f.slice(0, 1), !f.length && u ? [u] : []) }}>
    {url ? <><img src={url} alt="" onClick={() => onOpen(url)} /><button className="thumb-x" title="Remove" onClick={onRemove}>×</button></>
      : <label className="slot-add">{busy ? 'Uploading…' : `+ ${label}`}<input type="file" accept="image/*" hidden onChange={(e) => { onFiles([...e.target.files].slice(0, 1)); e.target.value = '' }} /></label>}
    <span className="slot-tag">{label}</span>
  </div>
}
