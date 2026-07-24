import Navbar from '@/components/Navbar'
import HeroBanner from '@/components/HeroBanner'
import AppliancesGrid from '@/components/AppliancesGrid'
import Footer from '@/components/Footer'
import CategoryHeroSection from '@/components/CategoryHeroSection'
import NewsEvents from '@/components/NewsEvents'
import BrandPartners from '@/components/BrandPartners'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <HeroBanner />
      <BrandPartners />
      {/* <AppliancesGrid /> */}
      <CategoryHeroSection />
      <NewsEvents />
      <Footer />
    </div>
  )
}
