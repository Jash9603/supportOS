import { useState, useEffect } from 'react'
import api, { authApi } from '../lib/api'

export default function BillingGate({ user, isRenew }) {
  const [referralCode, setReferralCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [error, setError] = useState('')

  // Automatically check if the backend webhook updated the account
  useEffect(() => {
    // 1. Process URL Query Params from Dodo Payments Redirect
    const timer = setTimeout(() => {
      const params = new URLSearchParams(window.location.search)
      const status = params.get('status')
      
      if (status === 'succeeded') {
        setError('')
        setLoadingPlan('succeeded') // Hijack this state as a visually pleasing loader
      } else if (status === 'failed' || status === 'user_droped') {
        setError('Payment was cancelled or failed. Please try again.')
      }

      // Cleanup query params so it doesn't persist on refresh
      if (status) {
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }, 100)

    // 2. Poll Database for Webhook completion (max 5 times = 15 seconds)
    let pollCount = 0
    const intervalId = setInterval(async () => {
      pollCount++
      if (pollCount > 5) {
        clearInterval(intervalId)
        setLoadingPlan(null) // Break the infinite loader
        setError('We could not verify your payment. If your card was charged, please contact support or try again.')
        return
      }

      try {
        const res = await authApi.me()
        if (res.data.sub_status === 'active' && new Date(res.data.subscription_ends_at || res.data.trial_ends_at) > new Date()) {
          window.location.reload()
        }
      } catch (err) {
        // Ignore network errors but allow the timeout block above to eventually kill it
      }
    }, 3000)

    return () => {
      clearInterval(intervalId)
      clearTimeout(timer)
    }
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

  // Generate Dodo Payments Checkout session
  const handleSubscribe = async (planType) => {
    setLoadingPlan(planType)
    setError('')
    try {
      const payload = {
        plan: planType,
        success_url: `${window.location.origin}/dashboard?status=succeeded`,
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

          {/* ────── MONTHLY PLAN ────── */}
          <div style={styles.planCard}>
            <h3 style={{ margin: 0, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Monthly</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748B' }}>$19/month</p>

            <div style={{ marginTop: 24 }}>
              <button
                onClick={() => handleSubscribe('monthly')}
                disabled={loadingPlan !== null}
                style={{ 
                  ...styles.btn, 
                  background: '#0D0D0B', 
                  color: 'white', 
                  display: 'block', 
                  opacity: loadingPlan ? 0.7 : 1 
                }}
              >
                {loadingPlan === 'succeeded' ? 'Verifying Checkout...' : loadingPlan === 'monthly' ? 'Loading...' : 'Subscribe'}
              </button>
            </div>
          </div>

          {/* ────── YEARLY PLAN ────── */}
          <div style={styles.planCard}>
            <h3 style={{ margin: 0, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Yearly</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748B' }}>$199/year (Save 12%)</p>

            <div style={{ marginTop: 24 }}>
              <button
                onClick={() => handleSubscribe('yearly')}
                disabled={loadingPlan !== null}
                style={{ 
                  ...styles.btn, 
                  background: '#C8841A', 
                  color: 'white', 
                  border: 'none', 
                  display: 'block', 
                  opacity: loadingPlan ? 0.7 : 1 
                }}
              >
                {loadingPlan === 'succeeded' ? 'Verifying Checkout...' : loadingPlan === 'yearly' ? 'Loading...' : 'Subscribe'}
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