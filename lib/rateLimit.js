// In-memory rate limiter keyed by IP address.
//
// Known tech debt: this Map lives in process memory, so counts reset on
// every server restart/redeploy and are NOT shared across multiple
// serverless instances (each instance gets its own Map). Acceptable for
// now, but if this app scales to multiple instances behind a load
// balancer, replace with a shared store (e.g. Redis) for real protection.
const attempts = new Map()

export default function rateLimit(ip, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now()
  const entry = attempts.get(ip)

  if (!entry || entry.resetAt <= now) {
    attempts.set(ip, { count: 1, resetAt: now + windowMs })
    return { limited: false }
  }

  entry.count += 1

  if (entry.count > maxAttempts) {
    return { limited: true, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  return { limited: false }
}
