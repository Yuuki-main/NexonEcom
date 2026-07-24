// app/api/brands/route.js
import prisma from '@/lib/prisma'

export async function GET() {
  const brands = await prisma.brand.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      website: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  // Map Prisma `id` → `_id` to preserve backward compatibility.
  // The products page and BrandPartners component both use `b._id`
  // as React keys, and BrandPartners falls back to `b.slug` if `_id`
  // is absent. We supply both so existing code continues working.
  return Response.json({
    brands: brands.map(({ id, ...brand }) => ({
      ...brand,
      _id: id,
    })),
  })
}
