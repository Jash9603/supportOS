// components/landing/HeroSection.jsx
// Screen 1 (100vh): Large headline, subtitle, CTA buttons, animated scroll hint.

import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function HeroSection() {
  const [isMuted, setIsMuted] = useState(true)
  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = 0.5 // Force 50% volume for the music
    }
  }, [])
  return (
    <section
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        paddingBottom: 60,
      }}
    >

      {/* Hero content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 5% 48px',
          textAlign: 'center',
          animation: 'fadeInUp 0.65s ease both',
        }}
      >
        <h1
          style={{
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(2rem, 3.5vw, 3.5rem)',
            lineHeight: 1.15,
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
          <Link to="/signup" className="btn-primary">Start for free</Link>
          <Link to="/login" className="btn-outline">I have an account</Link>
        </div>

        {/* Micro-copy - removes pre-click objection */}
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.72rem',
          color: '#B0ABA3',
          marginTop: 12,
          marginBottom: 48,
          letterSpacing: '0.01em',
        }}>
          No credit card required &nbsp;&middot;&nbsp; Free for first 500 tickets
        </p>

        {/* Video Integration */}
        <div
          style={{
            width: '100%',
            maxWidth: 900,
            background: '#ffffff',
            borderRadius: 12,
            boxShadow: '0 20px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)',
            border: '1px solid rgba(0,0,0,0.06)',
            overflow: 'hidden',
            animation: 'fadeInUp 1s ease both',
            animationDelay: '0.2s',
          }}
        >
          {/* Simple Mac OS mock header */}
          <div style={{ display: 'flex', gap: 6, padding: '12px 16px', background: '#F8FAFC', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f' }} />
          </div>
          <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9' }}>
            <video
              ref={videoRef}
              src={import.meta.env.VITE_HERO_VIDEO_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/static/demo.mp4`}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
            />
            {isMuted && (
              <button 
                onClick={() => setIsMuted(false)}
                style={{
                  position: 'absolute',
                  bottom: 16,
                  right: 16,
                  background: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 20,
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  backdropFilter: 'blur(4px)',
                  transition: 'background 0.2s',
                  zIndex: 10
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                Click to Unmute
              </button>
            )}
          </div>
        </div>
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
