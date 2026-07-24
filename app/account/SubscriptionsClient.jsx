'use client'

import { useMemo, useState } from 'react'
import {
  BellOff,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Loader2,
  Plus,
  Users,
  X,
} from 'lucide-react'

import CustomSelect from '@/components/ui/CustomSelect'

const PAGE_SIZE = 20

const SUBSCRIPTION_OPTIONS = [
  {
    key: 'orders',
    label: 'Orders',
    description: 'Receive notifications about new and updated orders.',
  },
  {
    key: 'invoices',
    label: 'Invoices',
    description: 'Receive invoice and billing notifications.',
  },
  {
    key: 'packingSlips',
    label: 'Packing Slips',
    description: 'Receive notifications when packing slips are available.',
  },
  {
    key: 'newsletter',
    label: 'Newsletter',
    description: 'Receive Nexon product, promotion and company updates.',
  },
  {
    key: 'statements',
    label: 'Statements',
    description: 'Receive account-statement notifications.',
  },
]

export default function SubscriptionsClient({
  initialSubscriptions,
  currentUserId,
  canManageAll,
}) {
  const [rows, setRows] = useState(initialSubscriptions)
  const [page, setPage] = useState(1)

  const [modalState, setModalState] = useState(null)
  const [workingId, setWorkingId] = useState(null)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const totalPages = Math.max(Math.ceil(rows.length / PAGE_SIZE), 1)

  const visibleRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return rows.slice(start, start + PAGE_SIZE)
  }, [rows, page])

  const canEditRow = (row) => {
    return canManageAll || row.userId === currentUserId
  }

  const updateRowLocally = (updatedRow) => {
    setRows((current) =>
      current.map((row) =>
        row.membershipId === updatedRow.membershipId
          ? {
              ...row,
              ...updatedRow,
            }
          : row,
      ),
    )
  }

  const openCreateModal = () => {
    const editableRows = rows.filter(canEditRow)

    if (editableRows.length === 0) {
      setError(
        'There are no company users available for subscription management.',
      )
      return
    }

    setError('')
    setSuccess('')

    setModalState({
      mode: 'create',
      selectedMembershipId: editableRows[0]?.membershipId || '',
    })
  }

  const openEditModal = (row) => {
    setError('')
    setSuccess('')

    setModalState({
      mode: 'edit',
      selectedMembershipId: row.membershipId,
    })
  }

  const clearSubscriptions = async (row) => {
    if (!canEditRow(row)) {
      return
    }

    setWorkingId(row.membershipId)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(
        `/api/account/subscriptions/${row.membershipId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orders: false,
            invoices: false,
            packingSlips: false,
            newsletter: false,
            statements: false,
          }),
        },
      )

      const data = await readJsonSafely(response)

      if (!response.ok) {
        throw new Error(data.error || 'Unable to disable subscriptions.')
      }

      updateRowLocally(data.subscription)
      setSuccess('Subscriptions disabled successfully.')
    } catch (requestError) {
      setError(requestError.message || 'Unable to disable subscriptions.')
    } finally {
      setWorkingId(null)
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-[#e4e7ec] pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#1d2939]">
            Subscriptions
          </h1>

          <p className="mt-1 text-[12px] leading-5 text-[#667085]">
            Control which company users receive account and ecommerce
            notifications.
          </p>
        </div>

        {(canManageAll || rows.length === 1) && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#1478d4] px-5 text-[13px] font-semibold text-white transition hover:bg-[#0f68b8]"
          >
            <Plus size={16} />
            Subscription
          </button>
        )}
      </div>

      {error && (
        <Message type="error" message={error} onClose={() => setError('')} />
      )}

      {success && (
        <Message
          type="success"
          message={success}
          onClose={() => setSuccess('')}
        />
      )}

      <section className="mt-8">
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="hidden overflow-x-auto border border-[#dfe4ea] md:block">
              <table className="w-full min-w-[920px] border-collapse">
                <thead>
                  <tr className="bg-[#f1f2f4]">
                    <th
                      colSpan={3}
                      className="border-r border-[#dfe4ea] px-4 py-3 text-left text-[13px] font-bold text-[#344054]"
                    >
                      Teammates
                    </th>

                    <th
                      colSpan={5}
                      className="px-4 py-3 text-left text-[13px] font-bold text-[#344054]"
                    >
                      Subscriptions
                    </th>

                    <th className="w-[90px]" />
                  </tr>

                  <tr className="border-t border-[#dfe4ea] bg-[#fafafa]">
                    <TableHeading>Name</TableHeading>
                    <TableHeading>Email</TableHeading>
                    <TableHeading>Phone</TableHeading>
                    <TableHeading align="center">Orders</TableHeading>
                    <TableHeading align="center">Invoices</TableHeading>
                    <TableHeading align="center">Packing Slips</TableHeading>
                    <TableHeading align="center">Newsletter</TableHeading>
                    <TableHeading align="center">Statements</TableHeading>
                    <TableHeading />
                  </tr>
                </thead>

                <tbody>
                  {visibleRows.map((row) => {
                    const editable = canEditRow(row)
                    const working = workingId === row.membershipId

                    return (
                      <tr
                        key={row.membershipId}
                        className="border-t border-[#dfe4ea] transition hover:bg-[#fbfcfe]"
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-[#344054]">
                              {row.fullName}
                            </p>

                            <div className="mt-1 flex flex-wrap gap-1">
                              {row.isCurrentUser && (
                                <SmallBadge tone="green">Me</SmallBadge>
                              )}

                              {row.isPrimary && (
                                <SmallBadge tone="blue">Primary</SmallBadge>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>{row.email || '—'}</TableCell>

                        <TableCell>{row.phone || '—'}</TableCell>

                        <SubscriptionCell active={row.subscriptions.orders} />

                        <SubscriptionCell active={row.subscriptions.invoices} />

                        <SubscriptionCell
                          active={row.subscriptions.packingSlips}
                        />

                        <SubscriptionCell
                          active={row.subscriptions.newsletter}
                        />

                        <SubscriptionCell
                          active={row.subscriptions.statements}
                        />

                        <TableCell>
                          <div className="flex justify-end gap-3">
                            {working ? (
                              <Loader2
                                size={17}
                                className="animate-spin text-[#667085]"
                              />
                            ) : (
                              <>
                                {editable && (
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(row)}
                                    aria-label={`Edit subscriptions for ${row.fullName}`}
                                    className="text-[#344054] transition hover:text-[#1478d4]"
                                  >
                                    <Edit3 size={16} />
                                  </button>
                                )}

                                {editable && (
                                  <button
                                    type="button"
                                    onClick={() => clearSubscriptions(row)}
                                    aria-label={`Disable subscriptions for ${row.fullName}`}
                                    className="text-[#344054] transition hover:text-red-600"
                                  >
                                    <BellOff size={16} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-4 md:hidden">
              {visibleRows.map((row) => {
                const editable = canEditRow(row)

                return (
                  <article
                    key={row.membershipId}
                    className="rounded-md border border-[#e4e7ec] bg-white p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-[#1d2939]">
                          {row.fullName}
                        </p>

                        <p className="mt-1 break-all text-[12px] text-[#667085]">
                          {row.email}
                        </p>

                        <p className="mt-1 text-[12px] text-[#667085]">
                          {row.phone || 'No phone number'}
                        </p>
                      </div>

                      {row.isCurrentUser && (
                        <SmallBadge tone="green">Me</SmallBadge>
                      )}
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      {SUBSCRIPTION_OPTIONS.map((option) => (
                        <div
                          key={option.key}
                          className="flex items-center justify-between rounded-md bg-[#f8fafc] px-3 py-2"
                        >
                          <span className="text-[11px] text-[#475467]">
                            {option.label}
                          </span>

                          {row.subscriptions[option.key] ? (
                            <Check size={16} className="text-[#1478d4]" />
                          ) : (
                            <span className="text-[#cbd5e1]">—</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {editable && (
                      <div className="mt-5 flex gap-4 border-t border-[#e4e7ec] pt-4">
                        <button
                          type="button"
                          onClick={() => openEditModal(row)}
                          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#1478d4]"
                        >
                          <Edit3 size={15} />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => clearSubscriptions(row)}
                          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-red-600"
                        >
                          <BellOff size={15} />
                          Disable All
                        </button>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              total={rows.length}
              onPageChange={setPage}
            />
          </>
        )}
      </section>

      {modalState && (
        <SubscriptionModal
          rows={rows}
          selectedMembershipId={modalState.selectedMembershipId}
          canManageAll={canManageAll}
          currentUserId={currentUserId}
          onClose={() => setModalState(null)}
          onSaved={(updatedRow) => {
            updateRowLocally(updatedRow)
            setModalState(null)
            setSuccess('Subscription preferences updated successfully.')
          }}
        />
      )}
    </div>
  )
}

function SubscriptionModal({
  rows,
  selectedMembershipId,
  canManageAll,
  currentUserId,
  onClose,
  onSaved,
}) {
  const editableRows = rows.filter(
    (row) => canManageAll || row.userId === currentUserId,
  )

  const initialRow =
    editableRows.find((row) => row.membershipId === selectedMembershipId) ||
    editableRows[0]

  const [membershipId, setMembershipId] = useState(
    initialRow?.membershipId || '',
  )

  const [form, setForm] = useState(
    initialRow?.subscriptions || {
      orders: false,
      invoices: false,
      packingSlips: false,
      newsletter: false,
      statements: false,
    },
  )

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const selectedRow = editableRows.find(
    (row) => row.membershipId === membershipId,
  )

  const userOptions = editableRows.map((row) => ({
    value: row.membershipId,
    label: `${row.fullName} — ${row.email}`,
  }))

  const selectUser = (nextMembershipId) => {
    const row = editableRows.find(
      (item) => item.membershipId === nextMembershipId,
    )

    setMembershipId(nextMembershipId)

    setForm(
      row?.subscriptions || {
        orders: false,
        invoices: false,
        packingSlips: false,
        newsletter: false,
        statements: false,
      },
    )
  }

  const toggleField = (field) => {
    setForm((current) => ({
      ...current,
      [field]: !current[field],
    }))
  }

  const selectAll = () => {
    setForm({
      orders: true,
      invoices: true,
      packingSlips: true,
      newsletter: true,
      statements: true,
    })
  }

  const clearAll = () => {
    setForm({
      orders: false,
      invoices: false,
      packingSlips: false,
      newsletter: false,
      statements: false,
    })
  }

  const submit = async (event) => {
    event.preventDefault()

    if (!membershipId) {
      setError('Select a company user.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response = await fetch(
        `/api/account/subscriptions/${membershipId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(form),
        },
      )

      const data = await readJsonSafely(response)

      if (!response.ok) {
        throw new Error(
          data.error || 'Unable to update subscription preferences.',
        )
      }

      onSaved(data.subscription)
    } catch (requestError) {
      setError(
        requestError.message || 'Unable to update subscription preferences.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell title="Manage Subscriptions" onClose={onClose}>
      <form onSubmit={submit}>
        {error && (
          <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
            {error}
          </div>
        )}

        {canManageAll && (
          <div className="mb-6">
            <label className="mb-2 block text-[13px] font-semibold text-[#344054]">
              Teammate
            </label>

            <CustomSelect
              value={membershipId}
              options={userOptions}
              placeholder="Select teammate"
              onChange={selectUser}
              ariaLabel="Select teammate"
            />
          </div>
        )}

        {!canManageAll && selectedRow && (
          <div className="mb-6 rounded-md border border-[#e4e7ec] bg-[#f8fafc] px-4 py-3">
            <p className="text-[14px] font-semibold text-[#1d2939]">
              {selectedRow.fullName}
            </p>

            <p className="mt-1 text-[12px] text-[#667085]">
              {selectedRow.email}
            </p>
          </div>
        )}

        <div className="mb-4 flex items-center justify-between">
          <p className="text-[13px] font-semibold text-[#344054]">
            Notification types
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={selectAll}
              className="text-[12px] font-semibold text-[#1478d4]"
            >
              Select All
            </button>

            <button
              type="button"
              onClick={clearAll}
              className="text-[12px] font-semibold text-[#667085]"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {SUBSCRIPTION_OPTIONS.map((option) => (
            <label
              key={option.key}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-[#e4e7ec] px-4 py-3 transition hover:border-[#b8c8dc] hover:bg-[#fbfcfe]"
            >
              <input
                type="checkbox"
                checked={Boolean(form[option.key])}
                onChange={() => toggleField(option.key)}
                className="mt-1 h-4 w-4 rounded border-[#cbd5e1] accent-[#1478d4]"
              />

              <span>
                <span className="block text-[13px] font-semibold text-[#344054]">
                  {option.label}
                </span>

                <span className="mt-1 block text-[11px] leading-5 text-[#667085]">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </div>

        <div className="mt-7 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-10 rounded-md border border-[#d0d5dd] px-5 text-[13px] font-semibold text-[#344054]"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-[#1478d4] px-5 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Loader2 size={15} className="animate-spin" />}
            Update
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

function SubscriptionCell({ active }) {
  return (
    <td className="px-3 py-4 text-center">
      {active ? (
        <Check size={22} strokeWidth={2} className="mx-auto text-[#1478d4]" />
      ) : (
        <span className="text-[#d0d5dd]">—</span>
      )}
    </td>
  )
}

function Pagination({ page, totalPages, total, onPageChange }) {
  if (total === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-4 border-x border-b border-[#dfe4ea] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[12px] text-[#667085]">
        Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}{' '}
        of {total}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(page - 1, 1))}
          aria-label="Previous page"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d0d5dd] text-[#475467] disabled:opacity-40"
        >
          <ChevronLeft size={16} />
        </button>

        <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-[#eaf3ff] px-3 text-[12px] font-semibold text-[#1478d4]">
          {page}
        </span>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(page + 1, totalPages))}
          aria-label="Next page"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d0d5dd] text-[#475467] disabled:opacity-40"
        >
          <ChevronRight size={16} />
        </button>

        <div className="ml-2 flex h-9 items-center rounded-md border border-[#d0d5dd] px-3 text-[12px] text-[#344054]">
          {PAGE_SIZE}
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-md border border-[#e4e7ec] text-center">
      <Users size={48} className="text-[#98a2b3]" />

      <h2 className="mt-4 text-[15px] font-semibold text-[#667085]">
        No company users available
      </h2>

      <p className="mt-2 max-w-[380px] text-[12px] leading-5 text-[#98a2b3]">
        Add company users before configuring notification subscriptions.
      </p>
    </div>
  )
}

function ModalShell({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/45 px-4 py-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscription-modal-title"
        className="max-h-full w-full max-w-[560px] overflow-y-auto rounded-lg bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e4e7ec] bg-white px-6 py-4">
          <h2
            id="subscription-modal-title"
            className="text-[18px] font-bold text-[#1d2939]"
          >
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-[#667085] hover:text-[#1d2939]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function Message({ type, message, onClose }) {
  const styles =
    type === 'success'
      ? 'border-green-200 bg-green-50 text-green-700'
      : 'border-red-200 bg-red-50 text-red-700'

  return (
    <div
      role={type === 'success' ? 'status' : 'alert'}
      className={`mt-5 flex items-center justify-between gap-4 rounded-md border px-4 py-3 text-[12px] ${styles}`}
    >
      <span>{message}</span>

      <button type="button" onClick={onClose} aria-label="Dismiss message">
        <X size={15} />
      </button>
    </div>
  )
}

function SmallBadge({ tone, children }) {
  const styles =
    tone === 'green' ? 'bg-green-500 text-white' : 'bg-[#1478d4] text-white'

  return (
    <span className={`rounded-sm px-1.5 py-0.5 text-[9px] font-bold ${styles}`}>
      {children}
    </span>
  )
}

function TableHeading({ children, align = 'left' }) {
  return (
    <th
      className={`px-3 py-3 text-[11px] font-semibold text-[#344054] ${
        align === 'center' ? 'text-center' : 'text-left'
      }`}
    >
      {children}
    </th>
  )
}

function TableCell({ children }) {
  return <td className="px-3 py-4 text-[11px] text-[#344054]">{children}</td>
}

async function readJsonSafely(response) {
  const text = await response.text()

  if (!text) {
    return {}
  }

  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}
