import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import AccountSidebar from '@/components/account/AccountSidebar'
import CompanyProfileClient from '@/app/account/CompanyProfileClient'

export default async function CompanyProfilePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  const payload = token ? await verifyToken(token) : null

  if (!payload) {
    redirect('/login?redirect=/account/company-profile')
  }

  const userId = payload.userId || payload.id || payload.sub

  if (!userId) {
    redirect('/login?redirect=/account/company-profile')
  }

  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId,
      status: 'active',
    },
    select: {
      organizationId: true,
    },
  })

  const organization = membership
    ? await prisma.organization.findUnique({
        where: {
          id: membership.organizationId,
        },
        select: {
          id: true,
          abn: true,
          legalName: true,
          tradingName: true,
          isGstRegistered: true,
          businessAddress: true,
          billingAddress: true,
          type: true,
          status: true,
        },
      })
    : null

  const profile = organization
    ? {
        id: organization.id,
        abn: organization.abn || '',
        legalName: organization.legalName || '',
        tradingName: organization.tradingName || '',
        isGstRegistered: Boolean(organization.isGstRegistered),
        businessAddress: organization.businessAddress || null,
        billingAddress: organization.billingAddress || null,
      }
    : null

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Breadcrumb */}
      <div className="border-b border-[#e5e7eb] bg-white">
        <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 lg:px-10">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 overflow-x-auto whitespace-nowrap text-[13px]"
          >
            <Link
              href="/"
              className="text-[#667085] transition-colors hover:text-[#1478d4]"
            >
              Home
            </Link>

            <ChevronRight size={15} className="shrink-0 text-[#98a2b3]" />

            <Link
              href="/account/dashboard"
              className="text-[#667085] transition-colors hover:text-[#1478d4]"
            >
              My Account
            </Link>

            <ChevronRight size={15} className="shrink-0 text-[#98a2b3]" />

            <span className="font-semibold text-[#1d2939]">
              Company Profile
            </span>
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-7 lg:flex-row lg:gap-8">
          <AccountSidebar />

          <section className="min-w-0 flex-1">
            <CompanyProfileClient initialProfile={profile} />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
