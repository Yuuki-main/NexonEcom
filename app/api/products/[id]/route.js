import prisma from '@/lib/prisma'

// Route param can be either the product's id or its slug (old Mongoose
// version matched `$or: [{ _id: id }, { slug: id }]`). Postgres's `id`
// column is uuid-typed, so passing a non-UUID string (a slug) straight
// into an `id` equality filter would throw "invalid input syntax for type
// uuid" instead of just not matching — this guard only adds the id branch
// when the param actually looks like a UUID, preserving "match id or slug"
// behavior without crashing on the slug case.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(req, { params }) {
  const { id } = await params

  const product = await prisma.product.findFirst({
    where: {
      deletedAt: null,
      OR: UUID_REGEX.test(id) ? [{ id }, { slug: id }] : [{ slug: id }],
    },
    include: {
      category: true,
      brand: true,
      images: { orderBy: { displayOrder: 'asc' } },
    },
  })

  if (!product) {
    return Response.json({ error: 'Product not found' }, { status: 404 })
  }

  // Same Mongoose-compatible field mapping used by the sibling
  // /api/products list route: id → _id, images[].url → images[],
  // stockQuantity → stock, price → Number.
  return Response.json({
    product: {
      ...product,
      _id: product.id,
      images: product.images.map((img) => img.url),
      stock: product.stockQuantity,
      price: Number(product.price),
    },
  })
}
