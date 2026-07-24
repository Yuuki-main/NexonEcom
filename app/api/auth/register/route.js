import prisma from '@/lib/prisma'
import { hashPassword, signToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import rateLimit from '@/lib/rateLimit'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const REQUIRED_FIELDS = [
  'fullName',
  'email',
  'password',
  'phone',
  'abn',
  'companyName',
  'businessAddress',
]

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
          error: `Too many registration attempts. Please try again in ${retryAfter} seconds.`,
        },
        { status: 429 },
      )
    }

    const body = await req.json()

    const {
      fullName,
      email,
      password,
      abn,
      companyName,
      tradingName,
      businessAddress,
      gst,
      hearAboutUs,
      installations,
      phone,
    } = body

    const fields = {
      fullName,
      email,
      password,
      phone,
      abn,
      companyName,
      businessAddress,
    }

    const hasAllRequired = REQUIRED_FIELDS.every((field) => {
      return (
        typeof fields[field] === 'string' && fields[field].trim().length > 0
      )
    })

    if (!hasAllRequired) {
      return Response.json(
        { error: 'All required fields must be filled in' },
        { status: 400 },
      )
    }

    const normalizedEmail = email.trim().toLowerCase()

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return Response.json({ error: 'Invalid email address' }, { status: 400 })
    }

    if (password.length < 8) {
      return Response.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 },
      )
    }

    const hashedPassword = await hashPassword(password)

    let user

    try {
      user = await prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            fullName: fullName.trim(),
            email: normalizedEmail,
            passwordHash: hashedPassword,
            phone: phone.trim(),
          },
        })

        const organization = await tx.organization.create({
          data: {
            legalName: companyName.trim(),
            tradingName: tradingName?.trim() || null,
            abn: abn.trim(),
            isGstRegistered: gst === 'Yes',
            type: 'customer',
            status: 'active',
          },
        })

        await tx.organizationMember.create({
          data: {
            organizationId: organization.id,
            userId: createdUser.id,
            role: 'owner',
            status: 'active',
          },
        })

        return createdUser
      })
    } catch (createError) {
      if (createError?.code === 'P2002') {
        return Response.json(
          { error: 'Email already registered' },
          { status: 409 },
        )
      }

      throw createError
    }

    const token = signToken({
      userId: user.id,
      role: 'user',
    })

    const cookieStore = await cookies()

    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return Response.json(
      {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: 'user',
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('REGISTER API ERROR:', error)

    return Response.json(
      {
        error:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : 'Unknown registration error'
            : 'Something went wrong',
      },
      { status: 500 },
    )
  }
}
