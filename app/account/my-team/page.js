import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import prisma from '@/lib/prisma'
import { getTeamAccess } from '@/lib/account/getTeamAccess'

import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import AccountSidebar from '@/components/account/AccountSidebar'
import TeamClient from '@/app/account/TeamClient'

export default async function TeamPage() {
  const access = await getTeamAccess()

  if (!access.ok && access.status === 401) {
    redirect('/login?redirect=/account/team')
  }

  const members = access.ok
    ? await prisma.organizationTeamMember.findMany({
        where: {
          organizationId: access.organizationId,
          isActive: true,
        },
        orderBy: [
          {
            createdAt: 'asc',
          },
        ],
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      })
    : []

  const serializedMembers = members.map((member) => ({
    ...member,
    createdAt: member.createdAt.toISOString(),
  }))

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <Breadcrumb />

      <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10 min-h-[calc(100vh-158px)]">
        <div className="flex flex-col gap-7 lg:flex-row lg:gap-8">
          <AccountSidebar />

          <section className="min-w-0 flex-1">
            {!access.ok ? (
              <div>
                <div className="border-b border-[#e4e7ec] pb-5">
                  <h1 className="text-[22px] font-bold text-[#1d2939]">
                    My Team
                  </h1>
                </div>

                <div className="mt-8 rounded-md border border-amber-200 bg-amber-50 px-5 py-4">
                  <h2 className="text-[14px] font-semibold text-amber-900">
                    No active organization found
                  </h2>

                  <p className="mt-1 text-[13px] leading-5 text-amber-800">
                    Your account is not connected to an active company.
                  </p>
                </div>
              </div>
            ) : (
              <TeamClient
                initialMembers={serializedMembers}
                canManageTeam={access.canManageTeam}
              />
            )}
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

          <span className="font-semibold text-[#1d2939]">My Team</span>
        </nav>
      </div>
    </div>
  )
}
