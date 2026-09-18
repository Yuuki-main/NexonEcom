import prisma from '@/lib/prisma'

// Prisma `cell_type_enum` → display label. The frontend sends display
// labels as filter values (they come from the facet output), so we also
// accept them in the filter and map them back to enum values.
const CELL_TYPE_DISPLAY = { n_type: 'N-Type', p_type: 'P-Type' }
const CELL_TYPE_FROM_DISPLAY = Object.fromEntries(
  Object.entries(CELL_TYPE_DISPLAY).map(([k, v]) => [v, k]),
)

const CELL_NUMBER_ORDER = [
  '96 half-cell',
  '108 half-cell',
  '120 half-cell',
  '132 half-cell',
  '144 half-cell',
]

const SORT_MAP = {
  newest: { createdAt: 'desc' },
  'price-asc': { price: 'asc' },
  'price-desc': { price: 'desc' },
  'name-asc': { name: 'asc' },
}

// Helpers — identical logic to the Mongoose version, only the DB calls differ.
function parseList(str) {
  return str ? str.split(',').filter(Boolean) : []
}

// Shared by the public storefront route (app/api/store/products) and the
// internal CRM-facing route (app/api/products) so both stay in lockstep —
// only their auth/rate-limit wrapper differs, not the query logic.
export async function listProducts(searchParams) {
  const query = searchParams.get('q')
  const categorySlug = searchParams.get('category')
  const brandSlugs = searchParams.get('brand')
  const technologyRaw = searchParams.get('technology')
  const frameColorRaw = searchParams.get('frameColor')
  const cellTypeRaw = searchParams.get('cellType')
  const cellNumberRaw = searchParams.get('cellNumber')
  const wattageRaw = searchParams.get('wattage')
  const sort = searchParams.get('sort') || 'newest'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '16')
  const withFacets = searchParams.get('facets') === 'true'

  // ── Build the Prisma `where` clause ──────────────────────────────────────
  const where = { isActive: true, deletedAt: null }

  // Category: resolve slug → id. If the slug doesn't match, return empty
  // immediately — same guard as the old Mongoose version that skipped
  // Product.find({ category: null }).
  let resolvedCategoryId = null
  if (categorySlug) {
    const cat = await prisma.category.findFirst({
      where: { slug: categorySlug, deletedAt: null },
    })
    if (!cat) {
      return {
        products: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
        ...(withFacets && {
          facets: {
            wattage: [],
            cellType: [],
            cellNumber: [],
            technology: [],
            frameColor: [],
            brands: [],
          },
        }),
      }
    }
    resolvedCategoryId = cat.id
    where.categoryId = resolvedCategoryId
  }

  // Brand: resolve slugs → ids. Prisma uses `{ in: [...] }` exactly like
  // Mongoose's `{ $in: [...] }` — the shape is identical.
  if (brandSlugs) {
    const slugList = parseList(brandSlugs)
    const brandDocs = await prisma.brand.findMany({
      where: { slug: { in: slugList }, deletedAt: null },
    })
    const ids = brandDocs.map((b) => b.id)
    if (ids.length > 0) {
      where.brandId = ids.length === 1 ? ids[0] : { in: ids }
    }
  }

  // Text search across name, brand name, and description
  if (query) {
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      { brand: { name: { contains: query, mode: 'insensitive' } } },
    ]
  }

  // Multi-select text filters — Prisma `{ in: [...] }` is the drop-in
  // replacement for Mongoose `{ $in: [...] }`.
  if (technologyRaw) {
    const list = parseList(technologyRaw)
    where.technology = list.length === 1 ? list[0] : { in: list }
  }
  if (frameColorRaw) {
    const list = parseList(frameColorRaw)
    where.frameColor = list.length === 1 ? list[0] : { in: list }
  }
  if (cellTypeRaw) {
    // Map display labels ('N-Type') → Prisma enum values ('n_type').
    // Unknown values pass through — Prisma will reject them with a clear
    // error instead of silently matching nothing.
    const list = parseList(cellTypeRaw).map(
      (v) => CELL_TYPE_FROM_DISPLAY[v] || v,
    )
    where.cellType = list.length === 1 ? list[0] : { in: list }
  }
  if (cellNumberRaw) {
    const list = parseList(cellNumberRaw)
    where.cellNumber = list.length === 1 ? list[0] : { in: list }
  }
  if (wattageRaw) {
    const list = parseList(wattageRaw).map(Number)
    where.wattage = list.length === 1 ? list[0] : { in: list }
  }

  // ── Query ────────────────────────────────────────────────────────────────
  const orderBy = SORT_MAP[sort] || SORT_MAP.newest
  const skip = (page - 1) * limit

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true, brand: true, images: { orderBy: { displayOrder: 'asc' } } },
      skip,
      take: limit,
      orderBy,
    }),
    prisma.product.count({ where }),
  ])

  // Map Prisma shapes to the Mongoose-compatible response format the
  // frontend expects:
  //   id              → _id       (FavouriteButton, Link keys)
  //   images[].url    → images[]  (flatten relation → string array)
  //   stockQuantity   → stock     (not used in list view, but keep consistent)
  //   price           → Number    (so .toFixed(2) works in the frontend)
  const mappedProducts = products.map((p) => ({
    ...p,
    _id: p.id,
    images: p.images.map((img) => img.url),
    stock: p.stockQuantity,
    price: Number(p.price),
    // category & brand are already included objects — Prisma serializes them
    // the same way Mongoose did after .populate().
  }))

  const response = {
    products: mappedProducts,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }

  // ── Facets ───────────────────────────────────────────────────────────────
  if (withFacets) {
    const facetWhere = { isActive: true, deletedAt: null }
    if (resolvedCategoryId) facetWhere.categoryId = resolvedCategoryId

    const allForFacets = await prisma.product.findMany({
      where: facetWhere,
      include: { brand: { select: { name: true, slug: true } } },
    })

    const techCounts = {}
    const colorCounts = {}
    const cellTypeCounts = {}
    const cellNumberCounts = {}
    const wattageCounts = {}
    const brandCounts = {}
    const brandNames = {}

    for (const p of allForFacets) {
      if (p.technology) techCounts[p.technology] = (techCounts[p.technology] || 0) + 1
      if (p.frameColor) colorCounts[p.frameColor] = (colorCounts[p.frameColor] || 0) + 1
      if (p.cellType) {
        // Format enum → display label for facet output
        const label = CELL_TYPE_DISPLAY[p.cellType] || p.cellType
        cellTypeCounts[label] = (cellTypeCounts[label] || 0) + 1
      }
      if (p.cellNumber) cellNumberCounts[p.cellNumber] = (cellNumberCounts[p.cellNumber] || 0) + 1
      if (p.wattage != null) wattageCounts[p.wattage] = (wattageCounts[p.wattage] || 0) + 1
      if (p.brand) {
        brandCounts[p.brand.slug] = (brandCounts[p.brand.slug] || 0) + 1
        brandNames[p.brand.slug] = p.brand.name
      }
    }

    response.facets = {
      wattage: Object.entries(wattageCounts)
        .map(([label, count]) => ({ label: String(label), count }))
        .sort((a, b) => Number(a.label) - Number(b.label)),
      cellType: Object.entries(cellTypeCounts)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      cellNumber: Object.entries(cellNumberCounts)
        .map(([label, count]) => ({ label, count }))
        .sort(
          (a, b) =>
            CELL_NUMBER_ORDER.indexOf(a.label) -
            CELL_NUMBER_ORDER.indexOf(b.label),
        ),
      technology: Object.entries(techCounts)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count),
      frameColor: Object.entries(colorCounts)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count),
      brands: Object.entries(brandCounts)
        .map(([slug, count]) => ({ slug, label: brandNames[slug], count }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    }

    // Category counts, scoped to the current brand filter (if any) — lets a
    // brand detail page show tabs like "Panels (3)" for just that brand,
    // independent of the category-scoped facets above.
    const categoryFacetWhere = { isActive: true, deletedAt: null }
    if (where.brandId) categoryFacetWhere.brandId = where.brandId

    const categoryGroups = await prisma.product.groupBy({
      by: ['categoryId'],
      where: categoryFacetWhere,
      _count: true,
    })
    const categoryDocs = await prisma.category.findMany({
      where: { id: { in: categoryGroups.map((g) => g.categoryId) } },
      select: { id: true, name: true, slug: true },
    })
    const categoryById = Object.fromEntries(categoryDocs.map((c) => [c.id, c]))

    response.facets.categories = categoryGroups
      .map((g) => ({
        slug: categoryById[g.categoryId]?.slug,
        label: categoryById[g.categoryId]?.name,
        count: g._count,
      }))
      .filter((c) => c.slug)
      .sort((a, b) => a.label.localeCompare(b.label))
  }

  return response
}

export async function getProductById(id) {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

  if (!product) return null

  return {
    ...product,
    _id: product.id,
    images: product.images.map((img) => img.url),
    stock: product.stockQuantity,
    price: Number(product.price),
  }
}
