// WA Residential Battery Rebate calculation.
// Pure function. No React, no Prisma, no side effects.

import { WA_REBATE_RULES, selectRule } from './rebateRules.js'

/**
 * Calculate WA Residential Battery Rebate.
 *
 * @param {Object} input
 * @returns {Object}
 */
export function calculateWARebate({
  installationDate,
  usableCapacityKwh,
  waProvider, // 'synergy' | 'horizon-power'
  isVppParticipant = false,
  isCECApproved = true,
  isResidentialProperty = true,
  hasPreviouslyReceivedWARebate = false,
}) {
  const reasons = []
  const warnings = []

  if (!waProvider) {
    return {
      scheme: 'wa-battery-rebate',
      status: 'needs_input',
      ineligibilityReasons: ['WA electricity provider must be specified (Synergy or Horizon Power)'],
      assumptions: [],
      warnings,
    }
  }

  const rule = selectRule(WA_REBATE_RULES, installationDate)
  if (!rule) {
    return {
      scheme: 'wa-battery-rebate',
      status: 'unsupported_date',
      ineligibilityReasons: [`No WA rebate rule configured for date ${installationDate}`],
      assumptions: [],
      warnings,
    }
  }

  // Eligibility
  if (!isCECApproved) reasons.push('Battery system is not CEC-approved')
  if (!isVppParticipant) reasons.push('VPP participation is required for the WA rebate')
  if (!isResidentialProperty) reasons.push('WA rebate is for residential properties only')
  if (hasPreviouslyReceivedWARebate) reasons.push('Property has already received the WA battery rebate')
  if (usableCapacityKwh < rule.minUsableCapacityKwh) {
    reasons.push(`Usable capacity ${usableCapacityKwh} kWh is below the minimum ${rule.minUsableCapacityKwh} kWh`)
  }

  if (reasons.length > 0) {
    return { scheme: 'wa-battery-rebate', status: 'ineligible', ineligibilityReasons: reasons, assumptions: [], warnings }
  }

  // Eligible capacity: first 10 kWh of usable capacity
  const eligibleCapacityKwh = Math.min(usableCapacityKwh, rule.maxEligibleUsableKwh)

  let rateCentsPerKwh, maxCents, providerLabel
  if (waProvider === 'horizon-power') {
    rateCentsPerKwh = rule.horizonRateCentsPerKwh
    maxCents = rule.horizonMaxCents
    providerLabel = 'Horizon Power'
  } else {
    rateCentsPerKwh = rule.synergyRateCentsPerKwh
    maxCents = rule.synergyMaxCents
    providerLabel = 'Synergy'
  }

  const rawRebateCents = eligibleCapacityKwh * rateCentsPerKwh
  const rebateCents = Math.min(rawRebateCents, maxCents)

  return {
    scheme: 'wa-battery-rebate',
    status: 'eligible',
    installationDate,
    usableCapacityKwh,
    eligibleCapacityKwh,
    waProvider,
    rateCentsPerKwh,
    maxRebateCents: maxCents,
    rebateCents,
    assumptions: [
      `WA ${providerLabel} rate: $${(rateCentsPerKwh / 100).toFixed(2)} per eligible kWh`,
      `Maximum ${eligibleCapacityKwh} kWh eligible (capped at ${rule.maxEligibleUsableKwh} kWh)`,
      `WA rebate capped at $${(maxCents / 100).toFixed(2)}`,
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
