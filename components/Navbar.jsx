'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Check,
  ChevronDown,
  Heart,
  Package,
  Search,
  ShoppingCart,
  User,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { logout } from '@/store/slices/authSlice'
import { clearCart, toggleCart } from '@/store/slices/cartSlice'
import { clearFavourites } from '@/store/slices/favouritesSlice'

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Products', href: '/products' },
  { label: 'Promotions', href: '/promotions', badge: 'New' },
  { label: 'Brands', href: '/brands' },
  { label: 'Downloads', href: '/downloads' },
  { label: 'Calculator', href: '/calculator' },
  { label: 'News', href: '/news' },
  // { label: 'Events', href: '/events' },
  { label: 'About Us', href: '/about' },
  { label: 'Contact Us', href: '/contact' },
]

const regions = [
  { label: 'Nederland', flag: '🇳🇱', lang: 'NL' },
  { label: 'Polska', flag: '🇵🇱', lang: 'PL' },
  { label: 'Australia', flag: '🇦🇺', lang: 'EN' },
  { label: 'United States', flag: '🇺🇸', lang: 'EN' },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const dispatch = useDispatch()

  const { user, isAuthenticated } = useSelector((state) => state.auth)

  const cartCount = useSelector((state) =>
    state.cart.items.reduce((sum, item) => sum + item.quantity, 0),
  )

  const favCount = useSelector(
    (state) => state.favourites.products?.length || 0,
  )

  const [search, setSearch] = useState('')

  const [regionOpen, setRegionOpen] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState(regions[2])
  const [pendingRegion, setPendingRegion] = useState(regions[2])

  const [accountOpen, setAccountOpen] = useState(false)

  const regionDropdownRef = useRef(null)
  const accountDropdownRef = useRef(null)

  const accountLabel = user?.fullName?.trim()
    ? user.fullName.trim().split(/\s+/)[0]
    : 'Account'

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        regionDropdownRef.current &&
        !regionDropdownRef.current.contains(event.target)
      ) {
        setRegionOpen(false)
        setPendingRegion(selectedRegion)
      }
    }

    document.addEventListener('pointerdown', handleClickOutside)

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside)
    }
  }, [selectedRegion])

  useEffect(() => {
    if (!accountOpen) return

    function handlePointerDown(event) {
      if (
        accountDropdownRef.current &&
        !accountDropdownRef.current.contains(event.target)
      ) {
        setAccountOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setAccountOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [accountOpen])

  function confirmSelection() {
    setSelectedRegion(pendingRegion)
    setRegionOpen(false)
  }

  async function handleLogout() {
    setAccountOpen(false)

    await fetch('/api/auth/logout', {
      method: 'POST',
    })

    dispatch(logout())
    dispatch(clearCart())
    dispatch(clearFavourites())

    router.push('/')
    router.refresh()
  }

  return (
    <nav className="sticky top-0 z-50 bg-[#07141d]">
      {/* Top row */}
      <div className="mx-auto flex h-[64px] max-w-[1240px] items-center gap-6 px-6">
        {/* Logo */}
        <Link href="/" className="shrink-0">
          <Image
            src="/nexon_co_logo.jpeg"
            alt="Nexon"
            width={120}
            height={60}
            className="h-16 w-auto"
            priority
          />
        </Link>

        {/* Region / language */}
        <div ref={regionDropdownRef} className="relative shrink-0">
          {/*
          <button
            type="button"
            onClick={() => {
              setAccountOpen(false)
              setRegionOpen((current) => !current)
              setPendingRegion(selectedRegion)
            }}
            className="flex cursor-pointer items-center gap-1 text-[13px] text-white opacity-90 hover:opacity-100"
          >
            <span>{selectedRegion.flag}</span>
            <span className="ml-1">{selectedRegion.label}</span>
            <span className="mx-1 opacity-40">|</span>
            <span>{selectedRegion.lang}</span>

            <ChevronDown
              size={12}
              className={`ml-0.5 transition-transform ${
                regionOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          */}

          {regionOpen && (
            <div className="absolute left-0 top-[calc(100%+12px)] z-[70] w-[480px] overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="px-6 pb-3 pt-6">
                <p className="mb-1 text-[13px] text-[#888]">
                  Select Your Region and Language
                </p>

                <p className="text-[18px] font-bold text-[#111]">
                  {selectedRegion.label} -{' '}
                  {selectedRegion.lang === 'EN'
                    ? 'English'
                    : selectedRegion.lang === 'NL'
                      ? 'Dutch'
                      : 'Polish'}
                </p>
              </div>

              <hr className="mx-6 border-[#e8e8e8]" />

              <div className="py-2">
                {regions.map((region) => {
                  const isSelected = pendingRegion.label === region.label

                  return (
                    <button
                      key={region.label}
                      type="button"
                      onClick={() => setPendingRegion(region)}
                      className={`flex w-full cursor-pointer items-center justify-between px-6 py-3.5 text-left transition-colors ${
                        isSelected
                          ? 'border border-[#2196f3] bg-[#f0f6ff]'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[22px]">{region.flag}</span>

                        <span
                          className={`text-[16px] font-medium ${
                            isSelected ? 'text-[#2196f3]' : 'text-[#111]'
                          }`}
                        >
                          {region.label}
                        </span>
                      </div>

                      {isSelected && (
                        <Check size={18} className="text-[#2196f3]" />
                      )}
                    </button>
                  )
                })}
              </div>

              <hr className="mx-6 border-[#e8e8e8]" />

              <div className="px-6 py-4">
                <button
                  type="button"
                  onClick={confirmSelection}
                  className="w-full cursor-pointer rounded-lg bg-[#00a7a7] py-3.5 text-[15px] font-semibold text-white transition hover:bg-[#1d4ed8]"
                >
                  Confirm Selection
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-[560px] flex-1">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && search.trim()) {
                router.push(`/products?q=${encodeURIComponent(search.trim())}`)
              }
            }}
            placeholder="Search for products (Brand / Name / Description)"
            className="w-full rounded-lg bg-white px-4 py-2.5 pr-11 text-[13px] text-[#333] focus:outline-none"
          />

          <button
            type="button"
            onClick={() => {
              if (search.trim()) {
                router.push(`/products?q=${encodeURIComponent(search.trim())}`)
              }
            }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#555] cursor-pointer"
            aria-label="Search"
          >
            <Search size={16} />
          </button>
        </div>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-6 text-white">
          <Link
            href="/track-order"
            className="flex cursor-pointer flex-col items-center gap-0.5 text-[11px] opacity-90 transition-opacity hover:opacity-100"
          >
            <Package size={22} strokeWidth={1.5} />
            <span>Track Order</span>
          </Link>

          {/* Favourites */}
          <Link
            href="/favourites"
            className="relative flex cursor-pointer flex-col items-center gap-0.5 text-[11px] opacity-90 transition-opacity hover:opacity-100"
          >
            <Heart size={22} strokeWidth={1.5} />
            <span>Favourite</span>

            {favCount > 0 && (
              <span className="absolute -right-1 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ef4444] px-1 text-[10px] font-bold leading-none text-white">
                {favCount > 99 ? '99+' : favCount}
              </span>
            )}
          </Link>

          {/* Cart */}
          <button
            type="button"
            onClick={() => dispatch(toggleCart())}
            className="relative flex cursor-pointer flex-col items-center gap-0.5 text-[11px] opacity-90 transition-opacity hover:opacity-100"
          >
            <ShoppingCart size={22} strokeWidth={1.5} />
            <span>Cart</span>

            {cartCount > 0 && (
              <span className="absolute -right-1 -top-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#ef4444] text-[10px] font-bold leading-none text-white">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>

          {isAuthenticated ? (
            <div ref={accountDropdownRef} className="relative shrink-0">
              {/* Profile dropdown trigger */}
              {/* <button
                type="button"
                onClick={() => {
                  setRegionOpen(false)
                  setAccountOpen((current) => !current)
                }}
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                aria-controls="navbar-account-menu"
                className={`flex h-[48px] min-w-[142px] max-w-[180px] cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-[#0b3f68] transition-colors ${
                  accountOpen
                    ? 'border-white bg-white'
                    : 'border-white/80 bg-white hover:bg-[#f7f9fc]'
                }`}
              >
                <User size={22} strokeWidth={1.7} className="shrink-0" />

                <span
                  className="min-w-0 flex-1 truncate text-center text-[12px] font-medium"
                  title={user?.fullName || accountLabel}
                >
                  {accountLabel}
                </span>

                <ChevronDown
                  size={15}
                  strokeWidth={1.8}
                  className={`shrink-0 transition-transform duration-200 ${
                    accountOpen ? 'rotate-180' : ''
                  }`}
                />
              </button> */}

              <button
                type="button"
                onClick={() => {
                  setRegionOpen(false)
                  setAccountOpen((current) => !current)
                }}
                aria-label="Open profile menu"
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                aria-controls="navbar-account-menu"
                className={`flex h-10.5 w-26 cursor-pointer items-center gap-2 justify-center rounded-full border transition-all duration-200 ${
                  accountOpen
                    ? 'border-[#d1d5db] bg-[#e5e5e5] shadow-inner'
                    : 'border-transparent bg-[#eeeeee] hover:bg-[#e2e2e2]'
                }`}
              >
                <User
                  size={20}
                  strokeWidth={3}
                  className="shrink-0 text-[#252525]"
                />
                <span
                  className="min-w-0 truncate text-center text-[16px] font-bold text-[#252525]"
                  title={user?.fullName || accountLabel}
                >
                  {accountLabel}
                </span>
              </button>

              {/* Profile dropdown menu */}
              {accountOpen && (
                <div
                  id="navbar-account-menu"
                  role="menu"
                  className="absolute right-0 top-[calc(100%+12px)] z-[70] w-[172px] overflow-hidden rounded-md border border-black/10 bg-white py-2 text-[#1f2937] shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
                >
                  <Link
                    href="/account"
                    role="menuitem"
                    onClick={() => setAccountOpen(false)}
                    className="flex w-full items-center px-5 py-3 text-left text-[14px] font-medium transition-colors hover:bg-[#f3f6f9] focus:bg-[#f3f6f9] focus:outline-none"
                  >
                    My Account
                  </Link>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full cursor-pointer items-center px-5 py-3 text-left text-[14px] font-medium transition-colors hover:bg-[#f3f6f9] focus:bg-[#f3f6f9] focus:outline-none"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="flex cursor-pointer flex-col items-center gap-0.5 text-[11px] opacity-90 transition-opacity hover:opacity-100"
            >
              <User size={22} strokeWidth={1.5} />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/10" />

      {/* Bottom navigation */}
      <div className="mx-auto flex h-[44px] max-w-[1240px] items-center gap-6 px-6">
        {navLinks.map((link) => {
          const isActive =
            link.href === '/'
              ? pathname === '/'
              : pathname === link.href || pathname.startsWith(`${link.href}/`)

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex h-full items-center gap-1.5 whitespace-nowrap border-b-2 text-[14px] transition-colors ${
                isActive
                  ? 'border-[#00a7a7] text-[#00a7a7]'
                  : 'border-transparent text-white/85 hover:text-white'
              }`}
            >
              {link.label}

              {link.badge && (
                <span className="rounded bg-[#00a7a7] px-1.5 py-0.5 text-[10px] font-bold leading-none text-[#07141d]">
                  {link.badge}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

// 'use client'

// import Link from 'next/link'
// import Image from 'next/image'
// import { usePathname, useRouter } from 'next/navigation'
// import {
//   Search,
//   Package,
//   User,
//   Heart,
//   Check,
//   ChevronDown,
//   X,
//   LogOut,
//   ShoppingCart,
// } from 'lucide-react'
// import { useState, useRef, useEffect } from 'react'
// import { useSelector, useDispatch } from 'react-redux'
// import { logout } from '@/store/slices/authSlice'
// import { toggleCart, clearCart } from '@/store/slices/cartSlice'
// import { clearFavourites } from '@/store/slices/favouritesSlice'

// const navLinks = [
//   { label: 'Home', href: '/' },
//   { label: 'Products', href: '/products' },
//   { label: 'Promotions', href: '/promotions', badge: 'New' },
//   { label: 'Brands', href: '/brands' },
//   { label: 'Downloads', href: '/downloads' },
//   { label: 'Calculator', href: '/calculator' },
//   { label: 'News', href: '/news' },
//   // { label: 'Events', href: '/events' },
//   { label: 'About Us', href: '/about' },
//   { label: 'Contact Us', href: '/contact' },
// ]

// const regions = [
//   { label: 'Nederland', flag: '🇳🇱', lang: 'NL' },
//   { label: 'Polska', flag: '🇵🇱', lang: 'PL' },
//   { label: 'Australia', flag: '🇦🇺', lang: 'EN' },
//   { label: 'United States', flag: '🇺🇸', lang: 'EN' },
// ]

// export default function Navbar() {
//   const pathname = usePathname()
//   const router = useRouter()
//   const dispatch = useDispatch()
//   const { user, isAuthenticated } = useSelector((s) => s.auth)
//   const cartCount = useSelector((state) =>
//     state.cart.items.reduce((sum, i) => sum + i.quantity, 0),
//   )
//   const favCount = useSelector((state) => state.favourites.products.length)
//   const [search, setSearch] = useState('')
//   const [regionOpen, setRegionOpen] = useState(false)
//   const [selectedRegion, setSelectedRegion] = useState(regions[2]) // Australia default
//   const [pendingRegion, setPendingRegion] = useState(regions[2])
//   const dropdownRef = useRef(null)

//   useEffect(() => {
//     function handleClickOutside(e) {
//       if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
//         setRegionOpen(false)
//         setPendingRegion(selectedRegion)
//       }
//     }
//     document.addEventListener('mousedown', handleClickOutside)
//     return () => document.removeEventListener('mousedown', handleClickOutside)
//   }, [selectedRegion])

//   function confirmSelection() {
//     setSelectedRegion(pendingRegion)
//     setRegionOpen(false)
//   }

//   async function handleLogout() {
//     await fetch('/api/auth/logout', { method: 'POST' })
//     dispatch(logout())
//     dispatch(clearCart())
//     dispatch(clearFavourites())
//     router.push('/')
//     router.refresh()
//   }

//   return (
//     <nav className="sticky top-0 z-50" style={{ background: '#07141d' }}>
//       {/* Top row */}
//       <div className="max-w-[1240px] mx-auto flex items-center h-[64px] px-6 gap-6">
//         {/* Logo */}
//         <Link href="/" className="shrink-0">
//           <Image
//             src="/nexon_co_logo.jpeg"
//             alt="Nexon"
//             width={120}
//             height={60}
//             className="h-16 w-auto"
//             priority
//           />
//         </Link>

//         {/* Region / Lang dropdown trigger */}
//         <div className="relative shrink-0" ref={dropdownRef}>
//           {/* <button
//             onClick={() => {
//               setRegionOpen(!regionOpen)
//               setPendingRegion(selectedRegion)
//             }}
//             className="flex items-center gap-1 text-white text-[13px] hover:opacity-100 opacity-90 cursor-pointer"
//           >
//             <span>{selectedRegion.flag}</span>
//             <span className="ml-1">{selectedRegion.label}</span>
//             <span className="mx-1 opacity-40">|</span>
//             <span>{selectedRegion.lang}</span>
//             <ChevronDown
//               size={12}
//               className={`ml-0.5 transition-transform ${regionOpen ? 'rotate-180' : ''}`}
//             />
//           </button> */}

//           {/* Dropdown */}
//           {regionOpen && (
//             <div className="absolute top-[calc(100%+12px)] left-0 w-[480px] bg-white rounded-2xl shadow-2xl overflow-hidden z-50">
//               {/* Header */}
//               <div className="px-6 pt-6 pb-3">
//                 <p className="text-[13px] text-[#888] mb-1">
//                   Select Your Region and Language
//                 </p>
//                 <p className="text-[18px] font-bold text-[#111]">
//                   {selectedRegion.label} -{' '}
//                   {selectedRegion.lang === 'EN'
//                     ? 'English'
//                     : selectedRegion.lang === 'NL'
//                       ? 'Dutch'
//                       : 'Polish'}
//                 </p>
//               </div>

//               <hr className="border-[#e8e8e8] mx-6" />

//               {/* Region list */}
//               <div className="py-2">
//                 {regions.map((r) => {
//                   const isSelected = pendingRegion.label === r.label
//                   return (
//                     <button
//                       key={r.label}
//                       onClick={() => setPendingRegion(r)}
//                       className={`w-full flex items-center justify-between px-6 py-3.5 text-left transition-colors cursor-pointer ${
//                         isSelected
//                           ? 'bg-[#f0f6ff] border border-[#2196f3] rounded-lg mx-0'
//                           : 'hover:bg-gray-50'
//                       }`}
//                     >
//                       <div className="flex items-center gap-3">
//                         <span className="text-[22px]">{r.flag}</span>
//                         <span
//                           className={`text-[16px] font-medium ${isSelected ? 'text-[#2196f3]' : 'text-[#111]'}`}
//                         >
//                           {r.label}
//                         </span>
//                       </div>
//                       {isSelected && (
//                         <Check size={18} className="text-[#2196f3]" />
//                       )}
//                     </button>
//                   )
//                 })}
//               </div>

//               <hr className="border-[#e8e8e8] mx-6" />

//               {/* Confirm button */}
//               <div className="px-6 py-4">
//                 <button
//                   onClick={confirmSelection}
//                   className="w-full bg-[#00a7a7] hover:bg-[#1d4ed8] text-white font-semibold text-[15px] py-3.5 rounded-lg transition cursor-pointer"
//                 >
//                   Confirm Selection
//                 </button>
//               </div>
//             </div>
//           )}
//         </div>

//         {/* Search */}
//         <div className="flex-1 max-w-[560px] relative">
//           <input
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             placeholder="Search for products (Brand / Name / Description)"
//             className="w-full rounded-lg px-4 py-2.5 pr-11 text-[13px] text-[#333] focus:outline-none bg-white"
//           />
//           <Search
//             size={16}
//             className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#555]"
//           />
//         </div>

//         {/* Right actions */}
//         <div className="flex items-center gap-6 ml-auto text-white">
//           <Link
//             href="/track-order"
//             className="flex flex-col items-center gap-0.5 text-[11px] opacity-90 hover:opacity-100 cursor-pointer"
//           >
//             <Package size={22} strokeWidth={1.5} />
//             <span>Track Order</span>
//           </Link>

//           {isAuthenticated ? (
//             <>
//               <Link
//                 href="/account"
//                 className="flex flex-col items-center gap-0.5 text-[11px] opacity-90 hover:opacity-100 cursor-pointer"
//               >
//                 <User size={22} strokeWidth={1.5} />
//                 <span>{user?.fullName?.split(' ')[0] || 'Account'}</span>
//               </Link>
//               <button
//                 onClick={handleLogout}
//                 className="flex flex-col items-center gap-0.5 text-[11px] opacity-90 hover:opacity-100 cursor-pointer"
//               >
//                 <LogOut size={22} strokeWidth={1.5} />
//                 <span>Logout</span>
//               </button>
//             </>
//           ) : (
//             <Link
//               href="/login"
//               className="flex flex-col items-center gap-0.5 text-[11px] opacity-90 hover:opacity-100 cursor-pointer"
//             >
//               <User size={22} strokeWidth={1.5} />
//               <span>Sign In</span>
//             </Link>
//           )}

//           <button
//             onClick={() => dispatch(toggleCart())}
//             className="relative flex flex-col items-center gap-0.5 text-[11px] opacity-90 hover:opacity-100 cursor-pointer"
//           >
//             <ShoppingCart size={22} strokeWidth={1.5} />
//             <span>Cart</span>
//             {cartCount > 0 && (
//               <span className="absolute -top-0.5 -right-1 bg-[#ef4444] text-white text-[10px] font-bold w-[18px] h-[18px] rounded-full flex items-center justify-center leading-none">
//                 {cartCount}
//               </span>
//             )}
//           </button>

//           <Link
//             href="/favourites"
//             className="relative flex flex-col items-center gap-0.5 text-[11px] opacity-90 hover:opacity-100 cursor-pointer"
//           >
//             <Heart size={22} strokeWidth={1.5} />
//             <span>Favourite</span>
//             {favCount > 0 && (
//               <span className="absolute -top-0.5 -right-1 bg-[#ef4444] text-white text-[10px] font-bold w-[18px] h-[18px] rounded-full flex items-center justify-center leading-none">
//                 {favCount}
//               </span>
//             )}
//           </Link>
//         </div>
//       </div>

//       {/* Divider */}
//       <div className="border-t border-white/10" />

//       {/* Bottom nav row */}
//       <div className="max-w-[1240px] mx-auto flex items-center h-[44px] px-6 gap-6">
//         {navLinks.map((link) => {
//           const isActive = pathname === link.href
//           return (
//             <Link
//               key={link.href}
//               href={link.href}
//               className={`flex items-center gap-1.5 text-[14px] whitespace-nowrap transition-colors pb-0.5 ${
//                 isActive
//                   ? 'text-[#00a7a7] border-b-2 border-[#00a7a7]'
//                   : 'text-white/85 hover:text-white'
//               }`}
//             >
//               {link.label}
//               {link.badge && (
//                 <span className="bg-[#00a7a7] text-[#07141d] text-[10px] font-bold px-1.5 py-0.5 rounded leading-none">
//                   New
//                 </span>
//               )}
//             </Link>
//           )
//         })}
//       </div>
//     </nav>
//   )
// }
