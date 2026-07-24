'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSelector, useDispatch } from 'react-redux'
import { ShoppingCart, Minus, Plus } from 'lucide-react'
import { addToCart, toggleCart } from '@/store/slices/cartSlice'
import FavouriteButton from '@/components/FavouriteButton'

export default function ProductCard({ product }) {
  const dispatch = useDispatch()
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)

  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)
  const [cartError, setCartError] = useState('')

  const productId = product.id || product._id
  const price = Number(product.price)
  const compareAtPrice =
    product.compareAtPrice != null ? Number(product.compareAtPrice) : null
  const hasCompareAt = compareAtPrice != null && compareAtPrice > price
  const stock = product.stock ?? product.stockQuantity ?? 0
  const inStock = stock > 0
  const imageUrl =
    product.images?.[0] ||
    'https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=400'
  const wattage = product.wattage != null ? Number(product.wattage) : null
  const cPerW =
    wattage && wattage > 0 ? ((price / wattage) * 100).toFixed(1) : null

  const maxQty = stock > 0 ? stock : 999

  function clampQty(v) {
    return Math.max(1, Math.min(maxQty, Number(v) || 1))
  }

  async function handleAddToCart(e) {
    e.stopPropagation()
    e.preventDefault()
    if (!isAuthenticated) return
    setCartError('')
    setAdding(true)
    try {
      await dispatch(addToCart({ productId, quantity: qty })).unwrap()
      dispatch(toggleCart())
      setQty(1)
    } catch (err) {
      setCartError(err.message || 'Failed to add to cart')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="flex flex-col bg-white border border-[#e8e8e8] rounded-xl p-4 hover:shadow-md hover:border-[#00a7a7] transition-all duration-200">
      {/* Image */}
      <Link
        href={`/products/${product.slug}`}
        className="relative block w-full h-[200px] bg-[#f8f9fb] rounded overflow-hidden mb-3"
      >
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          className="object-contain p-3"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        <FavouriteButton
          productId={productId}
          className="absolute top-0 right-0"
        />
      </Link>

      {/* Stock badge */}
      <div className="mb-2">
        {inStock ? (
          <span className="inline-block bg-[#dcfce7] text-[#15803d] text-[11px] font-semibold px-2 py-0.5 rounded">
            In Stock
          </span>
        ) : (
          <span className="inline-block bg-[#f3f4f6] text-[#6b7280] text-[11px] font-semibold px-2 py-0.5 rounded">
            On Request
          </span>
        )}
      </div>

      {/* Price */}
      {isAuthenticated ? (
        <div className="mb-2">
          {hasCompareAt && (
            <p className="text-[11px] text-[#999] line-through">
              ${compareAtPrice.toFixed(3)}
            </p>
          )}
          <p className="flex items-baseline flex-wrap gap-x-1">
            <span className="text-[20px] font-bold text-[#111]">
              ${price.toFixed(3)}
            </span>
            {cPerW && (
              <span className="text-[11px] text-[#888]">({cPerW} c/W)</span>
            )}
            <span className="text-[11px] text-[#666]">ex GST</span>
          </p>
        </div>
      ) : null}

      {/* Name */}
      <Link href={`/products/${product.slug}`} className="mb-1">
        <h3 className="text-[12.5px] font-medium text-[#111] leading-5 line-clamp-2 min-h-[40px]">
          {product.name}
        </h3>
      </Link>

      {/* SKU */}
      {product.sku && (
        <p className="text-[11px] text-[#b0b0b0] truncate mt-0.5 mb-2">
          {product.sku}
        </p>
      )}

      <div className="mt-auto pt-2">
        {isAuthenticated ? (
          <>
            {/* Qty stepper */}
            {inStock && (
              <div className="flex items-center justify-between border border-[#e0e0e0] rounded mb-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    setQty(clampQty(qty - 1))
                  }}
                  disabled={qty <= 1}
                  className="w-8 h-8 flex-1 flex items-center justify-center text-[#666] hover:text-[#111] disabled:opacity-30 transition cursor-pointer"
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  min="1"
                  max={maxQty}
                  value={qty}
                  onChange={(e) => setQty(clampQty(e.target.value))}
                  className="w-12 flex-2 text-center text-[13px] text-[#111] border-x border-[#e0e0e0] outline-none bg-transparent py-1.5"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    setQty(clampQty(qty + 1))
                  }}
                  disabled={qty >= maxQty}
                  className="w-8 h-8 flex-1 flex items-center justify-center text-[#666] hover:text-[#111] disabled:opacity-30 transition cursor-pointer"
                  aria-label="Increase quantity"
                >
                  <Plus size={14} />
                </button>
              </div>
            )}

            {/* Add to Cart */}
            <button
              onClick={handleAddToCart}
              disabled={adding}
              className="flex items-center justify-center gap-1.5 w-full bg-[#00a7a7] hover:bg-[#1d4ed8] text-white text-[13px] font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <ShoppingCart size={15} />
              {adding ? 'Adding...' : 'Add to Cart'}
            </button>

            {cartError && (
              <p className="text-[12px] text-red-500 mt-1">{cartError}</p>
            )}
          </>
        ) : (
          <Link
            href="/login"
            onClick={(e) => e.stopPropagation()}
            className="block w-full bg-[#00a7a7] hover:bg-[#1d4ed8] text-white text-[13px] font-semibold py-2.5 rounded-lg transition-colors cursor-pointer text-center"
          >
            Login for price
          </Link>
        )}
      </div>
    </div>
  )
}
