import { useState, useEffect, useCallback, useRef } from 'react'



const API = 'http://localhost:8080/api'

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const getAuth = () => { try { return { token: localStorage.getItem('cc_token'), user: JSON.parse(localStorage.getItem('cc_user')||'null') } } catch { return {token:null,user:null} } }
const setAuth = (t,u) => { localStorage.setItem('cc_token',t); localStorage.setItem('cc_user',JSON.stringify(u)) }
const clearAuth = () => { localStorage.removeItem('cc_token'); localStorage.removeItem('cc_user') }
const H = (t) => ({ 'Content-Type':'application/json', Authorization:`Bearer ${t}` })
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'
const fmtDt = (d) => d ? new Date(d).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'

/* ─── SVG Icons ──────────────────────────────────────────────────────────── */
const Ico = {
  dash:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  cert:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  verify:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>,
  list:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  users:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  history: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><polyline points="12,8 12,12 14,14"/><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"/></svg>,
  profile: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  logout:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  chain:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  info:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  shield:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  check:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20,6 9,17 4,12"/></svg>,
  x:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  upload:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><polyline points="16,16 12,12 8,16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  plus:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
}

const I = ({n, s=16}) => <span style={{width:s,height:s,display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{Ico[n]}</span>

/* ─── Nav config ─────────────────────────────────────────────────────────── */
const NAV_ADMIN = [
  { key:'dashboard',      label:'Dashboard',        ico:'dash',    sec:'WORKSPACE' },
  { key:'issue',          label:'Issue Certificate', ico:'cert',   sec:'WORKSPACE' },
  { key:'certificates',   label:'All Certificates', ico:'list',    sec:'WORKSPACE' },
  { key:'verifications',  label:'Verifications',    ico:'verify',  sec:'WORKSPACE' },
  { key:'users',          label:'Users',            ico:'users',   sec:'WORKSPACE' },
]
const NAV_USER = [
  { key:'dashboard',  label:'Dashboard',  ico:'dash',    sec:'PORTAL' },
  { key:'verify',     label:'Verify',     ico:'verify',  sec:'PORTAL' },
  { key:'history',    label:'History',    ico:'history', sec:'PORTAL' },
  { key:'profile',    label:'My Account', ico:'profile', sec:'PORTAL' },
]

/* ─── Splash Screen ──────────────────────────────────────────────────────── */
function SplashScreen({ user }) {
  const isAdmin = user?.role === 'admin'
  return (
    <div className="splash-overlay">
      <div className="splash-card">
        {/* Logo animated */}
        <div className="splash-logo">
          <div className="splash-logo-ring"/>
          <div className="splash-logo-icon">
            <I n="chain" s={28}/>
          </div>
        </div>

        {/* Brand */}
        <div className="splash-brand">CertyChain AI</div>
        <div className="splash-sub">Appskep Indonesia</div>

        {/* Welcome message */}
        <div className="splash-welcome">
          Selamat datang kembali,
          <br/>
          <strong>{user?.name || 'Pengguna'}</strong>
        </div>

        {/* Role badge */}
        <div className={`splash-role ${isAdmin ? 'admin' : 'user'}`}>
          {isAdmin ? 'Administrator' : 'User Portal'}
        </div>

        {/* Progress bar */}
        <div className="splash-progress">
          <div className="splash-progress-bar"/>
        </div>

        <div className="splash-hint">Memuat sistem...</div>
      </div>
    </div>
  )
}

/* ─── Logout Screen ──────────────────────────────────────────────────────── */
function LogoutScreen({ user }) {
  return (
    <div className="logout-overlay">
      <div className="splash-card">
        {/* Logo animated */}
        <div className="logout-logo">
          <div className="logout-logo-ring"/>
          <div className="logout-logo-icon">
            <I n="logout" s={26}/>
          </div>
        </div>

        {/* Brand */}
        <div className="splash-brand" style={{color:'#ffffff'}}>CertyChain AI</div>
        <div className="splash-sub">Appskep Indonesia</div>

        {/* Goodbye message */}
        <div className="splash-welcome" style={{marginTop:'0.5rem'}}>
          Sampai jumpa,<br/>
          <strong>{user?.name || 'Pengguna'}</strong>
        </div>

        {/* Security badge */}
        <div className="logout-badge">
          Sesi berakhir dengan aman
        </div>

        {/* Progress bar */}
        <div className="splash-progress" style={{marginTop:'1.25rem'}}>
          <div className="logout-progress-bar"/>
        </div>

        <div className="splash-hint">Menghapus sesi...</div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [auth, setA]      = useState(getAuth)
  const [page, setPage]   = useState('dashboard')
  const [hp, setHp]       = useState(null)
  const [ap, setAp]       = useState('login')
  const [splashing, setSplashing]     = useState(false)
  const [splashUser, setSplashUser]   = useState(null)
  const [loggingOut, setLoggingOut]   = useState(false)
  const [logoutUser, setLogoutUser]   = useState(null)

  useEffect(() => {
    fetch(`${API}/health`).then(r=>r.json()).then(setHp).catch(()=>setHp({status:'error'}))
  }, [auth.token])

  const login = useCallback((t, u) => {
    setAuth(t, u)
    setSplashUser(u)
    setSplashing(true)
    setTimeout(() => {
      setA({ token: t, user: u })
      setPage('dashboard')
      setSplashing(false)
    }, 2000)
  }, [])

  const logout = useCallback(() => {
    setLogoutUser(auth.user)
    setLoggingOut(true)
    setTimeout(() => {
      clearAuth()
      setA({ token: null, user: null })
      setPage('dashboard')
      setLoggingOut(false)
    }, 1800)
  }, [auth.user])

  // Show login splash
  if (splashing) return <SplashScreen user={splashUser}/>
  // Show logout splash
  if (loggingOut) return <LogoutScreen user={logoutUser}/>

  if (!auth.token || !auth.user)
    return ap==='login' ? <LoginPage onLogin={login} onSwitch={()=>setAp('register')}/>
                        : <RegisterPage onLogin={login} onSwitch={()=>setAp('login')}/>

  const nav = auth.user.role==='admin' ? NAV_ADMIN : NAV_USER
  const cur = nav.find(n=>n.key===page) ? page : 'dashboard'

  return (
    <div className="admin-layout">
      <Sidebar page={cur} setPage={setPage} nav={nav} user={auth.user} hp={hp} onLogout={logout}/>
      <div className="main-content">
        <Topbar page={cur} nav={nav} user={auth.user}/>
        <div className="page-body fade-in" key={cur}>
          {/* ADMIN */}
          {cur==='dashboard'     && auth.user.role==='admin' && <AdminDash   api={API} t={auth.token}/>}
          {cur==='issue'                                     && <IssueCert   api={API} t={auth.token} user={auth.user}/>}
          {cur==='certificates'                              && <AllCerts    api={API} t={auth.token}/>}
          {cur==='verifications'                             && <AllVerifs   api={API} t={auth.token}/>}
          {cur==='users'                                     && <UsersList   api={API} t={auth.token}/>}
          {/* USER */}
          {cur==='dashboard'     && auth.user.role==='user'  && <UserDash    api={API} t={auth.token} user={auth.user}/>}
          {cur==='verify'                                    && <VerifyPage  api={API} t={auth.token}/>}
          {cur==='history'                                   && <HistoryPage api={API} t={auth.token}/>}
          {cur==='profile'                                   && <ProfilePage api={API} t={auth.token} user={auth.user}/>}
        </div>
      </div>
    </div>
  )
}

/* ─── Auth: Login ────────────────────────────────────────────────────────── */
function BlockchainAnimation() {
  return (
    <svg className="blockchain-svg" viewBox="0 0 480 520" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* ── Grid dots background ── */}
      {Array.from({length:6}).map((_,r)=>Array.from({length:5}).map((_,c)=>(
        <circle key={`d-${r}-${c}`} cx={48+c*96} cy={48+r*88} r="2" fill="rgba(255,255,255,0.12)" className="grid-dot"/>
      )))}

      {/* ── Animated connecting lines ── */}
      <line x1="130" y1="130" x2="240" y2="180" stroke="rgba(147,197,253,0.4)" strokeWidth="1.5" strokeDasharray="6 4" className="chain-line l1"/>
      <line x1="240" y1="180" x2="350" y2="130" stroke="rgba(147,197,253,0.4)" strokeWidth="1.5" strokeDasharray="6 4" className="chain-line l2"/>
      <line x1="130" y1="300" x2="240" y2="360" stroke="rgba(147,197,253,0.4)" strokeWidth="1.5" strokeDasharray="6 4" className="chain-line l3"/>
      <line x1="240" y1="360" x2="350" y2="300" stroke="rgba(147,197,253,0.4)" strokeWidth="1.5" strokeDasharray="6 4" className="chain-line l4"/>
      <line x1="240" y1="180" x2="240" y2="360" stroke="rgba(147,197,253,0.3)" strokeWidth="1.5" strokeDasharray="6 4" className="chain-line l5"/>
      <line x1="130" y1="130" x2="130" y2="300" stroke="rgba(147,197,253,0.3)" strokeWidth="1.5" strokeDasharray="6 4" className="chain-line l6"/>
      <line x1="350" y1="130" x2="350" y2="300" stroke="rgba(147,197,253,0.3)" strokeWidth="1.5" strokeDasharray="6 4" className="chain-line l7"/>

      {/* ── Small satellite nodes ── */}
      <circle cx="80" cy="220" r="10" fill="rgba(99,179,237,0.25)" stroke="rgba(147,197,253,0.6)" strokeWidth="1.5" className="node-satellite s1"/>
      <circle cx="400" cy="220" r="10" fill="rgba(99,179,237,0.25)" stroke="rgba(147,197,253,0.6)" strokeWidth="1.5" className="node-satellite s2"/>
      <circle cx="240" cy="80" r="10" fill="rgba(99,179,237,0.25)" stroke="rgba(147,197,253,0.6)" strokeWidth="1.5" className="node-satellite s3"/>
      <circle cx="240" cy="460" r="10" fill="rgba(99,179,237,0.25)" stroke="rgba(147,197,253,0.6)" strokeWidth="1.5" className="node-satellite s4"/>
      <line x1="80" y1="220" x2="130" y2="215" stroke="rgba(147,197,253,0.25)" strokeWidth="1"/>
      <line x1="400" y1="220" x2="350" y2="215" stroke="rgba(147,197,253,0.25)" strokeWidth="1"/>
      <line x1="240" y1="80" x2="240" y2="178" stroke="rgba(147,197,253,0.25)" strokeWidth="1"/>
      <line x1="240" y1="460" x2="240" y2="362" stroke="rgba(147,197,253,0.25)" strokeWidth="1"/>

      {/* ── Block Left-Top ── */}
      <g className="block b1">
        <rect x="86" y="96" width="88" height="68" rx="14" fill="rgba(255,255,255,0.08)" stroke="rgba(147,197,253,0.5)" strokeWidth="2"/>
        <rect x="100" y="111" width="18" height="14" rx="4" fill="rgba(147,197,253,0.4)"/>
        <rect x="126" y="111" width="36" height="6" rx="3" fill="rgba(255,255,255,0.25)"/>
        <rect x="126" y="122" width="24" height="6" rx="3" fill="rgba(255,255,255,0.15)"/>
        <rect x="100" y="133" width="60" height="4" rx="2" fill="rgba(255,255,255,0.1)"/>
        <text x="130" y="152" textAnchor="middle" fill="rgba(147,197,253,0.7)" fontSize="8" fontFamily="monospace">#001</text>
      </g>

      {/* ── Block Center ── */}
      <g className="block b2">
        <rect x="196" y="148" width="88" height="68" rx="14" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5"/>
        <rect x="210" y="163" width="18" height="14" rx="4" fill="rgba(255,255,255,0.5)"/>
        <rect x="236" y="163" width="36" height="6" rx="3" fill="rgba(255,255,255,0.4)"/>
        <rect x="236" y="174" width="24" height="6" rx="3" fill="rgba(255,255,255,0.25)"/>
        <rect x="210" y="186" width="60" height="4" rx="2" fill="rgba(255,255,255,0.15)"/>
        <text x="240" y="205" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="8" fontFamily="monospace">#002</text>
        {/* verified check */}
        <circle cx="272" cy="152" r="8" fill="#22c55e" opacity="0.9"/>
        <polyline points="268,152 271,155.5 277,148.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      </g>

      {/* ── Block Right-Top ── */}
      <g className="block b3">
        <rect x="306" y="96" width="88" height="68" rx="14" fill="rgba(255,255,255,0.08)" stroke="rgba(147,197,253,0.5)" strokeWidth="2"/>
        <rect x="320" y="111" width="18" height="14" rx="4" fill="rgba(147,197,253,0.4)"/>
        <rect x="346" y="111" width="36" height="6" rx="3" fill="rgba(255,255,255,0.25)"/>
        <rect x="346" y="122" width="24" height="6" rx="3" fill="rgba(255,255,255,0.15)"/>
        <rect x="320" y="133" width="60" height="4" rx="2" fill="rgba(255,255,255,0.1)"/>
        <text x="350" y="152" textAnchor="middle" fill="rgba(147,197,253,0.7)" fontSize="8" fontFamily="monospace">#003</text>
      </g>

      {/* ── Block Left-Bottom ── */}
      <g className="block b4">
        <rect x="86" y="268" width="88" height="68" rx="14" fill="rgba(255,255,255,0.08)" stroke="rgba(147,197,253,0.5)" strokeWidth="2"/>
        <rect x="100" y="283" width="18" height="14" rx="4" fill="rgba(147,197,253,0.4)"/>
        <rect x="126" y="283" width="36" height="6" rx="3" fill="rgba(255,255,255,0.25)"/>
        <rect x="126" y="294" width="24" height="6" rx="3" fill="rgba(255,255,255,0.15)"/>
        <rect x="100" y="305" width="60" height="4" rx="2" fill="rgba(255,255,255,0.1)"/>
        <text x="130" y="322" textAnchor="middle" fill="rgba(147,197,253,0.7)" fontSize="8" fontFamily="monospace">#004</text>
      </g>

      {/* ── Block Center-Bottom ── */}
      <g className="block b5">
        <rect x="196" y="328" width="88" height="68" rx="14" fill="rgba(255,255,255,0.1)" stroke="rgba(147,197,253,0.6)" strokeWidth="2"/>
        <rect x="210" y="343" width="18" height="14" rx="4" fill="rgba(147,197,253,0.5)"/>
        <rect x="236" y="343" width="36" height="6" rx="3" fill="rgba(255,255,255,0.35)"/>
        <rect x="236" y="354" width="24" height="6" rx="3" fill="rgba(255,255,255,0.2)"/>
        <rect x="210" y="366" width="60" height="4" rx="2" fill="rgba(255,255,255,0.12)"/>
        <text x="240" y="385" textAnchor="middle" fill="rgba(147,197,253,0.8)" fontSize="8" fontFamily="monospace">#005</text>
      </g>

      {/* ── Block Right-Bottom ── */}
      <g className="block b6">
        <rect x="306" y="268" width="88" height="68" rx="14" fill="rgba(255,255,255,0.08)" stroke="rgba(147,197,253,0.5)" strokeWidth="2"/>
        <rect x="320" y="283" width="18" height="14" rx="4" fill="rgba(147,197,253,0.4)"/>
        <rect x="346" y="283" width="36" height="6" rx="3" fill="rgba(255,255,255,0.25)"/>
        <rect x="346" y="294" width="24" height="6" rx="3" fill="rgba(255,255,255,0.15)"/>
        <rect x="320" y="305" width="60" height="4" rx="2" fill="rgba(255,255,255,0.1)"/>
        <text x="350" y="322" textAnchor="middle" fill="rgba(147,197,253,0.7)" fontSize="8" fontFamily="monospace">#006</text>
      </g>

      {/* ── Floating particles ── */}
      <circle cx="60" cy="100" r="4" fill="rgba(147,197,253,0.5)" className="particle p1"/>
      <circle cx="420" cy="160" r="3" fill="rgba(167,243,208,0.6)" className="particle p2"/>
      <circle cx="55" cy="380" r="5" fill="rgba(147,197,253,0.4)" className="particle p3"/>
      <circle cx="430" cy="340" r="3" fill="rgba(255,255,255,0.3)" className="particle p4"/>
      <circle cx="190" cy="60" r="3" fill="rgba(167,243,208,0.5)" className="particle p5"/>
      <circle cx="300" cy="440" r="4" fill="rgba(147,197,253,0.4)" className="particle p6"/>
      <circle cx="440" cy="80" r="2" fill="rgba(255,255,255,0.4)" className="particle p7"/>
      <circle cx="40" cy="260" r="3" fill="rgba(167,243,208,0.4)" className="particle p8"/>

      {/* ── Data packets traveling on lines ── */}
      <circle r="4" fill="#93c5fd" opacity="0.9" className="packet pkt1">
        <animateMotion dur="3s" repeatCount="indefinite" path="M130,130 L240,180"/>
      </circle>
      <circle r="4" fill="#6ee7b7" opacity="0.9" className="packet pkt2">
        <animateMotion dur="3.5s" repeatCount="indefinite" begin="1s" path="M240,180 L350,130"/>
      </circle>
      <circle r="3" fill="#93c5fd" opacity="0.8" className="packet pkt3">
        <animateMotion dur="4s" repeatCount="indefinite" begin="0.5s" path="M130,300 L240,360"/>
      </circle>
      <circle r="3" fill="#6ee7b7" opacity="0.8" className="packet pkt4">
        <animateMotion dur="3s" repeatCount="indefinite" begin="2s" path="M240,180 L240,360"/>
      </circle>
    </svg>
  )
}

function LoginPage({onLogin, onSwitch}) {
  const [f, setF]       = useState({email:'',password:''})
  const [loading, setL] = useState(false)
  const [err, setErr]   = useState('')
  const handle = e => setF(p=>({...p,[e.target.name]:e.target.value}))

  const submit = async e => {
    e.preventDefault(); setL(true); setErr('')
    try {
      const r = await fetch(`${API}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(f)})
      const d = await r.json()
      if (!r.ok) { setErr(d.error||'Email atau password salah'); return }
      onLogin(d.token, d.user)
    } catch { setErr('Tidak dapat terhubung ke server') } finally { setL(false) }
  }

  return (
    <div className="auth-split">
      {/* ── LEFT PANEL: Blockchain Animation ── */}
      <div className="auth-left-panel">
        <div className="auth-left-content">
          <div className="auth-left-brand">
            <div className="auth-left-icon"><I n="chain" s={28}/></div>
            <div>
              <div className="auth-left-title">CertyChain AI</div>
              <div className="auth-left-sub">Appskep Indonesia</div>
            </div>
          </div>

          <div className="auth-left-anim">
            <BlockchainAnimation/>
          </div>

          <div className="auth-left-tagline" style={{marginTop: '0.75rem', marginBottom: '1.25rem', lineHeight: '1.6', padding: '0 1rem'}}>
            <span style={{fontSize: '0.95rem', opacity: 0.9}}>Sistem Verifikasi Sertifikat Digital</span><br/>
            <strong style={{fontSize: '1rem', color: '#ffffff', letterSpacing: '0.01em'}}>Berbasis Blockchain Menggunakan Algoritma Naive Bayes dan AI Detection</strong>
          </div>

          <div className="auth-left-features">
            {[
              {icon:'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', text:'Terenkripsi SHA-256'},
              {icon:'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71', text:'Tercatat di Blockchain'},
              {icon:'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', text:'Deteksi Penipuan AI'},
            ].map((f,i)=>(
              <div key={i} className="auth-left-feat" style={{animationDelay:`${i*0.15}s`}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(191,219,254,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d={f.icon}/></svg>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Login Form ── */}
      <div className="auth-right-panel">
        <div className="auth-card">
          <div className="auth-logo"><I n="chain" s={22}/></div>
          <h1 className="auth-title">Selamat Datang</h1>
          <p className="auth-subtitle">Masuk ke sistem verifikasi sertifikat Appskep Indonesia</p>

          <form onSubmit={submit} style={{marginTop:'1.5rem'}}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" name="email" type="email" value={f.email}
                onChange={handle} placeholder="Masukkan email Anda" required autoFocus/>
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" name="password" type="password" value={f.password}
                onChange={handle} placeholder="••••••••••" required/>
            </div>
            {err && <div className="alert alert-error" style={{marginBottom:'1rem'}}>{err}</div>}
            <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{width:'100%'}}>
              {loading ? <><span className="spinner"/> Masuk...</> : 'Masuk'}
            </button>
          </form>

          <p style={{marginTop:'1.5rem',textAlign:'center',fontSize:'0.8rem',color:'var(--text-muted)'}}>
            Belum punya akun? <span onClick={onSwitch} style={{color:'var(--blue-600)',cursor:'pointer',fontWeight:600}}>Daftar</span>
          </p>
        </div>
      </div>
    </div>
  )
}



/* ─── Auth: Register ─────────────────────────────────────────────────────── */
function RegisterPage({onLogin, onSwitch}) {
  const [f, setF]     = useState({name:'',email:'',password:''})
  const [loading, setL] = useState(false)
  const [err, setErr] = useState('')
  const handle = e => setF(p=>({...p,[e.target.name]:e.target.value}))

  const submit = async e => {
    e.preventDefault(); setL(true); setErr('')
    try {
      const r = await fetch(`${API}/auth/register`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...f,role:'user'})})
      const d = await r.json()
      if (!r.ok) { setErr(d.error||'Registration failed'); return }
      onLogin(d.token, d.user)
    } catch { setErr('Unable to connect to server') } finally { setL(false) }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg"/>
      <div className="auth-card">
        <div className="auth-logo"><I n="profile" s={22}/></div>
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Register to start verifying certificates</p>
        <div className="auth-context-box user" style={{marginBottom:'1.25rem'}}>
          You will be registered as a <strong>User</strong>. You can verify certificates and view your verification history.
        </div>
        <form onSubmit={submit}>
          <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" name="name" value={f.name} onChange={handle} placeholder="Your full name" required autoFocus/></div>
          <div className="form-group"><label className="form-label">Email Address</label><input className="form-input" name="email" type="email" value={f.email} onChange={handle} placeholder="your@email.com" required/></div>
          <div className="form-group"><label className="form-label">Password <span style={{color:'var(--text-muted)',fontWeight:400}}>(min. 6 characters)</span></label><input className="form-input" name="password" type="password" value={f.password} onChange={handle} placeholder="••••••••••" required minLength={6}/></div>
          {err && <div className="alert alert-error" style={{marginBottom:'1rem'}}>{err}</div>}
          <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{width:'100%'}}>
            {loading?<><span className="spinner"/> Creating account...</>:'Create Account'}
          </button>
        </form>
        <p style={{marginTop:'1.5rem',textAlign:'center',fontSize:'0.8rem',color:'var(--text-muted)'}}>Already have an account? <span onClick={onSwitch} style={{color:'var(--blue)',cursor:'pointer',fontWeight:600}}>Sign in</span></p>
      </div>
    </div>
  )
}

/* ─── Sidebar ────────────────────────────────────────────────────────────── */
function Sidebar({page, setPage, nav, user, hp, onLogout}) {
  const secs = [...new Set(nav.map(n=>n.sec))]
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">
          <div className="sidebar-logo-icon"><I n="chain" s={16}/></div>
          <span className="sidebar-logo-text">CertyChain</span>
        </div>
        <div className="sidebar-logo-sub">Appskep Indonesia</div>
      </div>
      <div className={`sidebar-user role-${user.role}`}>
        <div className="sidebar-user-avatar">{user.name?.charAt(0).toUpperCase()}</div>
        <div style={{flex:1,minWidth:0}}>
          <div className="sidebar-user-name">{user.name}</div>
          <div className="sidebar-user-role">{user.role==='admin'?'Administrator':'User'}</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {secs.map(s=>(
          <div key={s}>
            <div className="nav-section-label">{s}</div>
            {nav.filter(n=>n.sec===s).map(n=>(
              <div key={n.key} className={`nav-item ${page===n.key?'active':''}`} onClick={()=>setPage(n.key)}>
                <span className="nav-icon"><I n={n.ico} s={16}/></span>
                {n.label}
              </div>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-footer-label">System Status</div>
        <SRow label="Database"   ok={hp?.database==='connected'}/>
        <SRow label="Blockchain" ok={hp?.blockchain===true}/>
        <SRow label="AI Engine"  ok={hp?.ai_service==='online'} label2={hp?.ai_service==='online'?'Online':'Offline'}/>
        <button className="btn-logout" onClick={onLogout}><I n="logout" s={13}/> Sign Out</button>
      </div>
    </aside>
  )
}
const SRow = ({label,ok,label2}) => (
  <div className="service-status-row">
    <div className={`status-dot ${ok?'ok':'error'}`}/>
    <span style={{flex:1}}>{label}</span>
    <span style={{color:ok?'var(--green)':'var(--red)',fontSize:'0.68rem',fontWeight:600}}>{label2||(ok?'Online':'Offline')}</span>
  </div>
)

/* ─── Topbar ─────────────────────────────────────────────────────────────── */
function Topbar({page, nav, user}) {
  const cur = nav.find(n=>n.key===page)
  return (
    <div className="topbar">
      <div className="topbar-breadcrumb">
        <span className="breadcrumb-item">CertyChain</span>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-item active">{cur?.label}</span>
      </div>
      <div className="topbar-right">
        <span className={`topbar-role-badge role-${user.role}`}>{user.role==='admin'?'Administrator':'User'}</span>
        <span className="topbar-badge">Appskep Indonesia · Blockchain · AI</span>
        <span className="topbar-date">{new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</span>
      </div>
    </div>
  )
}

/* ─── Admin: Dashboard ───────────────────────────────────────────────────── */
function AdminDash({api, t}) {
  const [stats, setSt] = useState(null)
  const [certs, setCerts] = useState([])
  const [verifs, setVerifs] = useState([])

  useEffect(()=>{
    fetch(`${api}/admin/stats`,{headers:H(t)}).then(r=>r.json()).then(setSt)
    fetch(`${api}/admin/certificates?limit=5`,{headers:H(t)}).then(r=>r.json()).then(d=>setCerts(d.certificates||[]))
    fetch(`${api}/admin/verifications`,{headers:H(t)}).then(r=>r.json()).then(d=>setVerifs((d.verifications||[]).slice(0,5)))
  },[api,t])

  return (
    <div>
      <div className="page-header">
        <div className="page-header-eyebrow">Administrator</div>
        <h1 className="page-header-title">System Dashboard</h1>
        <p className="page-header-sub">Real-time overview of certificate issuance, verifications, and blockchain anchoring.</p>
      </div>
      <div className="stats-grid">
        <SC ico="cert"   cls="blue"   label="Certificates Issued" val={stats?.total_certificates??'—'} sub={`${stats?.certs_this_week??0} this week`}/>
        <SC ico="chain"  cls="indigo" label="Blockchain Anchored" val={stats?.blockchain_anchored??'—'} sub="On Ganache network"/>
        <SC ico="users"  cls="green"  label="Registered Users"    val={stats?.total_users??'—'} sub="Active accounts"/>
        <SC ico="verify" cls="purple" label="Total Verifications" val={stats?.total_verifications??'—'} sub={`${stats?.genuine_verifications??0} genuine`}/>
      </div>
      <div className="grid-2">
        <div>
          <div className="section-title">Recent Certificates</div>
          <div className="table-wrapper">
            {certs.length===0?<Blank text="No certificates issued yet."/>:
            <table><thead><tr><th>No.</th><th>Recipient</th><th>Title</th><th>Blockchain</th><th>Date</th></tr></thead>
            <tbody>{certs.map(c=>(
              <tr key={c.id}>
                <td><code style={{fontSize:'0.7rem',color:'var(--blue)'}}>{c.certificate_number}</code></td>
                <td style={{fontWeight:600}}>{c.recipient_name}</td>
                <td style={{color:'var(--text-secondary)',fontSize:'0.8rem'}}>{c.title}</td>
                <td><Chip ok={c.blockchain_anchor} yes="On-Chain" no="Pending"/></td>
                <td style={{color:'var(--text-muted)',fontSize:'0.75rem'}}>{fmt(c.created_at)}</td>
              </tr>
            ))}</tbody></table>}
          </div>
        </div>
        <div>
          <div className="section-title">Recent Verifications</div>
          <div className="table-wrapper">
            {verifs.length===0?<Blank text="No verifications yet."/>:
            <table><thead><tr><th>User</th><th>Result</th><th>AI Score</th><th>Date</th></tr></thead>
            <tbody>{verifs.map(v=>(
              <tr key={v.id}>
                <td style={{fontSize:'0.8rem'}}>{v.user?.name||'—'}</td>
                <td><Verdict ok={v.is_genuine}/></td>
                <td style={{fontWeight:600,color:v.is_genuine?'var(--green)':'var(--red)'}}>{(v.ai_score*100).toFixed(0)}%</td>
                <td style={{color:'var(--text-muted)',fontSize:'0.75rem'}}>{fmtDt(v.verified_at)}</td>
              </tr>
            ))}</tbody></table>}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Admin: Issue Certificate ───────────────────────────────────────────── */
function IssueCert({api, t}) {
  const empty = {certificate_number:'',recipient_name:'',recipient_email:'',title:'',institution:'',issue_date:'',content:''}
  const [mode, setMode]   = useState('manual') // 'manual' | 'file'
  const [f, setF]         = useState(empty)
  const [file, setFile]   = useState(null)
  const [dragOver, setDrag] = useState(false)
  const [loading, setL]   = useState(false)
  const [result, setR]    = useState(null)
  const [err, setErr]     = useState('')
  const fileRef           = useRef()
  const h = e => setF(p => ({...p, [e.target.name]: e.target.value}))

  const switchMode = m => { setMode(m); setR(null); setErr(''); setFile(null); setF(empty) }

  const onDrop = e => {
    e.preventDefault(); setDrag(false)
    const picked = e.dataTransfer.files[0]
    if (picked) setFile(picked)
  }

  const submit = async e => {
    e.preventDefault(); setL(true); setErr(''); setR(null)
    try {
      let r, d
      if (mode === 'file') {
        if (!file) { setErr('Please select a certificate file'); setL(false); return }
        const form = new FormData()
        Object.entries(f).filter(([k,v]) => k !== 'content' && v).forEach(([k,v]) => form.append(k, v))
        form.append('file', file)
        r = await fetch(`${api}/admin/certificates/upload`, {
          method: 'POST', headers: { Authorization: `Bearer ${t}` }, body: form
        })
      } else {
        r = await fetch(`${api}/admin/certificates`, {method:'POST', headers: H(t), body: JSON.stringify(f)})
      }
      d = await r.json()
      if (!r.ok) { setErr(d.error || 'Failed to issue'); return }
      setR(d); setF(empty); setFile(null)
    } catch { setErr('Unable to connect to server') } finally { setL(false) }
  }

  const fmtBytes = b => b < 1024 ? b + ' B' : (b/1024).toFixed(1) + ' KB'

  return (
    <div>
      <div className="page-header">
        <div className="page-header-eyebrow">Certificate Management</div>
        <h1 className="page-header-title">Issue Certificate</h1>
        <p className="page-header-sub">Register a new certificate. It will be hashed and anchored to the blockchain.</p>
      </div>
      <div className="grid-2" style={{alignItems:'start'}}>
        <div className="card">
          {/* Mode tabs */}
          <div style={{display:'flex',gap:'0.5rem',marginBottom:'1.5rem'}}>
            {[['manual','✏️  Manual Entry'],['file','📄  Upload File']].map(([v,l]) => (
              <button key={v} type="button" onClick={() => switchMode(v)}
                style={{flex:1,padding:'0.55rem',borderRadius:'var(--r-md)',fontSize:'0.78rem',fontWeight:600,
                  cursor:'pointer',fontFamily:'inherit',transition:'var(--t-fast)',
                  background: mode===v ? 'var(--blue-glow)' : 'transparent',
                  border: mode===v ? '1px solid rgba(56,189,248,0.3)' : '1px solid var(--border)',
                  color: mode===v ? 'var(--blue)' : 'var(--text-muted)'}}>
                {l}
              </button>
            ))}
          </div>
          <div className="section-title">{mode==='manual' ? 'Certificate Data' : 'Certificate Metadata + File'}</div>
          <form onSubmit={submit}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 1rem'}}>
              <div className="form-group"><label className="form-label">Certificate Number <Req/></label><input className="form-input" name="certificate_number" value={f.certificate_number} onChange={h} placeholder="e.g. CERT-2024-001" required/></div>
              <div className="form-group"><label className="form-label">Issue Date <Req/></label><input className="form-input" name="issue_date" type="date" value={f.issue_date} onChange={h} required/></div>
            </div>
            <div className="form-group"><label className="form-label">Recipient Name <Req/></label><input className="form-input" name="recipient_name" value={f.recipient_name} onChange={h} placeholder="Full name of certificate recipient" required/></div>
            <div className="form-group"><label className="form-label">Recipient Email</label><input className="form-input" name="recipient_email" type="email" value={f.recipient_email} onChange={h} placeholder="recipient@email.com"/></div>
            <div className="form-group"><label className="form-label">Certificate Title <Req/></label><input className="form-input" name="title" value={f.title} onChange={h} placeholder="e.g. Bachelor of Computer Science" required/></div>
            <div className="form-group"><label className="form-label">Institution <Req/></label><input className="form-input" name="institution" value={f.institution} onChange={h} placeholder="e.g. Universitas Indonesia" required/></div>

            {mode === 'manual' ? (
              <div className="form-group">
                <label className="form-label">Certificate Content <Req/> <span style={{color:'var(--text-muted)',fontWeight:400,fontSize:'0.72rem'}}>(used for SHA-256 hash)</span></label>
                <textarea className="form-textarea" name="content" value={f.content} onChange={h} placeholder="Enter the full certificate text content..." style={{minHeight:120}} required/>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Certificate File <Req/></label>
                <div onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={onDrop}
                  onClick={()=>fileRef.current?.click()}
                  style={{border:`2px dashed ${dragOver?'var(--blue)':file?'var(--green)':'var(--border)'}`,borderRadius:'var(--r-lg)',
                    padding:'1.5rem 1rem',textAlign:'center',cursor:'pointer',transition:'var(--t-fast)',
                    background:dragOver?'var(--blue-glow)':file?'rgba(16,185,129,0.04)':'transparent',marginBottom:'0.5rem'}}>
                  {file ? (
                    <div><div style={{fontSize:'1.5rem',marginBottom:'0.35rem'}}>📄</div>
                    <div style={{fontWeight:700,color:'var(--green)',fontSize:'0.85rem'}}>{file.name}</div>
                    <div style={{fontSize:'0.73rem',color:'var(--text-muted)'}}>{fmtBytes(file.size)}</div>
                    <button type="button" onClick={e=>{e.stopPropagation();setFile(null)}} style={{marginTop:'0.5rem',fontSize:'0.72rem',color:'var(--red)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>✕ Remove</button>
                    </div>
                  ) : (
                    <div><div style={{fontSize:'1.5rem',marginBottom:'0.35rem'}}>☁️</div>
                    <div style={{fontWeight:600,color:'var(--text-secondary)',fontSize:'0.82rem'}}>{dragOver?'Drop file here':'Drag & drop or click to browse'}</div>
                    <div style={{fontSize:'0.71rem',color:'var(--text-muted)'}}>Supports documents (.txt/.pdf) or images (.jpg/.png) — binary hash becomes the source</div>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept=".txt,.pdf,.doc,.docx,.jpg,.jpeg,.png" style={{display:'none'}} onChange={e=>{if(e.target.files[0])setFile(e.target.files[0])}}/>
              </div>
            )}

            {err && <div className="alert alert-error" style={{marginBottom:'1rem'}}>{err}</div>}
            <button className="btn btn-primary btn-lg" type="submit" disabled={loading||(mode==='file'&&!file)} style={{width:'100%'}}>
              {loading ? <><span className="spinner"/> Processing...</> : 'Issue Certificate'}
            </button>
          </form>
        </div>
        <div>
          {result ? (
            <div className="result-panel" style={{marginTop:0}}>
              <div className="result-header">
                <span style={{fontWeight:700}}>Certificate Issued ✓</span>
                <Chip ok={result.blockchain_anchored} yes="Blockchain Anchored" no="DB Only"/>
              </div>
              <div className="result-body">
                <div className="result-grid">
                  <Fld label="Certificate No." value={result.certificate?.certificate_number}/>
                  <Fld label="Recipient"        value={result.certificate?.recipient_name}/>
                  <Fld label="Title"            value={result.certificate?.title}/>
                  <Fld label="Institution"      value={result.certificate?.institution}/>
                </div>
                {result.source_file && <div style={{fontSize:'0.75rem',color:'var(--text-muted)',marginBottom:'0.75rem'}}>📄 Source: {result.source_file}</div>}
                <div className="blockchain-proof">
                  <div className="blockchain-proof-title">SHA-256 Hash</div>
                  <div className="mono" style={{fontSize:'0.65rem',wordBreak:'break-all'}}>{result.certificate?.hash}</div>
                  {result.tx_hash && <><div style={{fontSize:'0.65rem',color:'var(--text-muted)',marginTop:'0.5rem',letterSpacing:'0.1em',textTransform:'uppercase'}}>Tx Hash</div><div className="mono" style={{color:'var(--blue)',fontSize:'0.65rem'}}>{result.tx_hash}</div></>}
                  {!result.blockchain_anchored && <div style={{fontSize:'0.75rem',color:'var(--amber)',marginTop:'0.75rem'}}>Blockchain offline — saved to database only.</div>}
                </div>
                <a href={`${api}/admin/certificates/${result.certificate?.id}/download`}
                  style={{display:'flex',alignItems:'center',gap:'0.4rem',marginTop:'1rem',fontSize:'0.8rem',
                    color:'var(--blue)',textDecoration:'none',cursor:'pointer'}}
                  onClick={e => {
                    e.preventDefault()
                    const a = document.createElement('a')
                    a.href = `http://localhost:8080/api/admin/certificates/${result.certificate?.id}/download`
                    a.click()
                  }}>
                  ⬇ Download Certificate (.txt)
                </a>
              </div>
            </div>
          ) : (
            <div className="card" style={{textAlign:'center',padding:'2.5rem 2rem'}}>
              <div style={{width:48,height:48,borderRadius:'var(--r-lg)',background:'var(--blue-glow)',border:'1px solid rgba(56,189,248,0.15)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 1.25rem'}}><I n="chain" s={22}/></div>
              <div style={{fontWeight:700,marginBottom:'0.75rem'}}>Automated Pipeline</div>
              <div style={{color:'var(--text-secondary)',fontSize:'0.8rem',lineHeight:1.8,textAlign:'left'}}>
                <b>1.</b> SHA-256 hash of content (or file)<br/>
                <b>2.</b> Save to MySQL database<br/>
                <b>3.</b> Anchor hash on Hardhat blockchain<br/>
                <b>4.</b> Download .txt file for distribution
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Admin: All Certificates ────────────────────────────────────────────── */
function AllCerts({api, t}) {
  const [certs, setCerts] = useState([])
  const [loading, setL]   = useState(true)
  const [search, setSrc]  = useState('')

  useEffect(()=>{ fetch(`${api}/admin/certificates?limit=200`,{headers:H(t)}).then(r=>r.json()).then(d=>{setCerts(d.certificates||[]);setL(false)}) },[api,t])

  const download = (cert) => {
    const a = document.createElement('a')
    a.href = `http://localhost:8080/api/admin/certificates/${cert.id}/download`
    a.download = `certificate_${cert.certificate_number}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const rows = certs.filter(c=>
    c.certificate_number?.toLowerCase().includes(search.toLowerCase())||
    c.recipient_name?.toLowerCase().includes(search.toLowerCase())||
    c.institution?.toLowerCase().includes(search.toLowerCase())||
    c.title?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="page-header">
        <div className="page-header-eyebrow">Certificate Management</div>
        <h1 className="page-header-title">All Certificates</h1>
        <p className="page-header-sub">Complete registry of all issued certificates.</p>
      </div>
      <div className="table-wrapper">
        <div className="table-header">
          <span className="table-title">{certs.length} Certificates</span>
          <input className="form-input" style={{width:280,padding:'0.4rem 0.75rem',fontSize:'0.8rem'}} placeholder="Search number, name, institution..." value={search} onChange={e=>setSrc(e.target.value)}/>
        </div>
        {loading?<div className="loading-overlay"><span className="spinner"/> Loading...</div>:
        rows.length===0?<Blank text="No certificates found."/>:
        <table>
          <thead><tr><th>No.</th><th>Recipient</th><th>Email</th><th>Title</th><th>Institution</th><th>Issue Date</th><th>Blockchain</th><th>Download</th></tr></thead>
          <tbody>{rows.map(c=>(
            <tr key={c.id}>
              <td><code style={{fontSize:'0.7rem',color:'var(--blue)'}}>{c.certificate_number}</code></td>
              <td style={{fontWeight:600}}>{c.recipient_name}</td>
              <td style={{color:'var(--text-muted)',fontSize:'0.78rem'}}>{c.recipient_email||'—'}</td>
              <td style={{fontSize:'0.82rem'}}>{c.title}</td>
              <td style={{fontSize:'0.82rem',color:'var(--text-secondary)'}}>{c.institution}</td>
              <td style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>{fmt(c.issue_date)}</td>
              <td><Chip ok={c.blockchain_anchor} yes="On-Chain" no="Pending"/></td>
              <td>
                <button onClick={()=>download(c)}
                  style={{background:'none',border:'1px solid var(--border)',borderRadius:'var(--r-sm)',
                    padding:'0.2rem 0.5rem',cursor:'pointer',fontSize:'0.72rem',color:'var(--blue)',
                    fontFamily:'inherit',transition:'var(--t-fast)'}}
                  title="Download certificate as .txt">
                  ⬇ .txt
                </button>
              </td>
            </tr>
          ))}</tbody>
        </table>}
      </div>
    </div>
  )
}

/* ─── Admin: All Verifications ───────────────────────────────────────────── */
function AllVerifs({api, t}) {
  const [data, setData] = useState([])
  const [loading, setL] = useState(true)
  useEffect(()=>{ fetch(`${api}/admin/verifications`,{headers:H(t)}).then(r=>r.json()).then(d=>{setData(d.verifications||[]);setL(false)}) },[api,t])
  return (
    <div>
      <div className="page-header">
        <div className="page-header-eyebrow">Verification Activity</div>
        <h1 className="page-header-title">All Verifications</h1>
        <p className="page-header-sub">Every verification request submitted by users.</p>
      </div>
      <div className="table-wrapper">
        <div className="table-header"><span className="table-title">{data.length} Records</span></div>
        {loading?<div className="loading-overlay"><span className="spinner"/> Loading...</div>:
        data.length===0?<Blank text="No verification records yet."/>:
        <table>
          <thead><tr><th>User</th><th>Result</th><th>NB Score</th><th>CNN Score</th><th>AI Score</th><th>Certificate</th><th>Date</th></tr></thead>
          <tbody>{data.map(v=>(
            <tr key={v.id}>
              <td><div style={{fontWeight:600,fontSize:'0.82rem'}}>{v.user?.name||'—'}</div><div style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>{v.user?.email}</div></td>
              <td><Verdict ok={v.is_genuine}/></td>
              <td style={{fontWeight:600,fontSize:'0.8rem'}}>{(v.naive_bayes_score*100).toFixed(1)}%</td>
              <td style={{fontWeight:600,fontSize:'0.8rem'}}>{(v.cnn_score*100).toFixed(1)}%</td>
              <td style={{fontWeight:700,color:v.is_genuine?'var(--green)':'var(--red)'}}>{(v.ai_score*100).toFixed(1)}%</td>
              <td style={{fontSize:'0.78rem',color:'var(--text-secondary)'}}>{v.certificate?.certificate_number||<span style={{color:'var(--text-muted)'}}>Not found</span>}</td>
              <td style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{fmtDt(v.verified_at)}</td>
            </tr>
          ))}</tbody>
        </table>}
      </div>
    </div>
  )
}

/* ─── Admin: Users ───────────────────────────────────────────────────────── */
function UsersList({api, t}) {
  const [data, setData] = useState([])
  const [loading, setL] = useState(true)
  useEffect(()=>{ fetch(`${api}/admin/users`,{headers:H(t)}).then(r=>r.json()).then(d=>{setData(d.users||[]);setL(false)}) },[api,t])
  return (
    <div>
      <div className="page-header">
        <div className="page-header-eyebrow">User Management</div>
        <h1 className="page-header-title">Registered Users</h1>
        <p className="page-header-sub">All user accounts registered in the system.</p>
      </div>
      <div className="table-wrapper">
        <div className="table-header"><span className="table-title">{data.length} Users</span></div>
        {loading?<div className="loading-overlay"><span className="spinner"/> Loading...</div>:
        data.length===0?<Blank text="No users registered yet."/>:
        <table>
          <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th>Registered</th></tr></thead>
          <tbody>{data.map((u,i)=>(
            <tr key={u.id}>
              <td style={{color:'var(--text-muted)'}}>{i+1}</td>
              <td style={{fontWeight:600}}>{u.name}</td>
              <td style={{color:'var(--text-secondary)',fontSize:'0.82rem'}}>{u.email}</td>
              <td><span className="badge badge-blockchain" style={{textTransform:'capitalize'}}>{u.role}</span></td>
              <td style={{color:'var(--text-muted)',fontSize:'0.78rem'}}>{fmt(u.created_at)}</td>
            </tr>
          ))}</tbody>
        </table>}
      </div>
    </div>
  )
}

/* ─── User: Dashboard ────────────────────────────────────────────────────── */
function UserDash({api, t, user}) {
  const [stats, setSt] = useState(null)
  const [recent, setRec] = useState([])
  useEffect(()=>{
    fetch(`${api}/user/profile`,{headers:H(t)}).then(r=>r.json()).then(d=>setSt(d.stats))
    fetch(`${api}/user/verifications`,{headers:H(t)}).then(r=>r.json()).then(d=>setRec((d.verifications||[]).slice(0,5)))
  },[api,t])
  return (
    <div>
      <div className="page-header">
        <div className="page-header-eyebrow">User Portal</div>
        <h1 className="page-header-title">Welcome, {user.name}</h1>
        <p className="page-header-sub">Verify certificate authenticity and track your verification history.</p>
      </div>
      <div className="stats-grid" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
        <SC ico="verify"  cls="blue"   label="Total Verifications" val={stats?.total_verifications??'—'} sub="All time"/>
        <SC ico="check"   cls="green"  label="Genuine Found"       val={stats?.genuine_found??'—'} sub="Verified authentic"/>
        <SC ico="x"       cls="red"    label="Fake Detected"       val={stats?.fake_detected??'—'} sub="Not in registry"/>
      </div>
      <div className="section-title">Recent Verifications</div>
      <div className="table-wrapper">
        {recent.length===0?<Blank text="No verification history yet. Try verifying a certificate!"/>:
        <table>
          <thead><tr><th>Result</th><th>Certificate</th><th>AI Score</th><th>Date</th></tr></thead>
          <tbody>{recent.map(v=>(
            <tr key={v.id}>
              <td><Verdict ok={v.is_genuine}/></td>
              <td style={{fontSize:'0.82rem',color:'var(--text-secondary)'}}>{v.certificate?.certificate_number||<span style={{color:'var(--text-muted)'}}>Not found in registry</span>}</td>
              <td style={{fontWeight:700,color:v.is_genuine?'var(--green)':'var(--red)'}}>{(v.ai_score*100).toFixed(1)}%</td>
              <td style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{fmtDt(v.verified_at)}</td>
            </tr>
          ))}</tbody>
        </table>}
      </div>
    </div>
  )
}

/* ─── User: Verify ───────────────────────────────────────────────────────── */
function VerifyPage({api, t}) {
  const [mode, setMode]     = useState('number') // 'number' | 'content' | 'file'
  const [certNum, setCN]    = useState('')
  const [content, setCt]    = useState('')
  const [file, setFile]     = useState(null)
  const [dragOver, setDrag] = useState(false)
  const [loading, setL]     = useState(false)
  const [result, setR]      = useState(null)
  const [err, setErr]       = useState('')
  const fileRef             = useRef()

  const resetFile = () => { setFile(null); if(fileRef.current) fileRef.current.value='' }

  const switchMode = v => { setMode(v); setR(null); setErr(''); resetFile() }

  // File drag-and-drop handlers
  const onDrop = e => {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }

  const submit = async e => {
    e.preventDefault(); setL(true); setErr(''); setR(null)
    try {
      let r, d
      if (mode === 'file') {
        if (!file) { setErr('Please select a file to upload'); setL(false); return }
        const form = new FormData()
        form.append('file', file)
        r = await fetch(`${api}/user/verify/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${t}` }, // no Content-Type — browser sets multipart boundary
          body: form
        })
      } else {
        const body = mode === 'number' ? {certificate_number: certNum} : {content}
        r = await fetch(`${api}/user/verify`, {method:'POST', headers: H(t), body: JSON.stringify(body)})
      }
      d = await r.json()
      if (!r.ok) { setErr(d.error || 'Verification failed'); return }
      setR(d)
    } catch { setErr('Unable to connect to server') } finally { setL(false) }
  }

  const MODES = [
    ['number', 'By Number'],
    ['content', 'By Content'],
    ['file', 'Upload File'],
  ]

  const fmtBytes = b => b < 1024 ? b + ' B' : b < 1048576 ? (b/1024).toFixed(1) + ' KB' : (b/1048576).toFixed(1) + ' MB'

  return (
    <div>
      <div className="page-header">
        <div className="page-header-eyebrow">Certificate Verification</div>
        <h1 className="page-header-title">Verify Certificate</h1>
        <p className="page-header-sub">Check whether a certificate is genuine or fake against the official blockchain registry.</p>
      </div>
      <div className="grid-2" style={{alignItems:'start'}}>
        <div className="card">
          {/* Mode switcher */}
          <div style={{display:'flex',gap:'0.5rem',marginBottom:'1.5rem'}}>
            {MODES.map(([v,l]) => (
              <button key={v} type="button" onClick={() => switchMode(v)}
                style={{flex:1,padding:'0.55rem',borderRadius:'var(--r-md)',fontSize:'0.75rem',fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'var(--t-fast)',
                  background: mode===v ? 'var(--blue-glow)' : 'transparent',
                  border: mode===v ? '1px solid rgba(56,189,248,0.3)' : '1px solid var(--border)',
                  color: mode===v ? 'var(--blue)' : 'var(--text-muted)'}}>
                {l}
              </button>
            ))}
          </div>

          <form onSubmit={submit}>
            {mode === 'number' && (
              <div className="form-group">
                <label className="form-label">Certificate Number</label>
                <input className="form-input" value={certNum} onChange={e => setCN(e.target.value)}
                  placeholder="e.g. CERT-2026-001" required style={{fontFamily:'JetBrains Mono,monospace'}}/>
                <div style={{fontSize:'0.72rem',color:'var(--text-muted)',marginTop:'0.35rem'}}>Enter the unique certificate number printed on the document.</div>
              </div>
            )}

            {mode === 'content' && (
              <div className="form-group">
                <label className="form-label">Certificate Content</label>
                <textarea className="form-textarea" value={content} onChange={e => setCt(e.target.value)}
                  placeholder="Paste the full text content of the certificate..." style={{minHeight:160}} required/>
                <div style={{fontSize:'0.72rem',color:'var(--text-muted)',marginTop:'0.35rem'}}>The content will be SHA-256 hashed and compared against the registry.</div>
              </div>
            )}

            {mode === 'file' && (
              <div className="form-group">
                <label className="form-label">Certificate File</label>
                {/* Drag & Drop Zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setDrag(true) }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={onDrop}
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragOver ? 'var(--blue)' : file ? 'var(--green)' : 'var(--border)'}`,
                    borderRadius: 'var(--r-lg)',
                    padding: '2rem 1rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'var(--t-fast)',
                    background: dragOver ? 'var(--blue-glow)' : file ? 'rgba(16,185,129,0.04)' : 'transparent',
                    marginBottom: '0.75rem',
                  }}>
                  {file ? (
                    <div>
                      <div style={{fontSize:'2rem',marginBottom:'0.5rem'}}>📄</div>
                      <div style={{fontWeight:700,color:'var(--green)',fontSize:'0.9rem',marginBottom:'0.25rem'}}>{file.name}</div>
                      <div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{fmtBytes(file.size)}</div>
                      <button type="button" onClick={e => { e.stopPropagation(); resetFile() }}
                        style={{marginTop:'0.75rem',fontSize:'0.72rem',color:'var(--red)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
                        ✕ Remove file
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div style={{fontSize:'2rem',marginBottom:'0.5rem'}}>☁️</div>
                      <div style={{fontWeight:600,color:'var(--text-secondary)',fontSize:'0.85rem',marginBottom:'0.25rem'}}>
                        {dragOver ? 'Drop the file here' : 'Drag & drop or click to browse'}
                      </div>
                      <div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>Supports .txt, .pdf, .jpg, .png — max 10MB</div>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept=".txt,.pdf,.doc,.docx,.rtf,.jpg,.jpeg,.png"
                  style={{display:'none'}}
                  onChange={e => { if(e.target.files[0]) setFile(e.target.files[0]) }}/>
                <div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>
                  💡 <b>Tip:</b> Upload a <b>.txt</b> or <b>.pdf</b> for blockchain hash match, or upload an image (<b>.png/.jpg</b>) for visual AI verification!
                </div>
              </div>
            )}

            {err && <div className="alert alert-error" style={{marginBottom:'1rem'}}>{err}</div>}
            <button className="btn btn-primary btn-lg" type="submit"
              disabled={loading || (mode==='file' && !file)}
              style={{width:'100%'}}>
              {loading ? <><span className="spinner"/> Verifying...</> : <><I n="verify" s={16}/> Verify Now</>}
            </button>
          </form>
        </div>

        {/* Result panel */}
        {result && (
          <div className="result-panel" style={{marginTop:0}}>
            <div className="result-header" style={{background: result.is_genuine ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)'}}>
              <div>
                <div style={{fontWeight:800,fontSize:'1.1rem',color:result.is_genuine?'var(--green)':'var(--red)'}}>
                  {result.is_genuine ? 'GENUINE' : 'NOT GENUINE'}
                </div>
                <div style={{fontSize:'0.78rem',color:'var(--text-muted)',marginTop:'0.2rem'}}>{result.message}</div>
                {result.filename && (
                  <div style={{fontSize:'0.72rem',color:'var(--text-muted)',marginTop:'0.15rem'}}>
                    📄 {result.filename} ({result.file_size ? fmtBytes(result.file_size) : ''})
                  </div>
                )}
              </div>
              <div style={{width:48,height:48,borderRadius:999,background:result.is_genuine?'var(--green-glow)':'rgba(239,68,68,0.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:result.is_genuine?'var(--green)':'var(--red)'}}>
                <I n={result.is_genuine?'check':'x'} s={22}/>
              </div>
            </div>
            <div className="result-body">
              {result.is_genuine && result.certificate && (
                <>
                  <div className="result-grid">
                    <Fld label="Certificate No." value={result.certificate.certificate_number}/>
                    <Fld label="Issue Date"       value={fmt(result.certificate.issue_date)}/>
                    <Fld label="Recipient"        value={result.certificate.recipient_name}/>
                    <Fld label="Institution"      value={result.certificate.institution}/>
                    <Fld label="Title"            value={result.certificate.title} style={{gridColumn:'1/-1'}}/>
                  </div>
                  <div className="divider"/>
                </>
              )}

              {/* Hash info */}
              {result.hash && (
                <div className="blockchain-proof" style={{marginBottom:'1rem'}}>
                  <div className="blockchain-proof-title">SHA-256 Hash</div>
                  <div className="mono" style={{fontSize:'0.65rem',wordBreak:'break-all'}}>{result.hash}</div>
                </div>
              )}

              <div className="section-title">AI Analysis</div>
              <Bar label="Naive Bayes" val={result.naive_bayes_score} cls="blue"/>
              <Bar label="CNN Model"   val={result.cnn_score}         cls="purple"/>
              <Bar label="Final Score" val={result.ai_score}          cls="green"/>
              <div className="blockchain-proof" style={{marginTop:'1rem'}}>
                <div className="blockchain-proof-title">Blockchain Status</div>
                <div style={{fontSize:'0.78rem',color:result.blockchain_verified?'var(--green-light)':'var(--amber)',marginBottom:'0.5rem'}}>
                  {result.blockchain_verified
                    ? 'Verified on-chain — immutable record confirmed.'
                    : result.is_genuine
                    ? 'Certificate in database but not yet anchored on-chain.'
                    : 'Not found in blockchain registry.'}
                </div>
              </div>
            </div>
          </div>
        )}

        {!result && !loading && (
          <div className="card" style={{textAlign:'center',padding:'2.5rem 2rem'}}>
            <div style={{width:48,height:48,borderRadius:'var(--r-lg)',background:'var(--blue-glow)',border:'1px solid rgba(56,189,248,0.15)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 1.25rem'}}><I n="shield" s={22}/></div>
            <div style={{fontWeight:700,marginBottom:'0.75rem'}}>3 Ways to Verify</div>
            <div style={{color:'var(--text-secondary)',fontSize:'0.8rem',lineHeight:1.9,textAlign:'left'}}>
              <b>By Number</b> — Enter the certificate number<br/>
              <b>By Content</b> — Paste the full text content<br/>
              <b>Upload File</b> — Upload the certificate file (.txt, .pdf)<br/>
              <br/>
              <span style={{color:'var(--text-muted)',fontSize:'0.75rem'}}>
                All methods compute a SHA-256 hash and compare against the blockchain-anchored registry.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


/* ─── User: History ──────────────────────────────────────────────────────── */
function HistoryPage({api, t}) {
  const [data, setData] = useState([])
  const [loading, setL] = useState(true)
  useEffect(()=>{ fetch(`${api}/user/verifications`,{headers:H(t)}).then(r=>r.json()).then(d=>{setData(d.verifications||[]);setL(false)}) },[api,t])
  return (
    <div>
      <div className="page-header">
        <div className="page-header-eyebrow">Verification History</div>
        <h1 className="page-header-title">My History</h1>
        <p className="page-header-sub">All certificate verification requests you have submitted.</p>
      </div>
      <div className="table-wrapper">
        <div className="table-header"><span className="table-title">{data.length} Records</span></div>
        {loading?<div className="loading-overlay"><span className="spinner"/> Loading...</div>:
        data.length===0?<Blank text="No verification history. Try verifying a certificate first." sub="Use the Verify page to check a certificate."/>:
        <table>
          <thead><tr><th>#</th><th>Result</th><th>Certificate No.</th><th>Institution</th><th>NB</th><th>CNN</th><th>AI Score</th><th>Date</th></tr></thead>
          <tbody>{data.map((v,i)=>(
            <tr key={v.id}>
              <td style={{color:'var(--text-muted)'}}>{i+1}</td>
              <td><Verdict ok={v.is_genuine}/></td>
              <td><code style={{fontSize:'0.72rem',color:'var(--blue)'}}>{v.certificate?.certificate_number||'—'}</code></td>
              <td style={{fontSize:'0.8rem',color:'var(--text-secondary)'}}>{v.certificate?.institution||'—'}</td>
              <td style={{fontWeight:600,fontSize:'0.8rem'}}>{(v.naive_bayes_score*100).toFixed(1)}%</td>
              <td style={{fontWeight:600,fontSize:'0.8rem'}}>{(v.cnn_score*100).toFixed(1)}%</td>
              <td style={{fontWeight:700,color:v.is_genuine?'var(--green)':'var(--red)'}}>{(v.ai_score*100).toFixed(1)}%</td>
              <td style={{fontSize:'0.75rem',color:'var(--text-muted)',whiteSpace:'nowrap'}}>{fmtDt(v.verified_at)}</td>
            </tr>
          ))}</tbody>
        </table>}
      </div>
    </div>
  )
}

/* ─── User: Profile ──────────────────────────────────────────────────────── */
function ProfilePage({api, t, user}) {
  const [data, setData] = useState(null)
  useEffect(()=>{ fetch(`${api}/user/profile`,{headers:H(t)}).then(r=>r.json()).then(setData) },[api,t])
  return (
    <div>
      <div className="page-header">
        <div className="page-header-eyebrow">Account</div>
        <h1 className="page-header-title">My Account</h1>
        <p className="page-header-sub">Your account information and activity summary.</p>
      </div>
      <div className="grid-2" style={{alignItems:'start'}}>
        <div className="card">
          <div className="section-title">Profile Information</div>
          <div style={{display:'flex',alignItems:'center',gap:'1.25rem',marginBottom:'1.5rem'}}>
            <div style={{width:56,height:56,borderRadius:'var(--r-lg)',background:'var(--grad-brand)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.5rem',fontWeight:800,color:'white',flexShrink:0}}>
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{fontWeight:700,fontSize:'1.1rem'}}>{user.name}</div>
              <div style={{color:'var(--text-muted)',fontSize:'0.82rem'}}>{user.email}</div>
            </div>
          </div>
          <div className="divider"/>
          {[['Full Name',user.name],['Email Address',user.email],['Role','User'],['Member Since',fmt(data?.user?.created_at)]].map(([l,v])=>(
            <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.6rem 0',borderBottom:'1px solid var(--border-light)'}}>
              <span style={{fontSize:'0.78rem',color:'var(--text-muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em'}}>{l}</span>
              <span style={{fontSize:'0.85rem',fontWeight:600}}>{v}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="section-title">Activity Summary</div>
          <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
            {[
              {label:'Total Verifications', val:data?.stats?.total_verifications??'—', cls:'blue'},
              {label:'Genuine Certificates', val:data?.stats?.genuine_found??'—', cls:'green'},
              {label:'Fake Detected',        val:data?.stats?.fake_detected??'—',  cls:'red'},
            ].map(({label,val,cls})=>(
              <div key={label} className="stat-card" style={{padding:'1rem 1.25rem'}}>
                <div className={`stat-icon ${cls}`}><I n={cls==='blue'?'verify':cls==='green'?'check':'x'} s={18}/></div>
                <div><div className="stat-label">{label}</div><div className="stat-value" style={{fontSize:'1.5rem'}}>{val}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Shared components ──────────────────────────────────────────────────── */
const Req = () => <span style={{color:'var(--red)',fontSize:'0.7rem',marginLeft:'2px'}}>*</span>
const Fld = ({label,value,style}) => <div style={style}><div className="result-field-label">{label}</div><div className="result-field-value">{value||'—'}</div></div>
const Blank = ({text,sub}) => <div className="empty-state"><div className="empty-state-icon"><I n="list" s={22}/></div><div className="empty-state-title">{text}</div>{sub&&<div className="empty-state-sub">{sub}</div>}</div>
const Verdict = ({ok}) => <span className={`badge ${ok?'badge-genuine':'badge-suspicious'}`}>{ok?'Genuine':'Fake'}</span>
const Chip = ({ok,yes,no}) => <span className={`badge ${ok?'badge-blockchain':'badge-pending'}`}>{ok?yes:no}</span>

const Bar = ({label,val,cls}) => {
  const p = Math.min(100,Math.max(0,(val||0)*100))
  return <div className="score-row"><div className="score-label"><span>{label}</span><span>{p.toFixed(1)}%</span></div><div className="score-bar-bg"><div className={`score-bar-fill ${cls}`} style={{width:`${p}%`}}/></div></div>
}

const SC = ({ico,cls,label,val,sub}) => (
  <div className="stat-card">
    <div className={`stat-icon ${cls}`}><I n={ico} s={18}/></div>
    <div><div className="stat-label">{label}</div><div className="stat-value">{val}</div><div className="stat-change">{sub}</div></div>
  </div>
)

/* ─── Public Verify Page (no auth) ──────────────────────────────────────── */
export function PublicVerify() {
  const [certNum, setCN] = useState(() => new URLSearchParams(window.location.search).get('cert') || '')
  const [loading, setL]  = useState(false)
  const [result, setR]   = useState(null)
  const [err, setErr]    = useState('')

  const verify = async e => {
    e?.preventDefault(); if (!certNum.trim()) return
    setL(true); setErr(''); setR(null)
    try {
      const r = await fetch(`${API}/public/verify?cert=${encodeURIComponent(certNum.trim())}`)
      const d = await r.json()
      if (!r.ok) { setErr(d.error || 'Error'); return }
      setR(d)
    } catch { setErr('Cannot connect to server') } finally { setL(false) }
  }

  // Auto-verify if cert param in URL
  useEffect(() => { if (certNum) verify() }, [])

  const cert = result?.certificate
  return (
    <div style={{minHeight:'100vh',background:'var(--bg-base)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-start',padding:'2.5rem 1rem'}}>
      {/* Header */}
      <div style={{textAlign:'center',marginBottom:'2.5rem'}}>
        <div style={{width:52,height:52,borderRadius:'var(--r-lg)',background:'var(--blue-glow)',border:'1px solid rgba(56,189,248,0.2)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 1rem'}}>
          <I n="chain" s={24}/>
        </div>
        <div style={{fontWeight:800,fontSize:'1.6rem',color:'var(--text-primary)',letterSpacing:'-0.03em'}}>CertyChain</div>
        <div style={{color:'var(--text-muted)',fontSize:'0.82rem',marginTop:'0.25rem'}}>Public Certificate Verification</div>
      </div>

      {/* Input card */}
      <div style={{width:'100%',maxWidth:520,background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'var(--r-xl)',padding:'1.75rem',marginBottom:'1.5rem',boxShadow:'var(--shadow-card)'}}>
        <form onSubmit={verify} style={{display:'flex',gap:'0.5rem'}}>
          <input value={certNum} onChange={e=>setCN(e.target.value)} placeholder="Enter certificate number..."
            style={{flex:1,background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:'var(--r-md)',
              padding:'0.65rem 0.9rem',color:'var(--text-primary)',fontSize:'0.88rem',fontFamily:'JetBrains Mono,monospace',outline:'none'}}/>
          <button type="submit" disabled={loading||!certNum.trim()}
            style={{background:'var(--blue)',color:'#fff',border:'none',borderRadius:'var(--r-md)',
              padding:'0.65rem 1.25rem',cursor:'pointer',fontFamily:'inherit',fontWeight:600,fontSize:'0.85rem',
              opacity: (loading||!certNum.trim()) ? 0.6 : 1}}>
            {loading ? '...' : 'Verify'}
          </button>
        </form>
        {err && <div style={{marginTop:'0.75rem',color:'var(--red)',fontSize:'0.8rem'}}>{err}</div>}
      </div>

      {/* Result */}
      {result && (
        <div style={{width:'100%',maxWidth:520,background:'var(--bg-card)',border:`1px solid ${result.is_genuine?'rgba(16,185,129,0.25)':'rgba(239,68,68,0.25)'}`,
          borderRadius:'var(--r-xl)',overflow:'hidden',boxShadow:'var(--shadow-card)'}}>
          {/* Status bar */}
          <div style={{background:result.is_genuine?'rgba(16,185,129,0.06)':'rgba(239,68,68,0.06)',
            padding:'1.25rem 1.5rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontWeight:800,fontSize:'1.2rem',color:result.is_genuine?'var(--green)':'var(--red)'}}>
                {result.is_genuine ? '✓ GENUINE' : '✗ NOT FOUND'}
              </div>
              <div style={{fontSize:'0.78rem',color:'var(--text-muted)',marginTop:'0.2rem'}}>{result.message}</div>
            </div>
            <div style={{width:44,height:44,borderRadius:999,background:result.is_genuine?'var(--green-glow)':'rgba(239,68,68,0.12)',
              display:'flex',alignItems:'center',justifyContent:'center',color:result.is_genuine?'var(--green)':'var(--red)'}}>
              <I n={result.is_genuine?'check':'x'} s={20}/>
            </div>
          </div>
          {/* Details */}
          {cert && (
            <div style={{padding:'1.25rem 1.5rem',display:'flex',flexDirection:'column',gap:'0.65rem'}}>
              {[
                ['Certificate No.', cert.certificate_number],
                ['Recipient',       cert.recipient_name],
                ['Title',           cert.title],
                ['Institution',     cert.institution],
                ['Issue Date',      fmt(cert.issue_date)],
              ].map(([l,v])=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'0.83rem'}}>
                  <span style={{color:'var(--text-muted)'}}>{l}</span>
                  <span style={{fontWeight:600,color:'var(--text-primary)',maxWidth:'60%',textAlign:'right'}}>{v||'—'}</span>
                </div>
              ))}
              <div style={{borderTop:'1px solid var(--border)',paddingTop:'0.65rem',marginTop:'0.25rem'}}>
                <div style={{fontSize:'0.7rem',color:'var(--text-muted)',marginBottom:'0.3rem'}}>SHA-256</div>
                <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.6rem',color:'var(--blue)',wordBreak:'break-all'}}>{cert.hash}</div>
              </div>
              {result.blockchain_verified && (
                <div style={{background:'rgba(16,185,129,0.05)',border:'1px solid rgba(16,185,129,0.15)',borderRadius:'var(--r-md)',padding:'0.6rem 0.85rem',fontSize:'0.77rem',color:'var(--green-light)'}}>
                  ⛓ Verified on Hardhat blockchain — immutable record confirmed.
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <div style={{marginTop:'2rem',fontSize:'0.73rem',color:'var(--text-muted)',textAlign:'center'}}>
        Powered by CertyChain · Appskep Indonesia · Blockchain + AI Certificate Verification
      </div>
    </div>
  )
}
