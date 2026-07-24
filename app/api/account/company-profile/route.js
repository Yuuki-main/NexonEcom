import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function PATCH(req) {
  try {
    const token = (await cookies()).get('token')?.value
    const payload = token ? verifyToken(token) : null
    if (!payload) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = payload.userId || payload.id || payload.sub
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find active org membership
    const membership = await prisma.organizationMember.findFirst({
      where: { userId, status: 'active' },
      select: { organizationId: true, role: true },
    })
    if (!membership) {
      return Response.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Only owner/admin can update company profile
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { tradingName, businessAddress, billingAddress } = body

    // Validate
    if (tradingName !== undefined) {
      if (typeof tradingName !== 'string' || tradingName.trim().length > 120) {
        return Response.json({ error: 'Preferred name must be a string and not exceed 120 characters.' }, { status: 400 })
      }
    }
    if (businessAddress !== undefined) {
      if (typeof businessAddress !== 'string' || businessAddress.trim().length > 300) {
        return Response.json({ error: 'Business address must be a string and not exceed 300 characters.' }, { status: 400 })
      }
    }
    if (billingAddress !== undefined) {
      if (typeof billingAddress !== 'string' || billingAddress.trim().length > 300) {
        return Response.json({ error: 'Billing address must be a string and not exceed 300 characters.' }, { status: 400 })
      }
    }

    // Build update data
    const data = {}
    if (tradingName !== undefined) {
      data.tradingName = tradingName.trim() || null
    }
    if (businessAddress !== undefined) {
      data.businessAddress = businessAddress.trim() || null
    }
    if (billingAddress !== undefined) {
      data.billingAddress = billingAddress.trim() || null
    }

    const organization = await prisma.organization.update({
      where: { id: membership.organizationId },
      data,
      select: {
        id: true,
        abn: true,
        legalName: true,
        tradingName: true,
        isGstRegistered: true,
        businessAddress: true,
        billingAddress: true,
      },
    })

    return Response.json({ organization })
  } catch (err) {
    console.error('Company profile PATCH error:', err)
    return Response.json(
      { error: 'Unable to update company profile.' },
      { status: 500 },
    )
  }
}
