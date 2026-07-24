# NexonEcom — Comprehensive Audit

---

## 1. Stack & Config Drift

| Dependency | Version | Status |
|---|---|---|
| next | 16.2.7 | ✅ |
| react / react-dom | 19.2.4 | ✅ |
| tailwindcss | ^4.3.0 (via @tailwindcss/postcss) | ✅ — v4, no tailwind.config.js |
| @reduxjs/toolkit | ^2.12.0 | ✅ |
| react-redux | ^9.3.0 | ✅ |
| mongoose | ^9.7.0 | ✅ |
| jsonwebtoken | ^9.0.3 | ✅ |
| bcryptjs | ^3.0.3 | ✅ |
| framer-motion | ^12.40.0 | ✅ |
| lucide-react | ^1.17.0 | ✅ |
| dotenv | ^17.4.2 | ✅ (seed script only) |
| stripe | **NOT INSTALLED** | ⚠️ Referenced in Order model schema fields only |
| jose | **NOT INSTALLED** | ⚠️ No middleware exists, so not needed yet |

**Unused deps:** `lightningcss` and `lightningcss-darwin-arm64` are explicit deps (workaround for Node 18 native binary issue per project memory). Not technically unused — required for build.

**Language:** Pure JavaScript (`.js`/`.jsx`). `jsconfig.json` exists (`@/*` path alias), no `tsconfig.json`.

---

## 2. Routes Inventory

| Route | File | Server/Client | Data Source | Auth Gate |
|-------|------|:---:|-------------|:---:|
| `/` | `app/page.js` | Server | Static — composites 5 hardcoded components + 1 API-driven (BrandPartners) | Public |
| `/products` | `app/products/page.js` | Client (Suspense wrapper) | API: `/api/products`, `/api/categories`, `/api/brands` | Public |
| `/products/[slug]` | `app/products/[slug]/page.js` | Server (async) | DB: `Product.findOne({ slug })` | Public |
| `/products/[slug]/not-found.js` | Static fallback | Server | Static text "Product not found." | Public |
| `/products/loading.js` | Spinner | Server | Static spinner | Public |
| `/category/[slug]` | `app/category/[slug]/page.js` | Server | Redirect only: `redirect('/products?category=${slug}')` | Public |
| `/about` | `app/about/page.js` | Server | Static — hardcoded mission/values copy | Public |
| `/brands` | `app/brands/page.js` | Server | Wraps `<BrandPartners />` (API-driven) | Public |
| `/promotions` | `app/promotions/page.js` | Server | Static — hardcoded battery sale packages | Public |
| `/news` | `app/news/page.js` | Server | Wraps `<NewsEvents />` (hardcoded articles) | Public |
| `/login` | `app/login/page.js` | Client | API: `POST /api/auth/login` | Public |
| `/signup` | `app/signup/page.js` | Client | API: `POST /api/auth/register` | Public |
| `/calculator` | `app/calculator/page.js` | Server | **Stub** — just `<h1>Calculator</h1>` | Public |
| `/downloads` | `app/downloads/page.js` | Server | **Stub** — just `<h1>Downloads</h1>` | Public |
| `/events` | `app/events/page.js` | Server | **Stub** — just `<h1>Events</h1>` | Public |
| `/contact` | `app/contact/page.js` | Server | **Stub** — just `<h1>Contact Us</h1>` | Public |

**Orphan links:** Navbar links to `/track-order` and `/favourites` — these pages **don't exist** (404).

---

## 3. Middleware

**`middleware.js` does NOT exist.** Zero server-side route protection. Every API route handles its own auth (or doesn't). There is no `jose` library installed — all JWT handling is via `jsonwebtoken` in route handlers only.

If auth gating is needed (e.g., protect `/api/cart`, admin routes), middleware must be created from scratch with `jose` for Edge compatibility.

---

## 4. Models — Exact Current Schema

### `models/User.js`
| Field | Type | Required | Default | Notes |
|-------|------|:---:|---------|-------|
| fullName | String | ✅ | — | trim |
| email | String | ✅ | — | unique, lowercase, trim |
| password | String | ✅ | — | `select: false` |
| abn | String | ✅ | — | trim |
| companyName | String | ✅ | — | trim |
| tradingName | String | — | `''` | trim |
| businessAddress | String | ✅ | — | trim |
| gst | String | — | `'Yes'` | enum: `['Yes', 'No']` |
| hearAboutUs | String | — | `''` | |
| installations | String | — | `''` | |
| phone | String | ✅ | — | trim |
| role | String | — | `'user'` | enum: `['user', 'admin']` |
| createdAt/updatedAt | — | — | — | `timestamps: true` |

### `models/Product.js`
| Field | Type | Required | Default | Notes |
|-------|------|:---:|---------|-------|
| name | String | ✅ | — | trim |
| slug | String | ✅ | — | unique |
| sku | String | ✅ | — | trim |
| description | String | — | — | |
| price | Number | ✅ | — | min: 0 |
| compareAtPrice | Number | — | — | |
| stock | Number | — | 0 | min: 0 |
| images | [String] | — | — | |
| wattage | Number | — | — | min: 0 |
| cellType | String | — | `''` | enum: `['N-Type','P-Type','']` |
| technology | String | — | — | trim |
| frameColor | String | — | — | trim |
| cellNumber | String | — | — | trim |
| manufacturer | String | — | — | trim |
| efficiency | String | — | — | trim |
| warranty | String | — | — | trim |
| datasheet | String | — | — | trim |
| category | ObjectId | ✅ | — | ref: `'Category'` |
| brand | ObjectId | — | — | ref: `'Brand'` |
| isFeatured | Boolean | — | false | |
| isActive | Boolean | — | true | |

Indexes: `{ name: 'text', description: 'text' }`, `{ technology: 1 }`, `{ cellType: 1 }`, `{ wattage: 1 }`, `{ isFeatured: 1 }`.

### `models/Category.js`
| Field | Type | Required | Default |
|-------|------|:---:|---------|
| name | String | ✅ | — |
| slug | String | ✅ | — |
| description | String | — | `''` |
| icon | String | — | `''` |
| image | String | — | `''` |

### `models/Brand.js`
| Field | Type | Required | Default |
|-------|------|:---:|---------|
| name | String | ✅ | — |
| slug | String | ✅ | — |
| logoUrl | String | — | `''` |
| website | String | — | `''` |
| description | String | — | `''` |

### `models/Cart.js` — ⚠️ BROKEN
```js
const cartItemSchema = new mongoose.Schema({   // ← missing `import mongoose from 'mongoose'`
```
| Field | Type | Required | Default | Notes |
|-------|------|:---:|---------|-------|
| user | ObjectId | ✅ | — | ref: `'User'`, unique |
| items | [cartItemSchema] | — | — | |
| items[].product | ObjectId | ✅ | — | ref: `'Product'` |
| items[].quantity | Number | ✅ | — | min: 1 |

**BUG:** Line 1 references `mongoose` but the file has no `import mongoose from 'mongoose'`. This model will throw `ReferenceError: mongoose is not defined` if imported.

### `models/Order.js`
| Field | Type | Required | Default |
|-------|------|:---:|---------|
| user | ObjectId | ✅ | ref: `'User'` |
| items | [orderItemSchema] | — | — |
| items[].product | ObjectId | ✅ | ref: `'Product'` |
| items[].name | String | — | — (snapshot) |
| items[].price | Number | — | — (snapshot) |
| items[].quantity | Number | ✅ | min: 1 |
| shippingAddress.* | String | — | — |
| subtotal | Number | — | — |
| total | Number | — | — |
| status | String | — | `'pending_payment'` |
| stripeSessionId | String | — | — |
| stripePaymentIntentId | String | — | — |

### Schema vs Code Discrepancies
- **Login API returns `fullName`** → schema has `fullName` ✅
- **Register API accepts `fullName`** → schema has `fullName` ✅
- **`/api/auth/me` returns `fullName`** → consistent ✅
- No component reads `user.fullName` yet — Navbar doesn't show username, just "Sign In" link

---

## 5. API Routes — Full Inventory

| Route | Methods | Auth | DB | Request → Response |
|-------|:---:|:---:|:---:|---------------------|
| `/api/health` | GET | ❌ Open | ✅ | `{}` → `{ status: "ok", db: "connected" }` |
| `/api/auth/register` | POST | ❌ Open | ✅ | `{ fullName, email, password, abn, companyName, tradingName, businessAddress, gst, hearAboutUs, installations, phone }` → `{ user: { id, fullName, email, role } }` + httpOnly cookie |
| `/api/auth/login` | POST | ❌ Open | ✅ | `{ email, password }` → `{ user: { id, fullName, email, role } }` + httpOnly cookie |
| `/api/auth/me` | GET | ✅ Cookie (JWT) | ✅ | Cookie → `{ user: { id, fullName, email, role } }` or `{ user: null }` |
| `/api/auth/logout` | POST | ❌ Open | ❌ | `{}` → `{ success: true }` (deletes cookie) |
| `/api/categories` | GET | ❌ Open | ✅ | `{}` → `{ categories: [...] }` (all, sorted by name) |
| `/api/brands` | GET | ❌ Open | ✅ | `{}` → `{ brands: [...] }` (all, sorted by name) |
| `/api/products` | GET | ❌ Open | ✅ | Query params (category, brand, technology, cellType, cellNumber, wattage, frameColor, sort, page, limit, facets) → `{ products, pagination, facets? }` |
| `/api/products/[id]` | GET | ❌ Open | ✅ | `/:id` (ObjectId or slug) → `{ product }` or 404 |
| `/api/cart` | — | — | — | **DOES NOT EXIST** — `ProductDetail.jsx` calls `POST /api/cart` but no route file exists |

**Auth pattern:** Cookie-based JWT. Token name: `token`. Flags: `httpOnly: true`, `secure: NODE_ENV === 'production'`, `sameSite: 'lax'`, `maxAge: 7 days`, `path: '/'`.

---

## 6. Auth Flow — End to End

1. **Register** → `POST /api/auth/register` → hashes password (bcryptjs, 10 rounds) → creates User document → signs JWT (`{ userId, role }`) → sets `token` cookie → returns `{ user: { id, fullName, email, role } }` → client dispatches `setUser(data.user)` → redirects to `/`
2. **Login** → `POST /api/auth/login` → finds user by email + `.select('+password')` → compares hash → same token/cookie flow as register
3. **Hydration** → `AuthInitializer.jsx` runs `useEffect` once on mount → `GET /api/auth/me` → verifies cookie JWT → dispatches `setUser(data.user)` or leaves user null
4. **Logout** → `POST /api/auth/logout` → deletes `token` cookie → client dispatches `logout()` (clears user state)
5. **JWT payload:** `{ userId, role, iat, exp }` — no `email` or `fullName` in token (these come from DB lookup in `/me`)

**Cookie name:** `token`. **No CSRF token.** **No refresh token.**

---

## 7. Redux Store

### authSlice — ✅ ACTIVE
```js
initialState: { user: null, isAuthenticated: false, loading: false }
reducers: setUser, logout, setLoading
```
**Used by:** `AuthInitializer.jsx` (setUser), `login/page.js` (setUser), `signup/page.js` (setUser). `logout` is exported but **never dispatched** by any component. `setLoading` is exported but **never dispatched** — loading state is managed via local `useState` in login/signup pages instead.

### cartSlice — ⚠️ DEAD CODE
```js
initialState: { items: [], isOpen: false }
reducers: setCart, toggleCart
```
**NOT dispatched anywhere.** 0 components use `useSelector` on cart state. The `isOpen` field suggests a cart drawer was planned but never built.

### uiSlice — ⚠️ DEAD CODE
```js
initialState: { filtersOpen: false, activeCategory: null }
reducers: setFiltersOpen, setActiveCategory
```
**NOT dispatched anywhere.** The products page manages category state via URL params (`category=...`), not Redux.

---

## 8. Cart Implementation Status

| Layer | Status |
|-------|--------|
| `models/Cart.js` | Schema defined but **broken** (missing mongoose import) |
| `store/slices/cartSlice.js` | Defined, **completely unused** |
| `app/api/cart/route.js` | **Does not exist** |
| Cart UI (drawer, page, icon) | **Does not exist** |
| Add-to-cart button | Exists in `ProductDetail.jsx` → calls `POST /api/cart` (404) |

`ProductDetail.jsx` line 9:
```js
await fetch('/api/cart', { method: 'POST', body: JSON.stringify({ productId, quantity }) })
```
This call silently fails (404). No error handling, no Redux update, no UX feedback.

---

## 9. Pricing / Auth-Gate Logic

- **`ProductCard.jsx` line 31:** `$${product.price.toFixed(2)}` — renders price **unconditionally**, no auth check
- **`ProductDetail.jsx` line 44:** `$${product.price.toFixed(2)}` — same, unconditional
- **`products/page.js` line 358:** `"Login for price"` — button text, but it's a **dead button** (no onClick, no href, no `<Link>`)

The products listing page pretends prices are hidden, but ProductCard (which is a separate component, unused by the products page) shows prices freely. The product detail page also shows prices freely. There is zero auth-gating anywhere in the codebase.

---

## 10. Checkout & Stripe

- **Stripe npm package:** NOT installed
- **Stripe API keys:** NOT in `.env.local`
- **Stripe-related code:** Only `stripeSessionId` and `stripePaymentIntentId` fields in `models/Order.js` — purely schema placeholders
- **Checkout page:** Does not exist
- **Checkout API route:** Does not exist

---

## 11. Known Broken Things

| Issue | Location | Severity |
|-------|----------|:---:|
| Cart model missing `import mongoose` | `models/Cart.js:1` | 🔴 Crash on import |
| `POST /api/cart` doesn't exist | `ProductDetail.jsx:9` calls it | 🔴 404, silent failure |
| `/track-order` 404 | `components/Navbar.jsx:179` links to it | 🟡 Broken link |
| `/favourites` 404 | `components/Navbar.jsx:192` links to it | 🟡 Broken link |
| `AppliancesGrid` images commented out + component commented out on homepage | `AppliancesGrid.jsx`, `app/page.js:15` | 🟡 Dead code |
| `BrandPartners` has duplicate brands in hardcoded array (old version) → fixed to API fetch, but API-driven version may show duplicates if DB has them | `components/BrandPartners.jsx` | 🟢 Fixed |
| Login page `router.refresh()` missing | `app/login/page.js` — only does `router.push('/')` | 🟡 Navbar won't reflect auth state until manual refresh |
| `logout` reducer never dispatched | `store/slices/authSlice.js` | 🟡 `POST /api/auth/logout` is called but Redux state isn't cleared |
| `ProductFilters.jsx`, `ProductGrid.jsx`, `SortDropdown.jsx` are standalone components that the products page doesn't use — it has all filtering/grid inline | `app/products/page.js` | 🟡 Dead code + code duplication |

---

## 12. Responsive / UI Gaps

| File | Line | Issue |
|------|:---:|-------|
| `products/page.js` | 336 | `grid grid-cols-4` — fixed 4 columns, no responsive breakpoints |
| `ProductCard.jsx` | 15 | `h-48` — image height is fixed (not `aspect-*`) |
| `ProductDetail.jsx` | 29 | `grid md:grid-cols-2` — only 1 breakpoint, no mobile stacking |
| `Navbar.jsx` | 63 | `max-w-[1240px]` — hardcoded pixel max-width |
| `Footer.jsx` | 17 | `px-[100px]` — hardcoded pixel padding, no responsive adjustment |
| `promotions/page.js` | 36 | `h-[200px]` — fixed card height |
| `CategoryHeroSlider.jsx` | 11 | `h-[400px]` — fixed slider height |

---

## 13. Environment Variables

### `process.env.*` references found in code:

| Variable | Used In | Present in `.env.local` |
|----------|---------|:---:|
| `MONGODB_URI` | `lib/db.js`, `scripts/seed.js` | ✅ |
| `JWT_SECRET` | `lib/auth.js` | ✅ |
| `JWT_EXPIRES_IN` | `lib/auth.js` (default: `'7d'`) | ✅ |
| `NODE_ENV` | `register/route.js`, `login/route.js` (cookie secure flag) | ❌ (set by Next.js at runtime) |

### `.env.local` contents:
```
MONGODB_URI=mongodb+srv://...@nexoncluster.3ojljum.mongodb.net/nexon-ecom...
JWT_SECRET=Q4mLz9xP2vK8sYtN7aBcE5rFwH1jDsU6gXnR3qLpZ0iMv
JWT_EXPIRES_IN=7d
```

⚠️ **SECURITY:** `atlas-credentials.env` contains the MongoDB password in cleartext. This file is not in `.gitignore` by name (only `.env*` pattern) and shouldn't exist.

---

## Summary: What Must Be Fixed Before Production

1. **🔴 Cart model:** add `import mongoose from 'mongoose'` to `models/Cart.js`
2. **🔴 Cart API:** create `app/api/cart/route.js` with POST (add), GET (read), PATCH (update qty), DELETE (remove)
3. **🟡 Auth gate on prices:** conditionally render price vs "Login for price" based on Redux auth state in ProductDetail and ProductCard
4. **🟡 middleware.js:** create with `jose` for Edge-compatible JWT verification to protect `/api/cart`, future checkout routes
5. **🟡 Navbar auth state:** add `useSelector` to show user name / logout when authenticated, Sign In link when not
6. **🟡 Logout:** dispatch Redux `logout()` in addition to calling the API
7. **🟡 Stripe:** install package, create checkout session API, webhook handler
8. **🟡 Remove dead code:** decide whether `ProductFilters/ProductGrid/SortDropdown` replace the inline logic in products page, or delete them
9. **🟢 Nice-to-have:** fix orphan links (`/track-order`, `/favourites`), responsive grid breakpoints, route protection
