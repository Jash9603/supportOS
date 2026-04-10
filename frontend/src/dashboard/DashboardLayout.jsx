// -----------------------------------------------------------------------------
// dashboard/DashboardLayout.jsx — App Shell (Sidebar + Top Nav + Content)
// -----------------------------------------------------------------------------
//
// WHAT IS THIS?
// This is the "frame" that wraps every dashboard page. Like a picture frame
// that stays the same while the picture inside changes.
//
// STRUCTURE:
// ┌──────────────┬──────────────────────────────────────┐
// │ SupportOS    │  [Page Title]              [🔔] [👤] │  ← Top Header
// │──────────────│──────────────────────────────────────│
// │ ○ Overview   │                                      │
// │ ● Inbox      │         <Outlet />                   │  ← Child page
// │ ○ Analytics  │         (Overview, Inbox, etc.)      │
// │ ○ Chatbot    │                                      │
// │ ○ Settings   │                                      │
// │              │                                      │
// │ [user name]  │                                      │
// │ [org name]   │                                      │
// │ [Logout]     │                                      │
// └──────────────┴──────────────────────────────────────┘
//
// WHY useOutletContext?
//   ProtectedRoute fetches the user from GET /auth/me and passes
//   it down via React Router's Outlet context. We grab it here
//   to display the user's name and org.
// -----------------------------------------------------------------------------

import { NavLink, Outlet, useNavigate, useOutletContext, useLocation } from 'react-router-dom'
import { authApi } from '../lib/api'

// ── SVG Icons (inline, no dependency needed) ────────────────────────────────
// These are simple SVG paths so we don't need to install lucide-react for MVP.
const icons = {
  overview: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  inbox: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-6l-2 3H10l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  ),
  analytics: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  chatbot: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  bell: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  logout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
}

// ── Navigation items config ─────────────────────────────────────────────────
// Adding a new page? Just add it here — the sidebar builds itself from this.
const navItems = [
  { to: '/dashboard/overview',  label: 'Overview',  icon: icons.overview },
  { to: '/dashboard/inbox',     label: 'Inbox',     icon: icons.inbox },
  { to: '/dashboard/analytics', label: 'Analytics', icon: icons.analytics },
  { to: '/dashboard/chatbot',   label: 'Chatbot',   icon: icons.chatbot },
  { to: '/dashboard/settings',  label: 'Settings',  icon: icons.settings },
]

// ── Map route segments to page titles for the top header ─────────────────────
const pageTitles = {
  overview: 'Overview',
  inbox: 'Inbox',
  analytics: 'Analytics',
  chatbot: 'Chatbot',
  settings: 'Settings',
}

export default function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useOutletContext()

  // Extract current page name from URL: /dashboard/inbox → "inbox"
  const currentSegment = location.pathname.split('/').pop()
  const pageTitle = pageTitles[currentSegment] || 'Dashboard'

  const handleLogout = async () => {
    try {
      await authApi.logout()
      navigate('/login')
    } catch (err) {
      console.error('Logout failed', err)
    }
  }

  return (
    <div style={styles.shell}>
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SIDEBAR (240px, dark slate)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <aside style={styles.sidebar}>

        {/* ── Logo ────────────────────────────────────────────── */}
        <div style={styles.logoWrap}>
          <span style={styles.logoText}>
            Support<span style={{ color: '#F59E0B' }}>OS</span>
          </span>
        </div>

        {/* ── Navigation Links ────────────────────────────────── */}
        <nav style={styles.nav}>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} style={({ isActive }) => ({
              ...styles.navLink,
              color: isActive ? '#FFFFFF' : '#94A3B8',
              background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
              borderLeft: isActive ? '3px solid #6366F1' : '3px solid transparent',
            })}>
              <span style={styles.navIcon}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* ── User Profile + Logout (pinned to bottom) ────────── */}
        <div style={styles.userSection}>
          {/* Avatar circle with initials */}
          <div style={styles.avatar}>
            {(user?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={styles.userName}>{user?.name || 'User'}</div>
            <div style={styles.userOrg}>{user?.org_name || 'Organisation'}</div>
          </div>
          <button
            onClick={handleLogout}
            style={styles.logoutBtn}
            title="Sign out"
            onMouseOver={(e) => { e.currentTarget.style.color = '#EF4444' }}
            onMouseOut={(e) => { e.currentTarget.style.color = '#64748B' }}
          >
            {icons.logout}
          </button>
        </div>
      </aside>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MAIN AREA (top header + scrollable content)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={styles.mainArea}>

        {/* ── Top Header Bar ──────────────────────────────────── */}
        <header style={styles.topBar}>
          <h1 style={styles.pageTitle}>{pageTitle}</h1>
          <div style={styles.topBarRight}>
            {/* Notification bell */}
            <button style={styles.bellBtn} title="Notifications">
              {icons.bell}
              {/* Unread dot (hidden for now — Phase 4 will populate) */}
              <span style={styles.bellDot} />
            </button>
            {/* User avatar (small) */}
            <div style={styles.topAvatar}>
              {(user?.name || 'U').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* ── Page Content (scrollable) ───────────────────────── */}
        <main style={styles.content}>
          <Outlet context={{ user }} />
        </main>
      </div>
    </div>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  shell: {
    display: 'flex',
    height: '100vh',
    background: '#F8FAFC',
    fontFamily: 'Inter, system-ui, sans-serif',
  },

  // Sidebar
  sidebar: {
    width: 240,
    background: '#0F172A',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    borderRight: '1px solid #1E293B',
  },
  logoWrap: {
    padding: '24px 20px 28px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontFamily: 'Syne, sans-serif',
    fontWeight: 800,
    fontSize: '1.2rem',
    color: '#FFFFFF',
    letterSpacing: '-0.02em',
  },
  badge: {
    fontSize: '0.55rem',
    fontWeight: 700,
    color: '#94A3B8',
    background: '#1E293B',
    padding: '2px 6px',
    borderRadius: 4,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  nav: {
    flex: 1,
    padding: '0 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    borderRadius: 6,
    textDecoration: 'none',
    fontSize: '0.88rem',
    fontWeight: 500,
    transition: 'all 0.15s ease',
  },
  navIcon: {
    display: 'flex',
    alignItems: 'center',
    opacity: 0.8,
  },

  // User section
  userSection: {
    padding: '16px',
    borderTop: '1px solid #1E293B',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    background: '#6366F1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '0.85rem',
    flexShrink: 0,
  },
  userName: {
    fontSize: '0.84rem',
    fontWeight: 600,
    color: '#E2E8F0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userOrg: {
    fontSize: '0.72rem',
    color: '#64748B',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  logoutBtn: {
    background: 'none',
    border: 'none',
    color: '#64748B',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.2s',
    flexShrink: 0,
  },

  // Main area
  mainArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  topBar: {
    height: 60,
    padding: '0 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#FFFFFF',
    borderBottom: '1px solid #E2E8F0',
    flexShrink: 0,
  },
  pageTitle: {
    fontFamily: 'Syne, sans-serif',
    fontWeight: 700,
    fontSize: '1.15rem',
    color: '#0F172A',
    letterSpacing: '-0.01em',
    margin: 0,
  },
  topBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  bellBtn: {
    position: 'relative',
    background: 'none',
    border: 'none',
    color: '#64748B',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: '#EF4444',
    border: '2px solid #FFFFFF',
  },
  topAvatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: '#6366F1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '0.8rem',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: 0,
  },
}
