# Shopify ↔ DPP-App: Full-Circle Integration

Vollständige Architektur-Referenz der bidirektionalen Shopify-Integration zwischen Hydrogen-Storefront (`shop.fambliss.de`), der DPP-App Trackbliss (`dpp-app.fambliss.eu`) und dem Marketing-Portal (`fambliss.de` / `fambliss.eu`).

Stand: 2026-04-22, nach Implementierung von Phase 0–4.

---

## 1. Systeme im Überblick

```
┌───────────────────────────────────┐
│  SHOPIFY (fambliss.myshopify.com) │   ← Source of truth für: Checkout, Zahlung, Kunden,
│  Admin API + Webhooks             │     Rabattcodes, Preise, Produktkatalog (auth. Katalog)
└─────────────┬─────────────────────┘
              │ Admin API (REST, apiVersion 2024-10)
              │ Webhooks (HMAC-signed, JSON)
              ▼
┌───────────────────────────────────┐       ┌─────────────────────────────┐
│  DPP-APP / TRACKBLISS             │◀────▶ │  HYDROGEN STOREFRONT         │
│  React 19 SPA + Supabase          │       │  shop.fambliss.de            │
│  Multi-Tenant SaaS                │       │  Hydrogen + React Router v7  │
│  dpp-app.fambliss.eu              │       │  Shopify Oxygen              │
│                                   │       │                              │
│  ┌─ Warehouse-Modul ─────┐        │       │  - Produktseiten (PDP)       │
│  │  wh_shipments         │        │       │  - Checkout (→ Shopify)      │
│  │  wh_stock_levels      │        │       │  - DPP-Link pro Produkt ─────┼──▶ DPP public
│  │  wh_stock_transactions│        │       │    (/transparency/:handle)   │    view
│  └───────────────────────┘        │       └──────────────────────────────┘
│  ┌─ Returns Hub ─────────┐        │
│  │  rh_returns           │        │       ┌─────────────────────────────┐
│  │  rh_customers         │        │       │  FAMBLISS PORTAL            │
│  │  rh_tickets           │        │       │  fambliss.de / .eu          │
│  └───────────────────────┘        │       │  Separates Supabase         │
│  ┌─ Shopify-Bridge ──────┐        │       │  (bkaaepzqejzdczivquoh)     │
│  │  shopify_product_map  │        │       │                             │
│  │  shopify_location_map │        │       │  - Admin Codes              │
│  │  shopify_sync_log     │        │       │  - Influencer Codes ────────┼──▶ Shopify PriceRules
│  │  shopify_webhook_events│       │       │  - Transparency-Seite  ◀────┼──  DPP Public API
│  └───────────────────────┘        │       │  - Reseller Portal          │
│  Edge Functions:                  │       └─────────────────────────────┘
│  - shopify-sync (17 actions)      │
│  - shopify-webhook (11 topics)    │
└───────────────────────────────────┘
```

**Wichtige Fakten**
- Die DPP-App hat **ein eigenes Supabase-Projekt** (`xbnybrqzsjlbieqlwsas`), getrennt vom Portal (`bkaaepzqejzdczivquoh`).
- Der Portal-Code in `fambliss-family-joy` ist NICHT Teil des Order-Flows — er konsumiert DPP-Daten read-only über die Public API und synct Rabattcodes direkt zu Shopify (über das Schwester-Repo `fambliss_app`).
- **Shopify ist die einzige Instanz, die Orders erzeugt** (aus dem Hydrogen-Checkout). Die DPP-App spiegelt Orders, erzeugt aber nie neue.

---

## 2. Full-Circle Order Flow: von Checkout bis Zugestellt

```
 Kunde ─┐
        │
        ▼
┌──────────────────────────────────────────────┐
│ (1) HYDROGEN STOREFRONT (shop.fambliss.de)   │
│     Kunde klickt "Bezahlen" im Warenkorb     │
└────────────────────┬─────────────────────────┘
                     │ Checkout läuft direkt über Shopify
                     ▼
┌──────────────────────────────────────────────┐
│ (2) SHOPIFY CHECKOUT                         │
│     Bezahlung → Order erzeugt in Shopify     │
│     financial_status: "paid"                 │
└────────────────────┬─────────────────────────┘
                     │ Webhook: orders/create + orders/paid
                     │ (HMAC-SHA256 signed)
                     ▼
┌──────────────────────────────────────────────┐
│ (3) DPP: shopify-webhook Edge Function       │
│     - Dedup via x-shopify-webhook-id         │
│     - HMAC verification                      │
│     - Insert shopify_webhook_events (log)    │
│     - Resolve tenant via shopDomain          │
│     - Dispatch to handleOrderCreated()       │
└────────────────────┬─────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────┐
│ (4) HandleOrderCreated()                     │
│     a) Dedup: shopify_order_id unique?       │
│     b) Upsert rh_customers via shopify_id    │
│        (wenn syncConfig.importCustomers=true)│
│     c) Resolve line_items via                │
│        shopify_product_map.shopify_variant_id│
│        → product_id + batch_id               │
│        (batch via FEFO wenn auto_batch=true) │
│     d) INSERT wh_shipments (status='draft')  │
│        mit shopify_order_id, customer_id     │
│     e) INSERT wh_shipment_items              │
│     f) Reserve stock: wh_stock_levels        │
│        quantity_available -= qty             │
│        quantity_reserved  += qty             │
│     g) INSERT wh_stock_transactions          │
│        (type='reservation')                  │
└────────────────────┬─────────────────────────┘
                     │ User sieht Order in DPP UI
                     │ /warehouse/shipments — mit Shopify-Badge
                     ▼
┌──────────────────────────────────────────────┐
│ (5) DPP UI: Pick → Pack → Label              │
│     Status-Transitions via wh-shipments.ts:  │
│     draft → picking → packed → label_created │
│     DHL-Label wird in Edge Function          │
│     dhl-shipping erstellt                    │
│     → tracking_number + label_url gesetzt    │
└────────────────────┬─────────────────────────┘
                     │ Status='shipped' via updateShipmentStatus()
                     ▼
┌──────────────────────────────────────────────┐
│ (6) Auto-Fulfillment-Export                  │
│     (wh-shipments.ts:436-475)                │
│     a) Prüfe syncConfig.autoExportFulfillment│
│     b) Wenn true → dynamic-import            │
│        createShopifyFulfillment(id)          │
│     c) Ruft shopify-sync action              │
│        create_fulfillment                    │
│        → POST /fulfillments.json             │
│        mit tracking_info                     │
│     d) Shopify sendet Versand-Mail an Kunde  │
│     e) Response: shopify_fulfillment_id      │
│        → auf wh_shipments zurückschreiben    │
│                                              │
│     Bei Fehler: shopify_export_pending=true, │
│     shopify_export_error, attempts++         │
│     → UI-Button "Push to Shopify" retry      │
└────────────────────┬─────────────────────────┘
                     │ Fulfillment in Shopify erzeugt
                     │ Webhook: fulfillments/create
                     ▼
┌──────────────────────────────────────────────┐
│ (7) DPP: handleFulfillmentUpsert()           │
│     Idempotent — wir schicken ja selbst.     │
│     Mirror Fulfillment-Status zurück:        │
│     shopify_fulfillment_status = 'success'   │
│     last_fulfillment_at = NOW()              │
└────────────────────┬─────────────────────────┘
                     │ DHL liefert ...
                     ▼
┌──────────────────────────────────────────────┐
│ (8) Tracking-Updates (falls später geändert) │
│     updateShipment() mit neuem               │
│     tracking_number → dynamic-import         │
│     updateShopifyFulfillmentTracking(id)     │
│     → POST /fulfillments/{id}/update_tracking│
│     Kunde bekommt ggfs. Update-Mail          │
└────────────────────┬─────────────────────────┘
                     │
                     ▼ Shopify Webhook: orders/fulfilled
┌──────────────────────────────────────────────┐
│ (9) DPP: handleOrderFulfilled()              │
│     Wenn User in Shopify Admin statt DPP     │
│     fulfilled: wir holen auf — Status wird   │
│     im DPP auf 'shipped' gesetzt             │
└──────────────────────────────────────────────┘
```

**Einstieg in diesen Flow manuell, ohne Webhook** (historische Orders oder wenn Webhooks noch nicht registriert sind):

```
DPP UI → /warehouse/integrations/shopify → Sync Dashboard
  → "Import historical orders" öffnen
  → Zeitraum wählen (oder leer = alle Orders ever)
  → Status=any, FulfillmentStatus=any
  → Estimate count
  → IMPORTIEREN tippen → Start
  → handleSyncOrders läuft im Backfill-Modus:
     - Link-Cursor-Pagination, 250 pro Seite
     - Sleep 500ms zwischen Seiten (rate-limit)
     - Historische fulfillte Orders werden als
       status='shipped' mit shopify_fulfillment_id
       importiert — also bereits im End-Zustand
     - Unmapped Variants landen in sync_log.errors
```

---

## 3. Full-Circle Refund Flow

```
 Kunde möchte Retoure
        │
        ├─────────────────────┬─────────────────────┐
        ▼                     ▼                     ▼
  DPP Returns Hub       Shopify Admin          E-Mail Support
  (Self-Service         (Händler-initiiert)   (wird ins RH
   Portal oder                                 überführt)
   Admin)
        │                     │
        │                     │
        ▼                     ▼
┌────────────────┐    ┌──────────────────┐
│ rh_returns     │    │ Shopify refund   │
│ Status ändert  │    │ wird erzeugt     │
│ sich zu        │    │ (Admin-Workflow) │
│ REFUND_        │    └────────┬─────────┘
│ COMPLETED      │             │ Webhook: refunds/create
└────────┬───────┘             ▼
         │              ┌──────────────────────┐
         │              │ DPP: handleRefund    │
         │              │ Created()            │
         │              │ - Find rh_returns via│
         │              │   shopify_refund_id  │
         │              │   oder shopify_order_│
         │              │   id+amount          │
         │              │ - Update refund_     │
         │              │   amount, refunded_at│
         │              │ - Wenn noch nicht    │
         │              │   existiert: INSERT  │
         │              │   rh_returns mit     │
         │              │   status=REFUND_     │
         │              │   COMPLETED          │
         │              └──────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│ returns.ts:updateReturnStatus()             │
│ Prüft:                                      │
│ - Previous status ≠ REFUND_COMPLETED        │
│ - shopify_order_id gesetzt                  │
│ - shopify_refund_id noch leer               │
│ - refund_amount > 0                         │
│ - syncConfig.autoPushRefunds ≠ false        │
│ Wenn alles erfüllt:                         │
│   dynamic-import createShopifyRefund(id)    │
└────────┬────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│ shopify-sync: handleCreateRefund()          │
│ 1. GET /orders/{id}/transactions.json       │
│    → Parent-Transaction finden              │
│      (kind=sale|capture, status=success)    │
│ 2. POST /orders/{id}/refunds.json           │
│    {                                        │
│      refund: {                              │
│        notify: true,                        │
│        transactions: [{                     │
│          parent_id, amount,                 │
│          kind: 'refund', gateway            │
│        }]                                   │
│      }                                      │
│    }                                        │
│ 3. Shopify sendet Refund-Mail an Kunde     │
│ 4. Response.refund.id → zurück auf          │
│    rh_returns.shopify_refund_id             │
│ 5. refund_reference = 'shopify:<id>'        │
└─────────────────────────────────────────────┘
```

**Kritische Schutzmechanismen**
- `shopify_refund_id IS NULL`-Check verhindert Doppel-Erstattung.
- Bei Fehler: `rh_returns.last_refund_error` geschrieben, Flag bleibt NULL → manueller Retry möglich.
- Webhook `refunds/create` verhindert Drift: Refunds, die direkt in Shopify gemacht wurden, landen auch im DPP.

---

## 4. Webhook-Topic-Mapping

Alle 12 Topics, die via `register_webhooks`-Action konfiguriert werden:

| Topic | Handler (shopify-webhook) | Wirkung im DPP |
|---|---|---|
| `orders/create` | `handleOrderCreated` | Neuer `wh_shipments`-Eintrag, Stock-Reservation |
| `orders/updated` | `handleOrderUpdated` | Delegiert an `orders/cancelled` oder `orders/fulfilled` je nach Feldern |
| `orders/cancelled` | `handleOrderCancelled` | Shipment → `cancelled`, Stock-Release |
| `orders/fulfilled` | `handleOrderFulfilled` | Shipment → `shipped`, `shopify_fulfillment_id` gesetzt |
| `orders/paid` | `handleOrderPaid` | Re-enter `handleOrderCreated` (für Orders die initial nicht `paid` waren) |
| `fulfillments/create` | `handleFulfillmentUpsert` | Fulfillment-ID + Status mirroren |
| `fulfillments/update` | `handleFulfillmentUpsert` | Fulfillment-Status-Update (z. B. Shopify-seitig cancelled) |
| `refunds/create` | `handleRefundCreated` | `rh_returns` spiegeln, `shopify_refund_id` schreiben |
| `customers/create` | `handleCustomerUpsert` | Upsert `rh_customers` via `shopify_customer_id` |
| `customers/update` | `handleCustomerUpsert` | Gleich wie create (upsert) |
| `inventory_levels/update` | `handleInventoryLevelUpdate` | Default log-only. Nur bei `importInventory=true` wird `wh_stock_levels` überschrieben |
| `app/uninstalled` | `handleAppUninstalled` | `tenants.settings.shopifyIntegration` komplett gelöscht, Mappings deaktiviert |

**Lieferungs-Reliability**
- Jede eingehende Lieferung → INSERT `shopify_webhook_events` mit `status='pending'` → Dispatch → `status='processed'` oder `'failed'`.
- Bei `failed`: 500 zurückgeben, Shopify retryt 19× über 48h.
- Bei Duplikat (gleiche `x-shopify-webhook-id`): sofort 200 zurück, nicht dispatchen.

---

## 5. Datenmodell: Shopify-Bridge-Columns

```
wh_shipments
├─ shopify_order_id          BIGINT  UNIQUE(tenant_id,…)  ← Idempotency-Key
├─ shopify_fulfillment_id    BIGINT                        ← Für update_tracking
├─ shopify_fulfillment_status TEXT                         ← 'success', 'cancelled', 'dead_letter'
├─ shopify_export_pending    BOOLEAN                       ← Ausstehender Push
├─ shopify_export_attempts   INT                           ← Retry-Counter, max 5
├─ shopify_export_error      TEXT                          ← Letzte Fehlermeldung
├─ last_fulfillment_at       TIMESTAMPTZ                   ← Zeitpunkt des letzten Push-Versuchs
└─ customer_id               UUID → rh_customers(id)       ← Kunden-Referenz

rh_customers
└─ shopify_customer_id       BIGINT  UNIQUE(tenant_id,…)

rh_returns
├─ shopify_order_id          BIGINT
├─ shopify_refund_id         BIGINT
└─ last_refund_error         TEXT

shopify_product_map
└─ auto_batch                BOOLEAN                       ← FEFO-Auto-Selection bei Import

shopify_sync_log
└─ metadata                  JSONB                         ← Cursor-State für Recovery

shopify_webhook_events   (NEW TABLE — dead-letter queue)
├─ id, tenant_id, shop_domain, topic
├─ shopify_webhook_id        TEXT  UNIQUE                  ← Dedup-Key
├─ payload                   JSONB
├─ hmac_valid                BOOLEAN
├─ status                    'pending' | 'processed' | 'failed' | 'dead_letter'
├─ attempts, last_error
└─ received_at, processed_at
```

**Idempotency-Garantien**
- `wh_shipments.shopify_order_id` UNIQUE — ein Shopify-Order kann nie zweifach importiert werden.
- `rh_customers.shopify_customer_id` UNIQUE — Customer-Upsert ist sicher.
- `shopify_webhook_events.shopify_webhook_id` UNIQUE — Webhook-Retry von Shopify-Seite erzeugt keine doppelte Verarbeitung.

---

## 6. Edge-Function-Actions (shopify-sync)

17 Actions, alle via `invokeEdgeFunction('shopify-sync', { action, params })` vom Client:

| Action | Zweck | Auth |
|---|---|---|
| `save_token` | Access-Token + Shop-Domain persistieren | User |
| `test_connection` | Shop-Info + Scope-Probe | User |
| `fetch_products` | Produkte + Varianten für Mapping-UI | User |
| `fetch_locations` | Locations für Mapping-UI | User |
| `sync_orders` | Manual Order-Sync (mit Filter) ODER Backfill-Modus | User |
| `count_orders` | Schätzung für Backfill-Dialog | User |
| `sync_inventory_import` | Inventory-Abgleich (read-only Report) | User |
| `sync_inventory_export` | DPP-Stock → Shopify pushen | User |
| `sync_customers` | Alle Shopify-Customers → rh_customers | User |
| `create_fulfillment` | Ein Shipment als fulfilled pushen | User / Auto |
| `retry_fulfillment` | Alle pending oder einen spezifischen retrien | User |
| `update_fulfillment_tracking` | Tracking-Update auf existierendem Fulfillment | User / Auto |
| `create_refund` | Shopify-Refund für ein `rh_returns` erstellen | User / Auto |
| `fetch_unmapped_variants` | Liste aller Variants, die in Orders auftauchten aber nicht gemappt sind | User |
| `register_webhooks` | Alle 12 Topics in Shopify registrieren | User |
| `list_webhooks` | Aktuell registrierte Webhooks abfragen | User |
| `delete_webhooks` | Alle DPP-Webhooks aus Shopify entfernen | User |
| `test_webhook` | Test-Ping-Helfer (zeigt letzte empfangene Events) | User |

**Billing-Gate**: Alle Actions außer intern getriggerte (Webhooks über Service-Role) prüfen `billing_module_subscriptions` für `warehouse_professional` oder `warehouse_business`. Aktuell aktiv für `myfambliss_gmbh`.

---

## 7. Inventory-Flow (1.5-way, kein echter 2-way)

```
     DPP (Source-of-Truth)                    Shopify
     wh_stock_levels              ───────▶    inventory_levels
     (quantity_available)         export      (available)

                                  ◀───────
                                  import
                                  (default: log-only)
```

- **Export** (DPP → Shopify): Manueller Klick auf `Sync Inventory (Export)` oder via `POST inventory_levels/set.json`. Das setzt Shopify absolut auf den DPP-Wert.
- **Import** (Shopify → DPP): Nur Logging. DPP bleibt Source-of-Truth.
- **Bei `syncConfig.importInventory=true`** (Opt-in): der `inventory_levels/update`-Webhook schreibt Shopify-Werte in `wh_stock_levels`. Nur aktivieren, wenn Shopify-POS oder andere Shopify-Channels real Bestand verbrauchen.

---

## 8. Failure- und Retry-Flows

**Fulfillment-Export schlägt fehl** (z. B. Shopify-Auth abgelaufen)
```
wh-shipments.ts:status='shipped'
  → createShopifyFulfillment() throws
  → shopify_export_pending=true
  → shopify_export_attempts=1
  → shopify_export_error='...'
  ↓
User sieht rot Dot in Shipment-Liste + Fehler in ShopifyShipmentSyncCard
  ↓
Klick "Push to Shopify" in UI
  → retryShopifyFulfillment(id)
  → attempts++
  → Bei Erfolg: pending=false, error=NULL, status='success'
  → Bei attempts>=5: shopify_fulfillment_status='dead_letter'
     → benötigt manuellen Eingriff (z. B. Access-Token neu holen)
```

**Webhook kommt mit ungültigem HMAC**
```
shopify-webhook
  → verifyHmac() fails
  → INSERT shopify_webhook_events status='failed'
  → Return 401
  → Shopify retryt nicht (HMAC-Fehler sind endgültig)
```

**Webhook-Handler wirft Exception**
```
shopify-webhook
  → HMAC OK, aber handleOrderCreated() throws
  → INSERT shopify_webhook_events status='failed', last_error='...'
  → Return 500
  → Shopify retryt automatisch (19× über 48h)
```

**Historischer Backfill wird unterbrochen**
```
handleSyncOrders mit backfill=true
  → Jede Seite persistiert lastCursor in shopify_sync_log.metadata
  → Bei Timeout/Crash: sync_log zeigt status='failed' + letzten Cursor
  → User kann neuen Sync mit sinceId starten
```

---

## 9. Shopify ↔ Storefront: wo berühren sie sich?

```
Hydrogen-Storefront (shop.fambliss.de)              Shopify (fambliss.myshopify.com)
│                                                    │
│  Product Detail Page                                │
│  ├─ Produkt-Daten: Storefront API (public token)◀───┤
│  ├─ Variant-SKU, Images, Preise, Metafields         │
│  └─ DigitalPassportLink-Button                      │
│     → dpp-app.fambliss.eu/transparency/<handle>     │
│                                                    │
│  Checkout                                          │
│  └─ Redirect to shop.fambliss.de/cart?…            │
│     → Shopify-hosted Checkout                      │
│                                                    │
│  Support-Seite (/pages/support)                     │
│  └─ iFrame embed                                    │
│     → dpp-app.fambliss.eu/embed/portal/myfambliss_ │
│       gmbh (Returns-Hub-Portal)                    │
```

**Die Storefront ist nur Produkt-/Marketing-UI**. Sie schreibt keine Orders, sie liest nur aus der Shopify Storefront API. Checkout-Flow bleibt vollständig in Shopify.

---

## 10. Drei Konfigurations-Flags (und ihre Auswirkungen)

Alle unter `tenants.settings.shopifyIntegration.syncConfig`:

| Flag | Default | Effekt wenn true | Effekt wenn false |
|---|---|---|---|
| `importOrders` | true | `orders/create`-Webhook erzeugt Shipments | Webhook wird ignoriert (nur gelogged) |
| `importCustomers` | false | Jede Order → Upsert `rh_customers` | Nur Shipment, keine Customer-Zeile |
| `autoCreateShipments` | true | Shipment startet in status=`draft` | (aktuell nicht unterschieden) |
| `autoExportFulfillment` | true | Status=`shipped` pusht automatisch zu Shopify | Status=`shipped` setzt nur `export_pending=true` |
| `exportStockLevels` | true | `inventory_levels/set` wird ausgeführt | Manueller Export blockiert |
| `exportFulfillments` | true | (Doppel-Flag, wird aktuell mit autoExport geprüft) | — |
| **`autoPushRefunds`** | true | `REFUND_COMPLETED` pusht Refund zu Shopify | Refund bleibt lokal, User muss manuell anstoßen |
| **`importInventory`** | false | (nicht aktiviert) | Inventory-Webhooks nur geloggt |
| `orderStatusFilter` | `['paid']` | Standard-Sync filtert auf financial_status=paid | Backfill kann das überschreiben |

---

## 11. Wer ruft was auf — Call-Graph

```
BROWSER (React UI)
  │
  ├─▶ src/services/supabase/shopify-integration.ts
  │   ├─ saveShopifyAccessToken()         ─┐
  │   ├─ testShopifyConnection()          │
  │   ├─ fetchShopifyProducts()           │
  │   ├─ autoMapByGtin() [direct DB]      │
  │   ├─ syncShopifyOrders()              │
  │   ├─ syncShopifyOrdersBackfill()      │
  │   ├─ countShopifyOrders()             │
  │   ├─ createShopifyFulfillment()       ├─▶ invokeEdgeFunction('shopify-sync', {action})
  │   ├─ retryShopifyFulfillment()        │
  │   ├─ updateShopifyFulfillmentTracking│
  │   ├─ createShopifyRefund()            │
  │   ├─ syncShopifyCustomers()           │
  │   ├─ fetchUnmappedVariants()          │
  │   ├─ registerShopifyWebhooks()        │
  │   ├─ listShopifyWebhooks()            │
  │   ├─ deleteShopifyWebhooks()          │
  │   └─ testShopifyWebhook()             ─┘
  │
  └─▶ src/services/supabase/wh-shipments.ts
       └─ updateShipmentStatus(status='shipped')
            └─ dynamic-import createShopifyFulfillment()  ◀── Auto-trigger

src/services/supabase/returns.ts
  └─ updateReturnStatus(status='REFUND_COMPLETED')
       └─ dynamic-import createShopifyRefund()  ◀── Auto-trigger

──────────────────────────────────────────────────────

SHOPIFY (ausgehend)
  │
  ▼
shopify-webhook Edge Function (public, HMAC-verified)
  ├─ handleOrderCreated → wh_shipments insert
  ├─ handleOrderFulfilled → wh_shipments update
  ├─ handleOrderCancelled → wh_shipments cancel + stock release
  ├─ handleRefundCreated → rh_returns upsert
  ├─ handleCustomerUpsert → rh_customers upsert
  ├─ handleFulfillmentUpsert → shopify_fulfillment_id mirror
  ├─ handleInventoryLevelUpdate → log-only (oder write wenn opt-in)
  └─ handleAppUninstalled → wipe integration settings

──────────────────────────────────────────────────────

SCHEDULER (zukünftig optional, via pg_cron)
  └─ retry_fulfillment alle 5 min → wh_shipments wo export_pending=true
```

---

## 12. Der Weg von 0 Orders zu Live-Betrieb

Die drei einmaligen Setup-Schritte, damit der Circle schließt:

```
┌─ SCHRITT A: Webhook-Secret setzen ──────────────────┐
│  Shopify Admin → Custom App → API secret key       │
│  Dann:                                             │
│  npx supabase secrets set SHOPIFY_WEBHOOK_SECRET=…  │
│  → Ohne das lehnt webhook alle Requests mit 401 ab │
└─────────────────────────────────────────────────────┘

┌─ SCHRITT B: Webhooks registrieren ──────────────────┐
│  DPP UI → /warehouse/integrations/shopify           │
│  Tab "Webhook Setup" → "Register webhooks"         │
│  → 12 POST /webhooks.json Calls an Shopify         │
│  → tenants.settings.shopifyIntegration.            │
│    registeredWebhooks = [...]                       │
│  Damit werden ab jetzt live neue Orders empfangen  │
└─────────────────────────────────────────────────────┘

┌─ SCHRITT C: Historischer Backfill (einmalig) ───────┐
│  DPP UI → Sync Dashboard → "Import historical …"    │
│  → sync_orders mit backfill=true                    │
│  → Paginiert alle Orders, idempotent                │
│  → Fulfillte Orders → status='shipped' inkl.        │
│    shopify_fulfillment_id + tracking                │
│  → Alle Shopify-Orders sichtbar in /warehouse/     │
│    shipments                                       │
└─────────────────────────────────────────────────────┘
```

Ab dann: **Shopify-Order → sofort im DPP sichtbar. DPP-Status-Änderung → sofort in Shopify. Refund im DPP → sofort in Shopify. Refund in Shopify → sofort im DPP.**

---

## 13. Monitoring-Checkliste für Dauerbetrieb

**Einmal pro Woche prüfen**:
```bash
cd C:/Users/luca/projects/App_DPP
node scripts/check-shopify-integration.mjs
```

Zeigt:
- Produkt-Mapping-Count (sollte stabil bleiben oder wachsen)
- Location-Mappings
- Letzte Sync-Log-Einträge (`failed_count` sollte 0 sein)
- Shipment-Count aus Shopify (sollte mit Shop-Volumen mitwachsen)
- Billing-Modul-Status

**Warnsignale**:
- `shopify_webhook_events` Rows mit `status='failed'` älter als 24h → Handler-Bug
- `wh_shipments` wo `shopify_export_pending=true AND shopify_export_attempts >= 5` → dead-letter, manuelle Intervention
- `rh_returns` wo `last_refund_error IS NOT NULL` → Refund-Push fehlgeschlagen
- `sync_log` zeigt plötzlich 0 orders seit X Tagen während Shop-Volumen bleibt → Webhook-Registrierung verloren

---

## 14. Wo welche Datei für welche Aufgabe

| Aufgabe | Datei |
|---|---|
| Neue Edge-Function-Action | `supabase/functions/shopify-sync/index.ts` — neuen Case im Switch + Handler |
| Neuer Webhook-Topic | `supabase/functions/shopify-webhook/index.ts` — Case in Switch + Handler |
| Neue Client-API | `src/services/supabase/shopify-integration.ts` — `callEdgeFunction`-Wrapper |
| Neue UI-Komponente | `src/components/warehouse/shopify/*.tsx` |
| DB-Schema-Änderung | `supabase/migrations/YYYYMMDD_<slug>.sql` + `node scripts/db-migrate.mjs` |
| Storefront-DPP-Link-Änderung | `hydrogen-storefront/app/components/DigitalPassportLink.tsx` |
| Influencer-Code-Sync | `fambliss-family-joy` + Schwester-Repo `fambliss_app/api/_lib/shopify.ts` (separate Integration) |
| One-off Diagnose | `scripts/check-shopify-*.mjs` — alle dem Muster folgen |
