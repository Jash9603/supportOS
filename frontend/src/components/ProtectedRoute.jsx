// components/ProtectedRoute.jsx
// Wraps any route that requires login.
// On mount, calls GET /auth/me - if the cookie is valid, the user passes through.
// If not authenticated (401), redirects to /login.

import { useEffect, useState } from 'react'
import { useNavigate, Outlet } from 'react-router-dom'
import { authApi } from '../lib/api'
import BillingGate from './BillingGate'

export default function ProtectedRoute() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    authApi.me()
      .then((res) => {
        setUser(res.data)
        setChecking(false)
      }) // valid cookie → set user & render children
      .catch(() => navigate('/login', { replace: true }))  // no cookie → send to login
  }, [navigate])

  if (checking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p style={{ fontFamily: 'Inter, sans-serif', color: '#4A4743' }}>Loading…</p>
      </div>
    )
  }

  // Enforce Subscription Wall
  // (We no longer hard-lock the app. Users can access the dashboard to view past tickets 
  // and upgrade from Settings or when they hit a premium feature like Analytics)
  // if (isExpired) {
  //   const hasPastHistory = !!(user.trial_ends_at || user.subscription_ends_at)
  //   return <BillingGate user={user} isRenew={hasPastHistory} />
  // }

  return <Outlet context={{ user }} />
}
