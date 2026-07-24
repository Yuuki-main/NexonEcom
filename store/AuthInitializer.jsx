'use client'

import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { setUser } from '@/store/slices/authSlice'
import { fetchFavourites, clearFavourites } from '@/store/slices/favouritesSlice'

export default function AuthInitializer() {
  const dispatch = useDispatch()

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        const data = await res.json()
        if (!cancelled) {
          if (data.user) {
            dispatch(setUser(data.user))
            dispatch(fetchFavourites())
          } else {
            dispatch(clearFavourites())
          }
        }
      } catch {
        // Silently ignore — user stays unauthenticated
      }
    }

    hydrate()

    return () => {
      cancelled = true
    }
  }, [dispatch])

  return null
}
