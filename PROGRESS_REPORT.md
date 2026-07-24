# NexonEcom — Progress Report (Handoff)

Generated: June 2026

---

## 1. Stack & Config

| Item | Detail |
|------|--------|
| **Framework** | Next.js **16.2.7** (App Router), bootstrapped from `create-next-app` |
| **Language** | **JavaScript** (`.js` / `.jsx`), **no TypeScript** — `jsconfig.json` exists but `tsconfig.json` does not |
| **Rendering** | App Router only, no `pages/` directory present |
| **React** | 19.2.4 (`react` + `react-dom`) |
| **Styling** | Tailwind CSS **v4.3.0** via `@tailwindcss/postcss` plugin (not the old `tailwind.config.js`) |
| **CSS approach** | Single `app/globals.css` with `@import "tailwindcss"` — all styling done with static inline hex values (e.g. `bg-[#07141d]`, `text-[#0071ce]`). No CSS variables, no design tokens file |
| **Animations** | `framer-motion` ^12.40.0 |
| **Icons** | `lucide-react` ^1.17.0 (Search, User, Heart, Package, ChevronLeft, ChevronRight, Eye, EyeOff, MapPin, ChevronDown, Headphones, ClipboardPlus, Check, X) |
| **Fonts** | System stack (`Arial, Helvetica, sans-serif` in `globals.css`) — no custom Google fonts loaded |
| **PostCSS** | Lightning CSS ^1.32.0 with `lightningcss-darwin-arm64` native binary |
| **Linting** | ESLint ^9 with `eslint-config-next` 16.2.7 |
| **Package manager** | npm (lock file present) |
| **Build tool** | Turbopack (Next.js 16 default) |
| **Image CDN** | Unsplash for all placeholder images (`images.unsplash.com` whitelisted in `next.config.mjs`) |

### Full folder tree (excluding `node_modules/`, `.next/`, `.git/`)

```
nexon-ecom/
├── AGENTS.md
├── CLAUDE.md
├── README.md
├── jsconfig.json
├── next.config.mjs
├── postcss.config.mjs
├── eslint.config.mjs
├── package.json
├── package-lock.json
├── app/
│   ├── globals.css
│   ├── layout.js
│   ├── page.js                    (Home)
│   ├── about/page.js
│   ├── brands/page.js
│   ├── calculator/page.js
│   ├── contact/page.js
│   ├── downloads/page.js
│   ├── events/page.js
│   ├── login/page.js
│   ├── news/page.js
│   ├── products/page.js
│   ├── promotions/page.js
│   └── signup/page.js
├── components/
│   ├── Navbar.jsx
│   ├── Footer.jsx
│   ├── HeroBanner.jsx
│   ├── AppliancesGrid.jsx
│   ├── BrandPartners.jsx
│   ├── CategoryHeroSection.jsx
│   ├── CategoryHeroSlider.jsx
│   └── NewsEvents.jsx
└── public/
    ├── banner/
    │   ├── banner_1.jpg
    │   └── banner_2.jpg
    ├── brands/
    │   ├── AlphaEss_logo.jpeg
    │   ├── Sungrow_logo.jpeg
    │   ├── Panasonic_logo.jpg
    │   ├── Anker_logo.jpeg
    │   ├── Canadian_Solar_logo.jpeg
    │   ├── Antalis_img.jpeg
    │   ├── AESolar_logo.jpeg
    │   ├── FoxESS_logo.jpeg
    │   ├── Goodwe_logo.jpeg
    │   ├── Jasolar_logo.jpeg
    │   └── Jinko_Solar_logo.jpeg
    └── icons/
        ├── instagram_ic.png
        ├── facebook_ic.png
        └── youtube.png
```

**No directories exist for:** `app/api/`, `lib/`, `store/`, `models/`, `hooks/`, `utils/`, `types/`, `styles/`, `tests/`.

---

## 2. Routes Implemented

All routes are under `app/` (App Router). Every page is a **server component** (no `'use client'` at top) **except** Login, Signup, and Products which are client components.

| Route | File | What it renders | Status |
|-------|------|----------------|--------|
| `/` | `app/page.js` | Full landing: Navbar → HeroBanner → BrandPartners → CategoryHeroSection → NewsEvents → Footer. `AppliancesGrid` is commented out. | **Fully built, static** |
| `/products` | `app/products/page.js` | Full product listing: category icons, brand filter chips, sidebar checkboxes (Power, Cell Type, etc.), 16-product grid with pagination, sort dropdown. All 16 products hardcoded in component. "Login for price" buttons. | **Fully built, hardcoded data** |
| `/promotions` | `app/promotions/page.js` | "MADNESS BATTERY PRICES" hero with green/blue gradient text, 4 package cards (solar+battery bundles) | **Fully built, hardcoded data** |
| `/brands` | `app/brands/page.js` | Wraps `<BrandPartners />` component | **Fully built** |
| `/news` | `app/news/page.js` | Wraps `<NewsEvents />` component (7 news articles, dot pagination) | **Fully built** |
| `/login` | `app/login/page.js` | Email + password form, show/hide password toggle, "Remember me" checkbox, forgot password link, terms notice, links to `/signup` | **Fully styled, form is non-functional (handleSubmit is a no-op)** |
| `/signup` | `app/signup/page.js` | Company info (ABN, Company Name, GST Yes/No toggle, Trading Name, Business Address with MapPin, referral source dropdown, weekly installations dropdown), Contact Details (Full Name, Email, Phone), two agreement checkboxes, mock reCAPTCHA widget | **Fully styled, form is non-functional (handleSubmit is a no-op)** |
| `/about` | `app/about/page.js` | Mission/Vision section with solar worker image + green arc SVG overlay, 4 core values cards (Integrity, Customer-Driven, Innovative, Be One) with inline SVG icons | **Fully built, static** |
| `/downloads` | `app/downloads/page.js` | Stub — just an `<h1>Downloads</h1>` heading | **Placeholder** |
| `/calculator` | `app/calculator/page.js` | Stub — just an `<h1>Calculator</h1>` heading | **Placeholder** |
| `/events` | `app/events/page.js` | Stub — just an `<h1>Events</h1>` heading | **Placeholder** |
| `/contact` | `app/contact/page.js` | Stub — just an `<h1>Contact Us</h1>` heading | **Placeholder** |

**Unlinked routes referenced by Navbar:** `/track-order`, `/favourites`, `/forgot-password` — these link to pages that **do not exist yet** (will 404).

---

## 3. Components Built

| Component | File | What it does | Status |
|-----------|------|-------------|--------|
| **Navbar** | `components/Navbar.jsx` | Sticky two-row nav (`#07141d` bg): top row has "Nexon" logo (`#00a7a7` italic), region/language dropdown (NL/PL/AU/US), search input, Track Order/Sign In/Favourite icon links. Bottom row has 10 nav links with active state (`#00a7a7` underline). "Promotions" has "New" badge. | **Fully styled & functional (client)** |
| **Footer** | `components/Footer.jsx` | 4-column footer: Products, Help & Support, About, Global Sponsorship. Social icons (Instagram, Facebook, YouTube) via `<Image>`. Bottom bar with copyright, legal links, India flag. Brand color `#0071ce` used for hover. | **Fully styled, all links dead (`href="#"`)** |
| **HeroBanner** | `components/HeroBanner.jsx` | Full-width image slider (520px tall), 2 slides (`banner_1.jpg`, `banner_2.jpg`), auto-advances every 4s, left/right arrow buttons. Uses `next/image` with `fill` + `priority`. | **Fully functional (client)** |
| **AppliancesGrid** | `components/AppliancesGrid.jsx` | 2×3 grid of appliance category cards (Refrigerators, Washing Machines, etc.) with placeholder images ("placehold.co"). First card has "Learn More" hover pill. **Image `next/image` tags are commented out** — images are broken. | **WIP — commented out on homepage, images disabled** |
| **BrandPartners** | `components/BrandPartners.jsx` | "Featured Brands" section: 6-column responsive grid of 18 brand logo cards with fade-in animation (`framer-motion` `whileInView`). Uses plain `<img>` tags (not `next/image`). Several brands duplicated (Antalis, Panasonic, Anker, AE Solar, Sungrow, GoodWe, Alpha ESS appear twice). | **Fully styled, has duplicate entries** |
| **CategoryHeroSection** | `components/CategoryHeroSection.jsx` | Renders 4 stacked `<CategoryHeroSlider>` instances: Furniture, Refrigerators, Kitchen Appliances, Washing Machines. All data hardcoded inline. | **Fully styled** |
| **CategoryHeroSlider** | `components/CategoryHeroSlider.jsx` | 400px-tall full-width slider with background image + dark overlay, category tab buttons, title, description, "Learn More" button. Category data is furniture/refrigerator content — mismatched for a smart home appliances site. | **Fully styled, content is generic placeholder** |
| **NewsEvents** | `components/NewsEvents.jsx` | Main card (image left, text right) with 7 NexonEcom-themed articles, dot pagination. Bottom row: "Customer Support" + "Register a Product" cards with icon + button. All data hardcoded. | **Fully styled** |

---

## 4. State Management

**None.** There is no Redux, Zustand, Context, or any global state library installed. All state is component-local `useState`:

- Navbar: search input, region dropdown, selected region (`useState`)
- HeroBanner: current slide index (`useState`)
- Products: active category, active brands array, checked filters object, hovered product, current page, per page (`useState`)
- NewsEvents: active article index (`useState`)
- Login: form fields, show password, remember me (`useState`)
- Signup: form fields, GST toggle, two agreement checkboxes, mock reCAPTCHA (`useState`)
- CategoryHeroSlider: active tab index (`useState`)

---

## 5. Database

**Not connected. Not configured.** There is:
- No MongoDB, no Mongoose, no Prisma, no ORM of any kind
- No `models/` or `schemas/` directory
- No database connection string or setup code anywhere
- No `lib/db.js` or equivalent

---

## 6. API Routes

**None.** The `app/api/` directory does not exist. Every page uses hardcoded inline data arrays. There are zero route handlers (`route.js`/`route.ts`).

---

## 7. Auth

**None.** There is:
- No `next-auth`, no `@auth0`, no custom JWT/session logic
- No `middleware.js` for route protection
- Login and Signup pages exist as styled forms, but `handleSubmit` is `(e) => e.preventDefault()` — a no-op
- Navbar shows "Sign In" linking to `/login`, but authentication is purely decorative

---

## 8. Styling / Branding

| Aspect | Current state |
|--------|---------------|
| **Brand color** | `#0071ce` (blue) — used in Footer hover states, "Simply ideal" dot, AppliancesGrid "Learn More" pill |
| **Nav brand** | `#07141d` (dark navy) navbar background, `#00a7a7` (green) logo and active nav link |
| **Accent colors** | `#2196f3` (material blue) used heavily in Product cards, Login, NewsEvents, Signup; `#00a7a7` (blue) for submit buttons; `#16a34a` / `#22c55e` (green) in Products page |
| **Red color** | `#c0392b` (dark red) used in Promotions page for UNBEATABLE PACKAGE text |
| **Tailwind config** | No custom `tailwind.config.js` — Tailwind v4 uses CSS-based config via `@import "tailwindcss"` in `globals.css`. All colors are inline static hex values |
| **Design tokens** | None. No CSS variables, no theme file, no shared color constants |
| **Typography** | System fonts only. Mix of `text-[11px]` through `text-[72px]`, `font-extrabold` for major headings |
| **Consistency** | Low — multiple competing blues (`#0071ce`, `#2196f3`, `#00a7a7`, `#1d4ed8`, `#1565c0`) used interchangeably with no clear system |

---

## 9. What's NOT Started

- [ ] **Cart / basket** — no component, no page, no state
- [ ] **Checkout flow** — nothing
- [ ] **Payment integration** — nothing
- [ ] **Product detail page** — no `[id]` or `[slug]` dynamic route (products page only shows grid)
- [ ] **Search functionality** — Navbar has a search input but it only updates local state; no actual search logic
- [ ] **Product filtering** — Products page has checkbox UI but filters don't actually filter — they just toggle checked state
- [ ] **Admin panel / CMS** — nothing
- [ ] **User account / profile page** — nothing (Navbar links to `/favourites` which 404s)
- [ ] **Order tracking** — `/track-order` linked from Navbar but page doesn't exist
- [ ] **Database connection** — no DB, no models, no schemas
- [ ] **API layer** — `app/api/` directory doesn't exist
- [ ] **Authentication** — forms are decorative only
- [ ] **Middleware / route protection** — no `middleware.js`
- [ ] **SEO metadata** — only root layout has `metadata`; no per-page `generateMetadata`
- [ ] **Loading states / error boundaries** — no `loading.js` or `error.js` on any route
- [ ] **Tests** — zero test files, no testing library installed
- [ ] **CI/CD** — no GitHub Actions, no deployment config
- [ ] **Environment variables** — no `.env.example` or `.env` file
- [ ] **TypeScript migration** — pure JS, no TS config or types

---

## 10. Known Issues / Bugs

1. **AppliancesGrid images broken** — the `<Image>` components inside `AppliancesGrid.jsx` are commented out. The component renders empty image containers. It's also commented out on the homepage entirely.
2. **BrandPartners has duplicate entries** — Antalis, Panasonic, Anker, AE Solar, Sungrow, GoodWe, Alpha ESS each appear twice in the brands array (18 items, only ~10 unique brands).
3. **`/track-order`, `/favourites`, `/forgot-password` 404** — Navbar links to these routes but pages don't exist.
4. **Product filters don't work** — the `checkedFilters` state in Products page is never used to actually filter the `products` array; items are only paginated.
5. **Category content mismatches site theme** — `CategoryHeroSection` has Furniture/Bedroom/Office/Dining categories (looks copied from a furniture store template), not home appliances.
6. **Multiple competing design systems** — the site uses at least 5 different blues, green nav text, red promo text, material-design patterns — no unified design language.
7. **Login/Signup forms submit to nowhere** — `handleSubmit` just calls `preventDefault()` with no API call, validation, or redirect.
8. **No responsive mobile menu** — Navbar has no hamburger menu; on small screens the 10 nav links will overflow.
9. **Footer links all dead** — every footer link is `href="#"`.
10. **No favicon configured** — `public/` has Vercel/Next.js default SVGs, no custom favicon (though `.next` cache suggests a favicon.ico was once processed).
11. **`next/image` remote patterns** — only `images.unsplash.com` is whitelisted; `placehold.co` images (used in AppliancesGrid) may fail in production builds.

---

## 11. Environment Variables

**No `.env` file exists.** The `.gitignore` excludes `.env*` files. Based on `next.config.mjs`, the only configurable item inferred is:

- `NEXT_PUBLIC_*` — none defined
- No database URL, no API keys, no auth secrets

If connecting a database or auth provider later, you'll need to create `.env.local` and add the relevant keys there.

---

## Summary

The project is a **frontend-only prototype** — 13 routes, 8 components, all visual UI with zero backend wiring. The landing page, products page, promotions page, and about page are well-styled and content-rich. Everything else is scaffolding. The next logical steps are: (1) pick a consistent design system / color palette, (2) wire up a database + API layer, (3) implement actual auth, (4) build cart/checkout, and (5) replace all hardcoded data with real data fetching.
