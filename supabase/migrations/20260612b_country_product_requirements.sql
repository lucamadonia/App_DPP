-- =====================================================================
-- Market Entry Check: country_product_requirements
-- =====================================================================
-- Master data table (global, no RLS — same pattern as countries /
-- eu_regulations) holding curated, per-country market entry requirements
-- for the "Markteintritts-Check" feature.
--
-- Each row answers: "What does a manufacturer/seller need to do to place
-- products of category X on the market in country Y?"
--
-- product_category 'general' = applies to ALL categories of that country
-- and is always merged into the result by the service layer.
--
-- Entry texts are German (target audience of the curated data set;
-- the surrounding UI is fully i18n EN/DE).
-- =====================================================================

CREATE TABLE IF NOT EXISTS country_product_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code TEXT NOT NULL,
    product_category TEXT NOT NULL CHECK (product_category IN (
        'electronics', 'textiles', 'toys', 'furniture', 'cosmetics', 'general'
    )),
    requirement_type TEXT NOT NULL CHECK (requirement_type IN (
        'registration', 'labeling', 'language', 'packaging', 'disposal', 'standards', 'tax'
    )),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    mandatory BOOLEAN DEFAULT TRUE,
    applicable_regulations TEXT[] DEFAULT '{}',
    authority TEXT,
    deadline_note TEXT,
    penalties_summary TEXT,
    implementation_steps TEXT[] DEFAULT '{}',
    cost_estimate TEXT,
    links JSONB DEFAULT '[]',
    priority TEXT DEFAULT 'high' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotency guard for re-runs (--force) + natural key
CREATE UNIQUE INDEX IF NOT EXISTS uniq_cpr_country_category_title
    ON country_product_requirements(country_code, product_category, title);

CREATE INDEX IF NOT EXISTS idx_cpr_country_category
    ON country_product_requirements(country_code, product_category);

-- =====================================================================
-- SEED — kuratierte Kern-Anforderungen (DE / FR / IT / AT / ES / NL / PL)
-- =====================================================================

INSERT INTO country_product_requirements
    (country_code, product_category, requirement_type, title, description, mandatory,
     applicable_regulations, authority, deadline_note, penalties_summary,
     implementation_steps, cost_estimate, links, priority)
VALUES

-- =====================================================================
-- DEUTSCHLAND (DE)
-- =====================================================================

-- DE / general -------------------------------------------------------
('DE', 'general', 'registration',
 'GPSR: Verantwortliche Person in der EU',
 'Nach der EU-Produktsicherheitsverordnung (GPSR) darf ein Produkt nur in Verkehr gebracht werden, wenn ein in der EU niedergelassener Wirtschaftsakteur (Hersteller, Importeur, Bevollmächtigter oder Fulfillment-Dienstleister) als verantwortliche Person benannt ist. Name und Kontaktdaten müssen auf dem Produkt oder der Verpackung angegeben werden.',
 TRUE,
 ARRAY['GPSR 2023/988'],
 'Marktüberwachungsbehörden der Bundesländer',
 'Gilt seit 13.12.2024 für alle Verbraucherprodukte',
 'Vertriebsverbot, Rückrufanordnungen, Bußgelder nach ProdSG bis 100.000 €',
 ARRAY[
   'Prüfen, ob bereits eine EU-Niederlassung als verantwortliche Person fungieren kann',
   'Andernfalls EU-Bevollmächtigten (Authorised Representative) vertraglich bestellen',
   'Name + Postanschrift + elektronische Adresse auf Produkt/Verpackung/Begleitunterlage anbringen',
   'Interne Prozesse für Unfallmeldungen über das Safety-Business-Gateway einrichten'
 ],
 'Intern kostenlos; externer EU-Bevollmächtigter ca. 500–2.000 €/Jahr',
 '[{"label": "GPSR im EUR-Lex", "url": "https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX%3A32023R0988"}]'::jsonb,
 'critical'),

('DE', 'general', 'packaging',
 'VerpackG: LUCID-Registrierung + Systembeteiligung',
 'Jeder, der verpackte Ware in Deutschland erstmals gewerblich in Verkehr bringt (auch ausländische Versandhändler), muss sich VOR Vertriebsbeginn im Verpackungsregister LUCID registrieren und systembeteiligungspflichtige Verpackungen bei einem dualen System lizenzieren. Ohne Registrierung gilt ein faktisches Vertriebsverbot.',
 TRUE,
 ARRAY['VerpackG', 'PPWR 2024/3249'],
 'Zentrale Stelle Verpackungsregister (ZSVR)',
 'Registrierung VOR dem ersten Inverkehrbringen',
 'Bußgelder bis 200.000 €, Vertriebsverbot, Abmahnrisiko durch Wettbewerber',
 ARRAY[
   'Registrierung im LUCID-Portal der ZSVR (kostenlos)',
   'Duales System wählen und Verpackungsmengen lizenzieren (z. B. Der Grüne Punkt, Interseroh+)',
   'Registrierungsnummer im Marktplatz-Account hinterlegen (Amazon/eBay prüfen aktiv)',
   'Jährliche Mengenmeldung an System UND ZSVR abgeben',
   'Ab 80 t Glas / 50 t PPK / 30 t sonstige: Vollständigkeitserklärung mit Prüfer'
 ],
 'LUCID kostenlos; Systembeteiligung mengenabhängig ab ca. 50–500 €/Jahr für Kleinmengen',
 '[{"label": "LUCID Verpackungsregister", "url": "https://lucid.verpackungsregister.org"}, {"label": "ZSVR", "url": "https://www.verpackungsregister.org"}]'::jsonb,
 'critical'),

('DE', 'general', 'language',
 'Deutsche Sprachpflicht für Anleitungen und Sicherheitshinweise',
 'Gebrauchsanleitungen, Sicherheits- und Warnhinweise müssen in deutscher Sprache beiliegen (§ 6 ProdSG, Art. 9 GPSR). Reine englischsprachige Dokumentation ist bei Verbraucherprodukten unzulässig und ein häufiger Beanstandungsgrund der Marktüberwachung.',
 TRUE,
 ARRAY['ProdSG § 6', 'GPSR 2023/988 Art. 9'],
 'Marktüberwachungsbehörden der Bundesländer',
 NULL,
 'Vertriebsuntersagung, Bußgelder, Abmahnungen nach UWG',
 ARRAY[
   'Alle sicherheitsrelevanten Texte identifizieren (Anleitung, Warnhinweise, Etiketten)',
   'Fachübersetzung ins Deutsche anfertigen lassen (keine reine Maschinenübersetzung für Warnhinweise)',
   'Deutsche Fassung in Lieferumfang bzw. auf Verpackung integrieren',
   'Digitale Anleitung nur ergänzend — sicherheitsrelevante Hinweise müssen physisch beiliegen'
 ],
 'Übersetzung ca. 0,10–0,20 €/Wort; typisch 200–800 € pro Anleitung',
 '[{"label": "ProdSG", "url": "https://www.gesetze-im-internet.de/prodsg_2021/"}]'::jsonb,
 'critical'),

-- DE / electronics ---------------------------------------------------
('DE', 'electronics', 'registration',
 'ElektroG: WEEE-Registrierung bei der stiftung ear',
 'Hersteller und Importeure von Elektro-/Elektronikgeräten müssen sich VOR dem Inverkehrbringen je Marke und Geräteart bei der stiftung ear registrieren und erhalten eine WEEE-Registrierungsnummer (DE-Nummer), die in Angeboten und auf Rechnungen zu führen ist. B2C-Hersteller müssen zusätzlich eine insolvenzsichere Garantie nachweisen. Ausländische Hersteller ohne Niederlassung benötigen einen Bevollmächtigten.',
 TRUE,
 ARRAY['ElektroG', 'WEEE-Richtlinie 2012/19/EU'],
 'stiftung elektro-altgeräte register (stiftung ear)',
 'Registrierung VOR dem ersten Inverkehrbringen; Bearbeitungszeit 8–10 Wochen einplanen',
 'Bußgelder bis 100.000 €, Vertriebsverbot, Gewinnabschöpfung',
 ARRAY[
   'Geräteart(en) nach ear-Systematik bestimmen (6 Kategorien)',
   'Antrag im ear-Portal stellen (je Marke + Geräteart)',
   'Insolvenzsichere Garantie für B2C-Geräte nachweisen (Bürgschaft oder Garantiesystem)',
   'Monatliche/Jährliche Mengenmeldungen an die stiftung ear einrichten',
   'WEEE-Reg.-Nr. DE im Webshop, auf Rechnungen und in Marktplatz-Accounts hinterlegen'
 ],
 'Registrierungsgebühr ca. 35–350 € je Vorgang + jährliche Garantiekosten (ab ca. 100 €)',
 '[{"label": "stiftung ear Portal", "url": "https://www.ear-system.de"}, {"label": "stiftung ear", "url": "https://www.stiftung-ear.de"}]'::jsonb,
 'critical'),

('DE', 'electronics', 'labeling',
 'Kennzeichnung: durchgestrichene Mülltonne + Herstellerkennung',
 'Elektrogeräte müssen dauerhaft mit dem Symbol der durchgestrichenen Mülltonne (EN 50419) gekennzeichnet sein, dazu eine eindeutige Herstellerkennung (Marke) und ein Datums-/Typmerkmal zur Identifikation des Inverkehrbringens. Bei sehr kleinen Geräten darf das Symbol auf Verpackung/Anleitung ausweichen.',
 TRUE,
 ARRAY['ElektroG § 9', 'EN 50419'],
 'stiftung ear / Marktüberwachung',
 NULL,
 'Bußgeld bis 10.000 € je Verstoß, Vertriebsbeschränkungen',
 ARRAY[
   'Symbol nach EN 50419 in Artwork/Gehäusedruck aufnehmen (dauerhaft, sichtbar, leserlich)',
   'Herstellermarke identisch zur ear-Registrierung kennzeichnen',
   'Bei Geräten < 5 Jahre Marktpräsenz: Datumsangabe (z. B. Chargencode) sicherstellen',
   'Druckmuster vor Serienproduktion prüfen und dokumentieren'
 ],
 'Nur Artwork-/Werkzeugkosten, typisch < 500 € einmalig',
 '[{"label": "ElektroG § 9", "url": "https://www.gesetze-im-internet.de/elektrog_2015/__9.html"}]'::jsonb,
 'critical'),

('DE', 'electronics', 'disposal',
 'ElektroG: Vertreiber-Rücknahmepflichten (1:1 / 0:1)',
 'Händler mit mehr als 400 m² Verkaufs- bzw. Versandhändler mit mehr als 400 m² Lager-/Versandfläche für Elektrogeräte müssen Altgeräte zurücknehmen: 1:1 beim Kauf eines gleichwertigen Neugeräts und 0:1 für Kleingeräte bis 25 cm ohne Neukauf. Kunden sind über die Rückgabemöglichkeiten zu informieren.',
 TRUE,
 ARRAY['ElektroG § 17'],
 'Marktüberwachung / Umweltbehörden der Länder',
 NULL,
 'Bußgelder bis 100.000 €',
 ARRAY[
   'Prüfen, ob die Flächenschwellen überschritten werden',
   'Rücknahmeprozess organisieren (Filiale, Versandrückholung oder Kooperationspartner)',
   'Kundeninformation im Shop/Checkout und am POS bereitstellen',
   'Erfassung und ordnungsgemäße Entsorgung der Rückläufer dokumentieren'
 ],
 'Prozesskosten variabel; Rückholung per Paketdienst ca. 5–15 €/Gerät',
 '[{"label": "ElektroG § 17", "url": "https://www.gesetze-im-internet.de/elektrog_2015/__17.html"}]'::jsonb,
 'high'),

('DE', 'electronics', 'registration',
 'BattG: Batterie-Registrierung + Rücknahmesystem',
 'Wer Batterien oder Produkte mit eingebauten Batterien/Akkus in Deutschland erstmals in Verkehr bringt, muss sich im Batterieregister der stiftung ear registrieren (BattG-Melderegister) und sich bei Gerätebatterien einem Rücknahmesystem (z. B. GRS Batterien) anschließen. Die EU-Batterieverordnung 2023/1542 verschärft Kennzeichnungs- und Sorgfaltspflichten schrittweise.',
 TRUE,
 ARRAY['BattG', 'Batterieverordnung 2023/1542'],
 'stiftung ear (BattG-Melderegister)',
 'Registrierung VOR dem ersten Inverkehrbringen',
 'Bußgelder bis 100.000 €, Vertriebsverbot',
 ARRAY[
   'Batterietyp bestimmen (Geräte-, Industrie- oder Fahrzeugbatterie)',
   'Registrierung im ear-Portal je Marke vornehmen',
   'Rücknahmesystem beitreten (z. B. GRS) und Vertrag dokumentieren',
   'Kennzeichnung prüfen: durchgestrichene Tonne + chemische Zeichen (Pb/Cd/Hg)',
   'Jahresmengen melden'
 ],
 'Registrierung gebührenpflichtig (ca. 25–150 €); Rücknahmesystem mengenabhängig',
 '[{"label": "BattG-Melderegister", "url": "https://www.ear-system.de"}, {"label": "GRS Batterien", "url": "https://www.grs-batterien.de"}]'::jsonb,
 'high'),

('DE', 'electronics', 'standards',
 'CE-Kennzeichnung: LVD / EMV / RoHS / RED-Konformität',
 'Elektronikprodukte benötigen vor dem Inverkehrbringen ein vollständiges CE-Konformitätsverfahren: Niederspannungsrichtlinie (50–1000 V AC), EMV-Richtlinie, RoHS-Stoffbeschränkungen und bei Funkprodukten die RED inkl. der Cybersecurity-Anforderungen nach Art. 3.3 (d/e/f). Technische Dokumentation und EU-Konformitätserklärung sind 10 Jahre vorzuhalten. GPSR ergänzt allgemeine Sicherheitsanforderungen.',
 TRUE,
 ARRAY['LVD 2014/35/EU', 'EMV 2014/30/EU', 'RoHS 2011/65/EU', 'RED 2014/53/EU', 'GPSR 2023/988'],
 'Bundesnetzagentur / Marktüberwachung',
 'RED Art. 3.3 d/e/f Cybersecurity verbindlich seit 01.08.2025',
 'Vertriebsverbot, Rückruf, Bußgelder bis 100.000 €',
 ARRAY[
   'Anwendbare Richtlinien und harmonisierte Normen ermitteln (z. B. EN 62368-1, EN 55032/55035)',
   'Prüfungen durchführen lassen (akkreditiertes Labor; bei Funk ggf. Notified Body)',
   'Technische Dokumentation erstellen (Risikoanalyse, Testreports, Schaltpläne)',
   'EU-Konformitätserklärung ausstellen und CE-Zeichen anbringen',
   'Bei Funkprodukten: Cybersecurity-Nachweis nach EN 18031-Serie ergänzen'
 ],
 'Prüfkosten je nach Produkt ca. 3.000–15.000 € (EMV+LVD), Funk/RED zusätzlich 5.000–20.000 €',
 '[{"label": "Blue Guide (EU-Leitfaden)", "url": "https://single-market-economy.ec.europa.eu/single-market/goods/building-blocks/blue-guide_en"}]'::jsonb,
 'critical'),

-- DE / textiles ------------------------------------------------------
('DE', 'textiles', 'labeling',
 'Textilkennzeichnungsverordnung: Faserzusammensetzung auf Deutsch',
 'Textilerzeugnisse müssen nach EU-Verordnung 1007/2011 mit der vollständigen Faserzusammensetzung (z. B. „100 % Baumwolle") dauerhaft etikettiert sein — in deutscher Sprache und nur mit den zugelassenen Faserbezeichnungen aus Anhang I. Phantasie- oder Markennamen für Fasern sind unzulässig. Das Textilkennzeichnungsgesetz (TextilKennzG) regelt die Durchsetzung.',
 TRUE,
 ARRAY['EU 1007/2011', 'TextilKennzG'],
 'Marktüberwachungsbehörden der Bundesländer',
 NULL,
 'Bußgelder bis 10.000 €, Abmahnungen durch Wettbewerber (häufig!)',
 ARRAY[
   'Faserzusammensetzung je Artikel laborbestätigt ermitteln',
   'Zulässige Faserbezeichnungen nach Anhang I der EU 1007/2011 verwenden',
   'Etikett dauerhaft anbringen (eingenäht oder fest verbunden)',
   'Deutsche Sprachfassung sicherstellen — auch im Onlineshop-Listing angeben'
 ],
 'Faseranalyse ca. 50–150 €/Artikel; Etiketten produktionsabhängig',
 '[{"label": "EU 1007/2011", "url": "https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX%3A32011R1007"}]'::jsonb,
 'critical'),

('DE', 'textiles', 'standards',
 'REACH: Azofarbstoffe, SVHC und Chemikalienkonformität',
 'Textilien müssen die REACH-Beschränkungen einhalten: verbotene Azofarbstoffe (Anhang XVII Nr. 43), Grenzwerte für Chrom VI in Leder, seit 2023 verschärfte Grenzwerte für CMR-Stoffe in Bekleidung (Anhang XVII Nr. 72). Bei SVHC-Gehalt über 0,1 % besteht Informationspflicht nach Art. 33 und SCIP-Meldepflicht.',
 TRUE,
 ARRAY['REACH 1907/2006', 'POP-Verordnung 2019/1021'],
 'Bundesanstalt für Arbeitsschutz und Arbeitsmedizin (BAuA) / Länderbehörden',
 NULL,
 'Vertriebsverbot, Rückruf, strafrechtliche Konsequenzen bei Gesundheitsgefahr',
 ARRAY[
   'Lieferantenerklärungen zu REACH-Konformität einholen',
   'Risikobasierte Labortests (Azofarbstoffe, Phthalate, PFAS) bei kritischen Artikeln',
   'SVHC-Screening gegen aktuelle Kandidatenliste (halbjährliche Updates)',
   'Bei SVHC > 0,1 %: SCIP-Meldung und Kundeninformation einrichten'
 ],
 'Labortests ca. 150–500 € je Prüfpaket und Artikel',
 '[{"label": "ECHA Kandidatenliste", "url": "https://echa.europa.eu/de/candidate-list-table"}]'::jsonb,
 'high'),

('DE', 'textiles', 'labeling',
 'Pflegekennzeichnung (GINETEX-Symbole) — freiwillig, aber Marktstandard',
 'Die Pflegesymbole (Waschen, Bleichen, Trocknen, Bügeln, Profireinigung) sind in Deutschland rechtlich nicht verpflichtend, aber De-facto-Marktstandard und von Handelspartnern fast immer gefordert. Die Symbole sind markenrechtlich geschützt — die Nutzung erfordert eine Lizenz von GINETEX/Hohenstein.',
 FALSE,
 ARRAY['ISO 3758'],
 'GINETEX Germany (Hohenstein)',
 NULL,
 'Markenrechtliche Abmahnung bei Nutzung ohne Lizenz',
 ARRAY[
   'Pflegeeigenschaften je Artikel definieren (ggf. Waschtests)',
   'GINETEX-Lizenz über Hohenstein abschließen',
   'Symbole nach ISO 3758 auf eingenähtem Etikett anbringen'
 ],
 'GINETEX-Lizenz ab ca. 250 €/Jahr (umsatzabhängig)',
 '[{"label": "GINETEX Germany", "url": "https://www.ginetex.de"}]'::jsonb,
 'low'),

-- =====================================================================
-- FRANKREICH (FR)
-- =====================================================================

-- FR / general -------------------------------------------------------
('FR', 'general', 'registration',
 'GPSR: Verantwortliche Person in der EU',
 'Auch für den französischen Markt gilt: Ohne in der EU niedergelassenen verantwortlichen Wirtschaftsakteur (Hersteller, Importeur oder Bevollmächtigter) mit Angabe auf dem Produkt darf kein Verbraucherprodukt verkauft werden. Die DGCCRF kontrolliert aktiv, insbesondere im Onlinehandel.',
 TRUE,
 ARRAY['GPSR 2023/988'],
 'DGCCRF (Direction générale de la concurrence, de la consommation et de la répression des fraudes)',
 'Gilt seit 13.12.2024',
 'Verkaufsverbot, Bußgelder, Marktplatz-Delisting',
 ARRAY[
   'EU-Verantwortlichen bestimmen oder Bevollmächtigten bestellen',
   'Kontaktdaten auf Produkt/Verpackung anbringen',
   'Meldeprozesse für Produktsicherheitsvorfälle einrichten'
 ],
 'Intern kostenlos; externer EU-Bevollmächtigter ca. 500–2.000 €/Jahr',
 '[{"label": "DGCCRF", "url": "https://www.economie.gouv.fr/dgccrf"}]'::jsonb,
 'critical'),

('FR', 'general', 'language',
 'Loi Toubon: Französische Sprachpflicht',
 'Das Gesetz 94-665 (Loi Toubon) schreibt vor, dass sämtliche Verbraucherinformationen — Etiketten, Anleitungen, Garantiebedingungen, Werbung und Webshop-Texte für den französischen Markt — auf Französisch verfügbar sein müssen. Fremdsprachige Begriffe müssen übersetzt werden.',
 TRUE,
 ARRAY['Loi n° 94-665 (Loi Toubon)', 'Code de la consommation'],
 'DGCCRF',
 NULL,
 'Bußgelder je Verstoß (750–3.750 € pro Produkt/Dokument, bei Wiederholung mehr)',
 ARRAY[
   'Alle kundenseitigen Texte inventarisieren (Verpackung, Anleitung, Garantie, Shop)',
   'Professionelle Übersetzung ins Französische beauftragen',
   'Französische Etiketten/Beileger in die Produktion integrieren',
   'Webshop-Inhalte für FR-Auslieferung lokalisieren'
 ],
 'Übersetzung ca. 0,10–0,20 €/Wort',
 '[{"label": "Loi Toubon (Légifrance)", "url": "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000349929"}]'::jsonb,
 'critical'),

('FR', 'general', 'packaging',
 'REP Emballages: CITEO-Beitritt + ADEME-Registrierung (IDU)',
 'Wer verpackte Haushaltsware in Frankreich in Verkehr bringt, unterliegt der Erweiterten Herstellerverantwortung (REP) für Verpackungen: Beitritt zu einem eco-organisme (CITEO oder Léko), Registrierung im ADEME-Herstellerregister SYDEREP und Führung der Unique Identifier Number (IDU) in AGB/Impressum. Gilt auch für ausländische Versandhändler.',
 TRUE,
 ARRAY['Code de l''environnement Art. L541-10', 'AGEC 2020-105'],
 'ADEME / CITEO',
 'Registrierung VOR Vertriebsbeginn; IDU jährlich erneuern',
 'Bußgelder bis 30.000 € + Nachzahlung der Beiträge, Marktplatz-Sperrung ohne IDU',
 ARRAY[
   'Vertrag mit eco-organisme abschließen (i. d. R. CITEO)',
   'Über das eco-organisme die IDU-Nummer bei der ADEME erhalten',
   'IDU in Rechtstexten (CGV/Impressum) und Marktplatz-Accounts hinterlegen',
   'Jährliche Verpackungsmengen deklarieren und Eco-Beiträge zahlen'
 ],
 'CITEO-Mindestbeitrag ca. 80–200 €/Jahr für Kleinmengen, sonst mengen-/materialabhängig',
 '[{"label": "CITEO", "url": "https://www.citeo.com"}, {"label": "SYDEREP (ADEME)", "url": "https://syderep.ademe.fr"}]'::jsonb,
 'critical'),

('FR', 'general', 'labeling',
 'Triman + Info-tri: Verpflichtende Sortierkennzeichnung',
 'Alle Haushaltsprodukte und -verpackungen, die einer REP-Filiere unterliegen, müssen das Triman-Logo zusammen mit der Info-tri (konkrete Sortieranweisung) tragen. Die Kennzeichnung muss auf Verpackung oder Produkt aufgebracht sein; nur bei sehr kleinen Verpackungen ist eine digitale Auslagerung zulässig.',
 TRUE,
 ARRAY['AGEC 2020-105 Art. 17', 'Décret 2021-835'],
 'ADEME / DGCCRF',
 NULL,
 'Bußgelder bis 15.000 € je Produktlinie',
 ARRAY[
   'Info-tri-Vorlage vom eco-organisme (CITEO) für die eigenen Materialien generieren',
   'Triman + Info-tri ins Verpackungs-Artwork integrieren (Mindestgrößen beachten)',
   'Übergangsbestände dokumentieren und Abverkaufsfristen prüfen',
   'Bei Mehrmaterial-Verpackungen alle Komponenten in der Info-tri abbilden'
 ],
 'Nur Artwork-Anpassung, typisch 200–500 € je Verpackungslinie',
 '[{"label": "Info-tri (CITEO)", "url": "https://www.citeo.com/le-mag/info-tri"}]'::jsonb,
 'critical'),

-- FR / electronics ---------------------------------------------------
('FR', 'electronics', 'registration',
 'REP DEEE: Registrierung mit IDU-Nummer (ADEME)',
 'Hersteller/Importeure von Elektrogeräten müssen sich in Frankreich der DEEE-Filiere anschließen und über ihr eco-organisme im ADEME-Register SYDEREP registrieren lassen. Die dabei vergebene IDU-Nummer (Identifiant Unique) ist Pflichtangabe gegenüber Marktplätzen und in Rechtstexten. Ohne IDU droht Delisting auf Amazon & Co.',
 TRUE,
 ARRAY['Code de l''environnement', 'WEEE-Richtlinie 2012/19/EU', 'AGEC 2020-105'],
 'ADEME',
 'VOR dem ersten Inverkehrbringen; jährliche Verlängerung',
 'Bußgelder, Nachforderung der Eco-Beiträge, Marktplatz-Sperrung',
 ARRAY[
   'Eco-organisme für DEEE wählen (ecosystem oder Ecologic)',
   'Beitrittsvertrag schließen und Produktkategorien deklarieren',
   'IDU-Nummer über SYDEREP erhalten und dokumentieren',
   'Mengenmeldungen und Eco-participation-Zahlungen einrichten'
 ],
 'Beitritt meist kostenlos, Eco-participation je Gerät (ca. 0,02–20 € je nach Typ)',
 '[{"label": "ecosystem", "url": "https://www.ecosystem.eco"}, {"label": "Ecologic", "url": "https://www.ecologic-france.com"}]'::jsonb,
 'critical'),

('FR', 'electronics', 'disposal',
 'Eco-participation: Sichtbare Entsorgungsgebühr ausweisen',
 'Für Elektrogeräte (und Möbel) muss die Eco-participation — der Entsorgungsbeitrag an das eco-organisme — dem Endkunden gegenüber separat und sichtbar ausgewiesen werden („visible fee"), sowohl im Webshop als auch auf Rechnungen. Die Beitragshöhe richtet sich nach dem Tarifbarem des eco-organisme.',
 TRUE,
 ARRAY['Code de l''environnement Art. L541-10-2'],
 'ecosystem / Ecologic / DGCCRF',
 NULL,
 'Bußgelder, Beanstandungen durch DGCCRF',
 ARRAY[
   'Aktuelles Tarifbarem des eco-organisme je Produktkategorie abrufen',
   'Shopsystem um separates Eco-participation-Feld erweitern',
   'Ausweis auf Produktseite, im Checkout und auf der Rechnung sicherstellen',
   'Tarifupdates (jährlich) in den Preisdaten pflegen'
 ],
 'Nur Implementierungsaufwand im Shopsystem',
 '[{"label": "Tarife ecosystem", "url": "https://www.ecosystem.eco/fr/article/baremes-producteurs"}]'::jsonb,
 'critical'),

('FR', 'electronics', 'labeling',
 'Indice de réparabilité / durabilité: Reparierbarkeitsindex',
 'Für definierte Produktgruppen (u. a. Smartphones, Laptops, TV-Geräte, Waschmaschinen, Geschirrspüler, Staubsauger, Hochdruckreiniger, Rasenmäher) muss ein Reparierbarkeitsindex (Note 0–10) berechnet und am Produkt, im Regal und im Onlineshop neben dem Preis angezeigt werden. Für TV-Geräte und Waschmaschinen wurde der Index ab 2025 durch den strengeren Haltbarkeitsindex (indice de durabilité) ersetzt. Die Berechnungstabellen sind auf Anfrage offenzulegen.',
 TRUE,
 ARRAY['AGEC 2020-105 Art. 16', 'Décret 2020-1757', 'Décret 2023-293'],
 'DGCCRF / ADEME',
 'Indice de durabilité für TV seit 01/2025, Waschmaschinen seit 04/2025',
 'Bußgelder bis 15.000 € je Modell',
 ARRAY[
   'Prüfen, ob die Produktgruppe indexpflichtig ist',
   'Index nach offiziellem Berechnungsraster ermitteln (Dokumentation, Ersatzteile, Preise, Demontierbarkeit)',
   'Offizielles Logo mit Note farbkodiert erzeugen',
   'Anzeige am Produkt, am POS und online neben dem Preis umsetzen',
   'Berechnungstabelle für Behörden/Verbraucher bereithalten'
 ],
 'Interner Aufwand 1–3 Tage je Modell; externe Unterstützung ca. 500–2.000 €/Modell',
 '[{"label": "Indice de réparabilité (Ministère)", "url": "https://www.ecologie.gouv.fr/indice-reparabilite"}]'::jsonb,
 'critical'),

('FR', 'electronics', 'standards',
 'AGEC: Ersatzteil-Verfügbarkeit und Verbraucherinformation',
 'Hersteller müssen Händler und Verbraucher darüber informieren, ob und wie lange Ersatzteile für Elektrogeräte verfügbar sind (Art. L111-4 Code de la consommation). Die Information muss vor dem Kauf sichtbar sein; Ersatzteile müssen innerhalb von 15 Werktagen lieferbar sein. Für bestimmte Gerätegruppen gelten Mindestverfügbarkeitsdauern.',
 TRUE,
 ARRAY['AGEC 2020-105 Art. 19', 'Code de la consommation Art. L111-4'],
 'DGCCRF',
 NULL,
 'Bußgelder bis 15.000 €',
 ARRAY[
   'Ersatzteilstrategie je Modell festlegen (welche Teile, wie lange)',
   'Verfügbarkeitsdauer im Listing/Datenblatt ausweisen',
   'Lieferprozess sicherstellen (max. 15 Werktage)',
   'Information an Handelspartner weitergeben'
 ],
 'Organisatorischer Aufwand; Lagerkosten für Ersatzteile produktabhängig',
 '[{"label": "Art. L111-4 Code de la consommation", "url": "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000041305757"}]'::jsonb,
 'high'),

-- FR / textiles ------------------------------------------------------
('FR', 'textiles', 'registration',
 'REP TLC: Refashion-Beitritt + IDU für Textilien',
 'Textilien, Haushaltswäsche und Schuhe (TLC) unterliegen in Frankreich einer eigenen REP-Filiere. Inverkehrbringer müssen dem eco-organisme Refashion beitreten, erhalten eine IDU-Nummer und zahlen mengenabhängige Eco-Beiträge (mit Bonus für langlebige/recyclingfähige Produkte).',
 TRUE,
 ARRAY['Code de l''environnement Art. L541-10-1', 'AGEC 2020-105'],
 'Refashion / ADEME',
 'VOR Vertriebsbeginn',
 'Bußgelder, Beitragsnachforderungen, Marktplatz-Delisting ohne IDU',
 ARRAY[
   'Beitrittsvertrag mit Refashion abschließen',
   'IDU-Nummer über SYDEREP registrieren lassen',
   'Stückzahlen jährlich deklarieren und Eco-Beiträge zahlen',
   'Eco-Modulation prüfen (Boni für Haltbarkeit/Rezyklat senken Beiträge)'
 ],
 'Beiträge ca. 0,01–0,10 € je Teil (eco-moduliert)',
 '[{"label": "Refashion", "url": "https://refashion.fr"}]'::jsonb,
 'critical'),

('FR', 'textiles', 'labeling',
 'AGEC: Umwelt- und Traceability-Kennzeichnung für Textilien',
 'Größere Inverkehrbringer (Schwellen nach Umsatz/Stückzahl, schrittweise abgesenkt) müssen für Textilien produktbezogene Umweltinformationen bereitstellen: Herkunftsland der Hauptfertigungsschritte (Weben, Färben, Konfektion), Rezyklatanteil, Recyclingfähigkeit und Hinweis auf Mikroplastikfreisetzung bei > 50 % synthetischen Fasern. Die Angaben müssen online und am Produkt verfügbar sein.',
 TRUE,
 ARRAY['AGEC 2020-105 Art. 13', 'Décret 2022-748'],
 'DGCCRF / ADEME',
 'Schwellenwerte beachten (zuletzt 10 Mio. € Umsatz + 10.000 Einheiten)',
 'Bußgelder bis 15.000 €',
 ARRAY[
   'Prüfen, ob Unternehmensschwellen überschritten werden',
   'Lieferkettendaten erheben (Länder der Fertigungsschritte, Materialdaten)',
   'Produktdatenblatt (fiche produit) je Artikel erstellen',
   'Angaben im Onlineshop und an der Ware verfügbar machen'
 ],
 'Datenerhebung intern; Tool-/Beratungskosten ca. 1.000–5.000 € initial',
 '[{"label": "Décret 2022-748", "url": "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000045726094"}]'::jsonb,
 'high'),

('FR', 'textiles', 'labeling',
 'Faserkennzeichnung EU 1007/2011 auf Französisch',
 'Die Faserzusammensetzung nach EU-Textilkennzeichnungsverordnung muss für den französischen Markt in französischer Sprache etikettiert sein (z. B. „100 % coton"). Zusammen mit der Loi Toubon betrifft das auch Pflegehinweise und beigefügte Produktinformationen.',
 TRUE,
 ARRAY['EU 1007/2011', 'Loi n° 94-665'],
 'DGCCRF',
 NULL,
 'Bußgelder, Verkaufsbeschränkungen',
 ARRAY[
   'Französische Faserbezeichnungen nach Anhang I verwenden',
   'Etiketten zweisprachig oder marktspezifisch produzieren',
   'Onlineshop-Angaben für FR lokalisieren'
 ],
 'Etikettenanpassung produktionsabhängig, gering',
 '[{"label": "EU 1007/2011", "url": "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32011R1007"}]'::jsonb,
 'critical'),

-- =====================================================================
-- ITALIEN (IT)
-- =====================================================================

-- IT / general -------------------------------------------------------
('IT', 'general', 'registration',
 'GPSR: Verantwortliche Person in der EU',
 'Für den Verkauf nach Italien gilt die GPSR-Anforderung eines in der EU niedergelassenen verantwortlichen Wirtschaftsakteurs mit Kennzeichnung auf dem Produkt. Zuständig für die Marktüberwachung ist das Ministero delle Imprese e del Made in Italy (MIMIT) mit den Handelskammern.',
 TRUE,
 ARRAY['GPSR 2023/988'],
 'MIMIT / Camere di Commercio',
 'Gilt seit 13.12.2024',
 'Verkaufsverbot, Bußgelder, Rückrufanordnungen',
 ARRAY[
   'EU-Verantwortlichen bestimmen oder Bevollmächtigten bestellen',
   'Kontaktdaten auf Produkt/Verpackung anbringen',
   'Italienische Marktüberwachungskontakte im Incident-Prozess hinterlegen'
 ],
 'Intern kostenlos; externer EU-Bevollmächtigter ca. 500–2.000 €/Jahr',
 '[{"label": "MIMIT", "url": "https://www.mimit.gov.it"}]'::jsonb,
 'critical'),

('IT', 'general', 'packaging',
 'CONAI-Beitritt + Contributo Ambientale (CAC)',
 'Wer verpackte Ware nach Italien importiert oder dort herstellt, muss dem Verpackungskonsortium CONAI beitreten und den Umweltbeitrag (Contributo Ambientale CONAI, CAC) auf die in Verkehr gebrachten Verpackungsmaterialien entrichten. Für Importeure gibt es vereinfachte Pauschalverfahren unterhalb bestimmter Schwellen.',
 TRUE,
 ARRAY['D.Lgs. 152/2006', 'PPWR 2024/3249'],
 'CONAI (Consorzio Nazionale Imballaggi)',
 'Beitritt VOR Vertriebsbeginn; Erstmeldung im Folgemonat',
 'Nachzahlungen + Sanktionen bis 30.000 €',
 ARRAY[
   'CONAI-Beitritt online erklären (einmalige Aufnahmegebühr)',
   'Verfahren wählen: detaillierte Materialdeklaration oder vereinfachte Importpauschale',
   'Periodische CAC-Meldungen einrichten (monatlich/quartalsweise/jährlich nach Volumen)',
   'CAC-Sätze je Material in der Kalkulation berücksichtigen'
 ],
 'Aufnahmegebühr ab ca. 5,16 €; CAC materialabhängig (z. B. Papier ca. 35 €/t, Plastik bis ~400 €/t)',
 '[{"label": "CONAI", "url": "https://www.conai.org"}]'::jsonb,
 'critical'),

('IT', 'general', 'language',
 'Italienische Sprachpflicht (Codice del Consumo)',
 'Art. 6–9 des Codice del Consumo verlangen, dass Verbraucherinformationen — Produktbezeichnung, Materialangaben, Gebrauchs- und Sicherheitshinweise, Warnungen — in italienischer Sprache vorliegen. Anleitungen dürfen mehrsprachig sein, Italienisch muss aber enthalten sein.',
 TRUE,
 ARRAY['Codice del Consumo (D.Lgs. 206/2005) Art. 6-9'],
 'MIMIT / Antitrust-Behörde AGCM',
 NULL,
 'Bußgelder von 516 € bis 25.823 € je Verstoß',
 ARRAY[
   'Sicherheitsrelevante Texte und Etiketten identifizieren',
   'Italienische Übersetzung anfertigen lassen',
   'Etiketten/Beileger für den IT-Markt produzieren'
 ],
 'Übersetzung ca. 0,10–0,20 €/Wort',
 '[{"label": "Codice del Consumo", "url": "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2005-09-06;206"}]'::jsonb,
 'critical'),

('IT', 'general', 'labeling',
 'Umweltkennzeichnung der Verpackung (Decreto 116/2020)',
 'Alle Verpackungen für den italienischen Markt müssen mit der Materialcodierung nach Entscheidung 97/129/EG (z. B. PAP 20, LDPE 4) gekennzeichnet sein; B2C-Verpackungen zusätzlich mit dem Entsorgungshinweis auf Italienisch (z. B. „Raccolta differenziata — verifica le disposizioni del tuo Comune"). Digitale Lösungen (QR-Code) sind für Teile der Information zulässig.',
 TRUE,
 ARRAY['D.Lgs. 116/2020', '97/129/EG'],
 'CONAI / Marktüberwachung',
 'Pflicht seit 01.01.2023',
 'Bußgelder von 5.200 € bis 40.000 €',
 ARRAY[
   'Alle Verpackungskomponenten inventarisieren (Karton, Beutel, Füllmaterial)',
   'Materialcodes nach 97/129/EG zuordnen',
   'Italienischen Entsorgungshinweis ins Artwork aufnehmen',
   'CONAI-Etichettatura-Tool zur Validierung nutzen'
 ],
 'Artwork-Anpassung ca. 100–300 € je Verpackungslinie',
 '[{"label": "CONAI Etichettatura", "url": "https://www.etichetta-conai.com"}]'::jsonb,
 'high'),

-- IT / electronics ---------------------------------------------------
('IT', 'electronics', 'registration',
 'RAEE: Eintragung ins Registro AEE',
 'Hersteller und Importeure von Elektrogeräten müssen sich vor dem Inverkehrbringen ins nationale Herstellerregister (Registro AEE) bei der zuständigen Handelskammer eintragen und erhalten eine Registrierungsnummer (IT-Nummer), die auf Rechnungen anzugeben ist. Ausländische Unternehmen ohne italienische Niederlassung müssen einen rappresentante autorizzato bestellen.',
 TRUE,
 ARRAY['D.Lgs. 49/2014', 'WEEE-Richtlinie 2012/19/EU'],
 'Registro AEE / Camera di Commercio',
 'VOR dem ersten Inverkehrbringen',
 'Sanktionen von 30.000 € bis 100.000 €, Vertriebsverbot',
 ARRAY[
   'Rappresentante autorizzato in Italien bestellen (falls keine Niederlassung)',
   'Registrierung über das Telemaco-Portal der Handelskammer einreichen',
   'IT-Registrierungsnummer auf Rechnungen und in Listings führen',
   'Jährliche Mengenmeldung (dichiarazione annuale) abgeben'
 ],
 'Registrierung ca. 30 € + Verwaltungsgebühren; Bevollmächtigter ca. 500–1.500 €/Jahr',
 '[{"label": "Registro AEE", "url": "https://www.registroaee.it"}]'::jsonb,
 'critical'),

('IT', 'electronics', 'registration',
 'Registro Pile e Accumulatori (bei Batterien)',
 'Werden Batterien/Akkus (auch eingebaut) in Verkehr gebracht, ist zusätzlich die Eintragung ins nationale Batterieregister (Registro Pile e Accumulatori) erforderlich — analog zum RAEE-Register über die Handelskammer, ebenfalls mit Pflicht zum rappresentante autorizzato für ausländische Hersteller.',
 TRUE,
 ARRAY['D.Lgs. 188/2008', 'Batterieverordnung 2023/1542'],
 'Registro Pile / Camera di Commercio',
 'VOR dem ersten Inverkehrbringen',
 'Sanktionen bis 100.000 €',
 ARRAY[
   'Registrierung über das Telemaco-Portal vornehmen',
   'Batterietypen und Chemien deklarieren',
   'Jährliche Mengenmeldung einrichten',
   'Beitritt zu einem Batterie-Sammelsystem prüfen'
 ],
 'Registrierung ca. 30 € + Gebühren',
 '[{"label": "Registro Pile", "url": "https://www.registropile.it"}]'::jsonb,
 'high'),

('IT', 'electronics', 'disposal',
 'Beitritt zu einem RAEE-Kollektivsystem (sistema collettivo)',
 'Zur Erfüllung der Rücknahme- und Verwertungspflichten für Haushalts-Elektrogeräte müssen sich Hersteller einem RAEE-Kollektivsystem anschließen (z. B. Erion WEEE, Ecodom/Remedia-Nachfolger). Das System übernimmt Sammlung, Logistik und Verwertung und meldet die Mengen an das Zentralregister.',
 TRUE,
 ARRAY['D.Lgs. 49/2014'],
 'Centro di Coordinamento RAEE',
 'Gleichzeitig mit der Registro-AEE-Eintragung',
 'Ohne Systembeitritt keine gültige Registrierung — Vertriebsverbot',
 ARRAY[
   'RAEE-Kollektivsystem auswählen und Beitrittsvertrag schließen',
   'Eco-Beiträge je Gerätekategorie kalkulieren',
   'Mengenmeldungen an das System automatisieren'
 ],
 'Beiträge je Gerät ca. 0,05–10 € nach Kategorie/Gewicht',
 '[{"label": "Erion", "url": "https://www.erion.it"}, {"label": "CdC RAEE", "url": "https://www.cdcraee.it"}]'::jsonb,
 'critical'),

-- =====================================================================
-- ÖSTERREICH (AT)
-- =====================================================================

-- AT / general -------------------------------------------------------
('AT', 'general', 'registration',
 'GPSR: Verantwortliche Person in der EU',
 'Auch in Österreich dürfen Verbraucherprodukte nur mit benanntem EU-Wirtschaftsakteur (Hersteller, Importeur oder Bevollmächtigter) und entsprechender Kennzeichnung vertrieben werden. Marktüberwachung erfolgt durch das BMAW und die Bezirksverwaltungsbehörden.',
 TRUE,
 ARRAY['GPSR 2023/988', 'PSG 2004'],
 'BMAW / Bezirksverwaltungsbehörden',
 'Gilt seit 13.12.2024',
 'Vertriebsverbot, Verwaltungsstrafen bis 25.000 €',
 ARRAY[
   'EU-Verantwortlichen bestimmen oder Bevollmächtigten bestellen',
   'Kontaktdaten auf Produkt/Verpackung anbringen'
 ],
 'Intern kostenlos; externer EU-Bevollmächtigter ca. 500–2.000 €/Jahr',
 '[{"label": "Produktsicherheit Österreich", "url": "https://www.produktsicherheit.gv.at"}]'::jsonb,
 'critical'),

('AT', 'general', 'packaging',
 'VerpackVO: Registrierung + Systembeteiligung (z. B. ARA)',
 'Verpackungen für den österreichischen Markt müssen bei einem Sammel- und Verwertungssystem (z. B. ARA, Reclay) lizenziert werden; Primärverpflichtete registrieren sich im EDM-Portal. Ausländische Versandhändler ohne Niederlassung in Österreich MÜSSEN einen Bevollmächtigten für die Verpackungsentpflichtung bestellen.',
 TRUE,
 ARRAY['VerpackVO 2014', 'AWG 2002'],
 'BMK / ARA',
 'VOR Vertriebsbeginn; Bevollmächtigtenpflicht für Versandhandel seit 2023',
 'Verwaltungsstrafen bis 8.400 €, Nachzahlungen',
 ARRAY[
   'Prüfen, ob Niederlassung in AT besteht — sonst Bevollmächtigten bestellen',
   'Vertrag mit Sammel- und Verwertungssystem abschließen (z. B. ARA)',
   'Verpackungsmengen je Tarifkategorie melden',
   'Registrierung im EDM-Portal (edm.gv.at) durchführen'
 ],
 'Lizenzentgelte mengenabhängig, Kleinmengen ab ca. 100 €/Jahr',
 '[{"label": "ARA", "url": "https://www.ara.at"}, {"label": "EDM-Portal", "url": "https://edm.gv.at"}]'::jsonb,
 'critical'),

('AT', 'general', 'language',
 'Deutsche Sprachpflicht für Produktinformationen',
 'Gebrauchsanweisungen, Sicherheits- und Warnhinweise müssen in deutscher Sprache vorliegen (PSG, KSchG). Bestehende deutsche Unterlagen aus dem DE-Vertrieb können i. d. R. verwendet werden — österreichspezifische Kontakt-/Entsorgungsangaben prüfen.',
 TRUE,
 ARRAY['PSG 2004', 'KSchG'],
 'BMAW / Konsumentenschutz',
 NULL,
 'Verwaltungsstrafen, Gewährleistungsrisiken',
 ARRAY[
   'Deutsche Dokumentation aus DE-Vertrieb übernehmen',
   'Entsorgungs- und Kontaktangaben für AT anpassen',
   'Impressums-/Garantieangaben auf AT-Recht prüfen'
 ],
 'Gering, falls deutsche Unterlagen existieren',
 '[]'::jsonb,
 'high'),

-- AT / electronics ---------------------------------------------------
('AT', 'electronics', 'registration',
 'EAG-VO: Registrierung im EDM-Portal + Sammelsystem',
 'Hersteller/Importeure von Elektrogeräten müssen sich vor dem Inverkehrbringen im elektronischen Datenmanagement (EDM, edm.gv.at) registrieren (GLN-Vergabe) und einem Sammel- und Verwertungssystem für Elektroaltgeräte beitreten (z. B. ERA, UFH, Interseroh). Ausländische Versandhändler benötigen einen Bevollmächtigten.',
 TRUE,
 ARRAY['EAG-VO', 'AWG 2002', 'WEEE-Richtlinie 2012/19/EU'],
 'BMK / EDM',
 'VOR dem ersten Inverkehrbringen',
 'Verwaltungsstrafen bis 8.400 €, bei Vorsatz mehr; Vertriebsverbot',
 ARRAY[
   'EDM-Registrierung durchführen (GLN beantragen)',
   'Sammel- und Verwertungssystem wählen und beitreten (z. B. ERA)',
   'Bevollmächtigten bestellen, falls keine AT-Niederlassung',
   'Mengenmeldungen je Sammelkategorie einrichten'
 ],
 'EDM kostenlos; Systembeiträge mengenabhängig (Kleinmengen ab ca. 100 €/Jahr)',
 '[{"label": "ERA", "url": "https://www.era-gmbh.at"}, {"label": "EDM-Portal", "url": "https://edm.gv.at"}]'::jsonb,
 'critical'),

('AT', 'electronics', 'labeling',
 'Kennzeichnung: durchgestrichene Mülltonne (EAG-VO)',
 'Elektrogeräte für den österreichischen Markt müssen — wie EU-weit — mit der durchgestrichenen Mülltonne nach EN 50419 und einer eindeutigen Herstellerkennzeichnung versehen sein. Bestehende EU-konforme Kennzeichnung aus dem DE-Vertrieb erfüllt die Anforderung.',
 TRUE,
 ARRAY['EAG-VO', 'EN 50419'],
 'BMK / Marktüberwachung',
 NULL,
 'Verwaltungsstrafen',
 ARRAY[
   'EN-50419-Symbol am Gerät sicherstellen',
   'Herstellerkennung konsistent zur EDM-Registrierung halten'
 ],
 'Keine Zusatzkosten bei bestehender EU-Kennzeichnung',
 '[]'::jsonb,
 'high'),

-- =====================================================================
-- SPANIEN (ES)
-- =====================================================================

-- ES / general -------------------------------------------------------
('ES', 'general', 'registration',
 'GPSR: Verantwortliche Person in der EU',
 'Für den spanischen Markt gilt die GPSR-Pflicht zur Benennung eines EU-Wirtschaftsakteurs mit Kennzeichnung auf dem Produkt. Marktüberwachung über das Ministerio de Consumo und die Autonomen Gemeinschaften.',
 TRUE,
 ARRAY['GPSR 2023/988'],
 'Ministerio de Consumo / Comunidades Autónomas',
 'Gilt seit 13.12.2024',
 'Verkaufsverbot, Bußgelder nach LGDCU',
 ARRAY[
   'EU-Verantwortlichen bestimmen oder Bevollmächtigten bestellen',
   'Kontaktdaten auf Produkt/Verpackung anbringen'
 ],
 'Intern kostenlos; externer EU-Bevollmächtigter ca. 500–2.000 €/Jahr',
 '[{"label": "Ministerio de Consumo", "url": "https://www.consumo.gob.es"}]'::jsonb,
 'critical'),

('ES', 'general', 'packaging',
 'RD 1055/2022: Verpackungsregister + SCRAP-Beitritt (Ecoembes)',
 'Das Königliche Dekret 1055/2022 verpflichtet alle Inverkehrbringer verpackter Ware (auch Fernabsatz aus dem Ausland), sich im Registro de Productores de Producto (Sección Envases) einzutragen und die EPR-Pflichten über ein Kollektivsystem (SCRAP, für Haushaltsverpackungen i. d. R. Ecoembes/Ecovidrio) zu erfüllen. Die Registrierungsnummer ist auf Rechnungen anzugeben. Zusätzlich gilt eine Plastiksteuer auf nicht-recycelte Kunststoffverpackungen (0,45 €/kg).',
 TRUE,
 ARRAY['RD 1055/2022', 'Ley 7/2022 (Plastiksteuer)'],
 'MITECO / Ecoembes',
 'Registrierung VOR Vertriebsbeginn; Jahresmeldung bis 31.03.',
 'Bußgelder bis 100.000 € (schwere Verstöße bis 3,5 Mio. €)',
 ARRAY[
   'Bevollmächtigten in Spanien bestellen (für ausländische Versandhändler Pflicht)',
   'Eintragung ins Registro de Productores (Sección Envases) über MITECO',
   'SCRAP-Vertrag abschließen (Ecoembes für Leichtverpackungen/Papier)',
   'Plastiksteuer-Pflichten prüfen (Steuer auf nicht-recycelten Kunststoff, 0,45 €/kg)',
   'Jährliche Verpackungsdeklaration abgeben'
 ],
 'Ecoembes-Beiträge mengenabhängig; Registereintrag kostenlos; Bevollmächtigter ca. 500–1.500 €/Jahr',
 '[{"label": "MITECO Registro Envases", "url": "https://www.miteco.gob.es"}, {"label": "Ecoembes", "url": "https://www.ecoembes.com"}]'::jsonb,
 'critical'),

('ES', 'general', 'language',
 'Spanische Sprachpflicht (TRLGDCU)',
 'Nach dem spanischen Verbraucherschutzgesetz (RD Legislativo 1/2007, Art. 18) müssen Etiketten, Gebrauchsanweisungen und Sicherheitshinweise mindestens auf Kastilisch (Spanisch) vorliegen. Regionale Co-Amtssprachen sind optional.',
 TRUE,
 ARRAY['RD Legislativo 1/2007 (TRLGDCU) Art. 18'],
 'Ministerio de Consumo / Comunidades Autónomas',
 NULL,
 'Bußgelder bis 100.000 € je nach Schwere',
 ARRAY[
   'Sicherheitsrelevante Texte identifizieren',
   'Spanische Übersetzung anfertigen lassen',
   'Etiketten/Beileger für den ES-Markt produzieren'
 ],
 'Übersetzung ca. 0,10–0,20 €/Wort',
 '[{"label": "TRLGDCU", "url": "https://www.boe.es/buscar/act.php?id=BOE-A-2007-20555"}]'::jsonb,
 'critical'),

-- ES / electronics ---------------------------------------------------
('ES', 'electronics', 'registration',
 'RD 110/2015: RII-AEE-Registrierung',
 'Hersteller/Importeure von Elektrogeräten müssen sich vor dem Inverkehrbringen im Registro Integrado Industrial (Sektion RII-AEE) des Industrieministeriums eintragen und erhalten eine Registrierungsnummer für Rechnungen und Mengenmeldungen.',
 TRUE,
 ARRAY['RD 110/2015', 'WEEE-Richtlinie 2012/19/EU'],
 'Ministerio de Industria (Registro Integrado Industrial)',
 'VOR dem ersten Inverkehrbringen',
 'Bußgelder bis 1,75 Mio. € bei schweren Verstößen, Vertriebsverbot',
 ARRAY[
   'Repräsentanten/NIF-Voraussetzungen klären',
   'RII-AEE-Antrag elektronisch einreichen',
   'Registrierungsnummer auf Rechnungen führen',
   'Quartals-/Jahresmeldungen der Mengen einrichten'
 ],
 'Registrierung kostenlos; Verwaltungsaufwand bzw. Dienstleister ca. 300–800 € einmalig',
 '[{"label": "RII-AEE", "url": "https://sedeindustria.gob.es"}]'::jsonb,
 'critical'),

('ES', 'electronics', 'disposal',
 'SCRAP-Beitritt für Elektrogeräte (z. B. Ecotic, Ecolec)',
 'Zur Erfüllung der RAEE-Rücknahmepflichten müssen Hersteller einem Kollektivsystem (SCRAP) für Elektroaltgeräte beitreten — etwa Ecotic, Ecolec, Ecoasimelec — das Sammlung, Verwertung und Berichtswesen übernimmt.',
 TRUE,
 ARRAY['RD 110/2015'],
 'SCRAP (Ecotic / Ecolec) / MITECO',
 'Gleichzeitig mit der RII-AEE-Registrierung',
 'Ohne Systembeitritt keine rechtmäßige Vermarktung',
 ARRAY[
   'SCRAP auswählen und Beitrittsvertrag schließen',
   'Gerätekategorien und Mengen deklarieren',
   'Eco-Beiträge in die Kalkulation aufnehmen'
 ],
 'Beiträge je Gerät ca. 0,05–10 € nach Kategorie',
 '[{"label": "Ecotic", "url": "https://www.ecotic.es"}, {"label": "Ecolec", "url": "https://www.ecolec.es"}]'::jsonb,
 'critical'),

('ES', 'electronics', 'registration',
 'Representante autorizado in Spanien (ohne ES-Niederlassung)',
 'Hersteller ohne Niederlassung in Spanien müssen für die RAEE-Pflichten einen in Spanien niedergelassenen representante autorizado benennen, der Registrierung, Meldungen und Systembeitritt übernimmt. Dies betrifft insbesondere Versandhändler aus anderen EU-Staaten.',
 TRUE,
 ARRAY['RD 110/2015 Art. 8'],
 'Ministerio de Industria',
 'VOR der RII-AEE-Registrierung',
 'Registrierung ohne Repräsentanten nicht möglich — faktisches Vertriebsverbot',
 ARRAY[
   'Dienstleister/Repräsentanten in Spanien auswählen',
   'Mandatsvertrag abschließen und notarielle Anforderungen klären',
   'Repräsentanten im RII-AEE-Antrag benennen'
 ],
 'Repräsentanten-Service ca. 500–1.500 €/Jahr',
 '[]'::jsonb,
 'high'),

-- =====================================================================
-- NIEDERLANDE (NL)
-- =====================================================================

('NL', 'general', 'registration',
 'GPSR: Verantwortliche Person in der EU',
 'Für den niederländischen Markt gilt die GPSR-Pflicht zur Benennung eines EU-Wirtschaftsakteurs mit Kennzeichnung auf dem Produkt. Marktüberwachung durch die NVWA (Nederlandse Voedsel- en Warenautoriteit).',
 TRUE,
 ARRAY['GPSR 2023/988', 'Warenwet'],
 'NVWA',
 'Gilt seit 13.12.2024',
 'Verkaufsverbot, Bußgelder bis 930.000 € (Warenwet-Rahmen)',
 ARRAY[
   'EU-Verantwortlichen bestimmen oder Bevollmächtigten bestellen',
   'Kontaktdaten auf Produkt/Verpackung anbringen'
 ],
 'Intern kostenlos; externer EU-Bevollmächtigter ca. 500–2.000 €/Jahr',
 '[{"label": "NVWA", "url": "https://www.nvwa.nl"}]'::jsonb,
 'critical'),

('NL', 'general', 'packaging',
 'Afvalfonds Verpakkingen: Verpackungs-EPR',
 'Inverkehrbringer verpackter Ware in den Niederlanden unterliegen der Verpackungsabgabe (Afvalbeheersbijdrage Verpakkingen) an den Afvalfonds Verpakkingen. Beitragspflichtig wird, wer mehr als 50.000 kg Verpackungsmaterial pro Jahr in Verkehr bringt — die Registrierungs- und Meldepflicht beginnt jedoch mit Überschreiten der Schwelle; darunter wird keine Abgabe fällig. Seit 2023 gilt das auch ausdrücklich für ausländische Distanzhändler.',
 TRUE,
 ARRAY['Besluit beheer verpakkingen 2014', 'PPWR 2024/3249'],
 'Afvalfonds Verpakkingen',
 'Anmeldung bei Überschreiten der 50.000-kg-Schwelle; Jahresmeldung bis 01.04.',
 'Nachforderungen + Zwangsgelder durch die ILT',
 ARRAY[
   'Jährliche Verpackungsmenge für NL abschätzen',
   'Bei > 50.000 kg: Registrierung beim Afvalfonds Verpakkingen',
   'Materialgenaue Jahresmeldung abgeben',
   'Tarife je Material in der Kalkulation berücksichtigen'
 ],
 'Unter 50.000 kg/Jahr: 0 €; darüber materialabhängige Tarife (z. B. Kunststoff ~1,00 €/kg)',
 '[{"label": "Afvalfonds Verpakkingen", "url": "https://www.afvalfondsverpakkingen.nl"}]'::jsonb,
 'high'),

('NL', 'general', 'language',
 'Niederländische Sprachanforderungen (Warenwet)',
 'Sicherheits- und Warnhinweise sowie gesetzlich vorgeschriebene Produktinformationen müssen nach der Warenwet auf Niederländisch verfügbar sein. Für allgemeine Gebrauchsanleitungen ist die Praxis liberaler als in FR/IT, sicherheitsrelevante Informationen müssen jedoch zwingend Niederländisch enthalten.',
 TRUE,
 ARRAY['Warenwet', 'Warenwetbesluit algemene productveiligheid'],
 'NVWA',
 NULL,
 'Bußgelder, Verkaufsbeschränkungen',
 ARRAY[
   'Sicherheits-/Warnhinweise identifizieren',
   'Niederländische Übersetzung ergänzen (mehrsprachige Beileger üblich)',
   'Etiketten prüfen'
 ],
 'Übersetzung ca. 0,10–0,20 €/Wort',
 '[{"label": "NVWA Productveiligheid", "url": "https://www.nvwa.nl/onderwerpen/productveiligheid"}]'::jsonb,
 'high'),

('NL', 'electronics', 'registration',
 'Stichting OPEN: AEEA-Registrierung (ehem. Wecycle)',
 'Seit 2021 erfüllen alle Hersteller/Importeure von Elektrogeräten in den Niederlanden ihre WEEE-Pflichten verpflichtend über die Producentenorganisation Stichting OPEN (operativ: Wecycle). Registrierung, Mengenmeldung und Entsorgungsbeiträge laufen zentral über OPEN; ausländische Anbieter ohne NL-Niederlassung benötigen einen gemachtigde (Bevollmächtigten).',
 TRUE,
 ARRAY['Regeling AEEA', 'WEEE-Richtlinie 2012/19/EU'],
 'Stichting OPEN / ILT',
 'VOR dem ersten Inverkehrbringen',
 'Zwangsgelder durch die ILT, Vertriebsuntersagung',
 ARRAY[
   'Registrierung bei Stichting OPEN (mijnopen-Portal)',
   'Bevollmächtigten bestellen, falls keine NL-Niederlassung',
   'Gerätekategorien deklarieren und Mengenmeldung einrichten',
   'Entsorgungsbeiträge (afvalbeheerbijdrage) kalkulieren'
 ],
 'Beiträge je Gerät ca. 0,01–5 € nach Kategorie/Gewicht',
 '[{"label": "Stichting OPEN", "url": "https://www.stichting-open.org"}]'::jsonb,
 'critical'),

-- =====================================================================
-- POLEN (PL)
-- =====================================================================

('PL', 'general', 'registration',
 'GPSR: Verantwortliche Person in der EU',
 'Für den polnischen Markt gilt die GPSR-Pflicht zur Benennung eines EU-Wirtschaftsakteurs mit Kennzeichnung auf dem Produkt. Marktüberwachung durch UOKiK und die Handelsinspektion.',
 TRUE,
 ARRAY['GPSR 2023/988'],
 'UOKiK / Inspekcja Handlowa',
 'Gilt seit 13.12.2024',
 'Verkaufsverbot, Bußgelder',
 ARRAY[
   'EU-Verantwortlichen bestimmen oder Bevollmächtigten bestellen',
   'Kontaktdaten auf Produkt/Verpackung anbringen'
 ],
 'Intern kostenlos; externer EU-Bevollmächtigter ca. 500–2.000 €/Jahr',
 '[{"label": "UOKiK", "url": "https://uokik.gov.pl"}]'::jsonb,
 'critical'),

('PL', 'general', 'packaging',
 'BDO: Verpackungs-Registrierung + Recyclingpflichten',
 'Wer verpackte Ware nach Polen einführt oder dort in Verkehr bringt, muss sich VOR Vertriebsbeginn im Abfallregister BDO (Baza danych o odpadach) registrieren, erhält eine BDO-Nummer (auf Rechnungen anzugeben) und muss Recyclingquoten erfüllen — üblicherweise über eine Verwertungsorganisation (organizacja odzysku). Jahresberichte sind bis 15.03. einzureichen; daneben fällt eine geringe Umweltgebühr (opłata produktowa) bei Quotenverfehlung an.',
 TRUE,
 ARRAY['Ustawa o gospodarce opakowaniami', 'Ustawa o odpadach (BDO)'],
 'Marschallämter (Urząd Marszałkowski) / BDO',
 'Registrierung VOR Vertriebsbeginn; Jahresbericht bis 15.03.',
 'Geldbußen bis 1 Mio. PLN, Verkauf ohne BDO-Nummer verboten',
 ARRAY[
   'BDO-Registrierung beim zuständigen Marschallamt beantragen (für Ausländer via Bevollmächtigtem)',
   'BDO-Nummer auf Rechnungen und Dokumenten führen',
   'Vertrag mit organizacja odzysku für Recyclingquoten schließen',
   'Jahresbericht über das BDO-Portal abgeben'
 ],
 'BDO-Jahresgebühr 100–300 PLN; Verwertungsorganisation mengenabhängig',
 '[{"label": "BDO-Portal", "url": "https://bdo.mos.gov.pl"}]'::jsonb,
 'critical'),

('PL', 'general', 'language',
 'Polnische Sprachpflicht',
 'Das Gesetz über die polnische Sprache (1999) und das Verbraucherrechtsgesetz verlangen, dass Produktkennzeichnung, Gebrauchsanleitungen, Garantiebedingungen und Sicherheitshinweise für Verbraucher auf Polnisch vorliegen.',
 TRUE,
 ARRAY['Ustawa o języku polskim (1999)', 'Ustawa o prawach konsumenta'],
 'UOKiK / Inspekcja Handlowa',
 NULL,
 'Geldbußen, Beanstandungen der Handelsinspektion',
 ARRAY[
   'Kundenseitige Texte identifizieren',
   'Polnische Übersetzung anfertigen lassen',
   'Etiketten/Beileger für den PL-Markt produzieren'
 ],
 'Übersetzung ca. 0,08–0,15 €/Wort',
 '[{"label": "Gesetz über die polnische Sprache", "url": "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19990900999"}]'::jsonb,
 'critical'),

('PL', 'electronics', 'registration',
 'BDO: Elektrogeräte-Registrierung + Verwertungsorganisation',
 'Hersteller/Importeure von Elektrogeräten müssen sich zusätzlich in der Elektro-Sektion des BDO-Registers eintragen. Ausländische Unternehmen ohne polnische Niederlassung müssen einen autoryzowany przedstawiciel (Bevollmächtigten) bestellen und die Rücknahmepflichten über eine Verwertungsorganisation für Elektroaltgeräte (organizacja odzysku SEiE) erfüllen. Öffentliche Aufklärungskampagnen-Abgabe (0,1 % vom Umsatz oder eigene Kampagnen) beachten.',
 TRUE,
 ARRAY['Ustawa o zużytym sprzęcie elektrycznym i elektronicznym (2015)', 'WEEE-Richtlinie 2012/19/EU'],
 'GIOŚ / Urząd Marszałkowski (BDO)',
 'VOR dem ersten Inverkehrbringen',
 'Geldbußen bis 1 Mio. PLN, Vertriebsverbot',
 ARRAY[
   'Autoryzowany przedstawiciel in Polen bestellen (falls keine Niederlassung)',
   'BDO-Eintrag für Elektrogeräte (Dział IV) vornehmen',
   'Vertrag mit organizacja odzysku SEiE abschließen',
   'Quartalsmeldungen + Jahresbericht einrichten',
   'Kennzeichnung (durchgestrichene Tonne) sicherstellen'
 ],
 'Bevollmächtigter + Organisation zusammen typischerweise ab ca. 1.000 €/Jahr',
 '[{"label": "BDO-Portal", "url": "https://bdo.mos.gov.pl"}, {"label": "GIOŚ", "url": "https://www.gov.pl/web/gios"}]'::jsonb,
 'critical')

ON CONFLICT (country_code, product_category, title) DO NOTHING;
