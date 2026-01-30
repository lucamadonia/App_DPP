import type { OpenRouterMessage, ProductContext, RequirementSummary } from './types';

const SYSTEM_PROMPT = `Du bist ein EU-Compliance-Experte für Produktkonformität und digitale Produktpässe (DPP).

Dein Fachwissen umfasst:

**EU-Verordnungen:**
- EU ESPR 2024/1781 (Ecodesign for Sustainable Products Regulation) — DPP-Pflicht, delegierte Rechtsakte
- Batterienverordnung 2023/1542 — Digitaler Batteriepass ab 18.02.2027, CO2-Fußabdruck, Sorgfaltspflichten
- PPWR 2024/3249 (Packaging and Packaging Waste Regulation) — Rezyklatanteile, Kennzeichnung, EPR
- GPSR 2023/988 (General Product Safety Regulation) — ab 13.12.2024, ersetzt RAPD 2001/95/EG

**CE-Richtlinien:**
- LVD 2014/35/EU — Niederspannung (50-1000V AC, 75-1500V DC), EN 62368-1, EN 60335-x
- EMV 2014/30/EU — Störaussendung (EN 55032), Störfestigkeit (EN 55035)
- RED 2014/53/EU — Funkanlagen, Art. 3.3 d/e/f Cybersecurity ab 01.08.2025
- RoHS 2011/65/EU — 10 beschränkte Stoffe, Ausnahmen Anhang III/IV
- Maschinenverordnung 2023/1230 — ersetzt MRL 2006/42/EG ab 20.01.2027
- Spielzeugverordnung 2025 (Entwurf) — ersetzt 2009/48/EG, digitaler Produktpass

**REACH:** Verordnung 1907/2006 — SVHC-Kandidatenliste (>230 Stoffe, halbjährliche Updates), SCIP-Datenbank, Art. 33 Informationspflicht >0,1% w/w

**Nationale Gesetze:**
- DE: ElektroG (WEEE-Umsetzung, stiftung ear), BattG, VerpackG (LUCID), ProdSG, BSIG
- FR: AGEC-Gesetz (Loi anti-gaspillage), Reparierbarkeitsindex (indice de réparabilité), Triman-Symbol, Info-tri, REP-Systeme (ecosystem, CITEO)
- AT: AWG, ElektroaltgeräteVO, VerpackVO
- Weitere EU-MS: Länderspezifische EPR-Systeme und Kennzeichnungspflichten

**DPP-Spezifika:**
- Datenträger: QR-Code nach ISO/IEC 18004
- Unique Identifier gemäß GS1 Digital Link Standard
- Delegierte Rechtsakte: Zeitpläne, Produktgruppen-Priorisierung
- CIRPASS-Pilotprojekte und technische Spezifikationen

**Normen und Prüfungen:**
- EN 62368-1 (IT/AV-Sicherheit), EN 60335-x (Hausgeräte), EN 71-x (Spielzeug)
- EN 55032/55035 (EMV), ETSI EN 303 645 (IoT Cybersecurity)
- ISO 14040/14044 (LCA), ISO 14067 (CO2-Fußabdruck)

Antworte immer auf Deutsch. Sei präzise und nenne konkrete Paragraphen, Fristen, EN-Normen und Behörden. Formatiere mit Markdown.`;

function buildProductContextString(ctx: ProductContext): string {
  const parts: string[] = [
    `**Produkt:** ${ctx.productName || 'Nicht benannt'}`,
    `**Kategorie:** ${ctx.category} — ${ctx.subcategory}`,
    `**Zielmärkte:** ${ctx.countries.join(', ')}`,
    `**Zielgruppe:** ${ctx.targetAudience === 'b2c' ? 'Endverbraucher (B2C)' : ctx.targetAudience === 'b2b' ? 'Gewerblich (B2B)' : 'B2C + B2B'}`,
  ];

  const features: string[] = [];
  if (ctx.hasElectronics) features.push('Elektronik');
  if (ctx.hasBattery) features.push(`Batterie (${ctx.batteryType === 'integrated' ? 'fest eingebaut' : ctx.batteryType === 'removable' ? 'wechselbar' : 'extern'})`);
  if (ctx.hasWireless) features.push(`Funk (${ctx.wirelessTypes.join(', ')})`);
  if (ctx.hasPackaging) features.push('Verpackt');
  if (ctx.containsChemicals) features.push('Chemikalien');
  if (ctx.isConnected) features.push('Vernetzt/IoT');
  if (ctx.voltage !== 'none') features.push(`Spannung: ${ctx.voltage === 'high' ? 'Netzspannung' : 'Niederspannung'}`);

  if (features.length > 0) {
    parts.push(`**Eigenschaften:** ${features.join(', ')}`);
  }

  if (ctx.packagingMaterials.length > 0) {
    parts.push(`**Verpackungsmaterialien:** ${ctx.packagingMaterials.join(', ')}`);
  }

  return parts.join('\n');
}

function buildRequirementsString(requirements: RequirementSummary[]): string {
  return requirements.map(r =>
    `- [${r.priority.toUpperCase()}] ${r.name}: ${r.description}`
  ).join('\n');
}

export function buildDeepAnalysisMessages(
  ctx: ProductContext,
  requirement: RequirementSummary
): OpenRouterMessage[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Analysiere folgende Anforderung im Detail für dieses Produkt:

${buildProductContextString(ctx)}

**Zu analysierende Anforderung:**
${requirement.name} (${requirement.priority}) — ${requirement.description}

Gib eine tiefgehende Analyse mit folgenden Punkten:

1. **Relevante EN-Normen** — Welche konkreten Normen müssen angewendet werden?
2. **Erforderliche Prüfungen** — Welche Tests sind durchzuführen? Durch wen?
3. **Benannte Stellen** — Ist eine benannte Stelle (Notified Body) erforderlich?
4. **Geschätzte Kosten** — Realistische Kostenspannen für Prüfungen und Zertifizierungen
5. **Typische Zeitdauer** — Wie lange dauert der Konformitätsprozess?
6. **Häufige Fehler** — Was machen Hersteller oft falsch?
7. **Konkrete nächste Schritte** — Was sollte der Hersteller jetzt tun?`
    }
  ];
}

export function buildOverallAssessmentMessages(
  ctx: ProductContext,
  requirements: RequirementSummary[]
): OpenRouterMessage[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Erstelle eine Gesamtbewertung der Compliance-Readiness für dieses Produkt:

${buildProductContextString(ctx)}

**Ermittelte Anforderungen (${requirements.length}):**
${buildRequirementsString(requirements)}

Erstelle folgende Analyse:

1. **Compliance-Readiness-Score** — Bewerte die Komplexität der Anforderungen (1-10, wobei 10 = sehr komplex)
2. **Executive Summary** — Kurze Zusammenfassung (3-4 Sätze) der Compliance-Situation
3. **Top-3 Risikobereiche** — Die kritischsten Compliance-Risiken mit Begründung
4. **Stärken** — Was ist an dieser Produktkonfiguration gut/einfacher?
5. **Geschätzter Gesamtaufwand** — Realistische Einschätzung für Erstkonformität
6. **Empfehlung** — Sollte der Hersteller externe Beratung hinzuziehen? In welchen Bereichen?`
    }
  ];
}

export function buildActionPlanMessages(
  ctx: ProductContext,
  requirements: RequirementSummary[]
): OpenRouterMessage[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Erstelle einen priorisierten Handlungsplan für die Konformität dieses Produkts:

${buildProductContextString(ctx)}

**Ermittelte Anforderungen (${requirements.length}):**
${buildRequirementsString(requirements)}

Erstelle einen chronologischen Step-by-Step Handlungsplan:

Für jeden Schritt:
- **Priorität** (1=sofort, 2=kurzfristig, 3=mittelfristig)
- **Aufgabe** — Was genau ist zu tun?
- **Abhängigkeiten** — Was muss vorher erledigt sein?
- **Verantwortlich** — Intern oder extern (Prüflabor, Berater, Behörde)?
- **Geschätzter Aufwand** — Zeit und ungefähre Kosten
- **Frist** — Regulatorische Deadline falls vorhanden

Ordne die Schritte in der empfohlenen Reihenfolge. Berücksichtige Parallelisierungsmöglichkeiten.`
    }
  ];
}

export function buildAdditionalRequirementsMessages(
  ctx: ProductContext,
  requirements: RequirementSummary[]
): OpenRouterMessage[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Identifiziere zusätzliche Anforderungen, die über die bereits erkannten hinausgehen:

${buildProductContextString(ctx)}

**Bereits erkannte Anforderungen:**
${buildRequirementsString(requirements)}

Suche nach:

1. **Branchenspezifische Normen** — Gibt es für "${ctx.subcategory}" spezifische Produktnormen oder -standards?
2. **Länderspezifische Besonderheiten** — Zusätzliche Anforderungen in ${ctx.countries.join(', ')}, die über die Standard-EU-Anforderungen hinausgehen?
3. **Freiwillige Zertifizierungen** — Welche Zertifizierungen (GS, TÜV, Blauer Engel, EU Ecolabel etc.) wären sinnvoll?
4. **Kommende Regelungen** — Welche neuen Vorschriften treten in den nächsten 1-2 Jahren in Kraft?
5. **Marktanforderungen** — Was verlangen große Handelsplattformen (Amazon, Otto, etc.)?

Für jede zusätzliche Anforderung:
- Name und Rechtsgrundlage
- Warum relevant für dieses Produkt
- Priorität (kritisch/hoch/mittel/empfohlen)
- Handlungsbedarf`
    }
  ];
}

export function buildChatMessages(
  ctx: ProductContext,
  requirements: RequirementSummary[],
  chatHistory: { role: 'user' | 'assistant'; content: string }[],
  userMessage: string
): OpenRouterMessage[] {
  const contextMessage = `Du berätst zu folgendem Produkt:

${buildProductContextString(ctx)}

**Ermittelte Anforderungen (${requirements.length}):**
${buildRequirementsString(requirements)}

Der Nutzer kann Folgefragen stellen. Antworte präzise und hilfreich. Wenn du dir bei einer Antwort nicht sicher bist, sage das offen.`;

  const messages: OpenRouterMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: contextMessage },
    { role: 'assistant', content: 'Verstanden. Ich stehe für Fragen zur Compliance dieses Produkts bereit. Was möchten Sie wissen?' },
    ...chatHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user', content: userMessage },
  ];

  return messages;
}
