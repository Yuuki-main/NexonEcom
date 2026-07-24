import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import { verifyToken } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import AccountSidebar from '@/components/account/AccountSidebar'
import AddressesClient from '@/app/account/AddressesClient'

export default async function AddressesPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  const payload = token ? await verifyToken(token) : null

  if (!payload) {
    redirect('/login?redirect=/account/addresses')
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="border-b border-[#e8eaed] bg-white">
        <div className="mx-auto max-w-[1440px] px-4 py-3 sm:px-6 lg:px-10">
          <nav className="flex items-center gap-1.5 text-[13px]">
            <Link
              href="/"
              className="text-[#667085] transition-colors hover:text-[#1478d4]"
            >
              Home
            </Link>

            <ChevronRight size={15} className="text-[#98a2b3]" />

            <Link
              href="/account/dashboard"
              className="text-[#667085] transition-colors hover:text-[#1478d4]"
            >
              My Account
            </Link>

            <ChevronRight size={15} className="text-[#98a2b3]" />

            <span className="font-semibold text-[#1d2939]">Addresses</span>
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10 min-h-[calc(100vh-158px)]">
        <div className="flex flex-col gap-7 lg:flex-row lg:gap-8">
          <AccountSidebar />

          <section className="min-w-0 flex-1">
            <AddressesClient initialAddresses={[]} />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
