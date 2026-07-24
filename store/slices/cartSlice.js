import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

export const fetchCart = createAsyncThunk('cart/fetchCart', async () => {
  const res = await fetch('/api/cart', { credentials: 'include' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch cart')
  return data.cart
})

export const addToCart = createAsyncThunk(
  'cart/addToCart',
  async ({ productId, quantity }) => {
    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity }),
      credentials: 'include',
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to add to cart')
    return data.cart
  },
)

export const updateCartQuantity = createAsyncThunk(
  'cart/updateCartQuantity',
  async ({ productId, quantity }) => {
    const res = await fetch('/api/cart', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity }),
      credentials: 'include',
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to update cart')
    return data.cart
  },
)

export const removeFromCart = createAsyncThunk(
  'cart/removeFromCart',
  async ({ productId }) => {
    const res = await fetch('/api/cart', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
      credentials: 'include',
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to remove from cart')
    return data.cart
  },
)

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [], isOpen: false, loading: false, error: null },
  reducers: {
    toggleCart(state) {
      state.isOpen = !state.isOpen
    },
    closeCart(state) {
      state.isOpen = false
    },
    clearCart(state) {
      state.items = []
    },
  },
  extraReducers: (builder) => {
    const handlePending = (state) => {
      state.loading = true
      state.error = null
    }
    const handleFulfilled = (state, action) => {
      state.items = action.payload.items || []
      state.loading = false
    }
    const handleRejected = (state, action) => {
      state.error = action.error.message
      state.loading = false
    }

    builder
      .addCase(fetchCart.pending, handlePending)
      .addCase(fetchCart.fulfilled, handleFulfilled)
      .addCase(fetchCart.rejected, handleRejected)
      .addCase(addToCart.pending, handlePending)
      .addCase(addToCart.fulfilled, handleFulfilled)
      .addCase(addToCart.rejected, handleRejected)
      .addCase(updateCartQuantity.pending, handlePending)
      .addCase(updateCartQuantity.fulfilled, handleFulfilled)
      .addCase(updateCartQuantity.rejected, handleRejected)
      .addCase(removeFromCart.pending, handlePending)
      .addCase(removeFromCart.fulfilled, handleFulfilled)
      .addCase(removeFromCart.rejected, handleRejected)
  },
})

export const { toggleCart, closeCart, clearCart } = cartSlice.actions
export default cartSlice.reducer
