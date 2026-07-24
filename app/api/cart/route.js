import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

// ── helpers ──────────────────────────────────────────────────────────────────

async function getUserId() {
  const token = (await cookies()).get('token')?.value
  const payload = token ? verifyToken(token) : null
  if (!payload) return null
  return payload.userId
}

// Fetch cart with product details and map Prisma shapes to the Mongoose-
// compatible response format the frontend expects.
//   product.id           → product._id    (CartDrawer keys, Redux thunks)
//   product.images[].url → product.images (flatten relation → string array)
//   product.price        → Number         (so .toFixed(2) works)
//   product.stockQuantity → product.stock
async function getPopulatedCart(userId) {
  const cart = await prisma.cart.findFirst({
    where: { userId },
    include: {
      items: {
        include: {
          product: { include: { images: { orderBy: { displayOrder: 'asc' } } } },
        },
      },
    },
  })

  if (!cart) {
    return { cart: { items: [] } }
  }

  return {
    cart: {
      items: cart.items.map((item) => ({
        ...item,
        product: {
          ...item.product,
          _id: item.product.id,
          images: item.product.images.map((img) => img.url),
          price: Number(item.product.price),
          stock: item.product.stockQuantity,
        },
      })),
    },
  }
}

// ── GET /api/cart ────────────────────────────────────────────────────────────

export async function GET() {
  const userId = await getUserId()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return Response.json(await getPopulatedCart(userId))
}

// ── POST /api/cart — add item (or increment quantity) ────────────────────────

export async function POST(req) {
  const userId = await getUserId()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { productId, quantity } = await req.json()

  if (!productId || quantity == null || quantity < 1) {
    return Response.json(
      { error: 'productId and quantity (>= 1) are required' },
      { status: 400 },
    )
  }

  // Verify the product exists before touching the cart.
  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true, deletedAt: null },
  })
  if (!product) {
    return Response.json({ error: 'Product not found' }, { status: 404 })
  }

  // Ensure a cart row exists for this user (one cart per user — Carts.userId
  // has a unique constraint). create-or-connect avoids a race.
  const cart = await prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
  })

  // upsert the cart item: if a row for (cartId, productId) already exists,
  // increment its quantity; otherwise create it. The unique constraint
  // `uq_cart_items_cart_product` guarantees one row per product per cart.
  await prisma.cartItem.upsert({
    where: {
      cartId_productId: { cartId: cart.id, productId },
    },
    create: {
      cartId: cart.id,
      productId,
      quantity,
    },
    update: {
      quantity: { increment: quantity },
    },
  })

  return Response.json(await getPopulatedCart(userId))
}

// ── PATCH /api/cart — update quantity (remove if < 1) ────────────────────────

export async function PATCH(req) {
  const userId = await getUserId()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { productId, quantity } = await req.json()

  if (!productId || quantity == null) {
    return Response.json(
      { error: 'productId and quantity are required' },
      { status: 400 },
    )
  }

  const cart = await prisma.cart.findFirst({ where: { userId } })
  if (!cart) {
    return Response.json({ error: 'Cart not found' }, { status: 404 })
  }

  if (quantity < 1) {
    // Quantity < 1 means "remove." Prisma's delete throws if the row
    // doesn't exist, so we use deleteMany + count as a safe check.
    const result = await prisma.cartItem.deleteMany({
      where: { cartId: cart.id, productId },
    })
    if (result.count === 0) {
      return Response.json(
        { error: 'Item not found in cart' },
        { status: 404 },
      )
    }
  } else {
    // Update quantity to the exact value sent.
    const updated = await prisma.cartItem.updateMany({
      where: { cartId: cart.id, productId },
      data: { quantity },
    })
    if (updated.count === 0) {
      return Response.json(
        { error: 'Item not found in cart' },
        { status: 404 },
      )
    }
  }

  return Response.json(await getPopulatedCart(userId))
}

// ── DELETE /api/cart — remove a single item ──────────────────────────────────

export async function DELETE(req) {
  const userId = await getUserId()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { productId } = await req.json()

  if (!productId) {
    return Response.json({ error: 'productId is required' }, { status: 400 })
  }

  const cart = await prisma.cart.findFirst({ where: { userId } })
  if (!cart) {
    return Response.json({ error: 'Cart not found' }, { status: 404 })
  }

  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id, productId },
  })

  return Response.json(await getPopulatedCart(userId))
}
