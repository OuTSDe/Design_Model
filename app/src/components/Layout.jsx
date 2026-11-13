// Same shell as Accord: side panel (collapsible), top bar with crumbs, light/dark switch. Design workspace only.
import React, { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useLoad } from './ui.jsx'
import Connect from './Connect.jsx'

const NAV = [
  { label: 'Design engine', items: [['/', 'Overview', '01', true], ['/projects', 'Projects', '02'], ['/vocabulary', 'Space vocabulary', '03'], ['/jobs', 'Codex jobs', '04']] },
  { label: 'Library', items: [['/library', 'Asset library', '05'], ['/vendors', 'Vendors and products', '06']] },
  { label: 'Engine', items: [['/engine', 'Engine and Codex', '07']] }
]
export default function Layout() {
  const [col, setCol] = useState(() => localStorage.getItem('de.side') === '1')
  const [theme, setTheme] = useState(() => localStorage.getItem('de.theme') || 'dark')
  const loc = useLocation()
  const health = useLoad('/api/health', 15000)
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('de.theme', theme) }, [theme])
  useEffect(() => { localStorage.setItem('de.side', col ? '1' : '0') }, [col])
  const crumb = NAV.flatMap((g) => g.items).find(([to, , , end]) => (end ? loc.pathname === to : loc.pathname.startsWith(to)))?.[1] || 'Design engine'
  const h = health.data
  const sync = health.error ? ['s-error', 'Engine offline'] : !h ? ['', 'Connecting'] : h.jobs.running ? ['s-syncing', 'Codex running'] : ['s-synced', 'Engine ready']
  return <div className={'shell' + (col ? ' collapsed' : '')}>
    <aside className="side">
      <div className="brand" onClick={() => setCol(!col)} title="Collapse the side panel"><div className="mark">A</div><div><div className="brand-name">Accord</div><div className="brand-sub">Design engine</div></div></div>
      {NAV.map((g) => <div key={g.label} className="nav-group"><div className="nav-label"><span className="dot" style={{ background: 'var(--m-accord)' }} /><span>{g.label}</span></div>
        {g.items.map(([to, t, n, end]) => <NavLink key={to} to={to} end={end} className={({ isActive }) => 'nav-item' + (isActive ? ' on' : '')}><span className="ni">{n}</span><span className="nt">{t}</span></NavLink>)}</div>)}
      <div className="side-foot"><span className={'sync ' + sync[0]}><span className="sync-t">{sync[1]}</span></span>
        <button className="icon-btn" title="Light or dark" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '☀' : '☾'}</button></div>
    </aside>
    <div className="main">
      <header className="top"><span className="crumb">Accord Design · {crumb}</span>
        <div className="top-right"><span className="label" style={{ color: 'var(--m-accord)' }}>OuTSDe · separate build, not merged</span></div></header>
      {health.error ? <Connect error={health.error} needKey={health.needKey} /> : <Outlet />}
    </div>
  </div>
}
