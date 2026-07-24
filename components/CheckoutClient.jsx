'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch } from 'react-redux'
import { clearCart } from '@/store/slices/cartSlice'
import Image from 'next/image'
import CustomSelect from '@/components/CustomSelect'

export default function CheckoutClient({ cart }) {
  const router = useRouter()
  const dispatch = useDispatch()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postcode: '',
    country: 'AU',
  })
  // Tracks the order ID created by POST /api/orders so we can retry
  // the checkout call if it fails (e.g. network error contacting Stripe).
  const [pendingOrderId, setPendingOrderId] = useState(null)

  const subtotal = cart.items.reduce(
    (sum, i) => sum + (i.product?.price || 0) * i.quantity,
    0,
  )
  const gst = subtotal * 0.1
  const total = subtotal + gst

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Step 1: Create the order
    const orderRes = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shippingAddress: form }),
    })

    const orderData = await orderRes.json()

    if (!orderRes.ok) {
      setLoading(false)
      setError(orderData.error || 'Failed to place order')
      return
    }

    const orderId = orderData.order._id
    setPendingOrderId(orderId)

    // Step 2: Create Stripe Checkout Session
    await createCheckoutAndRedirect(orderId)
  }

  async function createCheckoutAndRedirect(orderId) {
    setLoading(true)
    setError('')

    const checkoutRes = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    })

    const checkoutData = await checkoutRes.json()

    if (!checkoutRes.ok) {
      setLoading(false)
      setError(checkoutData.error || 'Failed to start payment')
      // Order is still retryable — user can click "Retry Payment"
      return
    }

    // Payment session created — clear cart (DB already cleared by /api/orders)
    dispatch(clearCart())

    // Redirect to Stripe hosted checkout
    window.location.href = checkoutData.url
  }

  async function handleRetryPayment() {
    if (!pendingOrderId) return
    await createCheckoutAndRedirect(pendingOrderId)
  }

  return (
    <main className="max-w-[1100px] mx-auto px-6 py-10">
      <h1 className="text-[28px] font-bold text-[#111] mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-[1fr_400px] gap-8">
        {/* Shipping form */}
        <div className="bg-white rounded-xl border border-[#e8e8e8] p-8">
          <h2 className="text-[18px] font-bold text-[#111] mb-6">
            Shipping Address
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[#444] mb-1.5">
                Street Address *
              </label>
              <input
                name="line1"
                value={form.line1}
                onChange={handleChange}
                required
                placeholder="123 Solar Street"
                className="w-full border border-[#d1d5db] rounded-lg px-4 py-2.5 text-[14px] focus:outline-none focus:border-[#00a7a7]"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#444] mb-1.5">
                Apartment / Suite (optional)
              </label>
              <input
                name="line2"
                value={form.line2}
                onChange={handleChange}
                placeholder="Unit 4"
                className="w-full border border-[#d1d5db] rounded-lg px-4 py-2.5 text-[14px] focus:outline-none focus:border-[#00a7a7]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-[#444] mb-1.5">
                  City *
                </label>
                <input
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  required
                  placeholder="Melbourne"
                  className="w-full border border-[#d1d5db] rounded-lg px-4 py-2.5 text-[14px] focus:outline-none focus:border-[#00a7a7]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#444] mb-1.5">
                  State *
                </label>
                <CustomSelect
                  name="state"
                  value={form.state}
                  onChange={(val) => handleChange({ target: { name: 'state', value: val } })}
                  required
                  placeholder="Select state"
                  options={['VIC', 'NSW', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'].map(
                    (s) => ({ value: s, label: s }),
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-[#444] mb-1.5">
                  Postcode *
                </label>
                <input
                  name="postcode"
                  value={form.postcode}
                  onChange={handleChange}
                  required
                  placeholder="3000"
                  className="w-full border border-[#d1d5db] rounded-lg px-4 py-2.5 text-[14px] focus:outline-none focus:border-[#00a7a7]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#444] mb-1.5">
                  Country
                </label>
                <input
                  name="country"
                  value="Australia"
                  disabled
                  className="w-full border border-[#e8e8e8] rounded-lg px-4 py-2.5 text-[14px] bg-[#f9f9f9] text-[#888]"
                />
              </div>
            </div>

            {error && (
              <div className="space-y-3">
                <p className="text-[13px] text-[#dc2626] bg-[#fef2f2] border border-[#fecaca] rounded-lg px-4 py-3">
                  {error}
                </p>
                {pendingOrderId && (
                  <button
                    type="button"
                    onClick={handleRetryPayment}
                    disabled={loading}
                    className="w-full bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-60 text-white font-semibold text-[15px] py-3.5 rounded-lg transition-colors"
                  >
                    {loading ? 'Retrying...' : 'Retry Payment'}
                  </button>
                )}
              </div>
            )}

            {!pendingOrderId ? (
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#00a7a7] hover:bg-[#1d4ed8] disabled:opacity-60 text-white font-semibold text-[15px] py-3.5 rounded-lg transition-colors mt-2"
                >
                  {loading ? 'Preparing Payment...' : 'Proceed to Payment'}
                </button>

                <p className="text-[12px] text-[#888] text-center">
                  You will be redirected to Stripe to complete payment securely
                </p>
              </div>
            ) : null}
          </form>
        </div>

        {/* Order summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#e8e8e8] p-6">
            <h2 className="text-[16px] font-bold text-[#111] mb-4">
              Order Summary ({cart.items.length} items)
            </h2>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {cart.items.map((item) => (
                <div key={item.product._id} className="flex gap-3">
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-[#f5f5f5] shrink-0">
                    <Image
                      src={
                        item.product.images?.[0] ||
                        'https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=200'
                      }
                      alt={item.product.name}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#111] line-clamp-2">
                      {item.product.name}
                    </p>
                    <p className="text-[12px] text-[#888] mt-0.5">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <p className="text-[13px] font-semibold text-[#111] shrink-0">
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Price breakdown */}
          <div className="bg-white rounded-xl border border-[#e8e8e8] p-6 space-y-3">
            <div className="flex justify-between text-[14px] text-[#555]">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[14px] text-[#555]">
              <span>GST (10%)</span>
              <span>${gst.toFixed(2)}</span>
            </div>
            <div className="border-t border-[#f0f0f0] pt-3 flex justify-between">
              <span className="text-[16px] font-bold text-[#111]">Total</span>
              <span className="text-[16px] font-bold text-[#111]">
                ${total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
