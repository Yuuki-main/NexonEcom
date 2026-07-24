'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { CheckCircle } from 'lucide-react'

function ConfirmationContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const shortId = orderId ? `#${orderId.slice(-8).toUpperCase()}` : ''

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />
      <main className="max-w-150 mx-auto px-6 py-20 text-center">
        <CheckCircle size={64} className="mx-auto text-[#16a34a] mb-6" />
        <h1 className="text-[32px] font-bold text-[#111] mb-3">
          Order Placed!
        </h1>
        {shortId && (
          <p className="text-[16px] text-[#555] mb-2">
            Order ID:{' '}
            <span className="font-mono font-semibold text-[#111]">
              {shortId}
            </span>
          </p>
        )}
        <p className="text-[15px] text-[#666] mb-8">
          Thank you for your order. Our team will be in touch shortly to confirm
          payment and dispatch details.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/account"
            className="bg-[#00a7a7] hover:bg-[#1d4ed8] text-white font-semibold text-[14px] px-6 py-3 rounded-lg transition-colors"
          >
            View My Orders
          </Link>
          <Link
            href="/products"
            className="border border-[#d1d5db] text-[#444] hover:bg-[#f5f5f5] font-semibold text-[14px] px-6 py-3 rounded-lg transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-[#888]">Loading...</p>
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  )
}
