// NSW PDRS BESS2 VPP Incentive — PRC calculation.
// Pure function. No React, no Prisma, no side effects.

import { NSW_BESS2_RULES, selectRule, roundCertificates } from './rebateRules.js'

/**
 * Calculate NSW BESS2 PRC incentive.
 *
 * Formula steps (individually named per PDRS Method Guide):
 *   1. usableCapacityKwh = nominalCapacityKwh × 0.9 (when no verified usable capacity)
 *   2. eligibleCapacityKwh = min(usableCapacityKwh, maxEligibleUsableKwh)
 *   3. demandResponseKw = eligibleCapacityKwh × 0.0734
 *   4. peakDemandResponseKw = demandResponseKw × 0.8
 *   5. peakDemandReduction = peakDemandResponseKw × 6 (hours) × 6 (years)
 *   6. rawPRCs = peakDemandReduction × networkLossFactor × 10
 *   7. prcCount = floor(rawPRCs)
 *
 * @param {Object} input
 * @returns {Object}
 */
export function calculateNSWPRCs({
  installationDate,
  nominalCapacityKwh,
  usableCapacityKwh, // optional — if absent, derive from nominal × 0.9
  postcode,
  networkLossFactor, // optional — if absent, derived from network
  nswDistributionNetwork, // 'ausgrid' | 'endeavour' | 'essential'
  pricePerPRCCents,
  isCECApproved = true,
  isVppParticipant = false,
  vppContractMonths = 0,
}) {
  const reasons = []
  const warnings = []
  const assumptions = []

  const rule = selectRule(NSW_BESS2_RULES, installationDate)
  if (!rule) {
    return {
      scheme: 'nsw-prc',
      status: 'unsupported_date',
      ineligibilityReasons: [`No NSW BESS2 rule configured for date ${installationDate}`],
      assumptions: [],
      warnings: [],
    }
  }

  // Derive usable capacity from nominal × 0.9 if not explicitly provided
  const effectiveUsableKwh = usableCapacityKwh != null
    ? usableCapacityKwh
    : nominalCapacityKwh * rule.usableCapacityRatio

  if (usableCapacityKwh == null) {
    assumptions.push(`Usable capacity derived as nominal ${nominalCapacityKwh} kWh × ${rule.usableCapacityRatio} = ${Math.round(effectiveUsableKwh * 100) / 100} kWh`)
  }

  // Eligibility checks
  if (!isCECApproved) reasons.push('Battery system is not CEC-approved')
  if (!isVppParticipant) reasons.push('VPP/demand-response participation is required for BESS2')
  if (vppContractMonths < rule.minVppContractMonths) {
    reasons.push(`VPP contract duration ${vppContractMonths} months is below the minimum ${rule.minVppContractMonths}`)
  }
  if (effectiveUsableKwh <= rule.minUsableCapacityKwh) {
    reasons.push(`Usable capacity ${Math.round(effectiveUsableKwh * 10) / 10} kWh is at or below the minimum ${rule.minUsableCapacityKwh} kWh`)
  }
  if (effectiveUsableKwh > rule.maxUsableCapacityKwh) {
    reasons.push(`Total usable capacity ${Math.round(effectiveUsableKwh * 10) / 10} kWh exceeds the maximum ${rule.maxUsableCapacityKwh} kWh`)
  }

  if (reasons.length > 0) {
    return { scheme: 'nsw-prc', status: 'ineligible', ineligibilityReasons: reasons, assumptions, warnings }
  }

  // Resolve network loss factor
  const nlf = networkLossFactor || rule.networkLossFactors[nswDistributionNetwork]
  if (nlf == null) {
    return {
      scheme: 'nsw-prc',
      status: 'needs_input',
      ineligibilityReasons: ['NSW distribution network must be specified to determine the network loss factor'],
      assumptions,
      warnings,
    }
  }

  // Capacity eligible for certificates (capped)
  const eligibleCapacityKwh = Math.min(effectiveUsableKwh, rule.maxEligibleUsableKwh)

  // Step 1: Demand Response Component (kW)
  const demandResponseKw = eligibleCapacityKwh * rule.demandResponseFactorKwPerKwh

  // Step 2: Peak Demand Response Capacity (kW)
  const peakDemandResponseKw = demandResponseKw * rule.peakDemandFactor

  // Step 3: Peak Demand Reduction Capacity (dimensionless)
  //   peakDemandResponseKw × peakDemandHours × schemeLifetimeYears
  const peakDemandReduction = peakDemandResponseKw * rule.peakDemandHours * rule.schemeLifetimeYears

  // Step 4: Raw PRCs = peakDemandReduction × networkLossFactor × 10
  const rawPRCs = peakDemandReduction * nlf * 10

  // Step 5: Floor to whole certificates
  const prcCount = roundCertificates(rawPRCs)

  // Dollar estimate
  const rebateCents = prcCount * pricePerPRCCents

  return {
    scheme: 'nsw-prc',
    status: 'eligible',
    installationDate,
    nominalCapacityKwh,
    usableCapacityKwh: Math.round(effectiveUsableKwh * 100) / 100,
    eligibleCapacityKwh: Math.round(eligibleCapacityKwh * 100) / 100,
    demandResponseKw: Math.round(demandResponseKw * 10000) / 10000,
    peakDemandResponseKw: Math.round(peakDemandResponseKw * 10000) / 10000,
    peakDemandReduction: Math.round(peakDemandReduction * 100) / 100,
    networkLossFactor: nlf,
    nswDistributionNetwork,
    rawCertificateCount: Math.round(rawPRCs * 100) / 100,
    certificateCount: prcCount,
    certificatePriceCents: pricePerPRCCents,
    rebateCents,
    assumptions: [
      ...assumptions,
      `Demand response factor ${rule.demandResponseFactorKwPerKwh} kW per usable kWh`,
      `Peak demand coincidence factor ${rule.peakDemandFactor}`,
      `Peak demand reduction duration ${rule.peakDemandHours} hours × ${rule.schemeLifetimeYears} years lifetime`,
      `Network loss factor ${nlf} for ${nswDistributionNetwork || 'unknown'} distribution network`,
      `PRC market price assumed at $${(pricePerPRCCents / 100).toFixed(2)} per certificate`,
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
