import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

// ── helpers ──────────────────────────────────────────────────────────────────

// The old Mongoose Order was keyed to a User directly. The Prisma Order is
// keyed to an Organization. Every user created via Register has an active
// OrganizationMember row linking them to exactly one org — we use that row
// to resolve the organizationId that the order FK requires.
async function getOrganizationId(userId) {
  const member = await prisma.organizationMember.findFirst({
    where: { userId, deletedAt: null },
    select: { organizationId: true },
  })
  return member?.organizationId ?? null
}

// Generate a sequential order number: ORD-XXXXXX.
// Simple approach: count existing orders + 1, left-padded to 6 digits.
// Not globally unique under extreme concurrency but safe for B2B volumes.
async function nextOrderNumber(tx) {
  const count = await tx.order.count()
  return `ORD-${String(count + 1).padStart(6, '0')}`
}

// ── POST /api/orders — create order + clear cart atomically ──────────────────

export async function POST(req) {
  const token = (await cookies()).get('token')?.value
  const payload = token ? verifyToken(token) : null
  if (!payload) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { shippingAddress } = await req.json()
  if (
    !shippingAddress?.line1 ||
    !shippingAddress?.city ||
    !shippingAddress?.state ||
    !shippingAddress?.postcode
  ) {
    return Response.json(
      { error: 'Shipping address is required' },
      { status: 400 },
    )
  }

  const organizationId = await getOrganizationId(payload.userId)
  if (!organizationId) {
    return Response.json(
      { error: 'No organization linked to this account' },
      { status: 400 },
    )
  }

  // Transaction: fetch cart → create order + items → clear cart.
  // All-or-nothing — a failure at any step rolls back the entire block.
  // Without this, a crash after `order.create` but before `cart clear`
  // would leave the cart intact (acceptable — cart items remain), or
  // worse, a crash after `cart clear` but before the order commit would
  // lose the cart with no order (not acceptable).
  const order = await prisma.$transaction(async (tx) => {
    // 1. Fetch cart with product details (snapshot source)
    const cart = await tx.cart.findFirst({
      where: { userId: payload.userId },
      include: {
        items: {
          include: { product: true },
        },
      },
    })

    if (!cart || cart.items.length === 0) {
      throw new CartEmptyError()
    }

    // 2. Snapshot prices (immutable order_items — same pattern as Mongoose)
    const items = cart.items.map((item) => ({
      productId: item.productId,
      productNameSnapshot: item.product.name,
      productSkuSnapshot: item.product.sku,
      unitPriceSnapshot: item.product.price,
      quantity: item.quantity,
      lineTotal: item.product.price.times(item.quantity),
    }))

    const subtotal = items.reduce(
      (sum, i) => sum + Number(i.unitPriceSnapshot) * i.quantity,
      0,
    )
    const taxRate = 0.1
    const taxAmount = parseFloat((subtotal * taxRate).toFixed(2))
    const total = parseFloat((subtotal + taxAmount).toFixed(2))

    // 3. Create the order with immutable line items
    const orderNumber = await nextOrderNumber(tx)
    const created = await tx.order.create({
      data: {
        orderNumber,
        organizationId,
        placedByUserId: payload.userId,
        status: 'pending_payment',
        subtotal,
        taxRate,
        taxAmount,
        total,
        shippingAddressSnapshot: shippingAddress,
        billingAddressSnapshot: shippingAddress, // reuse shipping as billing for now
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            productNameSnapshot: i.productNameSnapshot,
            productSkuSnapshot: i.productSkuSnapshot,
            unitPriceSnapshot: i.unitPriceSnapshot,
            quantity: i.quantity,
            lineTotal: i.lineTotal,
          })),
        },
      },
      include: { items: true },
    })

    // 4. Clear the cart — items fulfilled, no longer needed
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } })

    return created
  }).catch((err) => {
    if (err instanceof CartEmptyError) return null
    throw err
  })

  if (!order) {
    return Response.json({ error: 'Cart is empty' }, { status: 400 })
  }

  // Map Prisma shapes to the Mongoose-compatible format:
  //   order.id               → order._id     (CheckoutClient redirect)
  //   order.orderNumber      → (unchanged)    ORD-000001
  //   order_items.*Snapshot  → items.name/price (AccountClient display)
  return Response.json({
    order: {
      ...order,
      _id: order.id,
      items: order.items.map((item) => ({
        name: item.productNameSnapshot,
        price: Number(item.unitPriceSnapshot),
        quantity: item.quantity,
      })),
    },
  }, { status: 201 })
}

// ── GET /api/orders — list user's orders ─────────────────────────────────────

export async function GET() {
  const token = (await cookies()).get('token')?.value
  const payload = token ? verifyToken(token) : null
  if (!payload) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const organizationId = await getOrganizationId(payload.userId)
  if (!organizationId) {
    return Response.json({ orders: [] })
  }

  const orders = await prisma.order.findMany({
    where: { organizationId },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  })

  // Map for AccountClient: _id, status, items[].name/price, createdAt, total
  return Response.json({
    orders: orders.map((o) => ({
      _id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      subtotal: Number(o.subtotal),
      taxRate: Number(o.taxRate),
      taxAmount: Number(o.taxAmount),
      total: Number(o.total),
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      items: o.items.map((item) => ({
        name: item.productNameSnapshot,
        price: Number(item.unitPriceSnapshot),
        quantity: item.quantity,
      })),
    })),
  })
}

// ── internal error sentinel ──────────────────────────────────────────────────

class CartEmptyError extends Error {
  constructor() {
    super('Cart is empty')
    this.name = 'CartEmptyError'
  }
}
