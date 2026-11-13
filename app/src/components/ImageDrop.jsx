// Drop files, choose files, paste an image, or paste a link (image, Pinterest pin, any page with a preview image).
import React, { useState } from 'react'
import { api } from '../api.js'
import { useNotify } from './ui.jsx'

export default function ImageDrop({ url, onDone, hint }) {
  const [over, setOver] = useState(false), [link, setLink] = useState(''), [busy, setBusy] = useState(false)
  const notify = useNotify()
  const send = async (files, urls = []) => {
    if (!files.length && !urls.length) return
    setBusy(true); try { const r = await api.upload(url, files, urls); notify(`${r.saved?.length ?? r.saved} image(s) added`); setLink(''); onDone?.() } catch (e) { notify(e.message, 'bad') } setBusy(false)
  }
  return <div className={'drop' + (over ? ' over' : '')} onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
    onDrop={(e) => { e.preventDefault(); setOver(false); const f = [...e.dataTransfer.files].filter((x) => x.type.startsWith('image/')); const u = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain'); send(f, !f.length && /^https?:/.test(u) ? [u] : []) }}
    onPaste={(e) => { const f = [...e.clipboardData.files].filter((x) => x.type.startsWith('image/')); if (f.length) { e.preventDefault(); send(f) } }}>
    <div className="row" style={{ gap: 8 }}>
      <label className="btn btn-sm">{busy ? 'Adding…' : 'Choose images'}<input type="file" accept="image/*" multiple hidden onChange={(e) => { send([...e.target.files]); e.target.value = '' }} /></label>
      <input className="input" style={{ flex: 1, minWidth: 180, minHeight: 32 }} placeholder="or paste a link: image, Pinterest pin, page" value={link} onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send([], [link.trim()])} />
      <button className="btn btn-sm" disabled={!link.trim() || busy} onClick={() => send([], [link.trim()])}>Add link</button>
    </div>
    {hint && <div className="hint" style={{ marginTop: 8 }}>{hint} You can also drop or paste images here.</div>}
  </div>
}
