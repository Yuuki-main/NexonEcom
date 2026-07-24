'use client'

import { useMemo, useState } from 'react'
import CustomSelect from '@/components/CustomSelect'
import {
  Check,
  ChevronDown,
  CircleHelp,
  Edit3,
  Loader2,
  Lock,
  LockOpen,
  Mail,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'

const ROLE_OPTIONS = [
  {
    value: 'sales',
    label: 'Sales',
  },
  {
    value: 'sales_director',
    label: 'Sales Director',
  },
  {
    value: 'operation',
    label: 'Operation',
  },
  {
    value: 'purchase',
    label: 'Purchase',
  },
  {
    value: 'finance',
    label: 'Finance',
  },
  {
    value: 'admin',
    label: 'Admin',
  },
]

const PERMISSIONS = [
  {
    feature: 'Products',
    rows: [
      {
        description: 'View product price',
        roles: ['sales_director', 'purchase', 'finance', 'admin'],
      },
      {
        description: 'View product stock info',
        roles: [
          'sales',
          'sales_director',
          'operation',
          'purchase',
          'finance',
          'admin',
        ],
      },
    ],
  },
  {
    feature: 'Account Dashboard',
    rows: [
      {
        description: 'View credit limit, available credit and order summary',
        roles: ['purchase', 'finance', 'admin'],
      },
    ],
  },
  {
    feature: 'Shopping Cart',
    rows: [
      {
        description: 'Add products to shopping cart',
        roles: ['purchase', 'finance', 'admin'],
      },
    ],
  },
  {
    feature: 'Orders',
    rows: [
      {
        description: 'Place orders',
        roles: ['purchase', 'finance', 'admin'],
      },
      {
        description: 'View order details',
        roles: ['operation', 'purchase', 'finance', 'admin'],
      },
    ],
  },
  {
    feature: 'Packing Slips',
    rows: [
      {
        description: 'View packing slips',
        roles: ['operation', 'purchase', 'finance', 'admin'],
      },
    ],
  },
  {
    feature: 'Invoices',
    rows: [
      {
        description: 'View invoices',
        roles: ['finance', 'admin'],
      },
    ],
  },
  {
    feature: 'Company Settings',
    rows: [
      {
        description: 'Manage company profile, users and subscriptions',
        roles: ['admin'],
      },
    ],
  },
  {
    feature: 'GreenSketch',
    rows: [
      {
        description: 'View my projects',
        roles: [
          'sales',
          'sales_director',
          'operation',
          'purchase',
          'finance',
          'admin',
        ],
      },
      {
        description: 'View all projects',
        roles: ['sales_director', 'operation', 'purchase', 'admin'],
      },
      {
        description: 'Margin-based pricing',
        roles: ['sales_director', 'purchase', 'finance', 'admin'],
      },
    ],
  },
]

const ROLE_COLUMNS = [
  {
    value: 'sales',
    label: 'Sales',
  },
  {
    value: 'sales_director',
    label: 'Sales Director',
  },
  {
    value: 'operation',
    label: 'Operation',
  },
  {
    value: 'purchase',
    label: 'Purchase',
  },
  {
    value: 'finance',
    label: 'Finance',
  },
  {
    value: 'admin',
    label: 'Admin',
  },
]

export default function CompanyUsersClient({
  initialUsers,
  currentUserId,
  canManageUsers,
}) {
  const [users, setUsers] = useState(initialUsers)
  const [query, setQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [deletingUser, setDeletingUser] = useState(null)
  const [workingId, setWorkingId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return users
    }

    return users.filter((user) => {
      return [
        user.fullName,
        user.email,
        user.phone,
        formatRole(user.role),
      ].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(normalizedQuery),
      )
    })
  }, [users, query])

  const updateUserLocally = (updatedUser) => {
    setUsers((current) =>
      current.map((user) =>
        user.membershipId === updatedUser.membershipId
          ? {
              ...user,
              ...updatedUser,
            }
          : user,
      ),
    )
  }

  const toggleUserStatus = async (user) => {
    if (!canManageUsers || user.isPrimary) {
      return
    }

    const nextStatus = user.status === 'active' ? 'inactive' : 'active'

    setWorkingId(user.membershipId)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(
        `/api/account/company-users/${user.membershipId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: nextStatus,
          }),
        },
      )

      const data = await readJsonSafely(response)

      if (!response.ok) {
        throw new Error(data.error || 'Unable to update user access.')
      }

      updateUserLocally(data.user)

      setSuccess(
        nextStatus === 'active'
          ? 'User access activated.'
          : 'User access suspended.',
      )
    } catch (requestError) {
      setError(requestError.message || 'Unable to update user access.')
    } finally {
      setWorkingId(null)
    }
  }

  const removeUser = async () => {
    if (!deletingUser) {
      return
    }

    setWorkingId(deletingUser.membershipId)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(
        `/api/account/company-users/${deletingUser.membershipId}`,
        {
          method: 'DELETE',
        },
      )

      const data = await readJsonSafely(response)

      if (!response.ok) {
        throw new Error(data.error || 'Unable to remove company user.')
      }

      setUsers((current) =>
        current.filter(
          (user) => user.membershipId !== deletingUser.membershipId,
        ),
      )

      setDeletingUser(null)
      setSuccess('Company user removed successfully.')
    } catch (requestError) {
      setError(requestError.message || 'Unable to remove company user.')
    } finally {
      setWorkingId(null)
    }
  }

  return (
    <div>
      <div className="border-b border-[#e4e7ec] pb-5">
        <h1 className="text-[22px] font-bold text-[#1d2939]">Company Users</h1>
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

      <PermissionsMatrix />

      <section className="mt-10">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-[#0d5e99]">Users</h2>

            <p className="mt-1 text-[12px] text-[#667085]">
              Manage users who can access your company account.
            </p>
          </div>

          {canManageUsers && (
            <button
              type="button"
              onClick={() => {
                setError('')
                setSuccess('')
                setShowAddModal(true)
              }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#1478d4] bg-white px-4 text-[13px] font-semibold text-[#1478d4] transition hover:bg-[#1478d4] hover:text-white"
            >
              <Plus size={16} />
              Users
            </button>
          )}
        </div>

        <div className="mb-4 max-w-[360px]">
          <div className="relative">
            <Search
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98a2b3]"
            />

            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search users"
              className="h-11 w-full rounded-md border border-[#d0d5dd] bg-white pl-10 pr-4 text-[13px] text-[#344054] outline-none transition placeholder:text-[#98a2b3] focus:border-[#1478d4] focus:ring-2 focus:ring-[#1478d4]/10"
            />
          </div>
        </div>

        <UsersTable
          users={filteredUsers}
          currentUserId={currentUserId}
          canManageUsers={canManageUsers}
          workingId={workingId}
          onEdit={setEditingUser}
          onToggleStatus={toggleUserStatus}
          onDelete={setDeletingUser}
        />
      </section>

      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onCreated={(newUser) => {
            setUsers((current) => [...current, newUser])
            setShowAddModal(false)
            setSuccess('Company user added successfully.')
          }}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onUpdated={(updatedUser) => {
            updateUserLocally(updatedUser)
            setEditingUser(null)
            setSuccess('Company user updated successfully.')
          }}
        />
      )}

      {deletingUser && (
        <ConfirmDeleteModal
          user={deletingUser}
          loading={workingId === deletingUser.membershipId}
          onCancel={() => setDeletingUser(null)}
          onConfirm={removeUser}
        />
      )}
    </div>
  )
}

function PermissionsMatrix() {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-[14px] font-semibold text-[#0d5e99]">
        Roles &amp; Permissions
      </h2>

      <div className="overflow-x-auto border border-[#dfe4ea]">
        <table className="w-full min-w-[900px] border-collapse text-[12px]">
          <thead>
            <tr className="bg-[#f3f4f6]">
              <th className="border-r border-[#dfe4ea] px-3 py-2 text-left font-semibold text-[#1d2939]">
                Features
              </th>

              <th className="border-r border-[#dfe4ea] px-3 py-2 text-left font-semibold text-[#1d2939]">
                Description
              </th>

              {ROLE_COLUMNS.map((role) => (
                <th
                  key={role.value}
                  className="border-r border-[#dfe4ea] px-2 py-2 text-center font-semibold text-[#1d2939] last:border-r-0"
                >
                  {role.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {PERMISSIONS.map((group) =>
              group.rows.map((row, rowIndex) => (
                <tr
                  key={`${group.feature}-${row.description}`}
                  className="border-t border-[#dfe4ea]"
                >
                  {rowIndex === 0 && (
                    <td
                      rowSpan={group.rows.length}
                      className="border-r border-[#dfe4ea] px-3 py-2 align-middle font-medium text-[#344054]"
                    >
                      {group.feature}
                    </td>
                  )}

                  <td className="border-r border-[#dfe4ea] px-3 py-2 text-[#344054]">
                    {row.description}
                  </td>

                  {ROLE_COLUMNS.map((role) => (
                    <td
                      key={role.value}
                      className="border-r border-[#dfe4ea] px-2 py-2 text-center last:border-r-0"
                    >
                      {row.roles.includes(role.value) && (
                        <Check size={16} className="mx-auto text-[#111827]" />
                      )}
                    </td>
                  ))}
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[#667085]">
        <CircleHelp size={13} />
        Permissions shown are based on the configured company roles.
      </p>
    </section>
  )
}

function UsersTable({
  users,
  currentUserId,
  canManageUsers,
  workingId,
  onEdit,
  onToggleStatus,
  onDelete,
}) {
  if (users.length === 0) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center rounded-md border border-[#e4e7ec] text-center">
        <UserRound size={42} className="text-[#98a2b3]" />

        <p className="mt-4 text-[14px] font-semibold text-[#667085]">
          No company users found
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="hidden overflow-x-auto border border-[#dfe4ea] md:block">
        <table className="w-full min-w-[920px] border-collapse">
          <thead className="bg-[#f3f4f6]">
            <tr>
              <TableHeading>#</TableHeading>
              <TableHeading>Full Name</TableHeading>
              <TableHeading>Email</TableHeading>
              <TableHeading>Phone</TableHeading>
              <TableHeading>Order Branch</TableHeading>
              <TableHeading>Role</TableHeading>
              <TableHeading>My Account Access</TableHeading>
              <TableHeading>GreenSketch Access</TableHeading>
              <TableHeading />
            </tr>
          </thead>

          <tbody>
            {users.map((user, index) => (
              <tr
                key={user.membershipId}
                className="border-t border-[#dfe4ea] hover:bg-[#fafcff]"
              >
                <TableCell>{index + 1}</TableCell>

                <TableCell>
                  <div>
                    <p className="font-medium text-[#344054]">
                      {user.fullName}
                    </p>

                    <div className="mt-1 flex flex-wrap gap-1">
                      {user.isCurrentUser && (
                        <SmallBadge tone="green">Me</SmallBadge>
                      )}

                      {user.isPrimary && (
                        <SmallBadge tone="blue">Primary</SmallBadge>
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell>{user.email || '—'}</TableCell>
                <TableCell>{user.phone || '—'}</TableCell>
                <TableCell>All</TableCell>

                <TableCell>{formatRole(user.role)}</TableCell>

                <TableCell>
                  <AccessStatus status={user.status} />
                </TableCell>

                <TableCell>
                  <AccessStatus status={user.status} />
                </TableCell>

                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    {workingId === user.membershipId ? (
                      <Loader2
                        size={17}
                        className="animate-spin text-[#667085]"
                      />
                    ) : (
                      <>
                        {canManageUsers && (
                          <button
                            type="button"
                            onClick={() => onEdit(user)}
                            aria-label={`Edit ${user.fullName}`}
                            className="text-[#344054] hover:text-[#1478d4]"
                          >
                            <Edit3 size={16} />
                          </button>
                        )}

                        {canManageUsers && !user.isPrimary && (
                          <button
                            type="button"
                            onClick={() => onToggleStatus(user)}
                            aria-label={
                              user.status === 'active'
                                ? `Suspend ${user.fullName}`
                                : `Activate ${user.fullName}`
                            }
                            className="text-[#344054] hover:text-[#1478d4]"
                          >
                            {user.status === 'active' ? (
                              <Lock size={16} />
                            ) : (
                              <LockOpen size={16} />
                            )}
                          </button>
                        )}

                        {canManageUsers &&
                          !user.isPrimary &&
                          user.userId !== currentUserId && (
                            <button
                              type="button"
                              onClick={() => onDelete(user)}
                              aria-label={`Remove ${user.fullName}`}
                              className="text-[#344054] hover:text-red-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                      </>
                    )}
                  </div>
                </TableCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 md:hidden">
        {users.map((user) => (
          <article
            key={user.membershipId}
            className="rounded-md border border-[#e4e7ec] p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-[#1d2939]">{user.fullName}</p>

                <p className="mt-1 text-[12px] text-[#667085]">{user.email}</p>
              </div>

              <AccessStatus status={user.status} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-[12px]">
              <div>
                <p className="text-[#98a2b3]">Role</p>
                <p className="mt-1 text-[#344054]">{formatRole(user.role)}</p>
              </div>

              <div>
                <p className="text-[#98a2b3]">Phone</p>
                <p className="mt-1 text-[#344054]">{user.phone || '—'}</p>
              </div>
            </div>

            {canManageUsers && (
              <div className="mt-5 flex gap-4 border-t border-[#e4e7ec] pt-4">
                <button
                  type="button"
                  onClick={() => onEdit(user)}
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#1478d4]"
                >
                  <Edit3 size={15} />
                  Edit
                </button>

                {!user.isPrimary && (
                  <button
                    type="button"
                    onClick={() => onToggleStatus(user)}
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#667085]"
                  >
                    <Lock size={15} />
                    {user.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                )}

                {!user.isPrimary && user.userId !== currentUserId && (
                  <button
                    type="button"
                    onClick={() => onDelete(user)}
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-red-600"
                  >
                    <Trash2 size={15} />
                    Remove
                  </button>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </>
  )
}

function AddUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    email: '',
    role: 'sales',
  })

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()

    const email = form.email.trim().toLowerCase()

    if (!email) {
      setError('Enter the user’s registered email address.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/account/company-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          role: form.role,
        }),
      })

      const data = await readJsonSafely(response)

      if (!response.ok) {
        throw new Error(data.error || 'Unable to add company user.')
      }

      onCreated(data.user)
    } catch (requestError) {
      setError(requestError.message || 'Unable to add company user.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell title="Add Company User" onClose={onClose}>
      <form onSubmit={submit}>
        {error && (
          <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
            {error}
          </div>
        )}

        <FormField label="Registered email address">
          <div className="relative">
            <Mail
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98a2b3]"
            />

            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              placeholder="user@example.com"
              className="h-12 w-full rounded-md border border-[#d0d5dd] pl-10 pr-4 text-[14px] outline-none focus:border-[#1478d4] focus:ring-2 focus:ring-[#1478d4]/10"
            />
          </div>

          <p className="mt-2 text-[11px] leading-5 text-[#667085]">
            The user must already have a registered Nexon account.
          </p>
        </FormField>

        <FormField label="Role">
          <RoleSelect
            value={form.role}
            onChange={(role) =>
              setForm((current) => ({
                ...current,
                role,
              }))
            }
          />
        </FormField>

        <ModalActions
          submitting={submitting}
          submitLabel="Add User"
          onCancel={onClose}
        />
      </form>
    </ModalShell>
  )
}

function EditUserModal({ user, onClose, onUpdated }) {
  const [role, setRole] = useState(normalizeRole(user.role))

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()

    setSubmitting(true)
    setError('')

    try {
      const response = await fetch(
        `/api/account/company-users/${user.membershipId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            role,
          }),
        },
      )

      const data = await readJsonSafely(response)

      if (!response.ok) {
        throw new Error(data.error || 'Unable to update company user.')
      }

      onUpdated(data.user)
    } catch (requestError) {
      setError(requestError.message || 'Unable to update company user.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell title="Edit Company User" onClose={onClose}>
      <form onSubmit={submit}>
        {error && (
          <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6 rounded-md border border-[#e4e7ec] bg-[#f8fafc] px-4 py-3">
          <p className="text-[14px] font-semibold text-[#1d2939]">
            {user.fullName}
          </p>

          <p className="mt-1 text-[12px] text-[#667085]">{user.email}</p>
        </div>

        <FormField label="Role">
          <RoleSelect
            value={role}
            onChange={setRole}
            disabled={user.isPrimary}
          />

          {user.isPrimary && (
            <p className="mt-2 text-[11px] text-[#667085]">
              The primary owner’s role cannot be changed.
            </p>
          )}
        </FormField>

        <ModalActions
          submitting={submitting}
          submitLabel="Update User"
          onCancel={onClose}
        />
      </form>
    </ModalShell>
  )
}

function ConfirmDeleteModal({ user, loading, onCancel, onConfirm }) {
  return (
    <ModalShell title="Remove Company User" onClose={onCancel}>
      <p className="text-[14px] leading-6 text-[#475467]">
        Remove <strong>{user.fullName}</strong> from this company account? They
        will no longer be able to access company orders or account information.
      </p>

      <div className="mt-7 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="h-10 rounded-md border border-[#d0d5dd] px-5 text-[13px] font-semibold text-[#344054]"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-red-600 px-5 text-[13px] font-semibold text-white disabled:opacity-60"
        >
          {loading && <Loader2 size={15} className="animate-spin" />}
          Remove User
        </button>
      </div>
    </ModalShell>
  )
}

function RoleSelect({ value, onChange, disabled = false }) {
  return (
    <CustomSelect
      value={value}
      onChange={onChange}
      disabled={disabled}
      options={ROLE_OPTIONS}
    />
  )
}

function AccessStatus({ status }) {
  const normalizedStatus = String(status).toLowerCase()

  if (normalizedStatus === 'active') {
    return <span className="text-[12px] font-semibold text-green-600">Yes</span>
  }

  if (normalizedStatus === 'pending') {
    return (
      <span className="text-[12px] font-semibold text-amber-600">
        Pending Activation
      </span>
    )
  }

  return (
    <span className="text-[12px] font-semibold text-red-600">Suspended</span>
  )
}

function ModalShell({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-user-modal-title"
        className="w-full max-w-[500px] rounded-lg bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#e4e7ec] px-6 py-4">
          <h2
            id="company-user-modal-title"
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

function ModalActions({ submitting, submitLabel, onCancel }) {
  return (
    <div className="mt-7 flex justify-end gap-3">
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className="h-10 rounded-md border border-[#d0d5dd] px-5 text-[13px] font-semibold text-[#344054]"
      >
        Cancel
      </button>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-10 items-center gap-2 rounded-md bg-[#1478d4] px-5 text-[13px] font-semibold text-white disabled:opacity-60"
      >
        {submitting && <Loader2 size={15} className="animate-spin" />}

        {submitLabel}
      </button>
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

function TableHeading({ children }) {
  return (
    <th className="px-3 py-3 text-left text-[11px] font-semibold text-[#344054]">
      {children}
    </th>
  )
}

function TableCell({ children }) {
  return <td className="px-3 py-3 text-[11px] text-[#344054]">{children}</td>
}

function FormField({ label, children }) {
  return (
    <div className="mb-5">
      <label className="mb-2 block text-[13px] font-semibold text-[#344054]">
        {label}
      </label>

      {children}
    </div>
  )
}

function normalizeRole(role) {
  const value = String(role || '').toLowerCase()

  if (value === 'owner') {
    return 'admin'
  }

  if (ROLE_OPTIONS.some((option) => option.value === value)) {
    return value
  }

  return 'sales'
}

function formatRole(role) {
  const normalized = String(role || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')

  if (normalized === 'owner') {
    return 'Admin'
  }

  return normalized.replace(/\b\w/g, (character) => character.toUpperCase())
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
