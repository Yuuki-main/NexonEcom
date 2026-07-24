'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import ProductGrid from '@/components/ProductGrid'
import CustomSelect from '@/components/CustomSelect'

const PER_PAGE_OPTIONS = [16, 32, 48]

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

export default function BrandProducts({ brandSlug }) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const categoryParam = sp.get('category') || ''
  const technologyParam = sp.get('technology') || ''
  const frameColorParam = sp.get('frameColor') || ''
  const cellTypeParam = sp.get('cellType') || ''
  const cellNumberParam = sp.get('cellNumber') || ''
  const wattageParam = sp.get('wattage') || ''
  const sortParam = sp.get('sort') || 'newest'
  const pageParam = parseInt(sp.get('page') || '1')
  const perPageParam = parseInt(sp.get('perPage') || '16')

  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
  })
  const [facets, setFacets] = useState({
    categories: [],
    wattage: [],
    cellType: [],
    cellNumber: [],
    technology: [],
    frameColor: [],
  })
  const [loading, setLoading] = useState(true)
  const hasDefaultedCategory = useRef(false)

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

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const q = new URLSearchParams()
      q.set('brand', brandSlug)
      if (categoryParam) q.set('category', categoryParam)
      if (technologyParam) q.set('technology', technologyParam)
      if (frameColorParam) q.set('frameColor', frameColorParam)
      if (cellTypeParam) q.set('cellType', cellTypeParam)
      if (cellNumberParam) q.set('cellNumber', cellNumberParam)
      if (wattageParam) q.set('wattage', wattageParam)
      if (sortParam !== 'newest') q.set('sort', sortParam)
      q.set('page', String(pageParam))
      q.set('limit', String(perPageParam))
      q.set('facets', 'true')

      try {
        const res = await fetch(`/api/products?${q}`)
        const data = await res.json()
        if (cancelled) return

        setProducts(data.products || [])
        setPagination(data.pagination || { page: 1, total: 0, totalPages: 0 })
        setFacets(
          data.facets || {
            categories: [],
            wattage: [],
            cellType: [],
            cellNumber: [],
            technology: [],
            frameColor: [],
          },
        )

        // Default to the brand's first available category tab, once, so
        // the page opens on a populated tab instead of "all categories".
        if (
          !categoryParam &&
          !hasDefaultedCategory.current &&
          data.facets?.categories?.length
        ) {
          hasDefaultedCategory.current = true
          push({ category: data.facets.categories[0].slug })
          return
        }

        setLoading(false)
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [
    brandSlug,
    categoryParam,
    technologyParam,
    frameColorParam,
    cellTypeParam,
    cellNumberParam,
    wattageParam,
    sortParam,
    pageParam,
    perPageParam,
    push,
  ])

  const toggleParamValue = (key, value) => {
    push({ [key]: buildList(sp.get(key) || '', value) })
  }
  const isActive = (key, value) => parseList(sp.get(key) || '').includes(value)

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

  return (
    <div className="mt-8">
      {/* ── Category tabs ── */}
      {facets.categories?.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-6 border-b border-[#ebebeb]">
          {facets.categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => push({ category: cat.slug, page: '' })}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
                categoryParam === cat.slug
                  ? 'border-[#00a7a7] text-[#00a7a7]'
                  : 'border-transparent text-[#666] hover:text-[#333]'
              }`}
            >
              {cat.label} ({cat.count})
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-8">
        {/* ── Sidebar filters ── */}
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

          {filterSections.length === 0 && !loading && (
            <p className="text-[12px] text-[#aaa]">No filters available.</p>
          )}
        </aside>

        {/* ── Product grid ── */}
        <div className="flex-1 min-w-0">
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

          {loading && (
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

          {!loading && products.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24">
              <p className="text-[15px] text-[#999]">
                No products match the selected filters.
              </p>
              <button
                onClick={() => push({ category: '' })}
                className="mt-4 text-[13px] text-[#00a7a7] hover:underline cursor-pointer"
              >
                Clear filters
              </button>
            </div>
          )}

          {!loading && products.length > 0 && (
            <ProductGrid products={products} />
          )}

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
    </div>
  )
}
