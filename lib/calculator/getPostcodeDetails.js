// Postcode resolution for Australian battery rebate calculator.
// Pure function — no React, no Prisma, no side effects.

const AUSTRALIAN_POSTCODE_STATES = [
  { state: 'NSW', lo: 1000, hi: 1999 }, { state: 'NSW', lo: 2000, hi: 2599 },
  { state: 'NSW', lo: 2619, hi: 2899 }, { state: 'NSW', lo: 2921, hi: 2999 },
  { state: 'ACT', lo: 200, hi: 299 }, { state: 'ACT', lo: 2600, hi: 2618 },
  { state: 'ACT', lo: 2900, hi: 2920 },
  { state: 'VIC', lo: 3000, hi: 3999 }, { state: 'VIC', lo: 8000, hi: 8999 },
  { state: 'QLD', lo: 4000, hi: 4999 }, { state: 'QLD', lo: 9000, hi: 9999 },
  { state: 'SA', lo: 5000, hi: 5999 },
  { state: 'WA', lo: 6000, hi: 6999 },
  { state: 'TAS', lo: 7000, hi: 7999 },
  { state: 'NT', lo: 800, hi: 999 },
]

const LOCALITIES = {
  2000: 'Sydney', 2030: 'Dover Heights', 2060: 'North Sydney',
  2065: 'Crows Nest', 2088: 'Mosman', 2150: 'Parramatta',
  2170: 'Liverpool', 2250: 'Gosford', 2280: 'Newcastle',
  2500: 'Wollongong', 2600: 'Canberra', 3000: 'Melbourne',
  4000: 'Brisbane', 5000: 'Adelaide', 6000: 'Perth',
  6151: 'South Perth', 6160: 'Fremantle', 7000: 'Hobart',
}

/**
 * Resolve state, locality, and network/provider from an Australian postcode.
 */
export function getPostcodeDetails(postcode) {
  const warnings = []
  if (!/^\d{4}$/.test(postcode)) {
    return { postcode, isValid: false, state: null, locality: null,
      nswDistributionNetwork: null, networkNeedsConfirmation: false,
      waProvider: null, providerNeedsConfirmation: false,
      warnings: ['Postcode must be exactly 4 digits'] }
  }

  const code = parseInt(postcode, 10)
  let state = null
  for (const r of AUSTRALIAN_POSTCODE_STATES) {
    if (code >= r.lo && code <= r.hi) { state = r.state; break }
  }
  if (!state) {
    return { postcode, isValid: false, state: null, locality: null,
      nswDistributionNetwork: null, networkNeedsConfirmation: false,
      waProvider: null, providerNeedsConfirmation: false,
      warnings: [`Postcode ${postcode} not recognised`] }
  }

  const locality = LOCALITIES[postcode] || null

  // NSW distribution network — approximate mapping
  let nswDistributionNetwork = null, networkNeedsConfirmation = false
  if (state === 'NSW') {
    if (code >= 2000 && code <= 2199) nswDistributionNetwork = 'ausgrid'
    else if (code >= 2250 && code <= 2324) nswDistributionNetwork = 'ausgrid' // Central Coast / Newcastle outer
    else if (code >= 2500 && code <= 2530) nswDistributionNetwork = 'endeavour' // Wollongong
    else if (code >= 2745 && code <= 2770) nswDistributionNetwork = 'endeavour' // Western Sydney fringe
    else if (code >= 2790 && code <= 2899) nswDistributionNetwork = 'essential' // Regional
    else if (code >= 2620 && code <= 2730) nswDistributionNetwork = 'essential' // Riverina / Murray
    else networkNeedsConfirmation = true
    if (networkNeedsConfirmation) {
      warnings.push(`NSW distribution network uncertain for postcode ${postcode}. Please confirm.`)
    }
  }

  // WA provider
  let waProvider = null, providerNeedsConfirmation = false
  if (state === 'WA') {
    if ((code >= 6000 && code <= 6199) || (code >= 6200 && code <= 6299)) {
      waProvider = 'synergy' // Perth metro + SW
    } else if (code >= 6300 && code <= 6999) {
      waProvider = 'horizon-power'
    } else {
      providerNeedsConfirmation = true
      warnings.push(`WA provider uncertain for postcode ${postcode}. Please confirm.`)
    }
  }

  return { postcode, isValid: true, state, locality,
    nswDistributionNetwork, networkNeedsConfirmation,
    waProvider, providerNeedsConfirmation, warnings }
}
