'use client'

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'

const PANEL_GAP = 6
const PANEL_MAX_HEIGHT = 320

const noopSubscribe = () => () => {}

// SSR-safe "has this hydrated on the client yet" check, without a
// setState-in-effect render cascade — the portal must not render on the
// server (document.body doesn't exist there) or during the first client
// render (must match the server HTML), only once hydration is complete.
function useHasMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  )
}

function firstEnabledIndex(options) {
  return options.findIndex((o) => !o.disabled)
}

function lastEnabledIndex(options) {
  for (let i = options.length - 1; i >= 0; i--) {
    if (!options[i].disabled) return i
  }
  return -1
}

function nextEnabledIndex(options, from) {
  for (let i = from + 1; i < options.length; i++) {
    if (!options[i].disabled) return i
  }
  return from
}

function prevEnabledIndex(options, from) {
  for (let i = from - 1; i >= 0; i--) {
    if (!options[i].disabled) return i
  }
  return from
}

function computePosition(triggerEl) {
  const rect = triggerEl.getBoundingClientRect()
  const viewportHeight = window.innerHeight
  const viewportWidth = window.innerWidth
  const spaceBelow = viewportHeight - rect.bottom
  const spaceAbove = rect.top
  const openUp = spaceBelow < PANEL_MAX_HEIGHT + PANEL_GAP && spaceAbove > spaceBelow

  let left = rect.left
  if (left + rect.width > viewportWidth) {
    left = Math.max(8, viewportWidth - rect.width - 8)
  }
  left = Math.max(8, left)

  return {
    left,
    width: rect.width,
    openUp,
    top: rect.bottom + PANEL_GAP,
    bottom: viewportHeight - rect.top + PANEL_GAP,
  }
}

export default function CustomSelect({
  id,
  name,
  label,
  value,
  options = [],
  placeholder,
  onChange,
  disabled = false,
  required = false,
  error,
  helperText,
  className = '',
  dropdownClassName = '',
  emptyMessage,
  ariaLabel,
}) {
  const autoId = useId()
  const baseId = id || `custom-select-${autoId}`
  const listboxId = `${baseId}-listbox`
  const errorId = `${baseId}-error`
  const helperId = `${baseId}-helper`
  const optionDomId = useCallback(
    (index) => `${listboxId}-option-${index}`,
    [listboxId],
  )

  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [coords, setCoords] = useState(null)
  const mounted = useHasMounted()

  const triggerRef = useRef(null)
  const panelRef = useRef(null)

  const selectedIndex = useMemo(
    () => options.findIndex((o) => o.value === value),
    [options, value],
  )
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null

  const openDropdown = useCallback(() => {
    if (disabled) return
    const idx = selectedIndex >= 0 ? selectedIndex : firstEnabledIndex(options)
    setHighlightedIndex(idx)
    setOpen(true)
  }, [disabled, options, selectedIndex])

  const closeDropdown = useCallback(() => {
    setOpen(false)
  }, [])

  const selectOption = useCallback(
    (option) => {
      if (!option || option.disabled) return
      onChange?.(option.value, option)
      closeDropdown()
      triggerRef.current?.focus()
    },
    [onChange, closeDropdown],
  )

  // Recalculate panel position on open, and keep it in sync with scroll/resize.
  useEffect(() => {
    if (!open) return undefined

    function updatePosition() {
      if (triggerRef.current) setCoords(computePosition(triggerRef.current))
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  // Close on outside click.
  useEffect(() => {
    if (!open) return undefined

    function handlePointerDown(e) {
      if (
        triggerRef.current?.contains(e.target) ||
        panelRef.current?.contains(e.target)
      ) {
        return
      }
      closeDropdown()
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open, closeDropdown])

  // Keep the keyboard-highlighted option in view.
  useEffect(() => {
    if (!open || highlightedIndex < 0) return
    const el = panelRef.current?.querySelector(`#${optionDomId(highlightedIndex)}`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [open, highlightedIndex, optionDomId])

  const handleTriggerClick = useCallback(() => {
    if (disabled) return
    if (open) closeDropdown()
    else openDropdown()
  }, [disabled, open, openDropdown, closeDropdown])

  const handleKeyDown = useCallback(
    (e) => {
      if (disabled) return

      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (!open) {
            openDropdown()
          } else if (highlightedIndex >= 0) {
            selectOption(options[highlightedIndex])
          }
          break

        case 'ArrowDown':
          e.preventDefault()
          if (!open) {
            openDropdown()
          } else {
            setHighlightedIndex((prev) => nextEnabledIndex(options, prev))
          }
          break

        case 'ArrowUp':
          e.preventDefault()
          if (!open) {
            openDropdown()
          } else {
            setHighlightedIndex((prev) => prevEnabledIndex(options, prev))
          }
          break

        case 'Home':
          if (options.length === 0) break
          e.preventDefault()
          if (!open) setOpen(true)
          setHighlightedIndex(firstEnabledIndex(options))
          break

        case 'End':
          if (options.length === 0) break
          e.preventDefault()
          if (!open) setOpen(true)
          setHighlightedIndex(lastEnabledIndex(options))
          break

        case 'Escape':
          if (open) {
            e.preventDefault()
            closeDropdown()
          }
          break

        case 'Tab':
          if (open) closeDropdown()
          break

        default:
          break
      }
    },
    [disabled, open, highlightedIndex, options, openDropdown, closeDropdown, selectOption],
  )

  const describedBy = error ? errorId : helperText ? helperId : undefined

  const triggerClasses = [
    'relative w-full h-[54px] flex items-center justify-between gap-2',
    'bg-white border rounded-lg px-4 text-left text-[16px]',
    'transition-colors duration-150 focus:outline-none focus:ring-2',
    'appearance-none',
    disabled
      ? 'bg-gray-50 border-gray-200 cursor-not-allowed'
      : error
        ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15 cursor-pointer'
        : open
          ? 'border-[#1783df] ring-2 ring-[#1783df]/15 cursor-pointer'
          : 'border-[#cbd5e1] hover:border-[#9fb3c8] focus:border-[#1783df] focus:ring-[#1783df]/15 cursor-pointer',
  ].join(' ')

  const panelStyle = coords
    ? {
        position: 'fixed',
        left: coords.left,
        width: coords.width,
        maxHeight: PANEL_MAX_HEIGHT,
        zIndex: 9999,
        ...(coords.openUp ? { bottom: coords.bottom } : { top: coords.top }),
      }
    : { position: 'fixed', top: -9999, left: -9999, zIndex: 9999 }

  function optionClasses(option, index) {
    const isSelected = option.value === value
    const isHighlighted = index === highlightedIndex
    return [
      'px-4 py-3.5 rounded-lg text-[16px] text-[#26364d] transition-colors',
      option.disabled
        ? 'opacity-40 cursor-not-allowed'
        : 'cursor-pointer',
      !option.disabled && isHighlighted ? 'bg-[#f1f5f9]' : '',
      !option.disabled && !isHighlighted && isSelected ? 'bg-[#eef2f7]' : '',
      isSelected ? 'font-medium' : '',
    ]
      .filter(Boolean)
      .join(' ')
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Scoped scrollbar styling for the options panel — real <style> tag
          (not styled-jsx) so it applies correctly even once the panel is
          portaled out to document.body. */}
      <style>{`
        .custom-select-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }
        .custom-select-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-select-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-select-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 9999px;
        }
        .custom-select-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #94a3b8;
        }
      `}</style>

      {label && (
        <label
          htmlFor={baseId}
          className="block text-[14px] font-semibold text-[#20242a] mb-1.5"
        >
          {label}
          {required && (
            <span className="text-red-500 ml-0.5" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <button
        ref={triggerRef}
        type="button"
        id={baseId}
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={!label ? ariaLabel : undefined}
        aria-activedescendant={
          open && highlightedIndex >= 0 ? optionDomId(highlightedIndex) : undefined
        }
        aria-invalid={!!error}
        aria-required={required || undefined}
        aria-describedby={describedBy}
        onClick={handleTriggerClick}
        onKeyDown={handleKeyDown}
        className={triggerClasses}
      >
        <span
          className={`truncate ${selectedOption ? 'text-[#26364d]' : 'text-[#98a2b3]'} ${
            disabled ? 'opacity-60' : ''
          }`}
        >
          {selectedOption ? selectedOption.label : placeholder || 'Select an option'}
        </span>
        <ChevronDown
          size={20}
          className={`shrink-0 text-[#8190a5] transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {name && <input type="hidden" name={name} value={value || ''} />}

      {error ? (
        <p id={errorId} className="mt-1.5 text-[13px] text-red-600">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="mt-1.5 text-[13px] text-gray-500">
          {helperText}
        </p>
      ) : null}

      {mounted &&
        open &&
        createPortal(
          <div
            ref={panelRef}
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel || label || 'Options'}
            tabIndex={-1}
            style={panelStyle}
            className={`custom-select-scrollbar flex flex-col gap-1 overflow-y-auto bg-white border border-[#d9e1ea] rounded-[10px] shadow-lg p-2 ${dropdownClassName}`}
          >
            {options.length === 0 ? (
              <div className="px-4 py-3.5 text-[16px] text-gray-400">
                {emptyMessage || 'No options available'}
              </div>
            ) : (
              options.map((option, index) => (
                <div
                  key={option.value}
                  id={optionDomId(index)}
                  role="option"
                  aria-selected={option.value === value}
                  aria-disabled={option.disabled || undefined}
                  onClick={() => selectOption(option)}
                  onMouseEnter={() => {
                    if (!option.disabled) setHighlightedIndex(index)
                  }}
                  className={optionClasses(option, index)}
                >
                  {option.label}
                </div>
              ))
            )}
          </div>,
          document.body,
        )}
    </div>
  )
}
