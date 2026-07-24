// Federal Cheaper Home Batteries Program — STC calculation.
// Pure function: no React, no Prisma, no side effects.

import { FEDERAL_STC_RULES, selectRule, roundCertificates } from './rebateRules.js'

/**
 * Calculate federal STC rebate for a battery installation.
 *
 * @param {Object} input
 * @param {string}  input.installationDate      YYYY-MM-DD
 * @param {number}  input.nominalCapacityKwh     Battery nominal capacity (kWh)
 * @param {number}  input.usableCapacityKwh      Verified usable capacity (kWh)
 * @param {number}  input.pricePerSTCCents       STC market price in cents
 * @param {boolean} [input.isCECApproved=true]    CEC approved product
 * @param {boolean} [input.hasEligibleSolarPV=true] Eligible solar PV installed
 * @param {boolean} [input.isOnGrid=true]         On-grid installation
 * @returns {Object} Structured result
 */
export function calculateFederalSTCs({
  installationDate,
  nominalCapacityKwh,
  usableCapacityKwh,
  pricePerSTCCents,
  isCECApproved = true,
  hasEligibleSolarPV = true,
  isOnGrid = true,
  isVppCapable = true,
  hasPreviouslyReceivedFederalSupport = false,
}) {
  const reasons = []
  const warnings = []

  // Find applicable rule
  const rule = selectRule(FEDERAL_STC_RULES, installationDate)
  if (!rule) {
    return {
      scheme: 'federal-stc',
      status: 'unsupported_date',
      ineligibilityReasons: [`No federal STC rule configured for date ${installationDate}`],
      assumptions: [],
      warnings: [],
    }
  }

  // Eligibility checks
  if (!isCECApproved) {
    reasons.push('Battery system is not CEC-approved')
  }
  if (!hasEligibleSolarPV) {
    reasons.push('No eligible solar PV system installed')
  }
  if (hasPreviouslyReceivedFederalSupport) {
    reasons.push('System has already received federal battery support')
  }
  if (installationDate < '2025-07-01') {
    reasons.push('Installation date is before the program start (1 July 2025)')
  }
  if (nominalCapacityKwh < rule.minNominalKwh) {
    reasons.push(`Nominal capacity ${nominalCapacityKwh} kWh is below the minimum ${rule.minNominalKwh} kWh`)
  }
  if (nominalCapacityKwh > rule.maxNominalKwh) {
    reasons.push(`Nominal capacity ${nominalCapacityKwh} kWh exceeds the maximum ${rule.maxNominalKwh} kWh`)
  }

  if (reasons.length > 0) {
    return {
      scheme: 'federal-stc',
      status: 'ineligible',
      ineligibilityReasons: reasons,
      assumptions: [],
      warnings,
    }
  }

  // Eligible capacity: usable capacity capped at max
  const eligibleUsableKwh = Math.min(usableCapacityKwh, rule.maxEligibleUsableKwh)
  let rawSTCs = 0
  let tiers = {}

  if (!rule.tiered) {
    // Pre-May-2026: flat factor × eligible capacity
    rawSTCs = eligibleUsableKwh * rule.factor
    tiers = {
      tierOneCapacityKwh: eligibleUsableKwh,
      tierTwoCapacityKwh: 0,
      tierThreeCapacityKwh: 0,
      tierOneCertificates: rawSTCs,
      tierTwoCertificates: 0,
      tierThreeCertificates: 0,
    }
  } else {
    // Post-May-2026: three-tier capacity taper
    const t1Cap = Math.min(eligibleUsableKwh, 14)
    const t2Cap = Math.min(Math.max(eligibleUsableKwh - 14, 0), 14)
    const t3Cap = Math.min(Math.max(eligibleUsableKwh - 28, 0), 22)

    const t1STCs = t1Cap * rule.factor * 1.0
    const t2STCs = t2Cap * rule.factor * 0.6
    const t3STCs = t3Cap * rule.factor * 0.15

    rawSTCs = t1STCs + t2STCs + t3STCs
    tiers = {
      tierOneCapacityKwh: t1Cap,
      tierTwoCapacityKwh: t2Cap,
      tierThreeCapacityKwh: t3Cap,
      tierOneCertificates: t1STCs,
      tierTwoCertificates: t2STCs,
      tierThreeCertificates: t3STCs,
    }
  }

  // Certificate rounding: floor to whole certificates (REC Registry standard)
  const certificateCount = roundCertificates(rawSTCs)

  // Rebate in cents
  const rebateCents = certificateCount * pricePerSTCCents

  if (isOnGrid && !isVppCapable) {
    warnings.push('On-grid battery should have VPP technical capability')
  }

  return {
    scheme: 'federal-stc',
    status: 'eligible',
    installationDate,
    nominalCapacityKwh,
    usableCapacityKwh,
    eligibleCapacityKwh: eligibleUsableKwh,
    factor: rule.factor,
    tiered: rule.tiered,
    tiers,
    rawCertificateCount: Math.round(rawSTCs * 100) / 100,
    certificateCount,
    certificatePriceCents: pricePerSTCCents,
    rebateCents,
    assumptions: [
      `STC factor ${rule.factor} applies for installation date ${installationDate}`,
      `STC market price assumed at $${(pricePerSTCCents / 100).toFixed(2)} per certificate`,
      'Federal VPP participation is not required for STCs',
    ],
    warnings,
    ruleVersion: {
      effectiveFrom: rule.effectiveFrom,
      effectiveTo: rule.effectiveTo,
      source: rule.source,
      lastVerifiedAt: rule.lastVerifiedAt,
    },
  }
}
