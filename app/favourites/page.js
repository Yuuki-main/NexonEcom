import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import FavouritesClient from '@/components/FavouritesClient'

export default async function FavouritesPage() {
  const token = (await cookies()).get('token')?.value

  if (!token) {
    redirect('/login?redirect=/favourites')
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 py-7">
        <h1 className="text-[24px] font-bold text-[#111] mb-6">
          My Favourites
        </h1>
        <FavouritesClient />
      </main>
      <Footer />
    </div>
  )
}
