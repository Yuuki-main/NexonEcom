'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useDispatch, useSelector } from 'react-redux'
import {
  ChevronRight,
  Download,
  Loader2,
  Minus,
  Plus,
  ShoppingCart,
} from 'lucide-react'

import { addToCart, toggleCart } from '@/store/slices/cartSlice'
import FavouriteButton from '@/components/FavouriteButton'

const WAREHOUSES = [
  'Sydney',
  'Brisbane',
  'Adelaide',
  'Townsville',
  'Melbourne',
  'Perth',
]

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=1000'

export default function ProductDetail({ product }) {
  const dispatch = useDispatch()

  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)

  const [qty, setQty] = useState(1)
  const [selectedWarehouse, setSelectedWarehouse] = useState('Sydney')
  const [adding, setAdding] = useState(false)
  const [cartError, setCartError] = useState('')

  const productId = product.id || product._id

  const price = Number(product.price || 0)

  const compareAtPrice = Number(
    product.compareAtPrice ?? product.originalPrice ?? product.oldPrice ?? 0,
  )

  const wattage = Number(product.wattage || 0)

  const stockQuantity = Number(
    product.stock ?? product.stockQuantity ?? product.inventory ?? 0,
  )

  const isInStock = stockQuantity > 0

  const centsPerWatt = wattage > 0 ? ((price / wattage) * 100).toFixed(1) : null

  const compareCentsPerWatt =
    compareAtPrice > price && wattage > 0
      ? ((compareAtPrice / wattage) * 100).toFixed(1)
      : null

  const firstImage = product.images?.[0]

  const imageSrc =
    typeof firstImage === 'string'
      ? firstImage
      : firstImage?.url || firstImage?.src || FALLBACK_IMAGE

  const brandName = product.brand?.name || product.manufacturer || ''

  const brandLogo =
    product.brand?.logo || product.brand?.image || product.brandLogo || null

  const alternativeSlug =
    product.alternativeProduct?.slug ||
    product.alternative?.slug ||
    product.alternativeSlug ||
    null

  const documents = getDocuments(product)

  const specificationRows = [
    ['Power (W)', product.wattage || product.power],
    [
      'Frame Thickness (mm)',
      product.frameThickness ?? product.frameThicknessMm,
    ],
    ['Cell Type', product.cellType],
    ['Connector', product.connector || product.connectorType],
    ['Frame Color', product.frameColor],
    ['Cell', product.cellNumber || product.cells || product.cellCount],
    ['Cell Technology', product.technology || product.cellTechnology],
    ['CEC Model', product.cecModel || product.cecModelNumber],
  ].filter(([, value]) => hasValue(value))

  const shippingRows = [
    ['Weight (kg)', product.weight ?? product.weightKg],
    ['Qty per Pallet', product.qtyPerPallet ?? product.quantityPerPallet],
    [
      'Dimension (L*W*H mm)',
      product.dimension || product.dimensions || product.productDimensions,
    ],
  ].filter(([, value]) => hasValue(value))

  const warrantyRows = [
    [
      'Product Warranty (Years)',
      product.productWarranty ??
        product.productWarrantyYears ??
        product.warranty,
    ],
    [
      'Performance Warranty (Years)',
      product.performanceWarranty ?? product.performanceWarrantyYears,
    ],
  ].filter(([, value]) => hasValue(value))

  function getWarehouseStock(warehouse) {
    const warehouseStock =
      product.warehouseStock ||
      product.warehouseStocks ||
      product.inventoryByWarehouse

    if (warehouseStock && typeof warehouseStock === 'object') {
      const directValue =
        warehouseStock[warehouse] ?? warehouseStock[warehouse.toLowerCase()]

      if (directValue != null) {
        if (typeof directValue === 'object') {
          return Number(directValue.stock ?? directValue.quantity ?? 0)
        }

        return Number(directValue)
      }
    }

    if (warehouse === 'Sydney') {
      return stockQuantity
    }

    return 0
  }

  function handleDecrease() {
    setQty((current) => Math.max(1, current - 1))
  }

  function handleIncrease() {
    setQty((current) => {
      if (isInStock && current >= stockQuantity) {
        return current
      }

      return current + 1
    })
  }

  function handleQuantityChange(event) {
    const value = event.target.value

    if (value === '') {
      setQty('')
      return
    }

    const parsedValue = Number.parseInt(value, 10)

    if (Number.isNaN(parsedValue) || parsedValue < 1) {
      return
    }

    if (isInStock && parsedValue > stockQuantity) {
      setQty(stockQuantity)
      return
    }

    setQty(parsedValue)
  }

  function handleQuantityBlur() {
    const parsedValue = Number.parseInt(qty, 10)

    if (Number.isNaN(parsedValue) || parsedValue < 1) {
      setQty(1)
      return
    }

    if (isInStock && parsedValue > stockQuantity) {
      setQty(stockQuantity)
    }
  }

  async function handleAddToCart() {
    if (!isAuthenticated || !productId) {
      return
    }

    const quantity = Number.parseInt(qty, 10)

    if (Number.isNaN(quantity) || quantity < 1) {
      setCartError('Enter a valid quantity.')
      return
    }

    setAdding(true)
    setCartError('')

    try {
      await dispatch(
        addToCart({
          productId,
          quantity,
        }),
      ).unwrap()

      dispatch(toggleCart())
    } catch (error) {
      setCartError(error?.message || 'Failed to add product to cart.')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-[#e5e7eb]">
        <div className="mx-auto max-w-[1536px] px-5 py-4 sm:px-8 lg:px-10">
          <nav className="flex items-center gap-2 text-[13px]">
            <Link
              href="/"
              className="text-[#718096] transition hover:text-[#1478d4]"
            >
              Home
            </Link>

            <ChevronRight size={16} className="text-[#94a3b8]" />

            <Link
              href="/products"
              className="text-[#718096] transition hover:text-[#1478d4]"
            >
              Products
            </Link>

            <ChevronRight size={16} className="text-[#94a3b8]" />

            <span className="font-semibold text-[#202630]">Detail</span>
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-[1536px] px-5 pb-16 pt-7 sm:px-8 lg:px-10">
        <div className="mb-8">
          {product.sku && (
            <p className="mb-1 text-[13px] font-medium text-[#202630]">
              {product.sku}
            </p>
          )}

          <h1 className="max-w-[1450px] text-[20px] font-bold leading-[1.45] text-[#202630] sm:text-[25px]">
            {product.name}
          </h1>
        </div>

        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <div className="grid items-start gap-8 md:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[430px_minmax(0,1fr)]">
              <div className="min-w-0">
                <div className="relative h-[380px] w-full bg-white sm:h-[400px]">
                  <Image
                    src={imageSrc}
                    alt={product.name}
                    fill
                    priority
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 430px"
                  />
                </div>

                <div className="mt-5 flex items-center justify-between gap-4 rounded-md bg-[#f4f5f5] px-5 py-4">
                  <p className="text-[13px] font-semibold leading-5 text-[#05963d]">
                    Need it sooner?
                    <br />
                    Explore our similar products!
                  </p>

                  <Link
                    href={
                      alternativeSlug
                        ? `/products/${alternativeSlug}`
                        : '/products'
                    }
                    className="flex h-11 min-w-[185px] items-center justify-center rounded-md bg-[#0baa4b] px-5 text-[14px] font-semibold text-white transition hover:bg-[#078d3d]"
                  >
                    View alternative
                  </Link>
                </div>
              </div>

              <div className="min-w-0 pt-1">
                <div className="flex min-h-[72px] items-center justify-between gap-5">
                  {isAuthenticated ? (
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-[36px] font-bold leading-none tracking-[-0.04em] text-[#202630]">
                        ${formatMainPrice(price)}
                      </span>

                      <span className="text-[16px] font-medium text-[#202630]">
                        {formatDecimalPrice(price)}
                      </span>

                      {centsPerWatt && (
                        <span className="text-[15px] text-[#202630]">
                          ({centsPerWatt} c/W)
                        </span>
                      )}

                      <span className="text-[13px] text-[#202630]">ex GST</span>

                      {compareAtPrice > price && (
                        <span className="basis-full text-[13px] text-[#94a3b8] line-through">
                          ${compareAtPrice.toFixed(3)}
                          {compareCentsPerWatt
                            ? ` (${compareCentsPerWatt} c/W)`
                            : ''}
                        </span>
                      )}
                    </div>
                  ) : (
                    <Link
                      href={`/login?redirect=/products/${product.slug}`}
                      className="flex h-12 items-center justify-center rounded-md bg-[#1478d4] px-7 text-[14px] font-semibold text-white transition hover:bg-[#0f68b8]"
                    >
                      Login for price
                    </Link>
                  )}

                  {brandLogo ? (
                    <img
                      src={brandLogo}
                      alt={brandName}
                      className="max-h-[45px] max-w-[145px] object-contain"
                    />
                  ) : (
                    <span className="shrink-0 text-[20px] font-bold text-[#1478d4]">
                      {brandName}
                    </span>
                  )}
                </div>

                <div className="border-t border-dashed border-[#d9dde3] pt-6">
                  <h2 className="mb-3 text-[14px] font-semibold text-[#718096]">
                    Buy From
                  </h2>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {WAREHOUSES.map((warehouse) => {
                      const warehouseQuantity = getWarehouseStock(warehouse)

                      const warehouseInStock = warehouseQuantity > 0

                      const isSelected = selectedWarehouse === warehouse

                      return (
                        <button
                          key={warehouse}
                          type="button"
                          onClick={() => setSelectedWarehouse(warehouse)}
                          className={`min-h-[85px] rounded-md border p-3 text-left transition ${
                            isSelected
                              ? 'border-[#1688e8] bg-[#eff6ff]'
                              : 'border-transparent bg-[#f7f7f7] hover:border-[#d7dee8]'
                          }`}
                        >
                          <span
                            className={`block text-[16px] font-bold ${
                              isSelected ? 'text-[#202630]' : 'text-[#778397]'
                            }`}
                          >
                            {warehouse}
                          </span>

                          <span
                            className={`mt-2 block text-[13px] ${
                              warehouseInStock
                                ? 'text-[#16943d]'
                                : isSelected
                                  ? 'text-[#ff3535]'
                                  : 'text-[#969f99]'
                            }`}
                          >
                            {warehouseInStock ? 'In Stock' : 'On Request'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-[72px] flex flex-col gap-3">
                  {isAuthenticated ? (
                    <>
                      {/* Favourite left + quantity selector fills remaining width */}
                      <div className="flex w-full items-stretch gap-3">
                        <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-md border border-[#d5dce5] bg-white">
                          <FavouriteButton
                            productId={productId}
                            className="h-full w-full rounded-md bg-transparent p-0 shadow-none hover:bg-[#f8fafc]"
                            iconSize={24}
                          />
                        </div>

                        <div className="flex h-[48px] min-w-0 flex-1 overflow-hidden rounded-md border border-[#cbd5e1] bg-white">
                          <button
                            type="button"
                            onClick={handleDecrease}
                            disabled={Number(qty) <= 1}
                            aria-label="Decrease quantity"
                            className="flex w-[48px] shrink-0 items-center justify-center border-r border-[#cbd5e1] text-[#94a3b8] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Minus size={20} />
                          </button>

                          <input
                            type="number"
                            min="1"
                            max={isInStock ? stockQuantity : undefined}
                            value={qty}
                            onChange={handleQuantityChange}
                            onBlur={handleQuantityBlur}
                            aria-label="Product quantity"
                            className="min-w-0 flex-1 border-0 bg-white text-center text-[17px] font-medium text-[#202630] outline-none"
                          />

                          <button
                            type="button"
                            onClick={handleIncrease}
                            disabled={isInStock && Number(qty) >= stockQuantity}
                            aria-label="Increase quantity"
                            className="flex w-[48px] shrink-0 items-center justify-center border-l border-[#cbd5e1] text-[#94a3b8] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Plus size={20} />
                          </button>
                        </div>
                      </div>

                      {/* Full-width button below favourite and quantity */}
                      <button
                        type="button"
                        onClick={handleAddToCart}
                        disabled={adding || !productId}
                        className="flex h-[48px] w-full items-center justify-center gap-3 rounded-md bg-[#1478d4] px-7 text-[18px] font-semibold text-white transition hover:bg-[#0f68b8] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {adding ? (
                          <>
                            <Loader2 size={22} className="animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <ShoppingCart size={25} />
                            Add to Cart
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex h-[58px] w-[58px] items-center justify-center rounded-md border border-[#d5dce5] bg-white">
                        <FavouriteButton
                          productId={productId}
                          className="h-full w-full rounded-md bg-transparent p-0 shadow-none hover:bg-[#f8fafc]"
                          iconSize={24}
                        />
                      </div>

                      <Link
                        href={`/login?redirect=/products/${product.slug}`}
                        className="flex h-[58px] w-full items-center justify-center rounded-md bg-[#1478d4] px-7 text-[17px] font-semibold text-white transition hover:bg-[#0f68b8]"
                      >
                        Login for price
                      </Link>
                    </>
                  )}
                </div>

                {/* <div className="mt-[72px] flex flex-wrap items-stretch gap-3">
                  <div className="h-[58px] w-[58px] rounded-md border border-[#d5dce5] bg-white flex items-center justify-center">
                    <FavouriteButton productId={productId} />
                  </div>

                  {isAuthenticated ? (
                    <>
                      <div className="flex h-[58px] overflow-hidden rounded-md border border-[#cbd5e1] bg-white">
                        <button
                          type="button"
                          onClick={handleDecrease}
                          disabled={Number(qty) <= 1}
                          aria-label="Decrease quantity"
                          className="flex w-[58px] items-center justify-center border-r border-[#cbd5e1] text-[#94a3b8] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Minus size={20} />
                        </button>

                        <input
                          type="number"
                          min="1"
                          max={isInStock ? stockQuantity : undefined}
                          value={qty}
                          onChange={handleQuantityChange}
                          onBlur={handleQuantityBlur}
                          aria-label="Product quantity"
                          className="w-[140px] border-0 bg-white text-center text-[17px] font-medium text-[#202630] outline-none"
                        />

                        <button
                          type="button"
                          onClick={handleIncrease}
                          disabled={isInStock && Number(qty) >= stockQuantity}
                          aria-label="Increase quantity"
                          className="flex w-[58px] items-center justify-center border-l border-[#cbd5e1] text-[#94a3b8] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Plus size={20} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddToCart}
                        disabled={adding || !productId}
                        className="flex h-[58px] min-w-[260px] flex-1 items-center justify-center gap-3 rounded-md bg-[#1478d4] px-7 text-[18px] font-semibold text-white transition hover:bg-[#0f68b8] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {adding ? (
                          <>
                            <Loader2 size={22} className="animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <ShoppingCart size={25} />
                            Add to Cart
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <Link
                      href={`/login?redirect=/products/${product.slug}`}
                      className="flex h-[58px] min-w-[260px] flex-1 items-center justify-center rounded-md bg-[#1478d4] px-7 text-[17px] font-semibold text-white transition hover:bg-[#0f68b8]"
                    >
                      Login for price
                    </Link>
                  )}
                </div> */}

                {cartError && (
                  <p className="mt-3 text-[13px] text-red-600">{cartError}</p>
                )}
              </div>
            </div>

            <section className="mt-12">
              <h2 className="mb-6 text-[18px] font-bold text-[#202630]">
                Product Description
              </h2>

              {product.description && (
                <p className="mb-8 max-w-[1000px] text-[14px] leading-7 text-[#526074]">
                  {product.description}
                </p>
              )}

              <SpecSection title="Specification" rows={specificationRows} />

              <SpecSection title="Shipping Information" rows={shippingRows} />

              <SpecSection title="Warranty Information" rows={warrantyRows} />
            </section>
          </div>

          <aside className="rounded-md border border-[#d9dee6] bg-white">
            <div className="border-b border-[#d9dee6] px-5 py-4">
              <h2 className="text-[15px] font-bold text-[#17375e]">
                Document Downloads
              </h2>
            </div>

            {documents.length > 0 ? (
              <div className="divide-y divide-dashed divide-[#d9dee6] px-5">
                {documents.map((document, index) => (
                  <a
                    key={`${document.url}-${index}`}
                    href={document.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-end justify-between gap-4 py-4 transition hover:text-[#1478d4]"
                  >
                    <span className="min-w-0">
                      <span className="block text-[12px] font-medium text-[#7c8aa0]">
                        {document.type}
                      </span>

                      <span className="mt-1 block truncate text-[13px] font-medium text-[#202630]">
                        {document.name}
                      </span>
                    </span>

                    <Download size={18} className="shrink-0 text-[#202630]" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="px-5 py-6 text-[13px] text-[#7c8aa0]">
                No documents available.
              </p>
            )}
          </aside>
        </div>
      </main>
    </div>
  )
}

function SpecSection({ title, rows }) {
  if (!rows.length) {
    return null
  }

  return (
    <section className="mb-8">
      <h3 className="mb-3 text-[14px] font-bold text-[#075494]">{title}</h3>

      <div>
        {rows.map(([label, value], index) => (
          <div
            key={label}
            className={`grid min-h-[54px] grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] items-center gap-5 rounded-md px-5 py-3 text-[14px] ${
              index % 2 === 0 ? 'bg-[#f2f2f2]' : 'bg-white'
            }`}
          >
            <span className="text-[#202630]">{label}</span>

            <span className="font-semibold text-[#202630]">
              {String(value)}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

function getDocuments(product) {
  const documents = []

  if (Array.isArray(product.documents)) {
    product.documents.forEach((document) => {
      if (!document) return

      if (typeof document === 'string') {
        documents.push({
          type: 'Document',
          name: getFileName(document),
          url: document,
        })

        return
      }

      const url = document.url || document.fileUrl || document.href

      if (!url) return

      documents.push({
        type: document.type || document.category || 'Document',
        name: document.name || document.title || getFileName(url),
        url,
      })
    })
  }

  addDocument(
    documents,
    'Datasheet',
    product.datasheetName,
    product.datasheetUrl || product.datasheet,
  )

  addDocument(
    documents,
    'Installation Manual',
    product.installationManualName,
    product.installationManualUrl ||
      product.manualUrl ||
      product.installationManual,
  )

  return documents
}

function addDocument(documents, type, providedName, url) {
  if (!url || typeof url !== 'string') {
    return
  }

  if (documents.some((document) => document.url === url)) {
    return
  }

  documents.push({
    type,
    name: providedName || getFileName(url),
    url,
  })
}

function getFileName(url) {
  try {
    const pathname = new URL(url, 'https://example.com').pathname

    return decodeURIComponent(pathname.split('/').pop()) || 'Download document'
  } catch {
    return 'Download document'
  }
}

function hasValue(value) {
  return value !== null && value !== undefined && value !== ''
}

function formatMainPrice(value) {
  const [whole] = Number(value || 0)
    .toFixed(3)
    .split('.')

  return whole
}

function formatDecimalPrice(value) {
  const [, decimal] = Number(value || 0)
    .toFixed(3)
    .split('.')

  return `.${decimal}`
}

// 'use client'

// import Image from 'next/image'
// import Link from 'next/link'
// import { useState } from 'react'
// import { useSelector, useDispatch } from 'react-redux'
// import { addToCart, toggleCart } from '@/store/slices/cartSlice'
// import FavouriteButton from '@/components/FavouriteButton'

// export default function ProductDetail({ product }) {
//   const [qty, setQty] = useState(1)
//   const [cartError, setCartError] = useState('')
//   const dispatch = useDispatch()

//   const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)

//   async function handleAddToCart() {
//     if (!isAuthenticated) return
//     setCartError('')
//     try {
//       await dispatch(
//         addToCart({ productId: product._id, quantity: qty }),
//       ).unwrap()
//       dispatch(toggleCart())
//     } catch (err) {
//       setCartError(err.message || 'Failed to add to cart')
//     }
//   }

//   const specs = [
//     ['SKU', product.sku],
//     ['Manufacturer', product.manufacturer],
//     ['Wattage', product.wattage ? `${product.wattage}W` : null],
//     ['Cell Type', product.cellType],
//     ['Cell Number', product.cellNumber],
//     ['Technology', product.technology],
//     ['Frame Color', product.frameColor],
//     ['Efficiency', product.efficiency],
//     ['Warranty', product.warranty],
//   ].filter(([, value]) => value)

//   return (
//     <div className="grid md:grid-cols-2 gap-8 p-8">
//       <div className="relative w-full h-96">
//         <Image
//           src={product.images?.[0] || '/placeholder.jpg'}
//           alt={product.name}
//           fill
//           className="object-cover rounded"
//         />
//         <FavouriteButton productId={product._id} />
//       </div>

//       <div>
//         <p className="text-sm text-gray-500">
//           {product.brand?.name || product.manufacturer}
//         </p>

//         <h1 className="text-2xl font-bold mb-2">{product.name}</h1>

//         {isAuthenticated ? (
//           <p className="text-xl font-semibold mb-4">
//             ${product.price.toFixed(2)}
//           </p>
//         ) : (
//           <Link
//             href="/login"
//             className="inline-block mb-4 bg-[#00a7a7] text-white px-5 py-2 rounded font-semibold"
//           >
//             Login for price
//           </Link>
//         )}

//         <p className="text-gray-600 mb-6">{product.description}</p>

//         {isAuthenticated && (
//           <div className="flex items-center gap-3 mb-6">
//             <input
//               type="number"
//               min="1"
//               max={product.stock}
//               value={qty}
//               onChange={(e) => setQty(Number(e.target.value))}
//               className="w-20 border rounded px-2 py-1"
//             />

//             <button
//               onClick={handleAddToCart}
//               disabled={product.stock === 0}
//               className="bg-black text-white px-6 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
//             >
//               {product.stock === 0 ? 'Out of stock' : 'Add to Cart'}
//             </button>
//           </div>
//         )}
//         {cartError && (
//           <p className="text-red-500 text-sm mt-1 mb-4">{cartError}</p>
//         )}

//         <div className="border-t pt-4">
//           <h3 className="font-semibold mb-2">Specifications</h3>

//           {specs.map(([label, value]) => (
//             <p key={label} className="text-sm text-gray-600">
//               <span className="font-medium">{label}:</span> {value}
//             </p>
//           ))}
//         </div>
//       </div>
//     </div>
//   )
// }
