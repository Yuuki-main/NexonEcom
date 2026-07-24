import prisma from '@/lib/prisma'
import { verifyPassword, signToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import rateLimit from '@/lib/rateLimit'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown'

    const { limited, retryAfter } = rateLimit(ip, 5, 15 * 60 * 1000)
    if (limited) {
      return Response.json(
        {
          error: `Too many login attempts. Please try again in ${retryAfter} seconds.`,
        },
        { status: 429 },
      )
    }

    const { email, password } = await req.json()

    if (!email || !password) {
      return Response.json(
        { error: 'Email and password are required' },
        { status: 400 },
      )
    }

    const trimmedEmail = email.trim()
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return Response.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // email has no @unique attribute in the Prisma schema — the real
    // uniqueness guarantee is a partial SQL index (WHERE deleted_at IS
    // NULL) added outside Prisma's schema language, so findFirst is used
    // here instead of findUnique. deletedAt: null makes a soft-deleted
    // user behave like the "no such document" case Mongoose's findOne
    // would have produced once the document was actually gone.
    const user = await prisma.user.findFirst({
      where: { email: trimmedEmail.toLowerCase(), deletedAt: null },
    })
    if (!user) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // The Prisma User model carries no flat `role` column — that concept
    // was split into OrganizationMember.role (per-org) and Role/UserRole
    // (platform staff) during the schema redesign. Hardcoded to 'user'
    // here to match the convention the register migration already
    // established, since nothing currently reads this value for
    // authorization decisions (grep confirms no role-based branching
    // anywhere in the app yet). Revisit once real RBAC is wired up.
    const token = signToken({ userId: user.id, role: 'user' })
    ;(await cookies()).set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return Response.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: 'user',
      },
    })
  } catch (err) {
    console.error('Login error:', err)
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
