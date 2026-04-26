// components/landing/RopesSection.jsx
// Screen 2 (100vh): Three clothesline ropes with hanging ticket cards.
// Hover over any card → instant lift (via .card-lift-wrap CSS class).

import RopeRow from './RopeRow'
import { ROPE1, ROPE2, ROPE3 } from './ticketData'

export default function RopesSection() {
  return (
    <section
      className="ropes-section"
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '48px 16px 32px',
        gap: 16,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Section caption */}
      <p
        style={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.65rem',
          color: '#B0ABA3',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        Tickets piling up right now — SupportOS answers them instantly
      </p>

      <RopeRow tickets={ROPE1} />
      <RopeRow tickets={ROPE2} />
      <RopeRow tickets={ROPE3} />
    </section>
  )
}
