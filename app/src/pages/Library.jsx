// Asset library: the folder system (Furniture › Seating › Chair …) of every vendor asset, with the theme filter.
// Pinterest references found for rooms are in the second tab.
import React, { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Page, Card, Seg, Select, Input, Badge, Button, useLoad, useNotify } from '../components/ui.jsx'
import { api } from '../api.js'
import { topStyles, inr } from './Project.jsx'

export const priceLine = (a) => (a.price_inr ? `${inr(a.price_inr)}${a.price_unit ? ' / ' + a.price_unit : ''}` : 'Price on request')

export function AssetCard({ a, onClick, style }) {
  return <div className="lib-card" onClick={onClick} style={{ cursor: 'pointer' }}>
    {a.thumb ? <img src={a.thumb} alt="" className={a.standardised ? 'std' : ''} /> : <div className="lib-ph">No image yet</div>}
    <div className="lib-body"><div className="row between" style={{ gap: 6 }}><b>{a.name}</b>{a.standardised ? <Badge tone="good">std</Badge> : null}</div>
      <div className="small muted">{a.vendor || 'No vendor'}{a.city ? ' · ' + a.city : ''}</div>
      <div className="small"><b>{priceLine(a)}</b></div>
      <div className="small muted" style={{ textTransform: 'capitalize' }}>{style ? `${style.replace(/-/g, ' ')} ${Math.round((a.styles[style] || 0) * 100)}` : (a.tagged ? topStyles(a.styles) : 'Not tagged yet')}</div>
      {a.missing?.length ? <div className="small" style={{ color: 'var(--warn)' }}>Missing: {a.missing.slice(0, 3).join(', ')}{a.missing.length > 3 ? ` +${a.missing.length - 3}` : ''}</div> : null}</div></div>
}

export default function Library() {
  const [sp, setSp] = useSearchParams()
  const tab = sp.get('tab') || 'assets'
  return <Page title={<>Asset <em>library</em></>} subtitle="Every vendor's products in one folder system, each with the same fixed set of images and data. Codex standardises the images and tags where each piece can be used, so mood boards only pick pieces that suit the theme."
    actions={<Seg options={[{ value: 'assets', label: 'Vendor assets' }, { value: 'refs', label: 'Pinterest references' }]} value={tab} onChange={(v) => setSp({ tab: v })} />}>
    {tab === 'assets' ? <Assets /> : <Refs />}
  </Page>
}

function Assets() {
  const nav = useNavigate(); const notify = useNotify()
  const T = useLoad('/api/taxonomy'), C = useLoad('/api/assets/counts', 15000), V = useLoad('/api/vocabulary'), VS = useLoad('/api/vendors')
  const [cat, setCat] = useState(''), [style, setStyle] = useState(''), [vendor, setVendor] = useState(''), [q, setQ] = useState(''), [open, setOpen] = useState({ furniture: true })
  const qs = new URLSearchParams({ ...(cat && { cat }), ...(style && { style }), ...(vendor && { vendor }), ...(q && { q }) }).toString()
  const L = useLoad('/api/assets?' + qs, 15000)
  const nodes = T.data?.nodes || [], counts = C.data || {}
  const sel = nodes.find((n) => n.id === cat)
  const kids = (id) => nodes.filter((n) => n.id.startsWith(id + '/') && n.id.split('/').length === id.split('/').length + 1)
  const Tree = ({ list }) => <div>{list.map((n) => { const ch = kids(n.id); const isOpen = open[n.id] || cat.startsWith(n.id)
    return <div key={n.id}><div className={'tree-row' + (cat === n.id ? ' on' : '')} style={{ paddingLeft: 6 + n.depth * 14 }}>
      {ch.length ? <span className="tree-tw" onClick={() => setOpen({ ...open, [n.id]: !isOpen })}>{isOpen ? '▾' : '▸'}</span> : <span className="tree-tw" />}
      <span className="tree-name" onClick={() => setCat(cat === n.id ? '' : n.id)}>{n.name}</span><span className="tree-n">{counts[n.id] || ''}</span></div>
      {ch.length > 0 && isOpen && <Tree list={ch} />}</div> })}</div>
  const tagAll = async () => { try { const r = await api.post('/api/assets-codex-all', { kind: 'tag' }); notify(`Codex will tag ${r.queued} asset(s)`) } catch (e) { notify(e.message, 'bad') } }
  const list = L.data || []
  return <div className="lib-layout">
    <Card title="Folders" actions={<span className="small muted">{counts.furniture !== undefined || Object.keys(counts).length ? `${Object.entries(counts).filter(([k]) => !k.includes('/')).reduce((s, [, v]) => s + v, 0)} assets` : ''}</span>}>
      <div className={'tree-row' + (!cat ? ' on' : '')}><span className="tree-tw" /><span className="tree-name" onClick={() => setCat('')}>All assets</span></div>
      <Tree list={nodes.filter((n) => n.depth === 0)} />
      <p className="hint" style={{ marginTop: 12 }}>The folders, the images each kind needs and its data fields come from <span className="mono">Library/taxonomy.json</span>. Add a kind there and it appears here.</p>
    </Card>
    <div>
      <Card>
        <div className="row gap-s" style={{ flexWrap: 'wrap' }}>
          <div style={{ width: 250 }}><Select value={style} onChange={(e) => setStyle(e.target.value)} placeholder="Theme: all pieces" options={(V.data || []).map((s) => ({ value: s.id, label: `Theme: ${s.name}` }))} /></div>
          <div style={{ width: 210 }}><Select value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="All vendors" options={(VS.data || []).map((v) => ({ value: v.id, label: v.name }))} /></div>
          <div style={{ flex: 1, minWidth: 160 }}><Input placeholder="Search name, material, vendor…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <Button size="sm" onClick={tagAll} title="Research and tag every asset that has no tags yet">Tag untagged with Codex</Button>
          <Button size="sm" variant="primary" disabled={!sel?.leaf} title={sel?.leaf ? '' : 'Pick the exact kind in the folders first, e.g. Chair'} onClick={() => nav(`/library/new?cat=${encodeURIComponent(sel.id)}${vendor ? '&vendor=' + vendor : ''}`)}>+ Add {sel?.leaf ? sel.name.toLowerCase() : 'asset'}</Button>
        </div>
        <div className="small muted" style={{ marginTop: 10 }}>{sel ? sel.names.join(' › ') : 'All folders'} · {list.length} asset{list.length === 1 ? '' : 's'}{style ? ` that fit ${V.data?.find((s) => s.id === style)?.name} (score 60 or more)` : ''}</div>
      </Card>
      {!list.length && <div className="empty"><h3>{style ? 'Nothing tagged for this theme here yet' : 'No assets here yet'}</h3>{sel?.leaf ? `Add a ${sel.name.toLowerCase()} with "+ Add", or run "Find vendor products" on a room.` : 'Pick a folder, then the exact kind (e.g. Chair) to add one.'}</div>}
      <div className="lib-grid">{list.map((a) => <AssetCard key={a.id} a={a} style={style} onClick={() => nav('/library/asset/' + encodeURIComponent(a.id))} />)}</div>
    </div>
  </div>
}

function Refs() {
  const L = useLoad('/api/library'), V = useLoad('/api/vocabulary')
  const [style, setStyle] = useState(''), [q, setQ] = useState(''), [full, setFull] = useState(null)
  const items = (L.data || []).filter((x) => x.kind === 'reference')
  const list = useMemo(() => items.filter((x) => !q || JSON.stringify([x.element, x.title, x.materials]).toLowerCase().includes(q.toLowerCase()))
    .map((x) => ({ ...x, score: style ? (x.styles?.[style] || 0) : 1 })).filter((x) => !style || x.score >= 0.4).sort((a, b) => b.score - a.score), [items, style, q])
  return <>
    <Card><div className="row gap-s" style={{ flexWrap: 'wrap' }}>
      <div style={{ width: 250 }}><Select value={style} onChange={(e) => setStyle(e.target.value)} placeholder="Any style" options={(V.data || []).map((s) => ({ value: s.id, label: s.name }))} /></div>
      <div style={{ flex: 1, minWidth: 180 }}><Input placeholder="Search element, material…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <span className="small muted">{list.length} of {items.length} references found by Codex for rooms</span></div></Card>
    <div className="lib-grid">{list.map((x) => <div key={x.id} className="lib-card">
      {x.url ? <img src={x.url} alt="" onClick={() => setFull(x.url)} /> : <div className="lib-ph">–</div>}
      <div className="lib-body"><b>{x.element}</b><div className="small muted">{x.title}</div>
        <div className="row gap-s" style={{ margin: '6px 0' }}>{(x.colours || []).slice(0, 6).map((c) => <span key={c} className="swatch" style={{ background: c }} title={c} />)}</div>
        <div className="small" style={{ textTransform: 'capitalize' }}>{topStyles(x.styles)}</div>
        <div className="small muted">{x.project} · {x.room}{x.source_url ? <> · <a href={x.source_url} target="_blank" rel="noreferrer">pin</a></> : null}</div></div></div>)}</div>
    {full && <div className="modal-bg" onClick={() => setFull(null)}><img src={full} alt="" style={{ maxWidth: '94vw', maxHeight: '90vh' }} /></div>}
  </>
}
