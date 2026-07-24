import { createSlice } from '@reduxjs/toolkit'

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, isAuthenticated: false, loading: false },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload
      state.isAuthenticated = !!action.payload
    },
    logout: (state) => {
      state.user = null
      state.isAuthenticated = false
    },
    setLoading: (state, action) => {
      state.loading = action.payload
    },
  },
})
export const { setUser, logout, setLoading } = authSlice.actions
export default authSlice.reducer
