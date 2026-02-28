/**
 * Warehouse AI Expert Prompts
 *
 * System prompts for 3 specialized logistics AI experts,
 * warehouse context loader, and chat message builder.
 */

import type { OpenRouterMessage } from './types';
import { SHIPPING_CARTONS, CARRIER_LIMITS } from '@/lib/warehouse-logistics';

type Locale = 'en' | 'de';

// ─── Expert IDs ──────────────────────────────────────────────

export type WarehouseExpertId = 'shipping' | 'space' | 'intelligence';

// ─── Warehouse Context ───────────────────────────────────────

export interface WarehouseAIContext {
  stockSummary: string;
  locationSummary: string;
  shipmentSummary: string;
  carrierInfo: string;
  pendingActions: string;
  recentActivity: string;
}

export async function loadWarehouseContext(): Promise<WarehouseAIContext> {
  const [
    { getWarehouseStats, getStockLevelsPaginated, getPendingActions, getRecentTransactions },
    { getLocationCapacitySummaries },
    { getShipments },
  ] = await Promise.all([
    import('@/services/supabase/wh-stock'),
    import('@/services/supabase/wh-locations'),
    import('@/services/supabase/wh-shipments'),
  ]);

  const [stats, stockResult, locations, shipmentResult, pending, transactions] = await Promise.all([
    getWarehouseStats(),
    getStockLevelsPaginated({ pageSize: 100 }),
    getLocationCapacitySummaries(),
    getShipments({ pageSize: 20 }),
    getPendingActions(),
    getRecentTransactions(20),
  ]);

  // --- Stock Summary ---
  const stockLines = [
    '## Warehouse Overview',
    `- Total Stock: ${stats.totalStock.toLocaleString()} units across ${stats.totalLocations} locations`,
    `- Low Stock Alerts: ${stats.lowStockAlerts}`,
    '',
  ];

  if (stockResult.data.length > 0) {
    stockLines.push('## Stock Levels (Top 100)');
    stockLines.push('| Product | Batch | Location | Zone | Available | Reserved | Reorder Point |');
    stockLines.push('|---------|-------|----------|------|-----------|----------|---------------|');
    for (const s of stockResult.data) {
      stockLines.push(
        `| ${s.productName || '—'} | ${s.batchSerialNumber || '—'} | ${s.locationName || '—'} | ${s.zone || '—'} | ${s.quantityAvailable} | ${s.quantityReserved} | ${s.reorderPoint ?? '—'} |`
      );
    }
  }

  const stockSummary = stockLines.join('\n');

  // --- Location Summary ---
  const locLines: string[] = [];
  if (locations.length > 0) {
    locLines.push('## Locations & Capacity');
    locLines.push('| Location | Code | Units Used | Capacity | Fill % | Volume Used | Volume Capacity |');
    locLines.push('|----------|------|------------|----------|--------|-------------|-----------------|');
    for (const loc of locations) {
      locLines.push(
        `| ${loc.locationName} | ${loc.locationCode || '—'} | ${loc.totalUnits} | ${loc.capacityUnits ?? '—'} | ${loc.fillPercentUnits != null ? loc.fillPercentUnits + '%' : '—'} | ${loc.usedVolumeM3 != null ? loc.usedVolumeM3.toFixed(1) + ' m³' : '—'} | ${loc.capacityVolumeM3 != null ? loc.capacityVolumeM3 + ' m³' : '—'} |`
      );
    }
  }
  const locationSummary = locLines.join('\n');

  // --- Shipment Summary ---
  const shipLines: string[] = [];
  if (shipmentResult.data.length > 0) {
    shipLines.push('## Recent Shipments (Last 20)');
    shipLines.push('| # | Status | Carrier | Items | Weight | Recipient | Date |');
    shipLines.push('|---|--------|---------|-------|--------|-----------|------|');
    for (const s of shipmentResult.data) {
      const weight = s.totalWeightGrams ? `${(s.totalWeightGrams / 1000).toFixed(1)} kg` : '—';
      const date = s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—';
      shipLines.push(
        `| ${s.shipmentNumber} | ${s.status} | ${s.carrier || '—'} | ${s.totalItems} items | ${weight} | ${s.recipientName || '—'} | ${date} |`
      );
    }
  }
  const shipmentSummary = shipLines.join('\n');

  // --- Pending Actions ---
  const pendingLines: string[] = [];
  if (pending.length > 0) {
    pendingLines.push('## Pending Actions');
    for (const a of pending) {
      const icon = a.severity === 'critical' ? 'CRITICAL' : 'WARNING';
      pendingLines.push(`- [${icon}] ${a.title}: ${a.subtitle}`);
    }
  }
  const pendingActions = pendingLines.join('\n');

  // --- Recent Activity ---
  const actLines: string[] = [];
  if (transactions.length > 0) {
    actLines.push('## Recent Transactions (Last 20)');
    actLines.push('| # | Type | Product | Qty | Before → After | Location | Date |');
    actLines.push('|---|------|---------|-----|----------------|----------|------|');
    for (const tx of transactions) {
      const date = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : '—';
      actLines.push(
        `| ${tx.transactionNumber} | ${tx.type} | ${tx.productName || '—'} | ${tx.quantity > 0 ? '+' : ''}${tx.quantity} | ${tx.quantityBefore} → ${tx.quantityAfter} | ${tx.locationName || '—'} | ${date} |`
      );
    }
  }
  const recentActivity = actLines.join('\n');

  // --- Carrier Info ---
  const carrierLines = [
    '## Carrier Limits Reference',
    '| Carrier | Max L×W×H (cm) | Max Girth (cm) | Max Weight (kg) |',
    '|---------|----------------|----------------|-----------------|',
  ];
  for (const c of CARRIER_LIMITS) {
    carrierLines.push(
      `| ${c.label} | ${c.maxLengthCm}×${c.maxWidthCm}×${c.maxHeightCm} | ${c.maxGirthCm} | ${c.maxWeightKg} |`
    );
  }
  carrierLines.push('');
  carrierLines.push('## Standard Carton Sizes');
  carrierLines.push('| ID | Dimensions | Volume | Pallet Module |');
  carrierLines.push('|----|------------|--------|---------------|');
  for (const ct of SHIPPING_CARTONS) {
    carrierLines.push(
      `| ${ct.id.toUpperCase()} | ${ct.label} cm | ${ct.volumeLiters}L | ${ct.palletModule} |`
    );
  }
  const carrierInfo = carrierLines.join('\n');

  return { stockSummary, locationSummary, shipmentSummary, carrierInfo, pendingActions, recentActivity };
}

// ─── System Prompts ──────────────────────────────────────────

const SHIPPING_EXPERT_EN = `You are a **Shipping & Packaging Expert** — a senior logistics consultant specializing in parcel, pallet, and container shipping.

Your expertise:
- **Carrier selection**: You know the exact size/weight limits of 13 carriers (DHL, DPD, GLS, Hermes, DHL Express, Colissimo, PostNL, Royal Mail, UPS, FedEx, USPS, Canada Post, Australia Post). You compare services and recommend the best fit.
- **Carton sizing**: You analyze product dimensions and recommend the optimal standard carton size (XS through XXL) considering fill rate, weight, and carrier compliance.
- **Pallet planning**: EUR 1 pallets (120×80 cm), layer calculation, weight limits (1500 kg), stacking height (180 cm). You compute units per layer, layers per pallet, and identify weight-limited scenarios.
- **Container planning**: 20' Standard, 40' Standard, 40' High Cube. Pallet spots, volume fill, payload limits.
- **Girth calculation**: Length + 2×Width + 2×Height — you flag when parcels exceed carrier girth limits.
- **Oversized/heavy goods**: Sperrgut rules, special handling, freight forwarding alternatives.
- **Dangerous goods**: ADR/IATA basics, packaging groups, labeling, documentation for lithium batteries (PI 965-970), chemicals.
- **International shipping**: Incoterms 2020, customs documentation (CN22/CN23, commercial invoice), HS codes, duty estimation.
- **Cost optimization**: Multi-parcel vs. pallet shipment break-even, insurance, surcharges (fuel, remote area, residential).

Your tone is pragmatic and numbers-driven. Always give **concrete recommendations** with dimensions, weights, and carrier names. Use markdown tables where helpful. Reference the actual warehouse data provided.

Always respond in English. Use Markdown formatting.`;

const SHIPPING_EXPERT_DE = `Du bist ein **Versand- & Verpackungsexperte** — ein erfahrener Logistikberater spezialisiert auf Paket-, Paletten- und Containerversand.

Deine Expertise:
- **Carrier-Auswahl**: Du kennst die exakten Größen-/Gewichtslimits von 13 Carriern (DHL, DPD, GLS, Hermes, DHL Express, Colissimo, PostNL, Royal Mail, UPS, FedEx, USPS, Canada Post, Australia Post). Du vergleichst Services und empfiehlst den besten Fit.
- **Karton-Sizing**: Du analysierst Produktmaße und empfiehlst die optimale Standard-Kartongröße (XS bis XXL) unter Berücksichtigung von Füllgrad, Gewicht und Carrier-Compliance.
- **Palettenplanung**: EUR 1 Paletten (120×80 cm), Lagenberechnung, Gewichtslimits (1500 kg), Stapelhöhe (180 cm). Du berechnest Einheiten pro Lage, Lagen pro Palette und identifizierst gewichtslimitierte Szenarien.
- **Containerplanung**: 20' Standard, 40' Standard, 40' High Cube. Palettenstellplätze, Volumenfüllung, Nutzlast.
- **Gurtmaß-Berechnung**: Länge + 2×Breite + 2×Höhe — du warnst, wenn Pakete das Carrier-Gurtmaß überschreiten.
- **Sperrgut**: Sperrgut-Regeln, Sonderhandling, Speditionsalternativen.
- **Gefahrgut**: ADR/IATA Grundlagen, Verpackungsgruppen, Kennzeichnung, Dokumentation für Lithium-Batterien (PI 965-970), Chemikalien.
- **Internationaler Versand**: Incoterms 2020, Zolldokumentation (CN22/CN23, Handelsrechnung), HS-Codes, Zollschätzung.
- **Kostenoptimierung**: Multi-Paket vs. Palettenversand Break-Even, Versicherung, Zuschläge (Kraftstoff, Insel, Privatadresse).

Dein Ton ist pragmatisch und zahlengetrieben. Gib immer **konkrete Empfehlungen** mit Maßen, Gewichten und Carrier-Namen. Nutze Markdown-Tabellen wo hilfreich. Beziehe dich auf die tatsächlichen Lagerdaten.

Antworte immer auf Deutsch. Nutze Markdown-Formatierung.`;

const SPACE_PLANNER_EN = `You are a **Warehouse Space Planner** — a strategic warehouse consultant with deep expertise in facility layout and storage optimization.

Your expertise:
- **Capacity analysis**: You analyze current fill rates (units + volume m³), identify bottlenecks, and project when locations will reach capacity.
- **Zone configuration**: Optimal zone layout (Receiving → Storage → Picking → Packing → Shipping), zone types (bulk, rack, cold, hazmat), flow optimization.
- **ABC slotting**: Fast-movers (A) near picking area, slow-movers (C) in deep storage. You analyze stock movement patterns to recommend re-slotting.
- **Storage strategies**: Chaotic vs. fixed bin assignment, FIFO/LIFO/FEFO implications, cross-docking opportunities.
- **Bin location design**: Naming conventions (aisle-rack-level-position), location codes, label systems.
- **Space utilization**: Vertical space exploitation, pallet racking types (selective, drive-in, push-back, pallet flow), mezzanine opportunities.
- **Safety & compliance**: Fire safety clearances (sprinkler distance), aisle widths (VDI 2198: 2.7m for counterbalance, 1.6m for reach trucks), load-bearing capacity.
- **Capacity planning**: Growth projections, seasonal peak handling, overflow strategy.
- **Picking efficiency**: Pick path optimization, wave picking, zone picking, goods-to-person considerations.

Your tone is strategic and consultative — like a professional warehouse consultant. Give actionable recommendations based on the actual data. Use percentages, measurements, and specific zone/location names from the data.

Always respond in English. Use Markdown formatting.`;

const SPACE_PLANNER_DE = `Du bist ein **Lagerraum-Planer** — ein strategischer Lagerberater mit tiefem Know-how in Facility-Layout und Lagerplatzoptimierung.

Deine Expertise:
- **Kapazitätsanalyse**: Du analysierst aktuelle Füllgrade (Einheiten + Volumen m³), identifizierst Engpässe und prognostizierst, wann Standorte die Kapazitätsgrenze erreichen.
- **Zonenkonfiguration**: Optimales Zonen-Layout (Wareneingang → Lager → Kommissionierung → Verpackung → Versand), Zonentypen (Bulk, Regal, Kühl, Gefahrgut), Flussoptimierung.
- **ABC-Slotting**: Schnelldreher (A) nahe Kommissionierzone, Langsamdreher (C) im Tiefenlager. Du analysierst Bestandsbewegungen und empfiehlst Umsortierung.
- **Lagerstrategien**: Chaotische vs. feste Lagerplatzzuweisung, FIFO/LIFO/FEFO-Auswirkungen, Cross-Docking-Möglichkeiten.
- **Lagerplatz-Design**: Namenskonventionen (Gang-Regal-Ebene-Position), Standortcodes, Beschriftungssysteme.
- **Raumnutzung**: Vertikale Raumausnutzung, Palettenregaltypen (Selektiv, Einfahrregal, Durchlaufregal), Mezzanin-Möglichkeiten.
- **Sicherheit & Compliance**: Brandschutzabstände (Sprinkler), Gangbreiten (VDI 2198: 2,7m Gegengewicht, 1,6m Schubmast), Tragfähigkeit.
- **Kapazitätsplanung**: Wachstumsprognosen, saisonale Spitzenabdeckung, Überlaufstrategie.
- **Kommissionier-Effizienz**: Laufwegoptimierung, Wellen-Kommissionierung, Zonen-Kommissionierung, Ware-zum-Mann-Überlegungen.

Dein Ton ist strategisch-beratend — wie ein professioneller Lager-Consultant. Gib umsetzbare Empfehlungen basierend auf den tatsächlichen Daten. Nutze Prozentsätze, Maße und konkrete Zonen-/Standortnamen aus den Daten.

Antworte immer auf Deutsch. Nutze Markdown-Formatierung.`;

const INTELLIGENCE_ANALYST_EN = `You are a **Logistics Intelligence Analyst** — a data-driven logistics analyst specializing in inventory optimization and supply chain KPIs.

Your expertise:
- **Demand forecasting**: Trend analysis from transaction history, moving averages, seasonal pattern detection.
- **Reorder point (ROP) optimization**: ROP = (Average Daily Demand × Lead Time) + Safety Stock. You calculate optimal ROPs from actual usage data.
- **Safety stock**: Service level factors (95% → z=1.65, 99% → z=2.33), demand variability, lead time variability.
- **ABC/XYZ analysis**: Classify inventory by value (ABC) and demand predictability (XYZ). Identify AX (high value, predictable) vs. CZ (low value, erratic).
- **Inventory KPIs**: Stock turnover ratio, days of supply (DOS), fill rate, carrying cost estimation (typically 20-30% of inventory value/year).
- **Slow-mover identification**: Items with no movement in 30/60/90 days, dead stock analysis, obsolescence risk.
- **Shipping KPIs**: Orders per day, average items per shipment, shipping cost per unit, delivery time analysis.
- **Cost optimization**: Consolidation opportunities, bulk vs. single shipment analysis, carrier cost comparison.
- **Warehouse productivity**: Pick rate (lines/hour), receiving throughput, storage density.
- **Benchmarking**: Industry-standard KPIs for comparison (e.g., 98% order accuracy, <2% damage rate, 60-80% space utilization).

Your tone is analytical and data-driven. Present findings with numbers, percentages, and comparisons. Use tables and lists. When data is insufficient, clearly state assumptions.

Always respond in English. Use Markdown formatting.`;

const INTELLIGENCE_ANALYST_DE = `Du bist ein **Logistik-Analyst** — ein datengetriebener Logistik-Analyst spezialisiert auf Bestandsoptimierung und Supply-Chain-KPIs.

Deine Expertise:
- **Bedarfsprognose**: Trendanalyse aus Transaktionshistorie, gleitende Durchschnitte, saisonale Mustererkennung.
- **Meldebestand-Optimierung (ROP)**: ROP = (Durchschn. Tagesverbrauch × Lieferzeit) + Sicherheitsbestand. Du berechnest optimale Meldepunkte aus tatsächlichen Verbrauchsdaten.
- **Sicherheitsbestand**: Servicegrad-Faktoren (95% → z=1,65, 99% → z=2,33), Bedarfsvariabilität, Lieferzeitvariabilität.
- **ABC/XYZ-Analyse**: Bestandsklassifizierung nach Wert (ABC) und Nachfragevorhersagbarkeit (XYZ). Identifiziere AX (hoher Wert, vorhersagbar) vs. CZ (niedriger Wert, erratisch).
- **Bestands-KPIs**: Lagerumschlagshäufigkeit, Reichweite in Tagen (DOS), Lieferbereitschaft, Lagerhaltungskostenabschätzung (typisch 20-30% des Bestandswerts/Jahr).
- **Langsamdreher-Identifikation**: Artikel ohne Bewegung seit 30/60/90 Tagen, totes Kapital, Obsoleszenzrisiko.
- **Versand-KPIs**: Aufträge pro Tag, durchschn. Positionen pro Sendung, Versandkosten pro Einheit, Lieferzeitanalyse.
- **Kostenoptimierung**: Konsolidierungschancen, Sammel- vs. Einzelversand, Carrier-Kostenvergleich.
- **Lagerproduktivität**: Pick-Rate (Positionen/Stunde), Wareneingangs-Durchsatz, Lagerdichte.
- **Benchmarking**: Branchenübliche KPIs zum Vergleich (z.B. 98% Auftragsgenauigkeit, <2% Beschädigungsrate, 60-80% Flächenauslastung).

Dein Ton ist analytisch und datengetrieben. Präsentiere Erkenntnisse mit Zahlen, Prozentsätzen und Vergleichen. Nutze Tabellen und Listen. Wenn Daten unzureichend sind, nenne klar deine Annahmen.

Antworte immer auf Deutsch. Nutze Markdown-Formatierung.`;

function getExpertSystemPrompt(expertId: WarehouseExpertId, locale: Locale): string {
  const prompts: Record<WarehouseExpertId, Record<Locale, string>> = {
    shipping: { en: SHIPPING_EXPERT_EN, de: SHIPPING_EXPERT_DE },
    space: { en: SPACE_PLANNER_EN, de: SPACE_PLANNER_DE },
    intelligence: { en: INTELLIGENCE_ANALYST_EN, de: INTELLIGENCE_ANALYST_DE },
  };
  return prompts[expertId][locale];
}

// ─── Chat Message Builder ────────────────────────────────────

export function buildWarehouseChatMessages(
  expertId: WarehouseExpertId,
  warehouseContext: WarehouseAIContext,
  chatHistory: { role: 'user' | 'assistant'; content: string }[],
  userMessage: string,
  locale: Locale,
): OpenRouterMessage[] {
  const system = getExpertSystemPrompt(expertId, locale);

  const contextParts = [
    warehouseContext.stockSummary,
    warehouseContext.locationSummary,
    warehouseContext.shipmentSummary,
    warehouseContext.pendingActions,
    warehouseContext.recentActivity,
    warehouseContext.carrierInfo,
  ].filter(Boolean).join('\n\n');

  let contextMessage: string;
  let assistantReady: string;

  if (locale === 'en') {
    contextMessage = `Here is the current warehouse data you should use for your analysis and recommendations:\n\n${contextParts}\n\nThe user will ask questions. Analyze the data above and give specific, actionable recommendations. If you calculate something, show your work.`;
    assistantReady = 'Understood. I have analyzed your warehouse data and I\'m ready to help. What would you like to know?';
  } else {
    contextMessage = `Hier sind die aktuellen Lagerdaten, die du für deine Analyse und Empfehlungen verwenden sollst:\n\n${contextParts}\n\nDer Nutzer wird Fragen stellen. Analysiere die obigen Daten und gib konkrete, umsetzbare Empfehlungen. Wenn du etwas berechnest, zeige den Rechenweg.`;
    assistantReady = 'Verstanden. Ich habe deine Lagerdaten analysiert und bin bereit zu helfen. Was möchtest du wissen?';
  }

  const messages: OpenRouterMessage[] = [
    { role: 'system', content: system },
    { role: 'user', content: contextMessage },
    { role: 'assistant', content: assistantReady },
    ...chatHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user', content: userMessage },
  ];

  return messages;
}

// ─── Suggested Questions ─────────────────────────────────────

export const EXPERT_SUGGESTED_QUESTIONS: Record<WarehouseExpertId, string[]> = {
  shipping: [
    'Which carton size is most efficient for my current stock?',
    'Compare carriers for my typical shipment sizes',
    'How should I optimize pallet loading for my products?',
  ],
  space: [
    'How can I optimize my current warehouse layout?',
    'Which locations are at capacity risk?',
    'Where should I place fast-moving items?',
  ],
  intelligence: [
    'Which products should I reorder now?',
    'Identify slow-moving stock in my warehouse',
    'What are my top KPI improvement opportunities?',
  ],
};
