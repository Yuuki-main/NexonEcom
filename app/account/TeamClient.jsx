'use client'

import { useEffect, useState } from 'react'
import {
  Edit3,
  Loader2,
  Mail,
  Phone,
  Plus,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react'

export default function TeamClient({ initialMembers, canManageTeam }) {
  const [members, setMembers] = useState(initialMembers)

  const [drawer, setDrawer] = useState({
    open: false,
    member: null,
  })

  const [deletingId, setDeletingId] = useState(null)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const openNewMemberDrawer = () => {
    setError('')
    setSuccess('')

    setDrawer({
      open: true,
      member: null,
    })
  }

  const openEditDrawer = (member) => {
    setError('')
    setSuccess('')

    setDrawer({
      open: true,
      member,
    })
  }

  const closeDrawer = () => {
    setDrawer({
      open: false,
      member: null,
    })
  }

  const saveMemberLocally = (member) => {
    setMembers((current) => {
      const exists = current.some((item) => item.id === member.id)

      if (exists) {
        return current.map((item) => (item.id === member.id ? member : item))
      }

      return [...current, member]
    })

    closeDrawer()

    setSuccess(
      drawer.member
        ? 'Team member updated successfully.'
        : 'Team member added successfully.',
    )
  }

  const deleteMember = async (member) => {
    const confirmed = window.confirm(`Remove ${member.name} from your team?`)

    if (!confirmed) {
      return
    }

    setDeletingId(member.id)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/account/team/${member.id}`, {
        method: 'DELETE',
      })

      const data = await readJsonSafely(response)

      if (!response.ok) {
        throw new Error(data.error || 'Unable to remove team member.')
      }

      setMembers((current) => current.filter((item) => item.id !== member.id))

      setSuccess('Team member removed successfully.')
    } catch (requestError) {
      setError(requestError.message || 'Unable to remove team member.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-[#e4e7ec] pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-[22px] font-bold text-[#1d2939]">My Team</h1>

          <p className="text-[12px] text-[#667085]">
            Manage installer team and order pickups from the warehouse.
          </p>
        </div>

        {canManageTeam && (
          <button
            type="button"
            onClick={openNewMemberDrawer}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#1478d4] px-5 text-[13px] font-semibold text-white transition hover:bg-[#0f68b8]"
          >
            <Plus size={16} />
            Member
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

      <div className="mt-8">
        {members.length === 0 ? (
          <EmptyTeam />
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-md border border-[#dfe4ea] md:block">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-white">
                    <TableHeading>Name</TableHeading>
                    <TableHeading>Email</TableHeading>
                    <TableHeading>Phone</TableHeading>

                    {canManageTeam && <TableHeading />}
                  </tr>
                </thead>

                <tbody>
                  {members.map((member) => (
                    <tr
                      key={member.id}
                      className="border-t border-[#dfe4ea] transition hover:bg-[#fbfcfe]"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eaf3ff]">
                            <UserRound size={17} className="text-[#1478d4]" />
                          </div>

                          <span className="font-medium text-[#344054]">
                            {member.name}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <a
                          href={`mailto:${member.email}`}
                          className="text-[#344054] hover:text-[#1478d4]"
                        >
                          {member.email}
                        </a>
                      </TableCell>

                      <TableCell>
                        {member.phone ? (
                          <a
                            href={`tel:${member.phone}`}
                            className="text-[#344054] hover:text-[#1478d4]"
                          >
                            {member.phone}
                          </a>
                        ) : (
                          '—'
                        )}
                      </TableCell>

                      {canManageTeam && (
                        <TableCell>
                          <div className="flex justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => openEditDrawer(member)}
                              aria-label={`Edit ${member.name}`}
                              className="text-[#475467] transition hover:text-[#1478d4]"
                            >
                              <Edit3 size={16} />
                            </button>

                            <button
                              type="button"
                              disabled={deletingId === member.id}
                              onClick={() => deleteMember(member)}
                              aria-label={`Remove ${member.name}`}
                              className="text-[#475467] transition hover:text-red-600 disabled:opacity-50"
                            >
                              {deletingId === member.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </div>
                        </TableCell>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-4 md:hidden">
              {members.map((member) => (
                <article
                  key={member.id}
                  className="rounded-md border border-[#e4e7ec] bg-white p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eaf3ff]">
                      <UserRound size={18} className="text-[#1478d4]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#1d2939]">
                        {member.name}
                      </p>

                      <a
                        href={`mailto:${member.email}`}
                        className="mt-1 block break-all text-[12px] text-[#667085]"
                      >
                        {member.email}
                      </a>

                      <p className="mt-1 text-[12px] text-[#667085]">
                        {member.phone || 'No phone number'}
                      </p>
                    </div>
                  </div>

                  {canManageTeam && (
                    <div className="mt-5 flex gap-5 border-t border-[#e4e7ec] pt-4">
                      <button
                        type="button"
                        onClick={() => openEditDrawer(member)}
                        className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#1478d4]"
                      >
                        <Edit3 size={15} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteMember(member)}
                        className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-red-600"
                      >
                        <Trash2 size={15} />
                        Remove
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      {drawer.open && (
        <TeamMemberDrawer
          key={drawer.member?.id || 'new-member'}
          member={drawer.member}
          onClose={closeDrawer}
          onSaved={saveMemberLocally}
        />
      )}
    </div>
  )
}

function TeamMemberDrawer({ member, onClose, onSaved }) {
  const editing = Boolean(member)

  const [form, setForm] = useState({
    name: member?.name || '',
    email: member?.email || '',
    phone: member?.phone || '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [visible, setVisible] = useState(false)

  // Trigger slide-in on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 250) // match transition duration
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleEscape = (event) => {
      if (event.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const submit = async (event) => {
    event.preventDefault()

    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
    }

    if (payload.name.length < 2) {
      setError('Name must contain at least 2 characters.')
      return
    }

    if (!isValidEmail(payload.email)) {
      setError('Enter a valid email address.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const endpoint = editing
        ? `/api/account/team/${member.id}`
        : '/api/account/team'

      const response = await fetch(endpoint, {
        method: editing ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await readJsonSafely(response)

      if (!response.ok) {
        throw new Error(
          data.error || `Unable to ${editing ? 'update' : 'add'} team member.`,
        )
      }

      onSaved(data.member)
    } catch (requestError) {
      setError(requestError.message || 'Unable to save team member.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[300]">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close member panel"
        onClick={handleClose}
        className={`absolute inset-0 h-full w-full cursor-default bg-black/45 transition-opacity duration-250 ${visible ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Sliding panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-drawer-title"
        className={`absolute bottom-0 right-0 top-0 flex w-full max-w-[440px] flex-col bg-white shadow-[-18px_0_45px_rgba(15,23,42,0.18)] transition-transform duration-250 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex min-h-[64px] items-center justify-between border-b border-[#e4e7ec] px-5 sm:px-6">
          <h2
            id="team-drawer-title"
            className="text-[20px] font-bold text-[#344054]"
          >
            {editing ? 'Edit Member' : 'New Member'}
          </h2>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close member panel"
            className="text-[#667085] transition hover:text-[#1d2939]"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-5 py-7 sm:px-6">
            {error && (
              <div
                role="alert"
                className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700"
              >
                {error}
              </div>
            )}

            <DrawerField label="Name" required icon={UserRound}>
              <input
                type="text"
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                maxLength={100}
                autoComplete="name"
                className="h-12 w-full rounded-md border border-[#cbd5e1] bg-white px-4 text-[14px] text-[#344054] outline-none transition focus:border-[#1478d4] focus:ring-2 focus:ring-[#1478d4]/10"
              />
            </DrawerField>

            <DrawerField label="Email" required icon={Mail}>
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                maxLength={254}
                autoComplete="email"
                className="h-12 w-full rounded-md border border-[#cbd5e1] bg-white px-4 text-[14px] text-[#344054] outline-none transition focus:border-[#1478d4] focus:ring-2 focus:ring-[#1478d4]/10"
              />
            </DrawerField>

            <DrawerField label="Phone" icon={Phone}>
              <input
                type="tel"
                value={form.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                maxLength={30}
                autoComplete="tel"
                className="h-12 w-full rounded-md border border-[#cbd5e1] bg-white px-4 text-[14px] text-[#344054] outline-none transition focus:border-[#1478d4] focus:ring-2 focus:ring-[#1478d4]/10"
              />
            </DrawerField>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-[#e4e7ec] bg-white px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="h-11 rounded-md border border-[#1478d4] bg-white text-[13px] font-semibold text-[#1478d4] transition hover:bg-[#eff6ff] disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#1478d4] text-[13px] font-semibold text-white transition hover:bg-[#0f68b8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}

              {editing ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </aside>
    </div>
  )
}

function DrawerField({ label, required = false, children }) {
  return (
    <div className="mb-6">
      <label className="mb-2 block text-[12px] font-medium text-[#667085]">
        {required && <span className="mr-1 text-red-500">*</span>}

        {label}
      </label>

      {children}
    </div>
  )
}

function EmptyTeam() {
  return (
    <div className="overflow-hidden rounded-md border border-[#dfe4ea] bg-white">
      <div className="grid grid-cols-3 border-b border-[#dfe4ea] px-4 py-4">
        <p className="text-[13px] font-semibold text-[#344054]">Name</p>

        <p className="text-[13px] font-semibold text-[#344054]">Email</p>

        <p className="text-[13px] font-semibold text-[#344054]">Phone</p>
      </div>

      <div className="flex min-h-[72px] items-center justify-center border-b border-[#dfe4ea] px-4">
        <p className="text-[13px] text-[#344054]">No records found</p>
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

function TableHeading({ children }) {
  return (
    <th className="px-4 py-4 text-left text-[13px] font-semibold text-[#344054]">
      {children}
    </th>
  )
}

function TableCell({ children }) {
  return <td className="px-4 py-4 text-[13px] text-[#344054]">{children}</td>
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
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
