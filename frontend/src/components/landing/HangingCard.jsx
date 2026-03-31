// components/landing/HangingCard.jsx
// A single ticket card that hangs from a rope.
// - Inner div handles static rotation (transformOrigin: top center)
// - Outer .card-lift-wrap CSS class handles instant hover lift

export default function HangingCard({ initials, bg, badge, name, time, msg, rotate }) {
  return (
    <div className="card-lift-wrap" style={{ flexShrink: 0 }}>
      {/* Rotated unit — pin + string + card body */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transform: `rotate(${rotate}deg)`,
          transformOrigin: 'top center',
        }}
      >
        {/* Clip pin sitting on the rope line */}
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#1E1916',
            border: '2px solid #3D3830',
            boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
            marginTop: -2,
            zIndex: 5,
            position: 'relative',
          }}
        />

        {/* String */}
        <div style={{ width: 2, height: 22, background: '#6B6660' }} />

        {/* Card */}
        <div
          className="card-body"
          style={{
            width: 168,
            background: '#FFFEFC',
            border: '1.5px solid #0D0D0B',
            borderRadius: 7,
            padding: '10px 12px 12px',
            boxShadow: '2px 4px 0px rgba(0,0,0,0.08)',
          }}
        >
          {/* Header: avatar + name/time + badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
            <div
              style={{
                width: 26, height: 26, borderRadius: '50%',
                background: bg, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Syne, sans-serif', fontWeight: 800,
                fontSize: '0.6rem', color: '#fff',
              }}
            >
              {initials}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div
                style={{
                  fontFamily: 'Inter, sans-serif', fontWeight: 600,
                  fontSize: '0.62rem', color: '#0D0D0B',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}
              >
                {name}
              </div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.56rem', color: '#ABA89E' }}>
                {time}
              </div>
            </div>
            {badge && (
              <span
                style={{
                  background: '#9B2C2C', color: '#fff',
                  fontFamily: 'Inter, sans-serif', fontWeight: 700,
                  fontSize: '0.46rem', padding: '2px 5px',
                  borderRadius: 3, flexShrink: 0, letterSpacing: '0.05em',
                }}
              >
                {badge}
              </span>
            )}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: '#EDE9DF', marginBottom: 7 }} />

          {/* Message */}
          <p
            style={{
              fontFamily: 'Inter, sans-serif', fontSize: '0.69rem',
              color: '#2A2A28', lineHeight: 1.5, margin: 0,
            }}
          >
            {msg}
          </p>
        </div>
      </div>
    </div>
  )
}
