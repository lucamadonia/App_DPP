# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DPP Manager** — React SPA zur Verwaltung digitaler Produktpässe (EU-ESPR-Verordnung) mit integriertem Returns Hub (Retouren-Management, Ticket-System, Kunden-Portal). Multi-Tenant SaaS mit Supabase-Backend. Deutsche und englische Benutzeroberfläche.

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
- **Production**: https://dpp-app.fambliss.eu (Vercel: https://app-dpp.vercel.app)

## Architecture

### Context Hierarchy (App.tsx)

```
BrowserRouter
  └─ AuthProvider          ← session + tenantId resolution
      └─ BrandingProvider  ← runtime theming (CSS vars, favicon, title)
          ├─ Public routes  (/login, /p/:gtin/:serial, /01/:gtin/21/:serial)
          ├─ Returns Portal (/returns/portal/:tenantSlug, /returns/register/:tenantSlug)
          ├─ Customer Portal (/customer/:tenantSlug/...) ← separate auth for customers
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

**Core services:**

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

**Returns Hub services (`rh-*.ts`):**

| Service | Domain |
|---------|--------|
| `returns.ts` | Return CRUD, status updates, stats, public return creation |
| `return-items.ts` | Items within a return (add/update/remove) |
| `return-timeline.ts` | Status history entries |
| `rh-customers.ts` | Customer profiles, addresses, return stats |
| `rh-tickets.ts` | Ticket CRUD, messages, SLA tracking, Kanban, merge |
| `rh-ticket-attachments.ts` | File uploads for ticket attachments |
| `rh-canned-responses.ts` | Quick-reply templates (stored in tenant settings) |
| `rh-settings.ts` | Returns Hub settings, return reasons, customer portal config |
| `rh-email-templates.ts` | Email template CRUD, seeding 15 defaults, reset to default |
| `rh-notifications.ts` | Notification records (pending/sent/delivered/failed) |
| `rh-notification-trigger.ts` | Email rendering with variable substitution + locale support |
| `rh-workflows.ts` | Workflow rule CRUD, graph serialization for visual builder |
| `customer-portal.ts` | Customer auth, profile, returns/tickets from customer side |

### Storage Buckets

Three Supabase Storage buckets (configured in `supabase/storage.sql`):

| Bucket | Public | Limit | Used by |
|--------|--------|-------|---------|
| `documents` | No | 50MB | `uploadDocument()` — certificates, reports, ticket attachments |
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

**Product views** — two URL patterns:
- `/p/:gtin/:serial` — local resolver format
- `/01/:gtin/21/:serial` — GS1 Digital Link standard

Both render `PublicProductPage` inside `PublicLayout`. Query param `?view=zoll` switches to customs view.

**Returns portal** (no auth):
- `/returns/portal/:tenantSlug` — Portal landing page
- `/returns/register/:tenantSlug` — Self-service return registration wizard (6 steps)
- `/returns/track/:returnNumber?` — Return tracking by return number

**Customer portal** (separate customer auth, not admin auth):
- `/customer/:tenantSlug/login` — Customer login
- `/customer/:tenantSlug/register` — Customer self-registration
- `/customer/:tenantSlug` — Customer dashboard
- `/customer/:tenantSlug/returns` — Customer's returns list
- `/customer/:tenantSlug/returns/new` — Create new return
- `/customer/:tenantSlug/returns/:id` — Return detail
- `/customer/:tenantSlug/tickets` — Customer's tickets
- `/customer/:tenantSlug/tickets/:id` — Ticket detail
- `/customer/:tenantSlug/profile` — Customer profile

### Visibility System

Three-tier hierarchical visibility per product field:
1. `consumer` — visible to everyone
2. `customs` — visible to customs + admin
3. `internal` — admin only

Configured per product in `visibility_settings` table, managed via `DPPVisibilitySettingsPage`.

## Routes (App.tsx)

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
| `/dpp` | DPPOverviewPage | DPP overview |
| `/dpp/qr-generator` | QRGeneratorPage | QR code generator |
| `/dpp/visibility` | DPPVisibilitySettingsPage | Field visibility |
| `/documents` | DocumentsPage | Document management |
| `/supply-chain` | SupplyChainPage | Supply chain entries |
| `/suppliers` | SuppliersPage | Supplier management |
| `/compliance` | CompliancePage | Compliance overview |
| `/checklists` | ChecklistPage | Country checklists |
| `/regulations` | RegulationsPage | EU/national regulations |
| `/requirements-calculator` | RequirementsCalculatorPage | Requirements tool |
| `/news` | NewsPage | News/updates |
| `/settings/company` | SettingsPage | Company settings |
| `/settings/branding` | SettingsPage | Branding settings |
| `/settings/users` | SettingsPage | User management |
| `/settings/api-keys` | SettingsPage | API key management |
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
- `ReturnsHubSettings` — Feature flags, plan, usage, branding, notifications, customer portal config
- `CustomerPortalSettings` — Portal features, branding overrides, security settings
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

**Flow**: `triggerEmailNotification(eventType, context)` → renders template with variable substitution → creates `rh_notifications` record → Edge Function webhook sends email.

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

### Public Return Registration Wizard (6 steps)

1. `IdentificationStep` — Customer email/name verification
2. `SelectItemsStep` — Choose products to return
3. `ReturnReasonStep` — Reason selection with follow-up questions
4. `PhotoUploadStep` — Upload condition photos
5. `SolutionStep` — Choose desired solution (refund/exchange/voucher/repair)
6. `ShippingStep` — Shipping method + address
7. `ConfirmationStep` — Review & submit

**Supporting components**: `WizardStepIndicator`, `WizardStepTransition`, `WizardSuccessPage`, `AnimatedTimeline`, `StatusPipeline`, `ContactSupportForm`

### Customer Portal Settings

Configurable via `CustomerPortalSettingsTab.tsx` in Returns Settings:
- Enable/disable portal, self-registration, email verification, magic link login
- Feature toggles: createReturns, viewTickets, createTickets, editProfile, viewOrderHistory, downloadLabels
- Branding overrides: inherit from Returns Hub or custom (primaryColor, logoUrl, welcomeMessage, footerText)
- Security: session timeout (minutes), max login attempts

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

**Returns Hub data (RLS enforced, `rh_` prefix)**:

| Table | Purpose |
|-------|---------|
| `rh_customers` | Customer profiles (email, name, addresses, payment methods, risk score, tags) |
| `rh_returns` | Return requests (status, priority, customer, items, refund, inspection, customs) |
| `rh_return_items` | Items in a return (product, SKU, quantity, condition, photos) |
| `rh_return_timeline` | Status history entries (status, comment, actor) |
| `rh_tickets` | Support tickets (category, priority, SLA, assignee, tags) |
| `rh_ticket_messages` | Ticket thread messages (sender, content, attachments, isInternal) |
| `rh_email_templates` | Email templates per event type (subject, body, designConfig, locales) |
| `rh_notifications` | Notification records (channel, status, recipient, content) |
| `rh_return_reasons` | Configurable reason categories (subcategories, follow-up questions) |
| `rh_workflow_rules` | Automation rules (trigger, conditions as graph JSON, actions) |

**Tenant settings storage**: `tenants.settings.returnsHub` stores Returns Hub settings, features, branding, notifications, customer portal config, and canned responses as JSONB.

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
| `returns` | Returns Hub (returns, tickets, email editor, workflows, reports, settings) |
| `customer-portal` | Customer portal UI (customer-facing returns, tickets, profile) |

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

## Component Organization

### Shared UI Components (`src/components/ui/`)
shadcn/ui components (New York style). Never modify directly — use `npx shadcn@latest add <component>` to add new ones.

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

**Email editor:** `src/components/returns/email-editor/` (see Email Template Editor v2 section)

**Workflow builder:** `src/components/returns/workflow-builder/` (see Workflow Builder section)

**Customer portal settings:** `CustomerPortalSettingsTab.tsx`

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
- **Seed scripts**: Follow pattern in `scripts/seed-checklist-templates.mjs` — load `.env`, use REST API with service role key, upsert with `Prefer: resolution=ignore-duplicates`

## Environment Variables

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# For seed scripts only:
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```
