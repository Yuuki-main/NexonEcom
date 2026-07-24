import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Building2,
  ChevronRight,
  CreditCard,
  Info,
  Landmark,
  LockKeyhole,
} from 'lucide-react'

import { verifyToken } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import AccountSidebar from '@/components/account/AccountSidebar'

const paymentDetails = {
  accountName: process.env.BANK_ACCOUNT_NAME || 'Nexon & Co Pty Ltd',

  bsb: process.env.BANK_BSB || 'Contact our accounts team',

  accountNumber: process.env.BANK_ACCOUNT_NUMBER || '1052 6698',

  reference: 'Order #, Invoice #, or your company name',
}

const acceptedCards = [
  {
    name: 'Visa',
    content: (
      <span className="text-[29px] font-black italic tracking-[-0.06em] text-[#172b85]">
        VISA
      </span>
    ),
  },
  {
    name: 'Mastercard',
    content: (
      <span className="relative flex h-[42px] w-[74px] items-center justify-center">
        <span className="absolute left-[13px] h-8 w-8 rounded-full bg-[#eb001b]" />
        <span className="absolute right-[13px] h-8 w-8 rounded-full bg-[#f79e1b]" />

        <span className="absolute bottom-[-2px] text-[7px] font-bold text-[#333]">
          mastercard
        </span>
      </span>
    ),
  },
  {
    name: 'American Express',
    content: (
      <span className="flex h-[38px] min-w-[82px] items-center justify-center border-2 border-[#1f82c1] bg-[#2998d4] px-1 text-center text-[10px] font-black leading-[10px] text-white">
        AMERICAN
        <br />
        EXPRESS
      </span>
    ),
  },
]

export default async function PaymentOptionsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  const payload = token ? await verifyToken(token) : null

  if (!payload) {
    redirect('/login?redirect=/account/payment-options')
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Breadcrumb */}
      <div className="border-b border-[#e5e7eb] bg-white">
        <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 lg:px-10">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 overflow-x-auto whitespace-nowrap text-[13px]"
          >
            <Link
              href="/"
              className="text-[#667085] transition-colors hover:text-[#1478d4]"
            >
              Home
            </Link>

            <ChevronRight size={15} className="shrink-0 text-[#98a2b3]" />

            <Link
              href="/account/dashboard"
              className="text-[#667085] transition-colors hover:text-[#1478d4]"
            >
              My Account
            </Link>

            <ChevronRight size={15} className="shrink-0 text-[#98a2b3]" />

            <span className="font-semibold text-[#1d2939]">
              Payment Options
            </span>
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-7 lg:flex-row lg:gap-8">
          <AccountSidebar />

          <section className="min-w-0 flex-1">
            {/* Page heading */}
            <div className="border-b border-[#e4e7ec] pb-5">
              <h1 className="text-[22px] font-bold text-[#1d2939]">
                Payment Options
              </h1>
            </div>

            <div className="space-y-7 pt-8">
              {/* Bank transfer */}
              <PaymentSection title="Bank Transfer" icon={Landmark}>
                <div className="overflow-hidden">
                  <PaymentDetailRow
                    label="Account Name"
                    value={paymentDetails.accountName}
                    shaded
                  />

                  <PaymentDetailRow label="BSB" value={paymentDetails.bsb} />

                  <PaymentDetailRow
                    label="Account Number"
                    value={paymentDetails.accountNumber}
                    shaded
                  />

                  <PaymentDetailRow
                    label="Reference"
                    value={paymentDetails.reference}
                  />
                </div>

                <div className="mx-5 mb-5 mt-2 flex items-start gap-2 rounded-md border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3">
                  <Info size={17} className="mt-0.5 shrink-0 text-[#00a7a7]" />

                  <p className="text-[12px] leading-5 text-[#1e40af]">
                    Please include your order number or registered company name
                    as the payment reference so we can correctly allocate your
                    payment.
                  </p>
                </div>
              </PaymentSection>

              {/* Credit cards */}
              <PaymentSection title="Credit Card" icon={CreditCard}>
                <div className="px-5 py-5 sm:px-6">
                  <div className="flex flex-wrap items-center gap-4">
                    {acceptedCards.map((card) => (
                      <div
                        key={card.name}
                        title={card.name}
                        aria-label={card.name}
                        className="flex h-[52px] min-w-[88px] items-center justify-center rounded-md border border-[#e4e7ec] bg-white px-3"
                      >
                        {card.content}
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex items-start gap-2 text-[12px] leading-5 text-[#667085]">
                    <LockKeyhole
                      size={16}
                      className="mt-0.5 shrink-0 text-[#1478d4]"
                    />

                    <p>
                      Card payments are processed securely during checkout. Your
                      complete card details are not stored by Nexon.
                    </p>
                  </div>
                </div>
              </PaymentSection>

              {/* Payment assistance */}
              <div className="flex flex-col gap-4 rounded-md border border-[#dbe3ec] bg-[#f8fafc] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#eaf3ff]">
                    <Building2 size={19} className="text-[#1478d4]" />
                  </div>

                  <div>
                    <h2 className="text-[14px] font-semibold text-[#1d2939]">
                      Need help with a payment?
                    </h2>

                    <p className="mt-1 text-[12px] leading-5 text-[#667085]">
                      Contact our accounts team for payment allocation, invoices
                      or account enquiries.
                    </p>
                  </div>
                </div>

                <Link
                  href="/contact"
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-[#1478d4] px-5 text-[13px] font-semibold text-[#1478d4] transition hover:bg-[#1478d4] hover:text-white"
                >
                  Contact Accounts
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}

function PaymentSection({ title, icon: Icon, children }) {
  return (
    <section className="overflow-hidden rounded-md border border-[#d7e0e9] bg-white">
      <div className="flex min-h-[54px] items-center gap-2 border-b border-[#c6dff1] bg-[#dceefc] px-5 sm:px-6">
        <Icon size={18} strokeWidth={1.9} className="text-[#0d5e99]" />

        <h2 className="text-[14px] font-bold text-[#0d4f83]">{title}</h2>
      </div>

      {children}
    </section>
  )
}

function PaymentDetailRow({ label, value, shaded = false }) {
  return (
    <div
      className={`grid min-h-[54px] grid-cols-1 gap-2 px-5 py-4 sm:grid-cols-[260px_1fr] sm:items-center sm:px-6 ${
        shaded ? 'bg-[#f5f5f5]' : 'bg-white'
      }`}
    >
      <p className="text-[13px] font-medium text-[#344054]">{label}</p>

      <p className="break-words text-[13px] font-semibold text-[#1d2939]">
        {value}
      </p>
    </div>
  )
}
