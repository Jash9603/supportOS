// components/landing/HeroSection.jsx
// Screen 1 (100vh): Large headline, subtitle, CTA buttons, animated scroll hint.

import { Link } from 'react-router-dom'
import Navbar from '../layout/Navbar'

export default function HeroSection() {
  return (
    <section
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <Navbar />

      {/* Vertically centred hero content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 5% 48px',
          textAlign: 'center',
          animation: 'fadeInUp 0.65s ease both',
        }}
      >
        <h1
          style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(2rem, 3.5vw, 3.5rem)',
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            color: '#0D0D0B',
            maxWidth: 860,
            marginBottom: 18,
          }}
        >
          Every customer question<br />deserves an instant answer.
        </h1>

        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 'clamp(0.9rem, 1.6vw, 1.05rem)',
            color: '#4A4743',
            maxWidth: 460,
            marginBottom: 32,
            lineHeight: 1.75,
          }}
        >
          Every unanswered ticket after hours is a canceled subscription.<br />
          Your AI support agent handles them at 2am so you don't have to.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/signup" className="btn-primary">Start for free →</Link>
          <Link to="/login"  className="btn-outline">I have an account</Link>
        </div>

        {/* Micro-copy — removes pre-click objection */}
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.72rem',
          color: '#B0ABA3',
          marginTop: 12,
          letterSpacing: '0.01em',
        }}>
          No credit card required &nbsp;&middot;&nbsp; Free for first 500 tickets
        </p>
      </div>

      {/* Bouncing scroll indicator */}
      <div className="scroll-hint">
        <svg width="22" height="34" viewBox="0 0 22 34" fill="none">
          <rect x="1" y="1" width="20" height="32" rx="10" stroke="#C0BAB2" strokeWidth="1.5" />
          <rect x="9.25" y="7" width="3.5" height="8" rx="1.75" fill="#C0BAB2">
            <animate attributeName="y" values="7;14;7" dur="1.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.1;1" dur="1.6s" repeatCount="indefinite" />
          </rect>
        </svg>
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.6rem',
            color: '#C8C4BC',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          scroll
        </span>
      </div>
    </section>
  )
}
