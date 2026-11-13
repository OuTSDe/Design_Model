// Shown when the Design Engine cannot be reached or asks for its access key: pick the engine (this laptop or the
// server laptop) and enter the key. Saved on this computer only.
import React, { useState } from 'react'
import { connect, ENGINE, KEY } from '../api.js'

export default function Connect({ error, needKey }) {
  const [engine, setEngine] = useState(ENGINE || (location.port === '4317' ? '' : 'http://localhost:4317'))
  const [key, setKey] = useState(KEY)
  const page = location.protocol === 'https:'
  return <div className="content"><div className="card" style={{ maxWidth: 720 }}><div className="card-head"><h3>{needKey ? 'Enter the access key' : 'Connect to the Design Engine'}</h3></div><div className="card-body">
    <p style={{ marginTop: 0 }}>{needKey ? 'This Design Engine is shared from the server laptop and needs its access key.' : error}</p>
    <label className="field"><span className="field-label">Engine address</span>
      <input className="input" value={engine} onChange={(e) => setEngine(e.target.value)} placeholder="http://localhost:4317 or the server laptop, e.g. http://192.168.1.20:4317" />
      <span className="hint">On the server laptop itself: http://localhost:4317. From another laptop: the "Team address" shown in the server's window{page ? ' (from this https page, use the server’s https Tailscale address; see the README)' : ''}. Leave empty if this page is opened from the engine itself.</span></label>
    <label className="field" style={{ marginTop: 12 }}><span className="field-label">Access key</span>
      <input className="input" value={key} onChange={(e) => setKey(e.target.value)} placeholder="xxxx-xxxx-xxxx-xxxx" />
      <span className="hint">Shown in the server laptop's window and on its Engine and Codex page. Not needed on the server laptop itself.</span></label>
    <div className="row gap-s" style={{ marginTop: 16 }}><button className="btn btn-primary" onClick={() => connect(engine, key)}>Connect</button>
      {(ENGINE || KEY) && <button className="btn btn-ghost" onClick={() => connect('', '')}>Forget saved engine</button>}</div>
  </div></div></div>
}
