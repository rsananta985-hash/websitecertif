import { useState, useEffect, useCallback } from 'react'

const H = (t) => ({ 'Content-Type':'application/json', Authorization:`Bearer ${t}` })
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'
const fmtDt = (d) => d ? new Date(d).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'

const Ico = {
  upload: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><polyline points="16,16 12,12 8,16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  check:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20,6 9,17 4,12"/></svg>,
  x:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  list:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
}
const I = ({n, s=16}) => <span style={{width:s,height:s,display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{Ico[n]}</span>

const Verdict  = ({ok}) => <span className={`badge ${ok?'badge-genuine':'badge-suspicious'}`}>{ok?'Genuine':'Fake'}</span>
const Bar = ({label,val,cls}) => {
  const p = Math.min(100,Math.max(0,(val||0)*100))
  return <div className="score-row"><div className="score-label"><span>{label}</span><span>{p.toFixed(1)}%</span></div><div className="score-bar-bg"><div className={`score-bar-fill ${cls}`} style={{width:`${p}%`}}/></div></div>
}
const Blank = ({text,sub}) => <div className="empty-state"><div className="empty-state-icon"><I n="list" s={22}/></div><div className="empty-state-title">{text}</div>{sub&&<div className="empty-state-sub">{sub}</div>}</div>

/* ─── Admin: Full User Management ──────────────────────────────────────────── */
export function UsersList({api, t}) {
  const [data,    setData]   = useState([])
  const [loading, setL]      = useState(true)
  const [search,  setSrc]    = useState('')
  const [sel,     setSel]    = useState(null)
  const [detail,  setDetail] = useState(null)
  const [delConf, setDel]    = useState(null)
  const [busy,    setBusy]   = useState(false)
  const [msg,     setMsg]    = useState('')

  const load = useCallback(() => {
    setL(true)
    fetch(`${api}/admin/users`,{headers:H(t)})
      .then(r=>r.json()).then(d=>{setData(d.users||[]);setL(false)})
  },[api,t])

  useEffect(()=>{ load() },[load])

  const openDetail = async (u) => {
    setSel(u); setDetail(null)
    const r = await fetch(`${api}/admin/users/${u.id}`,{headers:H(t)})
    setDetail(await r.json())
  }

  const toggleActive = async (u) => {
    setBusy(true)
    const r = await fetch(`${api}/admin/users/${u.id}`,{
      method:'PUT', headers:H(t),
      body: JSON.stringify({is_active: !u.is_active})
    })
    const d = await r.json()
    if (r.ok) {
      setMsg(`User "${d.user?.name}" ${d.user?.is_active ? 'activated' : 'deactivated'}.`)
      load()
      if (sel?.id === u.id) setSel(p => ({...p, is_active: !p.is_active}))
    }
    setBusy(false); setTimeout(()=>setMsg(''),3500)
  }

  const deleteUser = async (u) => {
    setBusy(true)
    const r = await fetch(`${api}/admin/users/${u.id}`,{method:'DELETE', headers:H(t)})
    if (r.ok) { setMsg(`User "${u.name}" deleted.`); load(); if(sel?.id===u.id) setSel(null) }
    setDel(null); setBusy(false); setTimeout(()=>setMsg(''),3500)
  }

  const rows = data.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="page-header">
        <div className="page-header-eyebrow">User Management</div>
        <h1 className="page-header-title">Registered Users</h1>
        <p className="page-header-sub">Manage accounts — view activity, activate/deactivate, or remove users.</p>
      </div>

      {msg && (
        <div style={{background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)',color:'var(--green)',
          borderRadius:'var(--r-md)',padding:'0.65rem 1rem',marginBottom:'1.25rem',fontSize:'0.82rem',fontWeight:600}}>
          {msg}
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns: sel ? '1fr 370px' : '1fr',gap:'1.5rem',alignItems:'start'}}>
        {/* ── Table */}
        <div className="table-wrapper">
          <div className="table-header">
            <span className="table-title">{rows.length} Users</span>
            <input className="form-input" style={{width:240,padding:'0.4rem 0.75rem',fontSize:'0.8rem'}}
              placeholder="Search name or email..." value={search} onChange={e=>setSrc(e.target.value)}/>
          </div>
          {loading ? <div className="loading-overlay"><span className="spinner"/> Loading...</div> :
          rows.length===0 ? <Blank text="No users found."/> :
          <table>
            <thead><tr><th>#</th><th>User</th><th>Email</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>{rows.map((u,i) => (
              <tr key={u.id} style={{background: sel?.id===u.id ? 'rgba(56,189,248,0.04)' : ''}}>
                <td style={{color:'var(--text-muted)'}}>{i+1}</td>
                <td>
                  <div style={{display:'flex',alignItems:'center',gap:'0.6rem'}}>
                    <div style={{width:32,height:32,borderRadius:999,background:'linear-gradient(135deg,#1e40af,#3b82f6)',
                      display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.8rem',fontWeight:700,color:'white',flexShrink:0}}>
                      {u.name?.charAt(0).toUpperCase()}
                    </div>
                    <span style={{fontWeight:600,fontSize:'0.85rem'}}>{u.name}</span>
                  </div>
                </td>
                <td style={{color:'var(--text-secondary)',fontSize:'0.8rem'}}>{u.email}</td>
                <td><span className={`badge ${u.is_active ? 'badge-genuine' : 'badge-suspicious'}`}>{u.is_active?'Active':'Suspended'}</span></td>
                <td style={{color:'var(--text-muted)',fontSize:'0.75rem'}}>{fmt(u.created_at)}</td>
                <td>
                  <div style={{display:'flex',gap:'0.3rem'}}>
                    <button onClick={()=>openDetail(u)}
                      style={{background:'rgba(56,189,248,0.1)',border:'1px solid rgba(56,189,248,0.2)',borderRadius:'6px',
                        padding:'0.2rem 0.55rem',cursor:'pointer',fontSize:'0.72rem',color:'#38bdf8',fontFamily:'inherit'}}>
                      Detail
                    </button>
                    <button onClick={()=>toggleActive(u)} disabled={busy}
                      style={{background: u.is_active?'rgba(245,158,11,0.08)':'rgba(16,185,129,0.08)',
                        border:`1px solid ${u.is_active?'rgba(245,158,11,0.2)':'rgba(16,185,129,0.2)'}`,
                        borderRadius:'6px',padding:'0.2rem 0.55rem',cursor:'pointer',
                        fontSize:'0.72rem',color:u.is_active?'#f59e0b':'#10b981',fontFamily:'inherit'}}>
                      {u.is_active?'Suspend':'Activate'}
                    </button>
                    <button onClick={()=>setDel(u)}
                      style={{background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.15)',
                        borderRadius:'6px',padding:'0.2rem 0.55rem',cursor:'pointer',
                        fontSize:'0.72rem',color:'#ef4444',fontFamily:'inherit'}}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>}
        </div>

        {/* ── Detail panel */}
        {sel && (
          <div className="card" style={{position:'sticky',top:'1rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.25rem'}}>
              <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                <div style={{width:44,height:44,borderRadius:999,background:'linear-gradient(135deg,#1e40af,#3b82f6)',
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.1rem',fontWeight:800,color:'white'}}>
                  {sel.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{fontWeight:700}}>{sel.name}</div>
                  <div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{sel.email}</div>
                </div>
              </div>
              <button onClick={()=>setSel(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:'1.2rem'}}>×</button>
            </div>
            <div style={{display:'flex',gap:'0.5rem',marginBottom:'1rem'}}>
              <span className={`badge ${sel.is_active?'badge-genuine':'badge-suspicious'}`}>{sel.is_active?'Active':'Suspended'}</span>
              <span className="badge badge-blockchain">User</span>
            </div>
            {detail ? (
              <>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem',marginBottom:'1rem'}}>
                  {[
                    ['Verifications', detail.stats?.total_verifications ?? '—'],
                    ['Genuine',       detail.stats?.genuine_found ?? '—'],
                    ['Suspicious',    detail.stats?.suspicious_detected ?? '—'],
                    ['Joined',        fmt(detail.user?.created_at)],
                  ].map(([l,v]) => (
                    <div key={l} style={{background:'var(--bg-elevated)',borderRadius:'8px',padding:'0.65rem 0.75rem'}}>
                      <div style={{fontSize:'0.65rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'0.2rem'}}>{l}</div>
                      <div style={{fontWeight:700,fontSize:'1rem'}}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{fontSize:'0.72rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'0.5rem',fontWeight:600}}>Recent Activity</div>
                {(detail.recent_verifications||[]).length===0
                  ? <div style={{fontSize:'0.78rem',color:'var(--text-muted)',textAlign:'center',padding:'0.75rem'}}>No activity yet</div>
                  : (detail.recent_verifications||[]).slice(0,5).map(v => (
                    <div key={v.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                      padding:'0.4rem 0',borderBottom:'1px solid var(--border-light)',fontSize:'0.75rem'}}>
                      <Verdict ok={v.is_genuine}/>
                      <span style={{color:'var(--text-muted)'}}>{fmtDt(v.verified_at)}</span>
                    </div>
                  ))}
                <div style={{display:'flex',gap:'0.5rem',marginTop:'1.25rem'}}>
                  <button onClick={()=>toggleActive(sel)} disabled={busy}
                    style={{flex:1,padding:'0.55rem',borderRadius:'8px',fontFamily:'inherit',fontWeight:600,fontSize:'0.8rem',cursor:'pointer',
                      background:sel.is_active?'rgba(245,158,11,0.08)':'rgba(16,185,129,0.08)',
                      border:`1px solid ${sel.is_active?'rgba(245,158,11,0.25)':'rgba(16,185,129,0.25)'}`,
                      color:sel.is_active?'#f59e0b':'#10b981'}}>
                    {sel.is_active?'Suspend User':'Reactivate'}
                  </button>
                  <button onClick={()=>setDel(sel)}
                    style={{flex:1,padding:'0.55rem',borderRadius:'8px',fontFamily:'inherit',fontWeight:600,fontSize:'0.8rem',cursor:'pointer',
                      background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.2)',color:'#ef4444'}}>
                    Delete
                  </button>
                </div>
              </>
            ) : <div className="loading-overlay" style={{position:'static',height:120}}><span className="spinner"/> Loading...</div>}
          </div>
        )}
      </div>

      {/* ── Delete modal */}
      {delConf && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',
          justifyContent:'center',zIndex:1000,backdropFilter:'blur(4px)'}}>
          <div className="card" style={{maxWidth:400,width:'90%',textAlign:'center'}}>
            <div style={{width:52,height:52,borderRadius:999,background:'rgba(239,68,68,0.1)',display:'flex',
              alignItems:'center',justifyContent:'center',margin:'0 auto 1rem',color:'#ef4444'}}>
              <I n="x" s={24}/>
            </div>
            <div style={{fontWeight:700,fontSize:'1.05rem',marginBottom:'0.5rem'}}>Delete User?</div>
            <div style={{color:'var(--text-secondary)',fontSize:'0.83rem',marginBottom:'1.5rem'}}>
              <strong>{delConf.name}</strong> ({delConf.email})<br/>
              This also deletes all their verification history and cannot be undone.
            </div>
            <div style={{display:'flex',gap:'0.75rem'}}>
              <button onClick={()=>setDel(null)}
                style={{flex:1,padding:'0.65rem',borderRadius:'8px',fontFamily:'inherit',fontWeight:600,
                  fontSize:'0.85rem',cursor:'pointer',background:'var(--bg-elevated)',border:'1px solid var(--border)',color:'var(--text-primary)'}}>
                Cancel
              </button>
              <button onClick={()=>deleteUser(delConf)} disabled={busy}
                style={{flex:1,padding:'0.65rem',borderRadius:'8px',fontFamily:'inherit',fontWeight:700,
                  fontSize:'0.85rem',cursor:'pointer',background:'#ef4444',border:'none',color:'white'}}>
                {busy?'Deleting...':'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── User: Verification History (Upgraded) ─────────────────────────────────── */
export function HistoryPage({api, t}) {
  const [data,    setData] = useState([])
  const [loading, setL]   = useState(true)
  const [sel,     setSel] = useState(null)

  useEffect(() => {
    fetch(`${api}/user/verifications`,{headers:H(t)})
      .then(r=>r.json()).then(d=>{setData(d.verifications||[]);setL(false)})
  },[api,t])

  const fmtHash = h => h ? h.substring(0,10)+'...'+h.substring(h.length-6) : '—'

  return (
    <div>
      <div className="page-header">
        <div className="page-header-eyebrow">Verification History</div>
        <h1 className="page-header-title">My History</h1>
        <p className="page-header-sub">All verification requests with SHA-256 hashes and AI analysis details.</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns: sel ? '1fr 320px' : '1fr',gap:'1.5rem',alignItems:'start'}}>
        <div className="table-wrapper">
          <div className="table-header">
            <span className="table-title">{data.length} Records</span>
            <div style={{display:'flex',gap:'0.5rem',fontSize:'0.75rem'}}>
              <span style={{color:'#10b981',fontWeight:600}}>{data.filter(v=>v.is_genuine).length} Genuine</span>
              <span style={{color:'var(--text-muted)'}}>·</span>
              <span style={{color:'#ef4444',fontWeight:600}}>{data.filter(v=>!v.is_genuine).length} Suspicious</span>
            </div>
          </div>
          {loading ? <div className="loading-overlay"><span className="spinner"/> Loading...</div> :
          data.length===0 ? <Blank text="No verification history yet." sub="Use the Verify page to check a certificate."/> :
          <table>
            <thead><tr>
              <th>#</th><th>Result</th><th>File / Method</th>
              <th>SHA-256</th><th>Certificate</th><th>AI Score</th><th>Date</th><th></th>
            </tr></thead>
            <tbody>{data.map((v,i) => (
              <tr key={v.id} onClick={()=>setSel(sel?.id===v.id?null:v)}
                style={{cursor:'pointer',background:sel?.id===v.id?'rgba(56,189,248,0.04)':''}}>
                <td style={{color:'var(--text-muted)'}}>{i+1}</td>
                <td><Verdict ok={v.is_genuine}/></td>
                <td style={{fontSize:'0.78rem',color:'var(--text-secondary)',maxWidth:140}}>
                  {v.file_name
                    ? <span title={v.file_name} style={{display:'flex',alignItems:'center',gap:'0.3rem'}}>
                        <I n="upload" s={12}/>
                        {v.file_name.length>16 ? v.file_name.substring(0,16)+'…' : v.file_name}
                      </span>
                    : <span style={{color:'var(--text-muted)'}}>Manual</span>}
                </td>
                <td>
                  <code style={{fontSize:'0.65rem',color:'#38bdf8',fontFamily:'JetBrains Mono,monospace'}}>
                    {fmtHash(v.uploaded_hash)}
                  </code>
                </td>
                <td style={{fontSize:'0.78rem'}}>
                  {v.certificate?.certificate_number
                    ? <code style={{fontSize:'0.72rem',color:'#10b981'}}>{v.certificate.certificate_number}</code>
                    : <span style={{color:'var(--text-muted)'}}>—</span>}
                </td>
                <td style={{fontWeight:700,color:v.is_genuine?'#10b981':'#ef4444'}}>
                  {(v.ai_score*100).toFixed(1)}%
                </td>
                <td style={{fontSize:'0.72rem',color:'var(--text-muted)',whiteSpace:'nowrap'}}>{fmtDt(v.verified_at)}</td>
                <td style={{fontSize:'0.72rem',color:'#38bdf8'}}>›</td>
              </tr>
            ))}</tbody>
          </table>}
        </div>

        {/* ── Detail panel */}
        {sel && (
          <div className="card" style={{position:'sticky',top:'1rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
              <div style={{fontWeight:700,fontSize:'0.9rem'}}>Verification Detail</div>
              <button onClick={()=>setSel(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}>×</button>
            </div>

            {/* Verdict */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
              background: sel.is_genuine ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
              borderRadius:'10px',padding:'0.75rem 1rem',marginBottom:'0.75rem',
              border:`1px solid ${sel.is_genuine?'rgba(16,185,129,0.15)':'rgba(239,68,68,0.15)'}`}}>
              <div>
                <div style={{fontWeight:800,fontSize:'1rem',color:sel.is_genuine?'#10b981':'#ef4444'}}>
                  {sel.is_genuine ? 'GENUINE' : 'SUSPICIOUS'}
                </div>
                <div style={{fontSize:'0.72rem',color:'var(--text-muted)',marginTop:'0.1rem'}}>{fmtDt(sel.verified_at)}</div>
              </div>
              <I n={sel.is_genuine?'check':'x'} s={26}/>
            </div>

            {sel.file_name && (
              <div style={{background:'var(--bg-elevated)',borderRadius:'8px',padding:'0.65rem 0.75rem',marginBottom:'0.75rem'}}>
                <div style={{fontSize:'0.65rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'0.2rem'}}>File Uploaded</div>
                <div style={{fontWeight:600,fontSize:'0.83rem',display:'flex',alignItems:'center',gap:'0.4rem'}}>
                  <I n="upload" s={13}/>{sel.file_name}
                </div>
              </div>
            )}

            <div style={{background:'rgba(15,23,42,0.4)',borderRadius:'8px',padding:'0.65rem 0.75rem',marginBottom:'0.75rem'}}>
              <div style={{fontSize:'0.65rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'0.35rem'}}>SHA-256 Hash</div>
              <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:'0.58rem',color:'#38bdf8',wordBreak:'break-all',lineHeight:1.5}}>
                {sel.uploaded_hash}
              </div>
            </div>

            {sel.certificate && (
              <div style={{background:'rgba(16,185,129,0.06)',borderRadius:'8px',padding:'0.65rem 0.75rem',
                border:'1px solid rgba(16,185,129,0.15)',marginBottom:'0.75rem'}}>
                <div style={{fontSize:'0.65rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'0.35rem'}}>Certificate Match</div>
                <div style={{fontWeight:700,fontSize:'0.83rem',color:'#10b981',marginBottom:'0.2rem'}}>{sel.certificate.certificate_number}</div>
                <div style={{fontSize:'0.78rem',color:'var(--text-secondary)'}}>{sel.certificate.recipient_name}</div>
                <div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{sel.certificate.institution}</div>
              </div>
            )}

            <div style={{fontSize:'0.72rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600,marginBottom:'0.5rem'}}>AI Analysis</div>
            <Bar label="NaiveBayes" val={sel.naive_bayes_score} cls="blue"/>
            <Bar label="CNN Model"  val={sel.cnn_score}         cls="purple"/>
            <Bar label="AI Score"   val={sel.ai_score}          cls="green"/>
          </div>
        )}
      </div>
    </div>
  )
}
