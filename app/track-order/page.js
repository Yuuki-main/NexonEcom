'use client'

import { useState } from 'react'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

const STATUS_LABELS = {
  pending_payment: 'Pending Payment',
  paid: 'Paid',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

function TrackingResult({ order }) {
  return (
    <div className="mt-8 bg-white border border-[#e8e8e8] rounded-xl p-6 md:p-8">
      <h3 className="text-lg font-semibold text-[#222] mb-6">Order Details</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-[#888]">Order Number</span>
          <p className="text-[#333] font-medium mt-0.5">{order.orderNumber}</p>
        </div>

        {order.packingSlipNumber && (
          <div>
            <span className="text-[#888]">Packing Slip</span>
            <p className="text-[#333] font-medium mt-0.5">
              {order.packingSlipNumber}
            </p>
          </div>
        )}

        {order.customerName && (
          <div>
            <span className="text-[#888]">Customer</span>
            <p className="text-[#333] font-medium mt-0.5">
              {order.customerName}
            </p>
          </div>
        )}

        <div>
          <span className="text-[#888]">Status</span>
          <p className="mt-0.5">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#e8f4fd] text-[#00a7a7]">
              {STATUS_LABELS[order.status] || order.status}
            </span>
          </p>
        </div>

        <div>
          <span className="text-[#888]">Placed</span>
          <p className="text-[#333] font-medium mt-0.5">
            {new Date(order.placedAt).toLocaleDateString('en-AU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>

        <div>
          <span className="text-[#888]">Total</span>
          <p className="text-[#333] font-medium mt-0.5">
            ${order.total.toFixed(2)}
          </p>
        </div>
      </div>

      {order.destination && (
        <div className="mt-6 pt-6 border-t border-[#eee]">
          <span className="text-[#888] text-sm">Destination</span>
          <p className="text-[#333] text-sm mt-1 leading-relaxed">
            {[order.destination.city, order.destination.state]
              .filter(Boolean)
              .join(', ')}
          </p>
        </div>
      )}
    </div>
  )
}

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('')
  const [email, setEmail] = useState('')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmedOrderNumber = orderNumber.trim()
    const trimmedEmail = email.trim()

    if (!trimmedOrderNumber || !trimmedEmail) {
      setError('Please enter your order number and email')
      setOrder(null)
      return
    }

    setError('')
    setOrder(null)
    setLoading(true)

    try {
      const params = new URLSearchParams({
        orderNumber: trimmedOrderNumber,
        email: trimmedEmail,
      })
      const res = await fetch(`/api/track-order?${params.toString()}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Order not found')
        return
      }

      setOrder(data.order)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 py-12 sm:py-16 lg:py-20 min-h-[calc(100vh-582px)] m-auto">
        {/* Logo */}
        <div className="flex justify-center mb-8 mt-[10vh]">
          <Image
            src="/nexon_co_logo.jpeg"
            alt="Nexon"
            width={140}
            height={40}
            className="h-20 w-auto"
          />
        </div>

        {/* Heading */}
        <h1 className="text-center text-2xl sm:text-3xl font-bold text-[#222] mb-2">
          Track an Order
        </h1>
        <p className="text-center text-[#777] text-sm mb-8 max-w-md mx-auto leading-relaxed">
          Enter your order number and the email address used to place the order.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="orderNumber"
              className="block text-sm font-medium text-[#555] mb-1.5"
            >
              Order Number
            </label>
            <input
              id="orderNumber"
              type="text"
              placeholder="e.g. ORD-000001"
              value={orderNumber}
              onChange={(e) => {
                setOrderNumber(e.target.value)
                if (error) setError('')
              }}
              className="w-full rounded-lg border border-[#d1d5db] px-4 py-3 text-sm text-[#333] placeholder-[#bbb] outline-none transition focus:border-[#00a7a7] focus:ring-1 focus:ring-[#00a7a7]"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[#555] mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (error) setError('')
              }}
              className="w-full rounded-lg border border-[#d1d5db] px-4 py-3 text-sm text-[#333] placeholder-[#bbb] outline-none transition focus:border-[#00a7a7] focus:ring-1 focus:ring-[#00a7a7]"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-4 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#00a7a7] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Searching…
              </span>
            ) : (
              'Track Order'
            )}
          </button>
        </form>

        {/* Results */}
        {order && <TrackingResult order={order} />}
      </main>

      <Footer />
    </div>
  )
}
