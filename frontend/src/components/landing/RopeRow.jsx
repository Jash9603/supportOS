// components/landing/RopeRow.jsx
// One horizontal clothesline rope with 5 ticket cards hanging from it.
// The SVG rope spans full container width with a gentle catenary sag.

import HangingCard from './HangingCard'

export default function RopeRow({ tickets }) {
  return (
    <div style={{ position: 'relative', width: '100%', flex: 1, minHeight: 0 }}>

      {/* Rope SVG — catenary curve, anchor pins at both ends.
          Hidden on mobile via CSS class since the marquee scrolls horizontally. */}
      <svg
        className="rope-svg"
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%', height: 20,
          overflow: 'visible',
          zIndex: 3,
        }}
        viewBox="0 0 1000 16"
        preserveAspectRatio="none"
      >
        {/* End anchor dots */}
        <circle cx="22" cy="8" r="5" fill="#2E2A26" />
        <circle cx="978" cy="8" r="5" fill="#2E2A26" />

        {/* Main rope with gentle sag */}
        <path
          d="M 23 8 Q 250 14, 500 12 Q 750 14, 977 8"
          stroke="#2E2A26"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* Subtle highlight for 3-D depth */}
        <path
          d="M 23 7 Q 250 12, 500 10 Q 750 12, 977 7"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1"
          fill="none"
          strokeLinecap="round"
        />
      </svg>

      {/* Cards evenly distributed below the rope. Wrapped in marquee class for mobile.
          The rope-cards-container has CSS mask-image to fade edges on mobile. */}
      <div
        className="rope-cards-container"
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'flex-start',
          padding: '4px 5% 0',
          height: '100%',
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <div className="rope-marquee-wrap">
          {/* Original set */}
          {tickets.map((ticket, i) => (
            <HangingCard key={`orig-${i}`} {...ticket} />
          ))}
          {/* Duplicated set for seamless marquee loop on mobile */}
          <div className="mobile-only-marquee">
             {tickets.map((ticket, i) => (
              <HangingCard key={`dup-${i}`} {...ticket} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
