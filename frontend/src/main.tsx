import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './index.css'

// In HL embed the host page injects <div id="nexus-app">; fall back to #root for local dev
const rootEl = document.getElementById('nexus-app') ?? document.getElementById('root')
if (!rootEl) throw new Error('Mount element not found — add <div id="nexus-app"> to the page')
createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
)
