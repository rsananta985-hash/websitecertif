import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App, { PublicVerify } from './App.jsx'

import LandingPage from './LandingPage.jsx'

const path = window.location.pathname
const params = new URLSearchParams(window.location.search)

const isPublicVerify = path.startsWith('/public') || params.has('cert') || params.has('hash')
const isApp = path.startsWith('/login') || path.startsWith('/register') || path.startsWith('/dashboard') || path.startsWith('/admin')
const isLanding = path === '/'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isPublicVerify ? <PublicVerify /> : (isApp ? <App /> : <LandingPage />)}
  </StrictMode>,
)
