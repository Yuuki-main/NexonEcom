# Production Readiness Audit — NexonEcom (Full Report)

**Audit Date:** July 2026  
**App:** nexon-ecom — B2B solar hardware ecommerce platform  
**Stack:** Next.js 16.2.7 (App Router), React 19.2.4, Tailwind v4.3.0, Prisma v7.8.0, Supabase PostgreSQL  
**Method:** Read-only codebase exploration (no files modified, no runtime testing)  
**157 source files analyzed** (44 API endpoints, 40 components/pages, 8 lib files, 4 Redux slices, 1 seed script, 1 test file, 6 config/docs files)

---

## Executive Summary

**Overall Production Readiness: ~40%**

The application progressed significantly from its initial frontend-only prototype. A robust database schema (1066 lines, 35 models across 8 Postgres schemas) is in place, along with working custom-JWT authentication, 14 API route handlers covering auth, products, cart, orders, favourites, account management, and a battery rebate calculator. The frontend is fully wired to these endpoints — login, signup, product browsing with faceted search, cart management, checkout-to-order-creation, and order history all function end-to-end against the live database.

However, critical production gaps remain. **Payments are not implemented** — orders are created with `status: 'pending_payment'` but no money is ever collected. A **real JWT secret is committed in plaintext** in source files. There is **no CI/CD pipeline, no Dockerfile, no deployment configuration, no structured logging, no monitoring, and virtually no automated testing** (only 31 unit tests for the calculator module). The app can demonstrate a complete purchase flow in a dev environment but cannot process payments, cannot be safely deployed, and cannot be operated/observed in production.

**Estimated effort to production-ready:** 20–30 person-days across all areas (see Punch List below).

---

## Project Structure Overview

```
nexon-ecom/
├── app/                          # Next.js App Router
│   ├── layout.js                 # Root layout (Redux Provider + AuthInitializer + CartDrawer)
│   ├── page.js                   # Homepage (server component)
│   ├── globals.css               # Tailwind v4 CSS config
│   ├── about/page.js             # Static about page
│   ├── brands/
│   │   ├── page.js               # Brands listing (wraps BrandPartners)
│   │   └── [slug]/page.js        # Brand detail + product catalogue
│   ├── calculator/page.js        # Battery rebate calculator (fully built, 733 lines)
│   ├── category/[slug]/page.js   # Redirect to /products?category=slug
│   ├── checkout/page.js          # Checkout page (server component, fetches cart)
│   ├── contact/page.js           # Contact form (styled, no API submission)
│   ├── downloads/page.js         # STUB — <h1>Downloads</h1>
│   ├── events/page.js            # STUB — <h1>Events</h1>
│   ├── forgot-password/page.js   # Static "coming soon" notice
│   ├── login/page.js             # Login form (client, wired to /api/auth/login)
│   ├── signup/page.js            # Signup form (client, wired to /api/auth/register)
│   ├── news/page.js              # News articles (hardcoded data)
│   ├── order-confirmation/page.js# Confirmation page (client, reads ?orderId=)
│   ├── products/
│   │   ├── page.js               # Product listing (API-driven, faceted search)
│   │   ├── loading.js            # Loading spinner
│   │   └── [slug]/page.js        # Product detail (server component)
│   ├── account/                  # Account section (protected by middleware)
│   │   ├── page.js               # Account landing (orders + profile)
│   │   ├── dashboard/page.js     # Dashboard with order status cards
│   │   ├── addresses/page.js     # Address management
│   │   ├── company-profile/page.js # Company profile editing
│   │   ├── company-users/page.js # Company user management
│   │   ├── favourite/page.js     # Favourites list
│   │   ├── my-team/page.js       # Team member management
│   │   ├── orders/page.js        # Order history
│   │   ├── payment-options/page.js # Payment options
│   │   └── subscriptions/page.js # Notification subscriptions
│   └── api/                      # API route handlers (44 total handlers)
│       ├── health/route.js       # GET → DB ping health check
│       ├── auth/
│       │   ├── login/route.js    # POST → login
│       │   ├── register/route.js # POST → register
│       │   ├── me/route.js       # GET → current user
│       │   └── logout/route.js   # POST → logout
│       ├── products/
│       │   ├── route.js          # GET → list with filters/facets/pagination
│       │   └── [id]/route.js     # GET → product detail by id or slug
│       ├── categories/route.js   # GET → all categories
│       ├── brands/route.js       # GET → all brands
│       ├── brand-logos/route.js  # GET → brand logo files from disk
│       ├── cart/route.js         # GET/POST/PATCH/DELETE → cart CRUD
│       ├── orders/route.js       # GET/POST → order list + create
│       ├── favourites/route.js   # GET/POST/DELETE → favourites CRUD
│       ├── track-order/route.js  # GET → track by order/slip number
│       ├── calculator/rebate/route.js # GET/POST → battery rebate calculation
│       └── account/
│           ├── company-profile/route.js  # PATCH → update org profile
│           ├── team/
│           │   ├── route.js              # POST → add team member
│           │   └── [memberId]/route.js   # PATCH/DELETE → edit/remove
│           └── subscriptions/[membershipId]/route.js  # PATCH → update subs
├── components/                   # React components
│   ├── Navbar.jsx                # Sticky two-row nav (422 lines)
│   ├── Footer.jsx                # 4-column footer (209 lines)
│   ├── HeroBanner.jsx            # Image slider (131 lines)
│   ├── ProductCard.jsx           # Product grid card (187 lines)
│   ├── ProductDetail.jsx         # Full product detail view (860 lines)
│   ├── ProductFilters.jsx        # Sidebar facet filters (98 lines) — UNUSED
│   ├── ProductGrid.jsx           # Product grid layout (26 lines) — UNUSED standalone
│   ├── SortDropdown.jsx          # Sort dropdown (30 lines) — UNUSED standalone
│   ├── CartDrawer.jsx            # Slide-in cart (743 lines, ~300 commented out)
│   ├── FavouriteButton.jsx       # Heart toggle button
│   ├── FavouritesClient.jsx      # Favourites page wrapper
│   ├── CheckoutClient.jsx        # Checkout form + order submission (240 lines)
│   ├── BrandPartners.jsx         # Brand logo grid (142 lines)
│   ├── BrandProducts.jsx         # Brand detail product grid + filters (367 lines)
│   ├── AccountClient.jsx         # Simple account page (158 lines)
│   ├── PromoSlider.jsx           # Promo banner slider (241 lines)
│   ├── AppliancesGrid.jsx        # Appliance category grid (commented out on home)
│   ├── CategoryHeroSection.jsx   # Category hero stacked sliders
│   ├── CategoryHeroSlider.jsx    # Single category slider
│   ├── NewsEvents.jsx            # News article cards
│   ├── account/                  # Account sub-components
│   │   ├── AccountDashboard.jsx
│   │   └── AccountSidebar.jsx
│   ├── ui/CustomSelect.jsx       # Custom select dropdown
│   └── examples/CustomSelectExample.jsx
├── store/                        # Redux state management
│   ├── store.js                  # ConfigureStore (4 slices)
│   ├── Provider.jsx              # Redux Provider wrapper
│   ├── AuthInitializer.jsx       # Auth hydration on mount
│   └── slices/
│       ├── authSlice.js          # user, isAuthenticated, loading
│       ├── cartSlice.js          # items, isOpen, loading, error (w/ thunks)
│       ├── favouritesSlice.js    # products, loading, error (w/ thunks)
│       └── uiSlice.js            # filtersOpen, activeCategory
├── lib/                          # Backend libraries
│   ├── auth.js                   # JWT sign/verify + bcrypt helpers
│   ├── prisma.js                 # Prisma client singleton
│   ├── rateLimit.js              # In-memory rate limiter
│   ├── brandLogo.js              # Brand logo resolution
│   ├── newsData.js               # Hardcoded news articles (147 lines)
│   ├── account/
│   │   ├── getAccountDashboardData.js  # Dashboard stats aggregator
│   │   └── getTeamAccess.js            # Team auth/permission helper
│   ├── calculator/               # Battery rebate calculator module
│   │   ├── batteryModels.js      # 10 battery brands × N models each
│   │   ├── calculateBatteryRebate.js    # Orchestrator
│   │   ├── calculateFederalSTCs.js      # Federal STC rules
│   │   ├── calculateNSWPRCs.js          # NSW PRC rules
│   │   ├── calculateWARebate.js         # WA rebate rules
│   │   ├── getPostcodeDetails.js        # Postcode → state/zone lookup
│   │   ├── rebateRules.js               # Rebate rule configs
│   │   └── calculator.test.js           # 31 unit tests (comprehensive)
│   └── generated/prisma/         # Generated Prisma client (gitignored)
├── prisma/                       # Database layer
│   ├── schema.prisma             # 1066 lines, 35 models, 8 schemas
│   ├── prisma.config.ts          # Prisma CLI config (env loading)
│   ├── seed.mjs                  # Dev seed: 4 orgs, 11 users, 5 roles, 34 brands, 4 cats, 35+ products
│   └── migrations/               # 4 migration files (0001–0004)
├── public/                       # Static assets
│   ├── brands/                   # 40 brand logo images
│   ├── banner/                   # 2 hero banner images
│   ├── nexon_gfx/                # Homepage/contact/news graphics
│   ├── icons/                    # Social media icons
│   └── *.svg                     # Next.js/Vercel defaults
├── Config files:
│   ├── package.json              # 17 deps, 4 devDeps
│   ├── next.config.mjs           # Image remote patterns only
│   ├── postcss.config.mjs        # Tailwind v4 + Lightning CSS
│   ├── eslint.config.mjs         # Next.js core-web-vitals only
│   ├── jsconfig.json             # @/* path alias
│   └── .gitignore                # Standard Next.js ignores
├── Docs:
│   ├── README.md                 # Default create-next-app template (unhelpful)
│   ├── ARCHITECTURE.md           # 372 lines — thorough, describes TARGET state
│   ├── DATABASE_SCHEMA.md        # 764 lines — comprehensive ERD-level schema
│   ├── PROGRESS_REPORT.md        # 235 lines — STALE (describes pre-backend prototype)
│   ├── AUDIT.md                  # 319 lines — STALE (describes MongoDB/Mongoose v0)
│   ├── AGENTS.md                 # Agent context/rules for Hermes
│   └── CLAUDE.md                 # Claude context file
├── .env                          # Prisma local dev DB URL (placeholder)
├── .env.example                  # INCOMPLETE (only JWT_SECRET + JWT_EXPIRES_IN)
└── .env.local                    # Real Supabase credentials + JWT secret
```

---

## 1. Functionality & Completeness — ⚠️ Partial (65%)

### ✅ Fully Implemented

| Feature | Evidence | Files |
|---------|----------|-------|
| **User registration** | Creates User + Organization + OrganizationMember in a Prisma transaction. Validates all required fields, ABN, email format, password length ≥8. Returns JWT + httpOnly cookie. | `app/api/auth/register/route.js` (177 lines) |
| **User login** | Rate-limited (5 attempts/15min/IP). Email lookup via `findFirst` with `deletedAt: null`. bcrypt password comparison. Sets httpOnly cookie. | `app/api/auth/login/route.js` (85 lines) |
| **Auth hydration** | `AuthInitializer` calls `/api/auth/me` on mount, hydrates Redux auth state. | `store/AuthInitializer.jsx` (39 lines) |
| **Logout** | Deletes `token` cookie, Redux clears user state. | `app/api/auth/logout/route.js` (6 lines) |
| **Route protection** | Middleware protects `/account/*`, `/checkout/*`, `/products/[slug]` via JWT verification. Redirects to `/login?redirect=...` | `middleware.js` (47 lines) |
| **Product listing** | API-driven with 9 filter dimensions (category, brand, technology, frameColor, cellType, cellNumber, wattage), 4 sort options, pagination, facet counts. Facets computed in-memory from all products in category (fine at current scale). | `app/api/products/route.js` (241 lines) |
| **Product detail** | Server component fetches by id or slug. Returns full product with category, brand, images. Maps Prisma → Mongoose-compatible response. | `app/api/products/[id]/route.js` (43 lines) |
| **Category listing** | Returns all non-deleted categories sorted by name. | `app/api/categories/route.js` (26 lines) |
| **Brand listing** | Returns all non-deleted brands sorted by name. | `app/api/brands/route.js` (30 lines) |
| **Brand detail page** | Server component with full product catalogue, category tabs, sidebar filters, pagination. Has `generateMetadata` for SEO. | `app/brands/[slug]/page.js` (176 lines) |
| **Cart (full CRUD)** | GET returns populated cart. POST adds item (upsert pattern). PATCH updates quantity (removes if <1). DELETE removes item. All auth-protected, product-verified. | `app/api/cart/route.js` (190 lines) |
| **Cart drawer UI** | Slide-in panel with item list, qty steppers, remove button, order summary (subtotal, GST, total, savings), checkout link. Skeleton loading state. | `components/CartDrawer.jsx` (743 lines, ~300 lines commented out dead code) |
| **Order creation** | Prisma transaction: fetch cart → snapshot prices → create order + items → clear cart. Sequential order number (`ORD-000001`). Tax calculation at 10% GST. | `app/api/orders/route.js` (198 lines) |
| **Order history** | Returns all orders for user's organization, mapped to frontend-compatible shape. | `app/api/orders/route.js:154-189` |
| **Favourites (full CRUD)** | GET/POST/DELETE. Idempotent (P2002 on duplicate → silent no-op). Product existence verified before creating. | `app/api/favourites/route.js` (131 lines) |
| **Battery rebate calculator** | Full UI (733 lines, 60-90% code coverage depending on state selected). Backend API with POST calculation and GET brand/model listing. Supports federal STCs (tiered from May 2026), NSW PRCs (Ausgrid/Endeavour/Essential), WA rebate (Synergy/Horizon Power). VPP participation factored. | `app/calculator/page.js`, `app/api/calculator/rebate/route.js`, 7 lib files |
| **Account dashboard** | Order stats grouped by status (Awaiting Payment/Processing/Completed). User profile display. Credit account placeholder. | `app/account/dashboard/page.js`, `lib/account/getAccountDashboardData.js` |
| **Company profile editing** | PATCH endpoint. Role-gated (owner/admin only). Field validation (max length checks). | `app/api/account/company-profile/route.js` (86 lines) |
| **Team member management** | POST/PATCH/DELETE endpoints. Role-gated (owner/admin only). Email uniqueness check. Soft delete (isActive=false). | `app/api/account/team/route.js` (141 lines), `[memberId]/route.js` (226 lines) |
| **Notification subscriptions** | PATCH per-membership subscription toggles (orders, invoices, packingSlips, newsletter, statements). Self-serve or admin-manage. | `app/api/account/subscriptions/[membershipId]/route.js` (219 lines) |
| **Order tracking** | Lookup by order number or packing slip number. Returns order status, customer name, shipping address. | `app/api/track-order/route.js` (55 lines) |
| **Health check** | DB ping via `$queryRaw\`SELECT 1\``. Returns `{ status: 'ok', db: 'connected' }`. | `app/api/health/route.js` (10 lines) |
| **Contact page** | Fully styled form with name, company, email, phone, subject, message fields. | `app/contact/page.js` |
| **SEO metadata** | Root layout has metadata. Brand detail page has `generateMetadata`. | `app/layout.js:6-9`, `app/brands/[slug]/page.js:16-30` |
| **Products loading state** | Animated spinner component. | `app/products/loading.js` (10 lines) |
| **Products not-found** | "Product not found." fallback. | `app/products/[slug]/not-found.js` (4 lines) |

### ⚠️ Partially Implemented / Gaps

| Feature | Status | Details |
|---------|--------|---------|
| **Payment (Stripe)** | ❌ Not implemented | Stripe npm packages installed (`stripe@22.2.3`, `@stripe/stripe-js@9.8.0`). DB schema has `stripeCheckoutSessionId` and `stripePaymentIntentId` columns. But: no Stripe secret key in env vars, no checkout session creation endpoint, no webhook handler, no Stripe redirect flow. Checkout page comment at line 56 reads: `// Redirect to confirmation — Day 6 will replace this with Stripe redirect`. Orders are created with `status: 'pending_payment'` and sit there — no payment is ever collected. |
| **Password reset** | ❌ Static page only | `/forgot-password` page displays "Password reset via email is coming soon." No API endpoint. `PasswordResetToken` table exists in schema. |
| **Email verification** | ❌ Not implemented | `EmailVerificationToken` table exists. `User.isEmailVerified` defaults to `false` but nothing enforces it — users can place orders without verifying email. |
| **Credit accounts** | ⚠️ Hardcoded zeros | `getAccountDashboardData.js:89-104` returns all zeros with a TODO comment: `// TODO: CreditAccount moved — reconnect when model restored`. Full `CreditAccount` and `CreditLedgerEntry` tables exist in schema. |
| **Contact form submission** | ❌ No API endpoint | The contact page has a fully styled form but no `POST /api/contact` endpoint. Submitting the form would 404. |
| **Search** | ❌ Navbar input only | Navbar has a search input (`placeholder="Search for products (Brand / Name / Description)"`) but it's local `useState` only — no API call, no results page. A GIN full-text search index is defined on `products`. |
| **Downloads page** | ❌ Stub | `<h1>Downloads</h1>` only. |
| **Events page** | ❌ Stub | `<h1>Events</h1>` only. |
| **Account address management** | ⚠️ UI exists, API unclear | Address page exists but needs verification — the `OrganizationAddress` model exists but CRUD endpoints may be partial. |
| **Footer links** | ❌ All dead | All footer links use `href="#"`. 20+ dead links in production. |
| **Navbar auth state** | ⚠️ Partial | Navbar shows "Sign In" link when not authenticated. Does NOT show user name or logout button when authenticated — just hides the Sign In link. |
| **Order confirmation** | ⚠️ Minimal | Shows "Order Placed!" with a truncated order ID. No order summary, no line items, no email confirmation trigger. |
| **Product detail image gallery** | ⚠️ Single image only | Despite having `ProductImage` table with `displayOrder`, the detail page only shows `product.images[0]`. No thumbnail strip or carousel. |
| **Warehouse stock display** | ⚠️ Hardcoded locations | Product detail has 6 "Buy From" warehouse buttons (Sydney, Brisbane, Adelaide, Townsville, Melbourne, Perth) but all non-Sydney locations show `stockQuantity` only for Sydney and 0 for others — the multi-warehouse inventory module is not active. |
| **AppliancesGrid** | ⚠️ Commented out | Component exists but is commented out on the homepage. Images inside are also commented out. |
| **CategoryHeroSection content** | ⚠️ Mismatched | Content is furniture/appliance themed ("Furniture", "Refrigerators", "Kitchen Appliances") — looks ported from a different template. Doesn't match solar hardware theme. |
| **Multiple design systems** | ⚠️ Inconsistent | At least 5 different blues used: `#0071ce`, `#2196f3`, `#00a7a7`, `#1d4ed8`, `#1478d4`, `#1565c0`. No CSS variables, no design tokens, all colors are inline hex values. |

---

## 2. Testing — ❌ Not Ready (5%)

### Current State

**One test file exists:** `lib/calculator/calculator.test.js` (313 lines, 31 tests)
- Uses Node.js native test runner (`node:test` + `node:assert/strict`)
- Covers: `getPostcodeDetails` (8 tests), `calculateFederalSTCs` (13 tests), `calculateNSWPRCs` (7 tests), `calculateWARebate` (7 tests), `calculateBatteryRebate` (6 tests)
- Tests edge cases: invalid postcodes, ineligible capacities, tiered calculations, date boundaries, input immutability, idempotency
- Tests match official government worked examples (e.g., NSW 14.4kWh → 284 PRCs)
- **These 31 tests are excellent quality** — well-structured, comprehensive edge case coverage

### What's Missing

| Category | Gap | Impact |
|----------|-----|--------|
| **API route tests** | Zero tests for any of the 14 API route handlers | No verification that login, cart, checkout, or order creation work correctly |
| **Component tests** | Zero React component tests (no Jest, no React Testing Library, no Playwright/Cypress) | No verification that UI renders correctly or handles user interactions |
| **Integration tests** | Zero end-to-end or integration tests | No verification that the full purchase flow works from login → browse → cart → checkout → order |
| **Auth flow tests** | Zero tests for registration, login, logout, middleware protection | Critical security path completely untested |
| **Database query tests** | Zero tests for Prisma queries, transactions, or schema constraints | Order creation transaction, cart upsert logic, facet computation — all untested |
| **Test infrastructure** | No Jest config, no Vitest, no Playwright config, no test runner configured for the app | Can't run any tests beyond `node --test calculator.test.js` |
| **CI test step** | No CI pipeline exists at all (see §8) | Tests can't run automatically on PR/merge |
| **Coverage reporting** | No coverage tool configured | Can't measure what's tested vs. untested |

### Specific Critical Untested Paths

- `POST /api/auth/login` — wrong password, missing fields, rate limiting, token signing
- `POST /api/auth/register` — duplicate email, missing ABN, existing org with same ABN
- `POST /api/orders` — empty cart, invalid shipping address, transaction rollback on failure
- `POST /api/cart` — adding out-of-stock product, quantity edge cases
- `middleware.js` — token validation, expiry, redirect behavior
- All Prisma transaction blocks — atomicity guarantees

---

## 3. Security — ❌ Not Ready (25%)

### 🔴 Critical Issues

| # | Issue | Location | Severity | Details |
|---|-------|----------|:--------:|---------|
| 1 | **JWT secret committed in plaintext** | `.env.example:1`, `.env.local:1` | CRITICAL | `JWT_SECRET=Q4mLz9xP2vK8sYtN7aBcE5rFwH1jDsU6gXnR3qLpZ0iMv` — this is the actual signing secret, not a placeholder. Anyone with repo access can forge valid JWT tokens for any user. Must be rotated immediately. |
| 2 | **Supabase credentials in committed file** | `.env.local:4-7` | CRITICAL | Contains `DATABASE_URL` with real Supabase pooler credentials (host, port, user, password). While `.gitignore` excludes `.env*`, the file is currently on disk. Verify it's not in git history; rotate DB password. |
| 3 | **No CORS configuration** | `next.config.mjs` | HIGH | API routes that set cookies have no CORS headers. `Access-Control-Allow-Origin` is not set. Cookies won't work cross-origin in production without explicit CORS config. |
| 4 | **No security headers** | `next.config.mjs` | HIGH | Missing: `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy`. |
| 5 | **No CSRF protection** | All mutating API routes | MEDIUM | Cookie uses `sameSite: 'lax'` (good baseline) but there's no double-submit CSRF token pattern for the checkout/order endpoint. |
| 6 | **Rate limiter won't scale** | `lib/rateLimit.js` | MEDIUM | In-memory `Map`-based rate limiter resets on every deploy/restart and isn't shared across instances. The code itself documents this at lines 1-8 as "known tech debt." |
| 7 | **No refresh token / session revocation** | `lib/auth.js`, `app/api/auth/login/route.js` | MEDIUM | Single JWT with 7-day expiry cannot be invalidated. No way to "log out everywhere" or revoke a stolen session. `Session` table exists in schema but is unused. |

### 🟡 Additional Security Gaps

| # | Issue | Location | Severity | Details |
|---|-------|----------|:--------:|---------|
| 8 | **No input validation library** | All API routes | MEDIUM | Validation is manual (regex, length checks, type checks). No Zod (recommended by ARCHITECTURE.md §14). Inconsistent — some routes validate, some don't. |
| 9 | **Error details leak in dev** | `app/api/auth/register/route.js:167-172` | LOW | Dev mode returns full `error.message` to client. Production mode returns generic "Something went wrong" — but this is `NODE_ENV`-gated, not a true production-safe pattern. |
| 10 | **No helmet/middleware for common web vulns** | Missing | LOW | No protection against clickjacking, MIME sniffing, XSS via headers. |
| 11 | **`secure` cookie flag depends on `NODE_ENV`** | `login/route.js:67`, `register/route.js:145` | LOW | Cookies set `secure: process.env.NODE_ENV === 'production'`. If `NODE_ENV=production` but behind a non-TLS proxy, cookies still have the secure flag set. Better to use an explicit `FORCE_SECURE_COOKIES` env var. |
| 12 | **No dependency vulnerability scanning** | Missing | LOW | No `npm audit` in CI, no Dependabot/Renovate. ARCHITECTURE.md §14 explicitly recommends Dependabot. |
| 13 | **Password hashing cost** | `lib/auth.js:7` | LOW | bcrypt cost factor of 10. ARCHITECTURE.md §5 recommends 12 minimum or Argon2id. |
| 14 | **No brute-force account enumeration protection** | `login/route.js:48-50` | LOW | Returns "Invalid credentials" for both wrong email AND wrong password — good. But timing could theoretically differ between "user not found" and "wrong password" code paths (DB query vs bcrypt compare). Mitigated by rate limiting. |

### ✅ Good Security Practices Observed

- Passwords hashed with bcrypt (never stored plaintext)
- JWT stored in httpOnly cookie (not localStorage — immune to XSS exfiltration)
- `sameSite: 'lax'` on cookies (mitigates most CSRF)
- Rate limiting on login (5 attempts/15min) and register endpoints
- Email normalization (`toLowerCase()`) before lookup
- Input validation on every API endpoint (manual but present)
- SQL injection impossible (Prisma parameterizes all queries, no `$queryRawUnsafe`)
- DB connection uses pooled PgBouncer (port 5432 session mode for Prisma transactions)

---

## 4. Error Handling & Logging — ❌ Not Ready (15%)

### Current State

**Error handling pattern across API routes:**
```js
try {
  // ... business logic ...
} catch (err) {
  console.error('Route error:', err)
  return Response.json({ error: 'Something went wrong' }, { status: 500 })
}
```

This pattern is used consistently across all 14 API route files. It:
- ✅ Prevents unhandled promise rejections from crashing the server
- ✅ Returns a generic error to the client (doesn't leak internals in production)
- ❌ Uses `console.error` — unstructured, no correlation ID, not aggregated
- ❌ Repeated verbatim in every route file (copy-paste, not a shared wrapper)
- ❌ No error classification (validation vs auth vs DB error all get 500)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 1 | **No structured logging** | 12 API route files | `console.error()` used in: `login/route.js:82`, `register/route.js:163`, `favourites/route.js:59,101,128`, `team/route.js:75`, `team/[memberId]/route.js:97,166`, `subscriptions/[membershipId]/route.js:130`, `company-profile/route.js:80`, `calculator/rebate/route.js:79`, `track-order/route.js:49`. No log levels, no JSON formatting, no metadata. |
| 2 | **No correlation/request IDs** | Entire codebase | Cannot trace a request through the system. If a checkout fails, there's no way to find all log lines for that specific request. |
| 3 | **No log aggregation** | N/A (infra) | No log drain, no centralized logging service (Axiom, Better Stack, Datadog). Logs exist only in ephemeral serverless function stdout. |
| 4 | **No error monitoring** | Missing | No Sentry, no error tracking, no alerting on elevated error rates. Production errors would be invisible until a user reports them. |
| 5 | **No structured error types** | All routes | ARCHITECTURE.md §9 prescribes an `AppError` class hierarchy (ValidationError, UnauthenticatedError, ForbiddenError, NotFoundError, ConflictError) with a central `withErrorHandling` wrapper. None of this exists. Each route has its own try/catch. |
| 6 | **Dev-mode error leaking** | `register/route.js:166-172` | Returns `error.message` to client when `NODE_ENV === 'development'`. |
| 7 | **Duplicate error handling** | All 14 route files | Every route has identical try/catch/500 pattern. ~200 lines of duplicated error-handling boilerplate. |
| 8 | **Frontend error handling** | Components | Error states exist in critical components (cart error, checkout error, login error) but use basic `setError()` + inline text. No toast notification system, no error boundary components (no `error.js` per route except `products/[slug]/not-found.js`). |

### Component Error Boundaries

| File | Exists? | Details |
|------|:-------:|---------|
| `app/products/error.js` | ❌ | Product listing page has no error boundary |
| `app/products/[slug]/error.js` | ❌ | Product detail has no error boundary |
| `app/checkout/error.js` | ❌ | Checkout has no error boundary |
| `app/account/*/error.js` | ❌ | No error boundaries in any account route |
| `app/products/[slug]/not-found.js` | ✅ | Basic "Product not found." message |

---

## 5. Configuration & Environment — ⚠️ Partial (40%)

### Environment Variables Analysis

| Variable | In `.env.example` | In `.env.local` | Used In |
|----------|:---:|:---:|----------|
| `JWT_SECRET` | ✅ (real value!) | ✅ (real value!) | `lib/auth.js`, `middleware.js` |
| `JWT_EXPIRES_IN` | ✅ (`7d`) | ✅ (`7d`) | `lib/auth.js:14` |
| `DATABASE_URL` | ❌ Missing | ✅ (pooled Supabase) | `lib/prisma.js:8`, `prisma.config.ts:23` |
| `DIRECT_URL` | ❌ Missing | ✅ (direct Supabase) | `prisma.config.ts:23` (migrations only) |
| `NODE_ENV` | ❌ Missing | ❌ (set by Next.js) | `login/route.js:67`, `register/route.js:145,168` |
| `NEXT_PUBLIC_STRIPE_KEY` | ❌ Missing | ❌ Missing | Would be needed for Stripe |
| `STRIPE_SECRET_KEY` | ❌ Missing | ❌ Missing | Would be needed for Stripe |
| `STRIPE_WEBHOOK_SECRET` | ❌ Missing | ❌ Missing | Would be needed for Stripe |
| `SMTP_*` or email provider keys | ❌ Missing | ❌ Missing | Would be needed for email verification/reset |

### Key Issues

| # | Issue | Details |
|---|-------|---------|
| 1 | `.env.example` is dangerously incomplete | Only 2 variables. Missing: `DATABASE_URL`, `DIRECT_URL`, Stripe keys, email provider keys. A new developer following `.env.example` would have no database connection. |
| 2 | `.env.example` contains real secrets | The JWT_SECRET is the actual production-intended value. This is a security incident. |
| 3 | `.env` file is confusing | Contains a local `prisma+postgres://localhost:51213/` URL — appears to be a Prisma dev server remnant. New developers won't know which `.env*` file to use. |
| 4 | `prisma.config.ts` loads `.env.local` with override | `config({ path: '.env.local', override: true })` — correct for migrations but opaque to new developers who might expect `.env` to be the canonical file. |
| 5 | No feature flags | No mechanism for toggling features (e.g., enable/disable credit accounts, beta features). |
| 6 | No runtime config validation | No check that required env vars are present at startup. Missing `DATABASE_URL` would cause a cryptic Prisma connection error at first query, not a clear startup failure. |
| 7 | `.env.local` contains all real secrets | While `.gitignore` excludes `.env*`, the file is present on disk. Verify it was never committed. |

---

## 6. Database & Data — ⚠️ Partial (65%)

### Schema Quality — ✅ Excellent

The Prisma schema (`prisma/schema.prisma`, 1066 lines, 35 models) is exceptionally well-designed:

| Feature | Quality |
|---------|---------|
| **Multi-schema architecture** | 8 Postgres schemas: `shared`, `identity`, `catalog`, `commerce`, `crm`, `inventory`, `billing`, `audit`. Clean bounded contexts. |
| **UUIDv7 primary keys** | Time-sortable, index-friendly, globally unique. Generated via `shared.uuid_generate_v7()` DB function. |
| **Soft deletes** | `deleted_at` on deletable entities. Partial unique indexes with `WHERE deleted_at IS NULL` — correct implementation. |
| **Foreign key strategy** | Proper cascade rules: `RESTRICT` on financial records (orders can't be deleted), `CASCADE` on owned children. |
| **Snapshot pattern** | Order/Quote items snapshot product name/price at creation time — correct for immutability of financial records. |
| **RBAC design** | Separate `OrganizationMember` (portal RBAC: owner/admin/purchaser/viewer) from `UserRole` (platform staff RBAC: admin/sales_rep/etc). |
| **Session/refresh token table** | Designed but not yet wired to auth flow. Has `revokedAt` and `rotatedFromSessionId` for rotation+reuse detection. |
| **Indexes** | All FKs indexed. Composite indexes on common query patterns. Partial indexes for soft-delete queries. GIN index for full-text search on products. All indexes explicitly named. |
| **Payment model** | Complete `Payment` model with `stripePaymentIntentId`, `stripeChargeId`, multi-status enum. |

### Migration Status — ✅ Good

| Migration | Description |
|-----------|-------------|
| `0001_initial` | Full initial schema: all 35 models, extensions, triggers, functions |
| `0002_add_organization_team_members` | Team members table addition |
| `0003_fix_uuid_generate_v7_overflow` | UUIDv7 byte-level overflow fix |
| `0004_fix_uuid_generate_v7_byte4_overflow` | Second UUIDv7 overflow fix |

4 migrations, all committed. Migration lock file present.

### Seed Data — ✅ Good

`prisma/seed.mjs` (1013 lines):
- 5 countries (AU, NZ, US, GB, CN)
- 5 platform roles (admin, sales_rep, credit_manager, warehouse_staff, support)
- 4 organizations with real-looking ABNs
- 5 staff users + 6 customer portal users
- 4 product categories (Solar Panels, Inverters, Battery Storage, Mounting Systems)
- 34 brands with logo paths
- 35+ products with realistic solar specs (wattage, cellType, technology, frameColor, etc.)
- Idempotent pattern (find-then-create)
- Dev password: `DevPassword123!`

### Data Gaps

| # | Issue | Details |
|---|-------|---------|
| 1 | **No backup/restore strategy** | No documented backup procedure. Supabase provides point-in-time recovery, but it's unclear if it's configured. No backup verification. |
| 2 | **No data retention policy** | No policy for how long soft-deleted records are kept, when they're purged. ARCHITECTURE.md §11 notes ATO requires 5-year financial record retention — not implemented. |
| 3 | **No data anonymization for dev** | Seed data uses fictional but realistic ABNs and email addresses. No risk of PII exposure (these are synthetic), but the practice should be documented. |
| 4 | **RLS policies unverifiable** | ARCHITECTURE.md §6 recommends Row-Level Security on every table. Cannot verify if RLS policies are applied in the actual Supabase project. |
| 5 | **No audit log implementation** | `AuditLog` table exists in schema but the Prisma Client Extension for auto-auditing (ARCHITECTURE.md §11) is not implemented. No audit entries are being written. |
| 6 | **No scheduled cleanup jobs** | Expired `PasswordResetToken` and `EmailVerificationToken` rows have no cleanup job. Expired `Session` rows have no cleanup. These tables will grow unbounded. |
| 7 | **Credential exposure in seed** | The seed script hardcodes `const DEV_PASSWORD = 'DevPassword123!'`. Standard practice for dev seed, but a reminder that this should never run against production. |

---

## 7. Performance & Scalability — ⚠️ Partial (50%)

### ✅ Good Patterns

| Pattern | Evidence |
|---------|----------|
| **No N+1 in API routes** | Prisma `include` used correctly — product list loads brand/category/images in one query. Cart loads items/products/images in one query. |
| **Database-level filtering** | All filtering, sorting, and pagination happen in Prisma queries — no "fetch everything, filter in JS." |
| **Pagination** | Offset-based pagination via `skip`/`take` (fine for current catalog size; should migrate to cursor pagination at scale per ARCHITECTURE.md §8). |
| **Column selection** | Category and brand list endpoints use `select` to return only needed fields. |
| **Prisma singleton** | Global PrismaClient instance reused across hot reloads (standard pattern). |
| **Connection pooling** | Using Supabase PgBouncer pooler (port 5432 session mode for Prisma interactive transactions). |

### ⚠️ Concerns

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 1 | **Facets computed in memory** | `app/api/products/route.js:159-237` | Loads ALL products in category to compute facet counts. Fine for <1000 products, will degrade linearly. Should use `groupBy` or a materialized view at scale. |
| 2 | **No caching layer** | Entire app | No Redis/Upstash. Category tree, brand list, and homepage data are fetched fresh on every request. Product detail pages have no ISR revalidation configured. |
| 3 | **In-memory rate limiter** | `lib/rateLimit.js` | Already documented. Won't work across multiple serverless instances. |
| 4 | **No image optimization for brand logos** | `app/brands/[slug]/page.js:41-42` | Reads entire brand directory with `fs.readdirSync` on every request. Should be cached or use a static manifest. |
| 5 | **No bundle optimization** | `next.config.mjs` | No bundle analyzer, no code splitting configuration beyond Next.js defaults. |
| 6 | **No load testing** | Missing | No k6, Artillery, or other load test artifacts. Cannot predict behavior under real traffic. |
| 7 | **Cart total computed client-side** | `CartDrawer.jsx:51-63`, `CheckoutClient.jsx:23-28` | Both cart drawer and checkout page recompute subtotal/GST/total from items client-side. Fine for correctness (avoids stale server totals) but means prices are visible in client JS for non-authenticated users who could inspect network responses. |

### Scalability Assessment

| Scale | Assessment |
|-------|------------|
| **<100 concurrent users** | ✅ Should perform fine with current architecture |
| **100–1000 concurrent users** | ⚠️ In-memory rate limiter and facet computation become issues; need Redis cache |
| **1000+ concurrent users** | ❌ Facets need DB-level aggregation; offset pagination degrades; need read replicas |
| **Multi-region** | ❌ No CDN configuration beyond Next.js defaults; no geo-distributed database |

---

## 8. Infrastructure & Deployment — ❌ Not Ready (5%)

### What Exists

| Item | Status |
|------|--------|
| `npm run dev` | ✅ Works (Turbopack dev server) |
| `npm run build` | ⚠️ Not verified (no CI to confirm successful production build) |
| `npm run start` | ⚠️ Exists (standard Next.js start) but no production runtime config |
| `npm run lint` | ✅ ESLint with core-web-vitals |
| `npm run db:seed` | ✅ Runs seed script |

### What's Missing

| # | Item | Details |
|---|------|---------|
| 1 | **Dockerfile** | None. No containerization. |
| 2 | **CI/CD pipeline** | No GitHub Actions, no GitLab CI, no deployment automation. No PR checks (lint, test, build). No automated deployment on merge. |
| 3 | **Deployment configuration** | No `vercel.json`, no `fly.toml`, no `render.yaml`, no Kubernetes manifests. |
| 4 | **Readiness/liveness probes** | `/api/health` returns `{status: 'ok', db: 'connected'}` — good but doesn't distinguish "alive" from "ready to serve traffic." No separate readiness endpoint. |
| 5 | **Rollback strategy** | No documented rollback procedure. No database migration rollback plan. |
| 6 | **Environment-specific config** | No dev/staging/prod environment separation beyond `NODE_ENV`. |
| 7 | **SSL/TLS configuration** | Unverifiable from code. Depends on hosting platform. |
| 8 | **Domain/DNS configuration** | Unverifiable from code. |
| 9 | **Process manager** | None. Next.js start handles this, but no PM2/systemd/supervisor config for non-Vercel deployments. |
| 10 | **Database migration automation** | Manual — `npx prisma migrate deploy` must be run manually. No post-deploy migration hook. |

---

## 9. Documentation — ❌ Not Ready (20%)

### Existing Documentation

| Document | Lines | Quality | Status |
|----------|:-----:|---------|--------|
| `README.md` | 36 | ❌ Poor | Default `create-next-app` template. References `create-next-app`, Geist font, Vercel deployment — none relevant to this project. No setup instructions, no env var docs, no architecture overview. |
| `ARCHITECTURE.md` | 372 | ✅ Excellent | Comprehensive architecture decision record. Covers auth strategy, DB design, folder structure, caching, security, scalability, coding standards. However, describes TARGET state — not all decisions are implemented. |
| `DATABASE_SCHEMA.md` | 764 | ✅ Excellent | Complete ERD-level schema documentation. Every table, column, constraint, index documented. Includes trade-off discussions and implementation notes. |
| `PROGRESS_REPORT.md` | 235 | ❌ Stale | Describes the project before the Prisma migration — no API routes, no auth, no database, hardcoded data only. Reads like a different codebase. Actively misleading. |
| `AUDIT.md` | 319 | ❌ Stale | Describes the MongoDB/Mongoose version — references Mongoose models, missing cart API, etc. All addressed in the Prisma migration but the audit was never updated. |
| `AGENTS.md` | ~20 | ✅ OK | Agent context/rules for Hermes AI assistant. Contains accurate project conventions. |

### What's Missing

| # | Item | Details |
|---|------|---------|
| 1 | **Project README** | Should describe: what NexonEcom is, tech stack, local setup (clone → install → env vars → migrate → seed → dev), project structure overview, deployment guide. |
| 2 | **API documentation** | No OpenAPI/Swagger spec. No list of endpoints, request/response shapes. A new frontend developer would need to read route files. |
| 3 | **Setup guide** | New developer onboarding docs. Current README's "Getting Started" section describes `create-next-app` — not this project. |
| 4 | **Environment variables guide** | `.env.example` is incomplete. No explanation of what each variable does or where to get values (Supabase dashboard, Stripe dashboard). |
| 5 | **Deployment guide** | No instructions for deploying to production. |
| 6 | **Contributing guide** | No CONTRIBUTING.md. No PR template, no code review guidelines. |
| 7 | **Changelog** | No CHANGELOG.md. No release notes. |
| 8 | **Architecture decision records** | ARCHITECTURE.md serves this purpose, but no individual ADRs for specific decisions. |

---

## 10. Code Quality — ⚠️ Partial (55%)

### ✅ Strengths

| Area | Evidence |
|------|----------|
| **Consistent JS/JSX** | Pure JavaScript throughout (by design — ARCHITECTURE.md §20). No `.ts`/`.tsx` files exist. |
| **Clean naming** | CamelCase React components, kebab-case files, camelCase functions. Prisma models PascalCase singular. |
| **Good comments** | Comments explain WHY (non-obvious invariants, trade-offs, migration notes) not WHAT (code is self-documenting). |
| **Auth consistency** | All protected routes follow same pattern: get token → verify → extract userId. `getTeamAccess()` helper reduces repetition. |
| **ESLint configured** | `eslint.config.mjs` with `@next/core-web-vitals`. |
| **No TypeScript** | By intentional design choice — not a gap. JSDoc typedefs recommended but not implemented. |

### ⚠️ Issues

| # | Issue | Location | Severity | Details |
|---|-------|----------|:--------:|---------|
| 1 | **Massive commented-out code block** | `components/CartDrawer.jsx:440-743` | MEDIUM | ~300 lines of old cart drawer code left as comments. Should be removed. |
| 2 | **Commented-out code in ProductDetail** | `components/ProductDetail.jsx:489-860` | MEDIUM | ~370 lines of an alternative add-to-cart layout left as comments. |
| 3 | **Duplicate `validateTeamMember()` and `formatMember()`** | `app/api/account/team/route.js:88-141` and `[memberId]/route.js:179-226` | MEDIUM | Both files contain identical copies of these functions. Should be extracted to a shared module. |
| 4 | **Three unused standalone components** | `components/ProductFilters.jsx`, `components/ProductGrid.jsx`, `components/SortDropdown.jsx` | LOW | These exist as separate files but the products page and BrandProducts component have all filtering/grid/sort logic built inline. The standalone components are dead code. |
| 5 | **`console.error` in 12 files** | See §4 item 1 for full list | LOW | Should be replaced with structured logger. |
| 6 | **Repeated Mongoose→Prisma field mapping** | 6+ locations | LOW | The same `id→_id`, `images[].url→images[]`, `price→Number`, `stockQuantity→stock` mapping is duplicated in: `app/api/products/route.js:139-147`, `app/api/products/[id]/route.js:34-42`, `app/api/cart/route.js:38-48`, `app/api/orders/route.js:140-148`, `app/api/favourites/route.js:37-45`, `app/checkout/page.js:31-41`. Extract to a shared utility. |
| 7 | **No Prettier config** | Missing | No `.prettierrc`, no formatting automation. Code style is consistent but unenforced. |
| 8 | **No pre-commit hooks** | Missing | No `husky` or `lint-staged`. Lint/format errors can be committed. |
| 9 | **Fixed-pixel CSS values** | Throughout | `h-[400px]`, `max-w-[1240px]`, `w-[48px]`, `px-[100px]` — hardcoded pixel values instead of relative units or Tailwind's built-in scale. Reduces responsiveness. |
| 10 | **News data hardcoded** | `lib/newsData.js` (147 lines, 12KB) | LOW | 5 full-length news articles with ~500-word bodies each, hardcoded in JS. Should be in a CMS or at minimum markdown files. |
| 11 | **No `loading.js` / `error.js` on key routes** | Most `app/` subdirectories | LOW | Only `products/loading.js` and `products/[slug]/not-found.js` exist. Checkout, account, brand detail, and order confirmation have no loading states or error boundaries. |
| 12 | **`uiSlice` is partially unused** | `store/slices/uiSlice.js` | LOW | `filtersOpen` and `activeCategory` are defined but the products page now manages these via URL search params, not Redux. The slice exists but is barely used. |
| 13 | **Navbar auth state incomplete** | `components/Navbar.jsx` | LOW | Shows "Sign In" when logged out, hides it when logged in — but doesn't show user name, avatar, or logout button. |
| 14 | **Unused lint disable** | `components/CartDrawer.jsx:25` | LOW | `// const [closing, setClosing] = useState(false)` — old state variable left commented out. |

### Dead Code Inventory

| File | Lines | Description |
|------|:-----:|-------------|
| `CartDrawer.jsx` | 440–743 | Old cart drawer implementation (~300 lines) |
| `ProductDetail.jsx` | 489–860 | Old add-to-cart button layout (~370 lines) |
| `ProductFilters.jsx` | 1–98 | Standalone filter component (unused) |
| `ProductGrid.jsx` | 1–26 | Standalone grid component (unused) |
| `SortDropdown.jsx` | 1–30 | Standalone sort component (unused) |
| `AppliancesGrid.jsx` | (entire file) | Commented out on homepage |
| **Total dead code** | **~900+ lines** | |

---

## Unverifiable Items (Require Runtime/Infrastructure Access)

These items are flagged as uncertain because they cannot be confirmed from code alone:

| # | Item | Uncertainty |
|---|------|-------------|
| 1 | **Supabase point-in-time recovery** | Is PITR enabled on the Supabase project? Cannot verify from code. |
| 2 | **RLS policies on Supabase** | ARCHITECTURE.md §6 recommends RLS on all tables. Are policies applied in the Supabase dashboard? Cannot verify from code. |
| 3 | **Database backup schedule** | Is there an automated backup? Cannot verify from code. |
| 4 | **Stripe webhook endpoint security** | Once implemented, webhook signature verification must be tested. Cannot verify now. |
| 5 | **SSL certificate** | Depends on hosting platform. Cannot verify from code. |
| 6 | **DNS configuration** | Is the production domain configured? Cannot verify from code. |
| 7 | **Supabase plan limits** | Is the current plan sufficient for expected traffic? Cannot verify from code. |
| 8 | **Email delivery infrastructure** | No email provider configured. Will need SendGrid/Resend/Postmark for password reset and verification emails. |
| 9 | **Build succeeds in production mode** | `npm run build` was not verified. Potential issues: Unsplash whitelist only, no `placehold.co` allowance for `AppliancesGrid`. |
| 10 | **Seed idempotency under concurrent runs** | Seed script uses find-then-create (race-prone under concurrency) — fine for single-dev, but mentioned in seed comments. |

---

## Complete Punch List (Prioritized)

### 🔴 Blocker — Must Fix Before Any Production Traffic

| # | Area | Task | Effort | Files |
|---|------|------|:------:|-------|
| 1 | Security | **Rotate JWT secret immediately.** Generate new secret, move to proper secrets management, audit for tokens signed with old secret. | 0.5d | `.env.example:1`, `.env.local:1`, `lib/auth.js` |
| 2 | Security | **Remove Supabase credentials from committed files.** Verify `.env.local` not in git history. Rotate DB password if it was ever pushed. | 0.5d | `.env.local:4-7` |
| 3 | Payments | **Implement Stripe integration.** Create Checkout Session API endpoint, webhook handler for `checkout.session.completed`, Stripe key config, redirect flow. Update checkout page to redirect to Stripe instead of order confirmation. | 3-5d | `app/api/orders/route.js`, `components/CheckoutClient.jsx:56`, new `app/api/webhooks/stripe/route.js` |
| 4 | Infra | **Set up CI/CD pipeline.** GitHub Actions: lint → test → build on PR; deploy on merge to main. Add Dockerfile. | 2d | New `.github/workflows/`, `Dockerfile` |
| 5 | Security | **Add CORS and security headers.** `Access-Control-Allow-Origin`, CSP, HSTS, X-Content-Type-Options, X-Frame-Options in `next.config.mjs`. | 0.5d | `next.config.mjs` |

### 🟠 High — Required for Production Launch

| # | Area | Task | Effort | Files |
|---|------|------|:------:|-------|
| 6 | Auth | **Implement password reset flow.** API endpoint to send reset email, token verification endpoint, password update endpoint. | 1.5d | `app/api/auth/forgot-password/route.js`, `app/api/auth/reset-password/route.js` |
| 7 | Auth | **Implement email verification.** Send verification email on register, verification endpoint, enforce before order placement. | 1d | `app/api/auth/register/route.js`, new route |
| 8 | Logging | **Replace console.error with structured logger.** Install pino, create `lib/logger.js`, replace all 12 `console.error` calls. Add correlation IDs. | 1d | 12 API route files, new `lib/logger.js` |
| 9 | Monitoring | **Add error monitoring.** Set up Sentry or equivalent. Wire into API routes and client-side. | 0.5d | `app/layout.js`, API routes |
| 10 | Security | **Replace in-memory rate limiter with Redis/Upstash.** Same interface, different backing store. | 1d | `lib/rateLimit.js` |
| 11 | Security | **Add refresh token rotation.** Wire the existing `Session` table to auth flow. Short-lived access token (15min) + refresh token with rotation and reuse detection. | 2d | `lib/auth.js`, `app/api/auth/login/route.js`, new `app/api/auth/refresh/route.js` |
| 12 | Security | **Add input validation library (Zod).** Create schemas for all API endpoints. Replace manual validation. | 2d | All 14 API route files |
| 13 | Testing | **Add API route tests.** Test login, register, cart CRUD, order creation, product listing. | 3d | New `tests/` directory |
| 14 | Testing | **Add critical-path e2e test.** Full flow: register → login → browse → add to cart → checkout → order confirmation. | 1d | New Playwright/Cypress config |
| 15 | Config | **Complete `.env.example`.** Document all env vars with descriptions and example values. No real secrets. | 0.5d | `.env.example` |
| 16 | Config | **Add env var validation at startup.** Validate all required env vars are present on server start. | 0.25d | New `lib/env.js` |

### 🟡 Medium — Should Fix Before Significant User Traffic

| # | Area | Task | Effort | Files |
|---|------|------|:------:|-------|
| 17 | Functionality | **Implement contact form submission.** `POST /api/contact` endpoint. Send email or store in DB. | 0.5d | `app/contact/page.js`, new route |
| 18 | Functionality | **Wire credit account data.** Replace hardcoded zeros with actual DB queries. Implement credit account creation/management. | 2d | `lib/account/getAccountDashboardData.js:89-104` |
| 19 | Functionality | **Implement search.** API endpoint for full-text search on products. Search results page. | 1d | `app/api/products/route.js`, new page |
| 20 | Payments | **Add idempotency keys to order creation.** `Idempotency-Key` header on `POST /api/orders`. Prevent duplicate orders on network retry. | 0.5d | `app/api/orders/route.js` |
| 21 | Infra | **Add health check probes.** Separate readiness (DB connected + migrations applied) from liveness (process alive). | 0.25d | `app/api/health/route.js` |
| 22 | Code Quality | **Extract duplicated Mongoose→Prisma mapping.** Create `lib/serialize.js` with shared mapping functions. Update 6+ call sites. | 0.5d | New `lib/serialize.js`, 6 files |
| 23 | Code Quality | **Extract duplicated validateTeamMember/formatMember.** Create shared `lib/account/teamHelpers.js`. | 0.25d | `app/api/account/team/route.js`, `[memberId]/route.js` |
| 24 | Code Quality | **Remove ~900 lines of dead code.** Delete commented-out code blocks and unused components. | 0.25d | `CartDrawer.jsx`, `ProductDetail.jsx`, `ProductFilters.jsx`, etc. |
| 25 | SEO | **Add per-page metadata.** `generateMetadata` for product detail, category, products listing, checkout pages. | 0.5d | Multiple page files |
| 26 | Docs | **Rewrite README.** Project description, setup guide, env var docs, architecture overview, deployment guide. | 1d | `README.md` |
| 27 | Docs | **Archive or delete stale docs.** Mark `PROGRESS_REPORT.md` and `AUDIT.md` as superseded. | 0.1d | `PROGRESS_REPORT.md`, `AUDIT.md` |
| 28 | Database | **Add expiration cleanup jobs.** Cron job to purge expired `PasswordResetToken`, `EmailVerificationToken`, and revoked `Session` rows. | 0.5d | New cron/script |

### 🟢 Low — Nice-to-Have, Not Launch-Blocking

| # | Area | Task | Effort | Files |
|---|------|------|:------:|-------|
| 29 | UI | **Complete stub pages.** Build out `/downloads`, `/events` pages with actual content. | 1d | `app/downloads/page.js`, `app/events/page.js` |
| 30 | UI | **Fix footer dead links.** Replace all `href="#"` with actual page links. | 0.25d | `components/Footer.jsx` |
| 31 | UI | **Show user name in Navbar when authenticated.** Add logout button. | 0.5d | `components/Navbar.jsx` |
| 32 | UI | **Add loading/error boundaries to all routes.** `loading.js` and `error.js` for checkout, account, brand detail. | 0.5d | Multiple `app/` subdirectories |
| 33 | UI | **Product detail image gallery.** Show all product images as thumbnails with main image selection. | 0.5d | `components/ProductDetail.jsx` |
| 34 | UI | **Fix CategoryHeroSection mismatched content.** Replace furniture content with solar/energy categories. | 0.25d | `components/CategoryHeroSection.jsx` |
| 35 | UI | **Consolidate design system.** Extract repeated colors to CSS variables or Tailwind theme config. Pick one primary blue. | 0.5d | `app/globals.css`, multiple components |
| 36 | UI | **Improve responsive breakpoints.** Replace hardcoded pixel values with Tailwind responsive classes. | 0.5d | Multiple components |
| 37 | Config | **Replace `NODE_ENV` check for secure cookies with explicit env var.** `FORCE_SECURE_COOKIES=true` more robust than depending on `NODE_ENV`. | 0.1d | `login/route.js:67`, `register/route.js:145` |
| 38 | Config | **Add `next/image` remote patterns.** Add any CDN domains used for product images beyond Unsplash. | 0.1d | `next.config.mjs` |
| 39 | Code Quality | **Add Prettier + pre-commit hooks.** Automate formatting. | 0.25d | New `.prettierrc`, `.husky/` |
| 40 | Code Quality | **Add Dependabot/Renovate.** Automated dependency updates for security patches. | 0.1d | New `.github/dependabot.yml` |
| 41 | Testing | **Add component tests.** React Testing Library tests for ProductCard, CartDrawer, CheckoutClient. | 2d | New test files |
| 42 | Testing | **Set up coverage reporting.** Configure Istanbul/c8 coverage thresholds for CI. | 0.25d | CI config |
| 43 | Data | **Add data anonymization note.** Document that seed data is synthetic and safe for dev/staging. | 0.1d | `prisma/seed.mjs` header comment |

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| Total source files | 157 |
| API endpoints | 28 (across 14 route files) |
| React components | 40 |
| Redux slices | 4 |
| Prisma models | 35 |
| Postgres schemas | 8 |
| Database migrations | 4 |
| Test files | 1 (31 tests) |
| `console.error` calls | 12 |
| Dead code lines | ~900 |
| `.env.example` variables | 2 (of 6+ needed) |
| Hardcoded secrets in repo | 2 (JWT_SECRET, DB credentials) |
| Stub pages | 4 (forgot-password, downloads, events, contact-submit) |
| Missing API routes | 5 (stripe checkout, stripe webhook, password reset, email verify, contact submit) |

**Overall Verdict:** The app has a solid foundation — well-architected database, working auth, complete API layer, and a functional frontend. The gap to production is well-understood and scoped, with no architectural unknowns remaining. The critical path is: implement Stripe payments → harden security (secrets, CORS, headers, refresh tokens) → add structured logging/monitoring → set up CI/CD → add testing. Once these blockers are resolved, the app can launch and iterate from a strong base.
