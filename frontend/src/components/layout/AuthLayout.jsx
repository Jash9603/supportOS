// components/layout/AuthLayout.jsx
// Wrapper for Login and Signup pages.
// Centers the auth card vertically with the SupportOS logo link above it.

import { Link } from 'react-router-dom'

export default function AuthLayout({ children }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}
    >
      {/* Logo */}
      <Link
        to="/"
        style={{
          fontFamily: '"Plus Jakarta Sans", sans-serif',
          fontWeight: 800,
          fontSize: '1.4rem',
          color: '#0D0D0B',
          textDecoration: 'none',
          marginBottom: 36,
          letterSpacing: '-0.02em',
        }}
      >
        Support<span style={{ color: '#C8841A' }}>OS</span>
      </Link>

      {children}
    </div>
  )
}
