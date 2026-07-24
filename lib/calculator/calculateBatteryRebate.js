// Main battery rebate orchestrator.
// Combines federal, NSW, and WA calculations.
// Pure function — no React, no Prisma, no side effects.

import { calculateFederalSTCs } from './calculateFederalSTCs.js'
import { calculateNSWPRCs } from './calculateNSWPRCs.js'
import { calculateWARebate } from './calculateWARebate.js'
import { getPostcodeDetails } from './getPostcodeDetails.js'

/**
 * Calculate all applicable battery rebates based on inputs.
 *
 * @param {Object} input
 * @param {string} input.installationDate     YYYY-MM-DD
 * @param {string} input.postcode             4-digit AU postcode
 * @param {string} input.batteryBrand         Brand name
 * @param {string} input.batteryModel         Model name
 * @param {number} input.nominalCapacityKwh   Nominal capacity (kWh)
 * @param {number} input.usableCapacityKwh    Verified usable capacity (kWh)
 * @param {number} input.pricePerSTCCents     STC market price in cents
 * @param {number} [input.pricePerPRCCents]   PRC price in cents (default 165)
 * @param {string} [input.nswDistributionNetwork]  'ausgrid'|'endeavour'|'essential'
 * @param {string} [input.waProvider]          'synergy'|'horizon-power'
 * @param {boolean} [input.isVppParticipant]   VPP/demand-response enrolled
 * @param {number} [input.vppContractMonths]   Contract duration months
 * @param {boolean} [input.isCECApproved]      CEC approved
 * @param {boolean} [input.hasEligibleSolarPV] Has eligible solar
 * @param {boolean} [input.isOnGrid]           On-grid installation
 * @returns {Object}
 */
export function calculateBatteryRebate(input) {
  const {
    installationDate,
    postcode,
    batteryBrand,
    batteryModel,
    nominalCapacityKwh,
    usableCapacityKwh,
    pricePerSTCCents,
    pricePerPRCCents = 165, // Default PRC price: $1.65 in cents
    nswDistributionNetwork: inputNswNetwork,
    waProvider: inputWaProvider,
    isVppParticipant = false,
    vppContractMonths = 0,
    isCECApproved = true,
    hasEligibleSolarPV = true,
    isOnGrid = true,
  } = input

  const allWarnings = []
  const allAssumptions = []
  const allIneligibilityReasons = []

  // Resolve location
  const location = getPostcodeDetails(postcode)

  // Federal — always applicable nationally
  const federal = calculateFederalSTCs({
    installationDate,
    nominalCapacityKwh,
    usableCapacityKwh,
    pricePerSTCCents,
    isCECApproved,
    hasEligibleSolarPV,
    isOnGrid,
    isVppCapable: isVppParticipant,
  })

  // Accumulate federal results
  if (federal.assumptions) allAssumptions.push(...federal.assumptions)
  if (federal.warnings) allWarnings.push(...federal.warnings)
  if (federal.ineligibilityReasons) allIneligibilityReasons.push(...federal.ineligibilityReasons)

  const federalRebateCents = federal.status === 'eligible' ? federal.rebateCents : 0

  // State calculations — NSW or WA only (mutually exclusive)
  let stateResult = null
  let stateRebateCents = 0

  if (location.state === 'NSW') {
    const nswNetwork = inputNswNetwork || location.nswDistributionNetwork
    const nsw = calculateNSWPRCs({
      installationDate,
      nominalCapacityKwh,
      usableCapacityKwh,
      postcode,
      nswDistributionNetwork: nswNetwork,
      networkLossFactor: undefined, // derived from network in the function
      pricePerPRCCents,
      isCECApproved,
      isVppParticipant,
      vppContractMonths,
    })
    stateResult = { scheme: 'nsw-prc', result: nsw }
    if (nsw.assumptions) allAssumptions.push(...nsw.assumptions)
    if (nsw.warnings) allWarnings.push(...nsw.warnings)
    if (nsw.ineligibilityReasons) allIneligibilityReasons.push(...nsw.ineligibilityReasons)
    if (nsw.status === 'eligible') stateRebateCents = nsw.rebateCents
  } else if (location.state === 'WA') {
    const provider = inputWaProvider || location.waProvider
    const wa = calculateWARebate({
      installationDate,
      usableCapacityKwh,
      waProvider: provider,
      isVppParticipant,
      isCECApproved,
    })
    stateResult = { scheme: 'wa-battery-rebate', result: wa }
    if (wa.assumptions) allAssumptions.push(...wa.assumptions)
    if (wa.warnings) allWarnings.push(...wa.warnings)
    if (wa.ineligibilityReasons) allIneligibilityReasons.push(...wa.ineligibilityReasons)
    if (wa.status === 'eligible') stateRebateCents = wa.rebateCents
  }

  const finalRebateCents = federalRebateCents + stateRebateCents

  const hasAnyEligible = federal.status === 'eligible' || (stateResult && stateResult.result.status === 'eligible')

  return {
    status: hasAnyEligible ? 'eligible' : 'ineligible',
    calculatedAt: new Date().toISOString(),
    input: {
      batteryBrand,
      batteryModel,
      installationDate,
      postcode,
    },
    battery: {
      brand: batteryBrand,
      model: batteryModel,
      nominalCapacityKwh,
      usableCapacityKwh,
    },
    location,
    federal,
    state: stateResult,
    totals: {
      federalRebateCents,
      stateRebateCents,
      finalRebateCents,
    },
    assumptions: allAssumptions,
    warnings: allWarnings,
    ineligibilityReasons: allIneligibilityReasons,
    ruleVersions: {
      federal: federal.ruleVersion || null,
      state: stateResult?.result?.ruleVersion || null,
    },
  }
}
