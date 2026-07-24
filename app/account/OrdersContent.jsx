'use client'

import {
  ChevronLeft,
  ChevronRight,
  ClipboardX,
  DraftingCompass,
  ExternalLink,
  Loader2,
  Search,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import CustomSelect from '@/components/ui/CustomSelect'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  {
    value: 'waiting-freight-confirm',
    label: 'Waiting Freight Confirm',
  },
  {
    value: 'awaiting-payment',
    label: 'Awaiting Payment',
  },
  { value: 'processing', label: 'Processing' },
  {
    value: 'ready-for-pickup',
    label: 'Ready For Pickup',
  },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const DATE_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: '7-days', label: 'Last 7 days' },
  { value: '30-days', label: 'Last 30 days' },
  { value: '90-days', label: 'Last 90 days' },
  { value: 'this-year', label: 'This year' },
]

const PAGE_SIZE = 10

export default function OrdersContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const querySearch = searchParams.get('q') || ''
  const status = searchParams.get('status') || 'all'
  const range = searchParams.get('range') || '30-days'
  const awaitingPayment = searchParams.get('awaitingPayment') === 'true'

  const currentPage = Math.max(Number(searchParams.get('page')) || 1, 1)

  const [searchValue, setSearchValue] = useState(querySearch)
  const [orders, setOrders] = useState([])
  const [pagination, setPagination] = useState({
    page: currentPage,
    totalPages: 1,
    total: 0,
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const hasActiveFilters =
    querySearch !== '' ||
    status !== 'all' ||
    range !== '30-days' ||
    awaitingPayment

  const updateQuery = (updates) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (
        value === undefined ||
        value === null ||
        value === '' ||
        value === false ||
        value === 'all'
      ) {
        params.delete(key)
      } else {
        params.set(key, String(value))
      }
    })

    router.replace(params.toString() ? `${pathname}?${params}` : pathname, {
      scroll: false,
    })
  }

  // Track the previous external querySearch so we can detect URL-driven
  // resets (browser back, filter clear, etc.) without a sync effect.
  // Uses state (not ref) per the React-recommended pattern:
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevQuerySearch, setPrevQuerySearch] = useState(querySearch)
  if (querySearch !== prevQuerySearch) {
    setPrevQuerySearch(querySearch)
    setSearchValue(querySearch)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchValue.trim() !== querySearch) {
        updateQuery({
          q: searchValue.trim(),
          page: 1,
        })
      }
    }, 350)

    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue, querySearch])

  useEffect(() => {
    const controller = new AbortController()

    async function loadOrders() {
      setLoading(true)
      setError('')

      try {
        const params = new URLSearchParams()

        if (querySearch) params.set('q', querySearch)
        if (status !== 'all') params.set('status', status)
        if (range !== 'all') params.set('range', range)

        if (awaitingPayment) {
          params.set('awaitingPayment', 'true')
        }

        params.set('page', String(currentPage))
        params.set('limit', String(PAGE_SIZE))

        const response = await fetch(`/api/orders?${params.toString()}`, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        })

        /*
         * Keep the designed empty state when the project does not yet
         * have an orders endpoint or the authenticated account has none.
         */
        if (response.status === 404) {
          setOrders([])
          setPagination({
            page: 1,
            totalPages: 1,
            total: 0,
          })
          return
        }

        const text = await response.text()

        let data = {}

        try {
          data = text ? JSON.parse(text) : {}
        } catch {
          data = {}
        }

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load orders')
        }

        const orderList = Array.isArray(data.orders)
          ? data.orders
          : Array.isArray(data.data)
            ? data.data
            : []

        setOrders(orderList)

        setPagination({
          page:
            Number(data.pagination?.page) || Number(data.page) || currentPage,

          totalPages:
            Number(data.pagination?.totalPages) || Number(data.totalPages) || 1,

          total:
            Number(data.pagination?.total) ||
            Number(data.total) ||
            orderList.length,
        })
      } catch (requestError) {
        if (requestError.name !== 'AbortError') {
          setError(
            requestError.message ||
              'We couldn’t load your orders. Please try again.',
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadOrders()

    return () => controller.abort()
  }, [querySearch, status, range, awaitingPayment, currentPage])

  const clearFilters = () => {
    setSearchValue('')

    router.replace(pathname, {
      scroll: false,
    })
  }

  const normalizedOrders = useMemo(() => orders.map(normalizeOrder), [orders])

  return (
    <div>
      {/* GreenSketch banner */}
      <div className="relative flex min-h-[64px] flex-col items-center justify-between gap-4 overflow-hidden rounded-lg bg-gradient-to-r from-[#20c96b] via-[#00a9c7] to-[#0877f9] px-5 py-4 sm:flex-row sm:px-7">
        <div className="pointer-events-none absolute -left-10 top-0 h-full w-52 bg-white/10 blur-2xl" />

        <p className="relative z-10 text-center text-[16px] font-bold italic text-white sm:text-left sm:text-[18px]">
          Ready to install? Turn your new equipment into a project.
        </p>

        <Link
          href="/greensketch"
          className="relative z-10 inline-flex min-h-[42px] shrink-0 items-center justify-center gap-2 rounded-md bg-white px-5 text-[14px] font-semibold text-[#0877d1] shadow-sm transition hover:bg-[#f8fbff]"
        >
          <DraftingCompass size={17} />
          Start Designing in GreenSketch
          <ExternalLink size={15} />
        </Link>
      </div>

      {/* Heading */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[#e4e7ec] py-4">
        <h1 className="text-[22px] font-bold text-[#1d2939]">Orders</h1>

        <p className="text-[13px] text-[#7c8799]">
          View and manage orders placed through your account.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 py-7 xl:flex-row xl:items-center">
        <div className="relative w-full xl:max-w-[300px]">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#98a2b3]"
          />

          <input
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search Order No. / PO Reference"
            className="h-[50px] w-full rounded-md border border-[#cfd8e3] bg-white pl-11 pr-10 text-[14px] text-[#344054] outline-none transition placeholder:text-[#98a2b3] focus:border-[#1478d4] focus:ring-2 focus:ring-[#1478d4]/10"
          />

          {searchValue && (
            <button
              type="button"
              onClick={() => setSearchValue('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98a2b3] hover:text-[#475467]"
            >
              <X size={17} />
            </button>
          )}
        </div>

        <CustomSelect
          value={status}
          options={STATUS_OPTIONS}
          placeholder="Status"
          ariaLabel="Filter by order status"
          onChange={(value) =>
            updateQuery({
              status: value,
              awaitingPayment:
                value === 'awaiting-payment' ? true : awaitingPayment,
              page: 1,
            })
          }
          className="w-full xl:w-[250px]"
        />

        <CustomSelect
          value={range}
          options={DATE_OPTIONS}
          placeholder="Date range"
          ariaLabel="Filter orders by date"
          onChange={(value) =>
            updateQuery({
              range: value,
              page: 1,
            })
          }
          className="w-full xl:w-[250px]"
        />

        <label className="flex h-[50px] cursor-pointer items-center gap-3 whitespace-nowrap text-[14px] font-medium text-[#344054]">
          <input
            type="checkbox"
            checked={awaitingPayment}
            onChange={(event) =>
              updateQuery({
                awaitingPayment: event.target.checked,
                status: event.target.checked
                  ? 'awaiting-payment'
                  : status === 'awaiting-payment'
                    ? 'all'
                    : status,
                page: 1,
              })
            }
            className="h-5 w-5 rounded border-[#cbd5e1] accent-[#1478d4]"
          />
          Awaiting Payment
        </label>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="h-[42px] whitespace-nowrap px-2 text-left text-[13px] font-semibold text-[#1478d4] hover:text-[#0b5ea8]"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex min-h-[380px] items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-[#667085]">
            <Loader2 size={20} className="animate-spin" />
            Loading orders...
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          We couldn’t load your orders. Please try again.
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && normalizedOrders.length === 0 && (
        <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
          <ClipboardX size={62} strokeWidth={1.7} className="text-[#8b95a7]" />

          <h2 className="mt-5 text-[18px] font-semibold text-[#7c8799]">
            No order records
          </h2>

          <p className="mt-2 max-w-[420px] text-[13px] leading-6 text-[#98a2b3]">
            {hasActiveFilters
              ? 'No orders match your current filters.'
              : 'You have not placed any orders yet.'}
          </p>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-md border border-[#1478d4] px-5 py-2.5 text-sm font-semibold text-[#1478d4] transition hover:bg-[#1478d4] hover:text-white"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {!loading && !error && normalizedOrders.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-lg border border-[#e4e7ec] md:block">
            <table className="w-full min-w-[900px] border-collapse">
              <thead className="bg-[#f8fafc]">
                <tr>
                  <TableHeading>Order Number</TableHeading>
                  <TableHeading>Order Date</TableHeading>
                  <TableHeading>PO Reference</TableHeading>
                  <TableHeading>Items</TableHeading>
                  <TableHeading>Total</TableHeading>
                  <TableHeading>Payment</TableHeading>
                  <TableHeading>Status</TableHeading>
                  <TableHeading />
                </tr>
              </thead>

              <tbody>
                {normalizedOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-t border-[#e4e7ec] transition hover:bg-[#fbfcfe]"
                  >
                    <TableCell>
                      <span className="font-semibold text-[#1478d4]">
                        {order.orderNumber}
                      </span>
                    </TableCell>

                    <TableCell>{order.date}</TableCell>
                    <TableCell>{order.poReference}</TableCell>
                    <TableCell>{order.itemCount}</TableCell>
                    <TableCell>{order.total}</TableCell>

                    <TableCell>
                      <StatusBadge status={order.paymentStatus} />
                    </TableCell>

                    <TableCell>
                      <StatusBadge status={order.orderStatus} />
                    </TableCell>

                    <TableCell>
                      <Link
                        href={`/account/orders/${order.id}`}
                        className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-[#1478d4] hover:text-[#0b5ea8]"
                      >
                        View Order
                        <ChevronRight size={15} />
                      </Link>
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-4 md:hidden">
            {normalizedOrders.map((order) => (
              <article
                key={order.id}
                className="rounded-lg border border-[#e4e7ec] bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[#1478d4]">
                      {order.orderNumber}
                    </p>

                    <p className="mt-1 text-xs text-[#98a2b3]">{order.date}</p>
                  </div>

                  <p className="font-bold text-[#1d2939]">{order.total}</p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-[#98a2b3]">Items</p>

                    <p className="mt-1 text-[#344054]">{order.itemCount}</p>
                  </div>

                  <div>
                    <p className="text-xs text-[#98a2b3]">PO Reference</p>

                    <p className="mt-1 text-[#344054]">{order.poReference}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <StatusBadge status={order.paymentStatus} />
                  <StatusBadge status={order.orderStatus} />
                </div>

                <Link
                  href={`/account/orders/${order.id}`}
                  className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#1478d4]"
                >
                  View Order
                  <ChevronRight size={15} />
                </Link>
              </article>
            ))}
          </div>

          <Pagination
            pagination={pagination}
            onPageChange={(page) => updateQuery({ page })}
          />
        </>
      )}
    </div>
  )
}

function normalizeOrder(order) {
  const items = Array.isArray(order.items) ? order.items : []

  const itemCount =
    Number(order.itemCount) ||
    items.reduce((total, item) => total + (Number(item.quantity) || 1), 0)

  const totalCents =
    Number(order.totalCents) ||
    Number(order.totalAmountCents) ||
    Number(order.grandTotalCents) ||
    Math.round(
      Number(order.total || order.totalAmount || order.grandTotal || 0) * 100,
    )

  return {
    id: order.id,

    orderNumber:
      order.orderNumber ||
      order.shortId ||
      order.reference ||
      `#${String(order.id).slice(-8).toUpperCase()}`,

    date: formatAustralianDate(order.createdAt || order.orderDate),

    poReference:
      order.poReference ||
      order.purchaseOrderReference ||
      order.customerReference ||
      '—',

    itemCount,
    total: formatCurrency(totalCents),

    paymentStatus: formatStatus(
      order.paymentStatus || (order.isPaid ? 'PAID' : 'AWAITING_PAYMENT'),
    ),

    orderStatus: formatStatus(
      order.status || order.orderStatus || 'PROCESSING',
    ),
  }
}

function formatCurrency(cents) {
  const value = Number(cents)

  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(Number.isFinite(value) ? value / 100 : 0)
}

function formatAustralianDate(value) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatStatus(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function StatusBadge({ status }) {
  const normalized = status.toLowerCase()

  let classes = 'border-gray-200 bg-gray-50 text-gray-700'

  if (normalized.includes('paid') && !normalized.includes('awaiting')) {
    classes = 'border-green-200 bg-green-50 text-green-700'
  } else if (
    normalized.includes('awaiting') ||
    normalized.includes('pending')
  ) {
    classes = 'border-amber-200 bg-amber-50 text-amber-700'
  } else if (
    normalized.includes('completed') ||
    normalized.includes('delivered') ||
    normalized.includes('ready')
  ) {
    classes = 'border-green-200 bg-green-50 text-green-700'
  } else if (
    normalized.includes('cancelled') ||
    normalized.includes('failed')
  ) {
    classes = 'border-red-200 bg-red-50 text-red-700'
  } else if (normalized.includes('processing')) {
    classes = 'border-blue-200 bg-blue-50 text-blue-700'
  }

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${classes}`}
    >
      {status}
    </span>
  )
}

function TableHeading({ children }) {
  return (
    <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.03em] text-[#667085]">
      {children}
    </th>
  )
}

function TableCell({ children }) {
  return <td className="px-4 py-4 text-[13px] text-[#344054]">{children}</td>
}

function Pagination({ pagination, onPageChange }) {
  if (pagination.total === 0 || pagination.totalPages <= 1) {
    return null
  }

  const start = (pagination.page - 1) * PAGE_SIZE + 1

  const end = Math.min(pagination.page * PAGE_SIZE, pagination.total)

  return (
    <div className="mt-6 flex flex-col gap-4 border-t border-[#e4e7ec] pt-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[#667085]">
        {start}–{end} of {pagination.total} orders
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
          className="inline-flex h-10 items-center gap-1 rounded-md border border-[#d0d5dd] px-3 text-sm font-medium text-[#344054] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={16} />
          Previous
        </button>

        <span className="px-3 text-sm text-[#667085]">
          Page {pagination.page} of {pagination.totalPages}
        </span>

        <button
          type="button"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPageChange(pagination.page + 1)}
          className="inline-flex h-10 items-center gap-1 rounded-md border border-[#d0d5dd] px-3 text-sm font-medium text-[#344054] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
