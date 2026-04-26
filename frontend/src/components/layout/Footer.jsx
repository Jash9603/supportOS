// components/layout/Footer.jsx
// Shared site footer.

export default function Footer() {
  return (
    <footer
      style={{
        padding: '26px 5%',
        borderTop: '1.5px solid #D4CFC4',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        background: '#F5F0E8',
      }}
    >
      <span
        style={{
          fontFamily: '"Plus Jakarta Sans", sans-serif',
          fontWeight: 800,
          fontSize: '1rem',
          color: '#0D0D0B',
        }}
      >
        Support<span style={{ color: '#C8841A' }}>OS</span>
      </span>
      <span
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.8rem',
          color: '#ABA89E',
        }}
      >
        © {new Date().getFullYear()} SupportOS. All rights reserved.
      </span>
    </footer>
  )
}
