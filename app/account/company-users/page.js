import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import AccountSidebar from '@/components/account/AccountSidebar'
import CompanyUsersClient from '@/app/account/CompanyUsersClient'

export default async function CompanyUsersPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  const payload = token ? await verifyToken(token) : null

  if (!payload) {
    redirect('/login?redirect=/account/company-users')
  }

  const userId = payload.userId || payload.id || payload.sub

  if (!userId) {
    redirect('/login?redirect=/account/company-users')
  }

  const currentMembership = await prisma.organizationMember.findFirst({
    where: {
      userId,
      status: 'active',
    },
    select: {
      id: true,
      organizationId: true,
      role: true,
    },
  })

  if (!currentMembership) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />

        <Breadcrumb />

        <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10">
          <div className="flex flex-col gap-7 lg:flex-row lg:gap-8">
            <AccountSidebar />

            <section className="min-w-0 flex-1">
              <div className="border-b border-[#e4e7ec] pb-5">
                <h1 className="text-[22px] font-bold text-[#1d2939]">
                  Company Users
                </h1>
              </div>

              <div className="mt-8 rounded-md border border-amber-200 bg-amber-50 px-5 py-4">
                <p className="text-[14px] font-semibold text-amber-900">
                  No active organization found
                </p>

                <p className="mt-1 text-[13px] leading-5 text-amber-800">
                  Your account is not currently connected to an active
                  organization.
                </p>
              </div>
            </section>
          </div>
        </main>

        <Footer />
      </div>
    )
  }

  const memberships = await prisma.organizationMember.findMany({
    where: {
      organizationId: currentMembership.organizationId,
    },
    orderBy: [
      {
        role: 'asc',
      },
      {
        createdAt: 'asc',
      },
    ],
    select: {
      id: true,
      userId: true,
      role: true,
      status: true,
      createdAt: true,

      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
        },
      },
    },
  })

  const users = memberships.map((membership) => ({
    membershipId: membership.id,
    userId: membership.userId,
    fullName: membership.user?.fullName || 'Unnamed user',
    email: membership.user?.email || '',
    phone: membership.user?.phone || '',
    role: membership.role,
    status: membership.status,
    createdAt: membership.createdAt.toISOString(),
    isCurrentUser: membership.userId === userId,
    isPrimary: membership.role === 'owner',
  }))

  const currentRole = String(currentMembership.role || '').toLowerCase()

  const canManageUsers = ['owner', 'admin'].includes(currentRole)

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <Breadcrumb />

      <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-7 lg:flex-row lg:gap-8">
          <AccountSidebar />

          <section className="min-w-0 flex-1">
            <CompanyUsersClient
              initialUsers={users}
              currentUserId={userId}
              canManageUsers={canManageUsers}
            />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}

function Breadcrumb() {
  return (
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

          <span className="font-semibold text-[#1d2939]">Company Users</span>
        </nav>
      </div>
    </div>
  )
}
