// components/layout/Navbar.jsx
// Shared top navigation bar used on all public pages.
// Props:
//   transparent (bool) - removes border / background for auth pages

import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Navbar({ transparent = false }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav
      className="landing-navbar"
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 5%',
        borderBottom: transparent ? 'none' : '1.5px solid #D4CFC4',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: transparent ? 'transparent' : '#F5F0E8',
        backdropFilter: 'blur(12px)',
      }}
    >
      <Link
        to="/"
        style={{ textDecoration: 'none' }}
      >
        <span
          style={{
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            fontWeight: 800,
            fontSize: '1.2rem',
            letterSpacing: '-0.02em',
            color: '#0D0D0B',
          }}
        >
          Support<span style={{ color: '#C8841A' }}>OS</span>
        </span>
      </Link>

      {/* Desktop buttons */}
      <div className="navbar-desktop-links" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Link
          to="/login"
          className="btn-outline"
          style={{ padding: '8px 18px', fontSize: '0.82rem' }}
        >
          Sign in
        </Link>
        <Link
          to="/signup"
          className="btn-primary"
          style={{ padding: '8px 18px', fontSize: '0.82rem' }}
        >
          Get Started
        </Link>
      </div>

      {/* Mobile hamburger button */}
      <button
        className="navbar-mobile-toggle"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        {menuOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        )}
      </button>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="navbar-mobile-menu">
          <Link
            to="/login"
            className="btn-outline"
            style={{ width: '100%', textAlign: 'center', padding: '10px 18px', fontSize: '0.9rem' }}
            onClick={() => setMenuOpen(false)}
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="btn-primary"
            style={{ width: '100%', textAlign: 'center', padding: '10px 18px', fontSize: '0.9rem' }}
            onClick={() => setMenuOpen(false)}
          >
            Get Started
          </Link>
        </div>
      )}
    </nav>
  )
}
