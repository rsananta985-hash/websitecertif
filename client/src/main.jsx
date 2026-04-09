import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App, { PublicVerify } from './App.jsx'

// Simple routing: if path is /public or has ?cert= param, show public verify
const path = window.location.pathname
const params = new URLSearchParams(window.location.search)
const isPublic = path.startsWith('/public') || params.has('cert') || params.has('hash')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isPublic ? <PublicVerify /> : <App />}
  </StrictMode>,
)
