'use client'

import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export default function CustomSelect({
  name,
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder,
  options = [],
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const selected = options.find((opt) => opt.value === value)
  const display = selected?.label || placeholder || 'Select...'

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Hidden input for form submissions */}
      {name && <input type="hidden" name={name} value={value || ''} />}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border border-[#d1d5db] bg-white px-4 py-2.5 text-left text-[14px] focus:outline-none focus:border-[#00a7a7] ${
          disabled
            ? 'cursor-not-allowed bg-[#f8fafc] text-[#98a2b3]'
            : 'cursor-pointer text-[#333]'
        } ${!value ? 'text-[#888]' : ''}`}
      >
        <span className="truncate">{display}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-[#555] transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <ul className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-lg border border-[#e0e0e0] bg-white shadow-lg">
          {options.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                disabled={opt.disabled}
                onClick={() => {
                  onChange?.(opt.value)
                  setOpen(false)
                }}
                className={`w-full px-4 py-2.5 text-left text-[14px] transition-colors ${
                  opt.disabled
                    ? 'cursor-not-allowed text-[#bbb]'
                    : opt.value === value
                      ? 'bg-[#e6f7f7] text-[#00a7a7] font-medium cursor-pointer'
                      : 'text-[#333] hover:bg-[#f5f5f5] cursor-pointer'
                }`}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
