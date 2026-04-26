// components/landing/HangingCard.jsx
// Ticket card hanging from a rope.
//
// Hover → card flips 180° (Y-axis) to reveal the AI response back.
//
// Two back-card states:
//   type='resolved'  → green bg, "✓ Answered by AI" — steps or doc link
//   type='escalated' → amber bg, "↗ Connecting with Agent" — warm handoff

export default function HangingCard({
  initials, bg, badge, name, time, msg,
  reply, resolvedIn, type, rotate,
}) {
  const isResolved = type === 'resolved'

  // Back card colours
  const backBg     = isResolved ? '#F0FDF6' : '#FFF9F0'
  const backBorder = isResolved ? '#2D6A4F' : '#C8841A'
  const backShadow = isResolved
    ? '2px 4px 0px rgba(45,106,79,0.15)'
    : '2px 4px 0px rgba(200,132,26,0.15)'
  const badgeBg    = isResolved ? '#2D6A4F' : '#C8841A'
  const badgeText  = isResolved ? '✓ Answered by AI' : '↗ Connecting with Agent'
  const textColor  = isResolved ? '#1A3D2B' : '#5C3A00'
  const divider    = isResolved ? '#BBF7D0' : '#FDE68A'
  const timeColor  = isResolved ? '#4A9E72' : '#B97316'

  return (
    <div style={{ flexShrink: 0 }}>
      {/* Rotated hanger unit — pin + string + flip card */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transform: `rotate(${rotate}deg)`,
          transformOrigin: 'top center',
        }}
      >
        {/* Pin */}
        <div
          style={{
            width: 10, height: 10, borderRadius: '50%',
            background: '#1E1916', border: '2px solid #3D3830',
            boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
            marginTop: -2, zIndex: 5, position: 'relative',
          }}
        />

        {/* String */}
        <div style={{ width: 2, height: 22, background: '#6B6660' }} />

        {/* ── 3D flip container ─────────────────────────────────────── */}
        <div className="card-flip-outer" style={{ width: 168 }}>
          <div className="card-flip-inner">

            {/* ── FRONT — customer complaint ─────────────────────────── */}
            <div
              className="card-face card-face-front"
              style={{
                background: '#FFFEFC',
                border: '1.5px solid #0D0D0B',
                borderRadius: 7,
                padding: '10px 12px 12px',
                boxShadow: '2px 4px 0px rgba(0,0,0,0.08)',
                minHeight: 140,
              }}
            >
              {/* Header: avatar · name · timestamp · badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                <div
                  style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: bg, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 800,
                    fontSize: '0.6rem', color: '#fff',
                  }}
                >
                  {initials}
                </div>
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.62rem', color: '#0D0D0B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {name}
                  </div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.56rem', color: '#ABA89E' }}>
                    {time}
                  </div>
                </div>
                {badge && (
                  <span style={{
                    background: '#9B2C2C', color: '#fff',
                    fontFamily: 'Inter, sans-serif', fontWeight: 700,
                    fontSize: '0.46rem', padding: '2px 5px',
                    borderRadius: 3, flexShrink: 0, letterSpacing: '0.05em',
                  }}>
                    {badge}
                  </span>
                )}
              </div>

              <div style={{ height: 1, background: '#EDE9DF', marginBottom: 7 }} />

              <p style={{
                fontFamily: 'Inter, sans-serif', fontSize: '0.69rem',
                color: '#2A2A28', lineHeight: 1.5, margin: 0,
              }}>
                {msg}
              </p>
            </div>

            {/* ── BACK — AI response ────────────────────────────────── */}
            <div
              className="card-face card-face-back"
              style={{
                background: backBg,
                border: `1.5px solid ${backBorder}`,
                borderRadius: 7,
                padding: '10px 12px 12px',
                boxShadow: backShadow,
                minHeight: 140,
              }}
            >
              {/* Back header: status badge + response time */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                <span style={{
                  background: badgeBg, color: '#fff',
                  fontFamily: 'Inter, sans-serif', fontWeight: 700,
                  fontSize: '0.44rem', padding: '2px 6px',
                  borderRadius: 3, letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>
                  {badgeText}
                </span>
                <span style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '0.5rem',
                  color: timeColor, fontWeight: 600,
                }}>
                  {resolvedIn}
                </span>
              </div>

              <div style={{ height: 1, background: divider, marginBottom: 8 }} />

              <p style={{
                fontFamily: 'Inter, sans-serif', fontSize: '0.67rem',
                color: textColor, lineHeight: 1.52, margin: 0,
              }}>
                {reply}
              </p>
            </div>

          </div>
        </div>
        {/* ── end flip ─────────────────────────────────────────────── */}

      </div>
    </div>
  )
}
