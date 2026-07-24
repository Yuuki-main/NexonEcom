import { calculateBatteryRebate } from '@/lib/calculator/calculateBatteryRebate.js'
import { BATTERY_BRANDS } from '@/lib/calculator/batteryModels.js'

// Flat lookup for POST: brand name → models array
const BRAND_LOOKUP = Object.fromEntries(
  BATTERY_BRANDS.map((b) => [b.brand, b.models]),
)

export async function GET() {
  // Return brands in the defined order (public fields only)
  const brands = BATTERY_BRANDS.map((b) => ({
    brand: b.brand,
    models: b.models.map((m) => ({
      label: m.label,
      cec: m.cec,
    })),
  }))

  return Response.json({ brands })
}

export async function POST(req) {
  try {
    const body = await req.json()

    const {
      brand,
      model,
      postcode,
      installationDate,
      pricePerSTC,
      pricePerPRC,
      isVppParticipant,
      vppContractMonths,
      nswDistributionNetwork,
      waProvider,
    } = body

    if (!brand || !model || !postcode || !installationDate) {
      return Response.json(
        { error: 'Brand, model, postcode and installation date are required' },
        { status: 400 },
      )
    }

    const models = BRAND_LOOKUP[brand]
    if (!models) {
      return Response.json({ error: 'Brand not found' }, { status: 404 })
    }
    const selected = models.find((m) => m.label === model)
    if (!selected) {
      return Response.json({ error: 'Model not found' }, { status: 404 })
    }

    const stcCents = Math.round((parseFloat(pricePerSTC) || 40) * 100)
    const prcCents = pricePerPRC != null ? Math.round(parseFloat(pricePerPRC) * 100) : 165

    if (stcCents <= 0 || stcCents > 10000) {
      return Response.json({ error: 'STC price must be between $0.01 and $100.00' }, { status: 400 })
    }

    const result = calculateBatteryRebate({
      installationDate,
      postcode,
      batteryBrand: brand,
      batteryModel: model,
      nominalCapacityKwh: selected.nominalCapacity,
      usableCapacityKwh: selected.usableCapacity,
      pricePerSTCCents: stcCents,
      pricePerPRCCents: prcCents,
      isVppParticipant: isVppParticipant === true || isVppParticipant === 'true',
      vppContractMonths: parseInt(vppContractMonths) || 0,
      nswDistributionNetwork: nswDistributionNetwork || undefined,
      waProvider: waProvider || undefined,
    })

    return Response.json({ result })
  } catch (err) {
    console.error('Calculator API error:', err)
    return Response.json(
      { error: 'Calculation failed' },
      { status: 500 },
    )
  }
}
