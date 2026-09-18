import { listProducts } from '@/lib/services/productCatalog'
import { isValidInternalApiKey, internalApiUnauthorized } from '@/lib/internalApiKey'

// Internal, server-to-server product feed for Nexon CRM — requires
// `x-internal-api-key`. The public storefront does NOT call this route; it
// uses /api/store/products instead. See lib/services/productCatalog.js for
// the shared query logic both routes call.
export async function GET(req) {
  if (!isValidInternalApiKey(req)) {
    return internalApiUnauthorized()
  }

  const { searchParams } = new URL(req.url)
  const response = await listProducts(searchParams)
  return Response.json(response)
}
