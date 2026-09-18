import { listProducts } from '@/lib/services/productCatalog'

// Public, unauthenticated product listing for the NexonEcom storefront's
// client-side filter/pagination UI (app/products/page.js, BrandProducts).
// Not used by Nexon CRM — that integration calls the key-gated
// /api/products route instead. See lib/services/productCatalog.js for the
// shared query logic both routes call.
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const response = await listProducts(searchParams)
  return Response.json(response)
}
