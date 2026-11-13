import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './accord-base.css'
import './engine.css'
import Layout from './components/Layout.jsx'
import { ToastHost } from './components/ui.jsx'
import Overview from './pages/Overview.jsx'
import Projects from './pages/Projects.jsx'
import Project from './pages/Project.jsx'
import Vocabulary from './pages/Vocabulary.jsx'
import Jobs from './pages/Jobs.jsx'
import Engine from './pages/Engine.jsx'
import Library from './pages/Library.jsx'
import Vendors, { Vendor } from './pages/Vendors.jsx'
import Asset, { NewAsset } from './pages/Asset.jsx'

createRoot(document.getElementById('root')).render(
  <ToastHost><HashRouter><Routes><Route element={<Layout />}>
    <Route index element={<Overview />} />
    <Route path="projects" element={<Projects />} />
    <Route path="projects/:id" element={<Project />} />
    <Route path="vocabulary" element={<Vocabulary />} />
    <Route path="jobs" element={<Jobs />} />
    <Route path="engine" element={<Engine />} />
    <Route path="library" element={<Library />} />
    <Route path="vendors" element={<Vendors />} />
    <Route path="vendors/:id" element={<Vendor />} />
    <Route path="library/asset/:id" element={<Asset />} />
    <Route path="library/new" element={<NewAsset />} />
  </Route></Routes></HashRouter></ToastHost>
)
