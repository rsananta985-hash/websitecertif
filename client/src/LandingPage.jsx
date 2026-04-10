import React from 'react'

export default function LandingPage() {
  const loginPath = '/login'
  const verifyPath = '/public'

  return (
    <div className="landing-layout">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="container nav-container">
          <div className="nav-brand">
            <div className="nav-logo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </div>
            <span className="nav-title">CertyChain AI</span>
          </div>
          <div className="nav-links">
            <a href="#home">Home</a>
            <a href="#features">Keunggulan</a>
            <a href="#contact">Contact</a>
          </div>
          <div className="nav-buttons">
            <a href={verifyPath} className="btn btn-outline" style={{padding: '0.45rem 1rem', fontSize: '0.8rem'}}>Verify Certificate</a>
            <a href={loginPath} className="btn btn-primary" style={{padding: '0.45rem 1rem', fontSize: '0.8rem'}}>Portal Login</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="hero-section">
        <div className="container hero-container">
          <div className="hero-content">
            <div className="hero-badge">Verifikasi Generasi Terbaru</div>
            <h1 className="hero-title">
              Masa Depan <span className="text-gradient">Autentikasi</span> Sertifikat Digital.
            </h1>
            <p className="hero-subtitle">
              Sistem Verifikasi Sertifikat Digital Berbasis Blockchain Menggunakan Algoritma Naive Bayes dan Visual AI Detection untuk akurasi mutlak tanpa celah.
            </p>
            <div className="hero-actions">
              <a href={loginPath} className="btn btn-primary btn-lg">Masuk ke Dashboard</a>
              <a href="#features" className="btn btn-outline btn-lg" style={{background: 'rgba(255,255,255,0.02)'}}>Pelajari Cara Kerjanya</a>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-globe">
              {/* Decorative elements representing AI & Blockchain */}
              <div className="h-circle c1"></div>
              <div className="h-circle c2"></div>
              <div className="h-floating-card fc-1">
                <div style={{color:'var(--green)'}}>✓ Blockchain Hash Match</div>
              </div>
              <div className="h-floating-card fc-2">
                <div style={{color:'var(--purple)'}}>🤖 Visual CNN Score: 99.8%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="container">
          <div className="section-header">
            <h2>Keunggulan Sistem</h2>
            <p>Arsitektur canggih dari dua teknologi masa depan yang memastikan autentikasi dokumen tanpa cela.</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="f-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
              <h3>Web3 Smart Contracts</h3>
              <p>Mencatat rekam jejak sertifikat (Cryptographic Hash) kekal ke dalam buku besar publik Blockchain Network. Anti manipulasi data.</p>
            </div>
            <div className="feature-card">
              <div className="f-icon purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>
              <h3>Machine Learning Analysis</h3>
              <p>Menganalisis probabilitas teks dengan Naive Bayes dan struktur gambar dengan CNN Deep Learning (Pillow) secara akurat.</p>
            </div>
            <div className="feature-card">
              <div className="f-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></div>
              <h3>Public Traceability</h3>
              <p>Siapapun dapat mengakses portal publik untuk mengunggah dokumen dan menguji langsung keasliannya dalam hitungan detik.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer / Contact */}
      <footer id="contact" className="landing-footer">
        <div className="container footer-content">
          <div className="footer-brand">
            <div className="nav-brand">
               <div className="nav-logo" style={{width: 32, height: 32}}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></div>
               <span className="nav-title" style={{fontSize: '1.2rem'}}>CertyChain AI</span>
            </div>
            <p>Standar baru untuk perlindungan dokumen.</p>
          </div>
          <div className="footer-links">
            <div className="f-col">
              <h4>Portal</h4>
              <a href={loginPath}>Admin / User Login</a>
              <a href={verifyPath}>Verification Page</a>
            </div>
            <div className="f-col">
              <h4>Kontak</h4>
              <a href="mailto:support@certychain.id">support@certychain.id</a>
              <a href="#">Dokumentasi API</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
           <p>© 2026 CertyChain Hub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
