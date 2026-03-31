// dashboard/DashboardLayout.jsx
// Main structural shell for the app (Sidebar + Content).

import { NavLink, Outlet, useNavigate, useOutletContext } from 'react-router-dom'
import { authApi } from '../lib/api'

export default function DashboardLayout() {
  const navigate = useNavigate()
  const { user } = useOutletContext() // Provided by ProtectedRoute

  const handleLogout = async () => {
    try {
      await authApi.logout()
      navigate('/login')
    } catch (err) {
      console.error('Logout failed', err)
    }
  }

  // Helper for NavLink active styling
  const navStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    padding: '10px 16px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontFamily: 'Inter, sans-serif',
    fontSize: '0.88rem',
    fontWeight: 500,
    color: isActive ? '#FFFFFF' : '#94A3B8',
    background: isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
    borderLeft: isActive ? '3px solid #6366F1' : '3px solid transparent',
    transition: 'all 0.2s',
    marginBottom: '4px',
  })

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#FAFAFA' }}>
      {/* ── Sidebar (240px fixed) ───────────────────────────────────────── */}
      <aside
        style={{
          width: '240px',
          background: '#0F172A',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        {/* Logo area */}
        <div style={{ padding: '24px 20px 32px' }}>
          <span
            style={{
              fontFamily: 'Syne, sans-serif',
              fontWeight: 800,
              fontSize: '1.25rem',
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
            }}
          >
            Support<span style={{ color: '#F59E0B' }}>OS</span>
          </span>
        </div>

        {/* Navigation Map */}
        <nav style={{ flex: 1, padding: '0 12px' }}>
          <NavLink to="/dashboard/overview" style={navStyle}>
            Overview
          </NavLink>
          <NavLink to="/dashboard/inbox" style={navStyle}>
            Inbox
          </NavLink>
          <NavLink to="/dashboard/analytics" style={navStyle}>
            Analytics
          </NavLink>
          <NavLink to="/dashboard/chatbot" style={navStyle}>
            Chatbot
          </NavLink>
          <NavLink to="/dashboard/settings" style={navStyle}>
            Settings
          </NavLink>
        </nav>

        {/* User profile & Logout area (bottom) */}
        <div style={{ padding: '16px', borderTop: '1px solid #1E293B' }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', fontWeight: 600, color: '#E2E8F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'User'}
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.org_name || 'Organisation'}
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'transparent',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#94A3B8',
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.8rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.borderColor = '#475569' }}
            onMouseOut={(e) => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.borderColor = '#334155' }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main Content Area (flex-1) ─────────────────────────────────── */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
