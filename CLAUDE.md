# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DPP Manager** (Digital Product Passport) - Eine React-Anwendung zur Verwaltung digitaler Produktpässe gemäß EU-Verordnung, Compliance-Tracking und QR-Code-Generierung für Produktrückverfolgbarkeit.

## Commands

```bash
npm run dev      # Start development server (Vite HMR)
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: TailwindCSS 4 + shadcn/ui (New York style)
- **Routing**: React Router DOM 7
- **State**: TanStack React Query
- **Icons**: Lucide React
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Hosting**: Vercel

---

## Funktionen & Features

### 1. Dashboard (`/`)
- Übersicht über alle Produkte und DPP-Status
- Schnellzugriff auf wichtige Funktionen
- Statistiken und KPIs

### 2. Produktverwaltung (`/products`)
- **Alle Produkte** (`/products`) - Liste aller Produkte mit Suche und Filter
- **Neues Produkt** (`/products/new`) - Formular zum Anlegen neuer Produkte
- **Produktdetails** (`/products/:id`) - Detailansicht eines Produkts
- **Produkt bearbeiten** (`/products/:id/edit`) - Bearbeitungsformular
- **Kategorien** (`/products/categories`) - Produktkategorien verwalten

### 3. Digital Product Passport (DPP) (`/dpp`)
- **Übersicht** (`/dpp`) - Status aller digitalen Produktpässe
- **QR-Generator** (`/dpp/qr-generator`) - QR-Codes für Produkte erstellen
  - Unterstützt GS1 Digital Link Format
  - Anpassbare Größe, Farben, Fehlerkorrektur
  - Batch-Export für mehrere Produkte
  - Lokale Vorschau-URLs für Verbraucher- und Zollansicht
- **Sichtbarkeitseinstellungen** (`/dpp/visibility`) - Konfiguration welche Felder öffentlich sichtbar sind
- **Batch-Upload** (`/dpp/batch-upload`) - Massenimport von Produkten (Placeholder)

### 4. Öffentliche Produktseiten (ohne Login)
- **Verbraucheransicht** (`/p/:gtin/:serial`) - Benutzerfreundliche Produktinfos
  - Produktname, Bild, Beschreibung
  - Materialzusammensetzung mit Herkunft
  - CO2-Fußabdruck mit Rating (A-E)
  - Recycling-Anleitung & Entsorgung
  - Zertifizierungen (Badges)
  - Vereinfachte Lieferkette
- **Zollansicht** (`/p/:gtin/:serial?view=zoll`) - Detaillierte Zolldaten
  - Alle Verbraucherfelder PLUS:
  - GTIN, Seriennummer, Chargennummer
  - HS-Code (Zolltarifnummer)
  - Herkunftsland, Gewicht (Netto/Brutto)
  - Hersteller-Details (Adresse, EORI, USt-IdNr.)
  - Vollständige Lieferkette mit Ländern
  - Zertifikat-Downloads (PDFs)
- **GS1-Format** (`/01/:gtin/21/:serial`) - Alternative URL nach GS1-Standard

### 5. Sichtbarkeitssystem (3 Stufen)
```
┌─────────────────────────────────────────────────────┐
│ 👥 Verbraucher - Alle sehen dieses Feld            │
│     ↓                                               │
│ 🛡️ Zoll - Nur Zoll + Admin sehen dieses Feld       │
│     ↓                                               │
│ 🔒 Nur intern - Nur Admin sieht dieses Feld        │
└─────────────────────────────────────────────────────┘
```
- Hierarchisch: Höhere Stufen sehen alles von niedrigeren Stufen
- Pro Feld konfigurierbar
- Kategorieweise Schnelländerung

### 6. Dokumente (`/documents`)
- **Alle Dokumente** (`/documents`) - Dokumentenverwaltung
- **Hochladen** (`/documents/upload`) - Neue Dokumente hochladen
- **Gültigkeits-Tracker** (`/documents/tracker`) - Ablaufdaten überwachen

### 7. Compliance (`/compliance`)
- **Prüfprotokoll** (`/compliance`) - Compliance-Status prüfen
- **Export** (`/compliance/export`) - Berichte exportieren
- **Audit-Log** (`/compliance/audit-log`) - Änderungshistorie

### 8. Regulierungen (`/regulations`)
- **Länder** (`/regulations/countries`) - Ländersspezifische Anforderungen
- **EU-Regulierungen** (`/regulations/eu`) - EU-Vorschriften
- **Piktogramme** (`/regulations/pictograms`) - Erforderliche Symbole
- **News** (`/regulations/news`) - Aktuelle Änderungen

### 9. Checklisten (`/checklists`)
- Compliance-Checklisten für verschiedene Länder
- Interaktive Abhak-Listen
- Fortschrittsanzeige

### 10. Anforderungs-Kalkulator (`/requirements-calculator`)
- Berechnet erforderliche DPP-Felder basierend auf:
  - Produktkategorie
  - Zielländer
  - Regulierungen

### 11. Einstellungen (`/settings`)
- **Firmenprofil** (`/settings/company`) - Unternehmensdaten
- **Branding** (`/settings/branding`) - Logo, Farben
- **Benutzer & Rollen** (`/settings/users`) - Benutzerverwaltung
- **API-Keys** (`/settings/api-keys`) - API-Schlüssel verwalten

### 12. Admin-Bereich (`/admin`)
- Master-Daten-Verwaltung (Kategorien, Länder, Regulierungen)
- Nur für Administratoren zugänglich
- CRUD-Operationen für globale Stammdaten

### 13. Supply Chain (`/supply-chain`)
- Lieferketten-Übersicht aller Produkte
- Visualisierung der Lieferkettenschritte
- Zuordnung von Lieferanten zu Produkten

### 14. Lieferanten (`/suppliers`)
- Lieferantenverwaltung (Anlegen, Bearbeiten, Löschen)
- Zuordnung zu Produkten über `supplier_products`
- Kontaktdaten und Zertifizierungen

---

## Datenmodell

### Product (Produkt)
```typescript
interface Product {
  id: string;
  tenant_id: string;              // Multi-Tenant Isolation
  name: string;
  manufacturer: string;
  gtin: string;                    // Global Trade Item Number
  serialNumber: string;
  productionDate: string;
  expirationDate?: string;
  category: string;
  description: string;
  imageUrl?: string;

  // Materialien (JSON)
  materials: Material[];           // Name, Prozent, recycelbar, Herkunft

  // Zertifizierungen (JSON)
  certifications: Certification[]; // Name, Aussteller, Gültig bis, PDF-URL

  // Nachhaltigkeit (JSON)
  carbonFootprint?: CarbonFootprint; // CO2 total/Produktion/Transport, Rating A-E
  recyclability: RecyclabilityInfo;  // Prozent, Anleitung, Entsorgungsmethoden

  // Zollrelevante Felder
  hsCode?: string;                 // Zolltarifnummer
  batchNumber?: string;            // Chargennummer
  countryOfOrigin?: string;        // Herkunftsland
  netWeight?: number;              // Nettogewicht (g)
  grossWeight?: number;            // Bruttogewicht (g)

  // Herstellerdetails
  manufacturerAddress?: string;
  manufacturerEORI?: string;       // Economic Operators Registration ID
  manufacturerVAT?: string;        // Umsatzsteuer-ID
}
```

### VisibilityConfig (Sichtbarkeit)
```typescript
type VisibilityLevel = 'internal' | 'customs' | 'consumer';

interface VisibilityConfigV2 {
  id?: string;
  version: 2;
  fields: {
    [fieldKey: string]: VisibilityLevel;
  };
}
```

### Tenant & Branding Typen
```typescript
interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  settings: TenantSettings;
  plan: 'free' | 'pro' | 'enterprise';
}

interface TenantSettings {
  defaultLanguage: string;
  qrCodeStyle: string;
  branding: BrandingSettings;
  qrCode: QRCodeDomainSettings;
}

interface BrandingSettings {
  appName: string;
  primaryColor: string;           // Hex-Farbwert
  logo?: string;                  // URL zum Logo
  favicon?: string;               // URL zum Favicon
  poweredByText?: string;         // "Powered by" Text
}

interface QRCodeDomainSettings {
  customDomain?: string;          // z.B. "qr.example.com"
  pathPrefix: string;             // z.B. "/p"
  useHttps: boolean;
  resolver: 'internal' | 'gs1';
  colors: { foreground: string; background: string; };
}

interface UserSettings {
  id: string;
  tenant_id: string;
  user_id: string;
  qr_settings: object;
  domain_settings: QRCodeDomainSettings;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}
```

---

## Architecture

### Layout System
- `AppLayout` - Admin-Seiten mit Sidebar-Navigation
- `PublicLayout` - Öffentliche Seiten ohne Sidebar (für QR-Code-Ziele)

### Key Directories
```
src/
├── pages/                    # Seitenkomponenten
│   ├── DashboardPage.tsx
│   ├── ProductsPage.tsx
│   ├── ProductPage.tsx
│   ├── ProductFormPage.tsx
│   ├── ProductCategoriesPage.tsx
│   ├── DPPOverviewPage.tsx
│   ├── DPPVisibilitySettingsPage.tsx
│   ├── QRGeneratorPage.tsx
│   ├── DocumentsPage.tsx
│   ├── CompliancePage.tsx
│   ├── RegulationsPage.tsx
│   ├── ChecklistPage.tsx
│   ├── RequirementsCalculatorPage.tsx
│   ├── SettingsPage.tsx
│   ├── AdminPage.tsx
│   ├── SupplyChainPage.tsx
│   ├── SuppliersPage.tsx
│   ├── LoginPage.tsx
│   ├── AuthCallbackPage.tsx
│   └── public/               # Öffentliche Seiten
│       ├── PublicLayout.tsx
│       └── PublicProductPage.tsx
├── components/
│   ├── app-sidebar.tsx       # Haupt-Navigation
│   ├── SupabaseAuth.tsx      # Auth-Komponente (Login/Register)
│   └── ui/                   # shadcn/ui Komponenten
├── contexts/
│   ├── AuthContext.tsx        # Supabase Auth State
│   └── BrandingContext.tsx    # Branding/Whitelabel State
├── services/
│   ├── api.ts                # Legacy API (wird ersetzt)
│   └── supabase/             # Supabase Services
│       ├── index.ts          # Re-exports
│       ├── auth.ts           # Auth Funktionen
│       ├── products.ts       # Produkt CRUD
│       ├── documents.ts      # Dokumente + Storage
│       ├── suppliers.ts      # Lieferanten
│       ├── supply-chain.ts   # Supply Chain
│       ├── checklists.ts     # Checklisten
│       ├── master-data.ts    # Kategorien, Länder, etc.
│       ├── tenants.ts        # Tenant-Verwaltung + Branding
│       ├── profiles.ts       # User-Profile + Einladungen
│       └── visibility.ts     # Sichtbarkeitseinstellungen
├── lib/
│   ├── supabase.ts           # Supabase Client
│   ├── utils.ts              # Hilfsfunktionen
│   ├── dynamic-theme.ts      # Runtime-Theming (CSS-Variablen)
│   └── domain-utils.ts       # Custom-Domain-Logik
├── types/
│   ├── product.ts            # Produkt-Typen
│   ├── database.ts           # Datenbank-Typen
│   ├── supabase.ts           # Supabase-spezifische Typen
│   └── visibility.ts         # Sichtbarkeits-Typen
└── hooks/
    ├── use-mobile.tsx         # Mobile Detection
    └── use-branding.ts        # Branding-Hook (re-export)
scripts/
├── seed-master-data.ts        # Master-Daten Seeding
├── generate-types.ts          # Supabase Typ-Generierung
└── check-env.ts               # Environment-Validierung
```

### Supabase Integration

#### Client (`src/lib/supabase.ts`)
```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export async function getCurrentTenantId(): Promise<string | null>;
```

#### Auth Methods
- **Email/Password** - Standard Sign-Up/Sign-In
- **Google OAuth** - Social Login
- **Magic Link/OTP** - Passwortlos per E-Mail

#### Services (`src/services/supabase/`)
| Service | Beschreibung |
|---------|--------------|
| `auth.ts` | signUp, signIn, signInWithGoogle, signInWithOtp, signOut |
| `products.ts` | getProducts, getProduct, createProduct, updateProduct, deleteProduct |
| `documents.ts` | getDocuments, uploadDocument, deleteDocument (+ Storage) |
| `suppliers.ts` | getSuppliers, createSupplier, updateSupplier, deleteSupplier |
| `supply-chain.ts` | getSupplyChainEntries, createSupplyChainEntry |
| `checklists.ts` | getChecklistProgress, updateChecklistProgress, getChecklistStats |
| `master-data.ts` | getCategories, getCountries, getEURegulations (mit Caching) |
| `tenants.ts` | getTenant, updateTenant, updateTenantBranding, getQRCodeSettings, uploadBrandingAsset |
| `profiles.ts` | getProfile, getProfiles, inviteUser, removeUserFromTenant |
| `visibility.ts` | getVisibilitySettings, saveVisibilitySettings, getPublicVisibilitySettings |

### Branding & Whitelabeling

#### BrandingContext (`src/contexts/BrandingContext.tsx`)
- Globaler Branding-State via React Context
- `BrandingProvider` — lädt Tenant-Branding beim App-Start
- Stellt Defaults bereit wenn kein Branding konfiguriert ist
- Exportiert `useBranding()` Hook für Zugriff auf Branding-Daten

#### Dynamic Theme (`src/lib/dynamic-theme.ts`)
- `hexToHsl(hex)` — Konvertiert Hex-Farbe zu HSL-Werten
- `applyPrimaryColor(hex)` — Setzt CSS-Variable `--primary` und Varianten
- `applyBranding(settings)` — Wendet komplettes Branding an (Farbe, Favicon, Title)
- Aktualisiert CSS Custom Properties zur Laufzeit

#### Domain Utils (`src/lib/domain-utils.ts`)
- `isValidDomain(domain)` — Validiert Domain-Format
- `normalizeDomain(domain)` — Entfernt Protokoll/Trailing-Slash
- `validateDomain(domain)` — Vollständige Validierung mit Fehlermeldung
- `buildDomainUrl(settings, gtin, serial)` — Baut QR-Code-URL aus Domain-Settings

#### Branding Hook (`src/hooks/use-branding.ts`)
- Re-export von `useBranding()` aus BrandingContext
- Zugriff auf: `branding`, `tenant`, `isLoading`, `updateBranding()`

---

## Datenbank-Schema (Supabase)

### Multi-Tenant Architektur
- Alle Tenant-Tabellen haben `tenant_id` Spalte
- Row Level Security (RLS) isoliert Daten pro Tenant
- User-Profile verknüpft mit `auth.users`

### Tabellen

**Master-Daten (global, ohne RLS):**
| Tabelle | Beschreibung |
|---------|--------------|
| `categories` | Hierarchische Produktkategorien |
| `countries` | Länder mit Regulierungszählern |
| `eu_regulations` | EU-Verordnungen |
| `national_regulations` | Nationale Vorschriften |
| `pictograms` | Sicherheitspiktogramme |
| `recycling_codes` | Recycling-Codes |
| `checklist_templates` | Checklisten-Templates |
| `news_items` | Regelungsnews |

**Tenant-Daten (mit RLS):**
| Tabelle | Beschreibung |
|---------|--------------|
| `tenants` | Mandanten/Organisationen |
| `profiles` | User-Profile (→ auth.users) |
| `products` | Produkte mit JSON-Feldern |
| `documents` | Dokumente (→ Storage) |
| `supply_chain_entries` | Supply-Chain |
| `checklist_progress` | Checklisten-Fortschritt |
| `suppliers` | Lieferanten |
| `supplier_products` | Lieferant-Produkt-Zuordnung |
| `visibility_settings` | DPP-Sichtbarkeit |

### Storage Buckets
- `documents` (privat) - Zertifikate, Berichte
- `product-images` (öffentlich) - Produktbilder

### SQL-Dateien
```
supabase/
├── schema.sql    # Tabellen, RLS Policies, Trigger
├── seed.sql      # Master-Daten (Kategorien, Länder, etc.)
└── storage.sql   # Storage Buckets und Policies
```

---

## Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# API
VITE_API_URL=/api
```

---

## Deployment (Vercel)

- **Production URL**: https://dpp-manager.vercel.app
- **Vercel Projekt**: `dpp-manager`

### Konfiguration (`vercel.json`)
```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

### Setup
1. Vercel-Projekt erstellen
2. Environment Variables hinzufügen (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`)
3. Custom Domain konfigurieren
4. In Supabase: Redirect URLs für OAuth hinzufügen

### E-Mail (SMTP)
- **Provider**: All-Inkl (Custom SMTP)
- In Supabase Auth → SMTP Settings konfiguriert
- Verwendet für: Registrierungsbestätigung, Passwort-Reset, Magic Links

### Supabase URL-Konfiguration
- **Site URL**: `https://dpp-manager.vercel.app`
- **Redirect URLs**: `https://dpp-manager.vercel.app/**`, `http://localhost:5173/**`

---

## Conventions

- **Sprache**: Deutsche Benutzeroberfläche
- **Komponenten**: shadcn/ui aus `@/components/ui/`
- **Imports**: `@/` Pfad-Alias für src-Verzeichnis
- **Mobile**: 768px Breakpoint, `useIsMobile()` Hook
- **Farben**: Tailwind CSS mit CSS-Variablen für Theming
- **Datenbank-Zugriff**: Immer über Services, nie direkt in Komponenten
- **Tenant-Isolation**: `getCurrentTenantId()` für alle Tenant-Queries
