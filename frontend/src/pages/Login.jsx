// pages/Login.jsx - Login page
// Clean centered auth form on cream background.
// On success: sets httpOnly cookie server-side, redirects to /dashboard.
// No glassmorphism - white card with thin ink border.

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../lib/api'
import AuthLayout from '../components/layout/AuthLayout'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.login(form)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="auth-card" style={{ animation: 'fadeInUp 0.5s ease forwards' }}>

        {/* Heading */}
        <h1 style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 800, fontSize: '1.8rem', marginBottom: 6, color: '#0D0D0B', letterSpacing: '-0.02em' }}>
          Welcome back.
        </h1>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.88rem', color: '#4A4743', marginBottom: 30 }}>
          Sign in to your SupportOS account.
        </p>

        {/* Error */}
        {error && (
          <div style={{ background: '#FFF3E8', border: '1.5px solid #C8841A', borderRadius: 6, padding: '10px 14px', marginBottom: 20, fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', color: '#9B5E0A' }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', fontWeight: 600, color: '#0D0D0B', display: 'block', marginBottom: 6 }}>
              Email address
            </label>
            <input
              id="login-email"
              className="input-field"
              type="email"
              name="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', fontWeight: 600, color: '#0D0D0B', display: 'block', marginBottom: 6 }}>
              Password
            </label>
            <input
              id="login-password"
              className="input-field"
              type="password"
              name="password"
              placeholder="Your password"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 6, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Signing in…' : 'Sign in' }
          </button>
        </form>

        {/* Divider */}
        <div style={{ borderTop: '1.5px solid #D4CFC4', margin: '28px 0 20px' }} />

        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', color: '#4A4743', textAlign: 'center' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: '#0D0D0B', fontWeight: 600, textDecoration: 'underline' }}>
            Sign up free
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
