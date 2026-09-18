import { getProductById } from '@/lib/services/productCatalog'
import { isValidInternalApiKey, internalApiUnauthorized } from '@/lib/internalApiKey'

// Internal, server-to-server single-product lookup for Nexon CRM — requires
// `x-internal-api-key`. Not called by the NexonEcom storefront: the product
// detail page (app/products/[slug]/page.js) queries Prisma directly in a
// server component instead of hitting this route.
export async function GET(req, { params }) {
  if (!isValidInternalApiKey(req)) {
    return internalApiUnauthorized()
  }

  const { id } = await params
  const product = await getProductById(id)

  if (!product) {
    return Response.json({ error: 'Product not found' }, { status: 404 })
  }

  return Response.json({ product })
}
