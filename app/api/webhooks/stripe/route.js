// import { getStripe } from '@/lib/stripe'
import prisma from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

// Stripe requires the raw request body for signature verification.
// In App Router, route handlers receive the raw Request — we read
// the body as text (not JSON) to preserve the exact bytes Stripe signed.
export const dynamic = 'force-dynamic'

// ── helpers ──────────────────────────────────────────────────────────────────

// Log a payment lifecycle event — status change only, no sensitive data.
function logLifecycle(message, data = {}) {
  console.log(`[Stripe] ${message}`, JSON.stringify(data))
}

// ── event handlers ───────────────────────────────────────────────────────────

// checkout.session.completed — the user completed payment.
// This is the canonical "money moved" event. We update the order status,
// create an append-only Payment record, and record the event for idempotency
// — all in one atomic $transaction. If any part fails, everything rolls back
// and Stripe retries naturally.
async function handleCheckoutCompleted(event) {
  const session = event.data.object
  const orderId = session.metadata?.orderId
  if (!orderId) {
    logLifecycle('checkout.session.completed — no orderId in metadata', {
      sessionId: session.id,
    })
    return
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId },
    select: { id: true, status: true, total: true, organizationId: true },
  })

  if (!order) {
    logLifecycle('checkout.session.completed — order not found', {
      orderId,
      sessionId: session.id,
    })
    return
  }

  if (order.status !== 'pending_payment') {
    logLifecycle(
      `checkout.session.completed — order already ${order.status}, skipping`,
      { orderId, sessionId: session.id },
    )
    return
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? null)

  const stripeChargeId =
    typeof session.payment_intent === 'object'
      ? (session.payment_intent?.latest_charge ?? null)
      : null

  // Atomic: event marker + order update + payment creation.
  // All three commit or all three roll back. If the StripeEvent insert
  // hits a duplicate (P2002), the event was already processed by a
  // concurrent/prior delivery — we skip silently inside the catch.
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Record that we processed this event (idempotency gate)
      await tx.stripeEvent.create({
        data: {
          stripeEventId: event.id,
          eventType: event.type,
          payload: session,
        },
      })

      // 2. Mark order as paid
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'paid',
          stripePaymentIntentId: paymentIntentId,
        },
      })

      // 3. Create immutable payment record
      await tx.payment.create({
        data: {
          organizationId: order.organizationId,
          orderId: order.id,
          amount: order.total,
          currencyCode: 'AUD',
          method: 'card',
          status: 'succeeded',
          stripePaymentIntentId: paymentIntentId,
          stripeChargeId,
        },
      })
    })
  } catch (err) {
    if (err?.code === 'P2002') {
      // Duplicate StripeEvent — this event was already processed
      // by a concurrent delivery. Safe to acknowledge without re-doing.
      logLifecycle('checkout.session.completed — duplicate event, skipping', {
        eventId: event.id,
        orderId,
      })
      return
    }
    throw err // DB error — let it bubble up, Stripe will retry
  }

  logLifecycle('Order marked as paid', {
    orderId,
    orderNumber: session.metadata?.orderNumber,
    paymentIntentId,
  })
}

// checkout.session.expired — the session timed out (24h).
// Cancel the order if it's still awaiting payment, and reset the
// old session ID so a retry creates a fresh Checkout Session.
async function handleCheckoutExpired(event) {
  const session = event.data.object
  const orderId = session.metadata?.orderId
  if (!orderId) return

  const order = await prisma.order.findFirst({
    where: { id: orderId },
    select: { id: true, status: true },
  })

  if (!order || order.status !== 'pending_payment') return

  try {
    await prisma.$transaction(async (tx) => {
      await tx.stripeEvent.create({
        data: {
          stripeEventId: event.id,
          eventType: event.type,
          payload: session,
        },
      })

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'cancelled',
          stripeCheckoutSessionId: null,
        },
      })
    })
  } catch (err) {
    if (err?.code === 'P2002') return // already processed
    throw err
  }

  logLifecycle('Order cancelled due to expired session', {
    orderId,
    sessionId: session.id,
  })
}

// payment_intent.payment_failed — card declined or other payment failure.
// Order stays in pending_payment so user can retry. No Payment record
// is created (no money moved). Record the event for idempotency.
async function handlePaymentFailed(event) {
  const paymentIntent = event.data.object

  const order = await prisma.order.findFirst({
    where: { stripePaymentIntentId: paymentIntent.id },
    select: { id: true, status: true },
  })

  // Record event for idempotency — no business writes, just log.
  try {
    await prisma.stripeEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        payload: paymentIntent,
      },
    })
  } catch (err) {
    if (err?.code === 'P2002') return // already processed
    throw err
  }

  logLifecycle('Payment failed', {
    paymentIntentId: paymentIntent.id,
    orderId: order?.id ?? 'unknown',
    failureReason:
      paymentIntent.last_payment_error?.message ?? 'Unknown failure',
  })
}

// ── POST /api/webhooks/stripe ────────────────────────────────────────────────

export async function POST(req) {
  // 1. Read raw body and signature header
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return Response.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 },
    )
  }

  // 2. Verify webhook signature — reject if invalid
  let event
  try {
    // const stripe = getStripe()
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    )
  } catch (err) {
    console.error('[Stripe] Invalid webhook signature:', err.message)
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // 3. Dispatch to handler.
  //    Each handler is responsible for its own idempotency: it inserts
  //    a StripeEvent row atomically with its business writes. If the
  //    insert hits P2002 (duplicate), the handler silently returns.
  //    If the handler throws (DB error, deadlock), the StripeEvent
  //    row was inside the same $transaction, so it rolled back too —
  //    no event marker exists, Stripe retries, and the handler runs again.
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(event)
        break
      }

      case 'checkout.session.expired': {
        await handleCheckoutExpired(event)
        break
      }

      case 'payment_intent.payment_failed': {
        await handlePaymentFailed(event)
        break
      }

      default: {
        logLifecycle(`Unhandled event type: ${event.type}`, {
          eventId: event.id,
        })
      }
    }
  } catch (err) {
    console.error('[Stripe] Webhook processing error:', err)
    return Response.json({ error: 'Processing failed' }, { status: 500 })
  }

  // 4. Success — Stripe stops retrying
  return Response.json({ received: true })
}
