// Vendors and products: every vendor with location, categories and price range; a vendor's page is their own library,
// grouped by the same folders as the asset library.
import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Page, Card, Badge, Button, Field, Input, Textarea, Select, Modal, KV, useLoad, useNotify } from '../components/ui.jsx'
import { api } from '../api.js'
import { AssetCard } from './Library.jsx'
import { inr } from './Project.jsx'

const BANDS = ['Composed', 'Provenance', 'Atelier']
const GROUPS = ['Furniture', 'Lighting', 'Tiles', 'Stone', 'Wood & veneers', 'Fabrics & wallcoverings', 'Paint & finishes', 'Sanitary & CP', 'Hardware', 'Decor & art', 'Appliances']
const blank = { name: '', city: 'Mangaluru', area: '', address: '', state: 'Karnataka', website: '', instagram: '', contact_person: '', phone: '', email: '', categories: [], price_band: '', showroom: '', delivery: '', gst: '', map_url: '', notes: '' }

export function VendorForm({ v, setV }) {
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value })
  return <div className="grid g2" style={{ marginBottom: 0 }}>
    <Field label="Vendor name *"><Input value={v.name} onChange={set('name')} /></Field>
    <Field label="Price band"><Select value={v.price_band || ''} onChange={set('price_band')} placeholder="—" options={BANDS} /></Field>
    <Field label="City"><Input value={v.city || ''} onChange={set('city')} /></Field><Field label="Area / locality"><Input value={v.area || ''} onChange={set('area')} /></Field>
    <Field label="Address"><Textarea rows={2} value={v.address || ''} onChange={set('address')} /></Field><Field label="Map link"><Input value={v.map_url || ''} onChange={set('map_url')} placeholder="Google Maps link" /></Field>
    <Field label="Website"><Input value={v.website || ''} onChange={set('website')} /></Field><Field label="Instagram"><Input value={v.instagram || ''} onChange={set('instagram')} /></Field>
    <Field label="Contact person"><Input value={v.contact_person || ''} onChange={set('contact_person')} /></Field><Field label="Phone"><Input value={v.phone || ''} onChange={set('phone')} /></Field>
    <Field label="E-mail"><Input value={v.email || ''} onChange={set('email')} /></Field><Field label="GSTIN"><Input value={v.gst || ''} onChange={set('gst')} /></Field>
    <Field label="Showroom"><Input value={v.showroom || ''} onChange={set('showroom')} placeholder="Yes, open Mon–Sat 10–7" /></Field><Field label="Delivery to Mangaluru"><Input value={v.delivery || ''} onChange={set('delivery')} /></Field>
    <Field label="What they supply" hint="Click to toggle."><div className="row gap-s" style={{ flexWrap: 'wrap' }}>{GROUPS.map((g) => { const on = (v.categories || []).includes(g)
      return <button key={g} type="button" className={'chip' + (on ? ' on' : '')} onClick={() => setV({ ...v, categories: on ? v.categories.filter((x) => x !== g) : [...(v.categories || []), g] })}>{g}</button> })}</div></Field>
    <Field label="Notes"><Textarea rows={2} value={v.notes || ''} onChange={set('notes')} /></Field>
  </div>
}

export default function Vendors() {
  const V = useLoad('/api/vendors'); const nav = useNavigate(); const notify = useNotify()
  const [nv, setNv] = useState(null), [q, setQ] = useState(''), [grp, setGrp] = useState('')
  const vs = (V.data || []).filter((v) => (!q || JSON.stringify([v.name, v.city, v.area]).toLowerCase().includes(q.toLowerCase())) && (!grp || (v.categories || []).includes(grp) || (v.groups || []).includes(grp)))
  const create = async () => { try { const v = await api.post('/api/vendors', nv); setNv(null); nav('/vendors/' + v.id) } catch (e) { notify(e.message, 'bad') } }
  return <Page title={<>Vendors <em>and products</em></>} subtitle="Every vendor with their location, what they supply and their price range. Open a vendor to see their own library; everything they send is collected in the asset library with the same fixed form."
    actions={<Button variant="primary" onClick={() => setNv({ ...blank })}>+ Vendor</Button>}>
    <Card><div className="row gap-s" style={{ flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 200 }}><Input placeholder="Search vendor, city, area…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div style={{ width: 230 }}><Select value={grp} onChange={(e) => setGrp(e.target.value)} placeholder="Everything they supply" options={GROUPS} /></div>
      <span className="small muted">{vs.length} vendor{vs.length === 1 ? '' : 's'}</span></div></Card>
    {!vs.length && <div className="empty"><h3>No vendors yet</h3>Add one with "+ Vendor", or run "Find vendor products" on a room.</div>}
    <div className="vendor-grid">{vs.map((v) => <div key={v.id} className="vendor-card" onClick={() => nav('/vendors/' + v.id)}>
      <div className="vendor-thumbs">{v.thumbs?.length ? v.thumbs.map((t) => <img key={t} src={t} alt="" />) : <div className="lib-ph">No assets yet</div>}</div>
      <div className="lib-body"><div className="row between"><b>{v.name}</b>{v.price_band && <Badge>{v.price_band}</Badge>}</div>
        <div className="small muted">{[v.area, v.city].filter(Boolean).join(', ') || 'Location not set'}</div>
        <div className="small">{(v.categories?.length ? v.categories : v.groups || []).join(' · ')}</div>
        <div className="small"><b>{v.assetCount}</b> asset{v.assetCount === 1 ? '' : 's'}{v.priceMin ? ` · ${inr(v.priceMin)}${v.priceMax > v.priceMin ? ' – ' + inr(v.priceMax) : ''}` : ''}</div></div></div>)}</div>
    <Modal wide open={!!nv} onClose={() => setNv(null)} title="New vendor" footer={<><Button onClick={() => setNv(null)}>Cancel</Button><Button variant="primary" onClick={create}>Save vendor</Button></>}>{nv && <VendorForm v={nv} setV={setNv} />}</Modal>
  </Page>
}

export function Vendor() {
  const { id } = useParams(); const nav = useNavigate(); const notify = useNotify()
  const V = useLoad('/api/vendors/' + id), T = useLoad('/api/taxonomy')
  const [edit, setEdit] = useState(null), [pick, setPick] = useState('')
  const v = V.data
  if (V.error) return <Page back="/vendors" title="Vendor"><div className="note">{V.error}</div></Page>
  if (!v) return <Page title="Loading…" />
  const save = async () => { try { await api.put('/api/vendors/' + v.id, edit); setEdit(null); V.reload(); notify('Vendor saved') } catch (e) { notify(e.message, 'bad') } }
  const groups = {}; v.assets.forEach((a) => { const k = a.categoryNames.slice(0, -1).join(' › ') || a.categoryNames[0]; (groups[k] = groups[k] || []).push(a) })
  const leaves = (T.data?.nodes || []).filter((n) => n.leaf)
  return <Page back="/vendors" title={v.name} subtitle={[v.area, v.city, v.state].filter(Boolean).join(', ')}
    actions={<><Button onClick={() => setEdit({ ...v })}>Edit vendor</Button><div style={{ width: 230 }}><Select value={pick} onChange={(e) => setPick(e.target.value)} placeholder="Add an asset of kind…" options={leaves.map((n) => ({ value: n.id, label: n.names.join(' › ') }))} /></div>
      <Button variant="primary" disabled={!pick} onClick={() => nav(`/library/new?cat=${encodeURIComponent(pick)}&vendor=${v.id}`)}>+ Add</Button></>}>
    <div className="split">
      <Card title="Vendor"><KV rows={[['Supplies', (v.categories || []).join(', ')], ['Price band', v.price_band], ['Address', v.address], ['Map', v.map_url && <a href={v.map_url} target="_blank" rel="noreferrer">Open map</a>], ['Website', v.website && <a href={v.website} target="_blank" rel="noreferrer">{v.website}</a>],
        ['Instagram', v.instagram], ['Contact', [v.contact_person, v.phone, v.email].filter(Boolean).join(' · ')], ['Showroom', v.showroom], ['Delivery', v.delivery], ['GSTIN', v.gst], ['Styles', (v.styles || []).join(', ')], ['Notes', v.notes]]} /></Card>
      <Card title={`Their library · ${v.assets.length}`}>
        {Object.entries(groups).map(([g, list]) => <div key={g} className="check-row"><span>{g}</span><span className="small muted">{list.length} · {list.map((a) => a.categoryNames.at(-1)).filter((x, i, arr) => arr.indexOf(x) === i).join(', ')}</span></div>)}
        {!v.assets.length && <div className="empty" style={{ padding: 20 }}>Nothing yet. Pick a kind above and add their first asset.</div>}
      </Card>
    </div>
    {Object.entries(groups).map(([g, list]) => <div key={g}><div className="label" style={{ margin: '18px 0 8px' }}>{g}</div>
      <div className="lib-grid">{list.map((a) => <AssetCard key={a.id} a={a} onClick={() => nav('/library/asset/' + encodeURIComponent(a.id))} />)}</div></div>)}
    <Modal wide open={!!edit} onClose={() => setEdit(null)} title={'Edit ' + v.name} footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>{edit && <VendorForm v={edit} setV={setEdit} />}</Modal>
  </Page>
}
