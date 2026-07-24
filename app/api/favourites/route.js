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

// Fetch favourites with product details. The old Mongoose response wrapped
// products in a Favourite-document envelope: { favourites: { products: [...] } }.
// Prisma's Favourite table has one row per product, so we query all rows and
// collect their product objects into the same array shape.
//
// Fields the frontend reads (FavouritesClient, FavouriteButton):
//   p._id, p.slug, p.images[0], p.name, p.brand.name, p.manufacturer,
//   p.wattage, p.price
async function getPopulatedFavourites(userId) {
  const favs = await prisma.favourite.findMany({
    where: { userId },
    include: {
      product: {
        include: {
          images: { orderBy: { displayOrder: 'asc' } },
          brand: true,
        },
      },
    },
  })

  return {
    favourites: {
      products: favs.map((f) => ({
        ...f.product,
        _id: f.product.id,
        images: f.product.images.map((img) => img.url),
        price: Number(f.product.price),
        wattage:
          f.product.wattage != null ? Number(f.product.wattage) : null,
      })),
    },
  }
}

// ── GET /api/favourites ──────────────────────────────────────────────────────

export async function GET() {
  try {
    const userId = await getUserId()
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return Response.json(await getPopulatedFavourites(userId))
  } catch (err) {
    console.error('GET /api/favourites error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── POST /api/favourites — add (idempotent — duplicate is a no-op) ───────────

export async function POST(req) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId } = await req.json()
    if (!productId) {
      return Response.json({ error: 'productId is required' }, { status: 400 })
    }

    // Verify the product exists and is active before creating a favourite
    // row pointing at it.
    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true, deletedAt: null },
    })
    if (!product) {
      return Response.json({ error: 'Product not found' }, { status: 404 })
    }

    // (userId, productId) has a unique constraint. If the row already
    // exists, Prisma throws P2002. We catch it and treat the duplicate as
    // a silent no-op — same behaviour as the old Mongoose code.
    try {
      await prisma.favourite.create({
        data: { userId, productId },
      })
    } catch (createErr) {
      if (createErr.code !== 'P2002') throw createErr
      // Duplicate — already favourited, silently ignore.
    }

    return Response.json(await getPopulatedFavourites(userId))
  } catch (err) {
    console.error('POST /api/favourites error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── DELETE /api/favourites — remove a single favourite ───────────────────────

export async function DELETE(req) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId } = await req.json()
    if (!productId) {
      return Response.json({ error: 'productId is required' }, { status: 400 })
    }

    // deleteMany is safe even if the row doesn't exist — it just returns
    // count 0, and we return the current favourites list regardless.
    await prisma.favourite.deleteMany({
      where: { userId, productId },
    })

    return Response.json(await getPopulatedFavourites(userId))
  } catch (err) {
    console.error('DELETE /api/favourites error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
