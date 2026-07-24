// Shared brand-logo resolution logic used by both the client-side
// BrandPartners component (via /api/brand-logos) and server components that
// can read /public/brands directly (e.g. app/brands/[slug]/page.js).

export function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Manual overrides for logo files whose name doesn't match the brand name
// after normalization (e.g. a typo'd or abbreviated filename). Prefer fixing
// the filename per the convention below over adding entries here.
export const LOGO_OVERRIDES = {
  egingpv: '/brands/EGING_logo.png',
  risenenergy: '/brands/Rise_logo.png',
  tindosolar: '/brands/Tindo_logo.png',
  ankersolix: '/brands/Anker_logo.jpeg',
  lgenergysolution: '/brands/LG_energy_logo.jpg',
  emerald: '/brands/Emarald_logo.png',
}

// Strip common filename suffixes before normalizing, so
// "Canadian_Solar_logo.jpeg" and "AESOLAR_logo.png" both reduce to their
// brand name ("canadiansolar", "aesolar") for matching against a brand name.
export function fileToBrandKey(filename) {
  const stem = filename.replace(/\.(png|jpe?g|svg|webp)$/i, '')
  const cleaned = stem.replace(/_(logo|logos|img)$/i, '')
  return normalizeName(cleaned)
}

// Server-only: resolve a brand's logo the same way for every page — prefer a
// file actually present in /public/brands over the (often stale) DB value.
export function resolveBrandLogo(name, dbLogoUrl, logoFiles) {
  const fileLookup = {}
  for (const filename of logoFiles) {
    fileLookup[fileToBrandKey(filename)] = `/brands/${filename}`
  }
  return (
    LOGO_OVERRIDES[normalizeName(name)] ||
    fileLookup[normalizeName(name)] ||
    dbLogoUrl ||
    null
  )
}
