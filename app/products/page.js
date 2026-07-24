'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ProductCard from '@/components/ProductCard'
import CustomSelect from '@/components/CustomSelect'

const PER_PAGE_OPTIONS = [16, 32, 48]

// ─── helpers ──────────────────────────────────────────────────────────────────

function parseList(str) {
  return str ? str.split(',').filter(Boolean) : []
}

function buildList(current, value) {
  const list = parseList(current)
  const idx = list.indexOf(value)
  if (idx === -1) list.push(value)
  else list.splice(idx, 1)
  return list.join(',')
}

// ─── main content (needs useSearchParams → must be wrapped in Suspense) ───────

function ProductsContent() {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const queryParam = sp.get('q') || ''
  const categoryParam = sp.get('category') || ''
  const technologyParam = sp.get('technology') || ''
  const frameColorParam = sp.get('frameColor') || ''
  const cellTypeParam = sp.get('cellType') || ''
  const cellNumberParam = sp.get('cellNumber') || ''
  const wattageParam = sp.get('wattage') || ''
  const brandParam = sp.get('brand') || ''
  const sortParam = sp.get('sort') || 'newest'
  const pageParam = parseInt(sp.get('page') || '1')
  const perPageParam = parseInt(sp.get('perPage') || '16')

  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [products, setProducts] = useState([])

  const categoryIcons = {
    'solar-panels': '/nexon_gfx/icons/cat_solar_pannels.png',
    inverters: '/nexon_gfx/icons/cat_inverters.png',
    'battery-storage': '/nexon_gfx/icons/cat_battery_storage.png',
    'mounting-systems': '/nexon_gfx/icons/cat_mounting_system.png',
  }
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
  })
  const [facets, setFacets] = useState({
    technology: [],
    frameColor: [],
    brands: [],
  })
  const [loading, setLoading] = useState(true)

  // push updated params; resets page unless 'page' is in the update itself
  const push = useCallback(
    (updates) => {
      const next = new URLSearchParams(sp.toString())
      for (const [k, v] of Object.entries(updates)) {
        if (v) next.set(k, v)
        else next.delete(k)
      }
      if (!('page' in updates)) next.delete('page')
      router.push(`${pathname}?${next.toString()}`, { scroll: false })
    },
    [sp, router, pathname],
  )

  // load categories & brands once
  useEffect(() => {
    Promise.all([fetch('/api/categories'), fetch('/api/brands')])
      .then(([c, b]) => Promise.all([c.json(), b.json()]))
      .then(([c, b]) => {
        setCategories(c.categories || [])
        setBrands(b.brands || [])
      })
  }, [])

  // fetch products whenever URL params change
  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const q = new URLSearchParams()
      if (queryParam) q.set('q', queryParam)
      if (categoryParam) q.set('category', categoryParam)
      if (technologyParam) q.set('technology', technologyParam)
      if (frameColorParam) q.set('frameColor', frameColorParam)
      if (cellTypeParam) q.set('cellType', cellTypeParam)
      if (cellNumberParam) q.set('cellNumber', cellNumberParam)
      if (wattageParam) q.set('wattage', wattageParam)
      if (brandParam) q.set('brand', brandParam)
      if (sortParam !== 'newest') q.set('sort', sortParam)
      q.set('page', String(pageParam))
      q.set('limit', String(perPageParam))
      q.set('facets', 'true')

      try {
        const res = await fetch(`/api/products?${q}`)
        const data = await res.json()
        if (!cancelled) {
          setProducts(data.products || [])
          setPagination(data.pagination || { page: 1, total: 0, totalPages: 0 })
          setFacets(
            data.facets || { technology: [], frameColor: [], brands: [] },
          )
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [
    queryParam,
    categoryParam,
    technologyParam,
    frameColorParam,
    cellTypeParam,
    cellNumberParam,
    wattageParam,
    brandParam,
    sortParam,
    pageParam,
    perPageParam,
  ])

  // ── event handlers ───────────────────────────────────────────────────────────

  const handleCategoryClick = (slug) => {
    // selecting the same category deselects it; always reset other filters
    push({
      category: categoryParam === slug ? '' : slug,
      technology: '',
      frameColor: '',
      cellType: '',
      cellNumber: '',
      wattage: '',
      brand: '',
    })
  }

  const toggleParamValue = (key, value) => {
    push({ [key]: buildList(sp.get(key) || '', value) })
  }

  const isBrandActive = (slug) => parseList(brandParam).includes(slug)
  const isActive = (key, value) => parseList(sp.get(key) || '').includes(value)

  // ── filter sidebar sections ──────────────────────────────────────────────────

  const filterSections = []
  if (facets.wattage?.length) {
    filterSections.push({
      key: 'wattage',
      label: 'Power (W)',
      options: facets.wattage,
    })
  }
  if (facets.cellType?.length) {
    filterSections.push({
      key: 'cellType',
      label: 'Cell Type',
      options: facets.cellType,
    })
  }
  if (facets.cellNumber?.length) {
    filterSections.push({
      key: 'cellNumber',
      label: 'Cell Number',
      options: facets.cellNumber,
    })
  }
  if (facets.technology?.length) {
    filterSections.push({
      key: 'technology',
      label: 'Cell Technology',
      options: facets.technology,
    })
  }
  if (facets.frameColor?.length) {
    filterSections.push({
      key: 'frameColor',
      label: 'Frame Color',
      options: facets.frameColor,
    })
  }

  const totalPages = pagination.totalPages || 0

  // ── page-number list with ellipsis ──────────────────────────────────────────

  function buildPageItems(total, current) {
    const pages = Array.from({ length: total }, (_, i) => i + 1)
    return pages
      .filter((p) => p === 1 || p === total || Math.abs(p - current) <= 1)
      .reduce((acc, p, i, arr) => {
        if (i > 0 && p - arr[i - 1] > 1) acc.push('…')
        acc.push(p)
        return acc
      }, [])
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-7">
        {/* ── Breadcrumb ── */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#888] mb-6">
          <Link href="/" className="hover:text-[#00a7a7]">
            Home
          </Link>
          <span>/</span>
          <span className="text-[#333] font-medium">Products</span>
          {categoryParam && (
            <>
              <span>/</span>
              <span className="text-[#333] font-medium capitalize">
                {categoryParam.replace(/-/g, ' ')}
              </span>
            </>
          )}
        </nav>

        {/* ── Category tabs ── */}
        <div className="flex items-start gap-7 mb-6 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => handleCategoryClick(cat.slug)}
              className="flex flex-col items-center gap-2 min-w-18 cursor-pointer shrink-0"
            >
              <div
                className={`w-18 h-18 relative rounded overflow-hidden border-2 transition-colors ${
                  categoryParam === cat.slug
                    ? 'border-[#00a7a7]'
                    : 'border-[#e0e0e0] hover:border-[#aac4f5]'
                }`}
              >
                <Image
                  src={
                    categoryIcons[cat.slug] ||
                    cat.image ||
                    'https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=200'
                  }
                  alt={cat.name}
                  fill
                  className="object-cover"
                  sizes="72px"
                />
              </div>
              <span
                className={`text-[11px] font-medium text-center leading-tight ${
                  categoryParam === cat.slug ? 'text-[#00a7a7]' : 'text-[#555]'
                }`}
              >
                {cat.name}
              </span>
            </button>
          ))}
        </div>

        <hr className="border-[#ebebeb] mb-4" />

        {/* ── Brand filter row ── */}
        <div className="flex items-center gap-2.5 mb-4 overflow-x-auto whitespace-nowrap pb-1">
          <span className="text-[13px] font-bold text-[#111] mr-1">Brands</span>
          and
        </div>

        <hr className="border-[#ebebeb] mb-6" />

        {/* ── Layout: sidebar + grid ── */}
        <div className="flex gap-8">
          {/* ── Sidebar ── */}
          <aside className="w-60 shrink-0">
            {filterSections.map(({ key, label, options }) => (
              <div key={key} className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-[14px] text-[#111]">
                    {label}
                  </span>
                  <span className="text-[18px] text-[#bbb] leading-none select-none">
                    —
                  </span>
                </div>

                <ul className="space-y-2.25">
                  {options.map((opt) => {
                    const checked = isActive(key, opt.label)
                    return (
                      <li key={opt.label}>
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleParamValue(key, opt.label)}
                            className="w-3.75 h-3.75 rounded border-[#bbb] accent-[#00a7a7] cursor-pointer"
                          />
                          <span
                            className={`text-[13px] leading-tight ${checked ? 'text-[#111] font-medium' : 'text-[#444]'}`}
                          >
                            {opt.label}{' '}
                            <span className="text-[#999] font-normal">
                              ({opt.count})
                            </span>
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>

                <div className="border-b border-dashed border-[#ddd] mt-5" />
              </div>
            ))}

            {/* no filters yet */}
            {filterSections.length === 0 && !loading && (
              <p className="text-[12px] text-[#aaa]">
                Select a category to see filters.
              </p>
            )}
          </aside>

          {/* ── Product grid ── */}
          <div className="flex-1 min-w-0">
            {/* sort bar */}
            <div className="flex items-center justify-between mb-5">
              <span className="text-[13px] text-[#666]">
                {loading ? '' : `${pagination.total} products`}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-[#666]">Sort by</span>
                <CustomSelect
                  value={sortParam}
                  onChange={(val) => push({ sort: val })}
                  options={[
                    { value: 'newest', label: 'Default' },
                    { value: 'price-asc', label: 'Price: Low to High' },
                    { value: 'price-desc', label: 'Price: High to Low' },
                    { value: 'name-asc', label: 'Name: A-Z' },
                  ]}
                />
              </div>
            </div>

            {/* skeleton */}
            {loading && (
              // <div className="grid grid-cols-4 gap-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="border border-[#eee] rounded p-3 animate-pulse"
                  >
                    <div className="h-45 bg-[#f4f4f4] rounded mb-3" />
                    <div className="h-3 bg-[#f0f0f0] rounded w-3/4 mb-2" />
                    <div className="h-3 bg-[#f0f0f0] rounded w-full mb-1" />
                    <div className="h-3 bg-[#f0f0f0] rounded w-2/3 mb-4" />
                    <div className="h-9 bg-[#f0f0f0] rounded" />
                  </div>
                ))}
              </div>
            )}

            {/* empty */}
            {!loading && products.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24">
                <p className="text-[15px] text-[#999]">
                  No products match the selected filters.
                </p>
                <button
                  onClick={() => router.push(pathname)}
                  className="mt-4 text-[13px] text-[#00a7a7] hover:underline cursor-pointer"
                >
                  Clear all filters
                </button>
              </div>
            )}

            {/* grid */}
            {!loading && products.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((p) => (
                  <ProductCard key={p.id || p._id} product={p} />
                ))}
              </div>
            )}

            {/* ── Pagination ── */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-end gap-1.5 mt-8">
                {buildPageItems(totalPages, pageParam).map((item, i) =>
                  item === '…' ? (
                    <span
                      key={`e${i}`}
                      className="px-1.5 text-[#bbb] text-[13px] select-none"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => push({ page: String(item) })}
                      className={`w-8 h-8 rounded text-[13px] font-medium transition-colors cursor-pointer ${
                        pageParam === item
                          ? 'bg-[#00a7a7] text-white'
                          : 'border border-[#ddd] text-[#444] hover:bg-[#f5f5f5]'
                      }`}
                    >
                      {item}
                    </button>
                  ),
                )}

                <button
                  onClick={() =>
                    push({ page: String(Math.min(pageParam + 1, totalPages)) })
                  }
                  disabled={pageParam >= totalPages}
                  className="w-8 h-8 rounded border border-[#ddd] text-[#444] hover:bg-[#f5f5f5] disabled:opacity-30 disabled:cursor-not-allowed text-[13px] transition-colors cursor-pointer"
                >
                  {'>'}
                </button>

                <CustomSelect
                  value={perPageParam}
                  onChange={(val) => push({ perPage: val, page: '1' })}
                  options={PER_PAGE_OPTIONS.map((n) => ({
                    value: n,
                    label: String(n),
                  }))}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

// ─── page export (Suspense required for useSearchParams) ──────────────────────

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <span className="text-[14px] text-[#aaa]">Loading products…</span>
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  )
}
