// The Accord UI kit, same class names as CRM_Application/source/src/components/ui.jsx, so modules move across on merge.
import React, { useEffect, useState, createContext, useContext, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { engineUrl, fix } from '../api.js'

export const cx = (...a) => a.filter(Boolean).join(' ')
export function Page({ title, subtitle, actions, back, children }) {
  const nav = useNavigate()
  return <div className="content">
    {back && <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14, paddingLeft: 0 }} onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}>← Back</button>}
    <div className="page-head"><div><h1>{title}</h1>{subtitle && <p className="sub">{subtitle}</p>}</div>{actions && <div className="row gap-s">{actions}</div>}</div>
    {children}</div>
}
export const Card = ({ title, actions, children, pad = true, style }) => <div className="card" style={style}>
  {(title || actions) && <div className="card-head"><h3>{title}</h3>{actions && <div className="row gap-s">{actions}</div>}</div>}
  {pad ? <div className="card-body">{children}</div> : children}</div>
export const Button = ({ variant, size, className, ...p }) => <button className={cx('btn', variant && 'btn-' + variant, size && 'btn-' + size, className)} {...p} />
export const Badge = ({ tone, children }) => <span className={cx('badge', tone && 'b-' + tone)}>{children}</span>
export const Stat = ({ label, value, sub, tone, onClick, long }) => <div className={cx('stat', tone && 'tone-' + tone, onClick && 'click', long && 'long')} onClick={onClick}>
  <div className="stat-label">{label}</div><div className="stat-value">{value}</div>{sub && <div className="stat-sub">{sub}</div>}</div>
export const Seg = ({ options, value, onChange }) => <div className="seg">{options.map((o) => <button key={String(o.value)} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>)}</div>
export const Field = ({ label, hint, children }) => <label className="field"><span className="field-label">{label}</span>{children}{hint && <span className="hint">{hint}</span>}</label>
export const Input = (p) => <input className="input" {...p} />
export const Textarea = (p) => <textarea className="input textarea" {...p} />
export const Select = ({ options, placeholder, ...p }) => <select className="input" {...p}>{placeholder && <option value="">{placeholder}</option>}
  {options.map((o) => typeof o === 'string' ? <option key={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}</select>
export function Modal({ open, onClose, title, children, footer, wide }) {
  if (!open) return null
  return <div className="modal-bg" onClick={onClose}><div className={cx('modal', wide && 'modal-wide')} onClick={(e) => e.stopPropagation()}>
    <div className="modal-head"><h3>{title}</h3><button className="x" onClick={onClose}>×</button></div><div className="modal-body">{children}</div>{footer && <div className="modal-foot">{footer}</div>}</div></div>
}
export const KV = ({ rows }) => <div>{rows.filter(Boolean).map(([k, v]) => <div key={k} className="check-row"><span className="lbl">{k}</span><span>{v || '–'}</span></div>)}</div>

const ToastCtx = createContext(() => {})
export function ToastHost({ children }) {
  const [t, setT] = useState(null)
  const notify = useCallback((msg, tone) => { setT({ msg, tone, k: Date.now() }) }, [])
  useEffect(() => { if (!t) return; const x = setTimeout(() => setT(null), 3600); return () => clearTimeout(x) }, [t])
  return <ToastCtx.Provider value={notify}>{children}{t && <div className={cx('toast', t.tone && 't-' + t.tone)} key={t.k}>{t.msg}</div>}</ToastCtx.Provider>
}
export const useNotify = () => useContext(ToastCtx)

// Load from the engine, with reload; polls when `every` is set.
export function useLoad(url, every) {
  const [state, set] = useState({ data: null, error: null, loading: true })
  const load = useCallback(() => fetch(engineUrl(url)).then(async (r) => { const j = fix(await r.json()); if (!r.ok) throw new Error(j.error || 'Engine error'); set({ data: j, error: null, loading: false }) })
    .catch((e) => set((s) => ({ ...s, error: /fetch/i.test(e.message) ? 'The engine is not running on this PC. Start it with Start Design Engine.cmd' : e.message, loading: false }))), [url])
  useEffect(() => { load(); if (!every) return; const x = setInterval(() => { if (!document.hidden) load() }, every); return () => clearInterval(x) }, [load, every])
  return { ...state, reload: load }
}
export const d = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '–'
export const dt = (iso) => iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '–'
