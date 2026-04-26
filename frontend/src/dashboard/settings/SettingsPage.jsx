// -----------------------------------------------------------------------------
// dashboard/settings/SettingsPage.jsx — Profile & Integration Settings
// -----------------------------------------------------------------------------

import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import api from '../../lib/api'

// SVG Icons
const icons = {
  check: <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>,
  copy: <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
}

export default function SettingsPage() {
  const { user } = useOutletContext()

  // Section 1: Profile
  const [name, setName] = useState(user?.name || '')
  const [profileSaving, setProfileSaving] = useState(false)

  // Section 2: Organisation
  const [orgName, setOrgName] = useState(user?.org_name || '')
  const [orgSaving, setOrgSaving] = useState(false)

  // Section 3: Integration
  const [activeTab, setActiveTab] = useState('html')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name)
      setOrgName(user.org_name)
    }
  }, [user])

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setProfileSaving(true)
    try {
      await api.patch('/settings/profile', { name })
      // A full page reload is easiest to trigger the AuthContext refresh of user data
      window.location.reload()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update profile')
    } finally {
      setProfileSaving(false)
    }
  }

  const handleSaveOrg = async (e) => {
    e.preventDefault()
    setOrgSaving(true)
    try {
      await api.patch('/settings/org', { name: orgName })
      window.location.reload()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update organisation')
    } finally {
      setOrgSaving(false)
    }
  }

  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  // Generate the actual snippet based on the org ID
  const scriptSnippet = `<script>
  window.SUPPORT_OS_ORG_ID = "${user?.org_id || 'YOUR_ORG_ID'}";
  window.SUPPORT_OS_USER_ID = "default"; // Optional: pass your user's primary key here
</script>
<script src="${backendUrl}/static/widget.js" async></script>`

  const reactSnippet = `import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    window.SUPPORT_OS_ORG_ID = "${user?.org_id || 'YOUR_ORG_ID'}";
    window.SUPPORT_OS_USER_ID = "default"; // Optional: pass your user's primary key here
    const script = document.createElement('script');
    script.src = "${backendUrl}/static/widget.js";
    script.async = true;
    document.body.appendChild(script);
    
    return () => document.body.removeChild(script);
  }, []);

  return <div>Your App</div>;
}`

  const nextJsSnippet = `import Script from 'next/script';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <script dangerouslySetInnerHTML={{
          __html: \`
            window.SUPPORT_OS_ORG_ID = "${user?.org_id || 'YOUR_ORG_ID'}";
            window.SUPPORT_OS_USER_ID = "default"; // Optional: pass your user's primary key here
          \`
        }} />
        <Script src="${backendUrl}/static/widget.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}`

  const handleCopy = () => {
    const text = activeTab === 'html' ? scriptSnippet
      : activeTab === 'react' ? reactSnippet
        : nextJsSnippet
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!user) return null

  let planDisplay = "Inactive"
  if (user.sub_status === 'active') {
    if (user.subscription_ends_at) {
      planDisplay = `Active (Ends: ${new Date(user.subscription_ends_at).toLocaleDateString()})`
    } else if (user.trial_ends_at) {
      planDisplay = `Free Trial (Ends: ${new Date(user.trial_ends_at).toLocaleDateString()})`
    } else {
      planDisplay = "Active"
    }
  } else {
    if (user.subscription_ends_at && new Date(user.subscription_ends_at) < new Date()) {
       planDisplay = `Expired (${new Date(user.subscription_ends_at).toLocaleDateString()})`
    } else if (user.trial_ends_at && new Date(user.trial_ends_at) < new Date()) {
       planDisplay = `Trial Expired (${new Date(user.trial_ends_at).toLocaleDateString()})`
    }
  }

  return (
    <div className="settings-page" style={s.page}>

      {/* ── Profile Settings ── */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>Profile</h2>
        <p style={s.sectionSub}>Manage your personal information</p>

        <form onSubmit={handleSaveProfile} style={s.card}>
          <div style={s.formGrid}>
            <div style={s.formGroup}>
              <label style={s.label}>Display Name</label>
              <input
                type="text"
                style={s.input}
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Email Address</label>
              <input type="email" style={s.inputDisabled} value={user.email} disabled />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Role</label>
              <input
                type="text"
                style={s.inputDisabled}
                value={user.role === 'owner' ? 'Owner / Admin' : 'Support Agent'}
                disabled
              />
            </div>
          </div>
          <div style={s.cardFooter}>
            <button type="submit" style={s.btnPrimary} disabled={profileSaving || name === user.name}>
              {profileSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </section>


      {/* ── Organisation Settings ── */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>Organisation</h2>
        <p style={s.sectionSub}>Manage your company details</p>

        <form onSubmit={handleSaveOrg} style={s.card}>
          <div style={s.formGrid}>
            <div style={s.formGroup}>
              <label style={s.label}>Organisation Name</label>
              <input
                type="text"
                style={user.role === 'owner' ? s.input : s.inputDisabled}
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                disabled={user.role !== 'owner'}
                required
              />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Organisation ID</label>
              <input type="text" style={s.inputDisabled} value={user.org_id} disabled />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Current Plan</label>
              <input type="text" style={s.inputDisabled} value={planDisplay} disabled />
            </div>
          </div>
          <div style={s.cardFooter}>
            {user.role === 'owner' ? (
              <button type="submit" style={s.btnPrimary} disabled={orgSaving || orgName === user.org_name}>
                {orgSaving ? 'Saving...' : 'Save Organisation'}
              </button>
            ) : (
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#94A3B8' }}>Only owners can edit organisation settings.</p>
            )}
          </div>
        </form>
      </section>

      {/* ── Support ── */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>Support</h2>
        <p style={s.sectionSub}>Need help with your plan or technical integration?</p>
        <div style={{...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div>
            <h4 style={{ margin: '0 0 4px', color: '#0F172A', fontSize: '0.95rem' }}>Direct Support</h4>
            <p style={{ margin: 0, color: '#64748B', fontSize: '0.85rem' }}>
              We're here to help. Contact us directly for priority support.
            </p>
          </div>
          <a href="mailto:support@supportos.com" style={s.btnSecondary}>
            support@supportos.com
          </a>
        </div>
      </section>


      {/* ── Widget Integration Guide ── */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>Widget Integration</h2>
        <p style={s.sectionSub}>Add the AI support widget to your application</p>

        <div style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={s.tabHeader}>
            {['html', 'react', 'nextjs'].map(tab => (
              <button
                key={tab}
                style={{ ...s.tabBtn, ...(activeTab === tab ? s.tabBtnActive : {}) }}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'html' ? 'Plain HTML' : tab === 'react' ? 'React (SPA)' : 'Next.js'}
              </button>
            ))}
          </div>

          <div style={s.guideContent}>
            <p style={{ margin: '0 0 16px', fontSize: '0.9rem', color: '#64748B' }}>
              {activeTab === 'html' && 'Paste this right before the closing </body> tag of your HTML file.'}
              {activeTab === 'react' && 'Add this inside a global layout or App.jsx using a useEffect hook.'}
              {activeTab === 'nextjs' && 'Add this to your RootLayout in Next.js 13+ App Router.'}
            </p>

            <div style={{ padding: '12px 16px', background: '#F1F5F9', borderRadius: 6, marginBottom: 16, fontSize: '0.85rem', color: '#475569' }}>
              <strong>Note on User IDs:</strong> If you pass your database's primary key into <code>window.SUPPORT_OS_USER_ID</code>, we will use it to name the ticket (e.g., "User: 12345"). If you leave it as <code>"default"</code>, we will automatically set the subject to "Ticket 1", "Ticket 2", etc.
            </div>

            <div style={s.codeBlockWrap}>
              <button onClick={handleCopy} style={s.copyBtn}>
                {copied ? <><span style={{ color: '#10B981' }}>{icons.check}</span> Copied</> : <>{icons.copy} Copy</>}
              </button>
              <pre style={s.codeBlock}>
                <code>
                  {activeTab === 'html' ? scriptSnippet : activeTab === 'react' ? reactSnippet : nextJsSnippet}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────

const s = {
  page: {
    padding: '32px 40px',
    maxWidth: 800,
    margin: '0 auto',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  section: {
    marginBottom: 48,
  },
  sectionTitle: {
    fontFamily: 'Syne, sans-serif',
    fontSize: '1.4rem',
    fontWeight: 700,
    color: '#0F172A',
    margin: '0 0 4px',
    letterSpacing: '-0.02em',
  },
  sectionSub: {
    fontSize: '0.9rem',
    color: '#64748B',
    margin: '0 0 20px',
  },
  card: {
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: 12,
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
  },
  formGrid: {
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#334155',
  },
  input: {
    padding: '10px 14px',
    border: '1px solid #CBD5E1',
    borderRadius: 8,
    fontSize: '0.95rem',
    fontFamily: 'inherit',
    color: '#0F172A',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  inputDisabled: {
    padding: '10px 14px',
    border: '1px solid #E2E8F0',
    borderRadius: 8,
    fontSize: '0.95rem',
    fontFamily: 'inherit',
    color: '#64748B',
    background: '#F8FAFC',
    cursor: 'not-allowed',
  },
  cardFooter: {
    padding: '16px 24px',
    background: '#F8FAFC',
    borderTop: '1px solid #E2E8F0',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  btnPrimary: {
    padding: '8px 20px',
    background: '#0F172A',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 8,
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  btnSecondary: {
    padding: '8px 20px',
    background: '#F1F5F9',
    color: '#0F172A',
    border: '1px solid #E2E8F0',
    borderRadius: 8,
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'background 0.2s',
  },

  // Widget Tab Styles
  tabHeader: {
    display: 'flex',
    background: '#F8FAFC',
    borderBottom: '1px solid #E2E8F0',
    padding: '0 8px',
  },
  tabBtn: {
    padding: '12px 16px',
    border: 'none',
    background: 'none',
    fontSize: '0.9rem',
    fontWeight: 500,
    color: '#64748B',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
  },
  tabBtnActive: {
    color: '#0F172A',
    borderBottom: '2px solid #6366F1',
  },
  guideContent: {
    padding: 24,
  },
  codeBlockWrap: {
    position: 'relative',
    background: '#0F172A',
    borderRadius: 8,
    padding: '16px',
  },
  copyBtn: {
    position: 'absolute',
    top: 12, right: 12,
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: '#E2E8F0',
    padding: '6px 10px',
    borderRadius: 6,
    fontSize: '0.8rem',
    display: 'flex', alignItems: 'center', gap: 6,
    cursor: 'pointer',
  },
  codeBlock: {
    margin: 0,
    color: '#E2E8F0',
    fontSize: '0.85rem',
    fontFamily: 'ui-monospace, Consolas, monospace',
    lineHeight: 1.5,
    overflowX: 'auto',
  }
}
