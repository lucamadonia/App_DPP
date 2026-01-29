-- ============================================
-- DPP Manager - Seed Data for Master Tables
-- ============================================
-- Führen Sie dieses SQL nach dem schema.sql aus
-- ============================================

-- ============================================
-- LÄNDER
-- ============================================

INSERT INTO countries (code, name, flag, regulations, checklists, authorities, description) VALUES
('DE', 'Deutschland', '🇩🇪', 45, 12, ARRAY['Bundesministerium für Wirtschaft und Klimaschutz', 'Umweltbundesamt', 'Bundesnetzagentur'], 'Größter EU-Markt mit strengen Umweltauflagen'),
('FR', 'Frankreich', '🇫🇷', 38, 10, ARRAY['Ministère de la Transition écologique', 'ADEME'], 'Vorreiter bei Reparierbarkeitsindex'),
('AT', 'Österreich', '🇦🇹', 32, 8, ARRAY['Bundesministerium für Klimaschutz', 'Umweltbundesamt'], 'Hohe Standards bei Nachhaltigkeit'),
('IT', 'Italien', '🇮🇹', 35, 9, ARRAY['Ministero della Transizione Ecologica', 'ISPRA'], 'Fokus auf Kreislaufwirtschaft'),
('ES', 'Spanien', '🇪🇸', 30, 7, ARRAY['Ministerio para la Transición Ecológica', 'MITERD'], 'Wachsender Nachhaltigkeitsmarkt'),
('NL', 'Niederlande', '🇳🇱', 33, 9, ARRAY['Rijkswaterstaat', 'RIVM'], 'Führend bei Kreislaufwirtschaft'),
('BE', 'Belgien', '🇧🇪', 28, 7, ARRAY['SPF Santé publique', 'IBGE-BIM'], 'Strikte Verpackungsvorschriften'),
('PL', 'Polen', '🇵🇱', 25, 6, ARRAY['Ministerstwo Klimatu i Środowiska'], 'Aufstrebender Markt'),
('SE', 'Schweden', '🇸🇪', 40, 10, ARRAY['Naturvårdsverket', 'Kemikalieinspektionen'], 'Nachhaltigkeitspionier'),
('CH', 'Schweiz', '🇨🇭', 35, 8, ARRAY['BAFU', 'SECO'], 'Hohe Qualitätsstandards')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- PRODUKTKATEGORIEN
-- ============================================

INSERT INTO categories (name, description, icon, regulations, sort_order) VALUES
('Elektronik', 'Elektronische Geräte und Komponenten', '📱', ARRAY['WEEE', 'RoHS', 'ErP'], 1),
('Textilien', 'Bekleidung und Heimtextilien', '👕', ARRAY['REACH', 'Textilkennzeichnung'], 2),
('Batterien', 'Akkus und Batterien aller Art', '🔋', ARRAY['Batterieverordnung', 'ADR'], 3),
('Verpackungen', 'Verpackungsmaterialien', '📦', ARRAY['VerpackG', 'PPWR'], 4),
('Möbel', 'Einrichtungsgegenstände', '🪑', ARRAY['REACH', 'Formaldehyd'], 5),
('Kosmetik', 'Kosmetische Produkte', '💄', ARRAY['EU Kosmetik-VO', 'REACH'], 6),
('Spielzeug', 'Spielwaren für Kinder', '🧸', ARRAY['EN 71', 'REACH'], 7),
('Lebensmittel', 'Nahrungsmittel und Getränke', '🍎', ARRAY['LMIV', 'HACCP'], 8),
('Baumaterialien', 'Baustoffe und Materialien', '🧱', ARRAY['CE-Kennzeichnung', 'REACH'], 9),
('Maschinen', 'Industrielle Maschinen', '⚙️', ARRAY['Maschinenrichtlinie', 'CE'], 10)
ON CONFLICT DO NOTHING;

-- ============================================
-- RECYCLING-CODES
-- ============================================

INSERT INTO recycling_codes (code, symbol, name, full_name, examples, recyclable) VALUES
('1', '♳', 'PET', 'Polyethylenterephthalat', 'Getränkeflaschen, Lebensmittelverpackungen', true),
('2', '♴', 'HDPE', 'High-Density Polyethylen', 'Milchflaschen, Waschmittelflaschen', true),
('3', '♵', 'PVC', 'Polyvinylchlorid', 'Rohre, Kabelisolierungen, Bodenbeläge', false),
('4', '♶', 'LDPE', 'Low-Density Polyethylen', 'Plastiktüten, Frischhaltefolie', true),
('5', '♷', 'PP', 'Polypropylen', 'Joghurtbecher, Flaschenverschlüsse', true),
('6', '♸', 'PS', 'Polystyrol', 'Styropor, Einwegbecher', false),
('7', '♹', 'O', 'Andere Kunststoffe', 'Mehrschichtverpackungen, Bioplastik', false),
('20', '♺', 'PAP', 'Wellpappe', 'Versandkartons', true),
('21', '♺', 'PAP', 'Sonstige Pappe', 'Verpackungskartons', true),
('22', '♺', 'PAP', 'Papier', 'Zeitungen, Büropapier', true),
('40', '♻', 'FE', 'Stahl', 'Konservendosen, Metalldeckel', true),
('41', '♻', 'ALU', 'Aluminium', 'Getränkedosen, Alufolie', true),
('70', '♻', 'GL', 'Weißglas', 'Klare Glasflaschen', true),
('71', '♻', 'GL', 'Grünglas', 'Grüne Glasflaschen', true),
('72', '♻', 'GL', 'Braunglas', 'Braune Glasflaschen', true)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- PIKTOGRAMME
-- ============================================

INSERT INTO pictograms (symbol, name, description, mandatory, countries, category, dimensions, placement) VALUES
('♻️', 'Recycling-Symbol', 'Allgemeines Recycling-Symbol', false, ARRAY['EU'], 'recycling', 'min. 10mm', 'Gut sichtbar auf Verpackung'),
('🔥', 'Leicht entzündlich', 'GHS02 - Entzündbare Stoffe', true, ARRAY['EU'], 'chemicals', 'min. 16mm', 'Frontseitig'),
('☠️', 'Giftig', 'GHS06 - Akute Toxizität', true, ARRAY['EU'], 'chemicals', 'min. 16mm', 'Frontseitig'),
('⚠️', 'Warnung', 'Allgemeines Warnzeichen', true, ARRAY['EU'], 'safety', 'min. 20mm', 'Gut sichtbar'),
('🔋', 'Batterie-Entsorgung', 'Getrennte Sammlung von Batterien', true, ARRAY['EU'], 'recycling', 'min. 3% der Fläche', 'Auf Batterie oder Verpackung'),
('⚡', 'Elektrische Gefahr', 'Warnung vor elektrischer Spannung', true, ARRAY['EU'], 'safety', 'min. 25mm', 'In Nähe der Gefahr'),
('🌿', 'EU Ecolabel', 'Europäisches Umweltzeichen', false, ARRAY['EU'], 'recycling', 'min. 15mm', 'Frontseitig'),
('♻️', 'Grüner Punkt', 'Lizenziertes Verpackungsrecycling', false, ARRAY['DE', 'AT'], 'recycling', 'min. 6mm', 'Auf Verpackung'),
('🔧', 'Reparierbarkeitsindex', 'Französischer Reparierbarkeitsindex', true, ARRAY['FR'], 'durability', '15x15mm', 'Nahe Preisangabe'),
('⚡', 'Energielabel', 'EU-Energieeffizienzklasse', true, ARRAY['EU'], 'energy', 'nach Produktgruppe', 'Gut sichtbar am Produkt')
ON CONFLICT DO NOTHING;

-- ============================================
-- EU-REGULIERUNGEN
-- ============================================

INSERT INTO eu_regulations (name, full_name, description, category, status, effective_date, application_date, key_requirements, affected_products, dpp_deadlines, link) VALUES
('ESPR', 'Ecodesign for Sustainable Products Regulation', 'Die neue EU-Verordnung für nachhaltiges Produktdesign ersetzt die Ökodesign-Richtlinie und führt den digitalen Produktpass ein.', 'environment', 'upcoming', '2024-07-18', '2027-01-01',
 ARRAY['Digitaler Produktpass', 'Haltbarkeitsanforderungen', 'Reparierbarkeit', 'Recyclingfähigkeit', 'CO2-Fußabdruck'],
 ARRAY['Elektronik', 'Textilien', 'Möbel', 'Batterien', 'Baumaterialien'],
 '{"Batterien": "2027-02-18", "Textilien": "2027-07-01", "Elektronik": "2028-01-01"}'::jsonb,
 'https://eur-lex.europa.eu/eli/reg/2024/1781'),

('BattVO', 'Batterieverordnung', 'Neue EU-Batterieverordnung mit Anforderungen an Nachhaltigkeit, Kennzeichnung und Rücknahme.', 'recycling', 'active', '2023-08-17', '2024-02-18',
 ARRAY['QR-Code mit Batterie-Pass', 'CO2-Fußabdruck-Deklaration', 'Recyclingeffizienz-Ziele', 'Sorgfaltspflichten'],
 ARRAY['Batterien', 'Elektrofahrzeuge', 'Elektronik'],
 '{"Industriebatterien": "2026-02-18", "EV-Batterien": "2027-02-18", "Alle": "2027-08-18"}'::jsonb,
 'https://eur-lex.europa.eu/eli/reg/2023/1542'),

('PPWR', 'Packaging and Packaging Waste Regulation', 'Verordnung über Verpackungen und Verpackungsabfälle mit Recyclingzielen und Pfandsystemen.', 'recycling', 'upcoming', '2024-11-01', '2030-01-01',
 ARRAY['Recyclingfähigkeit', 'Mindestrecyclatanteil', 'Pfandsysteme', 'Wiederverwendungsziele'],
 ARRAY['Verpackungen', 'Lebensmittel', 'Kosmetik'],
 '{"Kunststoff": "2030-01-01", "Alle": "2035-01-01"}'::jsonb,
 NULL),

('RoHS', 'Restriction of Hazardous Substances', 'Beschränkung der Verwendung bestimmter gefährlicher Stoffe in Elektro- und Elektronikgeräten.', 'chemicals', 'active', '2011-07-21', '2013-01-02',
 ARRAY['Blei-Grenzwert <0.1%', 'Cadmium <0.01%', 'Quecksilber <0.1%', 'Dokumentation'],
 ARRAY['Elektronik', 'Beleuchtung', 'Haushaltsgeräte'],
 '{}'::jsonb,
 'https://eur-lex.europa.eu/eli/dir/2011/65'),

('REACH', 'Registration, Evaluation, Authorisation of Chemicals', 'Europäische Chemikalienverordnung für Registrierung, Bewertung und Zulassung.', 'chemicals', 'active', '2006-12-18', '2007-06-01',
 ARRAY['Stoffregistrierung', 'SVHC-Liste', 'Kandidatenliste', 'Sicherheitsdatenblätter'],
 ARRAY['Alle chemischen Produkte', 'Textilien', 'Kosmetik', 'Spielzeug'],
 '{}'::jsonb,
 'https://eur-lex.europa.eu/eli/reg/2006/1907')
ON CONFLICT DO NOTHING;

-- ============================================
-- NATIONALE REGULIERUNGEN (Beispiel: Deutschland)
-- ============================================

INSERT INTO national_regulations (country_code, name, description, category, mandatory, effective_date, authority, penalties, products, link) VALUES
('DE', 'Verpackungsgesetz (VerpackG)', 'Deutsches Verpackungsgesetz mit Systembeteiligungspflicht und Registrierung bei LUCID.', 'Recycling', true, '2019-01-01', 'Zentrale Stelle Verpackungsregister', 'Bis zu 200.000 EUR', ARRAY['Verpackungen'], 'https://www.verpackungsgesetz.com'),

('DE', 'Elektrogesetz (ElektroG)', 'Gesetz über das Inverkehrbringen, die Rücknahme und die umweltverträgliche Entsorgung von Elektro- und Elektronikgeräten.', 'Recycling', true, '2005-08-16', 'Stiftung EAR', 'Bis zu 100.000 EUR', ARRAY['Elektronik'], 'https://www.stiftung-ear.de'),

('DE', 'Batteriegesetz (BattG)', 'Deutsches Batteriegesetz zur Umsetzung der EU-Batterieverordnung.', 'Recycling', true, '2009-12-01', 'Umweltbundesamt', 'Bis zu 100.000 EUR', ARRAY['Batterien'], NULL),

('DE', 'Lieferkettensorgfaltspflichtengesetz (LkSG)', 'Sorgfaltspflichten in der Lieferkette bezüglich Menschenrechte und Umwelt.', 'Nachhaltigkeit', true, '2023-01-01', 'BAFA', 'Bis zu 2% des Jahresumsatzes', ARRAY['Alle'], 'https://www.bafa.de/lieferketten'),

('FR', 'Loi Anti-Gaspillage (AGEC)', 'Französisches Gesetz gegen Verschwendung für eine Kreislaufwirtschaft.', 'Recycling', true, '2020-02-10', 'ADEME', 'Variable Strafen', ARRAY['Elektronik', 'Textilien', 'Möbel'], NULL),

('FR', 'Indice de réparabilité', 'Reparierbarkeitsindex für bestimmte Elektronikprodukte.', 'Kennzeichnung', true, '2021-01-01', 'DGCCRF', 'Bis zu 15.000 EUR', ARRAY['Elektronik'], NULL)
ON CONFLICT DO NOTHING;

-- ============================================
-- CHECKLIST TEMPLATES (Beispiele)
-- ============================================

INSERT INTO checklist_templates (country_code, category_key, title, description, mandatory, category, priority, document_required, sort_order) VALUES
-- Deutschland - Elektronik
('DE', 'electronics', 'CE-Kennzeichnung', 'Prüfen Sie, ob das CE-Zeichen korrekt angebracht ist.', true, 'Sicherheit & CE-Konformität', 'critical', true, 1),
('DE', 'electronics', 'WEEE-Registrierung', 'Registrierung bei der Stiftung EAR für Elektro-Altgeräte.', true, 'Recycling & Entsorgung', 'critical', true, 2),
('DE', 'electronics', 'RoHS-Konformität', 'Nachweis der Beschränkung gefährlicher Stoffe.', true, 'Chemikalien', 'high', true, 3),
('DE', 'electronics', 'Energielabel', 'EU-Energieeffizienzlabel anbringen (falls zutreffend).', true, 'Kennzeichnung', 'high', false, 4),

-- Deutschland - Textilien
('DE', 'textiles', 'Textilkennzeichnung', 'Materialzusammensetzung nach EU-Verordnung angeben.', true, 'Kennzeichnung', 'high', false, 1),
('DE', 'textiles', 'REACH-Konformität', 'Prüfung auf SVHC-Stoffe und Grenzwerte.', true, 'Chemikalien', 'high', true, 2),
('DE', 'textiles', 'Pflegesymbole', 'Korrekte Wasch- und Pflegesymbole anbringen.', true, 'Kennzeichnung', 'medium', false, 3),

-- Frankreich - Elektronik
('FR', 'electronics', 'Reparierbarkeitsindex', 'Reparierbarkeitsindex berechnen und anzeigen.', true, 'Kennzeichnung', 'critical', true, 1),
('FR', 'electronics', 'Triman-Symbol', 'Triman-Recycling-Symbol auf Verpackung.', true, 'Recycling & Entsorgung', 'high', false, 2)
ON CONFLICT DO NOTHING;

-- ============================================
-- NEWS (Beispiele)
-- ============================================

INSERT INTO news_items (title, summary, content, category, countries, priority, tags, published_at) VALUES
('ESPR tritt in Kraft',
 'Die Ecodesign for Sustainable Products Regulation ist am 18. Juli 2024 in Kraft getreten.',
 'Die neue EU-Verordnung für nachhaltiges Produktdesign (ESPR) ist offiziell in Kraft getreten. Unternehmen müssen sich auf den digitalen Produktpass und neue Nachhaltigkeitsanforderungen vorbereiten.',
 'regulation', ARRAY['EU'], 'high', ARRAY['ESPR', 'DPP', 'Nachhaltigkeit'], NOW() - INTERVAL '30 days'),

('Batteriepass-Deadline 2027',
 'Ab Februar 2027 müssen Industriebatterien einen digitalen Batteriepass haben.',
 'Die EU-Batterieverordnung schreibt vor, dass ab dem 18. Februar 2027 alle Industriebatterien mit einem digitalen Batteriepass ausgestattet sein müssen. Dies umfasst QR-Codes und detaillierte Nachhaltigkeitsinformationen.',
 'deadline', ARRAY['EU'], 'high', ARRAY['Batterien', 'DPP'], NOW() - INTERVAL '14 days'),

('VerpackG-Aktualisierung',
 'Neue Anforderungen an die Registrierung bei LUCID ab 2025.',
 'Das deutsche Verpackungsgesetz wird aktualisiert. Ab 2025 gelten erweiterte Meldepflichten und höhere Recyclingquoten.',
 'update', ARRAY['DE'], 'medium', ARRAY['Verpackung', 'Recycling'], NOW() - INTERVAL '7 days')
ON CONFLICT DO NOTHING;

-- ============================================
-- UNTERKATEGORIEN FÜR PRODUKTKATEGORIEN
-- ============================================

UPDATE categories SET subcategories = ARRAY['Smartphone', 'Tablet', 'Laptop', 'Desktop-PC', 'Wearable', 'Kopfhörer', 'Monitor', 'Smart-Home-Gerät'] WHERE name = 'Elektronik';
UPDATE categories SET subcategories = ARRAY['Oberbekleidung', 'Hosen', 'Schuhe', 'Accessoires', 'Unterwäsche', 'Sportbekleidung', 'Arbeitskleidung', 'Heimtextilien'] WHERE name = 'Textilien';
UPDATE categories SET subcategories = ARRAY['Lithium-Ionen', 'Lithium-Polymer', 'Blei-Säure', 'NiMH', 'Knopfzellen', 'EV-Batterie', 'Industriebatterie'] WHERE name = 'Batterien';
UPDATE categories SET subcategories = ARRAY['Karton', 'Kunststoff', 'Glas', 'Metall', 'Verbund', 'Folien', 'Etiketten'] WHERE name = 'Verpackungen';
UPDATE categories SET subcategories = ARRAY['Tisch', 'Stuhl', 'Schrank', 'Regal', 'Sofa', 'Bett', 'Büromöbel', 'Gartenmöbel'] WHERE name = 'Möbel';
UPDATE categories SET subcategories = ARRAY['Hautpflege', 'Haarpflege', 'Dekorative Kosmetik', 'Parfum', 'Sonnenschutz', 'Zahnpflege', 'Naturkosmetik'] WHERE name = 'Kosmetik';
UPDATE categories SET subcategories = ARRAY['Brettspiele', 'Plüschtiere', 'Elektronisches Spielzeug', 'Bausteine', 'Puppen', 'Outdoor-Spielzeug', 'Lernspielzeug'] WHERE name = 'Spielzeug';
UPDATE categories SET subcategories = ARRAY['Milchprodukte', 'Fleisch', 'Getränke', 'Backwaren', 'Tiefkühlkost', 'Konserven', 'Gewürze', 'Bio-Lebensmittel'] WHERE name = 'Lebensmittel';
UPDATE categories SET subcategories = ARRAY['Ziegel', 'Beton', 'Dämmstoffe', 'Fliesen', 'Holzwerkstoffe', 'Farben & Lacke', 'Glas'] WHERE name = 'Baumaterialien';
UPDATE categories SET subcategories = ARRAY['Motor', 'Antrieb', 'Steuerung', 'Hydraulik', 'Pneumatik', 'Fördertechnik'] WHERE name = 'Maschinen';

-- ============================================
-- FERTIG
-- ============================================

SELECT 'Seed data erfolgreich eingefügt!' AS status;
