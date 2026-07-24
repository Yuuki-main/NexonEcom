'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, MapPin, Pencil, Save, X } from 'lucide-react'

function createFormState(profile) {
  return {
    tradingName: profile?.tradingName || '',
    businessAddress: profile?.businessAddress || '',
    billingAddress: profile?.billingAddress || '',
  }
}

export default function CompanyProfileClient({ initialProfile }) {
  const router = useRouter()

  const [profile, setProfile] = useState(initialProfile)
  const [form, setForm] = useState(() => createFormState(initialProfile))

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const startEditing = () => {
    setForm(createFormState(profile))
    setError('')
    setSuccess('')
    setEditing(true)
  }

  const cancelEditing = () => {
    setForm(createFormState(profile))
    setError('')
    setSuccess('')
    setEditing(false)
  }

  const saveProfile = async (event) => {
    event?.preventDefault()

    const payload = {
      tradingName: form.tradingName.trim(),
      businessAddress: form.businessAddress.trim(),
      billingAddress: form.billingAddress.trim(),
    }

    if (payload.tradingName.length > 120) {
      setError('Preferred name must not exceed 120 characters.')
      return
    }

    if (payload.businessAddress.length > 300) {
      setError('Business address must not exceed 300 characters.')
      return
    }

    if (payload.billingAddress.length > 300) {
      setError('Billing address must not exceed 300 characters.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/account/company-profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await readJsonSafely(response)

      if (!response.ok) {
        throw new Error(data.error || 'Unable to update company profile.')
      }

      const updatedOrganization = data.organization || {}

      const updatedProfile = {
        ...profile,

        tradingName: updatedOrganization.tradingName ?? payload.tradingName,

        businessAddress:
          updatedOrganization.businessAddress ?? payload.businessAddress,

        billingAddress:
          updatedOrganization.billingAddress ?? payload.billingAddress,
      }

      setProfile(updatedProfile)
      setForm(createFormState(updatedProfile))
      setEditing(false)
      setSuccess('Company profile updated successfully.')

      router.refresh()
    } catch (saveError) {
      setError(saveError.message || 'Unable to update your company profile.')
    } finally {
      setSaving(false)
    }
  }

  if (!profile) {
    return (
      <div>
        <PageHeading title="Company Profile" />

        <div className="mt-8 rounded-md border border-amber-200 bg-amber-50 px-5 py-4">
          <h2 className="text-[14px] font-semibold text-amber-900">
            No company profile found
          </h2>

          <p className="mt-1 text-[13px] leading-5 text-amber-800">
            Your account is not currently connected to an active organization.
            Please contact the Nexon team for assistance.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 border-b border-[#e4e7ec] pb-5">
        <h1 className="text-[22px] font-bold text-[#1d2939]">
          Company Profile
        </h1>

        {!editing && (
          <button
            type="button"
            onClick={startEditing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#1478d4] px-5 text-[13px] font-semibold text-[#1478d4] transition hover:bg-[#1478d4] hover:text-white"
          >
            <Pencil size={16} />
            Edit
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mt-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-[13px] text-green-700"
        >
          {success}
        </div>
      )}

      {!editing ? (
        <CompanyProfileView profile={profile} />
      ) : (
        <CompanyProfileForm
          profile={profile}
          form={form}
          saving={saving}
          onFieldChange={updateField}
          onCancel={cancelEditing}
          onSave={saveProfile}
        />
      )}
    </div>
  )
}

function CompanyProfileView({ profile }) {
  return (
    <div className="max-w-[820px] py-8">
      <ProfileDisplayField label="ABN" value={profile.abn || 'Not provided'} />

      <ProfileDisplayField
        label="Company Name"
        value={profile.legalName || 'Not provided'}
      />

      <ProfileDisplayField
        label="Preferred Name"
        value={profile.tradingName || profile.legalName || 'Not provided'}
      />

      <ProfileDisplayField
        label="Business Address"
        value={profile.businessAddress || 'Not added yet'}
        icon={MapPin}
      />

      <ProfileDisplayField
        label="Billing Address"
        value={profile.billingAddress || 'Not added yet'}
        icon={MapPin}
      />

      <ProfileDisplayField
        label="GST Registered"
        value={profile.isGstRegistered ? 'Yes' : 'No'}
      />
    </div>
  )
}

function CompanyProfileForm({
  profile,
  form,
  saving,
  onFieldChange,
  onCancel,
  onSave,
}) {
  return (
    <form onSubmit={onSave} className="max-w-[820px] py-8">
      <FormField label="ABN">
        <ReadOnlyField value={profile.abn || 'Not provided'} />

        <p className="mt-2 text-[12px] leading-5 text-[#98a2b3]">
          Contact our support team if your ABN needs to be changed.
        </p>
      </FormField>

      <FormField label="Company Name">
        <ReadOnlyField value={profile.legalName || 'Not provided'} />

        <p className="mt-2 text-[12px] leading-5 text-[#98a2b3]">
          The registered legal company name cannot be changed from this page.
        </p>
      </FormField>

      <FormField label="Preferred Name">
        <input
          type="text"
          value={form.tradingName}
          onChange={(event) => onFieldChange('tradingName', event.target.value)}
          maxLength={120}
          autoComplete="organization"
          placeholder="Enter your preferred company name"
          className="h-[52px] w-full rounded-md border border-[#cbd5e1] bg-white px-4 text-[15px] text-[#26364d] outline-none transition placeholder:text-[#98a2b3] focus:border-[#1478d4] focus:ring-2 focus:ring-[#1478d4]/10"
        />

        <div className="mt-2 flex justify-between gap-4">
          <p className="text-[12px] leading-5 text-[#98a2b3]">
            This name may be displayed throughout your Nexon account.
          </p>

          <span className="shrink-0 text-[12px] text-[#98a2b3]">
            {form.tradingName.length}/120
          </span>
        </div>
      </FormField>

      <FormField label="Business Address">
        <input
          type="text"
          value={form.businessAddress}
          onChange={(event) =>
            onFieldChange('businessAddress', event.target.value)
          }
          maxLength={300}
          autoComplete="street-address"
          placeholder="Enter your business address"
          className="h-[52px] w-full rounded-md border border-[#cbd5e1] bg-white px-4 text-[15px] text-[#26364d] outline-none transition placeholder:text-[#98a2b3] focus:border-[#1478d4] focus:ring-2 focus:ring-[#1478d4]/10"
        />

        <div className="mt-2 flex justify-between gap-4">
          <p className="text-[12px] leading-5 text-[#98a2b3]">
            Enter the primary address used by your business.
          </p>

          <span className="shrink-0 text-[12px] text-[#98a2b3]">
            {form.businessAddress.length}/300
          </span>
        </div>
      </FormField>

      <FormField label="Billing Address">
        <input
          type="text"
          value={form.billingAddress}
          onChange={(event) =>
            onFieldChange('billingAddress', event.target.value)
          }
          maxLength={300}
          autoComplete="billing street-address"
          placeholder="Enter your billing address"
          className="h-[52px] w-full rounded-md border border-[#cbd5e1] bg-white px-4 text-[15px] text-[#26364d] outline-none transition placeholder:text-[#98a2b3] focus:border-[#1478d4] focus:ring-2 focus:ring-[#1478d4]/10"
        />

        <div className="mt-2 flex justify-between gap-4">
          <p className="text-[12px] leading-5 text-[#98a2b3]">
            Enter the address that should appear on invoices.
          </p>

          <span className="shrink-0 text-[12px] text-[#98a2b3]">
            {form.billingAddress.length}/300
          </span>
        </div>
      </FormField>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#1478d4] bg-white px-6 text-[14px] font-semibold text-[#1478d4] transition hover:bg-[#eff6ff] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X size={16} />
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#1478d4] px-6 text-[14px] font-semibold text-white transition hover:bg-[#0f68b8] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <Save size={16} />
              Update
            </>
          )}
        </button>
      </div>
    </form>
  )
}

function PageHeading({ title }) {
  return (
    <div className="border-b border-[#e4e7ec] pb-5">
      <h1 className="text-[22px] font-bold text-[#1d2939]">{title}</h1>
    </div>
  )
}

function ReadOnlyField({ value }) {
  return (
    <div className="flex min-h-[52px] items-center rounded-md border border-[#e4e7ec] bg-[#f8fafc] px-4 text-[15px] text-[#667085]">
      {value}
    </div>
  )
}

function ProfileDisplayField({ label, value, icon: Icon }) {
  return (
    <div className="mb-7">
      <p className="flex items-center gap-2 text-[14px] font-semibold text-[#98a2b3]">
        {Icon && <Icon size={15} />}
        {label}
      </p>

      <p className="mt-2 break-words text-[15px] font-medium leading-6 text-[#1d2939]">
        {value}
      </p>
    </div>
  )
}

function FormField({ label, children }) {
  return (
    <div className="mb-6">
      <label className="mb-2 block text-[14px] font-semibold text-[#98a2b3]">
        {label}
      </label>

      {children}
    </div>
  )
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
