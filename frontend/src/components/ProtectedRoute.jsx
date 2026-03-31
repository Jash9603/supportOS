// components/ProtectedRoute.jsx
// Wraps any route that requires login.
// On mount, calls GET /auth/me — if the cookie is valid, the user passes through.
// If not authenticated (401), redirects to /login.

import { useEffect, useState } from 'react'
import { useNavigate, Outlet } from 'react-router-dom'
import { authApi } from '../lib/api'

export default function ProtectedRoute() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    authApi.me()
      .then(() => setChecking(false))          // valid cookie → render children
      .catch(() => navigate('/login', { replace: true }))  // no cookie → send to login
  }, [navigate])

  if (checking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p style={{ fontFamily: 'Inter, sans-serif', color: '#4A4743' }}>Loading…</p>
      </div>
    )
  }

  return <Outlet />
}
