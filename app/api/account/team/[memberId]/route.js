import { getTeamAccess } from '@/lib/account/getTeamAccess'
import prisma from '@/lib/prisma'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function PATCH(request, { params }) {
  try {
    const access = await getTeamAccess({
      requireManager: true,
    })

    if (!access.ok) {
      return Response.json(
        {
          error: access.error,
        },
        {
          status: access.status,
        },
      )
    }

    const { memberId } = await params

    const existing = await prisma.organizationTeamMember.findFirst({
      where: {
        id: memberId,
        organizationId: access.organizationId,
        isActive: true,
      },

      select: {
        id: true,
      },
    })

    if (!existing) {
      return Response.json(
        {
          error: 'Team member was not found.',
        },
        {
          status: 404,
        },
      )
    }

    const body = await request.json()
    const input = validateTeamMember(body)

    if (input.error) {
      return Response.json(
        {
          error: input.error,
        },
        {
          status: 400,
        },
      )
    }

    const member = await prisma.organizationTeamMember.update({
      where: {
        id: memberId,
      },

      data: {
        name: input.name,
        email: input.email,
        phone: input.phone || null,
      },

      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    })

    return Response.json({
      member: formatMember(member),
    })
  } catch (error) {
    if (error?.code === 'P2002') {
      return Response.json(
        {
          error: 'A team member with this email already exists.',
        },
        {
          status: 409,
        },
      )
    }

    console.error('UPDATE TEAM MEMBER ERROR:', error)

    return Response.json(
      {
        error: 'Unable to update team member.',
      },
      {
        status: 500,
      },
    )
  }
}

export async function DELETE(_request, { params }) {
  try {
    const access = await getTeamAccess({
      requireManager: true,
    })

    if (!access.ok) {
      return Response.json(
        {
          error: access.error,
        },
        {
          status: access.status,
        },
      )
    }

    const { memberId } = await params

    const existing = await prisma.organizationTeamMember.findFirst({
      where: {
        id: memberId,
        organizationId: access.organizationId,
        isActive: true,
      },

      select: {
        id: true,
      },
    })

    if (!existing) {
      return Response.json(
        {
          error: 'Team member was not found.',
        },
        {
          status: 404,
        },
      )
    }

    await prisma.organizationTeamMember.update({
      where: {
        id: memberId,
      },

      data: {
        isActive: false,
      },
    })

    return Response.json({
      success: true,
    })
  } catch (error) {
    console.error('DELETE TEAM MEMBER ERROR:', error)

    return Response.json(
      {
        error: 'Unable to remove team member.',
      },
      {
        status: 500,
      },
    )
  }
}

function validateTeamMember(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : ''

  const email =
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''

  if (name.length < 2) {
    return {
      error: 'Name must contain at least 2 characters.',
    }
  }

  if (name.length > 100) {
    return {
      error: 'Name must not exceed 100 characters.',
    }
  }

  if (!EMAIL_REGEX.test(email)) {
    return {
      error: 'Enter a valid email address.',
    }
  }

  if (phone.length > 30) {
    return {
      error: 'Phone number must not exceed 30 characters.',
    }
  }

  return {
    name,
    email,
    phone,
  }
}

function formatMember(member) {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    phone: member.phone || '',
    createdAt: member.createdAt.toISOString(),
  }
}
