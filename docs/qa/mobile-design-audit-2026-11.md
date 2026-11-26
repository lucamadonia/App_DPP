# Mobile Design Audit — November 2026

Stand: 2026-11-09 · Snapshot nach Abschluss der Code-Agenten (dist gebaut 2026-11-09 14:02). Lauf: `MOBILE_AUDIT_LEAN=1 npx playwright test e2e/app-screens-mobile.spec.ts e2e/mobile-overflow.spec.ts e2e/mobile-overlays.spec.ts e2e/mobile-interactions.spec.ts e2e/mobile-gestures.spec.ts --trace=off`

Viewports: iPhone SE 320x568, Android 360x800, iPhone 375x812 (nur Public + Overlays), iPhone 390x844, iPhone 430x932, iPad Mini 768x1024. Safe Area simuliert mit `--safe-top: 47px; --safe-bottom: 34px`. Fixture-Daten (keine echte DB). Die Status-Spalten im ersten Lauf sind gegen den Re-Run abgeglichen.

## Erster Lauf (2026-11-09, vor Formular-Umbau)

**764 Tests: 576 passed, 183 failed, 5 skipped** (28.6 min).

| Spec | passed | failed | skipped |
|---|---|---|---|
| app-screens-mobile.spec.ts | 423 | 177 | 0 |
| mobile-gestures.spec.ts | 14 | 0 | 0 |
| mobile-interactions.spec.ts | 18 | 0 | 0 |
| mobile-overflow.spec.ts | 102 | 0 | 0 |
| mobile-overlays.spec.ts | 19 | 6 | 5 |

| Check | Screens ok | Screens mit Befund |
|---|---|---|
| Horizontaler Overflow (.app-content) | 599 | 1 |
| Abgeschnittener Text (ohne truncate/line-clamp) | 568 | 32 |
| Touch-Ziele < 44x44 px | 449 | 151 |
| Überlappung mit Tab-Bar / unerreichbar am Scroll-Ende | 468 | 12 |
| Inhalt in der oberen Safe Area (47 px) | 480 | 0 |
| Eingabefelder < 16 px Schrift (iOS-Fokus-Zoom) | 585 | 15 |
| Overlay: Close-Button (Safe Area, 44x44) | 19 | 3 |
| Overlay: Inhalt passt in Viewport | 19 | 3 |
| Overlay: Timeout (Messung nicht abgeschlossen) | – | 3 |

Hinweis: Touch-Ziele werden auf allen Touch-Projekten geprüft (inkl. iPad); Tab-Bar und Safe Area nur auf Phones. mobile-interactions/mobile-gestures liefen grün gegen diesen Build.

## Top-Befunde (dedupliziert nach Komponente)

| # | Check | Komponente | Routen | Viewports | Beispiel | Datei (vermutet) | Status |
|---|---|---|---|---|---|---|---|
| 1 | Touch-Ziele < 44x44 px | `button.peer.inline-flex.h-5.w-9` | /dpp/visibility, /dpp/design, /dpp/transparency, /returns/settings (+7) | 5 |  36x20 | src/components/ui/switch.tsx | behoben |
| 2 | Abgeschnittener Text | `button[data-slot=button].inline-flex.items-center.justify-center.gap-2` | /documents, /documents/upload, /documents/tracker, /checklists (+1) | 1 | "Dokument hinzufügen" 100x56 | src/pages/DocumentsPage.tsx | offen |
| 3 | Touch-Ziele < 44x44 px | `button[data-slot=checkbox].peer.border-input.dark:bg-input/30.data-[st` | /dpp/qr-generator, /requirements-calculator, /warehouse/inventory | 5 |  16x16 | src/components/ui/checkbox.tsx | behoben |
| 4 | Touch-Ziele < 44x44 px | `button.flex.w-full.items-center.gap-2` | /documents, /documents/upload, /documents/tracker | 1 | "Alle Dokumente 0" 263x32 | src/components/documents/DocumentSidebar.tsx | offen |
| 5 | Touch-Ziele < 44x44 px | `button.inline-flex.h-7.w-7.items-center` | /products/new, /products/:id/edit | 5 |  28x28 | src/pages/ProductFormPage.tsx | behoben |
| 6 | Touch-Ziele < 44x44 px | `button.flex.items-center.gap-2.px-3` | /warehouse/scanner, /warehouse/stocktake | 5 |  40x32 | src/pages/warehouse/ScannerPage.tsx | offen (Re-Run nicht gemessen) |
| 7 | Touch-Ziele < 44x44 px | `button.flex.items-center.gap-1.5.px-3` | /warehouse/scanner, /warehouse/movements | 5 | "Rückgängig" 111x28 | src/pages/warehouse/ScannerPage.tsx | behoben |
| 8 | Eingabefelder < 16 px Schrift | `textarea.flex.min-h-20.w-full.rounded-md` | /products/:id/batches/new, /products/:id/batches/:id/edit | 5 |  238x80 | src/components/ui/textarea.tsx | behoben |
| 9 | Touch-Ziele < 44x44 px | `button.w-full.text-left.px-3.py-2` | /warehouse/campaigns/new, /warehouse/campaigns/:id/edit | 5 | "Reisetasche mit einem besonders langen P" 236x36 | src/pages/warehouse/CampaignFormPage.tsx | behoben |
| 10 | Touch-Ziele < 44x44 px | `button.inline-flex.items-center.gap-1.5.rounded-full` | /warehouse/inventory, /warehouse/movements | 1 | "Nur niedriger Bestand" 168x28 | src/pages/warehouse/InventoryListPage.tsx | behoben |
| 11 | Touch-Ziele < 44x44 px | `button.relative.h-9.w-9.min-w-[36px]` | /settings/branding | 5 |  40x40 | src/pages/SettingsPage.tsx | behoben |
| 12 | Touch-Ziele < 44x44 px | `button.flex.shrink-0.items-center.gap-1.5` | /help | 5 |  38x26 | src/pages/TrainingGuidePage.tsx | offen |
| 13 | Touch-Ziele < 44x44 px | `button.flex-1.py-2.rounded-md.text-sm` | /dpp/design | 5 | "Klein" 31x39 | src/pages/DPPDesignPage.tsx | offen |
| 14 | Touch-Ziele < 44x44 px | `button.p-0.5.hover:bg-muted.rounded.disabled:opacity-30` | /dpp/design | 5 |  18x18 | src/pages/DPPDesignPage.tsx | offen |
| 15 | Touch-Ziele < 44x44 px | `button.inline-flex.items-center.gap-1.rounded-full` | /commerce | 5 | "Verbinden" 102x28 | src/pages/commerce/CommerceHubPage.tsx | behoben |
| 16 | Touch-Ziele < 44x44 px | `button.inline-flex.items-center.gap-1.5.rounded-lg` | /help | 5 | "Zur Seite" 114x38 | src/pages/TrainingGuidePage.tsx | offen |
| 17 | Touch-Ziele < 44x44 px | `button.flex-1.rounded-lg.border.px-2` | /dpp/transparency | 5 | "Sharp" 52x30 | src/pages/TransparencyConfigPage.tsx | behoben |
| 18 | Touch-Ziele < 44x44 px | `button.relative.inline-flex.items-center.gap-2` | /help | 4 | "Als abgeschlossen markieren" 255x38 | src/pages/TrainingGuidePage.tsx | offen |
| 19 | Touch-Ziele < 44x44 px | `button.min-h-[36px].rounded-full.border.px-3` | /suppliers | 5 | "Alle" 48x36 | src/pages/SuppliersPage.tsx | offen |
| 20 | Touch-Ziele < 44x44 px | `button.flex-1.rounded-lg.border.px-3` | /dpp/transparency | 5 | "Gradient" 91x38 | src/pages/TransparencyConfigPage.tsx | behoben |
| 21 | Touch-Ziele < 44x44 px | `button.flex.items-center.gap-1.5.rounded-lg` | /dpp/transparency | 5 | "Light" 81x38 | src/pages/TransparencyConfigPage.tsx | behoben |
| 22 | Touch-Ziele < 44x44 px | `button.snap-start.px-3.sm:px-4.py-2.5` | /warehouse/shipments/:id | 5 | "Übersicht" 89x42 | src/pages/warehouse/ShipmentDetailPage.tsx | behoben |
| 23 | Abgeschnittener Text | `p.font-medium` | /dpp/design | 3 | "Umweltfreundlich" 95x20 | src/pages/DPPDesignPage.tsx | offen |
| 24 | Abgeschnittener Text | `button.p-3.rounded-lg.border.text-center` | /dpp/design | 5 | "Farbverlauf" 54x46 | src/pages/DPPDesignPage.tsx | offen |
| 25 | Touch-Ziele < 44x44 px | `a.text-xs.text-primary.hover:underline.flex` | /crm | 5 | "Alle" 37x16 | src/pages/crm/CrmDashboardPage.tsx | behoben |

## Overlays (Sheets/Dialoge, mobile-overlays.spec.ts)

| Overlay | Problem | Viewports | Datei (vermutet) | Status |
|---|---|---|---|---|
| Sidebar drawer (header menu) | button[data-slot=sheet-close] "Close": top 4 < safe-top 47 | iPhone SE, Android 360, iPhone 390 | src/components/ui/sheet.tsx | behoben |
| Sidebar drawer (header menu) | div[data-slot=sidebar] "Start Dashboard Tagesgeschäft " 288x568: content wider than panel (417 > 287) | iPhone SE | src/components/ui/sidebar.tsx | behoben |
| Sidebar drawer (header menu) | div[data-slot=sidebar] "Sidebar Displays the mobile si" 288x800: content wider than panel (417 > 287) | Android 360 | src/components/ui/sidebar.tsx | behoben |
| Sidebar drawer (header menu) | div[data-slot=sidebar] "Start Dashboard Tagesgeschäft " 288x844: content wider than panel (417 > 287) | iPhone 390 | src/components/ui/sidebar.tsx | behoben |
| More sheet (Tab-Bar) | Test-Timeout (60 s) in page.evaluate — Messung hängt (WebKit), manuell prüfen | iPhone 430 | src/components/layout/more-sheet.tsx | behoben (Re-Run grün) |
| Sidebar drawer | Test-Timeout (60 s) — Messung hängt | iPhone 375, iPhone 430 | src/components/ui/sidebar.tsx | behoben (Re-Run grün) |

## Re-Run 2026-11-09 nach Formular-Umbau

Frischer Build (`npm run build`) nach Commit be5af4b; gleicher Aufruf plus `e2e/public-return-wizard.spec.ts`. Der Tap-Target-Check berücksichtigt jetzt unsichtbare `::after`-Trefferflächen (switch, checkbox, breadcrumb-link, `.touch-hit`).

**772 Tests: 682 passed, 85 failed, 5 skipped** (19.0 min). Alle Specs außer app-screens-mobile sind grün.

| Spec | passed | failed | skipped |
|---|---|---|---|
| app-screens-mobile.spec.ts | 515 | 85 | 0 |
| mobile-gestures.spec.ts | 14 | 0 | 0 |
| mobile-interactions.spec.ts | 18 | 0 | 0 |
| mobile-overflow.spec.ts | 102 | 0 | 0 |
| mobile-overlays.spec.ts | 25 | 0 | 5 |
| public-return-wizard.spec.ts | 8 | 0 | 0 |

| Check | Lauf 1 (Screens mit Befund) | Re-Run (Screens mit Befund) |
|---|---|---|
| Horizontaler Overflow (.app-content) | 1/600 | 1/590 |
| Abgeschnittener Text (ohne truncate/line-clamp) | 32/600 | 29/590 |
| Touch-Ziele < 44x44 px | 151/600 | 47/590 |
| Überlappung mit Tab-Bar / unerreichbar am Scroll-Ende | 12/480 | 6/472 |
| Inhalt in der oberen Safe Area (47 px) | 0/480 | 0/472 |
| Eingabefelder < 16 px Schrift (iOS-Fokus-Zoom) | 15/600 | 5/590 |
| Overlay: Close-Button | 3/22 (+3 Timeouts) | 0/25 |
| Overlay: Inhalt passt in Viewport | 3/22 | 0/25 |
| Screen lädt nicht fertig (Messung unmöglich) | 0 | 10 |

### Neu: Screen wird nicht fertig

| Route | Viewports | Problem | Datei (vermutet) | Status |
|---|---|---|---|---|
| /warehouse/scanner | alle 5 | `waitForAppScreen` Timeout 15 s (Inhalt < 8 Zeichen, Opacity < 0.99 oder Transform bleibt aktiv); im ersten Lauf noch messbar | src/pages/warehouse/ScannerPage.tsx | offen |
| /warehouse/stocktake | alle 5 | wie oben | src/pages/warehouse/StocktakePage.tsx | offen |

### Verbleibende Befunde (dedupliziert nach Komponente)

| # | Check | Komponente | Routen | Viewports | Beispiel | Datei (vermutet) | Status |
|---|---|---|---|---|---|---|---|
| 1 | Abgeschnittener Text | `button[data-slot=button].inline-flex.items-center.justify-center.gap-2` | /documents, /documents/upload, /documents/tracker, /checklists (+1) | iPad Mini | "Dokument hinzufügen" 100x56 | src/pages/DocumentsPage.tsx | offen |
| 2 | Touch-Ziele < 44x44 px | `button.flex.w-full.items-center.gap-2` | /documents, /documents/upload, /documents/tracker | iPad Mini | "Alle Dokumente 0" 263x32 | src/components/documents/DocumentSidebar.tsx | offen |
| 3 | Touch-Ziele < 44x44 px | `button[data-slot=button].inline-flex.items-center.justify-center.gap-2` | /supply-chain, /settings/billing | iPhone SE | "Ersten Eintrag hinzufügen" 206x44 | src/pages/SupplyChainPage.tsx | offen |
| 4 | Abgeschnittener Text | `span.block.text-sm.font-medium.leading-5` | /products/new, /products/:id/edit | iPhone SE | "Einzelprodukt" 71x20 | src/pages/ProductFormPage.tsx | offen |
| 5 | Touch-Ziele < 44x44 px | `button.p-0.5.hover:bg-muted.rounded.disabled:opacity-30` | /dpp/design | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini |  18x18 | src/pages/DPPDesignPage.tsx | offen |
| 6 | Touch-Ziele < 44x44 px | `button.flex.shrink-0.items-center.gap-1.5` | /help | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini |  38x26 | src/pages/TrainingGuidePage.tsx | offen |
| 7 | Touch-Ziele < 44x44 px | `button.flex-1.py-2.rounded-md.text-sm` | /dpp/design | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini | "Klein" 31x39 | src/pages/DPPDesignPage.tsx | offen |
| 8 | Touch-Ziele < 44x44 px | `button.inline-flex.items-center.gap-1.5.rounded-lg` | /help | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini | "Zur Seite" 114x38 | src/pages/TrainingGuidePage.tsx | offen |
| 9 | Touch-Ziele < 44x44 px | `button.relative.inline-flex.items-center.gap-2` | /help | Android 360, iPhone 390, iPhone 430, iPad Mini | "Als abgeschlossen markieren" 255x38 | src/pages/TrainingGuidePage.tsx | offen |
| 10 | Touch-Ziele < 44x44 px | `button.min-h-[36px].rounded-full.border.px-3` | /suppliers | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini | "Alle" 48x36 | src/pages/SuppliersPage.tsx | offen |
| 11 | Touch-Ziele < 44x44 px | `button.flex.w-10.shrink-0.items-center` | /warehouse/integrations/dhl | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini | "Wert anzeigen" 44x42 | src/pages/warehouse/DHLIntegrationPage.tsx | offen |
| 12 | Abgeschnittener Text | `p.font-medium` | /dpp/design | iPhone SE, Android 360, iPad Mini | "Umweltfreundlich" 95x20 | src/pages/DPPDesignPage.tsx | offen |
| 13 | Abgeschnittener Text | `button.p-3.rounded-lg.border.text-center` | /dpp/design | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini | "Farbverlauf" 54x46 | src/pages/DPPDesignPage.tsx | offen |
| 14 | Abgeschnittener Text | `a.touch-hit.text-xs.text-primary.hover:underline` | /crm | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini | "Alle" 37x16 | src/pages/crm/CrmDashboardPage.tsx | offen |
| 15 | Touch-Ziele < 44x44 px | `button.ml-0.5.inline-flex.size-7.items-center` | /settings/company | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini | "Entfernen" 28x28 | src/pages/SettingsPage.tsx | offen |
| 16 | Touch-Ziele < 44x44 px | `button.relative.flex.items-center.gap-1` | /warehouse/shipments | iPad Mini | "Alle 0" 75x36 | src/pages/warehouse/ShipmentListPage.tsx | offen |
| 17 | Überlappung mit Tab-Bar / unerreichbar am Scroll-Ende | `button[data-slot=switch].peer.inline-flex.h-5.w-9` | /dpp/visibility | iPhone SE, Android 360, iPhone 390, iPhone 430 |  36x20 | src/components/ui/switch.tsx | offen |
| 18 | Abgeschnittener Text | `p.font-medium.text-sm` | /dpp/design | iPhone SE, Android 360, iPhone 390, iPad Mini | "Sonnenuntergang" 77x20 | src/pages/DPPDesignPage.tsx | offen |
| 19 | Touch-Ziele < 44x44 px | `a.hover:text-foreground.transition-colors.flex.items-center` | /suppliers/invitations | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini | "Startseite" 83x20 | src/pages/SupplierInvitationsPage.tsx | offen |
| 20 | Touch-Ziele < 44x44 px | `a.hover:text-foreground.transition-colors` | /suppliers/invitations | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini | "Lieferanten" 75x20 | src/pages/SupplierInvitationsPage.tsx | offen |
| 21 | Eingabefelder < 16 px Schrift | `input.rounded-md.border.border-input.bg-background` | /compliance/reports | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini |  133x36 | src/pages/compliance/ComplianceReportsPage.tsx | offen |
| 22 | Touch-Ziele < 44x44 px | `button.flex.items-center.gap-1.hover:text-foreground` | /warehouse/shipments | iPad Mini | "Sendungsnummer" 149x20 | src/pages/warehouse/ShipmentListPage.tsx | offen |
| 23 | Abgeschnittener Text | `div.mt-2.sm:mt-3.font-display.tabular-nums` | /commerce/mega | iPhone SE, iPad Mini | "0,00 €" 104x38 | src/pages/commerce/MegaDashboardPage.tsx | offen |
| 24 | Abgeschnittener Text | `div.text-[8px].text-slate-400` | /help | iPhone SE, Android 360 | "Products" 33x17 | src/pages/TrainingGuidePage.tsx | offen |
| 25 | Touch-Ziele < 44x44 px | `a.break-words.font-medium.hover:text-primary.hover:underline` | /products/:id/batches/:id | Android 360, iPhone 390, iPhone 430, iPad Mini | "Reisetasche mit einem besonders langen P" 242x40 | src/pages/BatchDetailPage.tsx | offen |
| 26 | Touch-Ziele < 44x44 px | `button.group.relative.flex.min-h-11` | /returns/new | iPad Mini | "Niedrig" 110x38 | src/pages/returns/CreateReturnPage.tsx | offen |
| 27 | Touch-Ziele < 44x44 px | `a.relative.block.-my-[14px].py-[14px]` | /warehouse/inventory | iPhone SE, iPhone 390, iPhone 430 | "00000000" 178x44 | src/pages/warehouse/InventoryListPage.tsx | offen |
| 28 | Horizontaler Overflow | `DIV` | /returns/workflows/:id/builder | iPhone 390 |   | src/components/returns/workflow-builder/WorkflowBuilderPage.tsx | offen |
| 29 | Abgeschnittener Text | `p.text-xs.text-muted-foreground` | /dpp/design | iPhone SE | "Warme Orange- und Bernsteintöne" 77x48 | src/pages/DPPDesignPage.tsx | offen |
| 30 | Abgeschnittener Text | `label[data-slot=label].flex.items-center.gap-2.font-medium` | /dpp/design | iPhone SE | "Seitenhintergrund" 111x20 | src/pages/DPPDesignPage.tsx | offen |
| 31 | Touch-Ziele < 44x44 px | `button[data-slot=button].inline-flex.items-center.justify-center.white` | /warehouse/campaigns/:id/edit | iPhone SE, iPhone 390 |  44x44 | src/pages/warehouse/CampaignFormPage.tsx | offen |
| 32 | Überlappung mit Tab-Bar / unerreichbar am Scroll-Ende | `button.flex.w-full.items-start.justify-between` | /help | iPhone SE, iPhone 390 | "Neues Produkt anlegen Erstellen Sie Ihr " 240x74 | src/pages/TrainingGuidePage.tsx | offen |
| 33 | Abgeschnittener Text | `p.text-[10px].uppercase.tracking-wider.text-muted-foreground` | /warehouse/shipments/:id | iPad Mini | "POSITIONEN" 57x17 | src/pages/warehouse/ShipmentDetailPage.tsx | offen |
| 34 | Abgeschnittener Text | `p.text-xl.sm:text-2xl.font-bold` | /warehouse/influencer-hub | iPad Mini | "0.0%" 22x32 | src/pages/warehouse/InfluencerHubPage.tsx | offen |
| 35 | Abgeschnittener Text | `p.text-sm.text-muted-foreground.mt-1` | /settings/users | iPad Mini | "Voller Zugriff auf alle Funktionen einsc" 93x140 | src/pages/SettingsPage.tsx | offen |
| 36 | Abgeschnittener Text | `span.min-w-0.text-muted-foreground` | /settings/billing | iPad Mini | "AI-Gesamtbewertung" 97x40 | src/pages/BillingPage.tsx | offen |
| 37 | Abgeschnittener Text | `div[data-slot=card-title].leading-none.font-semibold.flex.items-center` | / | iPhone SE | "Neueste Produkte" 70x32 | ? | offen |
| 38 | Abgeschnittener Text | `p.text-sm.font-medium.text-foreground` | / | iPhone SE | "Gesamtkonformität" 102x20 | ? | offen |
| 39 | Abgeschnittener Text | `p.mt-0.5.text-xs.text-muted-foreground` | /supply-chain | iPhone SE | "Lieferkettenschritte" 104x16 | src/pages/SupplyChainPage.tsx | offen |
| 40 | Abgeschnittener Text | `p.text-xs.sm:text-sm.text-muted-foreground` | /warehouse/integrations | iPhone SE | "Verbinde Versanddienstleister und Commer" 79x96 | src/pages/warehouse/IntegrationsHubPage.tsx | offen |
| 41 | Horizontaler Overflow | `main overflow: 396 > 390` | /returns/workflows/:id/builder | iPhone 390 |   | src/components/returns/workflow-builder/WorkflowBuilderPage.tsx | offen |
| 42 | Abgeschnittener Text | `p.text-muted-foreground.text-sm.font-mono` | /admin/tenants/:id | iPhone 430 | "mobile-qa" 20x40 | src/pages/admin/AdminTenantDetailPage.tsx | offen |
| 43 | Touch-Ziele < 44x44 px | `a.font-medium.text-sm.hover:text-primary.transition-colors` | /products | iPad Mini | "Reisetasche mit einem besonders langen P" 376x20 | src/pages/ProductsPage.tsx | offen |
| 44 | Touch-Ziele < 44x44 px | `a.inline-flex.items-center.gap-1.text-sm` | /products | iPad Mini | "0" 27x20 | src/pages/ProductsPage.tsx | offen |
| 45 | Touch-Ziele < 44x44 px | `a.font-medium.text-primary.hover:underline` | /warehouse/shipments | iPad Mini | "SHP-20261108-QA1234" 157x20 | src/pages/warehouse/ShipmentListPage.tsx | offen |

## Details erster Lauf: Problemtyp → Route → Viewport (Status = Abgleich mit Re-Run)

### Horizontaler Overflow (.app-content) (1 Routen)

| Route | Element | Viewports | Datei (vermutet) | Status |
|---|---|---|---|---|
| /returns/workflows/:id/builder | `main overflow: 398 > 390` | iPhone 390 | src/components/returns/workflow-builder/WorkflowBuilderPage.tsx | behoben |
| /returns/workflows/:id/builder | `BUTTON  Visueller Builder (224..398)` | iPhone 390 | src/components/returns/workflow-builder/WorkflowBuilderPage.tsx | behoben |
| /returns/workflows/:id/builder | `DIV Serverseitige Ausführung (40..398)` | iPhone 390 | src/components/returns/workflow-builder/WorkflowBuilderPage.tsx | behoben |
| /returns/workflows/:id/builder | `DIV Workflow-AusführungServerseitige Workflows la (40..398)` | iPhone 390 | src/components/returns/workflow-builder/WorkflowBuilderPage.tsx | behoben |

### Abgeschnittener Text (ohne truncate/line-clamp) (20 Routen)

| Route | Element | Viewports | Datei (vermutet) | Status |
|---|---|---|---|---|
| / | `div[data-slot=card-title].leading-none.font-semibold.flex.items-center "Neueste Produkte" (70x32 scrollWidth 78 > 70, overflow-x visible)` | iPhone SE | ? | offen |
| / | `p.text-sm.font-medium.text-foreground "Gesamtkonformität" (102x20 scrollWidth 128 > 102, overflow-x visible)` | iPhone SE | ? | offen |
| /admin/tenants/:id | `p.text-muted-foreground.text-sm.font-mono "mobile-qa" (20x40 scrollWidth 59 > 20, overflow-x visible)` | iPhone 430 | src/pages/admin/AdminTenantDetailPage.tsx | offen |
| /checklists | `button[data-slot=button].inline-flex.items-center.justify-center.gap-2 "Nahrungsergänzungsmittel" (174x44 scrollWidth 193 > 172, overflow-x visible)` | iPad Mini | src/pages/ChecklistPage.tsx | offen |
| /checklists/DE | `button[data-slot=button].inline-flex.items-center.justify-center.gap-2 "Nahrungsergänzungsmittel" (174x44 scrollWidth 193 > 172, overflow-x visible)` | iPad Mini | src/pages/ChecklistPage.tsx | offen |
| /commerce/mega | `div.mt-2.sm:mt-3.font-display.tabular-nums "0,00 €" (104x38 scrollWidth 122 > 104, overflow-x visible)` | iPhone SE, iPhone SE | src/pages/commerce/MegaDashboardPage.tsx | offen |
| /commerce/mega | `div.mt-2.sm:mt-3.font-display.tabular-nums "0,00 €" (166x57 scrollWidth 182 > 166, overflow-x visible)` | iPad Mini, iPad Mini | src/pages/commerce/MegaDashboardPage.tsx | offen |
| /documents | `button[data-slot=button].inline-flex.items-center.justify-center.gap-2 "Dokument hinzufügen" (100x56 scrollWidth 104 > 100, overflow-x visible)` | iPad Mini | src/pages/DocumentsPage.tsx | offen |
| /documents/tracker | `button[data-slot=button].inline-flex.items-center.justify-center.gap-2 "Dokument hinzufügen" (100x56 scrollWidth 104 > 100, overflow-x visible)` | iPad Mini | src/pages/DocumentsPage.tsx | offen |
| /documents/upload | `button[data-slot=button].inline-flex.items-center.justify-center.gap-2 "Dokument hinzufügen" (100x56 scrollWidth 104 > 100, overflow-x visible)` | iPad Mini | src/pages/DocumentsPage.tsx | offen |
| /dpp/design | `p.font-medium "Umweltfreundlich" (95x20 scrollWidth 118 > 95, overflow-x visible)` | iPhone SE, iPhone SE | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `p.font-medium "Wissenschaftlich" (95x20 scrollWidth 114 > 95, overflow-x visible)` | iPhone SE, iPhone SE | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `p.font-medium.text-sm "Sonnenuntergang" (77x20 scrollWidth 120 > 77, overflow-x visible)` | iPhone SE | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `p.text-xs.text-muted-foreground "Warme Orange- und Bernsteintöne" (77x48 scrollWidth 79 > 77, overflow-x visible)` | iPhone SE | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `p.font-medium.text-sm "Geschäftlich" (77x20 scrollWidth 84 > 77, overflow-x visible)` | iPhone SE | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `p.text-xs.text-muted-foreground "Professionelle Schiefer- und Blautöne" (77x48 scrollWidth 80 > 77, overflow-x visible)` | iPhone SE | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `label[data-slot=label].flex.items-center.gap-2.font-medium "Seitenhintergrund" (111x20 scrollWidth 120 > 111, overflow-x visible)` | iPhone SE | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `label[data-slot=label].flex.items-center.gap-2.font-medium "Kartenhintergrund" (111x20 scrollWidth 122 > 111, overflow-x visible)` | iPhone SE | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.p-3.rounded-lg.border.text-center "Farbverlauf" (54x46 scrollWidth 89 > 52, overflow-x visible)` | iPhone SE | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.p-3.rounded-lg.border.text-center "Volltonfarbe" (54x46 scrollWidth 92 > 52, overflow-x visible)` | iPhone SE | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.p-3.rounded-lg.border.text-center "Hintergrundbild" (54x46 scrollWidth 115 > 52, overflow-x visible)` | iPhone SE | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.p-3.rounded-lg.border.text-center "Minimal" (54x46 scrollWidth 63 > 52, overflow-x visible)` | iPhone SE | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `p.font-medium "Umweltfreundlich" (115x20 scrollWidth 118 > 115, overflow-x visible)` | Android 360, Android 360 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `p.font-medium.text-sm "Sonnenuntergang" (97x20 scrollWidth 120 > 97, overflow-x visible)` | Android 360 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.p-3.rounded-lg.border.text-center "Farbverlauf" (64x46 scrollWidth 89 > 62, overflow-x visible)` | Android 360 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.p-3.rounded-lg.border.text-center "Volltonfarbe" (64x46 scrollWidth 93 > 62, overflow-x visible)` | Android 360 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.p-3.rounded-lg.border.text-center "Hintergrundbild" (64x46 scrollWidth 115 > 62, overflow-x visible)` | Android 360 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `p.font-medium.text-sm "Sonnenuntergang" (112x20 scrollWidth 120 > 112, overflow-x visible)` | iPhone 390 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.p-3.rounded-lg.border.text-center "Farbverlauf" (71x46 scrollWidth 89 > 69, overflow-x visible)` | iPhone 390 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.p-3.rounded-lg.border.text-center "Volltonfarbe" (71x46 scrollWidth 92 > 69, overflow-x visible)` | iPhone 390 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.p-3.rounded-lg.border.text-center "Hintergrundbild" (71x46 scrollWidth 115 > 69, overflow-x visible)` | iPhone 390 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.p-3.rounded-lg.border.text-center "Farbverlauf" (81x46 scrollWidth 89 > 79, overflow-x visible)` | iPhone 430 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.p-3.rounded-lg.border.text-center "Volltonfarbe" (81x46 scrollWidth 92 > 79, overflow-x visible)` | iPhone 430 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.p-3.rounded-lg.border.text-center "Hintergrundbild" (81x46 scrollWidth 115 > 79, overflow-x visible)` | iPhone 430 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `p.font-medium "Umweltfreundlich" (74x20 scrollWidth 118 > 74, overflow-x visible)` | iPad Mini, iPad Mini | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `p.font-medium "Einzelhandel" (74x20 scrollWidth 85 > 74, overflow-x visible)` | iPad Mini, iPad Mini | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `p.font-medium "Wissenschaftlich" (74x20 scrollWidth 114 > 74, overflow-x visible)` | iPad Mini, iPad Mini | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `p.font-medium "Barrierefrei" (74x20 scrollWidth 76 > 74, overflow-x visible)` | iPad Mini, iPad Mini | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `p.font-medium.text-sm "Sonnenuntergang" (94x20 scrollWidth 120 > 94, overflow-x visible)` | iPad Mini | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.p-3.rounded-lg.border.text-center "Hintergrundbild" (98x46 scrollWidth 115 > 96, overflow-x visible)` | iPad Mini | src/pages/DPPDesignPage.tsx | offen |
| /dpp/transparency | `p.text-[10px].text-muted-foreground.mt-0.5 "Poppins" (40x17 scrollWidth 42 > 40, overflow-x visible)` | iPhone SE | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `p.text-[10px].text-muted-foreground.mt-0.5 "System" (36x17 scrollWidth 39 > 36, overflow-x visible)` | iPad Mini | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `p.text-[10px].text-muted-foreground.mt-0.5 "Poppins" (36x17 scrollWidth 42 > 36, overflow-x visible)` | iPad Mini | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `p.text-[10px].text-muted-foreground.mt-0.5 "Playfair" (36x17 scrollWidth 39 > 36, overflow-x visible)` | iPad Mini | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `p.text-[10px].text-muted-foreground.mt-0.5 "Merriw." (36x17 scrollWidth 39 > 36, overflow-x visible)` | iPad Mini | src/pages/TransparencyConfigPage.tsx | behoben |
| /help | `div.text-[8px].text-slate-400 "Products" (33x17 scrollWidth 46 > 33, overflow-x visible)` | iPhone SE | src/pages/TrainingGuidePage.tsx | offen |
| /help | `div.text-[8px].text-slate-400 "Batches" (33x17 scrollWidth 42 > 33, overflow-x visible)` | iPhone SE | src/pages/TrainingGuidePage.tsx | offen |
| /help | `div.text-[8px].text-slate-400 "Returns" (33x17 scrollWidth 40 > 33, overflow-x visible)` | iPhone SE | src/pages/TrainingGuidePage.tsx | offen |
| /help | `div.text-[8px].text-slate-400 "Products" (43x17 scrollWidth 46 > 43, overflow-x visible)` | Android 360 | src/pages/TrainingGuidePage.tsx | offen |
| /settings/billing | `span.min-w-0.text-muted-foreground "AI-Gesamtbewertung" (97x40 scrollWidth 122 > 97, overflow-x visible)` | iPad Mini | src/pages/BillingPage.tsx | offen |
| /settings/billing | `span.min-w-0.text-muted-foreground "AI-Zusatzanforderungen" (97x40 scrollWidth 143 > 97, overflow-x visible)` | iPad Mini | src/pages/BillingPage.tsx | offen |
| /settings/branding | `label[data-slot=label].flex.items-center.gap-2.select-none "HOST" (25x17 scrollWidth 33 > 25, overflow-x visible)` | Android 360 | src/pages/SettingsPage.tsx | behoben |
| /settings/branding | `label[data-slot=label].flex.items-center.gap-2.select-none "BENUTZERNAME" (25x17 scrollWidth 98 > 25, overflow-x visible)` | Android 360 | src/pages/SettingsPage.tsx | behoben |
| /settings/branding | `label[data-slot=label].flex.items-center.gap-2.select-none "ABSENDER-E-MAIL" (25x33 scrollWidth 69 > 25, overflow-x visible)` | Android 360 | src/pages/SettingsPage.tsx | behoben |
| /settings/branding | `label[data-slot=label].flex.items-center.gap-2.select-none "BENUTZERNAME" (63x17 scrollWidth 98 > 63, overflow-x visible)` | iPhone 390 | src/pages/SettingsPage.tsx | behoben |
| /settings/branding | `label[data-slot=label].flex.items-center.gap-2.select-none "ABSENDER-E-MAIL" (63x33 scrollWidth 69 > 63, overflow-x visible)` | iPhone 390 | src/pages/SettingsPage.tsx | behoben |
| /settings/users | `p.text-sm.text-muted-foreground.mt-1 "Voller Zugriff auf alle Funktionen einsc" (93x140 scrollWidth 133 > 93, overflow-x visible)` | iPad Mini | src/pages/SettingsPage.tsx | offen |
| /settings/users | `p.text-sm.text-muted-foreground.mt-1 "Kann Produkte und DPPs erstellen, bearbe" (93x140 scrollWidth 99 > 93, overflow-x visible)` | iPad Mini | src/pages/SettingsPage.tsx | offen |
| /supply-chain | `p.mt-0.5.text-xs.text-muted-foreground "Lieferkettenschritte" (104x16 scrollWidth 110 > 104, overflow-x visible)` | iPhone SE | src/pages/SupplyChainPage.tsx | offen |
| /warehouse | `span.text-[10px].text-muted-foreground.w-8.sm:w-10 "Einheiten" (32x17 scrollWidth 48 > 32, overflow-x visible)` | iPhone SE, Android 360, iPhone 390, iPhone 430 | src/pages/warehouse/WarehouseDashboardPage.tsx | behoben |
| /warehouse | `span.text-[10px].text-muted-foreground.w-8.sm:w-10 "Einheiten" (40x17 scrollWidth 48 > 40, overflow-x visible)` | iPad Mini | src/pages/warehouse/WarehouseDashboardPage.tsx | behoben |
| /warehouse/influencer-hub | `p.text-xl.sm:text-2xl.font-bold "0.0%" (22x32 scrollWidth 63 > 22, overflow-x visible)` | iPad Mini | src/pages/warehouse/InfluencerHubPage.tsx | offen |
| /warehouse/influencer-hub | `p.text-xl.sm:text-2xl.font-bold "€0" (22x32 scrollWidth 33 > 22, overflow-x visible)` | iPad Mini | src/pages/warehouse/InfluencerHubPage.tsx | offen |
| /warehouse/integrations | `p.text-xs.sm:text-sm.text-muted-foreground "Verbinde Versanddienstleister und Commer" (79x96 scrollWidth 116 > 79, overflow-x visible)` | iPhone SE | src/pages/warehouse/IntegrationsHubPage.tsx | offen |
| /warehouse/outstanding-receipts | `div.flex.items-center.gap-2.text-xs "Gesamtfortschritt" (104x16 scrollWidth 107 > 104, overflow-x visible)` | iPhone SE | src/pages/warehouse/OutstandingReceiptsPage.tsx | behoben |
| /warehouse/shipments/:id | `p.text-[10px].uppercase.tracking-wider.text-muted-foreground "POSITIONEN" (57x17 scrollWidth 73 > 57, overflow-x visible)` | iPad Mini | src/pages/warehouse/ShipmentDetailPage.tsx | offen |
| /warehouse/shipments/:id | `p.text-[10px].uppercase.tracking-wider.text-muted-foreground "VERSANDKOSTEN" (57x17 scrollWidth 104 > 57, overflow-x visible)` | iPad Mini | src/pages/warehouse/ShipmentDetailPage.tsx | offen |

### Touch-Ziele < 44x44 px (37 Routen)

| Route | Element | Viewports | Datei (vermutet) | Status |
|---|---|---|---|---|
| /commerce | `button.inline-flex.items-center.gap-1.rounded-full "Verbinden" (102x28)` | iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini | src/pages/commerce/CommerceHubPage.tsx | behoben |
| /commerce/mega | `a.flex.items-center.justify-center.gap-1 "ALLE BESTELLUNGEN" (286x41)` | iPhone SE | src/pages/commerce/MegaDashboardPage.tsx | behoben |
| /commerce/mega | `a.flex.items-center.justify-center.gap-1 "ALLE BESTELLUNGEN" (326x41)` | Android 360 | src/pages/commerce/MegaDashboardPage.tsx | behoben |
| /commerce/mega | `a.flex.items-center.justify-center.gap-1 "ALLE BESTELLUNGEN" (356x41)` | iPhone 390 | src/pages/commerce/MegaDashboardPage.tsx | behoben |
| /commerce/mega | `a.flex.items-center.justify-center.gap-1 "ALLE BESTELLUNGEN" (396x41)` | iPhone 430 | src/pages/commerce/MegaDashboardPage.tsx | behoben |
| /commerce/mega | `a.flex.items-center.justify-center.gap-1 "ALLE BESTELLUNGEN" (462x41)` | iPad Mini | src/pages/commerce/MegaDashboardPage.tsx | behoben |
| /compliance/settings | `button.peer.inline-flex.h-5.w-9 (36x20)` | iPhone SE, iPhone SE, iPhone SE, Android 360, Android 360, Android 360, iPhone 390, iPhone 390, iPhone 390, iPhone 430, iPhone 430, iPhone 430, iPad Mini, iPad Mini, iPad Mini | src/components/ui/switch.tsx | behoben |
| /crm | `a.text-xs.text-primary.hover:underline.flex "Alle" (37x16)` | iPhone SE, iPhone SE, Android 360, Android 360, iPhone 390, iPhone 390, iPhone 430, iPhone 430, iPad Mini, iPad Mini | src/pages/crm/CrmDashboardPage.tsx | behoben |
| /documents | `button.flex.w-full.items-center.gap-2 "Alle Dokumente 0" (263x32)` | iPad Mini | src/components/documents/DocumentSidebar.tsx | offen |
| /documents | `button.flex.w-full.items-center.gap-2 "Nicht zugeordnet 0" (263x32)` | iPad Mini | src/pages/DocumentsPage.tsx | offen |
| /documents/tracker | `button.flex.w-full.items-center.gap-2 "Alle Dokumente 0" (263x32)` | iPad Mini | src/components/documents/DocumentSidebar.tsx | offen |
| /documents/tracker | `button.flex.w-full.items-center.gap-2 "Nicht zugeordnet 0" (263x32)` | iPad Mini | src/pages/DocumentsPage.tsx | offen |
| /documents/upload | `button.flex.w-full.items-center.gap-2 "Alle Dokumente 0" (263x32)` | iPad Mini | src/components/documents/DocumentSidebar.tsx | offen |
| /documents/upload | `button.flex.w-full.items-center.gap-2 "Nicht zugeordnet 0" (263x32)` | iPad Mini | src/pages/DocumentsPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Klein" (31x39)` | iPhone SE | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Mittel" (37x39)` | iPhone SE | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Groß" (38x39)` | iPhone SE | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.peer.inline-flex.h-5.w-9 (36x20)` | iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini | src/components/ui/switch.tsx | behoben |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Kompakt" (77x36)` | iPhone SE | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Mittel" (77x36)` | iPhone SE | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Hoch" (77x36)` | iPhone SE | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Keine" (74x36)` | iPhone SE | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Dünn" (74x36)` | iPhone SE | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Dick" (74x36)` | iPhone SE | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.p-0.5.hover:bg-muted.rounded.disabled:opacity-30 (18x18)` | iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Klein" (41x39)` | Android 360 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Mittel" (41x39)` | Android 360 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Groß" (41x39)` | Android 360 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Kompakt" (90x36)` | Android 360 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Mittel" (90x36)` | Android 360 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Hoch" (90x36)` | Android 360 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Keine" (87x36)` | Android 360 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Dünn" (87x36)` | Android 360 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Dick" (87x36)` | Android 360 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Klein" (46x39)` | iPhone 390 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Mittel" (46x39)` | iPhone 390 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Groß" (46x39)` | iPhone 390 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Kompakt" (100x36)` | iPhone 390 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Mittel" (100x36)` | iPhone 390 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Hoch" (100x36)` | iPhone 390 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Keine" (97x36)` | iPhone 390 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Dünn" (97x36)` | iPhone 390 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Dick" (97x36)` | iPhone 390 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Klein" (53x39)` | iPhone 430 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Mittel" (53x39)` | iPhone 430 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Groß" (53x39)` | iPhone 430 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Kompakt" (113x36)` | iPhone 430 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Mittel" (113x36)` | iPhone 430 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Hoch" (113x36)` | iPhone 430 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Keine" (111x36)` | iPhone 430 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Dünn" (111x36)` | iPhone 430 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Dick" (111x36)` | iPhone 430 | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Klein" (64x39)` | iPad Mini | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Mittel" (64x39)` | iPad Mini | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Groß" (64x39)` | iPad Mini | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Kompakt" (135x36)` | iPad Mini | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Mittel" (135x36)` | iPad Mini | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Hoch" (135x36)` | iPad Mini | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Keine" (133x36)` | iPad Mini | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Dünn" (133x36)` | iPad Mini | src/pages/DPPDesignPage.tsx | offen |
| /dpp/design | `button.flex-1.py-2.rounded-md.text-sm "Dick" (133x36)` | iPad Mini | src/pages/DPPDesignPage.tsx | offen |
| /dpp/qr-generator | `button[data-slot=checkbox].peer.border-input.dark:bg-input/30.data-[state=checked]:bg-primary (16x16)` | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini | src/components/ui/checkbox.tsx | behoben |
| /dpp/transparency | `button.peer.inline-flex.h-5.w-9 (36x20)` | iPhone SE, iPhone SE, iPhone SE, Android 360, Android 360, Android 360, iPhone 390, iPhone 390, iPhone 390, iPhone 430, iPhone 430, iPhone 430, iPad Mini, iPad Mini, iPad Mini | src/components/ui/switch.tsx | behoben |
| /dpp/transparency | `button.flex.items-center.gap-1.5.rounded-lg "Light" (81x38)` | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex.items-center.gap-1.5.rounded-lg "Dark" (79x38)` | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex.items-center.gap-1.5.rounded-lg "Auto" (79x38)` | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-3 "Gradient" (91x38)` | iPhone SE | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-3 "Solid" (91x38)` | iPhone SE | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-3 "Image" (91x38)` | iPhone SE | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-3 "Minimal" (91x38)` | iPhone SE | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "Sharp" (52x30)` | iPhone SE | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "Rounded" (69x30)` | iPhone SE | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "Soft" (52x30)` | iPhone SE | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "None" (55x30)` | iPhone SE | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "Subtle" (55x30)` | iPhone SE | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "Medium" (64x30)` | iPhone SE, iPhone 390 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "Strong" (190x30)` | iPhone SE | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-3 "Gradient" (83x38)` | Android 360, iPhone 390 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-3 "Solid" (64x38)` | Android 360 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-3 "Image" (67x38)` | Android 360 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-3 "Minimal" (230x38)` | Android 360 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "Sharp" (71x30)` | Android 360 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "Rounded" (71x30)` | Android 360 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "Soft" (71x30)` | Android 360 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "None" (71x30)` | Android 360 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "Subtle" (71x30)` | Android 360 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "Medium" (71x30)` | Android 360 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "Strong" (230x30)` | Android 360 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-3 "Solid" (80x38)` | iPhone 390 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-3 "Image" (80x38)` | iPhone 390 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-3 "Minimal" (260x38)` | iPhone 390 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "Sharp" (81x30)` | iPhone 390 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "Rounded" (81x30)` | iPhone 390 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "Soft" (81x30)` | iPhone 390 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "None" (57x30)` | iPhone 390 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "Subtle" (57x30)` | iPhone 390 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "Strong" (57x30)` | iPhone 390 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-3 "Gradient" (95x38)` | iPhone 430 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-3 "Solid" (95x38)` | iPhone 430 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-3 "Image" (95x38)` | iPhone 430 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-3 "Minimal" (300x38)` | iPhone 430 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "Sharp" (95x30)` | iPhone 430 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "Rounded" (95x30)` | iPhone 430 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "Soft" (95x30)` | iPhone 430 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "None" (69x30)` | iPhone 430 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "Subtle" (69x30)` | iPhone 430 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "Medium" (69x30)` | iPhone 430 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "Strong" (69x30)` | iPhone 430 | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-3 "Gradient" (86x38)` | iPad Mini | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-3 "Solid" (86x38)` | iPad Mini | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-3 "Image" (86x38)` | iPad Mini | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-3 "Minimal" (86x38)` | iPad Mini | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "Sharp" (84x30)` | iPad Mini | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "Rounded" (84x30)` | iPad Mini | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "Soft" (175x30)` | iPad Mini | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "None" (84x30)` | iPad Mini | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "Subtle" (84x30)` | iPad Mini | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "Medium" (84x30)` | iPad Mini | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/transparency | `button.flex-1.rounded-lg.border.px-2 "Strong" (84x30)` | iPad Mini | src/pages/TransparencyConfigPage.tsx | behoben |
| /dpp/visibility | `button.peer.inline-flex.h-5.w-9 (36x20)` | iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini | src/components/ui/switch.tsx | behoben |
| /feedback/settings | `button.peer.inline-flex.h-5.w-9 (36x20)` | iPhone SE, iPhone SE, iPhone SE, iPhone SE, Android 360, Android 360, Android 360, Android 360, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPad Mini, iPad Mini, iPad Mini, iPad Mini | src/components/ui/switch.tsx | behoben |
| /help | `button.flex.shrink-0.items-center.gap-1.5 (38x26)` | iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430 | src/pages/TrainingGuidePage.tsx | offen |
| /help | `button.inline-flex.items-center.gap-1.5.rounded-lg "Zur Seite" (114x38)` | iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini | src/pages/TrainingGuidePage.tsx | offen |
| /help | `button.relative.inline-flex.items-center.gap-2 "Als abgeschlossen markieren" (255x38)` | Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini | src/pages/TrainingGuidePage.tsx | offen |
| /help | `button.flex.shrink-0.items-center.gap-1.5 "Dashboard" (107x28)` | iPad Mini | src/pages/TrainingGuidePage.tsx | offen |
| /help | `button.flex.shrink-0.items-center.gap-1.5 "Produkte" (96x28)` | iPad Mini | src/pages/TrainingGuidePage.tsx | offen |
| /help | `button.flex.shrink-0.items-center.gap-1.5 "Digitaler Produktpass" (167x28)` | iPad Mini | src/pages/TrainingGuidePage.tsx | offen |
| /help | `button.flex.shrink-0.items-center.gap-1.5 "Dokumente" (110x28)` | iPad Mini | src/pages/TrainingGuidePage.tsx | offen |
| /help | `button.flex.shrink-0.items-center.gap-1.5 "Lieferkette" (106x28)` | iPad Mini | src/pages/TrainingGuidePage.tsx | offen |
| /help | `button.flex.shrink-0.items-center.gap-1.5 "Compliance & AI" (138x28)` | iPad Mini | src/pages/TrainingGuidePage.tsx | offen |
| /help | `button.flex.shrink-0.items-center.gap-1.5 "Returns Hub" (115x28)` | iPad Mini | src/pages/TrainingGuidePage.tsx | offen |
| /help | `button.flex.shrink-0.items-center.gap-1.5 "Portale" (85x28)` | iPad Mini | src/pages/TrainingGuidePage.tsx | offen |
| /help | `button.flex.shrink-0.items-center.gap-1.5 "Einstellungen" (121x28)` | iPad Mini | src/pages/TrainingGuidePage.tsx | offen |
| /help | `button.flex.shrink-0.items-center.gap-1.5 "Abrechnung" (115x28)` | iPad Mini | src/pages/TrainingGuidePage.tsx | offen |
| /products | `a.font-medium.text-sm.hover:text-primary.transition-colors "Reisetasche mit einem besonders langen P" (376x20)` | iPad Mini | src/pages/ProductsPage.tsx | offen |
| /products | `a.inline-flex.items-center.gap-1.text-sm "0" (27x20)` | iPad Mini | src/pages/ProductsPage.tsx | offen |
| /products/:id/batches/:id | `a.break-words.font-medium.hover:text-primary.hover:underline "Reisetasche mit einem besonders langen P" (242x40)` | Android 360 | src/pages/BatchDetailPage.tsx | offen |
| /products/:id/batches/:id | `a.break-words.font-medium.hover:text-primary.hover:underline "Reisetasche mit einem besonders langen P" (272x40)` | iPhone 390 | src/pages/BatchDetailPage.tsx | offen |
| /products/:id/batches/:id | `a.break-words.font-medium.hover:text-primary.hover:underline "Reisetasche mit einem besonders langen P" (312x40)` | iPhone 430 | src/pages/BatchDetailPage.tsx | offen |
| /products/:id/batches/:id | `a.break-words.font-medium.hover:text-primary.hover:underline "Reisetasche mit einem besonders langen P" (376x20)` | iPad Mini | src/pages/BatchDetailPage.tsx | offen |
| /products/:id/edit | `button.inline-flex.h-7.w-7.items-center (28x28)` | iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini | src/pages/ProductFormPage.tsx | behoben |
| /products/new | `button.inline-flex.h-7.w-7.items-center (28x28)` | iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini | src/pages/ProductFormPage.tsx | behoben |
| /requirements-calculator | `button[data-slot=checkbox].peer.border-input.dark:bg-input/30.data-[state=checked]:bg-primary (16x16)` | iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini | src/components/ui/checkbox.tsx | behoben |
| /returns | `a.text-sm.text-primary.hover:underline "Alle anzeigen" (89x20)` | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini | src/pages/returns/ReturnsHubDashboardPage.tsx | behoben |
| /returns/settings | `button.peer.inline-flex.h-5.w-9 (36x20)` | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini | src/components/ui/switch.tsx | behoben |
| /settings/branding | `button.peer.inline-flex.h-5.w-9 (36x20)` | iPhone SE, iPhone SE, Android 360, Android 360, iPhone 390, iPhone 390, iPhone 430, iPhone 430, iPad Mini, iPad Mini | src/components/ui/switch.tsx | behoben |
| /settings/branding | `button.relative.h-9.w-9.min-w-[36px] (40x40)` | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini | src/pages/SettingsPage.tsx | behoben |
| /settings/branding | `button.relative.h-9.w-9.min-w-[36px] (36x36)` | iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, iPhone SE, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, Android 360, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 390, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPhone 430, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini, iPad Mini | src/pages/SettingsPage.tsx | behoben |
| /settings/company | `button.ml-1.hover:text-destructive (12x12)` | iPhone SE, iPhone SE, Android 360, Android 360, iPhone 390, iPhone 390, iPhone 430, iPhone 430, iPad Mini, iPad Mini | src/pages/SettingsPage.tsx | behoben |
| /suppliers | `button.min-h-[36px].rounded-full.border.px-3 "Alle" (48x36)` | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini | src/pages/SuppliersPage.tsx | offen |
| /suppliers | `button.min-h-[36px].rounded-full.border.px-3 "Aktiv" (55x36)` | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini | src/pages/SuppliersPage.tsx | offen |
| /suppliers | `button.min-h-[36px].rounded-full.border.px-3 "Freigabe" (76x36)` | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini | src/pages/SuppliersPage.tsx | offen |
| /suppliers | `button.min-h-[36px].rounded-full.border.px-3 "Inaktiv" (64x36)` | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini | src/pages/SuppliersPage.tsx | offen |
| /suppliers | `button.min-h-[36px].rounded-full.border.px-3 "Gesperrt" (77x36)` | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini | src/pages/SuppliersPage.tsx | offen |
| /suppliers/invitations | `a.hover:text-foreground.transition-colors.flex.items-center "Startseite" (83x20)` | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini | src/pages/SupplierInvitationsPage.tsx | offen |
| /suppliers/invitations | `a.hover:text-foreground.transition-colors "Lieferanten" (75x20)` | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini | src/pages/SupplierInvitationsPage.tsx | offen |
| /warehouse | `a.font-medium.hover:underline.truncate.transition-colors "Beispiellager (QA)" (120x20)` | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini | src/pages/warehouse/WarehouseDashboardPage.tsx | behoben |
| /warehouse/campaigns/:id/edit | `button.w-full.text-left.px-3.py-2 "Reisetasche mit einem besonders langen P" (412x36)` | iPad Mini | src/pages/warehouse/CampaignFormPage.tsx | behoben |
| /warehouse/campaigns/new | `button.w-full.text-left.px-3.py-2 "Reisetasche mit einem besonders langen P" (236x36)` | iPhone SE | src/pages/warehouse/CampaignFormPage.tsx | behoben |
| /warehouse/campaigns/new | `button.w-full.text-left.px-3.py-2 "Reisetasche mit einem besonders langen P" (276x36)` | Android 360 | src/pages/warehouse/CampaignFormPage.tsx | behoben |
| /warehouse/campaigns/new | `button.w-full.text-left.px-3.py-2 "Reisetasche mit einem besonders langen P" (306x36)` | iPhone 390 | src/pages/warehouse/CampaignFormPage.tsx | behoben |
| /warehouse/campaigns/new | `button.w-full.text-left.px-3.py-2 "Reisetasche mit einem besonders langen P" (346x36)` | iPhone 430 | src/pages/warehouse/CampaignFormPage.tsx | behoben |
| /warehouse/campaigns/new | `button.w-full.text-left.px-3.py-2 "Reisetasche mit einem besonders langen P" (412x36)` | iPad Mini | src/pages/warehouse/CampaignFormPage.tsx | behoben |
| /warehouse/integrations/dhl | `button.peer.inline-flex.h-5.w-9 (36x20)` | iPhone SE, iPhone SE, Android 360, Android 360, iPhone 390, iPhone 390, iPhone 430, iPhone 430, iPad Mini, iPad Mini | src/components/ui/switch.tsx | behoben |
| /warehouse/integrations/dhl | `button.peer.inline-flex.h-5.w-9 "Briefversand aktivieren" (36x20)` | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini | src/components/ui/switch.tsx | behoben |
| /warehouse/inventory | `button[data-slot=checkbox].peer.border-input.dark:bg-input/30.data-[state=checked]:bg-primary "Position auswählen" (16x16)` | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini | src/components/ui/checkbox.tsx | behoben |
| /warehouse/inventory | `a.font-medium.text-sm.leading-tight.hover:underline "Reisetasche mit einem besonders langen P" (162x18)` | iPhone SE | src/pages/warehouse/InventoryListPage.tsx | behoben |
| /warehouse/inventory | `a.block.font-mono.text-xs.text-muted-foreground "00000000" (178x16)` | iPhone SE | src/pages/warehouse/InventoryListPage.tsx | behoben |
| /warehouse/inventory | `a.font-medium.text-sm.leading-tight.hover:underline "Reisetasche mit einem besonders langen P" (202x18)` | Android 360 | src/pages/warehouse/InventoryListPage.tsx | behoben |
| /warehouse/inventory | `a.block.font-mono.text-xs.text-muted-foreground "00000000" (218x16)` | Android 360 | src/pages/warehouse/InventoryListPage.tsx | behoben |
| /warehouse/inventory | `a.font-medium.text-sm.leading-tight.hover:underline "Reisetasche mit einem besonders langen P" (232x18)` | iPhone 390 | src/pages/warehouse/InventoryListPage.tsx | behoben |
| /warehouse/inventory | `a.block.font-mono.text-xs.text-muted-foreground "00000000" (248x16)` | iPhone 390 | src/pages/warehouse/InventoryListPage.tsx | behoben |
| /warehouse/inventory | `a.font-medium.text-sm.leading-tight.hover:underline "Reisetasche mit einem besonders langen P" (272x18)` | iPhone 430 | src/pages/warehouse/InventoryListPage.tsx | behoben |
| /warehouse/inventory | `a.block.font-mono.text-xs.text-muted-foreground "00000000" (288x16)` | iPhone 430 | src/pages/warehouse/InventoryListPage.tsx | behoben |
| /warehouse/inventory | `button.inline-flex.items-center.gap-1.5.rounded-full "Nur niedriger Bestand" (168x28)` | iPad Mini | src/pages/warehouse/InventoryListPage.tsx | behoben |
| /warehouse/inventory | `button[data-slot=checkbox].peer.border-input.dark:bg-input/30.data-[state=checked]:bg-primary "Alle auswählen" (16x16)` | iPad Mini | src/components/ui/checkbox.tsx | behoben |
| /warehouse/inventory-drift | `button.peer.inline-flex.h-5.w-9 (36x20)` | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini | src/components/ui/switch.tsx | behoben |
| /warehouse/movements | `button.inline-flex.items-center.gap-1.5.rounded-full "Alle Bewegungen" (150x32)` | iPad Mini | src/pages/warehouse/StockMovementsPage.tsx | behoben |
| /warehouse/movements | `button.inline-flex.items-center.gap-1.5.rounded-full "Nur Abgänge" (126x32)` | iPad Mini | src/pages/warehouse/StockMovementsPage.tsx | behoben |
| /warehouse/movements | `button.inline-flex.items-center.gap-1.5.rounded-full "Nur Zugänge" (125x32)` | iPad Mini | src/pages/warehouse/StockMovementsPage.tsx | behoben |
| /warehouse/movements | `button.flex.items-center.gap-1.5.px-3 "Nach Kategorie" (146x36)` | iPad Mini | src/pages/warehouse/StockMovementsPage.tsx | behoben |
| /warehouse/movements | `button.flex.items-center.gap-1.5.px-3 "Nach Empfänger" (155x36)` | iPad Mini | src/pages/warehouse/StockMovementsPage.tsx | behoben |
| /warehouse/movements | `button.flex.items-center.gap-1.5.px-3 "Nach Produkt" (134x36)` | iPad Mini | src/pages/warehouse/StockMovementsPage.tsx | behoben |
| /warehouse/movements | `button.flex.items-center.gap-1.5.px-3 "Audit Log" (107x36)` | iPad Mini | src/pages/warehouse/StockMovementsPage.tsx | behoben |
| /warehouse/outstanding-receipts | `button.flex-1.md:flex-none.h-11.md:h-8 "Alle" (49x32)` | iPad Mini | src/pages/warehouse/OutstandingReceiptsPage.tsx | behoben |
| /warehouse/outstanding-receipts | `button.flex-1.md:flex-none.h-11.md:h-8 "Noch nicht eingegangen" (188x32)` | iPad Mini | src/pages/warehouse/OutstandingReceiptsPage.tsx | behoben |
| /warehouse/outstanding-receipts | `button.flex-1.md:flex-none.h-11.md:h-8 "Teilweise eingegangen" (177x32)` | iPad Mini | src/pages/warehouse/OutstandingReceiptsPage.tsx | behoben |
| /warehouse/outstanding-receipts | `button.peer.inline-flex.h-5.w-9 (36x20)` | iPad Mini | src/components/ui/switch.tsx | behoben |
| /warehouse/scanner | `button.flex.items-center.gap-2.px-3 (40x32)` | iPhone SE, iPhone SE, Android 360, Android 360, iPhone 390, iPhone 390, iPhone 430, iPhone 430 | src/pages/warehouse/ScannerPage.tsx | offen (Re-Run nicht gemessen) |
| /warehouse/scanner | `button.flex.items-center.gap-2.px-4 "Massen-Modus" (147x34)` | iPhone SE, Android 360, iPhone 390, iPhone 430 | src/pages/warehouse/ScannerPage.tsx | offen (Re-Run nicht gemessen) |
| /warehouse/scanner | `button.flex.items-center.gap-1.5.px-3 "Rückgängig" (111x28)` | iPhone SE, Android 360, iPhone 390, iPhone 430 | src/pages/warehouse/ScannerPage.tsx | offen (Re-Run nicht gemessen) |
| /warehouse/scanner | `button.flex.items-center.gap-1.5.px-3 (38x26)` | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini | src/pages/warehouse/ScannerPage.tsx | offen (Re-Run nicht gemessen) |
| /warehouse/scanner | `button.flex.items-center.gap-2.px-3 "Zurück" (94x36)` | iPad Mini | src/pages/warehouse/ScannerPage.tsx | offen (Re-Run nicht gemessen) |
| /warehouse/scanner | `button.flex.items-center.gap-2.px-3 "Kamera" (99x36)` | iPad Mini | src/pages/warehouse/ScannerPage.tsx | offen (Re-Run nicht gemessen) |
| /warehouse/scanner | `button.flex.items-center.gap-2.px-4 (147x34)` | iPad Mini | src/pages/warehouse/ScannerPage.tsx | offen (Re-Run nicht gemessen) |
| /warehouse/scanner | `button.flex.items-center.gap-1.5.px-3 (111x28)` | iPad Mini | src/pages/warehouse/ScannerPage.tsx | offen (Re-Run nicht gemessen) |
| /warehouse/settings | `button.peer.inline-flex.h-5.w-9 "Bestätigung beim Kommissionieren" (36x20)` | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini | src/components/ui/switch.tsx | behoben |
| /warehouse/settings | `button.peer.inline-flex.h-5.w-9 "Bestätigung beim Verpacken" (36x20)` | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini | src/components/ui/switch.tsx | behoben |
| /warehouse/settings | `button.peer.inline-flex.h-5.w-9 "Mehrfachmengen als Einzelzeilen" (36x20)` | iPhone SE, Android 360, iPhone 390, iPhone 430, iPad Mini | src/components/ui/switch.tsx | behoben |
| /warehouse/shipments | `button.relative.flex.items-center.gap-1 "Alle 0" (75x36)` | iPad Mini | src/pages/warehouse/ShipmentListPage.tsx | offen |
| /warehouse/shipments | `button.relative.flex.items-center.gap-1 "Entwurf 0" (123x36)` | iPad Mini | src/pages/warehouse/ShipmentListPage.tsx | offen |
| /warehouse/shipments | `button.relative.flex.items-center.gap-1 "Kommissionierung 0" (194x36)` | iPad Mini | src/pages/warehouse/ShipmentListPage.tsx | offen |
| /warehouse/shipments | `button.relative.flex.items-center.gap-1 "Verpackt 0" (130x36)` | iPad Mini | src/pages/warehouse/ShipmentListPage.tsx | offen |
| /warehouse/shipments | `button.relative.flex.items-center.gap-1 "Label erstellt 0" (156x36)` | iPad Mini | src/pages/warehouse/ShipmentListPage.tsx | offen |
| /warehouse/shipments | `button.relative.flex.items-center.gap-1 "Versendet 0" (139x36)` | iPad Mini | src/pages/warehouse/ShipmentListPage.tsx | offen |
| /warehouse/shipments | `button.relative.flex.items-center.gap-1 "Unterwegs 0" (143x36)` | iPad Mini | src/pages/warehouse/ShipmentListPage.tsx | offen |
| /warehouse/shipments | `button.relative.flex.items-center.gap-1 "Zugestellt 0" (137x36)` | iPad Mini | src/pages/warehouse/ShipmentListPage.tsx | offen |
| /warehouse/shipments | `button.relative.flex.items-center.gap-1 "Abgebrochen 0" (161x36)` | iPad Mini | src/pages/warehouse/ShipmentListPage.tsx | offen |
| /warehouse/shipments | `button.flex.items-center.gap-1.hover:text-foreground "Sendungsnummer" (149x20)` | iPad Mini | src/pages/warehouse/ShipmentListPage.tsx | offen |
| /warehouse/shipments | `button.flex.items-center.gap-1.hover:text-foreground "Status" (69x20)` | iPad Mini | src/pages/warehouse/ShipmentListPage.tsx | offen |
| /warehouse/shipments | `button.flex.items-center.gap-1.hover:text-foreground "Empfänger" (99x20)` | iPad Mini | src/pages/warehouse/ShipmentListPage.tsx | offen |
| /warehouse/shipments | `button.flex.items-center.gap-1.hover:text-foreground "Priorität" (79x20)` | iPad Mini | src/pages/warehouse/ShipmentListPage.tsx | offen |
| /warehouse/shipments | `button.flex.items-center.gap-1.hover:text-foreground "Erstellt" (72x20)` | iPad Mini | src/pages/warehouse/ShipmentListPage.tsx | offen |
| /warehouse/shipments | `a.font-medium.text-primary.hover:underline "SHP-20261108-QA1234" (157x20)` | iPad Mini | src/pages/warehouse/ShipmentListPage.tsx | offen |
| /warehouse/shipments/:id | `button.snap-start.px-3.sm:px-4.py-2.5 "Übersicht" (89x42)` | iPhone SE, Android 360, iPhone 390, iPhone 430 | src/pages/warehouse/ShipmentDetailPage.tsx | behoben |
| /warehouse/shipments/:id | `button.snap-start.px-3.sm:px-4.py-2.5 "Positionen (1)" (114x42)` | iPhone SE, Android 360, iPhone 390, iPhone 430 | src/pages/warehouse/ShipmentDetailPage.tsx | behoben |
| /warehouse/shipments/:id | `button.snap-start.px-3.sm:px-4.py-2.5 "Aktivität" (79x42)` | iPhone SE, Android 360, iPhone 390, iPhone 430 | src/pages/warehouse/ShipmentDetailPage.tsx | behoben |
| /warehouse/shipments/:id | `button.snap-start.px-3.sm:px-4.py-2.5 "Übersicht" (97x38)` | iPad Mini | src/pages/warehouse/ShipmentDetailPage.tsx | behoben |
| /warehouse/shipments/:id | `button.snap-start.px-3.sm:px-4.py-2.5 "Positionen (1)" (122x38)` | iPad Mini | src/pages/warehouse/ShipmentDetailPage.tsx | behoben |
| /warehouse/shipments/:id | `button.snap-start.px-3.sm:px-4.py-2.5 "Aktivität" (87x38)` | iPad Mini | src/pages/warehouse/ShipmentDetailPage.tsx | behoben |
| /warehouse/stocktake | `button.flex.items-center.gap-2.px-3 (40x44)` | iPhone SE, Android 360, iPhone 390, iPhone 430 | src/pages/warehouse/StocktakePage.tsx | offen (Re-Run nicht gemessen) |

### Überlappung mit Tab-Bar / unerreichbar am Scroll-Ende (4 Routen)

| Route | Element | Viewports | Datei (vermutet) | Status |
|---|---|---|---|---|
| /dpp/visibility | `button.peer.inline-flex.h-5.w-9 (36x20) below tab bar top 477` | iPhone SE, iPhone SE | src/components/ui/switch.tsx | behoben |
| /dpp/visibility | `button.peer.inline-flex.h-5.w-9 (36x20) below tab bar top 709` | Android 360, Android 360 | src/components/ui/switch.tsx | behoben |
| /dpp/visibility | `button.peer.inline-flex.h-5.w-9 (36x20) below tab bar top 753` | iPhone 390, iPhone 390 | src/components/ui/switch.tsx | behoben |
| /dpp/visibility | `button.peer.inline-flex.h-5.w-9 (36x20) below tab bar top 841` | iPhone 430, iPhone 430 | src/components/ui/switch.tsx | behoben |
| /help | `button.fixed.bottom-6.right-6.z-50 "Back to top" (36x36) below tab bar top 477` | iPhone SE | src/pages/HelpPage.tsx (Back-to-top FAB) | behoben |
| /help | `button.fixed.bottom-6.right-6.z-50 "Back to top" (41x41) below tab bar top 753` | iPhone 390 | src/pages/HelpPage.tsx (Back-to-top FAB) | behoben |
| /help | `button.flex.w-full.items-start.justify-between "Sprache wechseln Trackbliss unterstützt " (350x74) below tab bar top 841` | iPhone 430 | src/pages/TrainingGuidePage.tsx | behoben |
| /help | `button.relative.inline-flex.items-center.gap-2 "Als abgeschlossen markieren" (255x38) below tab bar top 841` | iPhone 430 | src/pages/TrainingGuidePage.tsx | behoben |
| /help | `button.fixed.bottom-6.right-6.z-50 "Back to top" (42x42) below tab bar top 841` | iPhone 430 | src/pages/HelpPage.tsx (Back-to-top FAB) | behoben |
| /warehouse/scanner | `button.w-full.relative.rounded-2xl.border-2 "Barcode scannen Tippen, um Kamera zu öff" (288x320) below tab bar top 477` | iPhone SE | src/pages/warehouse/ScannerPage.tsx | offen (Re-Run nicht gemessen) |
| /warehouse/stocktake | `button.mt-5.w-full.rounded-xl.px-4 "Abbrechen" (278x46) below tab bar top 477` | iPhone SE | src/pages/warehouse/StocktakePage.tsx | offen (Re-Run nicht gemessen) |
| /warehouse/stocktake | `button.mt-5.w-full.rounded-xl.px-4 "Abbrechen" (318x46) below tab bar top 709` | Android 360 | src/pages/warehouse/StocktakePage.tsx | offen (Re-Run nicht gemessen) |
| /warehouse/stocktake | `button.mt-5.w-full.rounded-xl.px-4 "Abbrechen" (348x46) below tab bar top 753` | iPhone 390 | src/pages/warehouse/StocktakePage.tsx | offen (Re-Run nicht gemessen) |
| /warehouse/stocktake | `button.mt-5.w-full.rounded-xl.px-4 "Abbrechen" (388x46) below tab bar top 841` | iPhone 430 | src/pages/warehouse/StocktakePage.tsx | offen (Re-Run nicht gemessen) |

### Inhalt in der oberen Safe Area (47 px) (0 Routen)

Keine Befunde.

### Eingabefelder < 16 px Schrift (iOS-Fokus-Zoom) (3 Routen)

| Route | Element | Viewports | Datei (vermutet) | Status |
|---|---|---|---|---|
| /compliance/reports | `input.rounded-md.border.border-input.bg-background (161x40 font-size 14px)` | iPhone SE, iPhone 390, iPhone 430, iPad Mini | src/pages/compliance/ComplianceReportsPage.tsx | behoben |
| /compliance/reports | `input.rounded-md.border.border-input.bg-background (181x38 font-size 14px)` | Android 360 | src/pages/compliance/ComplianceReportsPage.tsx | behoben |
| /products/:id/batches/:id/edit | `textarea.flex.min-h-20.w-full.rounded-md (238x80 font-size 14px)` | iPhone SE | src/components/ui/textarea.tsx | behoben |
| /products/:id/batches/:id/edit | `textarea.flex.min-h-20.w-full.rounded-md (278x80 font-size 14px)` | Android 360 | src/components/ui/textarea.tsx | behoben |
| /products/:id/batches/:id/edit | `textarea.flex.min-h-20.w-full.rounded-md (308x80 font-size 14px)` | iPhone 390 | src/components/ui/textarea.tsx | behoben |
| /products/:id/batches/:id/edit | `textarea.flex.min-h-20.w-full.rounded-md (348x80 font-size 14px)` | iPhone 430 | src/components/ui/textarea.tsx | behoben |
| /products/:id/batches/:id/edit | `textarea.flex.min-h-20.w-full.rounded-md (414x80 font-size 14px)` | iPad Mini | src/components/ui/textarea.tsx | behoben |
| /products/:id/batches/new | `textarea.flex.min-h-20.w-full.rounded-md (238x80 font-size 14px)` | iPhone SE | src/components/ui/textarea.tsx | behoben |
| /products/:id/batches/new | `textarea.flex.min-h-20.w-full.rounded-md (278x80 font-size 14px)` | Android 360 | src/components/ui/textarea.tsx | behoben |
| /products/:id/batches/new | `textarea.flex.min-h-20.w-full.rounded-md (308x80 font-size 14px)` | iPhone 390 | src/components/ui/textarea.tsx | behoben |
| /products/:id/batches/new | `textarea.flex.min-h-20.w-full.rounded-md (348x80 font-size 14px)` | iPhone 430 | src/components/ui/textarea.tsx | behoben |
| /products/:id/batches/new | `textarea.flex.min-h-20.w-full.rounded-md (414x80 font-size 14px)` | iPad Mini | src/components/ui/textarea.tsx | behoben |
