import { timingSafeEqual, createHash } from 'node:crypto'

// Constant-time string compare. Hashing both sides to a fixed-length digest
// first means timingSafeEqual never sees mismatched buffer lengths (which it
// throws on) — so a short/garbage key can't be distinguished from a
// same-length-but-wrong one by either an exception or comparison timing.
function safeEqual(a, b) {
  const digestA = createHash('sha256').update(a).digest()
  const digestB = createHash('sha256').update(b).digest()
  return timingSafeEqual(digestA, digestB)
}

// Server-to-server auth for internal/CRM-facing routes. Checks the
// `x-internal-api-key` header against NEXON_INTERNAL_API_KEY. Missing header,
// wrong key, and an unconfigured server secret all fail the same way (no
// distinguishing error), and the key itself is never logged.
export function isValidInternalApiKey(req) {
  const expected = process.env.NEXON_INTERNAL_API_KEY
  if (!expected) {
    console.error(
      'NEXON_INTERNAL_API_KEY is not configured — rejecting all internal API requests',
    )
    return false
  }

  const provided = req.headers.get('x-internal-api-key')
  if (!provided) return false

  return safeEqual(provided, expected)
}

export function internalApiUnauthorized() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}
