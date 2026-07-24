// components/AccountClient.jsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Package, User, MapPin } from 'lucide-react'

const STATUS_COLORS = {
  pending_payment: {
    bg: 'bg-[#fff7ed]',
    text: 'text-[#c2410c]',
    label: 'Pending Payment',
  },
  paid: { bg: 'bg-[#f0fdf4]', text: 'text-[#15803d]', label: 'Paid' },
  shipped: { bg: 'bg-[#eff6ff]', text: 'text-[#1d4ed8]', label: 'Shipped' },
  delivered: { bg: 'bg-[#f0fdf4]', text: 'text-[#15803d]', label: 'Delivered' },
  cancelled: { bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]', label: 'Cancelled' },
}

export default function AccountClient({ user, orders }) {
  const [activeTab, setActiveTab] = useState('orders')

  const tabs = [
    { id: 'orders', label: 'Order History', icon: Package },
    { id: 'profile', label: 'Profile', icon: User },
  ]

  return (
    <main className="max-w-[1100px] mx-auto px-6 py-10">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-bold text-[#111]">
          Welcome back, {user.fullName?.split(' ')[0]}
        </h1>
        <p className="text-[14px] text-[#666] mt-1">{user.email}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-[#e8e8e8]">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-5 py-3 text-[14px] font-medium transition-colors border-b-2 -mb-px cursor-pointer ${
              activeTab === id
                ? 'border-[#00a7a7] text-[#00a7a7]'
                : 'border-transparent text-[#666] hover:text-[#111]'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Orders tab */}
      {activeTab === 'orders' && (
        <div>
          {orders.length === 0 ? (
            <div className="text-center py-20">
              <Package size={48} className="mx-auto text-[#d1d5db] mb-4" />
              <p className="text-[16px] text-[#999]">No orders yet</p>
              <Link
                href="/products"
                className="mt-4 inline-block text-[14px] text-[#00a7a7] hover:underline"
              >
                Browse products
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const status =
                  STATUS_COLORS[order.status] || STATUS_COLORS.pending_payment
                return (
                  <div
                    key={order._id}
                    className="bg-white rounded-xl border border-[#e8e8e8] p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-[13px] text-[#888]">Order ID</p>
                        <p className="text-[14px] font-mono font-medium text-[#111]">
                          #{order._id.toString().slice(-8).toUpperCase()}
                        </p>
                      </div>
                      <span
                        className={`text-[12px] font-semibold px-3 py-1 rounded-full ${status.bg} ${status.text}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    {/* Order items */}
                    <div className="space-y-2 mb-4">
                      {order.items?.map((item, i) => (
                        <div
                          key={i}
                          className="flex justify-between text-[13px]"
                        >
                          <span className="text-[#444] line-clamp-1 flex-1 mr-4">
                            {item.name}
                          </span>
                          <span className="text-[#888] shrink-0">
                            x{item.quantity} · ${item.price?.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-[#f0f0f0] pt-3 flex justify-between items-center">
                      <p className="text-[13px] text-[#888]">
                        {new Date(order.createdAt).toLocaleDateString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-[15px] font-bold text-[#111]">
                        Total: ${order.total?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Profile tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-xl border border-[#e8e8e8] p-8 max-w-[600px]">
          <h2 className="text-[18px] font-bold text-[#111] mb-6">
            Business Profile
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            {[
              ['Full Name', user.fullName],
              ['Email', user.email],
              ['Phone', user.phone],
              ['ABN', user.abn],
              ['Company Name', user.companyName],
              ['Trading Name', user.tradingName || '—'],
              ['GST Registered', user.gst],
              ['Business Address', user.businessAddress],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[12px] text-[#888] mb-1">{label}</p>
                <p className="text-[14px] font-medium text-[#111]">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
