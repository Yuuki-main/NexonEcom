'use client'

import { useState } from 'react'
import CustomSelect from '@/components/ui/CustomSelect'

// Isolated usage example for CustomSelect — not imported by any production
// page. Demonstrates: a normal dropdown, a placeholder, a pre-selected
// value, a disabled option, an error state, and a fully disabled dropdown.
export default function CustomSelectExample() {
  const [brand, setBrand] = useState('')
  const [brandWithValue, setBrandWithValue] = useState('solis')
  const [brandWithError, setBrandWithError] = useState('')

  const brandOptions = [
    { value: 'solis', label: 'Solis' },
    { value: 'goodwe', label: 'GoodWe' },
    { value: 'anker-solix', label: 'Anker SOLIX' },
    { value: 'alpha-ess', label: 'Alpha Ess' },
    { value: 'saj', label: 'SAJ' },
    { value: 'solaredge', label: 'SolarEdge', disabled: true },
    { value: 'fronius', label: 'Fronius' },
  ]

  return (
    <div className="max-w-md mx-auto py-16 px-6 space-y-10">
      <h1 className="text-xl font-bold text-[#20242a]">CustomSelect examples</h1>

      <div>
        <p className="text-sm text-gray-500 mb-2">Normal, with placeholder</p>
        <CustomSelect
          id="battery-brand"
          name="brand"
          label="Brand"
          value={brand}
          options={brandOptions}
          placeholder="Select a brand"
          onChange={(value) => setBrand(value)}
        />
      </div>

      <div>
        <p className="text-sm text-gray-500 mb-2">Pre-selected value</p>
        <CustomSelect
          id="battery-brand-preselected"
          name="brandWithValue"
          label="Brand"
          value={brandWithValue}
          options={brandOptions}
          onChange={(value) => setBrandWithValue(value)}
        />
      </div>

      <div>
        <p className="text-sm text-gray-500 mb-2">Error state</p>
        <CustomSelect
          id="battery-brand-error"
          name="brandWithError"
          label="Brand"
          required
          value={brandWithError}
          options={brandOptions}
          placeholder="Select a brand"
          error={!brandWithError ? 'Please select a brand' : undefined}
          helperText="Choose the manufacturer for this battery."
          onChange={(value) => setBrandWithError(value)}
        />
      </div>

      <div>
        <p className="text-sm text-gray-500 mb-2">Disabled dropdown</p>
        <CustomSelect
          id="battery-brand-disabled"
          name="brandDisabled"
          label="Brand"
          value="solis"
          options={brandOptions}
          disabled
          onChange={() => {}}
        />
      </div>

      <div>
        <p className="text-sm text-gray-500 mb-2">Empty options</p>
        <CustomSelect
          id="battery-brand-empty"
          name="brandEmpty"
          label="Brand"
          value=""
          options={[]}
          emptyMessage="No brands available yet"
          onChange={() => {}}
        />
      </div>
    </div>
  )
}
