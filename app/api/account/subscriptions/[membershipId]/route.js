import { cookies } from 'next/headers'

import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

const SUBSCRIPTION_FIELDS = [
  'orders',
  'invoices',
  'packingSlips',
  'newsletter',
  'statements',
]

export async function PATCH(request, { params }) {
  try {
    const auth = await getAuthenticatedMembership()

    if (auth.error) {
      return Response.json(
        {
          error: auth.error,
        },
        {
          status: auth.status,
        },
      )
    }

    const { membershipId } = await params

    const targetMembership = await prisma.organizationMember.findFirst({
      where: {
        id: membershipId,
        organizationId: auth.membership.organizationId,
      },
      select: {
        id: true,
        userId: true,
        role: true,
      },
    })

    if (!targetMembership) {
      return Response.json(
        {
          error: 'Company user was not found.',
        },
        {
          status: 404,
        },
      )
    }

    const currentRole = String(auth.membership.role || '').toLowerCase()

    const canManageAll = ['owner', 'admin'].includes(currentRole)

    const isOwnSubscription = targetMembership.userId === auth.userId

    if (!canManageAll && !isOwnSubscription) {
      return Response.json(
        {
          error:
            'You do not have permission to update this user’s subscriptions.',
        },
        {
          status: 403,
        },
      )
    }

    const body = await request.json()

    for (const field of SUBSCRIPTION_FIELDS) {
      if (typeof body[field] !== 'boolean') {
        return Response.json(
          {
            error: `The ${field} subscription value must be true or false.`,
          },
          {
            status: 400,
          },
        )
      }
    }

    const membership = await prisma.organizationMember.update({
      where: {
        id: membershipId,
      },

      data: {
        subscribeOrders: body.orders,
        subscribeInvoices: body.invoices,

        subscribePackingSlips: body.packingSlips,

        subscribeNewsletter: body.newsletter,

        subscribeStatements: body.statements,
      },

      select: {
        id: true,
        userId: true,
        role: true,
        status: true,

        subscribeOrders: true,
        subscribeInvoices: true,
        subscribePackingSlips: true,
        subscribeNewsletter: true,
        subscribeStatements: true,

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

    return Response.json({
      subscription: formatSubscription(membership, auth.userId),
    })
  } catch (error) {
    console.error('UPDATE COMPANY SUBSCRIPTIONS ERROR:', error)

    return Response.json(
      {
        error: 'Unable to update subscription preferences.',
      },
      {
        status: 500,
      },
    )
  }
}

async function getAuthenticatedMembership() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  const payload = token ? await verifyToken(token) : null

  if (!payload) {
    return {
      error: 'Unauthorized',
      status: 401,
    }
  }

  const userId = payload.userId || payload.id || payload.sub

  if (!userId) {
    return {
      error: 'Unauthorized',
      status: 401,
    }
  }

  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId,
      status: 'active',
    },
    select: {
      id: true,
      userId: true,
      organizationId: true,
      role: true,
    },
  })

  if (!membership) {
    return {
      error: 'No active organization membership found.',
      status: 404,
    }
  }

  return {
    membership,
    userId,
  }
}

function formatSubscription(membership, currentUserId) {
  return {
    membershipId: membership.id,
    userId: membership.userId,

    fullName: membership.user?.fullName || 'Unnamed user',

    email: membership.user?.email || '',
    phone: membership.user?.phone || '',

    role: membership.role,
    status: membership.status,

    isCurrentUser: membership.userId === currentUserId,

    isPrimary: String(membership.role || '').toLowerCase() === 'owner',

    subscriptions: {
      orders: Boolean(membership.subscribeOrders),

      invoices: Boolean(membership.subscribeInvoices),

      packingSlips: Boolean(membership.subscribePackingSlips),

      newsletter: Boolean(membership.subscribeNewsletter),

      statements: Boolean(membership.subscribeStatements),
    },
  }
}
