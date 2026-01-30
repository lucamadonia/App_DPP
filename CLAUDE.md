# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DPP Manager** — React SPA zur Verwaltung digitaler Produktpässe (EU-ESPR-Verordnung). Multi-Tenant SaaS mit Supabase-Backend. Deutsche Benutzeroberfläche.

## Commands

```bash
npm run dev          # Vite dev server (HMR)
npm run build        # tsc -b && vite build
npm run lint         # ESLint (flat config)
npx tsc --noEmit     # Type-check only (no emit)

# Seed scripts (require SUPABASE_SERVICE_ROLE_KEY in .env)
node scripts/seed-countries.mjs
node scripts/seed-checklist-templates.mjs
node scripts/setup-storage.mjs
```

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite 7
- **Styling**: TailwindCSS 4 + shadcn/ui (New York style)
- **Routing**: React Router DOM 7
- **Backend**: Supabase (PostgreSQL + Auth + Storage + RLS)
- **Icons**: Lucide React
- **Hosting**: Vercel (auto-deploy on push to main)
- **Production**: https://dpp-manager.vercel.app

## Architecture

### Context Hierarchy (App.tsx)

```
BrowserRouter
  └─ AuthProvider          ← session + tenantId resolution
      └─ BrandingProvider  ← runtime theming (CSS vars, favicon, title)
          ├─ Public routes  (/login, /p/:gtin/:serial, /01/:gtin/21/:serial)
          └─ ProtectedRoute ← checks isAuthenticated, redirects to /login
              └─ AppLayout  ← sidebar + header for all authenticated pages
```

**ProtectedRoute** is an inline component in App.tsx, not a wrapper/HOC.

### Multi-Tenant Isolation

Every tenant-scoped query uses `getCurrentTenantId()` from `src/lib/supabase.ts`. This reads `tenant_id` from the `profiles` table (linked to `auth.users`). All tenant tables enforce Row Level Security (RLS) policies in PostgreSQL.

### Service Layer (`src/services/supabase/`)

All database/storage operations go through service functions, never direct Supabase calls in components. Central barrel export via `index.ts`.

**Data transformation convention**: Database uses `snake_case`, TypeScript uses `camelCase`. Each service has a `transform*()` function at the boundary:
- Read: `serial_number` → `serialNumber`
- Write: `serialNumber` → `serial_number`

Key services:
| Service | Domain |
|---------|--------|
| `products.ts` | Product CRUD, stats |
| `documents.ts` | Document CRUD + `uploadDocument()` (Storage) |
| `tenants.ts` | Tenant settings, branding, `uploadBrandingAsset()` |
| `master-data.ts` | Categories, countries, regulations (with in-memory caching) |
| `suppliers.ts` | Supplier CRUD + product assignment |
| `visibility.ts` | DPP field visibility (consumer/customs/internal) |
| `auth.ts` | Email/password, Google OAuth, Magic Link, password reset |
| `profiles.ts` | User profiles, invitations |

### Storage Buckets

Three Supabase Storage buckets (configured in `supabase/storage.sql`):

| Bucket | Public | Limit | Used by |
|--------|--------|-------|---------|
| `documents` | No | 50MB | `uploadDocument()` — certificates, reports |
| `product-images` | Yes | 10MB | `uploadProductImage()` — product photos |
| `branding` | Yes | 2MB | `uploadBrandingAsset()` — logos, favicons |

File paths follow `{tenantId}/{filename}` pattern for RLS enforcement.

### Branding & Runtime Theming

`BrandingContext` loads tenant branding on auth, provides defaults via `DEFAULT_BRANDING`. `dynamic-theme.ts` applies at runtime:
- `applyPrimaryColor(hex)` → sets `--primary` CSS variable + variants via HSL conversion
- `applyFavicon(url)` → swaps `<link rel="icon">` elements
- `applyDocumentTitle(name)` → sets `document.title`

Access via `useBranding()` hook → `{ branding, updateBranding, qrCodeSettings, updateQRCodeSettings }`.

### Public Pages (no auth)

Two URL patterns resolve to public product views:
- `/p/:gtin/:serial` — local resolver format
- `/01/:gtin/21/:serial` — GS1 Digital Link standard

Both render `PublicProductPage` inside `PublicLayout`. Query param `?view=zoll` switches to customs view with additional fields.

### Visibility System

Three-tier hierarchical visibility per product field:
1. `consumer` — visible to everyone
2. `customs` — visible to customs + admin
3. `internal` — admin only

Configured per product in `visibility_settings` table, managed via `DPPVisibilitySettingsPage`.

## Database Schema

### SQL Files
```
supabase/
├── schema.sql    # Tables, RLS policies, triggers
├── seed.sql      # Master data (categories, 38 countries, regulations, recycling codes)
└── storage.sql   # Storage buckets + RLS policies
```

### Table Groups

**Master data (global, no RLS)**: `categories`, `countries`, `eu_regulations`, `national_regulations`, `pictograms`, `recycling_codes`, `checklist_templates`, `news_items`

**Tenant data (RLS enforced)**: `tenants`, `profiles`, `products`, `documents`, `supply_chain_entries`, `checklist_progress`, `suppliers`, `supplier_products`, `visibility_settings`

### Key Data Model

Products store complex data as JSON columns: `materials` (array), `certifications` (array), `carbon_footprint` (object), `recyclability` (object). Customs-relevant scalar fields: `hs_code`, `batch_number`, `country_of_origin`, `net_weight`, `gross_weight`.

## i18n / Internationalization

The app supports **German (de)** and **English (en)** via `i18next` + `react-i18next`. **All UI-visible text must be translated in both languages.**

### Setup

- Config: `src/i18n.ts` (fallback: `en`, detection via localStorage key `dpp-language`)
- Translation files: `public/locales/{en,de}/{namespace}.json`
- Loaded at runtime via `i18next-http-backend` from `/locales/{{lng}}/{{ns}}.json`

### Namespaces

| Namespace | Scope |
|-----------|-------|
| `common` | Shared UI (buttons, labels, errors, navigation) |
| `auth` | Login, signup, password reset |
| `products` | Product CRUD, batch management |
| `dpp` | Digital Product Passport, QR, public views |
| `documents` | Document management, uploads |
| `dashboard` | Dashboard page |
| `settings` | Settings, suppliers, supply chain, branding |
| `compliance` | Regulations, checklists |

### Rules (MANDATORY)

1. **Never hardcode UI text** — always use `t('key')` from `useTranslation('namespace')`
2. **Every new key must be added to BOTH `en` and `de`** translation files — no exceptions
3. Use the English text as the translation key: `t('Save')`, `t('New Product')`, not `t('save_button')`
4. Cross-namespace access: `t('Cancel', { ns: 'common' })` for shared keys
5. Interpolation: `t('Welcome, {{name}}', { name })` — same syntax in both languages
6. When modifying or adding any UI-facing string, always update both `public/locales/en/{ns}.json` AND `public/locales/de/{ns}.json`

### Example

```tsx
// In component:
const { t } = useTranslation('products');

// In JSX:
<h1>{t('New Product')}</h1>
<Button>{t('Save', { ns: 'common' })}</Button>
```

```json
// public/locales/en/products.json
{ "New Product": "New Product" }

// public/locales/de/products.json
{ "New Product": "Neues Produkt" }
```

## Conventions

- **Language**: All UI text in both German AND English via i18n (see above). Code/comments in English.
- **Components**: shadcn/ui from `@/components/ui/`
- **Imports**: `@/` path alias for `src/` directory
- **DB access**: Always through `src/services/supabase/*`, never direct
- **Tenant queries**: Always call `getCurrentTenantId()` first
- **New pages**: Add route in `App.tsx`, use existing layout system
- **Seed scripts**: Follow pattern in `scripts/seed-checklist-templates.mjs` — load `.env`, use REST API with service role key, upsert with `Prefer: resolution=ignore-duplicates`

## Environment Variables

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# For seed scripts only:
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```
