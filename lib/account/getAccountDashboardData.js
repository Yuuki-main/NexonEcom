// Server-side account dashboard data fetcher.
// Scopes all data to the authenticated user's organization.

import prisma from '@/lib/prisma'

// Maps actual DB order statuses to dashboard display groups
export const ORDER_STATUS_GROUPS = {
  pending_payment: 'awaiting_payment',
  paid: 'processing',
  processing: 'processing',
  shipped: 'processing',
  delivered: 'completed',
  cancelled: 'other',
  refunded: 'other',
}

export const DASHBOARD_STATUSES = [
  { key: 'awaiting_payment', label: 'Awaiting Payment', icon: 'WalletCards' },
  { key: 'processing', label: 'Processing', icon: 'PackageOpen' },
  { key: 'completed', label: 'Completed', icon: 'BadgeCheck' },
]

export async function getAccountDashboardData(userId) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
  })
  if (!user) return null

  const member = await prisma.organizationMember.findFirst({
    where: { userId, deletedAt: null },
    include: {
      organization: {
        select: {
          id: true,
          legalName: true,
          tradingName: true,
          abn: true,
          type: true,
          status: true,
          isGstRegistered: true,
          businessAddress: true,
          billingAddress: true,
        },
      },
    },
  })

  const org = member?.organization ?? null

  let statusCounts = {}
  let totalOrders = 0

  if (org) {
    const orders = await prisma.order.groupBy({
      by: ['status'],
      where: { organizationId: org.id },
      _count: true,
    })

    for (const row of orders) {
      const group = ORDER_STATUS_GROUPS[row.status] || 'other'
      statusCounts[group] = (statusCounts[group] || 0) + row._count
      totalOrders += row._count
    }
  }

  const orderCards = DASHBOARD_STATUSES.map((s) => ({
    ...s,
    count: statusCounts[s.key] || 0,
  }))

  return {
    user: {
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
    },
    org: org
      ? {
          legalName: org.legalName,
          tradingName: org.tradingName,
          abn: org.abn,
          isGstRegistered: org.isGstRegistered,
          type: org.type,
          status: org.status,
        }
      : null,
    memberRole: member?.role ?? null,
    credit: {
      creditLimit: 0,        // TODO: CreditAccount moved — reconnect when model restored
      cachedBalance: 0,
      creditUsed: 0,
      unappliedCredits: 0,
      paymentTerms: 'COD',
      overdueAmount: 0,
      overdueDays: 0,
      ageing: [
        { label: 'Current', amount: 0 },
        { label: '1–30 days', amount: 0 },
        { label: '31–60 days', amount: 0 },
        { label: '61–90 days', amount: 0 },
        { label: 'Over 90 days', amount: 0 },
      ],
    },
    orders: {
      total: totalOrders,
      cards: orderCards,
    },
  }
}
