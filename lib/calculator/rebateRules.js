// All versioned rebate rules for the Australian battery rebate calculator.
// Every ruleset includes its source document, version, dates, and constants.
// Update this file when government rules change — no React components to touch.
//
// Sources:
//   Federal STC factors — Clean Energy Regulator, DCCEEW
//     https://www.dcceew.gov.au/energy/renewable/certificates
//   NSW PDRS BESS2 — IPART PDRS Rule & Method Guide
//     https://www.ipart.nsw.gov.au
//   WA Residential Battery Rebate — Synergy & Horizon Power
//     https://www.synergy.net.au / https://www.horizonpower.com.au
//
// Last verified: 2026-07-22 (rules in effect at this date)

// ── Federal Cheaper Home Batteries Program ───────────────────────────────────

export const FEDERAL_STC_RULES = [
  {
    effectiveFrom: '2025-07-01',
    effectiveTo: '2025-12-31',
    factor: 9.3,
    tiered: false, // Taper starts 1 May 2026
    minNominalKwh: 5,
    maxNominalKwh: 100,
    maxEligibleUsableKwh: 50,
    source: 'Clean Energy Regulator — STC factors for solar batteries (Cheaper Home Batteries Program)',
    lastVerifiedAt: '2026-07-22',
  },
  {
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-04-30',
    factor: 8.4,
    tiered: false,
    minNominalKwh: 5,
    maxNominalKwh: 100,
    maxEligibleUsableKwh: 50,
    source: 'Clean Energy Regulator — STC factors for solar batteries',
    lastVerifiedAt: '2026-07-22',
  },
  {
    effectiveFrom: '2026-05-01',
    effectiveTo: '2026-12-31',
    factor: 6.8,
    tiered: true, // Capacity taper applies from 1 May 2026
    minNominalKwh: 5,
    maxNominalKwh: 100,
    maxEligibleUsableKwh: 50,
    tierThresholdsKwh: [0, 14, 28, 50], // [start, tier1End, tier2End, max]
    tierMultipliers: [1.0, 0.6, 0.15, 0.0],
    source: 'Clean Energy Regulator — STC factors + capacity taper',
    lastVerifiedAt: '2026-07-22',
  },
  {
    effectiveFrom: '2027-01-01',
    effectiveTo: '2027-06-30',
    factor: 5.7,
    tiered: true,
    minNominalKwh: 5,
    maxNominalKwh: 100,
    maxEligibleUsableKwh: 50,
    tierThresholdsKwh: [0, 14, 28, 50],
    tierMultipliers: [1.0, 0.6, 0.15, 0.0],
    source: 'Clean Energy Regulator — STC factors for solar batteries',
    lastVerifiedAt: '2026-07-22',
  },
  {
    effectiveFrom: '2027-07-01',
    effectiveTo: '2027-12-31',
    factor: 5.2,
    tiered: true,
    minNominalKwh: 5,
    maxNominalKwh: 100,
    maxEligibleUsableKwh: 50,
    tierThresholdsKwh: [0, 14, 28, 50],
    tierMultipliers: [1.0, 0.6, 0.15, 0.0],
    source: 'Clean Energy Regulator — STC factors for solar batteries',
    lastVerifiedAt: '2026-07-22',
  },
  {
    effectiveFrom: '2028-01-01',
    effectiveTo: '2028-06-30',
    factor: 4.6,
    tiered: true,
    minNominalKwh: 5,
    maxNominalKwh: 100,
    maxEligibleUsableKwh: 50,
    tierThresholdsKwh: [0, 14, 28, 50],
    tierMultipliers: [1.0, 0.6, 0.15, 0.0],
    source: 'Clean Energy Regulator — STC factors for solar batteries',
    lastVerifiedAt: '2026-07-22',
  },
  {
    effectiveFrom: '2028-07-01',
    effectiveTo: '2028-12-31',
    factor: 4.1,
    tiered: true,
    minNominalKwh: 5,
    maxNominalKwh: 100,
    maxEligibleUsableKwh: 50,
    tierThresholdsKwh: [0, 14, 28, 50],
    tierMultipliers: [1.0, 0.6, 0.15, 0.0],
    source: 'Clean Energy Regulator — STC factors for solar batteries',
    lastVerifiedAt: '2026-07-22',
  },
  {
    effectiveFrom: '2029-01-01',
    effectiveTo: '2029-06-30',
    factor: 3.6,
    tiered: true,
    minNominalKwh: 5,
    maxNominalKwh: 100,
    maxEligibleUsableKwh: 50,
    tierThresholdsKwh: [0, 14, 28, 50],
    tierMultipliers: [1.0, 0.6, 0.15, 0.0],
    source: 'Clean Energy Regulator — STC factors for solar batteries',
    lastVerifiedAt: '2026-07-22',
  },
  {
    effectiveFrom: '2029-07-01',
    effectiveTo: '2029-12-31',
    factor: 3.1,
    tiered: true,
    minNominalKwh: 5,
    maxNominalKwh: 100,
    maxEligibleUsableKwh: 50,
    tierThresholdsKwh: [0, 14, 28, 50],
    tierMultipliers: [1.0, 0.6, 0.15, 0.0],
    source: 'Clean Energy Regulator — STC factors for solar batteries',
    lastVerifiedAt: '2026-07-22',
  },
  {
    effectiveFrom: '2030-01-01',
    effectiveTo: '2030-06-30',
    factor: 2.6,
    tiered: true,
    minNominalKwh: 5,
    maxNominalKwh: 100,
    maxEligibleUsableKwh: 50,
    tierThresholdsKwh: [0, 14, 28, 50],
    tierMultipliers: [1.0, 0.6, 0.15, 0.0],
    source: 'Clean Energy Regulator — STC factors for solar batteries',
    lastVerifiedAt: '2026-07-22',
  },
  {
    effectiveFrom: '2030-07-01',
    effectiveTo: '2030-12-31',
    factor: 2.1,
    tiered: true,
    minNominalKwh: 5,
    maxNominalKwh: 100,
    maxEligibleUsableKwh: 50,
    tierThresholdsKwh: [0, 14, 28, 50],
    tierMultipliers: [1.0, 0.6, 0.15, 0.0],
    source: 'Clean Energy Regulator — STC factors for solar batteries',
    lastVerifiedAt: '2026-07-22',
  },
]

// ── NSW PDRS BESS2 VPP Incentive ─────────────────────────────────────────────

export const NSW_BESS2_RULES = [
  {
    effectiveFrom: '2026-07-01',
    effectiveTo: '2030-12-31',
    // The peak demand reduction component per usable kWh (in kW)
    demandResponseFactorKwPerKwh: 0.0734,
    // Peak demand coincidence factor
    peakDemandFactor: 0.8,
    // Summer peak demand reduction duration (hours)
    peakDemandHours: 6,
    // BESS2 certificate lifetime (years)
    schemeLifetimeYears: 6,
    // Min usable capacity to be eligible (kWh)
    minUsableCapacityKwh: 2,
    // Max total usable capacity (kWh) — entire system, not just earning capacity
    maxUsableCapacityKwh: 50,
    // Max capacity that can earn certificates (kWh)
    maxEligibleUsableKwh: 28,
    // Usable capacity as % of nominal (when verified usable is unavailable)
    usableCapacityRatio: 0.9,
    // Network loss factors by distributor
    networkLossFactors: {
      ausgrid: 1.04,
      endeavour: 1.05,
      essential: 1.05,
    },
    // Requires VPP/demand-response participation
    requiresVpp: true,
    // Minimum VPP contract duration (months)
    minVppContractMonths: 12,
    source: 'IPART PDRS Rule — BESS2 method (post 1 July 2026)',
    lastVerifiedAt: '2026-07-22',
  },
]

// ── WA Residential Battery Rebate ────────────────────────────────────────────

export const WA_REBATE_RULES = [
  {
    effectiveFrom: '2025-07-01',
    effectiveTo: '2030-12-31',
    minUsableCapacityKwh: 5,
    maxEligibleUsableKwh: 10,
    synergyRateCentsPerKwh: 13000, // $130.00 per eligible kWh in cents
    synergyMaxCents: 130000, // $1,300.00 cap in cents
    horizonRateCentsPerKwh: 38000, // $380.00 per eligible kWh in cents
    horizonMaxCents: 380000, // $3,800.00 cap in cents
    requiresVpp: true,
    requiresCECApproval: true,
    requiresReliableInternet: true,
    residentialOnly: true,
    source: 'WA Residential Battery Scheme — Synergy & Horizon Power (2025)',
    lastVerifiedAt: '2026-07-22',
  },
]

// ── Helper: select applicable rule by date ───────────────────────────────────

/**
 * Returns the ruleset that covers the given date, or null.
 * `dateStr` is YYYY-MM-DD. Rules must cover the date (inclusive on both ends).
 */
export function selectRule(rules, dateStr) {
  for (const rule of rules) {
    if (dateStr >= rule.effectiveFrom && dateStr <= rule.effectiveTo) {
      return rule
    }
  }
  return null
}

// ── Certificate rounding: floor (REC Registry standard) ─────────────────────

/**
 * Federal STCs and NSW PRCs are issued as whole certificates.
 * The REC Registry rounds down (floor) fractional certificates.
 * Source: Clean Energy Regulator — certificate issuance rules
 */
export function roundCertificates(rawCount) {
  return Math.floor(rawCount)
}
