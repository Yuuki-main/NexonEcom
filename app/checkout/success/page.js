import { Suspense } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import prisma from '@/lib/prisma'

// Server component that reads the Stripe session on the server side
async function SuccessContent({ sessionId }) {
  let order = null
  let error = null

  try {
    // Source of truth: the database. The webhook updates order.status to 'paid'.
    // We look up the order by stripeCheckoutSessionId — if the webhook has
    // already fired, status will be 'paid'. If not yet (webhook latency),
    // status is still 'pending_payment' and we show a "processing" message.
    order = await prisma.order.findFirst({
      where: { stripeCheckoutSessionId: sessionId },
      select: { orderNumber: true, total: true, status: true },
    })

    if (!order) {
      error = 'Order not found for this payment session.'
    }
  } catch (err) {
    console.error('Success page error:', err)
    error = 'Unable to verify payment. Your order may still be processing.'
  }

  // If webhook hasn't fired yet, show "processing" — not "success"
  const isPaid = order?.status === 'paid'

  if (error || !order || !isPaid) {
    return (
      <main className="max-w-150 mx-auto px-6 py-20 text-center">
        {isPaid === false ? (
          <AlertCircle size={64} className="mx-auto text-[#3b82f6] mb-6" />
        ) : (
          <AlertCircle size={64} className="mx-auto text-[#f59e0b] mb-6" />
        )}
        <h1 className="text-[28px] font-bold text-[#111] mb-3">
          {error ? 'Payment Verification' : 'Payment Processing'}
        </h1>
        <p className="text-[15px] text-[#666] mb-8">
          {error || 'Your payment is being processed. You will receive a confirmation shortly. You can check your order status below.'}
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/account/orders"
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
    )
  }

  return (
    <main className="max-w-150 mx-auto px-6 py-20 text-center">
      <CheckCircle size={64} className="mx-auto text-[#16a34a] mb-6" />
      <h1 className="text-[32px] font-bold text-[#111] mb-3">
        Payment Successful!
      </h1>
      {order.orderNumber && (
        <p className="text-[16px] text-[#555] mb-2">
          Order:{' '}
          <span className="font-mono font-semibold text-[#111]">
            {order.orderNumber}
          </span>
        </p>
      )}
      {order.total != null && (
        <p className="text-[16px] text-[#555] mb-2">
          Total:{' '}
          <span className="font-semibold text-[#111]">
            ${Number(order.total).toFixed(2)} AUD
          </span>
        </p>
      )}
      <p className="text-[15px] text-[#666] mb-8">
        Thank you for your order. Our team will be in touch with dispatch details.
      </p>
      <div className="flex gap-3 justify-center">
        <Link
          href="/account/orders"
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
  )
}

export default async function CheckoutSuccessPage({ searchParams }) {
  const { session_id: sessionId } = await searchParams

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-[#f5f7fa]">
        <Navbar />
        <main className="max-w-150 mx-auto px-6 py-20 text-center">
          <AlertCircle size={64} className="mx-auto text-[#f59e0b] mb-6" />
          <h1 className="text-[28px] font-bold text-[#111] mb-3">
            No session found
          </h1>
          <p className="text-[15px] text-[#666] mb-8">
            Missing payment session. Please try checking out again.
          </p>
          <Link
            href="/products"
            className="bg-[#00a7a7] hover:bg-[#1d4ed8] text-white font-semibold text-[14px] px-6 py-3 rounded-lg transition-colors"
          >
            Browse Products
          </Link>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />
      <Suspense
        fallback={
          <div className="min-h-[60vh] flex items-center justify-center">
            <Loader2 size={32} className="animate-spin text-[#00a7a7]" />
          </div>
        }
      >
        <SuccessContent sessionId={sessionId} />
      </Suspense>
      <Footer />
    </div>
  )
}
