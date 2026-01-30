import type { OpenRouterMessage, ProductContext, RequirementSummary } from './types';

type Locale = 'en' | 'de';

const SYSTEM_PROMPT_DE = `Du bist ein EU-Compliance-Experte für Produktkonformität und digitale Produktpässe (DPP).

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

const SYSTEM_PROMPT_EN = `You are an EU compliance expert for product conformity and Digital Product Passports (DPP).

Your expertise covers:

**EU Regulations:**
- EU ESPR 2024/1781 (Ecodesign for Sustainable Products Regulation) — DPP obligation, delegated acts
- Battery Regulation 2023/1542 — Digital Battery Passport from 18.02.2027, carbon footprint, due diligence
- PPWR 2024/3249 (Packaging and Packaging Waste Regulation) — recycled content, labeling, EPR
- GPSR 2023/988 (General Product Safety Regulation) — from 13.12.2024, replaces RAPD 2001/95/EC

**CE Directives:**
- LVD 2014/35/EU — Low voltage (50-1000V AC, 75-1500V DC), EN 62368-1, EN 60335-x
- EMC 2014/30/EU — Emissions (EN 55032), Immunity (EN 55035)
- RED 2014/53/EU — Radio equipment, Art. 3.3 d/e/f Cybersecurity from 01.08.2025
- RoHS 2011/65/EU — 10 restricted substances, exemptions Annex III/IV
- Machinery Regulation 2023/1230 — replaces MRL 2006/42/EC from 20.01.2027
- Toy Regulation 2025 (draft) — replaces 2009/48/EC, digital product passport

**REACH:** Regulation 1907/2006 — SVHC candidate list (>230 substances, biannual updates), SCIP database, Art. 33 information obligation >0.1% w/w

**National Laws:**
- DE: ElektroG (WEEE implementation, stiftung ear), BattG, VerpackG (LUCID), ProdSG, BSIG
- FR: AGEC Law (anti-waste law), Repairability Index, Triman symbol, Info-tri, EPR systems (ecosystem, CITEO)
- AT: AWG, ElektroaltgeräteVO, VerpackVO
- Other EU MS: Country-specific EPR systems and labeling requirements

**DPP Specifics:**
- Data carrier: QR code per ISO/IEC 18004
- Unique identifier per GS1 Digital Link Standard
- Delegated acts: timelines, product group prioritization
- CIRPASS pilot projects and technical specifications

**Standards and Testing:**
- EN 62368-1 (IT/AV safety), EN 60335-x (household appliances), EN 71-x (toys)
- EN 55032/55035 (EMC), ETSI EN 303 645 (IoT Cybersecurity)
- ISO 14040/14044 (LCA), ISO 14067 (carbon footprint)

Always respond in English. Be precise and cite specific articles, deadlines, EN standards, and authorities. Format with Markdown.`;

function getSystemPrompt(locale: Locale): string {
  return locale === 'de' ? SYSTEM_PROMPT_DE : SYSTEM_PROMPT_EN;
}

function buildProductContextString(ctx: ProductContext, locale: Locale = 'de'): string {
  if (locale === 'en') {
    const parts: string[] = [
      `**Product:** ${ctx.productName || 'Unnamed'}`,
      `**Category:** ${ctx.category} — ${ctx.subcategory}`,
      `**Target Markets:** ${ctx.countries.join(', ')}`,
      `**Target Audience:** ${ctx.targetAudience === 'b2c' ? 'Consumer (B2C)' : ctx.targetAudience === 'b2b' ? 'Business (B2B)' : 'B2C + B2B'}`,
    ];

    const features: string[] = [];
    if (ctx.hasElectronics) features.push('Electronics');
    if (ctx.hasBattery) features.push(`Battery (${ctx.batteryType === 'integrated' ? 'built-in' : ctx.batteryType === 'removable' ? 'removable' : 'external'})`);
    if (ctx.hasWireless) features.push(`Wireless (${ctx.wirelessTypes.join(', ')})`);
    if (ctx.hasPackaging) features.push('Packaged');
    if (ctx.containsChemicals) features.push('Chemicals');
    if (ctx.isConnected) features.push('Connected/IoT');
    if (ctx.voltage !== 'none') features.push(`Voltage: ${ctx.voltage === 'high' ? 'Mains voltage' : 'Low voltage'}`);

    if (features.length > 0) {
      parts.push(`**Properties:** ${features.join(', ')}`);
    }

    if (ctx.packagingMaterials.length > 0) {
      parts.push(`**Packaging Materials:** ${ctx.packagingMaterials.join(', ')}`);
    }

    return parts.join('\n');
  }

  // German (original)
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
  requirement: RequirementSummary,
  locale: Locale = 'de'
): OpenRouterMessage[] {
  const system = getSystemPrompt(locale);
  const context = buildProductContextString(ctx, locale);

  if (locale === 'en') {
    return [
      { role: 'system', content: system },
      {
        role: 'user',
        content: `Analyze the following requirement in detail for this product:

${context}

**Requirement to analyze:**
${requirement.name} (${requirement.priority}) — ${requirement.description}

Provide an in-depth analysis covering:

1. **Relevant EN Standards** — Which specific standards must be applied?
2. **Required Tests** — Which tests must be performed? By whom?
3. **Notified Bodies** — Is a Notified Body required?
4. **Estimated Costs** — Realistic cost ranges for testing and certifications
5. **Typical Duration** — How long does the conformity process take?
6. **Common Mistakes** — What do manufacturers often get wrong?
7. **Concrete Next Steps** — What should the manufacturer do now?`
      }
    ];
  }

  return [
    { role: 'system', content: system },
    {
      role: 'user',
      content: `Analysiere folgende Anforderung im Detail für dieses Produkt:

${context}

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
  requirements: RequirementSummary[],
  locale: Locale = 'de'
): OpenRouterMessage[] {
  const system = getSystemPrompt(locale);
  const context = buildProductContextString(ctx, locale);
  const reqStr = buildRequirementsString(requirements);

  if (locale === 'en') {
    return [
      { role: 'system', content: system },
      {
        role: 'user',
        content: `Create an overall compliance readiness assessment for this product:

${context}

**Identified Requirements (${requirements.length}):**
${reqStr}

Create the following analysis:

1. **Compliance Readiness Score** — Rate the complexity of requirements (1-10, where 10 = very complex)
2. **Executive Summary** — Brief summary (3-4 sentences) of the compliance situation
3. **Top 3 Risk Areas** — The most critical compliance risks with reasoning
4. **Strengths** — What is good/easier about this product configuration?
5. **Estimated Total Effort** — Realistic estimate for initial conformity
6. **Recommendation** — Should the manufacturer engage external consultants? In which areas?`
      }
    ];
  }

  return [
    { role: 'system', content: system },
    {
      role: 'user',
      content: `Erstelle eine Gesamtbewertung der Compliance-Readiness für dieses Produkt:

${context}

**Ermittelte Anforderungen (${requirements.length}):**
${reqStr}

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
  requirements: RequirementSummary[],
  locale: Locale = 'de'
): OpenRouterMessage[] {
  const system = getSystemPrompt(locale);
  const context = buildProductContextString(ctx, locale);
  const reqStr = buildRequirementsString(requirements);

  if (locale === 'en') {
    return [
      { role: 'system', content: system },
      {
        role: 'user',
        content: `Create a prioritized action plan for this product's conformity:

${context}

**Identified Requirements (${requirements.length}):**
${reqStr}

Create a chronological step-by-step action plan:

For each step:
- **Priority** (1=immediate, 2=short-term, 3=mid-term)
- **Task** — What exactly needs to be done?
- **Dependencies** — What must be completed first?
- **Responsible** — Internal or external (test lab, consultant, authority)?
- **Estimated Effort** — Time and approximate costs
- **Deadline** — Regulatory deadline if applicable

Order the steps in the recommended sequence. Consider parallelization opportunities.`
      }
    ];
  }

  return [
    { role: 'system', content: system },
    {
      role: 'user',
      content: `Erstelle einen priorisierten Handlungsplan für die Konformität dieses Produkts:

${context}

**Ermittelte Anforderungen (${requirements.length}):**
${reqStr}

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
  requirements: RequirementSummary[],
  locale: Locale = 'de'
): OpenRouterMessage[] {
  const system = getSystemPrompt(locale);
  const context = buildProductContextString(ctx, locale);
  const reqStr = buildRequirementsString(requirements);

  if (locale === 'en') {
    return [
      { role: 'system', content: system },
      {
        role: 'user',
        content: `Identify additional requirements beyond those already recognized:

${context}

**Already recognized requirements:**
${reqStr}

Search for:

1. **Industry-specific standards** — Are there specific product standards for "${ctx.subcategory}"?
2. **Country-specific requirements** — Additional requirements in ${ctx.countries.join(', ')} beyond standard EU requirements?
3. **Voluntary certifications** — Which certifications (GS, TÜV, Blue Angel, EU Ecolabel, etc.) would be beneficial?
4. **Upcoming regulations** — Which new regulations will take effect in the next 1-2 years?
5. **Market requirements** — What do major trading platforms (Amazon, etc.) require?

For each additional requirement:
- Name and legal basis
- Why relevant for this product
- Priority (critical/high/medium/recommended)
- Action needed`
      }
    ];
  }

  return [
    { role: 'system', content: system },
    {
      role: 'user',
      content: `Identifiziere zusätzliche Anforderungen, die über die bereits erkannten hinausgehen:

${context}

**Bereits erkannte Anforderungen:**
${reqStr}

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
  userMessage: string,
  locale: Locale = 'de'
): OpenRouterMessage[] {
  const system = getSystemPrompt(locale);
  const context = buildProductContextString(ctx, locale);
  const reqStr = buildRequirementsString(requirements);

  let contextMessage: string;
  let assistantReady: string;

  if (locale === 'en') {
    contextMessage = `You are advising on the following product:

${context}

**Identified Requirements (${requirements.length}):**
${reqStr}

The user may ask follow-up questions. Respond precisely and helpfully. If you are unsure about an answer, say so openly.`;
    assistantReady = 'Understood. I am ready to answer questions about this product\'s compliance. What would you like to know?';
  } else {
    contextMessage = `Du berätst zu folgendem Produkt:

${context}

**Ermittelte Anforderungen (${requirements.length}):**
${reqStr}

Der Nutzer kann Folgefragen stellen. Antworte präzise und hilfreich. Wenn du dir bei einer Antwort nicht sicher bist, sage das offen.`;
    assistantReady = 'Verstanden. Ich stehe für Fragen zur Compliance dieses Produkts bereit. Was möchten Sie wissen?';
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
