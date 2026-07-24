import { createSlice } from '@reduxjs/toolkit'

const uiSlice = createSlice({
  name: 'ui',
  initialState: { filtersOpen: false, activeCategory: null },
  reducers: {
    setFiltersOpen: (state, action) => {
      state.filtersOpen = action.payload
    },
    setActiveCategory: (state, action) => {
      state.activeCategory = action.payload
    },
  },
})
export const { setFiltersOpen, setActiveCategory } = uiSlice.actions
export default uiSlice.reducer
