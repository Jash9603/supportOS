// components/landing/HowItWorks.jsx
// Screen 3 (min-100vh, white bg): 3-step explainer + closing CTA.

import { Link } from 'react-router-dom'

const STEPS = [
  {
    n: '01',
    title: 'Upload your docs',
    body: 'Drop in your FAQs, product guides, or any PDF. SupportOS learns your product instantly.',
  },
  {
    n: '02',
    title: 'Drop the widget',
    body: 'One line of code on your site. No engineering sprint required.',
  },
  {
    n: '03',
    title: 'AI handles the rest',
    body: 'Customers get instant answers. Complex issues escalate to your inbox — with full context.',
  },
]

export default function HowItWorks() {
  return (
    <section
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px 5%',
        borderTop: '1.5px solid #D4CFC4',
        background: '#FFFFFF',
      }}
    >
      <h2
        style={{
          fontFamily: '"Plus Jakarta Sans", sans-serif',
          fontWeight: 800,
          fontSize: 'clamp(1.8rem, 4vw, 3rem)',
          textAlign: 'center',
          marginBottom: 64,
          color: '#0D0D0B',
          letterSpacing: '-0.025em',
        }}
      >
        Up and running in an afternoon.
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 48,
          maxWidth: 960,
          margin: '0 auto',
          width: '100%',
        }}
      >
        {STEPS.map(({ n, title, body }) => (
          <div key={n} style={{ borderTop: '3px solid #0D0D0B', paddingTop: 24 }}>
            <span
              style={{
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                fontWeight: 800,
                fontSize: '2.8rem',
                color: '#E4E0D8',
                display: 'block',
                marginBottom: 14,
              }}
            >
              {n}
            </span>
            <h3
              style={{
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                fontWeight: 700,
                fontSize: '1.15rem',
                marginBottom: 12,
                color: '#0D0D0B',
              }}
            >
              {title}
            </h3>
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.95rem',
                color: '#4A4743',
                lineHeight: 1.75,
              }}
            >
              {body}
            </p>
          </div>
        ))}
      </div>

      {/* ── Closing CTA block ──────────────────────────────────────────────── */}
      <div
        style={{
          marginTop: 80,
          paddingTop: 56,
          borderTop: '1.5px solid #E8E3D8',
          textAlign: 'center',
          maxWidth: 560,
          margin: '80px auto 0',
          width: '100%',
        }}
      >
        <p
          style={{
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(1.4rem, 2.5vw, 2rem)',
            color: '#0D0D0B',
            marginBottom: 10,
            letterSpacing: '-0.02em',
          }}
        >
          Your support inbox shouldn't be a source of stress.
        </p>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', color: '#6A6661', marginBottom: 28, lineHeight: 1.6 }}>
          Join teams who stopped losing customers to slow replies.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <Link to="/signup" className="btn-primary">Start for free →</Link>
          <Link to="/login"  className="btn-outline">I have an account</Link>
        </div>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#B0ABA3', letterSpacing: '0.01em' }}>
          No credit card required &nbsp;&middot;&nbsp; Free for first 500 tickets
        </p>
      </div>

    </section>
  )
}
