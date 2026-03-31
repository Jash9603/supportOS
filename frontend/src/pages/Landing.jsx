// pages/Landing.jsx
// Composes the 3 landing sections + footer.
// All display logic lives in src/components/landing/*.

import HeroSection   from '../components/landing/HeroSection'
import RopesSection  from '../components/landing/RopesSection'
import HowItWorks    from '../components/landing/HowItWorks'
import Footer        from '../components/layout/Footer'

export default function Landing() {
  return (
    <div>
      <HeroSection />
      <RopesSection />
      <HowItWorks />
      <Footer />
    </div>
  )
}
