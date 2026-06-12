/**
 * Market Entry AI Deep-Dive Prompts
 *
 * Builds the message stack for the streaming "Markteintritts-Check" AI
 * analysis. Used for countries WITHOUT curated master data and as the
 * "Deepen with AI" action on top of curated results (1 credit).
 */

import type { OpenRouterMessage } from './types';

type Locale = 'en' | 'de';

export interface MarketEntryFeatures {
  hasElectronics: boolean;
  hasBattery: boolean;
  hasWireless: boolean;
}

const SYSTEM_PROMPT_DE = `Du bist ein Experte für Markteintritt und Produkt-Compliance in der EU und im EWR. Du berätst Hersteller und Händler, die ihre Produkte erstmals in einem bestimmten Land vertreiben wollen.

Dein Fachwissen umfasst:

**EU-weiter Rahmen:**
- GPSR 2023/988 (verantwortliche Person in der EU), ESPR 2024/1781 (DPP), PPWR 2024/3249
- CE-Richtlinien: LVD 2014/35/EU, EMV 2014/30/EU, RED 2014/53/EU (inkl. Art. 3.3 Cybersecurity), RoHS 2011/65/EU
- REACH 1907/2006, Batterieverordnung 2023/1542, WEEE-Richtlinie 2012/19/EU
- Textilkennzeichnung EU 1007/2011, Spielzeugrichtlinie/-verordnung

**Nationale EPR- und Registrierungssysteme:**
- DE: ElektroG (stiftung ear), VerpackG (LUCID/ZSVR), BattG, deutsche Sprachpflicht (§ 6 ProdSG)
- FR: AGEC (Reparierbarkeits-/Haltbarkeitsindex, Triman, Info-tri), REP-Filieren (ADEME/IDU, CITEO, ecosystem, Refashion), Loi Toubon
- IT: Registro AEE/RAEE, CONAI, Registro Pile, Decreto 116/2020, Codice del Consumo
- AT: EAG-VO (EDM/era), VerpackVO (ARA), Bevollmächtigtenpflichten
- ES: RD 110/2015 (RII-AEE), RD 1055/2022 (Verpackung, Plastiksteuer), TRLGDCU
- NL: Stichting OPEN, Afvalfonds Verpakkingen, Warenwet
- PL: BDO-Register, organizacja odzysku, polnische Sprachpflicht
- Weitere EU/EWR-Staaten: jeweilige EPR-Register, eco-organismes und Sprachvorschriften

**Steuern & Handel:** Umsatzsteuer-Registrierung vs. OSS-Verfahren, Lieferschwellen, Verbrauchsteuern, Plastiksteuern, Marktplatz-Anforderungen (DSA, Reg.-Nummern).

Antworte immer auf Deutsch. Sei präzise: nenne konkrete Gesetze, Behörden, Register, Fristen und realistische Kostenspannen. Wenn du dir bei einer länderspezifischen Detailregel unsicher bist, kennzeichne das ausdrücklich. Formatiere mit Markdown.`;

const SYSTEM_PROMPT_EN = `You are an expert for market entry and product compliance in the EU and EEA. You advise manufacturers and sellers who want to start selling their products in a specific country.

Your expertise covers:

**EU-wide framework:**
- GPSR 2023/988 (responsible person in the EU), ESPR 2024/1781 (DPP), PPWR 2024/3249
- CE directives: LVD 2014/35/EU, EMC 2014/30/EU, RED 2014/53/EU (incl. Art. 3.3 cybersecurity), RoHS 2011/65/EU
- REACH 1907/2006, Battery Regulation 2023/1542, WEEE Directive 2012/19/EU
- Textile labeling EU 1007/2011, Toy Safety Directive/Regulation

**National EPR and registration systems:**
- DE: ElektroG (stiftung ear), VerpackG (LUCID/ZSVR), BattG, German language requirement (§ 6 ProdSG)
- FR: AGEC (repairability/durability index, Triman, Info-tri), EPR schemes (ADEME/IDU, CITEO, ecosystem, Refashion), Loi Toubon
- IT: Registro AEE/RAEE, CONAI, Registro Pile, Decreto 116/2020, Codice del Consumo
- AT: EAG-VO (EDM/era), VerpackVO (ARA), authorised representative duties
- ES: RD 110/2015 (RII-AEE), RD 1055/2022 (packaging, plastic tax), TRLGDCU
- NL: Stichting OPEN, Afvalfonds Verpakkingen, Warenwet
- PL: BDO register, organizacja odzysku, Polish language requirement
- Other EU/EEA states: respective EPR registers, eco-organisations, and language rules

**Tax & trade:** VAT registration vs. OSS scheme, distance selling thresholds, excise and plastic taxes, marketplace requirements (DSA, registration numbers).

Always respond in English. Be precise: cite specific laws, authorities, registers, deadlines, and realistic cost ranges. If you are unsure about a country-specific detail, say so explicitly. Format with Markdown.`;

function describeFeatures(features: MarketEntryFeatures, locale: Locale): string {
  const parts: string[] = [];
  if (locale === 'de') {
    if (features.hasElectronics) parts.push('Elektronik');
    if (features.hasBattery) parts.push('Batterie/Akku');
    if (features.hasWireless) parts.push('Funk/Wireless');
    return parts.length > 0 ? parts.join(', ') : 'keine besonderen Merkmale angegeben';
  }
  if (features.hasElectronics) parts.push('electronics');
  if (features.hasBattery) parts.push('battery/rechargeable battery');
  if (features.hasWireless) parts.push('wireless/radio');
  return parts.length > 0 ? parts.join(', ') : 'no special features specified';
}

/**
 * Build the streaming prompt for a country-specific market entry deep-dive.
 *
 * @param countryName Display name of the target country (e.g. "Italien")
 * @param productName Product name or short description (may be empty)
 * @param category    Product category id (electronics, textiles, ...)
 * @param features    Battery / wireless / electronics toggles
 * @param locale      UI locale for the response language
 */
export function buildMarketEntryMessages(
  countryName: string,
  productName: string,
  category: string,
  features: MarketEntryFeatures,
  locale: Locale = 'de'
): OpenRouterMessage[] {
  const featureStr = describeFeatures(features, locale);
  const product = productName.trim();

  if (locale === 'en') {
    return [
      { role: 'system', content: SYSTEM_PROMPT_EN },
      {
        role: 'user',
        content: `I want to start selling the following product in **${countryName}**:

**Product:** ${product || 'not named'}
**Category:** ${category}
**Features:** ${featureStr}

Create a structured market entry analysis with exactly these sections:

## 1. Registrations & EPR
Which national registers (WEEE, battery, packaging, EPR schemes) are mandatory? Name the register, authority, and whether an authorised representative is required for foreign sellers.

## 2. Labeling & Marking
Mandatory product and packaging markings (CE, disposal symbols, sorting labels, indexes) specific to this country.

## 3. Language Requirements
Which documents and labels must be in the local language?

## 4. Packaging & Disposal
EPR packaging duties, eco-fees, take-back obligations.

## 5. Standards & Conformity
Applicable directives/standards and required conformity documentation for this product type.

## 6. Taxes & Marketplace
VAT/OSS considerations, plastic or eco taxes, marketplace verification requirements.

## 7. Step-by-Step Entry Plan
A numbered, chronological plan (max. 8 steps) with realistic durations.

## 8. Estimated Costs
A compact cost table (registrations, representatives, eco-fees, translations, testing).

Be specific to ${countryName}. Mark anything you are unsure about.`,
      },
    ];
  }

  return [
    { role: 'system', content: SYSTEM_PROMPT_DE },
    {
      role: 'user',
      content: `Ich möchte folgendes Produkt in **${countryName}** vertreiben:

**Produkt:** ${product || 'nicht benannt'}
**Kategorie:** ${category}
**Merkmale:** ${featureStr}

Erstelle eine strukturierte Markteintritts-Analyse mit genau diesen Abschnitten:

## 1. Registrierungen & EPR
Welche nationalen Register (WEEE, Batterie, Verpackung, EPR-Systeme) sind Pflicht? Nenne Register, Behörde und ob ausländische Anbieter einen Bevollmächtigten brauchen.

## 2. Kennzeichnung
Verpflichtende Produkt- und Verpackungskennzeichnungen (CE, Entsorgungssymbole, Sortierhinweise, Indizes) speziell für dieses Land.

## 3. Sprachanforderungen
Welche Dokumente und Etiketten müssen in der Landessprache vorliegen?

## 4. Verpackung & Entsorgung
EPR-Verpackungspflichten, Öko-Beiträge, Rücknahmepflichten.

## 5. Normen & Konformität
Anwendbare Richtlinien/Normen und erforderliche Konformitätsdokumentation für diesen Produkttyp.

## 6. Steuern & Marktplätze
Umsatzsteuer/OSS, Plastik- oder Umweltsteuern, Verifizierungspflichten auf Marktplätzen.

## 7. Schritt-für-Schritt-Plan
Ein nummerierter, chronologischer Plan (max. 8 Schritte) mit realistischen Zeitangaben.

## 8. Geschätzte Kosten
Eine kompakte Kostenübersicht (Registrierungen, Bevollmächtigte, Öko-Beiträge, Übersetzungen, Prüfungen).

Sei spezifisch für ${countryName}. Kennzeichne alles, wobei du dir unsicher bist.`,
    },
  ];
}
