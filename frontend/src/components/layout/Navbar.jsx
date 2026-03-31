// components/layout/Navbar.jsx
// Shared top navigation bar used on all public pages.
// Props:
//   transparent (bool) — removes border / background for auth pages

import { Link } from 'react-router-dom'

export default function Navbar({ transparent = false }) {
  return (
    <nav
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 5%',
        borderBottom: transparent ? 'none' : '1.5px solid #D4CFC4',
      }}
    >
      <Link
        to="/"
        style={{ textDecoration: 'none' }}
      >
        <span
          style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800,
            fontSize: '1.2rem',
            letterSpacing: '-0.02em',
            color: '#0D0D0B',
          }}
        >
          Support<span style={{ color: '#C8841A' }}>OS</span>
        </span>
      </Link>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
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
          Get Started →
        </Link>
      </div>
    </nav>
  )
}
