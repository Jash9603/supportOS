// components/landing/ContactSection.jsx
// Contact form section at the bottom of the landing page.
// Sends form data to POST /contact/submit - email notification to the team.

import { useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function ContactSection() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [responseMsg, setResponseMsg] = useState('')

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return

    setStatus('sending')
    try {
      const res = await fetch(`${API_URL}/contact/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('sent')
        setResponseMsg(data.message || 'Thank you! We\'ll get back to you soon.')
        setForm({ name: '', email: '', message: '' })
      } else {
        setStatus('error')
        setResponseMsg('Something went wrong. Please try again.')
      }
    } catch {
      setStatus('error')
      setResponseMsg('Network error. Please try again later.')
    }
  }

  return (
    <section style={s.section}>
      <div className="contact-section-grid" style={s.container}>
        {/* Left: Info */}
        <div style={s.infoSide}>
          <h2 style={s.title}>Get in touch</h2>
          <p style={s.description}>
            Have a question, feedback, or want to learn more about SupportOS?
            Drop us a message and we'll get back to you quickly.
          </p>

          <div style={s.infoItems}>
            <div style={s.infoItem}>
              <div style={s.infoIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <div>
                <div style={s.infoLabel}>Email us</div>
                <div style={s.infoValue}>jashkevdiya@gmail.com</div>
              </div>
            </div>

            <div style={s.infoItem}>
              <div style={s.infoIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div>
                <div style={s.infoLabel}>Response time</div>
                <div style={s.infoValue}>Within 24 hours</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Form */}
        <div style={s.formSide}>
          {status === 'sent' ? (
            <div style={s.successCard}>
              <div style={s.successIcon}>✓</div>
              <h3 style={s.successTitle}>Message sent!</h3>
              <p style={s.successText}>{responseMsg}</p>
              <button
                onClick={() => setStatus('idle')}
                style={s.sendAnother}
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={s.form}>
              <div style={s.fieldGroup}>
                <label htmlFor="contact-name" style={s.label}>Name</label>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  required
                  placeholder="Your name"
                  value={form.name}
                  onChange={handleChange}
                  style={s.input}
                />
              </div>

              <div style={s.fieldGroup}>
                <label htmlFor="contact-email" style={s.label}>Email</label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={handleChange}
                  style={s.input}
                />
              </div>

              <div style={s.fieldGroup}>
                <label htmlFor="contact-message" style={s.label}>Message</label>
                <textarea
                  id="contact-message"
                  name="message"
                  required
                  rows={4}
                  placeholder="Tell us what you're looking for..."
                  value={form.message}
                  onChange={handleChange}
                  style={{ ...s.input, resize: 'vertical', minHeight: 100 }}
                />
              </div>

              {status === 'error' && (
                <p style={s.errorText}>{responseMsg}</p>
              )}

              <button
                type="submit"
                disabled={status === 'sending'}
                style={{
                  ...s.submitBtn,
                  opacity: status === 'sending' ? 0.6 : 1,
                }}
              >
                {status === 'sending' ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={s.spinner} />
                    Sending...
                  </span>
                ) : (
                  'Send Message'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}


// ── Styles ──────────────────────────────────────────────────────────────────
const s = {
  section: {
    padding: '80px 5%',
    borderTop: '1.5px solid #D4CFC4',
    background: '#F5F0E8',
  },
  container: {
    maxWidth: 960,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1fr 1.2fr',
    gap: 60,
    alignItems: 'start',
  },

  // Left side
  infoSide: {},
  title: {
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    fontWeight: 800,
    fontSize: 'clamp(1.8rem, 3vw, 2.4rem)',
    color: '#0D0D0B',
    letterSpacing: '-0.025em',
    marginBottom: 16,
  },
  description: {
    fontFamily: 'Inter, sans-serif',
    fontSize: '0.95rem',
    color: '#4A4743',
    lineHeight: 1.75,
    marginBottom: 32,
  },
  infoItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  infoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: '#FFFFFF',
    border: '1.5px solid #D4CFC4',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: '#0D0D0B',
  },
  infoLabel: {
    fontFamily: 'Inter, sans-serif',
    fontSize: '0.72rem',
    color: '#ABA89E',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 2,
  },
  infoValue: {
    fontFamily: 'Inter, sans-serif',
    fontSize: '0.9rem',
    color: '#0D0D0B',
    fontWeight: 500,
  },

  // Right side
  formSide: {},
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontFamily: 'Inter, sans-serif',
    fontSize: '0.78rem',
    fontWeight: 600,
    color: '#0D0D0B',
  },
  input: {
    padding: '11px 14px',
    borderRadius: 8,
    border: '1.5px solid #D4CFC4',
    background: '#FFFFFF',
    fontSize: '0.88rem',
    fontFamily: 'Inter, sans-serif',
    color: '#0D0D0B',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
    width: '100%',
  },
  submitBtn: {
    padding: '12px 28px',
    background: '#0D0D0B',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 8,
    fontSize: '0.88rem',
    fontWeight: 600,
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    cursor: 'pointer',
    transition: 'opacity 0.2s, transform 0.15s',
    alignSelf: 'flex-start',
  },
  errorText: {
    fontFamily: 'Inter, sans-serif',
    fontSize: '0.8rem',
    color: '#DC2626',
    margin: 0,
  },

  // Success state
  successCard: {
    textAlign: 'center',
    padding: '48px 32px',
    background: '#FFFFFF',
    border: '1.5px solid #D4CFC4',
    borderRadius: 12,
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: '#F0FDF6',
    border: '2px solid #2D6A4F',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    fontSize: '1.4rem',
    color: '#2D6A4F',
    fontWeight: 800,
  },
  successTitle: {
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    fontWeight: 800,
    fontSize: '1.3rem',
    color: '#0D0D0B',
    marginBottom: 8,
  },
  successText: {
    fontFamily: 'Inter, sans-serif',
    fontSize: '0.9rem',
    color: '#4A4743',
    lineHeight: 1.6,
    marginBottom: 24,
  },
  sendAnother: {
    padding: '10px 24px',
    background: 'transparent',
    color: '#0D0D0B',
    border: '1.5px solid #D4CFC4',
    borderRadius: 8,
    fontSize: '0.82rem',
    fontWeight: 600,
    fontFamily: 'Inter, sans-serif',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  spinner: {
    display: 'inline-block',
    width: 14,
    height: 14,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#FFFFFF',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite',
  },
}
