'use client'

import {
  Building2,
  User,
  WalletCards,
  PackageOpen,
  BadgeCheck,
  Download,
  CircleHelp,
  CreditCard,
} from 'lucide-react'
import Link from 'next/link'

const STATUS_COLORS = {
  awaiting_payment: {
    bg: 'bg-[#eff6ff]',
    text: 'text-[#00a7a7]',
    dot: 'bg-[#ef4444]',
  },
  processing: { bg: 'bg-[#f0fdf4]', text: 'text-[#16a34a]', dot: null },
  completed: { bg: 'bg-[#f0fdf4]', text: 'text-[#16a34a]', dot: null },
}

export default function AccountDashboard({ data }) {
  const { user, org, credit, orders } = data

  const availableCredit = Math.max(
    credit.creditLimit - credit.creditUsed + credit.unappliedCredits,
    0,
  )
  const creditUsedPercent =
    credit.creditLimit > 0 ? (credit.creditUsed / credit.creditLimit) * 100 : 0

  const fmt = (cents) =>
    '$' +
    (cents / 100).toLocaleString('en-AU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  const fmtPct = (pct) => pct.toFixed(2) + '%'

  return (
    <div className="flex-1 min-w-0">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
        <h1 className="text-[22px] font-bold text-[#111]">Account Dashboard</h1>

        <div className="flex flex-wrap items-center gap-2 text-[13px] text-[#666]">
          <span className="text-[#aaa]">hello!</span>
          {org && (
            <>
              <span className="inline-flex items-center gap-1">
                <Building2 size={14} />
                <span className="font-medium text-[#444]">
                  {org.tradingName || org.legalName}
                </span>
              </span>
              <span className="text-[#ddd]">|</span>
              <span className="text-[11px] bg-[#f0f4ff] text-[#00a7a7] px-2 py-0.5 rounded font-medium uppercase">
                {org.type}
              </span>
            </>
          )}
          <span className="inline-flex items-center gap-1">
            <User size={14} />
            <span>{user.fullName}</span>
          </span>
        </div>
      </div>

      <div className="border-t border-[#e8e8e8] mb-8" />

      {/* ── Credit Summary ── */}
      <h2 className="text-[16px] font-semibold text-[#111] mb-4">
        Credit Summary
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
        {/* Card 1: Limit & Terms */}
        <div className="bg-white border border-[#e8e8e8] rounded-md p-5">
          <div className="flex justify-between mb-4">
            <div>
              <p className="text-[12px] text-[#888] mb-0.5">Credit Limit</p>
              <p className="text-[18px] font-bold text-[#111]">
                {fmt(credit.creditLimit)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[12px] text-[#888] mb-0.5">Payment Terms</p>
              <p className="text-[15px] font-semibold text-[#444]">
                {credit.paymentTerms}
              </p>
            </div>
          </div>

          <div className="border-t border-[#f0f0f0] pt-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[12px] text-[#888]">Credit Used</p>
                <p className="text-[16px] font-bold text-[#ea580c]">
                  {fmt(credit.creditUsed)}
                </p>
                <p className="text-[11px] text-[#999] mt-0.5">
                  Credit Used ({fmtPct(creditUsedPercent)})
                </p>
              </div>
              <div>
                <p className="text-[12px] text-[#888]">Unapplied Credits</p>
                <p className="text-[16px] font-bold text-[#16a34a]">
                  {fmt(credit.unappliedCredits)}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-[#888]">Available Credit</p>
                <p className="text-[16px] font-bold text-[#111]">
                  {fmt(availableCredit)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Balance */}
        <div className="bg-white border border-[#e8e8e8] rounded-md p-5">
          <div className="flex justify-between mb-4">
            <div>
              <p className="text-[12px] text-[#888] mb-0.5">Balance</p>
              <p className="text-[24px] font-bold text-[#111]">
                {fmt(credit.cachedBalance)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[12px] text-[#888] mb-0.5">
                Overdue {credit.overdueDays}{' '}
                {credit.overdueDays === 1 ? 'day' : 'days'}
              </p>
              <p
                className={`text-[15px] font-semibold ${credit.overdueAmount > 0 ? 'text-[#dc2626]' : 'text-[#444]'}`}
              >
                {fmt(credit.overdueAmount)}
              </p>
            </div>
          </div>

          <div className="border-t border-[#f0f0f0] pt-4">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {credit.ageing.map((bucket) => (
                <div key={bucket.label}>
                  <p className="text-[11px] text-[#888]">{bucket.label}</p>
                  <p className="text-[14px] font-medium text-[#444]">
                    {fmt(bucket.amount)}
                  </p>
                </div>
              ))}
            </div>

            {/* Download Statement — disabled (not yet implemented) */}
            <div className="mt-4 text-right">
              <button
                disabled
                className="inline-flex items-center gap-1.5 text-[13px] text-[#bbb] cursor-not-allowed"
                title="Statement download coming soon"
              >
                <Download size={14} />
                Download Statement
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Order Summary ── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[16px] font-semibold text-[#111] flex items-center gap-1.5">
          Order Summary
          <CircleHelp
            size={15}
            className="text-[#bbb]"
            title="Counts are grouped by order status"
          />
        </h2>
        <div className="flex items-center gap-1.5">
          <Link
            href="/account"
            className="text-[#00a7a7] text-[14px] font-semibold"
          >
            {orders.total}
          </Link>
          <span className="text-[14px] text-[#555]">Orders</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {orders.cards.map((card) => (
          <OrderCard key={card.key} card={card} />
        ))}
      </div>
    </div>
  )
}

function OrderCard({ card }) {
  const colors = STATUS_COLORS[card.key] || {
    bg: 'bg-[#f5f5f5]',
    text: 'text-[#666]',
    dot: null,
  }
  const IconComp =
    card.key === 'awaiting_payment'
      ? WalletCards
      : card.key === 'processing'
        ? PackageOpen
        : BadgeCheck

  return (
    <div className="bg-white border border-[#e8e8e8] rounded-md p-4 min-h-[100px] flex items-center gap-4 hover:border-[#cbd5e1] transition-colors">
      <div
        className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${colors.bg}`}
      >
        <IconComp size={20} className={colors.text} />
        {colors.dot && (
          <span
            className={`absolute w-2 h-2 ${colors.dot} rounded-full -top-0.5 -right-0.5`}
          />
        )}
      </div>
      <div>
        <p className="text-[12px] text-[#888]">{card.label}</p>
        <p className="text-[20px] font-bold text-[#111]">{card.count}</p>
      </div>
    </div>
  )
}
