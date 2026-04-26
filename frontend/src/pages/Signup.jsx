// pages/Signup.jsx — Signup page
// Creates a new organisation + owner account.
// On success: server sets httpOnly cookie, redirects to /dashboard.
// 4 fields: Name, Organisation name, Email, Password.

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../lib/api'
import AuthLayout from '../components/layout/AuthLayout'

export default function Signup() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', org_name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    try {
      await authApi.signup(form)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="auth-card" style={{ animation: 'fadeInUp 0.5s ease forwards', maxWidth: 460 }}>

        {/* Heading */}
        <h1 style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 800, fontSize: '1.8rem', marginBottom: 6, color: '#0D0D0B', letterSpacing: '-0.02em' }}>
          Get started free.
        </h1>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.88rem', color: '#4A4743', marginBottom: 30 }}>
          Set up your AI support agent in minutes.
        </p>

        {/* Error */}
        {error && (
          <div style={{ background: '#FFF3E8', border: '1.5px solid #C8841A', borderRadius: 6, padding: '10px 14px', marginBottom: 20, fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', color: '#9B5E0A' }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', fontWeight: 600, color: '#0D0D0B', display: 'block', marginBottom: 6 }}>
                Your name
              </label>
              <input
                id="signup-name"
                className="input-field"
                type="text"
                name="name"
                placeholder="Jash Patel"
                value={form.name}
                onChange={handleChange}
                required
                autoComplete="name"
              />
            </div>
            <div>
              <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', fontWeight: 600, color: '#0D0D0B', display: 'block', marginBottom: 6 }}>
                Organisation
              </label>
              <input
                id="signup-org"
                className="input-field"
                type="text"
                name="org_name"
                placeholder="Acme Corp"
                value={form.org_name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', fontWeight: 600, color: '#0D0D0B', display: 'block', marginBottom: 6 }}>
              Work email
            </label>
            <input
              id="signup-email"
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
              Password <span style={{ color: '#ABA89E', fontWeight: 400 }}>(min. 8 characters)</span>
            </label>
            <input
              id="signup-password"
              className="input-field"
              type="password"
              name="password"
              placeholder="Create a strong password"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
          </div>

          <button
            id="signup-submit"
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 6, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Creating account…' : 'Create account →'}
          </button>
        </form>

        {/* T&C note */}
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#ABA89E', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
          By signing up you agree to our Terms of Service.
        </p>

        {/* Divider */}
        <div style={{ borderTop: '1.5px solid #D4CFC4', margin: '20px 0 18px' }} />

        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', color: '#4A4743', textAlign: 'center' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#0D0D0B', fontWeight: 600, textDecoration: 'underline' }}>
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
