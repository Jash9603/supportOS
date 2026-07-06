import { useState, useEffect } from 'react'
import api, { authApi } from '../lib/api'

export default function BillingGate({ user, isRenew }) {
  const [referralCode, setReferralCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [error, setError] = useState('')

  // Note: Post-payment activation is handled by Overview.jsx
  // which detects the redirect query params and calls /auth/activate-subscription

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

  // Generate Dodo Payments Checkout session
  const handleSubscribe = async (planType) => {
    setLoadingPlan(planType)
    setError('')
    try {
      const payload = {
        plan: planType,
        success_url: `${window.location.origin}/dashboard?status=succeeded&plan=${planType}`,
        cancel_url: `${window.location.origin}/dashboard?status=failed`
      }

      const res = await api.post('/billing/create-checkout', payload)

      if (res.data && res.data.checkout_url) {
        window.location.href = res.data.checkout_url
      } else {
        setError('Checkout URL not returned from the server.')
      }

    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || "Failed to initiate payment. Please try again later.")
    } finally {
      if (loadingPlan !== 'succeeded') {
        setLoadingPlan(null)
      }
    }
  }

  return (
    <div className="billing-overlay" style={styles.overlay}>
      <div className="billing-card" style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>{isRenew ? "Subscription Expired" : "Activate Your Account"}</h1>
          <p style={styles.subtitle}>
            {isRenew 
              ? "Your access to SupportOS has expired. To regain access to your dashboard and chat widgets, please renew your plan below." 
              : "Welcome to SupportOS! To access your dashboard, select a plan below. All plans include a 7-day free trial."}
          </p>
        </div>

        <div className="billing-plans" style={styles.plansContainer}>

          {/* ────── STARTER PLAN ────── */}
          <div style={styles.planCard}>
            <h3 style={{ margin: 0, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Starter</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748B' }}>1,000 Tickets / month</p>
            <h2 style={{ margin: '16px 0 8px', fontSize: '2rem' }}>$29<span style={{ fontSize: '1rem', color: '#64748B' }}>/mo</span></h2>

            <div style={{ marginTop: 24 }}>
              <button
                onClick={() => handleSubscribe('starter')}
                disabled={loadingPlan !== null}
                style={{ 
                  ...styles.btn, 
                  background: '#0D0D0B', 
                  color: 'white', 
                  display: 'block', 
                  opacity: loadingPlan ? 0.7 : 1 
                }}
              >
                {loadingPlan === 'succeeded' ? 'Verifying Checkout...' : loadingPlan === 'starter' ? 'Loading...' : 'Subscribe'}
              </button>
            </div>
          </div>

          {/* ────── GROWTH PLAN ────── */}
          <div style={styles.planCard}>
            <h3 style={{ margin: 0, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Growth</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748B' }}>5,000 Tickets / month</p>
            <h2 style={{ margin: '16px 0 8px', fontSize: '2rem' }}>$99<span style={{ fontSize: '1rem', color: '#64748B' }}>/mo</span></h2>

            <div style={{ marginTop: 24 }}>
              <button
                onClick={() => handleSubscribe('growth')}
                disabled={loadingPlan !== null}
                style={{ 
                  ...styles.btn, 
                  background: '#6366F1', 
                  color: 'white', 
                  border: 'none', 
                  display: 'block', 
                  opacity: loadingPlan ? 0.7 : 1 
                }}
              >
                {loadingPlan === 'succeeded' ? 'Verifying Checkout...' : loadingPlan === 'growth' ? 'Loading...' : 'Subscribe'}
              </button>
            </div>
          </div>

        </div>

        {error && (
          <div style={{ marginTop: 16, color: '#E11D48', fontSize: '0.85rem', textAlign: 'center', background: '#FFF1F2', padding: 8, borderRadius: 6 }}>
            {error}
          </div>
        )}

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
              disabled={loading || loadingPlan !== null}
              style={{ ...styles.btn, width: 'auto', background: 'transparent', color: '#0D0D0B' }}
            >
              {loading ? '...' : 'Apply'}
            </button>
          </div>
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
  title: { fontSize: '1.5rem', fontWeight: 700, margin: '0 0 12px', color: '#0D0D0B', fontFamily: '"Plus Jakarta Sans", sans-serif' },
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