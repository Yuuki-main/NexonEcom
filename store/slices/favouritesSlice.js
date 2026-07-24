import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

export const fetchFavourites = createAsyncThunk(
  'favourites/fetchFavourites',
  async () => {
    const res = await fetch('/api/favourites', { credentials: 'include' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to fetch favourites')
    return data.favourites
  },
)

export const addToFavourites = createAsyncThunk(
  'favourites/addToFavourites',
  async ({ productId }) => {
    const res = await fetch('/api/favourites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
      credentials: 'include',
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to add to favourites')
    return data.favourites
  },
)

export const removeFromFavourites = createAsyncThunk(
  'favourites/removeFromFavourites',
  async ({ productId }) => {
    const res = await fetch('/api/favourites', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
      credentials: 'include',
    })
    const data = await res.json()
    if (!res.ok)
      throw new Error(data.error || 'Failed to remove from favourites')
    return data.favourites
  },
)

const favouritesSlice = createSlice({
  name: 'favourites',
  initialState: { products: [], loading: false, error: null },
  reducers: {
    clearFavourites(state) {
      state.products = []
    },
  },
  extraReducers: (builder) => {
    const handlePending = (state) => {
      state.loading = true
      state.error = null
    }
    const handleFulfilled = (state, action) => {
      state.products = action.payload.products || []
      state.loading = false
    }
    const handleRejected = (state, action) => {
      state.error = action.error.message
      state.loading = false
    }

    builder
      .addCase(fetchFavourites.pending, handlePending)
      .addCase(fetchFavourites.fulfilled, handleFulfilled)
      .addCase(fetchFavourites.rejected, handleRejected)
      .addCase(addToFavourites.pending, handlePending)
      .addCase(addToFavourites.fulfilled, handleFulfilled)
      .addCase(addToFavourites.rejected, handleRejected)
      .addCase(removeFromFavourites.pending, handlePending)
      .addCase(removeFromFavourites.fulfilled, handleFulfilled)
      .addCase(removeFromFavourites.rejected, handleRejected)
  },
})

export const { clearFavourites } = favouritesSlice.actions
export default favouritesSlice.reducer
