'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useDispatch, useSelector } from 'react-redux'
import { ChevronDown, ChevronUp, Minus, Plus, Trash2, X } from 'lucide-react'
import CustomSelect from '@/components/CustomSelect'

import {
  fetchCart,
  updateCartQuantity,
  removeFromCart,
  closeCart,
} from '@/store/slices/cartSlice'

const DURATION = 250

export default function CartDrawer() {
  const dispatch = useDispatch()

  const { items, isOpen, loading } = useSelector((state) => state.cart)

  const [summaryOpen, setSummaryOpen] = useState(true)
  const [visible, setVisible] = useState(false)
  // const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const animationFrame = requestAnimationFrame(() => {
      setVisible(true)
    })

    dispatch(fetchCart())

    return () => {
      cancelAnimationFrame(animationFrame)
    }
  }, [isOpen, dispatch])

  const handleClose = useCallback(() => {
    setVisible(false)

    window.setTimeout(() => {
      dispatch(closeCart())
    }, DURATION)
  }, [dispatch])

  if (!isOpen) return null

  const totalQty = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  )

  const subtotal = items.reduce(
    (sum, item) =>
      sum + Number(item.product?.price || 0) * Number(item.quantity || 0),
    0,
  )

  const gst = subtotal * 0.1
  const totalWithGst = subtotal + gst

  const savings = items.reduce((sum, item) => {
    const product = item.product

    const price = Number(product?.price || 0)

    const compareAtPrice = Number(product?.compareAtPrice || 0)

    if (compareAtPrice <= price) {
      return sum
    }

    return sum + (compareAtPrice - price) * Number(item.quantity || 0)
  }, 0)

  function getProductId(item) {
    return item.product?.id || item.product?._id
  }

  function handleDecrement(item) {
    const productId = getProductId(item)

    if (!productId) return

    if (item.quantity <= 1) {
      dispatch(removeFromCart({ productId }))
      return
    }

    dispatch(
      updateCartQuantity({
        productId,
        quantity: item.quantity - 1,
      }),
    )
  }

  function handleIncrement(item) {
    const productId = getProductId(item)

    if (!productId) return

    dispatch(
      updateCartQuantity({
        productId,
        quantity: item.quantity + 1,
      }),
    )
  }

  function handleRemove(item) {
    const productId = getProductId(item)

    if (!productId) return

    dispatch(removeFromCart({ productId }))
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-50 cursor-pointer bg-black/40 transition-opacity ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          transitionDuration: `${DURATION}ms`,
        }}
        onClick={handleClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        className={`fixed right-0 top-0 z-100 flex h-full w-full max-w-110 flex-col bg-white shadow-2xl transition-transform ease-out ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          transitionDuration: `${DURATION}ms`,
        }}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[#e8e8e8] px-6 py-4">
          <h2
            id="cart-drawer-title"
            className="text-[18px] font-bold text-[#111]"
          >
            Your Cart
          </h2>

          <div className="flex items-center gap-4">
            <span className="text-[14px] text-[#666]">
              {totalQty} {totalQty === 1 ? 'item' : 'items'}
            </span>

            <button
              type="button"
              onClick={handleClose}
              aria-label="Close cart"
              className="cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-[#f0f0f0]"
            >
              <X size={20} className="text-[#555]" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex animate-pulse gap-4">
                  <div className="h-[80px] w-[80px] shrink-0 rounded-lg bg-[#f0f0f0]" />

                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-[#f0f0f0]" />
                    <div className="h-3 w-1/4 rounded bg-[#f0f0f0]" />
                    <div className="h-4 w-1/3 rounded bg-[#f0f0f0]" />
                    <div className="h-8 w-2/3 rounded bg-[#f0f0f0]" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center pt-24 text-center">
              <p className="text-[15px] text-[#999]">Your cart is empty</p>
            </div>
          )}

          {!loading && items.length > 0 && (
            <>
              <p className="mb-3 mt-2 text-[13px] font-semibold text-[#00a7a7]">
                Ship From Sydney
              </p>

              <ul className="space-y-0">
                {items.map((item) => {
                  const product = item.product
                  const productId = getProductId(item)

                  const price = Number(product?.price || 0)

                  const compareAtPrice =
                    product?.compareAtPrice != null
                      ? Number(product.compareAtPrice)
                      : null

                  const hasCompareAt =
                    compareAtPrice != null && compareAtPrice > price

                  const wattage =
                    product?.wattage != null ? Number(product.wattage) : null

                  const centsPerWatt =
                    wattage && wattage > 0
                      ? ((price / wattage) * 100).toFixed(1)
                      : null

                  const compareCentsPerWatt =
                    hasCompareAt && wattage && wattage > 0
                      ? ((compareAtPrice / wattage) * 100).toFixed(1)
                      : null

                  const inStock =
                    Number(product?.stock ?? product?.stockQuantity ?? 0) > 0

                  const firstImage = product?.images?.[0]

                  const imageUrl =
                    typeof firstImage === 'string'
                      ? firstImage
                      : firstImage?.url ||
                        firstImage?.src ||
                        'https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=200'

                  return (
                    <li
                      key={item.id || item.cartItemId || productId}
                      className="mb-4 flex gap-4 border-b border-[#f0f0f0] pb-4"
                    >
                      <div className="relative h-[80px] w-[80px] shrink-0 overflow-hidden rounded-lg border border-[#eeeeee] bg-white">
                        <Image
                          src={imageUrl}
                          alt={product?.name || ''}
                          fill
                          className="object-contain p-2"
                          sizes="80px"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[13px] font-medium leading-[1.3] text-[#111]">
                          {product?.name}
                        </p>

                        {product?.sku && (
                          <p className="mt-0.5 text-[11px] text-[#999]">
                            {product.sku}
                          </p>
                        )}

                        <div className="mt-1">
                          {inStock ? (
                            <span className="inline-block rounded bg-[#dcfce7] px-2 py-0.5 text-[11px] font-semibold text-[#15803d]">
                              In Stock
                            </span>
                          ) : (
                            <span className="inline-block rounded bg-[#fef2f2] px-2 py-0.5 text-[11px] font-semibold text-[#dc2626]">
                              On Request
                            </span>
                          )}
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className="text-[14px] font-bold text-[#111]">
                            ${price.toFixed(3)}
                          </span>

                          {centsPerWatt && (
                            <span className="text-[11px] text-[#888]">
                              ({centsPerWatt} c/W)
                            </span>
                          )}

                          <span className="text-[11px] text-[#666]">
                            ex GST
                          </span>

                          {hasCompareAt && (
                            <span className="text-[12px] text-[#aaa] line-through">
                              ${compareAtPrice.toFixed(3)}
                              {compareCentsPerWatt
                                ? ` (${compareCentsPerWatt} c/W)`
                                : ''}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                          <CustomSelect
                            aria-label="Shipping location"
                            value="Sydney"
                            options={[{ value: 'Sydney', label: 'Sydney' }]}
                          />

                          <div className="flex items-center rounded border border-[#e0e0e0]">
                            <button
                              type="button"
                              onClick={() => handleDecrement(item)}
                              aria-label={`Decrease quantity of ${product?.name || 'product'}`}
                              className="flex h-7 w-7 cursor-pointer items-center justify-center transition hover:bg-[#f5f5f5] border-r border-[#e0e0e0]"
                            >
                              <Minus size={14} className="text-[#555]" />
                            </button>

                            <span className="w-7 text-center text-[13px] font-medium text-[#111]">
                              {item.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleIncrement(item)}
                              aria-label={`Increase quantity of ${product?.name || 'product'}`}
                              className="flex h-7 w-7 cursor-pointer items-center justify-center transition hover:bg-[#f5f5f5] border-l border-[#e0e0e0]"
                            >
                              <Plus size={14} className="text-[#555]" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemove(item)}
                            aria-label={`Remove ${product?.name || 'product'} from cart`}
                            className="ml-auto cursor-pointer rounded-lg p-1.5 transition hover:bg-[#fef2f2]"
                          >
                            <Trash2 size={16} className="text-[#ef4444]" />
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>

        {items.length > 0 && (
          <footer className="shrink-0 overflow-hidden rounded-t-[18px] bg-white shadow-[0_-8px_28px_rgba(15,23,42,0.18)]">
            <button
              type="button"
              onClick={() => setSummaryOpen((current) => !current)}
              className="flex w-full cursor-pointer items-center justify-center gap-2 border-b border-[#e1e5ea] p-2 text-[14px] text-[#748197]"
            >
              Order Summary
              {summaryOpen ? (
                <ChevronDown size={18} />
              ) : (
                <ChevronUp size={18} />
              )}
            </button>

            {summaryOpen && (
              <div className="px-6 pt-4">
                <div className="flex items-center justify-between border-b border-dashed border-[#d8dde5] pb-3">
                  <span className="text-[15px] font-medium text-[#25364f]">
                    Subtotal
                  </span>

                  <span className="text-[17px] font-medium text-[#25364f]">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3">
                  <span className="text-[15px] font-medium text-[#25364f]">
                    GST
                  </span>

                  <span className="text-[17px] font-medium text-[#25364f]">
                    ${gst.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div
              className={`px-6 py-4 ${
                summaryOpen ? 'border-t border-[#e1e5ea]' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-5">
                <div className="pt-1 text-[14px] font-bold text-[#25364f]">
                  Total <span className="text-[12px]">(incl. GST)</span>
                </div>

                <div className="text-right">
                  <p className="text-[16px] font-bold leading-none text-[#25364f]">
                    ${totalWithGst.toFixed(2)}
                  </p>

                  <p className="text-[12px] font-medium text-[#00a63e]">
                    (excl. Delivery Fee)
                  </p>
                </div>
              </div>

              {savings > 0 && (
                <div className="mt-6 flex items-center justify-between gap-5">
                  <span className="text-[16px] font-bold text-[#25364f]">
                    You have saved
                  </span>

                  <span className="rounded-full bg-[#ffd447] px-4 py-1.5 text-[15px] font-bold text-[#25364f]">
                    ${savings.toFixed(2)}
                  </span>
                </div>
              )}

              <Link
                href="/checkout"
                onClick={handleClose}
                className="mt-6 flex h-[52px] w-full cursor-pointer items-center justify-center rounded-md bg-[#1478d4] text-[17px] font-semibold text-white transition-colors hover:bg-[#0f68b8]"
              >
                Checkout
              </Link>
            </div>
          </footer>
        )}
      </aside>
    </>
  )
}

// 'use client'

// import { useEffect, useState, useCallback } from 'react'
// import Image from 'next/image'
// import Link from 'next/link'
// import { useSelector, useDispatch } from 'react-redux'
// import {
//   X,
//   Plus,
//   Minus,
//   Trash2,
//   ShoppingCart,
//   ChevronDown,
//   ChevronUp,
// } from 'lucide-react'
// import {
//   fetchCart,
//   updateCartQuantity,
//   removeFromCart,
//   closeCart,
// } from '@/store/slices/cartSlice'

// const DURATION = 250

// export default function CartDrawer() {
//   const dispatch = useDispatch()
//   const { items, isOpen, loading } = useSelector((state) => state.cart)
//   const [summaryOpen, setSummaryOpen] = useState(true)
//   const [visible, setVisible] = useState(false)
//   const [closing, setClosing] = useState(false)

//   // Animate in when isOpen becomes true
//   useEffect(() => {
//     if (isOpen) {
//       setClosing(false)
//       requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
//       dispatch(fetchCart())
//     }
//   }, [isOpen, dispatch])

//   const handleClose = useCallback(() => {
//     setVisible(false)
//     setClosing(true)
//     setTimeout(() => dispatch(closeCart()), DURATION)
//   }, [dispatch])

//   // Don't render at all when fully closed (after closeCart dispatched)
//   if (!isOpen && !closing) return null

//   const totalQty = items.reduce((sum, i) => sum + i.quantity, 0)
//   const subtotal = items.reduce(
//     (sum, i) => sum + (i.product?.price || 0) * i.quantity,
//     0,
//   )
//   const totalWithGst = subtotal * 1.1
//   const savings = items.reduce((sum, i) => {
//     const p = i.product
//     if (p?.compareAtPrice && p.compareAtPrice > p.price) {
//       return sum + (p.compareAtPrice - p.price) * i.quantity
//     }
//     return sum
//   }, 0)

//   function pid(item) {
//     return item.product?.id || item.product?._id
//   }

//   function handleDecrement(item) {
//     if (item.quantity <= 1) {
//       dispatch(removeFromCart({ productId: pid(item) }))
//     } else {
//       dispatch(
//         updateCartQuantity({
//           productId: pid(item),
//           quantity: item.quantity - 1,
//         }),
//       )
//     }
//   }

//   function handleIncrement(item) {
//     dispatch(
//       updateCartQuantity({ productId: pid(item), quantity: item.quantity + 1 }),
//     )
//   }

//   function handleRemove(item) {
//     dispatch(removeFromCart({ productId: pid(item) }))
//   }

//   return (
//     <>
//       {/* Overlay */}
//       <div
//         className={`fixed inset-0 z-50 bg-black/40 cursor-pointer transition-opacity ${visible ? 'opacity-100' : 'opacity-0'}`}
//         style={{ transitionDuration: `${DURATION}ms` }}
//         onClick={handleClose}
//       />

//       {/* Panel — slides from right */}
//       <div
//         className={`fixed right-0 top-0 z-100 h-full w-full max-w-110 bg-white shadow-2xl flex flex-col transition-transform ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`}
//         style={{ transitionDuration: `${DURATION}ms` }}
//       >
//         {/* Header */}
//         <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e8e8] shrink-0">
//           <h2 className="text-[18px] font-bold text-[#111]">Your Cart</h2>
//           <div className="flex items-center gap-4">
//             <span className="text-[14px] text-[#666]">{totalQty} items</span>
//             <button
//               onClick={handleClose}
//               className="p-1.5 rounded-lg hover:bg-[#f0f0f0] transition-colors cursor-pointer"
//             >
//               <X size={20} className="text-[#555]" />
//             </button>
//           </div>
//         </div>

//         {/* Content */}
//         <div className="flex-1 overflow-y-auto px-6 py-4">
//           {loading && (
//             <div className="space-y-4">
//               {[1, 2, 3].map((i) => (
//                 <div key={i} className="flex gap-4 animate-pulse">
//                   <div className="w-[80px] h-[80px] bg-[#f0f0f0] rounded-lg shrink-0" />
//                   <div className="flex-1 space-y-2">
//                     <div className="h-4 bg-[#f0f0f0] rounded w-3/4" />
//                     <div className="h-3 bg-[#f0f0f0] rounded w-1/4" />
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}

//           {!loading && items.length === 0 && (
//             <div className="flex flex-col items-center justify-center h-full text-center pt-24">
//               <p className="text-[15px] text-[#999]">Your cart is empty</p>
//             </div>
//           )}

//           {!loading && items.length > 0 && (
//             <>
//               <p className="text-[13px] font-semibold text-[#00a7a7] mb-3 mt-2">
//                 Ship From Sydney
//               </p>
//               <ul className="space-y-0">
//                 {items.map((item) => {
//                   const p = item.product
//                   const price = Number(p?.price || 0)
//                   const compareAt =
//                     p?.compareAtPrice != null ? Number(p.compareAtPrice) : null
//                   const hasCompareAt = compareAt != null && compareAt > price
//                   const wattage = p?.wattage != null ? Number(p.wattage) : null
//                   const cPerW =
//                     wattage && wattage > 0
//                       ? ((price / wattage) * 100).toFixed(1)
//                       : null
//                   const inStock = (p?.stock ?? p?.stockQuantity ?? 0) > 0
//                   const imageUrl =
//                     p?.images?.[0] ||
//                     'https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=200'

//                   return (
//                     <li
//                       key={pid(item)}
//                       className="flex gap-4 border-b border-[#f0f0f0] pb-4 mb-4"
//                     >
//                       <div className="relative w-[80px] h-[80px] shrink-0 rounded-lg overflow-hidden bg-white border border-[#eee]">
//                         <Image
//                           src={imageUrl}
//                           alt={p?.name || ''}
//                           fill
//                           className="object-contain p-2"
//                           sizes="80px"
//                         />
//                       </div>
//                       <div className="flex-1 min-w-0">
//                         <p className="text-[13px] font-medium text-[#111] line-clamp-2 leading-[1.3]">
//                           {p?.name}
//                         </p>
//                         {p?.sku && (
//                           <p className="text-[11px] text-[#999] mt-0.5">
//                             {p.sku}
//                           </p>
//                         )}
//                         <div className="mt-1">
//                           {inStock ? (
//                             <span className="inline-block text-[11px] font-semibold text-[#15803d] bg-[#dcfce7] px-2 py-0.5 rounded">
//                               In Stock
//                             </span>
//                           ) : (
//                             <span className="inline-block text-[11px] font-semibold text-[#dc2626] bg-[#fef2f2] px-2 py-0.5 rounded">
//                               On Request
//                             </span>
//                           )}
//                         </div>
//                         <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
//                           <span className="text-[14px] font-bold text-[#111]">
//                             ${price.toFixed(3)}
//                           </span>
//                           {cPerW && (
//                             <span className="text-[11px] text-[#888]">
//                               ({cPerW} c/W)
//                             </span>
//                           )}
//                           <span className="text-[11px] text-[#666]">
//                             ex GST
//                           </span>
//                           {hasCompareAt && (
//                             <span className="text-[12px] text-[#aaa] line-through">
//                               ${compareAt.toFixed(3)}
//                             </span>
//                           )}
//                         </div>
//                         <div className="flex items-center gap-2 mt-2">
//                           <select className="border border-[#ddd] rounded px-2 py-1 text-[12px] text-[#333] w-[100px] bg-white cursor-pointer">
//                             <option>Sydney</option>
//                           </select>
//                           <div className="flex items-center border border-[#e0e0e0] rounded">
//                             <button
//                               onClick={() => handleDecrement(item)}
//                               className="w-7 h-7 flex items-center justify-center hover:bg-[#f5f5f5] transition cursor-pointer"
//                             >
//                               <Minus size={14} className="text-[#555]" />
//                             </button>
//                             <span className="w-7 text-center text-[13px] font-medium text-[#111]">
//                               {item.quantity}
//                             </span>
//                             <button
//                               onClick={() => handleIncrement(item)}
//                               className="w-7 h-7 flex items-center justify-center hover:bg-[#f5f5f5] transition cursor-pointer"
//                             >
//                               <Plus size={14} className="text-[#555]" />
//                             </button>
//                           </div>
//                           <button
//                             onClick={() => handleRemove(item)}
//                             className="ml-auto p-1.5 rounded-lg hover:bg-[#fef2f2] transition cursor-pointer"
//                           >
//                             <Trash2 size={16} className="text-[#ef4444]" />
//                           </button>
//                         </div>
//                       </div>
//                     </li>
//                   )
//                 })}
//               </ul>
//             </>
//           )}
//         </div>

//         {/* Footer */}
//         {items.length > 0 && (
//           <div className="border-t border-[#e8e8e8] px-6 py-4 shrink-0">
//             <button
//               onClick={() => setSummaryOpen(!summaryOpen)}
//               className="flex items-center justify-between w-full text-[14px] font-semibold text-[#111] mb-3 cursor-pointer"
//             >
//               Order Summary
//               {summaryOpen ? (
//                 <ChevronUp size={16} />
//               ) : (
//                 <ChevronDown size={16} />
//               )}
//             </button>
//             {summaryOpen && (
//               <div className="space-y-3">
//                 <div className="flex items-center justify-between">
//                   <span className="text-[14px] text-[#555]">
//                     Total (incl. GST)
//                   </span>
//                   <span className="text-[18px] font-bold text-[#111]">
//                     ${totalWithGst.toFixed(2)}
//                   </span>
//                 </div>
//                 <p className="text-[12px] text-[#999] -mt-2">
//                   (excl. Delivery Fee)
//                 </p>
//                 {savings > 0 && (
//                   <div className="flex items-center justify-between">
//                     <span className="text-[14px] text-[#555]">
//                       You have saved
//                     </span>
//                     <span className="bg-[#fbbf24] text-white font-bold px-3 py-1 rounded-full text-[13px]">
//                       ${savings.toFixed(2)}
//                     </span>
//                   </div>
//                 )}
//                 <Link
//                   href="/checkout"
//                   onClick={handleClose}
//                   className="flex items-center justify-center gap-2 w-full bg-[#00a7a7] hover:bg-[#1d4ed8] text-white text-[14px] font-semibold py-3 rounded-lg transition-colors cursor-pointer"
//                 >
//                   <ShoppingCart size={17} />
//                   Checkout
//                 </Link>
//               </div>
//             )}
//           </div>
//         )}
//       </div>
//     </>
//   )
// }
