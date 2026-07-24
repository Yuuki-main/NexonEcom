import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import AccountSidebar from '@/components/account/AccountSidebar'
import AccountDashboard from '@/components/account/AccountDashboard'
import { getAccountDashboardData } from '@/lib/account/getAccountDashboardData'

export default async function AccountDashboardPage() {
  const token = (await cookies()).get('token')?.value
  const payload = token ? verifyToken(token) : null
  if (!payload) redirect('/login?redirect=/account/dashboard')

  const data = await getAccountDashboardData(payload.userId)
  if (!data) redirect('/login')

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="bg-white border-b border-[#e8eaed]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-3">
          <nav className="flex items-center gap-1.5 text-[13px] text-[#666]">
            <Link href="/" className="hover:text-[#00a7a7] transition-colors">
              Home
            </Link>
            <ChevronRight size={14} className="text-[#bbb]" />
            <Link
              href="/account/dashboard"
              className="hover:text-[#00a7a7] transition-colors"
            >
              My Account
            </Link>
            <ChevronRight size={14} className="text-[#bbb]" />
            <span className="text-[#333] font-medium">Dashboard</span>
          </nav>
        </div>
      </div>
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-8 min-h-[calc(100vh-158px)]">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          <AccountSidebar />
          <AccountDashboard data={data} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
