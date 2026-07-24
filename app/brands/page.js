import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import BrandPartners from '@/components/BrandPartners'

export default function Brands() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="max-w-[1440px] mx-auto px-4 py-16">
        <BrandPartners showGrouped />
      </main>
      <Footer />
    </div>
  )
}
