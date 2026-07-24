'use client'

import { Heart } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { usePathname, useRouter } from 'next/navigation'

import {
  addToFavourites,
  removeFromFavourites,
} from '@/store/slices/favouritesSlice'

export default function FavouriteButton({
  productId,
  className = '',
  iconSize = 18,
}) {
  const dispatch = useDispatch()
  const router = useRouter()
  const pathname = usePathname()

  const { products, loading } = useSelector((state) => state.favourites)

  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)

  const normalizedProductId = productId?.toString()

  const isFavourited = products.some((product) => {
    const favouriteId = product?.id || product?._id || product

    return favouriteId?.toString() === normalizedProductId
  })

  function handleClick(event) {
    event.preventDefault()
    event.stopPropagation()

    if (!productId || loading) return

    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
      return
    }

    if (isFavourited) {
      dispatch(removeFromFavourites({ productId }))
    } else {
      dispatch(addToFavourites({ productId }))
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading || !productId}
      aria-label={isFavourited ? 'Remove from favourites' : 'Add to favourites'}
      aria-pressed={isFavourited}
      className={`z-10 inline-flex items-center justify-center rounded-full bg-white/90 p-2 shadow-sm transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <Heart
        size={iconSize}
        className={
          isFavourited ? 'fill-[#00a7a7] text-[#00a7a7]' : 'text-gray-400'
        }
      />
    </button>
  )
}
