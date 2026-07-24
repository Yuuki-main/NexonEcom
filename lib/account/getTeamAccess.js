import { cookies } from 'next/headers'

import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function getTeamAccess({ requireManager = false } = {}) {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  const payload = token ? await verifyToken(token) : null

  if (!payload) {
    return {
      ok: false,
      status: 401,
      error: 'Unauthorized',
    }
  }

  const userId = payload.userId || payload.id || payload.sub

  if (!userId) {
    return {
      ok: false,
      status: 401,
      error: 'Unauthorized',
    }
  }

  const membership = await prisma.organizationMember.findFirst({
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

  if (!membership) {
    return {
      ok: false,
      status: 404,
      error: 'No active organization membership found.',
    }
  }

  const role = String(membership.role || '').toLowerCase()

  const canManageTeam = ['owner', 'admin'].includes(role)

  if (requireManager && !canManageTeam) {
    return {
      ok: false,
      status: 403,
      error: 'You do not have permission to manage team members.',
    }
  }

  return {
    ok: true,
    userId,
    role,
    canManageTeam,
    membership,
    organizationId: membership.organizationId,
  }
}
