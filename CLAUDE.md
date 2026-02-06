# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Trackbliss** — React SPA zur Verwaltung digitaler Produktpässe (EU-ESPR-Verordnung) mit integriertem Returns Hub (Retouren-Management, Ticket-System, Kunden-Portal), AI Compliance Check, Custom-Domain White-Labeling und DPP Design System. Multi-Tenant SaaS mit Supabase-Backend. Deutsche und englische Benutzeroberfläche.

## Commands

```bash
npm run dev          # Vite dev server (HMR)
npm run build        # tsc -b && vite build
npm run lint         # ESLint (flat config)
npx tsc --noEmit     # Type-check only (no emit)

# Database migrations (require SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF in .env)
node scripts/db-migrate.mjs              # Apply all pending migrations
node scripts/db-migrate.mjs --status     # Show migration status
node scripts/db-migrate.mjs --force      # Re-apply all migrations
node scripts/db-migrate.mjs --file X.sql # Apply specific SQL file from supabase/

# Seed scripts (require SUPABASE_SERVICE_ROLE_KEY in .env)
node scripts/seed-countries.mjs
node scripts/seed-checklist-templates.mjs
node scripts/seed-eu-regulations.mjs
node scripts/seed-news.mjs
node scripts/setup-storage.mjs
node scripts/migrate-batches.mjs
```

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite 7
- **Styling**: TailwindCSS 4 + shadcn/ui (New York style)
- **Routing**: React Router DOM 7
- **Backend**: Supabase (PostgreSQL + Auth + Storage + RLS + Edge Functions)
- **AI**: OpenRouter API → Claude Sonnet 4 (streaming compliance analysis)
- **PDF**: `@react-pdf/renderer` (client-side PDF generation)
- **Server State**: `@tanstack/react-query`
- **Command Palette**: `cmdk`
- **QR Codes**: `qrcode`
- **Icons**: Lucide React
- **Hosting**: Vercel (auto-deploy on push to main)
- **Production**: https://dpp-app.fambliss.eu (Vercel: https://app-dpp.vercel.app)

## Architecture

### Context Hierarchy (App.tsx)

```
BrowserRouter
  └─ AuthProvider              ← session + tenantId resolution
      └─ BrandingProvider      ← runtime theming (CSS vars, favicon, title)
          └─ CustomDomainGate  ← detects custom domains, switches routing mode
              ├─ CustomDomainPortal    ← slug-free portal for white-label domains
              ├─ DomainNotFoundPage    ← custom domain not resolved
              └─ NormalAppRoutes       ← standard app routing
                  ├─ Public routes      (/login, /landing, /p/:gtin/:serial, /01/:gtin/21/:serial)
                  ├─ Returns Portal     (/returns/portal/:tenantSlug, /returns/register/:tenantSlug)
                  ├─ Customer Portal    (/customer/:tenantSlug/...)
                  │   └─ CustomerPortalProvider  ← customer session + tenant context
                  └─ ProtectedRoute     ← checks isAuthenticated, redirects to /login
                      └─ AppLayout      ← sidebar + header for all authenticated pages
```

**ProtectedRoute** is an inline component in App.tsx, not a wrapper/HOC.

**CustomDomainGate** checks `window.location.hostname` against a known-hosts allowlist. If the hostname is not recognized, it resolves the tenant via `resolveTenantByDomain()` and renders `CustomDomainPortal` with slug-free routes.

### Multi-Tenant Isolation

Every tenant-scoped query uses `getCurrentTenantId()` from `src/lib/supabase.ts`. This reads `tenant_id` from the `profiles` table (linked to `auth.users`). All tenant tables enforce Row Level Security (RLS) policies in PostgreSQL.

### Service Layer (`src/services/supabase/`)

All database/storage operations go through service functions, never direct Supabase calls in components. Central barrel export via `index.ts`.

**Data transformation convention**: Database uses `snake_case`, TypeScript uses `camelCase`. Each service has a `transform*()` function at the boundary:
- Read: `serial_number` → `serialNumber`
- Write: `serialNumber` → `serial_number`

**Core services:**

| Service | Domain |
|---------|--------|
| `products.ts` | Product CRUD, stats, GTIN/serial lookup |
| `batches.ts` | Batch CRUD, serial numbers, status, duplication, stats |
| `documents.ts` | Document CRUD + `uploadDocument()` (Storage) |
| `product-images.ts` | Product image gallery (upload, reorder, primary, captions) |
| `tenants.ts` | Tenant settings, branding, QR settings, DPP design, hero image upload |
| `master-data.ts` | Categories, countries, regulations, pictograms, recycling codes (with in-memory caching) |
| `suppliers.ts` | Supplier CRUD + product assignment |
| `supply-chain.ts` | Supply chain entries (CRUD, reorder, stats, facility_identifier/GLN support) |
| `checklists.ts` | Compliance checklist progress tracking |
| `compliance.ts` | Compliance overview, scores, warnings |
| `visibility.ts` | DPP field visibility V2 (consumer/customs/internal, 36 fields) |
| `auth.ts` | Email/password, Google OAuth, Magic Link, password reset |
| `profiles.ts` | User profiles, role management, user invitations |
| `invitations.ts` | Invitation CRUD (create, cancel, resend, delete) |
| `activity-log.ts` | Audit trail (log + query) |
| `ai-compliance-checks.ts` | AI compliance check CRUD + history |
| `domain-resolution.ts` | Tenant lookup by custom domain (public, no auth) |
| `domain-verification.ts` | DNS CNAME verification via Google DNS-over-HTTPS |
| `vercel-domain.ts` | Vercel domain API wrapper (add/remove via Edge Function) |
| `supplier-portal.ts` | Supplier invitation CRUD, public registration, approval/rejection |

**Returns Hub services (`rh-*.ts`):**

| Service | Domain |
|---------|--------|
| `returns.ts` | Return CRUD, status updates, stats, public return creation/tracking |
| `return-items.ts` | Items within a return (add/update/remove) |
| `return-timeline.ts` | Status history entries |
| `return-photos.ts` | Return item condition photo upload + signed URLs |
| `rh-customers.ts` | Customer profiles, addresses, return stats, risk score |
| `rh-tickets.ts` | Ticket CRUD, messages, SLA tracking, Kanban, merge, bulk update |
| `rh-ticket-attachments.ts` | File uploads for ticket attachments |
| `rh-canned-responses.ts` | Quick-reply templates (stored in tenant settings) |
| `rh-settings.ts` | Returns Hub settings, return reasons, customer portal config, portal domain |
| `rh-email-templates.ts` | Email template CRUD, seeding 15 defaults, reset to default |
| `rh-notifications.ts` | Notification records (pending/sent/delivered/failed) |
| `rh-notification-trigger.ts` | Email rendering with variable substitution + locale support |
| `rh-workflows.ts` | Workflow rule CRUD, graph serialization/deserialization |
| `rh-workflow-engine.ts` | Workflow graph execution engine (runtime rule processing) |
| `customer-portal.ts` | Customer auth, profile, returns/tickets from customer side |

**OpenRouter services (`src/services/openrouter/`):**

| File | Purpose |
|------|---------|
| `client.ts` | HTTP streaming client for OpenRouter API (Claude Sonnet 4) |
| `types.ts` | `OpenRouterMessage`, `ProductContext`, `RequirementSummary`, `ChatMessage` |
| `prompts.ts` | General prompts (deep analysis, overall assessment, action plan, additional reqs, chat) |
| `compliance-check-prompts.ts` | 3-phase compliance prompts + response parsers |
| `index.ts` | Barrel export |

### Storage Buckets

Four Supabase Storage buckets (configured in `supabase/storage.sql`):

| Bucket | Public | Limit | Used by |
|--------|--------|-------|---------|
| `documents` | No | 50MB | `uploadDocument()` — certificates, reports, ticket attachments |
| `product-images` | Yes | 10MB | `uploadProductImage()` — product photos |
| `branding` | Yes | 2MB | `uploadBrandingAsset()` — logos, favicons |
| `return-photos` | No | 50MB | `uploadReturnPhoto()` — return item condition photos |

File paths follow `{tenantId}/{filename}` pattern for RLS enforcement.

### Branding & Runtime Theming

`BrandingContext` loads tenant branding on auth, provides defaults via `DEFAULT_BRANDING`. `dynamic-theme.ts` applies at runtime:
- `applyPrimaryColor(hex)` → sets `--primary` CSS variable + variants via HSL conversion
- `applyFavicon(url)` → swaps `<link rel="icon">` elements
- `applyDocumentTitle(name)` → sets `document.title`
- `applyBranding(settings)` → applies all at once
- `resetBranding()` → resets all to defaults

Access via `useBranding()` hook → `{ branding, updateBranding, qrCodeSettings, updateQRCodeSettings }`.

### Public Pages (no auth)

**Product views** — two URL patterns:
- `/p/:gtin/:serial` — local resolver format
- `/01/:gtin/21/:serial` — GS1 Digital Link standard

Both render `PublicCustomerPage` inside `PublicLayout`. Separate `/customs` sub-routes for customs view.

**Returns portal** (no auth):
- `/returns/portal/:tenantSlug` — Portal landing page
- `/returns/register/:tenantSlug` — Self-service return registration wizard (7 steps)
- `/returns/track/:returnNumber?` — Return tracking by return number

**Customer portal** (separate customer auth, not admin auth):
- `/customer/:tenantSlug/login` — Customer login
- `/customer/:tenantSlug/register` — Customer self-registration
- `/customer/:tenantSlug/auth/callback` — Customer OAuth callback
- `/customer/:tenantSlug` — Customer dashboard
- `/customer/:tenantSlug/returns` — Customer's returns list
- `/customer/:tenantSlug/returns/new` — Create new return
- `/customer/:tenantSlug/returns/:id` — Return detail
- `/customer/:tenantSlug/tickets` — Customer's tickets
- `/customer/:tenantSlug/tickets/:id` — Ticket detail
- `/customer/:tenantSlug/profile` — Customer profile

## AI Compliance Check System

### Overview

AI-powered EU product compliance analysis using Claude Sonnet 4 via OpenRouter. Performs a 3-phase streaming analysis, generates compliance scores, findings, action plans, and exports PDF reports.

### Architecture

```
User clicks "Start AI Compliance Check"
  ↓
AIComplianceCheckTab builds context (product, batch, documents, supply chain)
  ↓
useComplianceCheck orchestrates 3 sequential API calls:
  ↓
  Phase 1: Score & Risk Matrix
    buildScoreAndRiskMessages() → streamCompletion() → parseScoreResponse()
    Returns: score (0-100), riskLevel, executiveSummary, riskMatrix[]
  ↓
  Phase 2: Detailed Findings
    buildFindingsMessages(ctx, phase1Summary) → streamCompletion() → parseFindingsResponse()
    Returns: 8-15 ComplianceFinding[] (categorized by regulation)
  ↓
  Phase 3: Action Plan & Recommendations
    buildActionPlanMessages(ctx, phase1Summary, phase2Summary) → streamCompletion() → parseActionPlanResponse()
    Returns: actionPlan[] (P1/P2/P3 priorities), recommendations[]
  ↓
ComplianceCheckResult displayed in UI + saved to DB + exportable as PDF
```

### Scoring Rules

| Score | Meaning |
|-------|---------|
| 90-100 | All essential requirements met, current certs, complete docs |
| 70-89 | Mostly compliant, individual gaps |
| 50-69 | Significant gaps, missing certs or expired docs |
| 30-49 | Serious deficiencies in multiple areas |
| 0-29 | Basic compliance requirements not met |

### Regulatory Coverage

EU regulations covered in system prompts: ESPR 2024/1781, Battery Reg 2023/1542, PPWR 2024/3249, GPSR 2023/988, CE Directives (LVD, EMC, RED, RoHS, Machinery Reg), REACH 1907/2006, DPP specifics (QR code ISO/IEC 18004, GS1 Digital Link), national laws (ElektroG, BattG, VerpackG, AGEC), EN standards.

### Finding Categories (14)

ESPR, Battery, PPWR, GPSR, CE, REACH, RoHS, EMC, RED, LVD, Docs, DPP, National, Other

### Components (`src/components/compliance-check/`)

| Component | Purpose |
|-----------|---------|
| `AIComplianceCheckTab.tsx` | Main orchestrator: phases UI, streaming, batch support, history, save, PDF export |
| `ComplianceScoreGauge.tsx` | Animated SVG arc gauge (0-100) with risk level badge |
| `ComplianceFindingsPanel.tsx` | Categorized findings list with severity/status icons, expandable details |
| `ComplianceRiskMatrix.tsx` | 3-column grid of risk areas (likelihood x impact) |
| `ComplianceActionPlan.tsx` | Timeline layout for action items (P1/P2/P3) + recommendation cards |
| `ComplianceCheckHistory.tsx` | Previous analysis runs (view/delete) |
| `ComplianceReportPDF.tsx` | Multi-page PDF export via `@react-pdf/renderer` |

### AI Components (`src/components/ai/`)

| Component | Purpose |
|-----------|---------|
| `AIStreamingText.tsx` | Markdown-to-React parser for streaming AI responses |
| `AIAnalysisButton.tsx` | Gradient CTA button with shimmer animation |
| `AIAnalysisCard.tsx` | Glassmorphic card wrapper for streaming output |
| `AIOverallAssessment.tsx` | Overall compliance assessment stream card |
| `AIActionPlan.tsx` | Action plan stream card |
| `AIAdditionalReqs.tsx` | Additional requirements stream card |
| `AIChatPanel.tsx` | Slide-out chat interface with conversation history |

### Types (`src/types/compliance-check.ts`)

Key types: `RiskLevel` (low/medium/high/critical), `FindingSeverity`, `FindingStatus`, `FindingCategory`, `ActionPriority` (P1/P2/P3), `RecommendationType` (quick_win/improvement/strategic), `ComplianceFinding`, `ActionPlanItem`, `Recommendation`, `RiskMatrixEntry`, `ComplianceCheckResult`, `SavedComplianceCheck`, `ComplianceCheckPhase`.

### Database

Table `ai_compliance_checks` stores: score, risk level, executive summary, findings (JSONB), risk matrix (JSONB), action plan (JSONB), recommendations (JSONB), raw API responses, input data snapshot, model used. RLS enforced by `tenant_id`.

## ESPR 2024/1781 Compliance System

### Overview

Full implementation of EU ESPR 2024/1781 (Ecodesign for Sustainable Products Regulation) mandatory fields across the entire DPP system. 21 new product fields covering economic operators, SVHC declarations, durability metrics, conformity assessments, safety information, and product registry integration.

### ESPR Product Fields (21 fields)

Stored in `products` table, organized into 6 categories:

**Economic Operators (7 fields)**:
- `manufacturer_identifier` — GLN or other unique identifier
- `authorized_representative` — JSON: {name, identifier, address, contact}
- `importer` — JSON: {name, identifier, address, contact}
- `distributor` — JSON: {name, identifier, address, contact}
- `dpp_responsible` — JSON: {name, email, phone}
- `economic_operators_documentation` — Supporting documents
- `manufacturer_duns` — D-U-N-S Number

**SVHC & Substances (3 fields)**:
- `svhc_present` — Boolean: contains Substances of Very High Concern
- `svhc_list` — Array of SVHC substances with concentration levels
- `substances_declaration` — Full declaration JSON

**Durability & Repairability (3 fields)**:
- `expected_lifetime_years` — Number: product lifetime
- `repairability_index` — Number 0-100: repairability score
- `spare_parts_availability_years` — Number: availability duration

**Conformity Assessment (3 fields)**:
- `conformity_declaration_url` — URL to EU Declaration of Conformity
- `conformity_assessment_body` — Notified body information
- `ce_marking_year` — Year CE marking affixed

**Safety & Instructions (3 fields)**:
- `safety_instructions_url` — Link to safety documentation
- `disposal_instructions` — Safe disposal instructions
- `hazard_warnings` — Array of hazard warnings

**Product Registry (2 fields)**:
- `eprel_registration_number` — European Product Registry for Energy Labelling ID
- `scip_notification_number` — SCIP database notification number

### DPP ESPR Sections Component

**File**: `src/components/public/DPPESPRSections.tsx` (NEW)

Shared component rendering ESPR 2024/1781 mandatory sections across all 11 DPP template variants. Provides consistent ESPR compliance display regardless of chosen design template.

**Props**:
```typescript
{
  product: Product;
  isFieldVisible: (field: string) => boolean;
  cardStyle: CSSProperties;
  headingStyle: CSSProperties;
  primaryColor: string;
  t: (key: string) => string;
}
```

**Renders 6 ESPR Sections**:
1. **Economic Operators** — Manufacturer, authorized rep, importer, distributor with identifiers
2. **SVHC Declaration** — Substances of Very High Concern presence + list
3. **Durability & Repairability** — Lifetime, repairability index, spare parts availability
4. **Conformity Assessment** — Declaration of Conformity, CE marking, notified body
5. **Safety Information** — Safety instructions, disposal, hazard warnings
6. **Product Registry** — EPREL and SCIP registration numbers

**Integration**: All 11 template files import and render `<DPPESPRSections>` after their custom sections:
- TemplateAccessible.tsx, TemplateClassic.tsx, TemplateCompact.tsx
- TemplateEcoFriendly.tsx, TemplateGovernment.tsx, TemplateMinimal.tsx
- TemplateModern.tsx, TemplatePremium.tsx, TemplateRetail.tsx
- TemplateScientific.tsx, TemplateTechnical.tsx

### ProductFormPage ESPR Tab

**File**: `src/pages/ProductFormPage.tsx`

New "ESPR Compliance" tab added to product form with 6 collapsible sections matching the DPP display structure. Comprehensive input fields for all 21 ESPR fields with help text and validation.

**Form Sections**:
1. Economic Operators — Multiple operator inputs with identifiers
2. SVHC & Substances — Boolean + dynamic substance list builder
3. Durability & Repairability — Numeric inputs with sliders
4. Conformity Assessment — URL inputs + date pickers
5. Safety & Instructions — URL + text area + multi-select hazards
6. Product Registry — Registration number inputs

### AI Compliance Check ESPR Enhancement

**File**: `src/services/openrouter/compliance-check-prompts.ts`

Enhanced scoring system includes ESPR 2024/1781 specific checks:
- Economic operator completeness (all 4 operators documented)
- SVHC declaration accuracy (REACH compliance)
- Durability metrics reasonability (product-category appropriate)
- Conformity documentation validity (CE marking + DoC)
- Safety information completeness (instructions + warnings)
- Product registry compliance (EPREL/SCIP when required)

**Scoring Impact**: ESPR compliance can contribute up to 15 points to overall 0-100 score. Missing mandatory ESPR fields for regulated products reduces score significantly.

### Database Migration

**File**: `supabase/migrations/20260205_espr_compliance_fields.sql` (NEW)

Adds 21 ESPR compliance columns to `products` table with appropriate data types:
- TEXT columns for identifiers, URLs
- JSONB columns for structured operator data, SVHC lists, substances
- NUMERIC columns for lifetime, repairability index
- BOOLEAN for SVHC presence flag

**Indexes**: Added GIN indexes on JSONB columns for query performance.

### Type Definitions

**File**: `src/types/product.ts`

New interfaces:
```typescript
interface EconomicOperator {
  name: string;
  identifier?: string; // GLN, DUNS, VAT, etc.
  address?: string;
  contact?: string;
}

interface SVHCSubstance {
  name: string;
  casNumber?: string;
  concentration?: string; // e.g., "< 0.1%"
  location?: string; // Where in product
}
```

Extended `Product` interface with all 21 ESPR fields.

### Visibility System Integration

ESPR fields NOT currently added to Visibility System V2 (still 36 fields, 9 categories). ESPR sections always render when data is present, not controlled by visibility toggles. Future enhancement: Add ESPR category to visibility system.

### Translation Keys

**Namespaces affected**:
- `products` — ESPR tab labels, field names
- `dpp` — ESPR section headings on public pages

**Languages**: Full EN/DE translation coverage for all ESPR fields and sections.

## Custom Domain / White-Label Portal

### Overview

Allows tenants to serve their returns portal and/or customer portal under a custom domain (e.g., `returns.company.de`) without any tenant slug in the URL.

### Domain Detection Flow

```
Page Load → CustomDomainGate
  ↓
useCustomDomainDetection()
  ↓
Check KNOWN_HOSTS allowlist (localhost, *.vercel.app, dpp-app.fambliss.eu)
  → If match → NormalAppRoutes (standard routing)
  ↓
Check sessionStorage cache (key: domain-resolution:{hostname})
  → If cached → use cached DomainResolutionResult
  ↓
Query Supabase: tenants WHERE settings->returnsHub->portalDomain->>customDomain = hostname
                         AND settings->returnsHub->portalDomain->>domainStatus = 'verified'
  ↓
If found → CustomDomainPortal (slug-free routing)
If not found → DomainNotFoundPage
```

### Custom Domain Routes (slug-free)

When accessed via custom domain, routes have no tenant slug:

| Path | Portal | Description |
|------|--------|-------------|
| `/` | Returns | Portal landing page |
| `/register` | Returns | Return registration wizard |
| `/track/:returnNumber?` | Returns | Return tracking |
| `/portal` | Customer | Dashboard (redirects to login if unauthenticated) |
| `/portal/login` | Customer | Customer login |
| `/portal/register` | Customer | Customer self-registration |
| `/portal/returns` | Customer | Returns list |
| `/portal/returns/new` | Customer | Create return |
| `/portal/returns/:id` | Customer | Return detail |
| `/portal/tickets` | Customer | Tickets list |
| `/portal/tickets/:id` | Customer | Ticket detail |
| `/portal/profile` | Customer | Profile settings |

### Services

| Service | Purpose |
|---------|---------|
| `domain-resolution.ts` | `resolveTenantByDomain(hostname)` — public anon query, returns `DomainResolutionResult` (tenantId, slug, name, portalType, branding) |
| `domain-verification.ts` | `verifyDomainCNAME(domain)` — uses Google DNS-over-HTTPS, checks CNAME points to `cname.vercel-dns.com` |
| `vercel-domain.ts` | `addDomainToVercel()` / `removeDomainFromVercel()` — invokes Edge Function |

### Edge Function: `manage-vercel-domain`

Server-side Vercel domain management. Requires JWT auth + admin role. Validates domain belongs to user's tenant. Calls Vercel API (`POST /v10/projects/{projectId}/domains`).

Required secrets: `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` (optional).

### DNS Setup Wizard

`CustomDomainWizard` component provides a 4-step setup:
1. Enter domain → validate with `validateDomain()`
2. Select DNS provider (8 providers: Cloudflare, GoDaddy, Namecheap, Hetzner, IONOS, Strato, AWS Route 53, Other)
3. Add CNAME record → shows provider-specific instructions with copy buttons
4. Verify DNS → polls `verifyDomainCNAME()` every 10 seconds

### Portal Domain Settings

Stored in `tenants.settings.returnsHub.portalDomain` (JSONB):

```typescript
interface PortalDomainSettings {
  customDomain: string;              // e.g., "dpp.company.de"
  portalType: 'returns' | 'customer' | 'both';
  domainStatus: 'pending' | 'verified' | 'failed';
  domainVerifiedAt?: string;
  vercelDomainAdded?: boolean;
}
```

### Key Files

| File | Purpose |
|------|---------|
| `src/hooks/useCustomDomainDetection.ts` | Hook: detects custom domains, resolves tenant, caches in sessionStorage |
| `src/components/CustomDomainPortal.tsx` | Slug-free portal router based on `portalType` |
| `src/components/settings/CustomDomainWizard.tsx` | 4-step domain setup wizard |
| `src/components/returns/PortalDomainSettingsCard.tsx` | UI for managing custom domain in settings |
| `src/lib/dns-providers.ts` | 8 DNS provider configs with step-by-step instructions |
| `src/lib/domain-utils.ts` | Domain validation, normalization, URL construction |
| `supabase/functions/manage-vercel-domain/index.ts` | Edge Function for Vercel API |

## DPP Design System

### Overview

Configurable design system for public DPP pages. 11 template variants, 6 theme presets, full customization of colors, typography, hero, cards, sections, and footer.

### 11 Template Variants

| Template | Component | Focus |
|----------|-----------|-------|
| `modern` | `TemplateModern.tsx` | Contemporary design, icons, badges, grid layouts |
| `classic` | `TemplateClassic.tsx` | Traditional card-based, progress bars, structured |
| `compact` | `TemplateCompact.tsx` | Space-efficient, condensed sections, collapsible |
| `minimal` | `TemplateMinimal.tsx` | Clean, simple, basic sections only |
| `technical` | `TemplateTechnical.tsx` | Technical specs, performance metrics, data layout |
| `eco-friendly` | `TemplateEcoFriendly.tsx` | Sustainability focus, green scheme, carbon emphasis |
| `premium` | `TemplatePremium.tsx` | Luxury/upscale, refined typography, quality emphasis |
| `government` | `TemplateGovernment.tsx` | Official/formal, compliance focus, customs prominence |
| `retail` | `TemplateRetail.tsx` | E-commerce, star ratings, customer-facing |
| `scientific` | `TemplateScientific.tsx` | Technical/research, detailed supply chain, data tables |
| `accessible` | `TemplateAccessible.tsx` | WCAG AA, high contrast, semantic HTML, large text |

All templates accept `{ product, visibilityV2, view, dppDesign }` and use `useDPPTemplateData()` hook.

### 6 Theme Presets

| Preset | Description | Primary / Secondary / Accent |
|--------|-------------|------------------------------|
| `ocean` | Cool blues and teals | #0EA5E9 / #06B6D4 / #14B8A6 |
| `forest` | Natural greens and emeralds | #10B981 / #059669 / #D97706 |
| `sunset` | Warm oranges and ambers | #F97316 / #EF4444 / #F59E0B |
| `midnight` | Dark indigos and purples | #8B5CF6 / #6366F1 / #EC4899 |
| `corporate` | Professional slates and blues | #3B82F6 / #64748B / #0EA5E9 |
| `minimal` | Clean grays, no distractions | #6B7280 / #9CA3AF / #6B7280 |

### Design Settings Structure

```typescript
DPPDesignSettings {
  colors: { secondaryColor, accentColor, pageBackground, cardBackground, textColor, headingColor }
  typography: { fontFamily, headingFontSize, bodyFontSize, headingFontWeight }
  hero: { visible, style ('gradient'|'solid'|'image'|'minimal'), height, backgroundImage, overlayOpacity }
  cards: { borderRadius, shadowDepth, borderStyle, backgroundOpacity }
  sections: { order: DPPSectionId[], configs: { [sectionId]: { visible, defaultCollapsed } } }
  footer: { legalNoticeUrl, privacyPolicyUrl, showPoweredBy, socialLinks: { website, instagram, linkedin, twitter } }
  preset: string
}
```

**Section IDs**: `materials`, `carbonFootprint`, `recycling`, `certifications`, `supplyChain`, `support`

### Type Literals

```typescript
DPPFontFamily: 'system' | 'Inter' | 'Roboto' | 'Poppins' | 'Merriweather' | 'Playfair Display'
DPPFontSize: 'small' | 'medium' | 'large'
DPPFontWeight: 'normal' | 'semibold' | 'bold' | 'extrabold'
DPPHeroStyle: 'gradient' | 'solid' | 'image' | 'minimal'
DPPHeroHeight: 'compact' | 'normal' | 'tall'
DPPBorderRadius: 'none' | 'small' | 'medium' | 'large' | 'full'
DPPShadowDepth: 'none' | 'subtle' | 'medium' | 'strong'
DPPBorderStyle: 'none' | 'thin' | 'thick'
DPPTemplateName: 'modern' | 'classic' | 'compact' | 'minimal' | 'technical' | 'eco-friendly' | 'premium' | 'government' | 'retail' | 'scientific' | 'accessible'
```

### CSS Mapping Constants (`src/lib/dpp-design-defaults.ts`)

| Constant | Maps |
|----------|------|
| `FONT_FAMILY_MAP` | Font family → CSS font stack |
| `GOOGLE_FONT_URLS` | Font family → Google Fonts URL |
| `BORDER_RADIUS_MAP` | Size → rem value (0 to 1.5rem) |
| `SHADOW_MAP` | Depth → CSS box-shadow |
| `HEADING_FONT_SIZE_MAP` | Size → rem (1.25 to 1.875rem) |
| `BODY_FONT_SIZE_MAP` | Size → rem (0.8125 to 1rem) |
| `FONT_WEIGHT_MAP` | Weight → CSS weight (400 to 800) |
| `HERO_HEIGHT_MAP` | Height → rem (6 to 14rem) |
| `BORDER_STYLE_MAP` | Style → CSS border shorthand |

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/dpp-design-defaults.ts` | `DEFAULT_DPP_DESIGN`, `DPP_THEME_PRESETS`, all CSS mapping constants |
| `src/lib/dpp-design-utils.ts` | `resolveDesign()`, style generators (card, hero, text, heading, page), section helpers |
| `src/lib/dpp-template-helpers.ts` | Rating colors/gradients/stars, `hasSupportContent()` helper |
| `src/hooks/use-dpp-template-data.ts` | `useDPPTemplateData()` — centralizes visibility, sections, design, styles for all templates |
| `src/types/database.ts` | All DPP type definitions (settings, colors, typography, hero, cards, sections, footer) |
| `src/components/public/Template*.tsx` | 11 template components |
| `src/components/public/DPPESPRSections.tsx` | Shared ESPR 2024/1781 compliance sections for all 11 templates |

## Workflow Execution Engine

### Overview

Client-side automation engine (`src/services/supabase/rh-workflow-engine.ts`) that evaluates and executes workflow rules when trigger events occur in the Returns Hub. Uses a graph-walking algorithm to traverse condition/action nodes.

### Entry Point

```typescript
executeWorkflowsForEvent(eventType: TriggerEventType, context: WorkflowEventContext): Promise<void>
```

Called fire-and-forget from service functions. Errors are logged, never thrown to caller.

### Execution Flow

```
1. Check feature gate (settings.features.workflowRules)
2. Load active rules from rh_workflow_rules (filtered by trigger_type, ordered by sort_order)
3. Hydrate context (lazy-load return, ticket, customer entities)
4. For each rule:
   a. Re-entrancy guard (skip if rule ID already executing)
   b. Deserialize conditions → WorkflowGraph
   c. Walk graph from trigger node
```

### Trigger Events (6 implemented, 6 reserved)

**Implemented**: `return_created`, `return_status_changed`, `ticket_created`, `ticket_status_changed`, `customer_risk_changed`, `customer_tag_added`

**Reserved (types defined)**: `return_overdue`, `ticket_overdue`, `scheduled_daily`, `scheduled_weekly`, `scheduled_monthly`, `manual`

### Integration Points

The engine is called via dynamic `import()` from:
- `returns.ts` → `createReturn()` (return_created)
- `returns.ts` → `updateReturnStatus()` (return_status_changed)
- `rh-tickets.ts` → `createRhTicket()` (ticket_created)
- `rh-tickets.ts` → `updateRhTicket()` (ticket_status_changed)
- `rh-customers.ts` → `updateRhCustomer()` (customer_risk_changed, customer_tag_added)

### Graph Walking Algorithm

1. Find trigger node in graph
2. Evaluate trigger-level filters (optional pre-conditions)
3. Recursively walk outgoing edges from current node
4. **Condition nodes**: evaluate → follow `true` or `false` branch edge
5. **Action nodes**: execute action → continue walking
6. **Delay nodes**: sleep for duration (client-side only) → continue walking

### Field Resolution (Dotted Paths)

`resolveFieldValue("return.status", ctx)` → walks object: `ctx.return.status`

Supports entities: `return.*`, `customer.*`, `ticket.*`. Bare field names default to return (if present) or ticket.

Nested paths supported: `customer.returnStats.totalReturns`

### Condition Operators (13)

| Operator | Behavior |
|----------|----------|
| `equals` | String comparison |
| `not_equals` | String inequality |
| `contains` | Array includes or string contains (case-insensitive) |
| `not_contains` | Inverse of contains |
| `greater_than` | Numeric > |
| `less_than` | Numeric < |
| `greater_or_equal` | Numeric >= |
| `less_or_equal` | Numeric <= |
| `in` | Value in comma-separated list or array |
| `not_in` | Value not in list |
| `is_empty` | Null, empty string, or empty array |
| `is_not_empty` | Not null, not empty |
| `matches_regex` | Regex pattern match |

Conditions within a node use AND or OR logic (`ConditionLogicOperator`).

### Action Types (21)

**Return actions (7):**
- `set_status` — Change return status
- `set_priority` — Set priority (low/normal/high/urgent)
- `assign` — Assign to user
- `approve` — Approve return
- `reject` — Reject with optional reason
- `add_note` — Add system note to timeline
- `update_field` — Dynamically update any return field

**Ticket actions (6):**
- `ticket_create` — Create new ticket
- `ticket_set_status` — Change ticket status
- `ticket_set_priority` — Set ticket priority
- `ticket_assign` — Assign to agent
- `ticket_add_message` — Add system message (internal by default)
- `ticket_add_tag` — Add tag (deduplicates)

**Customer actions (3):**
- `customer_update_risk_score` — Set risk score (0-100)
- `customer_add_tag` — Add tag (deduplicates)
- `customer_update_notes` — Set notes

**Notification actions (3):**
- `email_send_template` — Send pre-built email template with variable substitution
- `email_send_custom` — Create custom email notification
- `notification_internal` — Create internal notification

**Utility actions (2):**
- `timeline_add_entry` — Add entry to return timeline
- `webhook_call` — Call external webhook (POST with context or custom body)

### Re-Entrancy Guard

Module-scoped `executingRuleIds: Set<string>` prevents a rule from re-triggering itself when its actions fire the same event type.

### Feature Gate

Reads `settings.features.workflowRules` boolean. If disabled, all rules are skipped with a console warning.

## Visibility System V2

### Overview

Three-tier hierarchical field-level visibility for DPP pages. 36 fields across 9 categories. Supports per-product and per-tenant configuration.

### Visibility Levels

1. `consumer` — visible to everyone (public DPP page)
2. `customs` — visible to customs officers + admin (customs view)
3. `internal` — admin only (never shown on public pages)

Hierarchical: customs view sees consumer + customs fields. Internal sees all.

### 36 Fields Across 9 Categories

| Category | Fields |
|----------|--------|
| **Basic Data** | name, image, description, manufacturer, category |
| **Identifiers** | gtin, serialNumber, batchNumber |
| **Materials** | materials, materialOrigins |
| **Sustainability** | carbonFootprint, carbonRating |
| **Recycling** | recyclability, recyclingInstructions, disposalMethods |
| **Certifications** | certifications, certificateDownloads |
| **Supply Chain** | supplyChainSimple, supplyChainFull, supplyChainProcessType, supplyChainTransport, supplyChainEmissions, supplyChainCost |
| **Customs Data** | hsCode, countryOfOrigin, netWeight, grossWeight, manufacturerAddress, manufacturerEORI, manufacturerVAT |
| **Support** | supportResources, supportWarranty, supportFaq, supportVideos, supportRepair, supportSpareParts |

### Configuration Hierarchy

1. **Product-specific**: `visibility_settings` row with `product_id` set
2. **Tenant-wide**: `visibility_settings` row with `product_id = null`
3. **Defaults**: `defaultVisibilityConfigV2` from `src/types/visibility.ts`

Product-specific settings override tenant defaults. Deleting product-specific settings reverts to tenant defaults.

### Key Functions

| Function | Purpose |
|----------|---------|
| `getVisibilitySettings(productId?)` | Fetch config (product → tenant → defaults fallback) |
| `saveVisibilitySettings(config, productId?)` | Upsert product or tenant settings |
| `getPublicVisibilitySettings(gtin, serial)` | Public lookup (no auth, requires RLS policy) |
| `isFieldVisibleForView(config, field, view)` | Check if field is visible for consumer/customs/internal |

### Database

Table: `visibility_settings` with `product_id` (nullable) + `settings` (JSONB with `version: 2` and `fields` map).

Migration `20260201_visibility_public_policy.sql` adds public SELECT RLS policy so unauthenticated DPP pages can read visibility settings.

## Routes (App.tsx)

### Authentication & Landing

| Path | Page | Description |
|------|------|-------------|
| `/landing` | LandingPage | Marketing landing page |
| `/login` | LoginPage | Admin login |
| `/auth/callback` | AuthCallbackPage | OAuth callback |
| `/auth/reset-password` | ResetPasswordPage | Password reset |

### Public Product Views (no auth)

| Path | Page | Description |
|------|------|-------------|
| `/p/:gtin/:serial` | PublicCustomerPage | Local resolver format |
| `/01/:gtin/21/:serial` | PublicCustomerPage | GS1 Digital Link format |
| `/p/:gtin/:serial/customs` | PublicCustomsPage | Customs view (local) |
| `/01/:gtin/21/:serial/customs` | PublicCustomsPage | Customs view (GS1) |

### Supplier Portal (Public, invitation-based)

| Path | Page | Description |
|------|------|-------------|
| `/suppliers/register/:invitationCode` | SupplierRegisterPage | Supplier self-registration wizard (4 steps) |

### Admin Area (Protected)

| Path | Page | Description |
|------|------|-------------|
| `/` | DashboardPage | Main dashboard |
| `/products` | ProductsPage | Product list |
| `/products/new` | ProductFormPage | Create product |
| `/products/categories` | ProductCategoriesPage | Category management |
| `/products/:id` | ProductPage | Product detail |
| `/products/:id/edit` | ProductFormPage | Edit product |
| `/products/:id/batches/new` | BatchFormPage | Create batch |
| `/products/:id/batches/:batchId` | BatchDetailPage | Batch detail |
| `/products/:id/batches/:batchId/edit` | BatchFormPage | Edit batch |
| `/dpp` | DPPOverviewPage | DPP overview |
| `/dpp/qr-generator` | QRGeneratorPage | QR code generator |
| `/dpp/visibility` | DPPVisibilitySettingsPage | Field visibility settings |
| `/dpp/batch-upload` | PlaceholderPage | Batch upload (placeholder) |
| `/documents` | DocumentsPage | Document management |
| `/documents/upload` | DocumentsPage | Document upload tab |
| `/documents/tracker` | DocumentsPage | Document tracker tab |
| `/supply-chain` | SupplyChainPage | Supply chain management |
| `/suppliers` | SuppliersPage | Supplier management |
| `/compliance` | CompliancePage | Compliance overview |
| `/compliance/export` | CompliancePage | Compliance export tab |
| `/compliance/audit-log` | CompliancePage | Audit log tab |
| `/checklists` | ChecklistPage | Checklists by country |
| `/checklists/:country` | ChecklistPage | Country-specific checklist |
| `/regulations` | RegulationsPage | EU & national regulations |
| `/regulations/countries` | RegulationsPage | Country regulations tab |
| `/regulations/eu` | RegulationsPage | EU regulations tab |
| `/regulations/pictograms` | RegulationsPage | Pictograms tab |
| `/regulations/news` | RegulationsPage | News tab |
| `/requirements-calculator` | RequirementsCalculatorPage | Requirements calculator tool |
| `/news` | NewsPage | News & updates |
| `/settings/company` | SettingsPage | Company settings |
| `/settings/branding` | SettingsPage | Branding settings |
| `/settings/users` | SettingsPage | User management |
| `/settings/api-keys` | SettingsPage | API key management |
| `/help` | PlaceholderPage | Help & support (placeholder) |
| `/admin` | AdminPage | Admin panel |

### Returns Hub (Protected)

| Path | Page | Description |
|------|------|-------------|
| `/returns` | ReturnsHubDashboardPage | Returns dashboard with KPIs + charts |
| `/returns/list` | ReturnsListPage | Returns list with filters + pagination |
| `/returns/new` | CreateReturnPage | Create return (admin) |
| `/returns/:id` | ReturnDetailPage | Return detail with items, timeline, inspection |
| `/returns/customers` | CustomersListPage | Customer directory |
| `/returns/customers/:id` | CustomerDetailPage | Customer profile + history |
| `/returns/tickets` | TicketsListPage | Ticket queue + Kanban board |
| `/returns/tickets/:id` | TicketDetailPage | Ticket thread + SLA + assignment |
| `/returns/reports` | ReturnsReportsPage | Analytics & reporting |
| `/returns/settings` | ReturnsSettingsPage | Configuration (7 tabs) |
| `/returns/email-templates` | EmailTemplateEditorPage | Visual email template editor |
| `/returns/workflows` | WorkflowRulesPage | Workflow rule list |
| `/returns/workflows/:id/builder` | WorkflowBuilderPage | Visual workflow builder |

### Returns Portal (Public, no auth)

| Path | Page | Description |
|------|------|-------------|
| `/returns/portal/:tenantSlug` | PublicReturnPortalPage | Portal landing |
| `/returns/register/:tenantSlug` | PublicReturnRegisterPage | Return registration wizard |
| `/returns/track/:returnNumber?` | PublicReturnTrackingPage | Return tracking |

### Customer Portal (Separate customer auth)

| Path | Page | Description |
|------|------|-------------|
| `/customer/:tenantSlug/login` | CustomerLoginPage | Customer login |
| `/customer/:tenantSlug/register` | CustomerRegisterPage | Customer self-registration |
| `/customer/:tenantSlug/auth/callback` | CustomerAuthCallbackPage | OAuth callback |
| `/customer/:tenantSlug` | CustomerDashboardPage | Dashboard |
| `/customer/:tenantSlug/returns` | CustomerReturnsListPage | Returns list |
| `/customer/:tenantSlug/returns/new` | CustomerNewReturnPage | Create return |
| `/customer/:tenantSlug/returns/:id` | CustomerReturnDetailPage | Return detail |
| `/customer/:tenantSlug/tickets` | CustomerTicketsListPage | Tickets list |
| `/customer/:tenantSlug/tickets/:id` | CustomerTicketDetailPage | Ticket detail |
| `/customer/:tenantSlug/profile` | CustomerProfilePage | Profile settings |

## Supplier Self-Registration Portal

### Overview

Complete invitation-based supplier onboarding system allowing suppliers to self-register through a secure, multi-step wizard. Admin sends email invitation → supplier fills detailed form → admin reviews and approves/rejects.

### Architecture

**Flow**:
```
Admin creates invitation → generates unique invitation code
  ↓
Email sent to supplier with registration link
  ↓
Supplier visits /suppliers/register/{invitationCode}
  ↓
Validation: check code, expiry, status
  ↓
4-step wizard: Company Basics → Address → Legal/Banking → Business Details
  ↓
Submission creates supplier with status 'pending_approval'
  ↓
Admin reviews → Approve (status='active') or Reject (status='blocked')
```

### Database Tables

**New table**: `supplier_invitations`
- `id` — UUID primary key
- `tenant_id` — Tenant reference
- `email` — Supplier email
- `contact_name` — Optional pre-fill
- `company_name` — Optional pre-fill
- `invitation_code` — UUID, unique, URL-safe
- `status` — 'pending' | 'completed' | 'expired' | 'cancelled'
- `invited_by` — User ID who created invitation
- `created_at`, `expires_at`, `completed_at`
- `supplier_id` — References `suppliers.id` after completion

**RLS Policies**: Authenticated users see their tenant's invitations. Public anon SELECT for invitation code validation (single row lookup).

### Service Layer

**File**: `src/services/supabase/supplier-portal.ts` (NEW)

| Function | Purpose |
|----------|---------|
| `getSupplierInvitations()` | Fetch all invitations for current tenant |
| `createSupplierInvitation(params)` | Create invitation, generate code, set expiry (returns invitationUrl) |
| `cancelSupplierInvitation(id)` | Cancel pending invitation |
| `getSupplierInvitationByCode(code)` | PUBLIC: Validate code, return invitation + tenant + branding (no auth) |
| `publicSubmitSupplierRegistration(code, data)` | PUBLIC: Create supplier with status='pending_approval', mark invitation completed |
| `approveSupplier(id)` | Set status='active', verified=true |
| `rejectSupplier(id, reason?)` | Set status='blocked', add reason to internal notes |

**Return Type** for `createSupplierInvitation`:
```typescript
{
  invitation: SupplierInvitation;
  invitationUrl: string; // e.g., "https://app.com/suppliers/register/abc-123"
}
```

### Wizard Components

**File structure** (`src/components/suppliers/public/`):
- `SupplierRegisterPage.tsx` — Main wizard orchestrator (stepper, validation, submission)
- `CompanyBasicsStep.tsx` — Company name, type, contact person
- `AddressStep.tsx` — Billing address + optional shipping address
- `LegalBankingStep.tsx` — Tax number, VAT, IBAN, BIC, legal form
- `BusinessDetailsStep.tsx` — Industry, product categories, certifications, notes

**Wizard Features**:
- 4 steps with progress indicator
- Multi-step form validation with react-hook-form
- "Use billing address" checkbox for shipping
- Required field enforcement (15 required fields)
- Terms & conditions acceptance
- Auto-save to localStorage (recovery on refresh)
- Success confirmation page with next steps

### Supplier Status Workflow

```
pending_approval → [Admin Review] → active | blocked
```

**Statuses**:
- `pending_approval` — Awaiting admin review (default after registration)
- `active` — Approved, can be assigned to products
- `blocked` — Rejected, cannot be assigned

**Display**: `SuppliersPage` shows pending suppliers in separate section with Approve/Reject buttons.

### Admin UI Integration

**File**: `src/pages/SuppliersPage.tsx`

**New features**:
1. "Invite Supplier" button → modal with email input
2. Invitation list table (status, email, created date, actions)
3. Copy invitation link button (clipboard API)
4. Pending suppliers section with Approve/Reject actions
5. Rejection reason prompt (dialog with text input)

### Types

**File**: `src/types/supplier-portal.ts` (NEW)

```typescript
interface SupplierInvitation {
  id: string;
  tenantId: string;
  email: string;
  contactName?: string;
  companyName?: string;
  invitationCode: string;
  status: 'pending' | 'completed' | 'expired' | 'cancelled';
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  completedAt?: string;
  supplierId?: string;
}

interface SupplierRegistrationData {
  // 30+ fields covering company, address, legal, banking, business details
  companyName: string;
  contactName: string;
  email: string;
  // ... (see file for full structure)
  termsAccepted: boolean;
}

interface PublicSupplierInvitationResult {
  invitation: SupplierInvitation;
  tenant: { id: string; name: string; slug: string };
  portalSettings: SupplierPortalSettings;
  branding: { logoUrl?: string; primaryColor?: string };
}

interface SupplierPortalSettings {
  enabled: boolean;
  invitationExpiryDays: number; // Default: 14
  requireApproval: boolean; // Always true currently
  welcomeMessage?: string;
  autoCreateSupplierUser?: boolean; // Future: create auth account
}
```

### Tenant Settings

**Location**: `tenants.settings.supplierPortal` (JSONB)

```typescript
{
  enabled: boolean;
  invitationExpiryDays: number;
  requireApproval: boolean;
  welcomeMessage?: string;
}
```

**Default**: Loaded from `DEFAULT_SUPPLIER_PORTAL_SETTINGS` constant when not set.

### Email Notifications (Future Enhancement)

Currently: Manual copy/paste invitation link.

**Planned**: Automatic email via Resend API when invitation created:
- Template: "You're invited to register as a supplier for {tenant.name}"
- Variables: `{{contactName}}`, `{{companyName}}`, `{{invitationUrl}}`, `{{expiryDate}}`
- Locale-aware (EN/DE)

### Routes

**Public route** (no auth):
```
/suppliers/register/:invitationCode → SupplierRegisterPage
```

**Admin routes** (authenticated):
```
/suppliers → SuppliersPage (includes invitation management)
```

### Migration

**File**: `supabase/migrations/20260204_supplier_invitations.sql` (exists, not shown in git status)

Creates `supplier_invitations` table with RLS policies:
1. Authenticated SELECT/INSERT/UPDATE/DELETE for own tenant
2. Public anon SELECT for code validation (single row by invitation_code)

Adds `status` column to `suppliers` table (if not exists) with values: 'pending_approval' | 'active' | 'inactive' | 'blocked'.

### Translation Namespace

**New namespace**: `supplier-portal`

**Keys**: 40+ keys covering wizard steps, field labels, validation messages, success messages.

**Location**: `public/locales/{en,de}/supplier-portal.json`

**Example keys**:
```json
{
  "Supplier Registration": "Supplier Registration",
  "Company Basics": "Company Basics",
  "Legal & Banking Information": "Legal & Banking Information",
  "Terms must be accepted": "You must accept the terms and conditions",
  "Registration Successful": "Registration Successful",
  "Your registration has been submitted": "Your registration has been submitted and is pending approval."
}
```

## Returns Hub Module

### Overview

Full-featured returns management system with ticket support, customer portal, email notifications, and workflow automation. Located in `src/components/returns/`, `src/pages/returns/`, and `src/services/supabase/rh-*.ts`.

### Types (`src/types/returns-hub.ts`)

**Core enums:**
- `ReturnStatus`: 12 states (CREATED → PENDING_APPROVAL → APPROVED → LABEL_GENERATED → SHIPPED → DELIVERED → INSPECTION_IN_PROGRESS → REFUND_PROCESSING → REFUND_COMPLETED → COMPLETED, plus REJECTED, CANCELLED)
- `TicketStatus`: open, in_progress, waiting, resolved, closed
- `ReturnPriority`: low, normal, high, urgent
- `DesiredSolution`: refund, exchange, voucher, repair
- `ItemCondition`: new, like_new, used, damaged, defective
- `RhNotificationEventType`: 17 event types (return_confirmed, return_approved, return_rejected, return_shipped, return_label_ready, return_inspection_complete, refund_completed, exchange_shipped, ticket_created, ticket_agent_reply, ticket_customer_reply, ticket_resolved, welcome_email, voucher_issued, feedback_request, return_reminder, return_status_update)

**Key interfaces:**
- `RhReturn` — Return with status, priority, items, refund info, inspection, customs data, timeline
- `RhReturnItem` — Individual item (product, SKU, quantity, condition, refundAmount, photos)
- `RhCustomer` — Customer profile with addresses, payment methods, return stats, risk score, tags
- `RhTicket` — Ticket with category, priority, status, SLA tracking, assignee, tags, activity log
- `RhTicketMessage` — Messages in thread (senderType, content, attachments, isInternal flag)
- `RhWorkflowRule` — Automation rule with trigger, conditions, actions
- `RhEmailTemplate` — Email template with subject, body, designConfig, locale variants
- `ReturnsHubSettings` — Feature flags, plan, usage, branding, notifications, customer portal config, portal domain
- `CustomerPortalSettings` — Portal features, branding overrides, security settings
- `PortalDomainSettings` — Custom domain, portal type, status, verification timestamp
- `ReturnsHubStats` — Dashboard KPIs (openReturns, todayReceived, avgProcessingDays, returnRate, etc.)

### Settings (ReturnsSettingsPage — 7 tabs)

1. **General**: Enable/disable, return number prefix, default solution
2. **Return Reasons**: CRUD for categories with subcategories, follow-up questions, photo requirements
3. **License**: Plan management (starter/professional/business/enterprise), usage tracking, feature gates
4. **Branding**: Primary color, logo URL, portal URLs with copy-to-clipboard
5. **Tickets/SLA**: SLA defaults (first response hours, resolution hours), canned responses manager
6. **Notifications**: Enable email, sender name, email locale (EN/DE), link to visual editor
7. **Customer Portal**: Enable/disable, self-registration, magic link, feature toggles, branding overrides, security (session timeout, max login attempts)

### Email Notification System

**Flow**: `triggerEmailNotification(eventType, context)` → renders template with variable substitution → creates `rh_notifications` record → Edge Function `send-email` sends via Resend API.

**Two modes:**
- `triggerEmailNotification()` — authenticated (admin context)
- `triggerPublicEmailNotification(tenantId, ...)` — public portal (no auth)

**Variable substitution**: `{{customerName}}`, `{{returnNumber}}`, `{{status}}`, `{{reason}}`, `{{refundAmount}}`, `{{ticketNumber}}`, `{{subject}}`, `{{trackingUrl}}`

**Locale-aware**: Renders from `designConfig.locales[locale]` based on `settings.notifications.emailLocale`.

### Workflow Builder

Visual node-graph editor for automation rules. Located in `src/components/returns/workflow-builder/`.

**Node types**: Trigger, Condition, Action, Delay
**Components**: WorkflowCanvas (React Flow), WorkflowNode, WorkflowEdge, WorkflowNodePalette, WorkflowNodeConfig, TriggerConfigurator, ConditionBuilder, ActionConfigurator, EmailActionConfig, FieldPicker, WorkflowToolbar, WorkflowMinimap
**Serialization**: Full graph stored as JSONB with `_graphVersion: 2` in conditions column
**Validation**: Checks for exactly 1 trigger, all nodes connected, condition branches

## Email Template Editor v2

Split-pane visual email editor comparable to Mailchimp/Beefree. Located in `src/components/returns/email-editor/`.

### Architecture

```
EmailTemplateEditorPage.tsx        ← Entry point: gallery view OR editor view
  ├─ TemplateGallery.tsx           ← 15 template cards with search + category tabs
  │   └─ TemplateGalleryCard.tsx   ← Card with real mini iframe preview at 0.3 scale
  └─ [Editor Mode - split pane]
      ├─ EditorToolbar.tsx         ← Glassmorphism top bar (back, name, locale, undo/redo, save)
      │   └─ SaveStatusIndicator.tsx
      └─ EditorLayout.tsx          ← 3-column flex layout
          ├─ BlockInsertSidebar.tsx ← Left: 9 block types as draggable cards (72px wide)
          ├─ [Center Canvas]       ← Dot-grid background, blocks + insert handles
          │   ├─ CanvasBlock.tsx    ← Draggable block with hover/selection states
          │   ├─ FloatingBlockToolbar.tsx ← Move/duplicate/delete on hover
          │   └─ BlockInsertHandle.tsx   ← "+" button between blocks, opens popover
          └─ [Right Pane - 380px]  ← 3 tabs
              ├─ LivePreview.tsx    ← Auto-updating iframe with viewport toggle
              ├─ BlockSettingsPanel.tsx ← Block-specific settings for all 9 types
              └─ DesignSettingsPanel.tsx ← Global layout/header/footer/typography
```

### Block Types (9 total)

| Type | File | Description |
|------|------|-------------|
| `text` | `EmailTextBlock` | Rich text content |
| `button` | `EmailButtonBlock` | CTA button with URL, alignment, colors, border-radius |
| `divider` | `EmailDividerBlock` | Horizontal line with color + thickness |
| `spacer` | `EmailSpacerBlock` | Vertical spacing (height in px) |
| `info-box` | `EmailInfoBoxBlock` | Label + value display with background/border colors |
| `image` | `EmailImageBlock` | Image with alt, width, alignment, link URL, border-radius |
| `social-links` | `EmailSocialLinksBlock` | Social media icons (8 platforms, 3 styles, configurable size) |
| `columns` | `EmailColumnsBlock` | 2 or 3 column layout with nested blocks |
| `hero` | `EmailHeroBlock` | Full-width background + overlay + title/subtitle + CTA |

### Custom Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useEditorHistory` | `hooks/useEditorHistory.ts` | Undo/redo with 50-entry history stack |
| `useDragReorder` | `hooks/useDragReorder.ts` | HTML5 Drag API for block reordering + sidebar insert |
| `useAutosave` | `hooks/useAutosave.ts` | 2-second debounced autosave with status tracking |

### Key Files

| File | Purpose |
|------|---------|
| `emailEditorTypes.ts` | All block interfaces, design config types, editor state types |
| `emailHtmlRenderer.ts` | Pure function: `EmailDesignConfig` → inline-CSS HTML string (all 9 blocks) |
| `emailTemplateDefaults.ts` | 15 pre-built bilingual templates with factory functions |
| `SocialIconSvgs.ts` | SVG path data for 8 social platforms in 3 styles (colored/dark/light) |
| `ColorPickerField.tsx` | HSL gradient canvas + hue slider + hex input + 14 preset swatches |

### Design Config Structure

```typescript
EmailDesignConfig {
  layout: { maxWidth, backgroundColor, contentBackgroundColor, borderRadius, fontFamily, baseFontSize }
  header: { enabled, showLogo, logoUrl, logoHeight, backgroundColor, textColor, alignment }
  blocks: EmailBlock[]
  footer: { enabled, text, links[], backgroundColor, textColor }
  locales?: { [locale]: { blocks, subjectTemplate?, footerText? } }
}
```

### 15 Pre-built Templates

**Returns (8):** return_confirmed, return_approved, return_rejected, return_shipped, return_label_ready, return_inspection_complete, refund_completed, exchange_shipped

**Tickets (3):** ticket_created, ticket_agent_reply, ticket_resolved

**General (4):** welcome_email, voucher_issued, feedback_request, return_reminder

All templates include EN + DE locale variants, pre-configured header/footer, info-box blocks for status/amounts, CTA buttons, and proper spacing.

### Keyboard Shortcuts (Editor)

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` / `Cmd+Z` | Undo |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Redo |
| `Ctrl+S` / `Cmd+S` | Save |
| `Delete` / `Backspace` | Delete selected block |
| `Ctrl+D` / `Cmd+D` | Duplicate selected block |
| `Escape` | Deselect block |

### CSS Animations (`src/index.css`)

Custom keyframes for the editor: `block-delete`, `panel-slide-in`, `picker-fade-in`, `save-pulse`, `drop-zone-glow`, `insert-handle-pulse`, `canvas-dot-fade`, `drag-ghost-float`. Utility classes: `.animate-block-delete`, `.animate-panel-slide-in`, etc.

## Customer Portal

Separate authenticated area for end-customers (not admin users). Located in `src/pages/returns/public/` and `src/components/returns/public/`.

### Public Return Registration Wizard (7 steps)

1. `IdentificationStep` — Order number + email capture
2. `SelectItemsStep` — Add/remove items with condition selection
3. `ReturnReasonStep` — Category selection with follow-up questions
4. `PhotoUploadStep` — Drag-drop image upload for condition documentation
5. `SolutionStep` — Choose desired solution (refund/exchange/voucher/repair)
6. `ShippingStep` — Shipping method + address capture
7. `ConfirmationStep` — Review & submit

**Supporting components**: `WizardStepIndicator`, `WizardStepTransition`, `WizardSuccessPage`, `AnimatedTimeline`, `StatusPipeline` (maps 12 internal statuses to 6 customer-visible stages), `ContactSupportForm`

### Customer Portal Settings

Configurable via `CustomerPortalSettingsTab.tsx` in Returns Settings:
- Enable/disable portal, self-registration, email verification, magic link login
- Feature toggles: createReturns, viewTickets, createTickets, editProfile, viewOrderHistory, downloadLabels
- Branding overrides: inherit from Returns Hub or custom (primaryColor, logoUrl, welcomeMessage, footerText)
- Security: session timeout (minutes), max login attempts

### Customer Portal Context

`CustomerPortalProvider` provides tenant resolution, customer session, and branding. Supports both slug-based (`/customer/:tenantSlug/...`) and custom domain (`/portal/...`) routing via `tenantOverride` prop.

## Database Schema

### SQL Files

```
supabase/
├── schema.sql    # Tables, RLS policies, triggers
├── seed.sql      # Master data (categories, 38 countries, regulations, recycling codes)
├── storage.sql   # Storage buckets + RLS policies
├── functions/
│   ├── send-email/index.ts           # Email delivery via Resend API
│   └── manage-vercel-domain/index.ts # Custom domain management via Vercel API
└── migrations/
    ├── 20260201_ai_compliance_checks.sql      # AI compliance checks table + RLS
    ├── 20260201_visibility_public_policy.sql   # Public SELECT policy for visibility_settings
    ├── 20260204_supplier_invitations.sql      # Supplier portal invitation system
    └── 20260205_espr_compliance_fields.sql    # ESPR 2024/1781 compliance fields + facility_identifier
```

### Table Groups

**Master data (global, no RLS)**: `categories`, `countries`, `eu_regulations`, `national_regulations`, `pictograms`, `recycling_codes`, `checklist_templates`, `news_items`

**Tenant data (RLS enforced)**:

| Table | Purpose |
|-------|---------|
| `tenants` | Organizations with settings JSONB (branding, returns hub, QR, DPP design) |
| `profiles` | User profiles (linked to auth.users, stores tenant_id, role) |
| `products` | Product master records (materials, certs, carbon footprint as JSON columns) |
| `product_batches` | Product batch variants with serial numbers |
| `documents` | Certificates, reports, PDFs |
| `supply_chain_entries` | Supply chain steps per product |
| `checklist_progress` | Compliance checklist completion tracking |
| `suppliers` | Supplier information |
| `supplier_products` | Product-supplier associations |
| `visibility_settings` | DPP field visibility V2 (per product or per tenant) |
| `ai_compliance_checks` | AI compliance analysis results with raw responses |
| `product_images` | Product gallery images (order, primary flag, captions) |
| `invitations` | User invitations (email, role, status) |
| `activity_log` | Audit trail (action, entity, details, actor) |
| `supplier_invitations` | Supplier self-registration invitations (code, email, status, expiry) |

**Returns Hub data (RLS enforced, `rh_` prefix)**:

| Table | Purpose |
|-------|---------|
| `rh_customers` | Customer profiles (email, name, addresses, payment methods, risk score, tags) |
| `rh_customer_profiles` | Customer auth profiles (separate from admin auth) |
| `rh_returns` | Return requests (status, priority, customer, items, refund, inspection, customs) |
| `rh_return_items` | Items in a return (product, SKU, quantity, condition, photos) |
| `rh_return_timeline` | Status history entries (status, comment, actor) |
| `rh_tickets` | Support tickets (category, priority, SLA, assignee, tags) |
| `rh_ticket_messages` | Ticket thread messages (sender, content, attachments, isInternal) |
| `rh_email_templates` | Email templates per event type (subject, body, designConfig, locales) |
| `rh_notifications` | Notification records (channel, status, recipient, content) |
| `rh_return_reasons` | Configurable reason categories (subcategories, follow-up questions) |
| `rh_workflow_rules` | Automation rules (trigger, conditions as graph JSON, actions) |

**Tenant settings storage**: `tenants.settings` JSONB stores Returns Hub settings (features, branding, notifications, customer portal config, canned responses, portal domain), QR settings, and DPP design settings.

### Key Data Model

Products store complex data as JSON columns: `materials` (array), `certifications` (array), `carbon_footprint` (object), `recyclability` (object). Customs-relevant scalar fields: `hs_code`, `batch_number`, `country_of_origin`, `net_weight`, `gross_weight`.

### Edge Functions

| Function | Purpose | Trigger | Required Secrets |
|----------|---------|---------|-----------------|
| `send-email` | Sends emails via Resend API | INSERT on `rh_notifications` (channel=email, status=pending) | `RESEND_API_KEY` |
| `manage-vercel-domain` | Add/remove custom domains from Vercel project | HTTP call from client | `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` |

## Hooks Reference (`src/hooks/`)

| Hook | Purpose | Returns |
|------|---------|---------|
| `use-mobile.ts` | Viewport width detection (< 768px) | `boolean` |
| `use-branding.ts` | Access branding context | Re-export of `useBranding` |
| `use-locale.ts` | Current i18n language | `'en' \| 'de'` |
| `use-ai-stream.ts` | Generic OpenRouter streaming | `{ text, isStreaming, error, startStream, reset }` |
| `use-compliance-check.ts` | 3-phase compliance analysis orchestrator | `{ result, phases, isRunning, error, phaseTexts, startCheck, abort, reset }` |
| `use-public-product.ts` | Load public product with visibility + design | `{ product, visibilityV2, dppDesign, loading, ... }` |
| `use-dpp-template-data.ts` | Centralized visibility/sections/styles for DPP templates | `{ isFieldVisible, consumerSections, design, styles, t, product, view }` |
| `use-scroll-reveal.ts` | IntersectionObserver visibility trigger | `{ ref, isVisible }` |
| `useAnimatedNumber.ts` | Animated number counter (cubic ease-out) | `number` (animated value) |
| `useStaggeredList.ts` | Staggered animation visibility array | `boolean[]` |
| `useCustomDomainDetection.ts` | Custom domain detection + tenant resolution | `{ isCustomDomain, isResolving, resolution, error }` |
| `useReturnsPortal.ts` | Returns portal context consumer | `ReturnsPortalContextType` |
| `useCustomerPortal.ts` | Customer portal context consumer | `CustomerPortalContextType` |

## Library Files Reference (`src/lib/`)

| File | Key Exports | Purpose |
|------|-------------|---------|
| `utils.ts` | `cn()` | Tailwind class merging (clsx + twMerge) |
| `supabase.ts` | `supabase`, `getCurrentTenantId()` | Supabase client + tenant resolution |
| `dynamic-theme.ts` | `applyPrimaryColor()`, `applyFavicon()`, `applyDocumentTitle()`, `applyBranding()`, `resetBranding()`, `DEFAULT_BRANDING` | Runtime theme application via CSS vars |
| `format.ts` | `formatDate()`, `formatNumber()` | Locale-aware formatting (en-US/de-DE) |
| `domain-utils.ts` | `isValidDomain()`, `normalizeDomain()`, `validateDomain()`, `validatePathPrefix()`, `buildDomainUrl()` | Domain validation + URL construction |
| `dns-providers.ts` | `DNS_PROVIDERS[]`, `CNAME_TARGET`, `getProviderById()`, `getSubdomainFromDomain()` | 8 DNS provider configs with setup instructions |
| `dpp-design-defaults.ts` | `DEFAULT_DPP_DESIGN`, `DPP_THEME_PRESETS`, `FONT_FAMILY_MAP`, `BORDER_RADIUS_MAP`, `SHADOW_MAP`, etc. | DPP design system defaults + CSS mappings |
| `dpp-design-utils.ts` | `resolveDesign()`, `getCardStyle()`, `getHeroStyle()`, `getTextStyle()`, `getHeadingStyle()`, `getPageStyle()`, `getSectionOrder()`, `isSectionVisible()` | Design resolution + CSS style generators |
| `dpp-template-helpers.ts` | `RATING_BG_COLORS`, `RATING_GRADIENT_COLORS`, `RATING_STARS`, `hasSupportContent()` | Shared constants/helpers for 11 DPP templates |
| `supply-chain-constants.ts` | `PROCESS_TYPE_CONFIG`, `STATUS_CONFIG`, `TRANSPORT_CONFIG` | Supply chain visualization configs (9 process types, 5 statuses, 5 transport modes) |
| `document-categories.ts` | `DOCUMENT_CATEGORIES`, `DocumentCategory` | 14 document type classifications |
| `registration-fields.ts` | `REGISTRATION_FIELDS` | 10 product registration field definitions (WEEE, EPREL, REACH, etc.) |
| `certification-options.ts` | `CERTIFICATION_CATEGORIES`, `ALL_CERTIFICATION_NAMES` | 28+ certification options in 5 categories |
| `return-number.ts` | `generateReturnNumber()`, `generateTicketNumber()` | Return/ticket number generation (prefix-YYYYMMDD-random+luhn) |
| `animations.ts` | `staggerDelay()`, `relativeTime()`, `sparklinePoints()` | Animation utilities + relative time formatting |

## Type Files Reference (`src/types/`)

| File | Key Types | Purpose |
|------|-----------|---------|
| `supabase.ts` | `Database`, `Json`, `Tables<T>` | Supabase schema types (all tables Row/Insert/Update) |
| `product.ts` | `Product`, `ProductBatch`, `Material`, `Certification`, `CarbonFootprint`, `RecyclabilityInfo` | Product domain model |
| `database.ts` | `Tenant`, `TenantSettings`, `DPPDesignSettings`, `DPPTemplateName`, `DPPColorSettings`, `DPPTypographySettings`, `DPPHeroSettings`, `DPPCardSettings`, `DPPSectionSettings`, `DPPFooterSettings`, `Document`, `Supplier`, `Category`, `Country`, `Invitation`, `ActivityLogEntry`, `ProductImage`, `ProductRegistrations`, `SupportResources` | Comprehensive entity types + DPP design system |
| `returns-hub.ts` | `RhReturn`, `RhReturnItem`, `RhCustomer`, `RhTicket`, `RhTicketMessage`, `RhWorkflowRule`, `RhEmailTemplate`, `ReturnsHubSettings`, `CustomerPortalSettings`, `PortalDomainSettings`, `ReturnStatus`, `TicketStatus` | Returns Hub domain model (12+ entity types) |
| `workflow-builder.ts` | `WorkflowNode`, `WorkflowEdge`, `WorkflowGraph`, `TriggerEventType`, `WorkflowActionType`, `ConditionOperator`, `FieldMetadata`, `RETURN_FIELDS`, `CUSTOMER_FIELDS`, `TICKET_FIELDS` | Workflow builder types + field metadata constants |
| `compliance-check.ts` | `ComplianceCheckResult`, `ComplianceFinding`, `ActionPlanItem`, `Recommendation`, `RiskMatrixEntry`, `RiskLevel`, `FindingCategory`, `SavedComplianceCheck` | AI compliance analysis result types |
| `visibility.ts` | `VisibilityLevel`, `VisibilityConfigV2`, `FieldVisibilityConfig`, `fieldDefinitions[]`, `fieldCategories[]`, `defaultVisibilityConfigV2` | 3-tier visibility system (36 fields, 9 categories) |
| `customer-portal.ts` | `CustomerPortalProfile`, `CustomerDashboardStats`, `CustomerReturnInput`, `CustomerReturnsFilter` | Customer portal types |
| `supplier-portal.ts` | `SupplierInvitation`, `SupplierRegistrationData`, `PublicSupplierInvitationResult`, `SupplierPortalSettings` | Supplier portal types |

## Component Organization

### Shared UI Components (`src/components/ui/`)

shadcn/ui components (New York style). Never modify directly — use `npx shadcn@latest add <component>` to add new ones.

### AI Components (`src/components/ai/`)

7 components for AI streaming text, analysis UI, and chat: `AIStreamingText`, `AIAnalysisButton`, `AIAnalysisCard`, `AIOverallAssessment`, `AIActionPlan`, `AIAdditionalReqs`, `AIChatPanel`.

### Compliance Check Components (`src/components/compliance-check/`)

7 components for EU-ESPR compliance analysis: `AIComplianceCheckTab`, `ComplianceScoreGauge`, `ComplianceFindingsPanel`, `ComplianceRiskMatrix`, `ComplianceActionPlan`, `ComplianceCheckHistory`, `ComplianceReportPDF`.

### DPP Template Components (`src/components/public/`)

11 public DPP page templates: `TemplateModern`, `TemplateClassic`, `TemplateCompact`, `TemplateMinimal`, `TemplateTechnical`, `TemplateEcoFriendly`, `TemplatePremium`, `TemplateGovernment`, `TemplateRetail`, `TemplateScientific`, `TemplateAccessible`.

### Landing Page Components (`src/components/landing/`)

12 marketing landing page components: `LandingNavbar`, `LandingHero`, `LandingTrustBar`, `LandingFeaturesBento`, `LandingDPPShowcase`, `LandingSupplyChain`, `LandingAISection`, `LandingReturnsHub`, `LandingEmailEditor`, `LandingStats`, `LandingCTA`, `LandingFooter`.

### Returns Hub Components (`src/components/returns/`)

**Shared returns components:**
- `ReturnStatusBadge`, `ReturnTimeline`, `ReturnReasonSelect`, `ReturnItemsTable`
- `ReturnKPICards`, `ReturnCharts` — Dashboard widgets
- `CustomerCard`, `CustomerGridCard` — Customer display
- `PhotoLightbox` — Image gallery for return photos
- `PageHeader`, `PaginationBar`, `EmptyState` — Layout helpers
- `SkeletonTable`, `SkeletonKPICards` — Loading states
- `FeatureGate` — Feature flag guard component

**Ticket components:**
- `TicketPriorityBadge`, `TicketSLABadge`, `TicketTagsEditor`
- `TicketActivityLog`, `TicketFilterPanel`, `TicketThread`
- `TicketAssigneeSelect`, `TicketKanbanBoard`, `TicketKPICards`
- `CannedResponsePicker` — Quick-reply selector
- `SLAProgressBar` — Visual SLA countdown

**Public return wizard components** (`src/components/returns/public/`):
- 7 wizard steps: `IdentificationStep`, `SelectItemsStep`, `ReturnReasonStep`, `PhotoUploadStep`, `SolutionStep`, `ShippingStep`, `ConfirmationStep`
- Supporting: `WizardStepIndicator`, `WizardStepTransition`, `WizardSuccessPage`, `AnimatedTimeline`, `StatusPipeline`, `ContactSupportForm`

**Email editor:** `src/components/returns/email-editor/` (see Email Template Editor v2 section)

**Workflow builder:** `src/components/returns/workflow-builder/` (see Workflow Builder section)

**Settings:** `CustomerPortalSettingsTab.tsx`, `PortalDomainSettingsCard.tsx`

### Domain Components

- `src/components/CustomDomainPortal.tsx` — Slug-free portal router
- `src/components/settings/CustomDomainWizard.tsx` — 4-step domain setup wizard

### Supplier Portal Components

**Admin components** (`src/components/suppliers/`):
- `SupplierInvitationDialog.tsx` — Create invitation modal
- `SupplierInvitationTable.tsx` — Invitation list with status badges
- `PendingSupplierCard.tsx` — Pending supplier review card with approve/reject

**Public wizard components** (`src/components/suppliers/public/`):
- `SupplierRegisterPage.tsx` — Main wizard orchestrator
- `CompanyBasicsStep.tsx` — Step 1: Company name, type, contact
- `AddressStep.tsx` — Step 2: Billing + optional shipping address
- `LegalBankingStep.tsx` — Step 3: Tax, VAT, IBAN, BIC, legal form
- `BusinessDetailsStep.tsx` — Step 4: Industry, categories, certifications

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
| `returns` | Returns Hub (returns, tickets, email editor, workflows, reports, settings) |
| `customer-portal` | Customer portal UI (customer-facing returns, tickets, profile) |
| `landing` | Marketing landing page |
| `supplier-portal` | Supplier self-registration wizard (company, address, legal, banking, business details) |

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
- **Returns Hub services**: Prefixed with `rh-` (e.g., `rh-tickets.ts`, `rh-customers.ts`)
- **Returns Hub DB tables**: Prefixed with `rh_` (e.g., `rh_returns`, `rh_tickets`)
- **New pages**: Add route in `App.tsx`, use existing layout system
- **Email templates**: Edit via visual editor at `/returns/email-templates`, 15 built-in templates
- **Workflow rules**: Edit via visual builder at `/returns/workflows/:id/builder`
- **Customer portal**: Separate auth flow, routes under `/customer/:tenantSlug/`
- **Custom domains**: Routes under `/` and `/portal/...` when `CustomDomainGate` detects white-label domain
- **DPP templates**: All 11 use `useDPPTemplateData()` hook for visibility/design/styles
- **AI features**: OpenRouter streaming via `useAIStream()` or `useComplianceCheck()` hooks
- **Seed scripts**: Follow pattern in `scripts/seed-checklist-templates.mjs` — load `.env`, use REST API with service role key, upsert with `Prefer: resolution=ignore-duplicates`

## Environment Variables

```env
# Required (frontend)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Optional (frontend)
VITE_OPENROUTER_API_KEY=sk-or-...    # OpenRouter API key for AI compliance analysis (Claude Sonnet 4)

# For seed scripts only (server-side)
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Edge Function secrets (Supabase dashboard)
RESEND_API_KEY=re_...                 # Resend email API (for send-email function)
VERCEL_TOKEN=...                      # Vercel API token (for manage-vercel-domain function)
VERCEL_PROJECT_ID=prj_...            # Vercel project ID
VERCEL_TEAM_ID=team_...              # Vercel team ID (optional, for team accounts)
```
