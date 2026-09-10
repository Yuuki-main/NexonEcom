import prisma from '@/lib/prisma'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Single generic response for BOTH "order not found" and "email does not
// match". Returning the same message and status for every failure prevents
// an attacker from using the endpoint as an order-existence oracle (i.e.
// discovering that `ORD-000123` exists even when they can't read its data).
function notFound() {
  return Response.json(
    { error: 'No order found. Please check your order number and email.' },
    { status: 404 },
  )
}

// Reduce a full name to first name + last initial ("John Smith" → "John S.").
// The requester has already proven knowledge of the order number + a member
// email, so a masked name is a harmless confirmation aid — never the full name.
function maskName(fullName) {
  if (!fullName) return null
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return null
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

// Return only a coarse destination (city + state) from the immutable shipping
// address snapshot. Never expose line1/line2/postcode — those are PII.
function maskDestination(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null
  const city = typeof snapshot.city === 'string' ? snapshot.city : null
  const state = typeof snapshot.state === 'string' ? snapshot.state : null
  if (!city && !state) return null
  return { city, state }
}

// ── GET /api/track-order ─────────────────────────────────────────────────────
//
// Order tracking is intentionally unauthenticated (customers track without
// logging in), but a sequential order number is guessable. The order number is
// therefore no longer a sufficient credential on its own: the requester must
// also supply the email address of a user authorized to view the order (an
// active member of the order's organization, or the user who placed it).
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const orderNumber = (searchParams.get('orderNumber') || '').trim().toUpperCase()
    const email = (searchParams.get('email') || '').trim().toLowerCase()

    if (!orderNumber || !email) {
      return Response.json(
        { error: 'Order number and email are required' },
        { status: 400 },
      )
    }

    if (!EMAIL_REGEX.test(email)) {
      return notFound()
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: {
        orderNumber: true,
        status: true,
        placedAt: true,
        total: true,
        packingSlipNumber: true,
        shippingAddressSnapshot: true,
        organizationId: true,
        placedByUserId: true,
      },
    })

    if (!order) return notFound()

    // Resolve the set of emails authorized to view this order:
    //  - every active member of the order's organization
    //  - the user who placed the order (if one is recorded)
    const [members, placedBy] = await Promise.all([
      prisma.organizationMember.findMany({
        where: {
          organizationId: order.organizationId,
          status: 'active',
          deletedAt: null,
        },
        select: { user: { select: { email: true, fullName: true } } },
      }),
      order.placedByUserId
        ? prisma.user.findFirst({
            where: { id: order.placedByUserId, deletedAt: null },
            select: { email: true, fullName: true },
          })
        : Promise.resolve(null),
    ])

    let matchedName = null
    let authorized = false

    for (const member of members) {
      if (member.user?.email?.toLowerCase() === email) {
        authorized = true
        matchedName = member.user.fullName
        break
      }
    }

    if (!authorized && placedBy) {
      if (placedBy.email?.toLowerCase() === email) {
        authorized = true
        matchedName = placedBy.fullName
      }
    }

    if (!authorized) return notFound()

    return Response.json({
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        placedAt: order.placedAt,
        total: Number(order.total),
        packingSlipNumber: order.packingSlipNumber ?? null,
        customerName: maskName(matchedName),
        destination: maskDestination(order.shippingAddressSnapshot),
      },
    })
  } catch (err) {
    console.error('track-order error:', err)
    return Response.json({ error: 'Unable to look up order' }, { status: 500 })
  }
}
