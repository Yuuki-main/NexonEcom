// app/products/[slug]/page.js
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import ProductDetail from '@/components/ProductDetail'

export default async function ProductPage({ params }) {
  const { slug } = await params

  const product = await prisma.product.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    include: {
      brand: true,
      category: true,
      images: {
        orderBy: { displayOrder: 'asc' },
      },
    },
  })

  if (!product) notFound()

  // Map Prisma schema to the shape ProductDetail expects.
  // The component was built against the Mongoose model, so we adapt:
  //
  //   Prisma field         → Component expects
  //   ─────────────────────────────────────────
  //   id                   → _id              (addToCart, FavouriteButton)
  //   images[].url         → images[]         (flatten relation → string array)
  //   stockQuantity        → stock            (quantity input, out-of-stock check)
  //   cellType enum        → "N-Type"/"P-Type" (specs display; Prisma returns "n_type"/"p_type")
  //   efficiency numeric   → "22.1%" string   (specs display; Prisma returns 22.10)
  //   wattage Decimal      → Number           (specs display; avoid "475.00W")
  //   price Decimal        → Number           (toFixed(2) works either way, but consistency)

  return (
    <ProductDetail
      product={{
        ...product,
        _id: product.id,
        images: product.images.map((img) => img.url),
        stock: product.stockQuantity,
        cellType:
          product.cellType === 'n_type'
            ? 'N-Type'
            : product.cellType === 'p_type'
              ? 'P-Type'
              : product.cellType,
        efficiency: product.efficiency != null ? `${product.efficiency}%` : null,
        wattage: product.wattage != null ? Number(product.wattage) : null,
        price: Number(product.price),
      }}
    />
  )
}
