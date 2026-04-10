import { useState, useEffect } from 'react'
import api, { authApi } from '../lib/api'

export default function BillingGate({ user }) {
  const [referralCode, setReferralCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Automatically check if the backend webhook updated the account
  useEffect(() => {
    const intervalId = setInterval(async () => {
      try {
        const res = await authApi.me()
        if (res.data.sub_status === 'active') {
          window.location.reload()
        }
      } catch (err) {
        // Ignore
      }
    }, 3000)
    return () => clearInterval(intervalId)
  }, [])

  const handleApplyReferral = async () => {
    if (!referralCode.trim()) return
    setLoading(true)
    setError('')
    try {
      await api.post('/billing/referral', { code: referralCode })
      window.location.reload()
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid code")
    } finally {
      setLoading(false)
    }
  }

  // Replace with your actual Lemon Squeezy checkout URLs for the specific plan variants
  const getCheckoutUrl = (variantId) => {
    // We attach the user's org_id as custom_data so the webhook knows who paid
    return `https://ontaraai.lemonsqueezy.com/checkout/buy/${variantId}?checkout[custom][org_id]=${user.org_id}`
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Activate Your Account</h1>
          <p style={styles.subtitle}>
            Welcome to Support<b>OS</b>! To access your dashboard, select a plan below.
            All plans include a 7-day free trial.
          </p>
        </div>

        <div style={styles.plansContainer}>

          {/* ────── MONTHLY PLAN ────── */}
          <div style={styles.planCard}>
            <h3 style={{ margin: 0 }}>Monthly</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748B' }}>$19/month</p>

            <div style={{ marginTop: 24 }}>
              <a
                href={getCheckoutUrl("159a4153-f869-4300-8aa6-c02f6786e32e")}
                style={{ ...styles.btn, background: '#0D0D0B', color: 'white', display: 'block', textDecoration: 'none' }}
              >
                Subscribe
              </a>
            </div>
          </div>

          {/* ────── YEARLY PLAN ────── */}
          <div style={styles.planCard}>
            <h3 style={{ margin: 0 }}>Yearly</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748B' }}>$199/year (Save 12%)</p>

            <div style={{ marginTop: 24 }}>
              <a
                href={getCheckoutUrl("f675d8b0-9f96-47d1-89ec-7c135e38ed2b")}
                style={{ ...styles.btn, background: '#C8841A', color: 'white', border: 'none', display: 'block', textDecoration: 'none' }}
              >
                Subscribe
              </a>
            </div>
          </div>

        </div>

        <div style={styles.referralContainer}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Referral Code"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              style={styles.input}
            />
            <button
              onClick={handleApplyReferral}
              disabled={loading}
              style={{ ...styles.btn, width: 'auto', background: 'transparent', color: '#0D0D0B' }}
            >
              {loading ? '...' : 'Apply'}
            </button>
          </div>
          {error && <p style={{ color: '#E11D48', fontSize: '0.75rem', marginTop: 4, margin: 0 }}>{error}</p>}
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    background: '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999,
  },
  card: {
    background: '#FFFFFF', padding: 40, borderRadius: 16,
    width: '100%', maxWidth: 550, boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
    border: '1.5px solid #D4CFC4',
    fontFamily: 'Inter, sans-serif'
  },
  header: { textAlign: 'center', marginBottom: 32 },
  title: { fontSize: '1.5rem', fontWeight: 700, margin: '0 0 12px', color: '#0D0D0B', fontFamily: 'Syne, sans-serif' },
  subtitle: { fontSize: '0.95rem', color: '#4A4743', lineHeight: 1.5, margin: 0 },
  plansContainer: {
    display: 'flex', gap: 20, justifyContent: 'space-between', '@media (maxwidth: 600px)': { flexDirection: 'column' }
  },
  planCard: {
    background: '#F8FAFC', border: '1px solid #E2E8F0', padding: 24,
    borderRadius: 8, textAlign: 'center', flex: 1,
  },
  btn: {
    width: '100%', padding: '12px 16px', borderRadius: 6, fontWeight: 600,
    fontSize: '0.95rem', cursor: 'pointer', border: '1px solid #0D0D0B',
    transition: 'opacity 0.2s', boxSizing: 'border-box'
  },
  referralContainer: {
    marginTop: 32,
    paddingTop: 24,
    borderTop: '1px solid #E2E8F0',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: 6,
    border: '1px solid #D4CFC4',
    fontSize: '0.95rem',
    fontFamily: 'Inter, sans-serif',
    outline: 'none',
  },
}