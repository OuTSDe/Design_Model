// Embedded in Accord: the CRM opens the engine's screens inside its own shell (CRM_Application → Accord Design).
// Then the engine shows no side panel or top bar of its own, follows the CRM's light/dark choice, and hands
// toasts and links that belong to the CRM (Accord projects, Start project) back to it.
export const EMBED = (() => { try { return window.self !== window.top && new URLSearchParams(location.search).has('embed') } catch { return true } })()
const tell = (m) => { try { window.parent.postMessage({ source: 'design-engine', ...m }, '*') } catch { /* */ } }
export const toCrm = (to) => tell({ type: 'de-open', to })
export const toastToCrm = (msg, tone) => tell({ type: 'de-toast', msg, tone })
export const routeToCrm = (path) => tell({ type: 'de-route', path })
export const initialTheme = () => new URLSearchParams(location.search).get('theme')
