// Battery rebate calculator tests
// Run: node --test lib/calculator/calculator.test.js

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getPostcodeDetails } from './getPostcodeDetails.js'
import { calculateFederalSTCs } from './calculateFederalSTCs.js'
import { calculateNSWPRCs } from './calculateNSWPRCs.js'
import { calculateWARebate } from './calculateWARebate.js'
import { calculateBatteryRebate } from './calculateBatteryRebate.js'

// ── Postcode ─────────────────────────────────────────────────────────────────

describe('getPostcodeDetails', () => {
  it('rejects non-4-digit input', () => {
    assert.equal(getPostcodeDetails('abc').isValid, false)
    assert.equal(getPostcodeDetails('12').isValid, false)
    assert.equal(getPostcodeDetails('').isValid, false)
  })
  it('resolves NSW postcode 2030', () => {
    const r = getPostcodeDetails('2030')
    assert.equal(r.state, 'NSW')
    assert.equal(r.locality, 'Dover Heights')
    assert.equal(r.nswDistributionNetwork, 'ausgrid')
  })
  it('resolves NSW postcode 2088 (Mosman)', () => {
    const r = getPostcodeDetails('2088')
    assert.equal(r.state, 'NSW')
    assert.equal(r.nswDistributionNetwork, 'ausgrid')
  })
  it('resolves WA postcode 6000', () => {
    const r = getPostcodeDetails('6000')
    assert.equal(r.state, 'WA')
    assert.equal(r.waProvider, 'synergy')
  })
  it('resolves WA regional (Horizon Power)', () => {
    const r = getPostcodeDetails('6300')
    assert.equal(r.state, 'WA')
    assert.equal(r.waProvider, 'horizon-power')
  })
  it('resolves VIC postcode 3000', () => {
    assert.equal(getPostcodeDetails('3000').state, 'VIC')
  })
  it('resolves QLD postcode 4000', () => {
    assert.equal(getPostcodeDetails('4000').state, 'QLD')
  })
  it('marks unknown postcode invalid', () => {
    assert.equal(getPostcodeDetails('0000').isValid, false)
  })
})

// ── Federal ──────────────────────────────────────────────────────────────────

describe('calculateFederalSTCs', () => {
  const base = {
    installationDate: '2026-07-22',
    nominalCapacityKwh: 10,
    usableCapacityKwh: 9.6,
    pricePerSTCCents: 4000,
  }

  it('returns unsupported_date before first rule (1 July 2025)', () => {
    const r = calculateFederalSTCs({ ...base, installationDate: '2025-06-30' })
    assert.equal(r.status, 'unsupported_date')
  })

  it('returns ineligible below 5 kWh nominal', () => {
    const r = calculateFederalSTCs({ ...base, nominalCapacityKwh: 4.5, usableCapacityKwh: 4.0 })
    assert.equal(r.status, 'ineligible')
  })

  it('returns ineligible above 100 kWh nominal', () => {
    const r = calculateFederalSTCs({ ...base, nominalCapacityKwh: 105, usableCapacityKwh: 100 })
    assert.equal(r.status, 'ineligible')
  })

  it('caps eligible capacity at 50 kWh usable', () => {
    const r = calculateFederalSTCs({ ...base, usableCapacityKwh: 60 })
    assert.ok(r.eligibleCapacityKwh <= 50)
  })

  it('uses factor 6.8 for July 2026', () => {
    const r = calculateFederalSTCs(base)
    assert.equal(r.status, 'eligible')
    assert.equal(r.factor, 6.8)
  })

  it('10 kWh usable at factor 6.8 = ~68 raw STCs, floored to 68', () => {
    const r = calculateFederalSTCs({ ...base, nominalCapacityKwh: 10, usableCapacityKwh: 10 })
    assert.equal(r.rawCertificateCount, 68)
    assert.equal(r.certificateCount, 68)
  })

  it('tiered: 20 kWh at factor 6.8 = 14×6.8 + 6×6.8×0.6 = 119.68 raw', () => {
    const r = calculateFederalSTCs({ ...base, usableCapacityKwh: 20 })
    assert.ok(Math.abs(r.rawCertificateCount - 119.68) < 0.01)
    assert.equal(r.certificateCount, 119)
  })

  it('tiered: 40 kWh at factor 6.8 calcs all three tiers', () => {
    const r = calculateFederalSTCs({ ...base, usableCapacityKwh: 40 })
    const expected = 14 * 6.8 + 14 * 6.8 * 0.6 + 12 * 6.8 * 0.15 // = 164.56
    assert.ok(Math.abs(r.rawCertificateCount - expected) < 0.01)
    assert.ok(r.tiers.tierThreeCapacityKwh > 0)
  })

  it('30 April 2026 uses flat factor (no tiering)', () => {
    const r = calculateFederalSTCs({ ...base, installationDate: '2026-04-30' })
    assert.equal(r.factor, 8.4)
    assert.equal(r.tiered, false)
  })

  it('1 May 2026 uses tiered factor', () => {
    const r = calculateFederalSTCs({ ...base, installationDate: '2026-05-01' })
    assert.equal(r.factor, 6.8)
    assert.equal(r.tiered, true)
  })

  it('returns unsupported_date for 2031', () => {
    const r = calculateFederalSTCs({ ...base, installationDate: '2031-01-01' })
    assert.equal(r.status, 'unsupported_date')
  })

  it('STC count does not change with price', () => {
    const r1 = calculateFederalSTCs({ ...base, pricePerSTCCents: 4000 })
    const r2 = calculateFederalSTCs({ ...base, pricePerSTCCents: 3500 })
    assert.equal(r1.certificateCount, r2.certificateCount)
    assert.notEqual(r1.rebateCents, r2.rebateCents)
  })
})

// ── NSW ──────────────────────────────────────────────────────────────────────

describe('calculateNSWPRCs', () => {
  const base = {
    installationDate: '2026-07-22',
    nominalCapacityKwh: 14.4,
    postcode: '2088',
    nswDistributionNetwork: 'ausgrid',
    pricePerPRCCents: 165,
    isVppParticipant: true,
    vppContractMonths: 12,
  }

  it('returns ineligible without VPP participation', () => {
    const r = calculateNSWPRCs({ ...base, isVppParticipant: false })
    assert.equal(r.status, 'ineligible')
  })

  it('returns ineligible at 2 kWh or below', () => {
    const r = calculateNSWPRCs({ ...base, nominalCapacityKwh: 2, usableCapacityKwh: 1.8 })
    assert.equal(r.status, 'ineligible')
  })

  it('returns ineligible above 50 kWh usable', () => {
    const r = calculateNSWPRCs({ ...base, nominalCapacityKwh: 56, usableCapacityKwh: 51, isVppParticipant: true })
    assert.equal(r.status, 'ineligible')
  })

  it('caps earning capacity at 28 kWh', () => {
    const r = calculateNSWPRCs({ ...base, nominalCapacityKwh: 40, isVppParticipant: true })
    assert.ok(r.eligibleCapacityKwh <= 28)
  })

  it('uses ausgrid loss factor 1.04', () => {
    const r = calculateNSWPRCs(base)
    assert.equal(r.networkLossFactor, 1.04)
  })

  it('uses endeavour loss factor 1.05', () => {
    const r = calculateNSWPRCs({ ...base, nswDistributionNetwork: 'endeavour' })
    assert.equal(r.networkLossFactor, 1.05)
  })

  it('uses essential loss factor 1.05', () => {
    const r = calculateNSWPRCs({ ...base, nswDistributionNetwork: 'essential' })
    assert.equal(r.networkLossFactor, 1.05)
  })

  // Official worked example: 14.4 kWh nominal, Ausgrid → 284 PRCs
  it('official NSW example: 14.4 kWh nominal → Ausgrid → ~284 PRCs', () => {
    const r = calculateNSWPRCs(base)
    // Usable = 14.4 × 0.9 = 12.96 kWh
    // eligible = 12.96 (capped at 28, so 12.96)
    // demandResponseKw = 12.96 × 0.0734 = 0.951264
    // peakDemandResponseKw = 0.951264 × 0.8 = 0.7610112
    // peakDemandReduction = 0.7610112 × 6 × 6 = 27.3964032
    // rawPRCs = 27.3964032 × 1.04 × 10 = 284.92259328
    // floored = 284
    assert.equal(r.certificateCount, 284)
  })

  it('PRC price changes dollar estimate only', () => {
    const r1 = calculateNSWPRCs({ ...base, pricePerPRCCents: 165 })
    const r2 = calculateNSWPRCs({ ...base, pricePerPRCCents: 200 })
    assert.equal(r1.certificateCount, r2.certificateCount)
    assert.notEqual(r1.rebateCents, r2.rebateCents)
  })
})

// ── WA ───────────────────────────────────────────────────────────────────────

describe('calculateWARebate', () => {
  const base = {
    installationDate: '2026-07-22',
    usableCapacityKwh: 8,
    waProvider: 'synergy',
    isVppParticipant: true,
  }

  it('requires provider', () => {
    const r = calculateWARebate({ ...base, waProvider: null })
    assert.equal(r.status, 'needs_input')
  })

  it('returns ineligible below 5 kWh', () => {
    const r = calculateWARebate({ ...base, usableCapacityKwh: 4.5 })
    assert.equal(r.status, 'ineligible')
  })

  it('returns ineligible without VPP', () => {
    const r = calculateWARebate({ ...base, isVppParticipant: false })
    assert.equal(r.status, 'ineligible')
  })

  it('Synergy 8 kWh = $1,040 (104000 cents)', () => {
    const r = calculateWARebate(base)
    assert.equal(r.status, 'eligible')
    assert.equal(r.rebateCents, 104000) // 8 × 13000
  })

  it('Horizon Power 8 kWh = $3,040 (304000 cents)', () => {
    const r = calculateWARebate({ ...base, waProvider: 'horizon-power' })
    assert.equal(r.rebateCents, 304000) // 8 × 38000
  })

  it('Synergy capped at $1,300 for >10 kWh', () => {
    const r = calculateWARebate({ ...base, usableCapacityKwh: 13 })
    assert.equal(r.rebateCents, 130000)
  })

  it('Horizon Power capped at $3,800 for >10 kWh', () => {
    const r = calculateWARebate({ ...base, usableCapacityKwh: 15, waProvider: 'horizon-power' })
    assert.equal(r.rebateCents, 380000)
  })

  it('returns ineligible before 1 July 2025', () => {
    const r = calculateWARebate({ ...base, installationDate: '2025-06-01' })
    assert.equal(r.status, 'unsupported_date')
  })
})

// ── Orchestrator ─────────────────────────────────────────────────────────────

describe('calculateBatteryRebate', () => {
  const base = {
    installationDate: '2026-07-22',
    postcode: '2030',
    batteryBrand: 'LG Energy Solution',
    batteryModel: 'ES-LGC-RESU10H-Prime',
    nominalCapacityKwh: 9.87,
    usableCapacityKwh: 8.883,
    pricePerSTCCents: 4000,
    isVppParticipant: true,
    vppContractMonths: 12,
  }

  it('NSW: sums federal + state', () => {
    const r = calculateBatteryRebate(base)
    assert.ok(r.totals.federalRebateCents > 0)
    assert.ok(r.totals.stateRebateCents > 0)
    assert.equal(r.totals.finalRebateCents, r.totals.federalRebateCents + r.totals.stateRebateCents)
  })

  it('WA: sums federal + WA rebate', () => {
    const r = calculateBatteryRebate({ ...base, postcode: '6000', isVppParticipant: true,
      waProvider: 'synergy' })
    assert.equal(r.location.state, 'WA')
    assert.ok(r.totals.stateRebateCents > 0)
  })

  it('VIC: federal only, no state', () => {
    const r = calculateBatteryRebate({ ...base, postcode: '3000' })
    assert.equal(r.location.state, 'VIC')
    assert.equal(r.totals.stateRebateCents, 0)
  })

  it('does not mutate input', () => {
    const input = { ...base }
    const copy = { ...input }
    calculateBatteryRebate(input)
    assert.deepEqual(input, copy)
  })

  it('same inputs produce same output', () => {
    const r1 = calculateBatteryRebate(base)
    const r2 = calculateBatteryRebate(base)
    assert.equal(r1.totals.finalRebateCents, r2.totals.finalRebateCents)
  })

  it('includes warnings from all modules', () => {
    const r = calculateBatteryRebate(base)
    assert.ok(Array.isArray(r.warnings))
    assert.ok(Array.isArray(r.assumptions))
    assert.ok(Array.isArray(r.ineligibilityReasons))
  })

  it('includes rule version metadata', () => {
    const r = calculateBatteryRebate(base)
    assert.ok(r.ruleVersions.federal)
    assert.equal(r.ruleVersions.federal.source.includes('Clean Energy Regulator'), true)
  })
})
