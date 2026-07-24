'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useSelector, useDispatch } from 'react-redux'
import { useEffect } from 'react'
import { fetchFavourites } from '@/store/slices/favouritesSlice'
import FavouriteButton from '@/components/FavouriteButton'

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border border-[#eee] rounded p-3 animate-pulse">
          <div className="h-45 bg-[#f4f4f4] rounded mb-3" />
          <div className="h-3 bg-[#f0f0f0] rounded w-3/4 mb-2" />
          <div className="h-3 bg-[#f0f0f0] rounded w-full mb-1" />
          <div className="h-3 bg-[#f0f0f0] rounded w-2/3" />
        </div>
      ))}
    </div>
  )
}

export default function FavouritesClient() {
  const dispatch = useDispatch()
  const { products, loading } = useSelector((state) => state.favourites)
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchFavourites())
    }
  }, [isAuthenticated, dispatch])

  if (loading) {
    return (
      <div className="min-h-[50vh]">
        <SkeletonGrid />
      </div>
    )
  }

  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 min-h-[50vh]">
        <div className="w-20 h-20 rounded-full bg-[#f5f5f5] flex items-center justify-center mb-5">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#bbb"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>
        <p className="text-[16px] text-[#888] mb-5">No favourites yet</p>
        <Link
          href="/products"
          className="bg-[#00a7a7] hover:bg-[#1d4ed8] text-white px-6 py-2.5 rounded font-semibold text-[14px] transition-colors cursor-pointer"
        >
          Browse Products
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((p) => (
        <div
          key={p._id}
          className="relative border border-[#e4e4e4] rounded p-3 hover:border-[#00a7a7] hover:shadow-md transition-all"
        >
          <Link href={`/products/${p.slug}`} className="block cursor-pointer">
            <div className="relative h-45 mb-3 bg-[#f8f9fb] rounded overflow-hidden flex items-center justify-center">
              <Image
                src={
                  p.images?.[0] ||
                  'https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=400'
                }
                alt={p.name}
                fill
                className="object-contain p-3"
                sizes="(max-width: 1280px) 20vw, 240px"
              />
              <FavouriteButton productId={p._id} className="top-2 right-2" />
            </div>

            <p className="text-[12px] text-[#b0b0b0] mb-1 truncate">
              {p.brand?.name || p.manufacturer}
            </p>
            <p className="text-[12.5px] font-medium text-[#111] leading-4.5 line-clamp-2 mb-1">
              {p.name}
            </p>
            {p.wattage && (
              <p className="text-[11px] text-[#999] mb-1">{p.wattage}W</p>
            )}

            {isAuthenticated && p.price != null && (
              <p className="font-semibold mt-1 text-[14px] text-[#111]">
                ${p.price.toFixed(2)}
              </p>
            )}
          </Link>
        </div>
      ))}
    </div>
  )
}
