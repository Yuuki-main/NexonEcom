import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// ── helpers ──────────────────────────────────────────────────────────────────

async function getAuth() {
  const token = (await cookies()).get('token')?.value
  const payload = token ? verifyToken(token) : null
  if (!payload) return null
  return payload
}

async function getOrganization(userId) {
  const member = await prisma.organizationMember.findFirst({
    where: { userId, deletedAt: null },
    select: {
      organizationId: true,
      organization: {
        select: { id: true, stripeCustomerId: true, legalName: true },
      },
    },
  })
  return member?.organization ?? null
}

// Find or create a Stripe Customer for the given organization.
// Caches the Stripe customer ID on the Organization row so subsequent
// checkouts reuse the same Customer object in Stripe.
async function findOrCreateStripeCustomer(org) {
  if (org.stripeCustomerId) {
    return org.stripeCustomerId
  }

  // const stripe = getStripe()
  const customer = await stripe.customers.create({
    name: org.legalName,
    metadata: { organizationId: org.id },
  })

  await prisma.organization.update({
    where: { id: org.id },
    data: { stripeCustomerId: customer.id },
  })

  return customer.id
}

// ── POST /api/checkout ──────────────────────────────────────────────────────

export async function POST(req) {
  try {
    // 1. Auth
    const auth = await getAuth()
    if (!auth) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getOrganization(auth.userId)
    if (!org) {
      return Response.json(
        { error: 'No organization linked to this account' },
        { status: 400 },
      )
    }

    // 2. Parse request — expects { orderId }
    const { orderId } = await req.json()
    if (!orderId) {
      return Response.json({ error: 'orderId is required' }, { status: 400 })
    }

    // 3. Look up the order with its line items
    const order = await prisma.order.findFirst({
      where: { id: orderId, organizationId: org.id },
      include: { items: true },
    })

    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 })
    }

    // Allow retry of orders that were cancelled due to session expiry.
    // Only orders that never received payment can be retried.
    const retryableStatuses = ['pending_payment', 'cancelled']
    if (!retryableStatuses.includes(order.status)) {
      return Response.json(
        { error: `Order cannot be paid (status: ${order.status})` },
        { status: 400 },
      )
    }

    if (order.items.length === 0) {
      return Response.json({ error: 'Order has no items' }, { status: 400 })
    }

    // 4. Idempotency: if this order already has a Stripe session, reuse it
    //    (prevents duplicate sessions on retry / double-submit)
    if (order.stripeCheckoutSessionId) {
      try {
        // const stripe = getStripe()
        const existing = await stripe.checkout.sessions.retrieve(
          order.stripeCheckoutSessionId,
        )
        // Session is still open (not completed, not expired) → return the same URL
        if (existing.status === 'open') {
          return Response.json({ url: existing.url, sessionId: existing.id })
        }
        // Session completed — order should already be marked paid by webhook
        if (existing.status === 'complete') {
          return Response.json(
            { error: 'This order has already been paid' },
            { status: 400 },
          )
        }
        // Session expired → fall through and create a new one
      } catch {
        // Session ID stored but not found in Stripe (unlikely) → create new
      }
    }

    // 5. Find or create Stripe Customer
    const stripeCustomerId = await findOrCreateStripeCustomer(org)

    // 6. Build line items from order items (dynamic price_data — no Stripe Products needed)
    // Amounts: database stores dollars (Decimal 12,2); Stripe expects integer cents.
    const lineItems = order.items.map((item) => ({
      price_data: {
        currency: 'aud',
        product_data: {
          name: item.productNameSnapshot,
          metadata: { productSku: item.productSkuSnapshot },
        },
        unit_amount: Math.round(Number(item.unitPriceSnapshot) * 100),
      },
      quantity: item.quantity,
    }))

    // 7. Create Stripe Checkout Session
    // const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer: stripeCustomerId,
      line_items: lineItems,
      client_reference_id: order.id,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        organizationId: org.id,
      },
      success_url: `${APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/checkout?cancelled=true`,
      // GST is already baked into the item prices — do not let Stripe add tax
      automatic_tax: { enabled: false },
    })

    // 8. Store the Stripe session ID on the order (used by webhook to correlate)
    await prisma.order.update({
      where: { id: order.id },
      data: { stripeCheckoutSessionId: session.id },
    })

    // 9. Return the Stripe URL — client redirects there
    return Response.json({ url: session.url, sessionId: session.id })
  } catch (err) {
    console.error('Checkout error:', err)
    return Response.json(
      { error: 'Unable to create checkout session' },
      { status: 500 },
    )
  }
}
