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
- **Backend**: NoCodeBackend.com REST API (primary) mit localStorage Fallback

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

---

## Datenmodell

### Product (Produkt)
```typescript
interface Product {
  id: string;
  name: string;
  manufacturer: string;
  gtin: string;                    // Global Trade Item Number
  serialNumber: string;
  productionDate: string;
  expirationDate?: string;
  category: string;
  description: string;
  imageUrl?: string;

  // Materialien
  materials: Material[];           // Name, Prozent, recycelbar, Herkunft

  // Zertifizierungen
  certifications: Certification[]; // Name, Aussteller, Gültig bis, PDF-URL

  // Nachhaltigkeit
  carbonFootprint?: CarbonFootprint; // CO2 total/Produktion/Transport, Rating A-E
  recyclability: RecyclabilityInfo;  // Prozent, Anleitung, Entsorgungsmethoden

  // Lieferkette
  supplyChain: SupplyChainEntry[]; // Schritt, Ort, Land, Datum, Beschreibung

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
  version: 2;
  fields: {
    [fieldKey: string]: VisibilityLevel;
  };
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
│   ├── DPPOverviewPage.tsx
│   ├── DPPVisibilitySettingsPage.tsx
│   ├── QRGeneratorPage.tsx
│   ├── DocumentsPage.tsx
│   ├── CompliancePage.tsx
│   ├── RegulationsPage.tsx
│   ├── ChecklistPage.tsx
│   ├── RequirementsCalculatorPage.tsx
│   ├── SettingsPage.tsx
│   └── public/               # Öffentliche Seiten
│       ├── PublicLayout.tsx
│       └── PublicProductPage.tsx
├── components/
│   ├── app-sidebar.tsx       # Haupt-Navigation
│   └── ui/                   # shadcn/ui Komponenten
├── services/
│   └── api.ts                # NoCodeBackend API
├── types/
│   ├── product.ts            # Produkt-Typen
│   └── visibility.ts         # Sichtbarkeits-Typen
└── lib/utils.ts              # Hilfsfunktionen
```

### API Integration (src/services/api.ts)
- **Base URL**: `https://api.nocodebackend.com`
- **Headers**: `Instance` + `Authorization: Bearer <token>`
- **Endpoints**:
  - `POST /create/{table}` - Datensatz erstellen
  - `GET /read/{table}` - Alle Datensätze lesen
  - `GET /read/{table}/{id}` - Einzelnen Datensatz lesen
  - `POST /search/{table}` - Datensätze suchen
  - `PUT /update/{table}/{id}` - Datensatz aktualisieren
  - `DELETE /delete/{table}/{id}` - Datensatz löschen
- **Fallback**: localStorage wenn API nicht erreichbar

### Datenbank-Tabellen
- `products` - Produktdaten mit JSON-Feldern für Arrays
- `visibility` - Sichtbarkeitseinstellungen

---

## Conventions

- **Sprache**: Deutsche Benutzeroberfläche
- **Komponenten**: shadcn/ui aus `@/components/ui/`
- **Imports**: `@/` Pfad-Alias für src-Verzeichnis
- **Mobile**: 768px Breakpoint, `useIsMobile()` Hook
- **Farben**: Tailwind CSS mit CSS-Variablen für Theming
