'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  NotebookPen,
  ClipboardList,
  Heart,
  CreditCard,
  Building2,
  ContactRound,
  Bookmark,
  Users,
  Map,
  Menu,
  X,
} from 'lucide-react'

const mainItems = [
  {
    label: 'Account Dashboard',
    href: '/account/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'GreenSketch',
    href: '/account/greensketch',
    icon: NotebookPen,
    comingSoon: true,
  },
  { label: 'Orders', href: '/account/orders', icon: ClipboardList },
  { label: 'Favourite', href: '/account/favourite', icon: Heart },
  {
    label: 'Payment Options',
    href: '/account/payment-options',
    icon: CreditCard,
  },
]

const settingsItems = [
  {
    label: 'Company Profile',
    href: '/account/company-profile',
    icon: Building2,
  },
  {
    label: 'Company Users',
    href: '/account/company-users',
    icon: ContactRound,
  },
  { label: 'Subscriptions', href: '/account/subscriptions', icon: Bookmark },
  { label: 'My Team', href: '/account/my-team', icon: Users },
  { label: 'Addresses', href: '/account/addresses', icon: Map },
]

export default function AccountSidebar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="lg:hidden flex items-center gap-2 mb-4 text-[14px] font-medium text-[#555] border border-[#d1d5db] rounded-lg px-4 py-2.5 hover:bg-[#f5f5f5] transition cursor-pointer"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
        Account Menu
      </button>

      {/* Sidebar */}
      <nav
        className={`lg:block ${open ? 'block' : 'hidden'} w-full lg:w-[230px] shrink-0`}
        aria-label="Account navigation"
      >
        <div className="space-y-5">
          {/* Main section */}
          <div>
            {mainItems.map((item) => (
              <SidebarItem
                key={item.label}
                {...item}
                active={pathname === item.href}
              />
            ))}
          </div>

          {/* Settings section */}
          <div>
            <p className="text-[11px] font-semibold text-[#999] uppercase tracking-wider px-3 mb-2">
              Settings
            </p>
            {settingsItems.map((item) => (
              <SidebarItem
                key={item.label}
                {...item}
                active={pathname === item.href}
              />
            ))}
          </div>
        </div>
      </nav>
    </>
  )
}

function SidebarItem({ label, href, icon: Icon, active, comingSoon }) {
  const content = (
    <div
      className={`flex items-center gap-3 h-14 px-3 border-b border-dashed border-[#e8e8e8] text-[14px] transition-colors ${
        active
          ? 'bg-[#f4f5f7] text-[#111] font-medium border-l-[3px] border-l-[#00a7a7]'
          : 'text-[#555] hover:bg-[#fafafa] border-l-[3px] border-l-transparent'
      }`}
      title={comingSoon ? 'Coming soon' : undefined}
    >
      <Icon size={18} className={active ? 'text-[#00a7a7]' : 'text-[#999]'} />
      <span className="flex-1">{label}</span>
      {comingSoon && (
        <span className="text-[10px] text-[#bbb] font-normal">Coming soon</span>
      )}
    </div>
  )

  if (comingSoon) return content

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className="block"
    >
      {content}
    </Link>
  )
}
