// app/api/categories/route.js
import prisma from '@/lib/prisma'

export async function GET() {
  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      icon: true,
      imageUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return Response.json({
    categories: categories.map(({ imageUrl, ...category }) => ({
      ...category,
      image: imageUrl,
    })),
  })
}
