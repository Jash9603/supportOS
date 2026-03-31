// dashboard/Overview.jsx
// Placeholder for the overview metrics screen.

export default function Overview() {
  return (
    <div style={{ padding: '40px 60px', fontFamily: 'Inter, sans-serif' }}>
      <h1
        style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800,
          fontSize: '1.8rem',
          color: '#0D0D0B',
          letterSpacing: '-0.02em',
          marginBottom: 12,
        }}
      >
        Overview
      </h1>
      <p style={{ color: '#4A4743', fontSize: '0.95rem' }}>
        Metrics and analytics widgets will be built in Phase 4.
      </p>

      {/* Placeholder empty states */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginTop: 40 }}>
        {['Total Tickets', 'Open resolving', 'Avg Response', 'Bot Resolves'].map((metric) => (
          <div
            key={metric}
            style={{
              background: '#FFF',
              border: '1.5px solid #E8E3D8',
              borderRadius: 8,
              padding: 24,
            }}
          >
            <h3 style={{ fontSize: '0.8rem', color: '#6A6661', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              {metric}
            </h3>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.8rem', color: '#0D0D0B' }}>
              --
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
