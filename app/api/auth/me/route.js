import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET() {
  const token = (await cookies()).get('token')?.value
  if (!token) return Response.json({ user: null }, { status: 200 })

  const payload = verifyToken(token)
  if (!payload) return Response.json({ user: null }, { status: 200 })

  // findFirst (not findUnique) for consistency with login — id is a real
  // @id field so findUnique would work too, but findFirst lets deletedAt
  // ride along in the same where clause without a version-dependent
  // "extended findUnique" assumption.
  const user = await prisma.user.findFirst({
    where: { id: payload.userId, deletedAt: null },
  })
  if (!user) return Response.json({ user: null }, { status: 200 })

  return Response.json({
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: 'user',
    },
  })
}
