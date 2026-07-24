'use client'

import { useEffect, useState } from 'react'
import {
  Building2,
  DollarSign,
  House,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'

const EMPTY_FORM = {
  contactName: '',
  phone: '',
  companyName: '',
  addressLine1: '',
  addressLine2: '',
  suburb: '',
  state: '',
  postcode: '',
  country: 'Australia',
  addressType: 'Business',
  deliveryInstructions: '',
  isDeliveryAddress: false,
  isBillingAddress: false,
}

export default function AddressesClient({ initialAddresses = [] }) {
  const [addresses, setAddresses] = useState(initialAddresses)

  const [drawer, setDrawer] = useState({
    open: false,
    address: null,
  })

  const openNewAddress = () => {
    setDrawer({
      open: true,
      address: null,
    })
  }

  const openEditAddress = (address) => {
    setDrawer({
      open: true,
      address,
    })
  }

  const closeDrawer = () => {
    setDrawer({
      open: false,
      address: null,
    })
  }

  const saveAddress = (address) => {
    setAddresses((current) => {
      let nextAddresses = [...current]

      if (address.isDeliveryAddress) {
        nextAddresses = nextAddresses.map((item) => ({
          ...item,
          isDeliveryAddress: false,
        }))
      }

      if (address.isBillingAddress) {
        nextAddresses = nextAddresses.map((item) => ({
          ...item,
          isBillingAddress: false,
        }))
      }

      const exists = nextAddresses.some((item) => item.id === address.id)

      if (exists) {
        return nextAddresses.map((item) =>
          item.id === address.id ? address : item,
        )
      }

      return [...nextAddresses, address]
    })

    closeDrawer()
  }

  const deleteAddress = (address) => {
    const confirmed = window.confirm(
      `Delete the address at ${address.addressLine1}?`,
    )

    if (!confirmed) return

    setAddresses((current) => current.filter((item) => item.id !== address.id))
  }

  const setDeliveryAddress = (addressId) => {
    setAddresses((current) =>
      current.map((item) => ({
        ...item,
        isDeliveryAddress: item.id === addressId,
      })),
    )
  }

  const setBillingAddress = (addressId) => {
    setAddresses((current) =>
      current.map((item) => ({
        ...item,
        isBillingAddress: item.id === addressId,
      })),
    )
  }

  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-[#e4e7ec] pb-5 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[22px] font-bold text-[#1d2939]">Addresses</h1>

        <button
          type="button"
          onClick={openNewAddress}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#1478d4] px-5 text-[13px] font-semibold text-white transition hover:bg-[#0f68b8]"
        >
          <Plus size={17} />
          Address
        </button>
      </div>

      <div className="mt-8 overflow-hidden rounded-lg border border-[#dfe4ea] bg-white">
        <div className="hidden grid-cols-[1.15fr_1fr_160px] border-b border-[#dfe4ea] px-7 py-4 md:grid">
          <TableHeading>Address</TableHeading>
          <TableHeading>Delivery instructions</TableHeading>
          <TableHeading>Actions</TableHeading>
        </div>

        {addresses.length === 0 ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center px-5 text-center">
            <MapPin size={38} className="text-[#98a2b3]" />

            <h2 className="mt-4 text-[15px] font-semibold text-[#344054]">
              No addresses found
            </h2>

            <p className="mt-1 text-[12px] text-[#667085]">
              Add an address to use for deliveries and billing.
            </p>
          </div>
        ) : (
          addresses.map((address) => (
            <AddressRow
              key={address.id}
              address={address}
              onEdit={() => openEditAddress(address)}
              onDelete={() => deleteAddress(address)}
              onSetDelivery={() => setDeliveryAddress(address.id)}
              onSetBilling={() => setBillingAddress(address.id)}
            />
          ))
        )}
      </div>

      {drawer.open && (
        <AddressDrawer
          key={drawer.address?.id || 'new-address'}
          address={drawer.address}
          onClose={closeDrawer}
          onSave={saveAddress}
        />
      )}
    </div>
  )
}

function AddressRow({
  address,
  onEdit,
  onDelete,
  onSetDelivery,
  onSetBilling,
}) {
  return (
    <>
      <div className="hidden grid-cols-[1.15fr_1fr_160px] border-b border-[#dfe4ea] px-7 py-5 last:border-b-0 md:grid">
        <AddressDetails address={address} />

        <div className="pr-8 text-[13px] leading-6 text-[#475467]">
          {address.deliveryInstructions || '—'}
        </div>

        <div className="flex items-center gap-4">
          <ActionButton
            title={
              address.isDeliveryAddress
                ? 'Default delivery address'
                : 'Set as delivery address'
            }
            active={address.isDeliveryAddress}
            onClick={onSetDelivery}
          >
            <House size={18} />
          </ActionButton>

          <ActionButton
            title={
              address.isBillingAddress
                ? 'Default billing address'
                : 'Set as billing address'
            }
            active={address.isBillingAddress}
            onClick={onSetBilling}
          >
            <DollarSign size={18} />
          </ActionButton>

          <ActionButton title="Edit address" onClick={onEdit}>
            <Pencil size={17} />
          </ActionButton>

          <ActionButton title="Delete address" onClick={onDelete}>
            <Trash2 size={17} />
          </ActionButton>
        </div>
      </div>

      <article className="border-b border-[#dfe4ea] p-5 last:border-b-0 md:hidden">
        <AddressDetails address={address} />

        <div className="mt-5">
          <p className="text-[12px] font-semibold text-[#344054]">
            Delivery instructions
          </p>

          <p className="mt-1 text-[13px] leading-6 text-[#667085]">
            {address.deliveryInstructions || '—'}
          </p>
        </div>

        <div className="mt-5 flex items-center gap-5 border-t border-[#e4e7ec] pt-4">
          <ActionButton
            title="Delivery address"
            active={address.isDeliveryAddress}
            onClick={onSetDelivery}
          >
            <House size={18} />
          </ActionButton>

          <ActionButton
            title="Billing address"
            active={address.isBillingAddress}
            onClick={onSetBilling}
          >
            <DollarSign size={18} />
          </ActionButton>

          <ActionButton title="Edit address" onClick={onEdit}>
            <Pencil size={17} />
          </ActionButton>

          <ActionButton title="Delete address" onClick={onDelete}>
            <Trash2 size={17} />
          </ActionButton>
        </div>
      </article>
    </>
  )
}

function AddressDetails({ address }) {
  return (
    <div className="pr-8 text-[13px] leading-[1.55] text-[#344054]">
      <p>{address.contactName}</p>

      {address.phone && <p>{address.phone}</p>}

      {address.companyName && <p>{address.companyName}</p>}

      <p>{address.addressLine1}</p>

      {address.addressLine2 && <p>{address.addressLine2}</p>}

      <p>
        {[address.suburb, address.state, address.postcode]
          .filter(Boolean)
          .join(' ')}
      </p>

      <p>{address.country}</p>

      {address.addressType && <p>{address.addressType}</p>}

      <div className="mt-2 flex flex-wrap gap-2">
        {address.isDeliveryAddress && <Badge>Delivery</Badge>}

        {address.isBillingAddress && <Badge>Billing</Badge>}
      </div>
    </div>
  )
}

function AddressDrawer({ address, onClose, onSave }) {
  const editing = Boolean(address)

  const [form, setForm] = useState(
    address
      ? {
          ...EMPTY_FORM,
          ...address,
        }
      : EMPTY_FORM,
  )

  const [error, setError] = useState('')

  useEffect(() => {
    const previousOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = previousOverflow

      window.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const submit = (event) => {
    event.preventDefault()

    if (!form.contactName.trim()) {
      setError('Contact name is required.')
      return
    }

    if (!form.addressLine1.trim()) {
      setError('Street address is required.')
      return
    }

    if (!form.suburb.trim()) {
      setError('Suburb or city is required.')
      return
    }

    if (!form.postcode.trim()) {
      setError('Postcode is required.')
      return
    }

    onSave({
      ...form,
      id: address?.id || crypto.randomUUID(),
      contactName: form.contactName.trim(),
      phone: form.phone.trim(),
      companyName: form.companyName.trim(),
      addressLine1: form.addressLine1.trim(),
      addressLine2: form.addressLine2.trim(),
      suburb: form.suburb.trim(),
      state: form.state.trim(),
      postcode: form.postcode.trim(),
      country: form.country.trim(),
      deliveryInstructions: form.deliveryInstructions.trim(),
    })
  }

  return (
    <div className="fixed inset-0 z-[300]">
      <button
        type="button"
        aria-label="Close address panel"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/45"
      />

      <aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-[520px] flex-col bg-white shadow-[-18px_0_45px_rgba(15,23,42,0.18)]">
        <div className="flex min-h-[64px] items-center justify-between border-b border-[#e4e7ec] px-6">
          <h2 className="text-[20px] font-bold text-[#344054]">
            {editing ? 'Edit Address' : 'New Address'}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="text-[#667085] hover:text-[#1d2939]"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-7">
            {error && (
              <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField label="Contact name" required>
                <input
                  value={form.contactName}
                  onChange={(event) =>
                    updateField('contactName', event.target.value)
                  }
                  className={inputClasses}
                />
              </FormField>

              <FormField label="Phone">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                  className={inputClasses}
                />
              </FormField>
            </div>

            <FormField label="Company name">
              <input
                value={form.companyName}
                onChange={(event) =>
                  updateField('companyName', event.target.value)
                }
                className={inputClasses}
              />
            </FormField>

            <FormField label="Address line 1" required>
              <input
                value={form.addressLine1}
                onChange={(event) =>
                  updateField('addressLine1', event.target.value)
                }
                className={inputClasses}
              />
            </FormField>

            <FormField label="Address line 2">
              <input
                value={form.addressLine2}
                onChange={(event) =>
                  updateField('addressLine2', event.target.value)
                }
                className={inputClasses}
              />
            </FormField>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField label="Suburb / City" required>
                <input
                  value={form.suburb}
                  onChange={(event) =>
                    updateField('suburb', event.target.value)
                  }
                  className={inputClasses}
                />
              </FormField>

              <FormField label="State">
                <input
                  value={form.state}
                  onChange={(event) => updateField('state', event.target.value)}
                  className={inputClasses}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField label="Postcode" required>
                <input
                  value={form.postcode}
                  onChange={(event) =>
                    updateField('postcode', event.target.value)
                  }
                  className={inputClasses}
                />
              </FormField>

              <FormField label="Country">
                <input
                  value={form.country}
                  onChange={(event) =>
                    updateField('country', event.target.value)
                  }
                  className={inputClasses}
                />
              </FormField>
            </div>

            <FormField label="Delivery instructions">
              <textarea
                rows={4}
                value={form.deliveryInstructions}
                onChange={(event) =>
                  updateField('deliveryInstructions', event.target.value)
                }
                className={`${inputClasses} min-h-[110px] resize-y py-3`}
              />
            </FormField>

            <div className="space-y-3">
              <CheckboxField
                checked={form.isDeliveryAddress}
                onChange={(checked) =>
                  updateField('isDeliveryAddress', checked)
                }
                icon={House}
                label="Use as delivery address"
              />

              <CheckboxField
                checked={form.isBillingAddress}
                onChange={(checked) => updateField('isBillingAddress', checked)}
                icon={DollarSign}
                label="Use as billing address"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-[#e4e7ec] px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-md border border-[#1478d4] text-[13px] font-semibold text-[#1478d4] hover:bg-[#eff6ff]"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="h-11 rounded-md bg-[#1478d4] text-[13px] font-semibold text-white hover:bg-[#0f68b8]"
            >
              {editing ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </aside>
    </div>
  )
}

function FormField({ label, required = false, children }) {
  return (
    <div className="mb-5">
      <label className="mb-2 block text-[12px] font-medium text-[#667085]">
        {required && <span className="mr-1 text-red-500">*</span>}

        {label}
      </label>

      {children}
    </div>
  )
}

function CheckboxField({ checked, onChange, icon: Icon, label }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-md border border-[#e4e7ec] px-4 py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[#1478d4]"
      />

      <Icon size={17} className="text-[#1478d4]" />

      <span className="text-[13px] font-medium text-[#344054]">{label}</span>
    </label>
  )
}

function ActionButton({ title, active = false, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`transition ${
        active ? 'text-[#1478d4]' : 'text-[#98a2b3] hover:text-[#1478d4]'
      }`}
    >
      {children}
    </button>
  )
}

function TableHeading({ children }) {
  return <p className="text-[13px] font-semibold text-[#344054]">{children}</p>
}

function Badge({ children }) {
  return (
    <span className="rounded-md bg-[#eaf3ff] px-2 py-1 text-[10px] font-semibold text-[#1478d4]">
      {children}
    </span>
  )
}

const inputClasses =
  'h-11 w-full rounded-md border border-[#cbd5e1] bg-white px-4 text-[13px] text-[#344054] outline-none transition focus:border-[#1478d4] focus:ring-2 focus:ring-[#1478d4]/10'
