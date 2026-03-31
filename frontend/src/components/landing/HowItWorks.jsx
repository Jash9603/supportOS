// components/landing/HowItWorks.jsx
// Screen 3 (min-100vh, white bg): 3-step explainer section.

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
          fontFamily: 'Syne, sans-serif',
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
                fontFamily: 'Syne, sans-serif',
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
                fontFamily: 'Syne, sans-serif',
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
    </section>
  )
}
