// pages/Landing.jsx
// Composes the landing sections + contact form + footer.
// Navbar is at the top level so sticky positioning works across all sections.

import Navbar          from '../components/layout/Navbar'
import HeroSection     from '../components/landing/HeroSection'
import RopesSection    from '../components/landing/RopesSection'
import HowItWorks      from '../components/landing/HowItWorks'
import ContactSection  from '../components/landing/ContactSection'
import Footer          from '../components/layout/Footer'

export default function Landing() {
  return (
    <div>
      <Navbar />
      <HeroSection />
      <RopesSection />
      <HowItWorks />
      <ContactSection />
      <Footer />
    </div>
  )
}
