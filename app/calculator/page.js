'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import {
  BatteryFull,
  Calculator,
  Check,
  ChevronDown,
  Copy,
  Info,
  Loader2,
} from 'lucide-react'

const DEFAULT_STC_PRICE = '40'
const DEFAULT_PRC_PRICE = '1.65'
const DEFAULT_POSTCODE = '2030'

function getLocalDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function toFiniteNumber(value, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : fallback
}

function formatMoney(cents) {
  const safeCents = toFiniteNumber(cents)

  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeCents / 100)
}

function formatCapacity(value) {
  const capacity = toFiniteNumber(value, Number.NaN)

  if (!Number.isFinite(capacity)) {
    return '—'
  }

  return `${capacity.toLocaleString('en-AU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} kWh`
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

export default function CalculatorPage() {
  const [brands, setBrands] = useState([])
  const [selectedBrand, setSelectedBrand] = useState('')
  const [models, setModels] = useState([])
  const [selectedModel, setSelectedModel] = useState('')

  const [postcode, setPostcode] = useState(DEFAULT_POSTCODE)
  const [installDate, setInstallDate] = useState(getLocalDateString())
  const [pricePerSTC, setPricePerSTC] = useState(DEFAULT_STC_PRICE)
  const [pricePerPRC] = useState(DEFAULT_PRC_PRICE)

  const [loadingBrands, setLoadingBrands] = useState(true)
  const [loadingResult, setLoadingResult] = useState(false)

  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const activeRequestRef = useRef(null)

  const selectedModelData = useMemo(() => {
    return models.find((model) => model.label === selectedModel) || null
  }, [models, selectedModel])

  const cecModel =
    selectedModelData?.cecModel ||
    selectedModelData?.cecModelName ||
    selectedModelData?.approvedModel ||
    selectedModelData?.label ||
    selectedModel

  useEffect(() => {
    let cancelled = false

    async function loadBrands() {
      setLoadingBrands(true)
      setError('')

      try {
        const response = await fetch('/api/calculator/rebate', {
          method: 'GET',
          cache: 'no-store',
        })

        const data = await readJsonSafely(response)

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load battery models')
        }

        const list = Array.isArray(data.brands) ? data.brands : []

        if (cancelled) {
          return
        }

        setBrands(list)

        if (list.length === 0) {
          setError('No calculator battery models are currently available.')
          return
        }

        const preferredBrand =
          list.find((item) => item.brand === 'LG Energy Solution') || list[0]

        const preferredModels = Array.isArray(preferredBrand.models)
          ? preferredBrand.models
          : []

        const preferredModel =
          preferredModels.find(
            (item) => item.label === 'ES-LGC-RESU10H-Prime',
          ) || preferredModels[0]

        setSelectedBrand(preferredBrand.brand)
        setModels(preferredModels)
        setSelectedModel(preferredModel?.label || '')
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || 'Unable to load battery models')
        }
      } finally {
        if (!cancelled) {
          setLoadingBrands(false)
        }
      }
    }

    loadBrands()

    return () => {
      cancelled = true
      activeRequestRef.current?.abort()
    }
  }, [])

  const handleBrandChange = useCallback(
    (brandName) => {
      const brand = brands.find((item) => item.brand === brandName)

      const nextModels = Array.isArray(brand?.models) ? brand.models : []

      setSelectedBrand(brandName)
      setModels(nextModels)
      setSelectedModel(nextModels[0]?.label || '')
      setResult(null)
      setError('')
    },
    [brands],
  )

  const calculate = useCallback(async () => {
    if (
      !selectedBrand ||
      !selectedModel ||
      !/^\d{4}$/.test(postcode) ||
      !installDate
    ) {
      return
    }

    const stcPrice = toFiniteNumber(pricePerSTC, Number.NaN)
    const prcPrice = toFiniteNumber(pricePerPRC, Number.NaN)

    if (!Number.isFinite(stcPrice) || stcPrice < 0) {
      setError('Enter a valid STC price.')
      return
    }

    if (!Number.isFinite(prcPrice) || prcPrice < 0) {
      setError('Enter a valid PRC price.')
      return
    }

    activeRequestRef.current?.abort()

    const controller = new AbortController()
    activeRequestRef.current = controller

    setError('')
    setLoadingResult(true)

    try {
      const response = await fetch('/api/calculator/rebate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          brand: selectedBrand,
          model: selectedModel,
          postcode,
          installationDate: installDate,

          // Send numbers instead of strings so the API cannot
          // accidentally produce NaN while converting to cents.
          pricePerSTC: stcPrice,
          pricePerPRC: prcPrice,

          // The OSW-style estimate displays the available state incentive
          // using the required VPP/demand-response participation.
          isVppParticipant: true,
          vppContractMonths: 12,
        }),
      })

      const data = await readJsonSafely(response)

      if (!response.ok) {
        throw new Error(data.error || `Calculation failed (${response.status})`)
      }

      if (!data.result) {
        throw new Error('The calculator returned an empty result.')
      }

      setResult(data.result)
    } catch (calculationError) {
      if (calculationError.name !== 'AbortError') {
        setResult(null)
        setError(calculationError.message || 'Unable to calculate the rebate.')
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoadingResult(false)
      }
    }
  }, [
    selectedBrand,
    selectedModel,
    postcode,
    installDate,
    pricePerSTC,
    pricePerPRC,
  ])

  useEffect(() => {
    if (!selectedBrand || !selectedModel) {
      return undefined
    }

    const timeout = window.setTimeout(() => {
      calculate()
    }, 350)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [calculate, selectedBrand, selectedModel])

  const copyCecModel = async () => {
    if (!cecModel) {
      return
    }

    try {
      await navigator.clipboard.writeText(cecModel)

      setCopied(true)

      window.setTimeout(() => {
        setCopied(false)
      }, 1600)
    } catch {
      setCopied(false)
    }
  }

  const display = useMemo(() => {
    const federalStcs = toFiniteNumber(result?.federal?.certificateCount, 0)

    const federalRebateCents = toFiniteNumber(
      result?.totals?.federalRebateCents,
      federalStcs * Math.round(toFiniteNumber(pricePerSTC) * 100),
    )

    const stateScheme = result?.state?.scheme || null
    const stateResult = result?.state?.result || null

    const stateRebateCents = toFiniteNumber(result?.totals?.stateRebateCents, 0)

    const finalRebateCents = toFiniteNumber(
      result?.totals?.finalRebateCents,
      federalRebateCents + stateRebateCents,
    )

    return {
      nominalCapacity: result?.battery?.nominalCapacityKwh,

      federalStcs,
      federalRebateCents,
      finalRebateCents,

      waEligibleCapacity:
        stateScheme === 'wa-battery-rebate'
          ? stateResult?.eligibleCapacityKwh
          : null,

      waRebateCents: stateScheme === 'wa-battery-rebate' ? stateRebateCents : 0,

      nswPrcs:
        stateScheme === 'nsw-prc'
          ? toFiniteNumber(stateResult?.certificateCount, 0)
          : 0,

      nswRebateCents: stateScheme === 'nsw-prc' ? stateRebateCents : 0,

      warnings: [
        ...(Array.isArray(result?.warnings) ? result.warnings : []),

        ...(Array.isArray(result?.ineligibilityReasons)
          ? result.ineligibilityReasons
          : []),
      ],
    }
  }, [result, pricePerSTC])

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main>
        {/* Information bar */}
        <div className="border-b border-[#e3e7ec] bg-white">
          <div className="mx-auto max-w-[1440px] px-4 py-3 sm:px-6 lg:px-8">
            <p className="text-[13px] leading-5 text-[#333] sm:text-[14px]">
              <span className="font-medium">Note:</span> Rebate values shown are
              indicative only. Actual amounts may vary depending on the
              installer, battery eligibility, system design, certificate market
              price and location.{' '}
              <span className="font-semibold">
                Contact our team for a confirmed quote.
              </span>
            </p>
          </div>
        </div>

        {/* Main calculator */}
        <section className="px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <div className="mx-auto max-w-[1320px] overflow-hidden rounded-[18px] border border-[#d9e0e7] bg-white shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
            <div className="grid grid-cols-1 lg:grid-cols-[0.92fr_1.08fr]">
              {/* Left: Battery form */}
              <div className="bg-white px-6 py-8 sm:px-10 sm:py-10 lg:min-h-[720px] lg:px-12 lg:py-12">
                <div className="mx-auto max-w-[520px]">
                  <h1 className="mb-8 flex items-center gap-2.5 text-[22px] font-bold text-[#20242a]">
                    <BatteryFull
                      size={22}
                      strokeWidth={2}
                      className="text-[#00a7a7]"
                    />
                    Battery Details
                  </h1>

                  {loadingBrands ? (
                    <div className="flex items-center gap-3 py-8 text-sm text-[#667085]">
                      <Loader2 size={19} className="animate-spin" />
                      Loading battery models...
                    </div>
                  ) : (
                    <>
                      {/* Brand */}
                      <Field label="Brand">
                        <CustomSelect
                          value={selectedBrand}
                          options={brands.map((b) => ({
                            value: b.brand,
                            label: b.brand,
                          }))}
                          onChange={(value) => handleBrandChange(value)}
                          placeholder="Select brand"
                        />
                      </Field>

                      {/* Model */}
                      <Field label="Model">
                        <CustomSelect
                          value={selectedModel}
                          options={models.map((m) => ({
                            value: m.label,
                            label: m.label,
                          }))}
                          onChange={(value) => {
                            setSelectedModel(value)
                            setResult(null)
                            setError('')
                          }}
                          placeholder="Select model"
                        />

                        {cecModel && (
                          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[13px]">
                            <span className="text-[#98a2b3]">CEC Model:</span>

                            <span className="font-medium text-[#17a34a]">
                              {cecModel}
                            </span>

                            <button
                              type="button"
                              onClick={copyCecModel}
                              className="inline-flex items-center gap-1 font-medium text-[#0877da] transition hover:text-[#075ea9]"
                            >
                              {copied ? (
                                <>
                                  <Check size={13} />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy size={13} />
                                  Copy
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </Field>

                      {/* Postcode */}
                      <Field label="Postcode">
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="postal-code"
                          value={postcode}
                          onChange={(event) =>
                            setPostcode(
                              event.target.value.replace(/\D/g, '').slice(0, 4),
                            )
                          }
                          maxLength={4}
                          className="h-[54px] w-full rounded-[6px] border border-[#cbd5e1] px-4 text-[16px] text-[#26364d] outline-none transition focus:border-[#1783df] focus:ring-2 focus:ring-[#1783df]/15"
                        />
                      </Field>

                      {/* Installation date */}
                      <Field
                        label={
                          <span className="inline-flex items-center gap-1.5">
                            Installation Date
                            <span
                              title="The installation date selects the applicable rebate rules."
                              className="inline-flex text-[#596579]"
                            >
                              <Info size={15} />
                            </span>
                          </span>
                        }
                      >
                        <input
                          type="date"
                          value={installDate}
                          onChange={(event) =>
                            setInstallDate(event.target.value)
                          }
                          className="h-[54px] w-full rounded-[6px] border border-[#cbd5e1] px-4 text-[16px] text-[#26364d] outline-none transition focus:border-[#1783df] focus:ring-2 focus:ring-[#1783df]/15"
                        />
                      </Field>

                      {/* STC price */}
                      <Field label="Price per Battery STC">
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          max="100"
                          step="0.01"
                          value={pricePerSTC}
                          onChange={(event) =>
                            setPricePerSTC(event.target.value)
                          }
                          className="h-[54px] w-full rounded-[6px] border border-[#cbd5e1] px-4 text-[16px] text-[#26364d] outline-none transition focus:border-[#1783df] focus:ring-2 focus:ring-[#1783df]/15"
                        />
                      </Field>
                    </>
                  )}

                  {error && (
                    <div className="mt-6 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] leading-5 text-red-700">
                      {error}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Results */}
              <div className="relative overflow-hidden bg-[#07151d] px-6 py-8 text-white sm:px-10 sm:py-10 lg:min-h-[720px] lg:px-12 lg:py-12">
                <Calculator
                  size={300}
                  strokeWidth={1.5}
                  className="pointer-events-none absolute -bottom-16 -right-14 rotate-12 text-white/[0.08]"
                />

                <div className="relative z-10 mx-auto max-w-[640px]">
                  <h2 className="mb-12 flex items-center gap-2.5 text-[22px] font-bold">
                    <Calculator size={21} className="text-white" />
                    Battery Rebate Calculator
                  </h2>

                  {loadingResult && !result ? (
                    <div className="flex min-h-[320px] items-center gap-3 text-white/70">
                      <Loader2 size={21} className="animate-spin" />
                      Calculating rebate...
                    </div>
                  ) : (
                    <>
                      <p className="text-[24px] font-bold text-white">
                        Final Rebates
                      </p>

                      <p className="mt-3 text-[54px] font-extrabold leading-none tracking-[-0.04em] text-[#28ed62] sm:text-[64px]">
                        {result
                          ? formatMoney(display.finalRebateCents)
                          : '$0.00'}
                      </p>

                      <div className="mt-9">
                        <p className="text-[16px] font-semibold text-white/55">
                          Nominal Capacity
                        </p>

                        <p className="mt-1 text-[18px] font-medium text-white">
                          {formatCapacity(display.nominalCapacity)}
                        </p>
                      </div>

                      <ResultDivider />

                      {/* National STCs */}
                      <ResultGroup
                        leftLabel="STCs"
                        leftNote="(National)"
                        leftValue={
                          result && display.federalStcs > 0
                            ? String(display.federalStcs)
                            : '—'
                        }
                        rightValue={
                          result ? formatMoney(display.federalRebateCents) : '—'
                        }
                      />

                      <ResultDivider />

                      {/* WA rebate */}
                      <ResultGroup
                        leftLabel="Eligible Capacity"
                        leftNote="(WA; VPP participation required)"
                        leftValue={
                          display.waEligibleCapacity
                            ? formatCapacity(display.waEligibleCapacity)
                            : '—'
                        }
                        rightValue={
                          display.waEligibleCapacity
                            ? formatMoney(display.waRebateCents)
                            : '—'
                        }
                      />

                      <ResultDivider />

                      {/* NSW PRCs */}
                      <ResultGroup
                        leftLabel="PRCs"
                        leftNote="(NSW; VPP participation required)"
                        leftValue={
                          display.nswPrcs > 0 ? String(display.nswPrcs) : '—'
                        }
                        rightValue={
                          display.nswPrcs > 0
                            ? formatMoney(display.nswRebateCents)
                            : '—'
                        }
                      />

                      {loadingResult && result && (
                        <div className="mt-5 flex items-center gap-2 text-[12px] text-white/55">
                          <Loader2 size={14} className="animate-spin" />
                          Updating estimate...
                        </div>
                      )}

                      {display.warnings.length > 0 && (
                        <div className="mt-7 rounded-[8px] border border-white/15 bg-white/[0.07] px-4 py-3">
                          <p className="text-[12px] leading-5 text-white/70">
                            {display.warnings[0]}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

function CustomSelect({ value, options, onChange, placeholder }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const selected = options.find((o) => o.value === value)

  console.log('selected', { selected, options })

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-[54px] w-full items-center justify-between rounded-[6px] border border-[#cbd5e1] bg-white px-4 text-[16px] text-[#26364d] outline-none transition focus:border-[#1783df] focus:ring-2 focus:ring-[#1783df]/15 cursor-pointer"
      >
        <span className={selected ? 'text-[#26364d]' : 'text-[#98a2b3]'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={20}
          className={`text-[#8190a5] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[260px] overflow-y-auto rounded-[6px] border border-[#cbd5e1] bg-white shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className={`flex w-full items-center px-4 py-2.5 text-left text-[15px] transition cursor-pointer ${
                opt.value === value
                  ? 'bg-[#eff6ff] text-[#1783df] font-medium'
                  : 'text-[#26364d] hover:bg-[#f6f8fa]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="mb-6">
      <label className="mb-2 block text-[15px] font-semibold text-[#20242a]">
        {label}
      </label>

      {children}
    </div>
  )
}

function ResultDivider() {
  return <div className="my-7 h-px bg-white/35" />
}

function ResultGroup({ leftLabel, leftNote, leftValue, rightValue }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-8">
      <div>
        <p className="text-[16px] font-semibold text-white/55">
          {leftLabel}{' '}
          {leftNote && (
            <span className="text-[13px] font-medium">{leftNote}</span>
          )}
        </p>

        <p className="mt-1 text-[18px] font-medium text-white">{leftValue}</p>
      </div>

      <div className="text-right">
        <p className="text-[16px] font-semibold text-white/55">Rebate</p>

        <p className="mt-1 whitespace-nowrap text-[18px] font-medium text-white">
          {rightValue}
        </p>
      </div>
    </div>
  )
}
