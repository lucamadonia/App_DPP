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
-- CHECKLIST TEMPLATES
-- ============================================
-- Umfassende Checklisten-Daten befinden sich in:
-- supabase/seed-checklist-templates.sql
-- (291 Einträge für 10 Kategorien × 6 Länder mit vollständig befüllten Feldern)
-- Zum Laden ausführen: \i seed-checklist-templates.sql
-- Oder über das Migration-Script: node scripts/seed-checklist-templates.mjs

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
-- PRODUKTTYPEN (UNTERKATEGORIEN) — 1.217 Einträge
-- ============================================

-- Elektronik (99 Produkttypen)
UPDATE categories SET subcategories = ARRAY[
  'Smartphone','Tablet','E-Reader','Phablet','Foldable Phone',
  'Laptop','Desktop-PC','All-in-One PC','Mini-PC','Workstation','Server','Thin Client',
  'Monitor','Fernseher','Beamer','Projektor','Digital Signage Display','Curved Monitor',
  'Kopfhörer','In-Ear-Kopfhörer','Over-Ear-Kopfhörer','Lautsprecher','Soundbar','Subwoofer',
  'Bluetooth-Lautsprecher','Smart Speaker','Mikrofon','Mischpult','Verstärker','Hi-Fi-Anlage',
  'Smartwatch','Fitness-Tracker','VR-Brille','AR-Brille','Smart Ring',
  'Tastatur','Maus','Webcam','Grafiktablett','Gamepad','Joystick','Docking Station',
  'USB-Hub','Kartenleser','Scanner','Drucker','Multifunktionsdrucker','3D-Drucker',
  'Externe Festplatte','SSD','USB-Stick','NAS-System','Router','Switch','Modem',
  'WLAN-Repeater','Powerline-Adapter','Access Point',
  'Smart-Home-Hub','Smart Plug','Smarte Glühbirne','Smart Thermostat','Smarte Steckdose',
  'Smarte Türklingel','Überwachungskamera','Smarter Rauchmelder','Smarter Türschloss',
  'Smarte Jalousie','Bewegungsmelder',
  'Digitalkamera','Spiegelreflexkamera','Systemkamera','Action-Kamera','Dashcam',
  'Drohne','Camcorder','Stativ','Gimbal','Blitzgerät',
  'Staubsaugerroboter','Luftreiniger','Luftbefeuchter','Klimaanlage','Ventilator',
  'Heizlüfter','Elektroheizung',
  'Powerbank','Ladegerät','Netzteil','Kabel','Adapter',
  'Spielkonsole','Handheld-Konsole','Streaming-Stick','Set-Top-Box',
  'GPS-Gerät','Walkie-Talkie','Babyphone','Taschenrechner'
] WHERE name = 'Elektronik';

-- Textilien (127 Produkttypen)
UPDATE categories SET subcategories = ARRAY[
  'T-Shirt','Poloshirt','Hemd','Bluse','Pullover','Strickpullover','Sweatshirt',
  'Hoodie','Cardigan','Weste','Blazer','Sakko',
  'Winterjacke','Regenjacke','Softshelljacke','Daunenjacke','Lederjacke',
  'Trenchcoat','Mantel','Parka','Windbreaker','Fleecejacke',
  'Jeans','Chino','Stoffhose','Jogginghose','Shorts','Bermudas','Cargohose',
  'Leggings','Schlaghose',
  'Kleid','Abendkleid','Sommerkleid','Cocktailkleid','Rock','Maxirock','Minirock',
  'Jumpsuit','Overall',
  'Anzug','Kostüm','Smoking',
  'Unterhose','Boxershorts','Slip','BH','Sport-BH','Unterhemd','Body',
  'Shapewear','Strumpfhose','Socken','Kniestrümpfe',
  'Schlafanzug','Nachthemd','Morgenmantel','Bademantel',
  'Sportshirt','Sporthose','Trainingsjacke','Trainingsanzug','Laufshirt',
  'Radtrikot','Skianzug','Badehose','Badeanzug','Bikini','Surfanzug',
  'Yoga-Leggings','Funktionsunterwäsche','Kompressionsstrümpfe',
  'Arbeitshemd','Arbeitshose','Arbeitsjacke','Sicherheitsweste',
  'Laborkittel','Kochjacke','Schürze','Arbeitsoverall',
  'Sneaker','Laufschuhe','Wanderschuhe','Stiefel','Winterstiefel','Gummistiefel',
  'Sandalen','Pantoletten','Pumps','Ballerinas','Mokassins','Hausschuhe',
  'Sicherheitsschuhe','Clogs','Espadrilles','Flip-Flops',
  'Schal','Tuch','Mütze','Hut','Cap','Handschuhe','Fäustlinge','Stirnband',
  'Krawatte','Fliege','Gürtel','Hosenträger',
  'Bettwäsche','Bettlaken','Kopfkissen','Bettdecke','Tagesdecke',
  'Handtuch','Badetuch','Geschirrtuch','Tischdecke','Serviette',
  'Vorhang','Gardine','Plaid','Kuscheldecke',
  'Teppich','Läufer','Fußmatte','Sitzkissen','Dekokissen'
] WHERE name = 'Textilien';

-- Batterien (76 Produkttypen)
UPDATE categories SET subcategories = ARRAY[
  'AA-Batterie (Mignon)','AAA-Batterie (Micro)','C-Batterie (Baby)','D-Batterie (Mono)',
  '9V-Blockbatterie','AAAA-Batterie','N-Batterie',
  'CR2032','CR2025','CR2016','CR1620','CR1632','CR2450','CR123A',
  'LR44','SR626SW','LR1130','SR927W','LR41',
  'Li-Ion 18650','Li-Ion 21700','Li-Ion 26650','Li-Ion 14500','Li-Ion 18350',
  'Li-Ion Pouch-Zelle','Li-Ion Prismatische Zelle','Li-Ion Rundzelle',
  'LiPo 1S','LiPo 2S','LiPo 3S','LiPo 4S','LiPo 6S','LiPo Hochstrom',
  'Starterbatterie 12V','Gel-Batterie','AGM-Batterie','Blei-Säure-Nassbatterie',
  'Traktionsbatterie','Stationäre Bleibatterie',
  'NiMH AA','NiMH AAA','NiMH C','NiMH D','NiMH 9V','NiCd-Akku',
  'Hörgerätebatterie (Zink-Luft)','Fotobatterie','Rauchmelder-Batterie',
  'Lithium-Thionylchlorid','Lithium-Mangandioxid',
  'EV-Batteriepack','E-Bike-Akku','E-Scooter-Akku','E-Bus-Batterie',
  'Plug-in-Hybrid-Batterie','Mild-Hybrid-Batterie (48V)',
  'USV-Batterie','Solarspeicher','Heimspeicher','Großspeicher',
  'Notstromaggregat-Batterie','Telekom-Batterie',
  'Smartphone-Akku','Laptop-Akku','Tablet-Akku','Smartwatch-Akku',
  'Kopfhörer-Akku','Elektrowerkzeug-Akku','Gartengerät-Akku',
  'Modellbau-Akku','Drohnen-Akku','Kamera-Akku',
  'Batterieladegerät','Schnellladegerät','Balancer','Battery Management System'
] WHERE name = 'Batterien';

-- Verpackungen (98 Produkttypen)
UPDATE categories SET subcategories = ARRAY[
  'Wellpappkarton','Faltschachtel','Stülpdeckelschachtel','Versandkarton',
  'Displaykarton','Pizzakarton','Umzugskarton','Papiertüte','Papierbeutel',
  'Geschenkpapier','Seidenpapier','Packpapier','Kraftpapier',
  'PET-Flasche','HDPE-Flasche','PP-Becher','PS-Becher','PET-Schale',
  'Kunststofftüte','Tragetasche','Tiefziehschale','Blisterverpackung',
  'Clamshell-Verpackung','Skinverpackung','Schrumpffolie','Stretchfolie',
  'Luftpolsterfolie','Schaumstoffverpackung','Styroporbox',
  'Kunststoffpalette','Kunststoffkiste','Big Bag','Kunststoffeimer',
  'Glasflasche','Einwegglasflasche','Mehrwegglasflasche','Glasbehälter',
  'Konservenglas','Marmeladenglas','Parfümflakon','Medizinflasche',
  'Getränkedose','Konservendose','Metallbox','Metalleimer',
  'Aluminiumschale','Alufolie','Kronkorken','Schraubverschluss (Metall)',
  'Metalltube','Aerosoldose','Metallfass',
  'Getränkekarton (Tetra Pak)','Standbodenbeutel','Vakuumbeutel',
  'Retortenbeutel','Verbundfolie','Aluminiumverbund',
  'Mehrkammer-Beutel','Schlauchbeutel',
  'Holzkiste','Holzpalette','Europalette','Holzwolle','Holzspäne',
  'Weinkiste','Obststeige',
  'Schraubverschluss','Schnappdeckel','Klappdeckel','Ausgießer',
  'Dosierverschluss','Pumpspender','Sprühkopf','Tropfverschluss','Korken',
  'Papier-Etikett','Kunststoff-Etikett','Schrumpfetikett (Sleeve)',
  'Haftetikett','In-Mould-Label','RFID-Etikett','Barcode-Etikett',
  'QR-Code-Etikett','Sicherheitsetikett','Hologramm-Etikett',
  'Luftkissen','Füllchips','Papierpolster','Schaumstoffeinlage',
  'Formpolster','Kantenschutz','Eckenpolster',
  'Klebeband','Packband','Umreifungsband','Kabelbinder','Palette-Wickelfolie'
] WHERE name = 'Verpackungen';

-- Möbel (112 Produkttypen)
UPDATE categories SET subcategories = ARRAY[
  'Esstisch','Couchtisch','Beistelltisch','Konferenztisch','Schreibtisch',
  'Höhenverstellbarer Schreibtisch','Stehpult','Sekretär','Konsolentisch',
  'Gartentisch','Klapptisch','Bartisch','Nachttisch','Kinderschreibtisch',
  'Werkbank','Küchentisch',
  'Esszimmerstuhl','Bürostuhl','Drehstuhl','Gaming-Stuhl','Freischwinger',
  'Klappstuhl','Barhocker','Hocker','Sitzbank','Eckbank',
  'Kinderstuhl','Hochstuhl','Gartenstuhl','Liegestuhl','Schaukelstuhl',
  'Sessel','Ohrensessel','Relaxsessel','Hängesessel',
  'Sofa (2-Sitzer)','Sofa (3-Sitzer)','Ecksofa','Schlafsofa','Recamiere',
  'Chaiselongue','Ottomane','Sitzsack','Gartensofa',
  'Einzelbett','Doppelbett','Boxspringbett','Futonbett','Etagenbett',
  'Hochbett','Babybett','Kinderbett','Jugendbett','Tagesbett',
  'Klappbett','Gästebett','Wasserbett','Pflegebett',
  'Federkernmatratze','Kaltschaummatratze','Latexmatratze','Viscoschaummatratze',
  'Kindermatratze','Lattenrost','Motorlattenrost',
  'Kleiderschrank','Drehtürenschrank','Schwebetürenschrank','Begehbarer Kleiderschrank',
  'Schuhschrank','Garderobenschrank','Vitrine','Geschirrschrank',
  'Aktenschrank','Rollcontainer','Spind',
  'Kommode','Sideboard','Highboard','Lowboard','TV-Board',
  'Anrichte','Wickelkommode',
  'Bücherregal','Wandregal','Standregal','Eckregal','Kellerregal',
  'Schwerlasregal','Gewürzregal','Schuhregal','Weinregal',
  'Gartenbank','Hollywoodschaukel','Hängematte','Pavillon',
  'Sonnenschirm','Gartentruhe','Pflanzkübel','Hochbeet',
  'Kindertisch','Spielzeugtruhe','Kinderbücherregal','Wickeltisch',
  'Waschtischunterschrank','Badezimmerschrank','Spiegelschrank','Badregal',
  'Küchenschrank','Kücheninsel','Küchenregal','Servierwagen'
] WHERE name = 'Möbel';

-- Kosmetik (123 Produkttypen)
UPDATE categories SET subcategories = ARRAY[
  'Tagescreme','Nachtcreme','Feuchtigkeitscreme','Anti-Aging-Creme',
  'Augencreme','Gesichtsserum','Gesichtsöl','Gesichtswasser (Toner)',
  'Gesichtsreiniger','Mizellenwasser','Reinigungsschaum','Peeling (Gesicht)',
  'Gesichtsmaske','Tuchmaske','Peel-Off-Maske','Schlafmaske',
  'Lippenpflege','Lippenbalsam','Augenserum',
  'Bodylotion','Körperbutter','Körperöl','Duschgel','Duschcreme',
  'Seife (fest)','Flüssigseife','Schaumbad','Badesalz','Badebombe',
  'Körperpeeling','Handcreme','Fußcreme','Deodorant (Spray)',
  'Deodorant (Roll-On)','Deodorant (Stick)','Antitranspirant',
  'Sonnencreme (LSF 30)','Sonnencreme (LSF 50)','Sonnenspray','Sonnenmilch',
  'After-Sun-Lotion','Selbstbräuner','Bräunungsspray',
  'Shampoo','Trockenshampoo','Conditioner','Haarkur','Haarmaske',
  'Leave-in-Conditioner','Haaröl','Haarserum','Haarspray','Haargel',
  'Haarwachs','Haarcreme','Haarschaum (Mousse)','Haarfarbe',
  'Tönungsspülung','Blondierung','Anti-Schuppen-Shampoo',
  'Foundation','BB-Cream','CC-Cream','Concealer','Puder',
  'Rouge (Blush)','Bronzer','Highlighter','Primer','Setting Spray',
  'Lidschatten','Lidschatten-Palette','Eyeliner','Kajalstift',
  'Mascara','Augenbrauen-Stift','Augenbrauen-Gel',
  'Lippenstift','Lipgloss','Lipliner','Liquid Lipstick',
  'Nagellack','Gel-Nagellack','Nagellackentferner','Nagelöl',
  'Künstliche Wimpern','Wimpernkleber',
  'Eau de Parfum','Eau de Toilette','Eau de Cologne','Körperspray',
  'Parfum (Extrait)','Duftset','Raumduft',
  'Zahnpasta','Zahnpasta (sensitiv)','Zahnpasta (Whitening)',
  'Mundspülung','Zahnseide','Interdentalbürste','Zahnbürste (manuell)',
  'Elektrische Zahnbürste','Zahnaufhellung (Strips)',
  'Bio-Gesichtscreme','Bio-Shampoo','Bio-Duschgel','Naturseife',
  'Festes Shampoo','Fester Conditioner','Festes Duschgel','Deo-Creme (Bio)',
  'Rasierschaum','Rasiergel','Aftershave','Bartöl','Bartwachs',
  'Bartshampoo',
  'Babycreme','Babyshampoo','Babyöl','Feuchttücher',
  'Wundschutzcreme','Baby-Sonnenschutz'
] WHERE name = 'Kosmetik';

-- Spielzeug (136 Produkttypen)
UPDATE categories SET subcategories = ARRAY[
  'LEGO-Set','Duplo-Set','Magnetbausteine','Holzbausteine',
  'Metallbaukasten','Steckbausteine','Murmelbahn','Modelleisenbahn',
  'Modellbau-Set','Architektur-Baukasten',
  'Puppe','Babypuppe','Modepuppe','Ankleidepuppe','Puppenhaus',
  'Puppenwagen','Puppenkleidung','Action-Figur','Spielfigur',
  'Sammelfigur','Tierfigur','Dinosaurier-Figur',
  'Teddybär','Plüschtier (Hund)','Plüschtier (Katze)','Plüschtier (Einhorn)',
  'Plüschtier (Bär)','Schmusetuch','Wärmetier','Handpuppe',
  'Fingerpuppe','Plüsch-Rucksack',
  'Spielzeugauto','Ferngesteuertes Auto','Modellauto','Spielzeug-LKW',
  'Bagger (Spielzeug)','Feuerwehrauto','Polizeiauto','Krankenwagen',
  'Rennbahn','Autorennbahn (elektrisch)','Spielzeugzug','Spielzeugflugzeug',
  'Spielzeugschiff','Tretauto','Rutschauto','Bobbycar',
  'Brettspiel (Strategie)','Brettspiel (Familie)','Brettspiel (Kinder)',
  'Kartenspiel','Würfelspiel','Quizspiel','Partyspiel',
  'Kooperatives Spiel','Legespiel','Memory-Spiel','Domino',
  'Schach','Dame','Backgammon','Mühle',
  'Kinderpuzzle','Puzzle (500 Teile)','Puzzle (1000 Teile)','Puzzle (2000+ Teile)',
  '3D-Puzzle','Holzpuzzle','Steckpuzzle','Bodenpuzzle',
  'Schaukel','Rutsche','Sandkasten','Sandspielzeug','Klettergerüst',
  'Trampolin','Planschbecken','Wasserspielzeug','Wassersprinkler',
  'Drachen (Flug)','Frisbee','Hüpfball','Stelzen','Springseil',
  'Seifenblasen','Wasserpistole','Gartenspielhaus','Spielzelt',
  'Lerncomputer','Kinder-Tablet','Roboter (Spielzeug)','Walkie-Talkie (Kinder)',
  'Kinderkamera','Karaoke-Maschine','Elektronisches Haustier',
  'Tanzmatten','Laserwaffe (Spielzeug)','Drohne (Kinder)',
  'Experimentierkasten','Chemie-Baukasten','Elektronik-Baukasten',
  'Mikroskop (Kinder)','Teleskop (Kinder)','Lernuhr',
  'Rechenschieber','Magnetische Buchstaben','Lernposter',
  'Knetmasse','Modelliermasse','Malset','Fingerfarben','Bastelset',
  'Bügelperlen','Webrahmen','Strickliesel','Kinderküche',
  'Kaufladen','Werkbank (Kinder)','Arztkoffer (Spielzeug)',
  'Kindergitarre','Kinderklavier','Xylophon','Trommel (Kinder)',
  'Flöte (Kinder)','Musikbox (Kinder)','Rassel','Spieluhr',
  'Greifling','Beißring','Mobile','Stapelturm','Sortierbox',
  'Motorikwürfel','Krabbelmatte','Lauflernwagen'
] WHERE name = 'Spielzeug';

-- Lebensmittel (172 Produkttypen)
UPDATE categories SET subcategories = ARRAY[
  'Frischmilch','H-Milch','Hafermilch','Sojamilch','Mandelmilch',
  'Joghurt (Natur)','Fruchtjoghurt','Trinkjoghurt','Skyr','Quark',
  'Frischkäse','Schnittkäse','Hartkäse','Weichkäse','Schmelzkäse',
  'Mozzarella','Parmesan','Feta','Butter','Margarine',
  'Sahne','Schmand','Crème fraîche','Pudding','Milchreis',
  'Rindfleisch','Schweinefleisch','Hähnchenbrust','Putenbrust','Lammfleisch',
  'Hackfleisch (Rind)','Hackfleisch (gemischt)','Bratwurst','Wiener Würstchen',
  'Salami','Schinken','Aufschnitt','Leberwurst','Speck',
  'Lachs','Thunfisch','Kabeljau','Forelle','Garnelen','Muscheln',
  'Räucherlachs','Fischstäbchen','Matjes',
  'Vollkornbrot','Weizenbrot','Roggenbrot','Sauerteigbrot','Toastbrot',
  'Brötchen','Baguette','Croissant','Brezel','Laugenstange',
  'Kuchen','Torte','Muffin','Keks','Waffel',
  'Spaghetti','Penne','Fusilli','Reis (Basmati)','Reis (Jasmin)',
  'Couscous','Quinoa','Bulgur','Haferflocken','Müsli','Cornflakes',
  'Mehl','Grieß','Polenta',
  'Apfel','Banane','Orange','Erdbeere','Traube','Birne',
  'Tomate','Gurke','Paprika','Karotte','Kartoffel','Zwiebel',
  'Brokkoli','Blumenkohl','Spinat','Salat','Zucchini','Aubergine',
  'Tiefkühlpizza','Tiefkühlgemüse','Tiefkühlfisch','Tiefkühlpommes',
  'Tiefkühlbeeren','Eis (Packung)','Eis am Stiel','Fertiggericht (TK)',
  'Dosentomaten','Mais (Dose)','Erbsen (Dose)','Bohnen (Dose)',
  'Thunfisch (Dose)','Marmelade','Honig','Nutella','Erdnussbutter',
  'Gurken (Glas)','Oliven','Sauerkraut',
  'Mineralwasser','Apfelsaft','Orangensaft','Multivitaminsaft',
  'Cola','Limonade','Eistee','Energydrink','Bier','Wein','Sekt',
  'Kaffee (gemahlen)','Kaffee (Bohnen)','Kaffeekapseln','Tee (Beutel)',
  'Tee (lose)','Kakao','Smoothie',
  'Salz','Pfeffer','Paprikapulver','Curry','Zimt','Oregano',
  'Basilikum','Ketchup','Senf','Mayonnaise','Sojasauce','Essig',
  'Olivenöl','Sonnenblumenöl','Rapsöl','Balsamico',
  'Schokolade','Gummibärchen','Chips','Salzstangen','Nüsse',
  'Müsliriegel','Proteinriegel','Popcorn','Cracker',
  'Bio-Milch','Bio-Eier','Bio-Gemüse','Vegane Wurst','Veganer Käse',
  'Tofu','Tempeh','Seitan','Glutenfreies Brot','Laktosefreie Milch',
  'Anfangsmilch','Folgemilch','Babybrei (Gläschen)','Kinderkeks'
] WHERE name = 'Lebensmittel';

-- Baumaterialien (133 Produkttypen)
UPDATE categories SET subcategories = ARRAY[
  'Mauerziegel','Klinker','Kalksandstein','Porenbetonstein','Hohlblockstein',
  'Leichtbetonstein','Schamottstein','Naturstein (Mauer)',
  'Fertigbeton','Estrich','Betonfertigteil','Betonblock','Betonpflaster',
  'Spritzbeton','Mörtel','Fugenmörtel','Putz (Innen)','Putz (Außen)',
  'Zement','Schnellzement',
  'Mineralwolle','Glaswolle','Steinwolle','EPS-Dämmplatte','XPS-Dämmplatte',
  'PU-Schaum (Dämmung)','Holzfaserdämmplatte','Zellulosedämmung','Hanfdämmung',
  'Schafwolldämmung','Korkdämmung','Vakuumdämmplatte','Einblasdämmung',
  'Dampfbremsfolie','Dampfsperre',
  'Dachziegel','Dachstein','Schieferplatte','Bitumenschindel',
  'Trapezblech (Dach)','Wellblech','Dachfolie','Dachpappe',
  'Dachrinne','Dachfenster','Schneefanggitter',
  'Bodenfliese','Wandfliese','Feinsteinzeug','Natursteinfliese',
  'Mosaikfliese','Terrassenplatte','Fliesenkleber','Fugenmasse',
  'Laminat','Parkett','Vinyl-Bodenbelag','Korkboden','Linoleum',
  'Teppichboden','Designboden (SPC)','Sockelleiste',
  'Spanplatte','MDF-Platte','OSB-Platte','Sperrholz','Massivholzplatte',
  'Leimholzplatte','Holzbalken','Holzlatte','Dachlatte','Konstruktionsholz',
  'Fassadenholz','Terrassendielen',
  'Kunststofffenster','Holzfenster','Alufenster','Dachfenster',
  'Innentür','Haustür','Schiebetür','Falttür','Garagentor',
  'Fensterglas','Isolierglas','Sicherheitsglas',
  'Wandfarbe (Innen)','Fassadenfarbe (Außen)','Holzlack','Metalllack',
  'Grundierung','Holzschutzlasur','Holzöl','Betonfarbe',
  'Sprühlack','Acryllack','Dispersionsfarbe','Silikatfarbe',
  'Montagekleber','Fliesenkleber','Holzleim','Silikon','Acryl-Dichtstoff',
  'Bauschaum (PU)','Klebeband (Bau)','Dichtband',
  'Kupferrohr','PVC-Rohr','PE-Rohr','Abflussrohr','Regenrinne',
  'Rohrverbinder','Rohrschelle','Siphon',
  'Stromkabel','Elektrorohr (Leerrohr)','Steckdose','Lichtschalter',
  'Sicherungskasten','FI-Schutzschalter',
  'Gipskartonplatte','Gipsfaserplatte','Trockenbau-Profil','Ständerwerk',
  'Spachtelmasse','Armierungsgewebe',
  'Pflasterstein','Rasengitterstein','Randstein','L-Stein',
  'Gabione','Zaunelement','Sichtschutzzaun'
] WHERE name = 'Baumaterialien';

-- Maschinen (141 Produkttypen)
UPDATE categories SET subcategories = ARRAY[
  'CNC-Fräsmaschine','CNC-Drehmaschine','Standbohrmaschine','Ständerbohrmaschine',
  'Bandsäge','Kreissäge','Tischkreissäge','Kappsäge','Stichsäge',
  'Metallsäge','Schleifmaschine','Bandschleifer','Tellerschleifer',
  'Hobelmaschine','Abrichthobelmaschine','Dickenhobelmaschine',
  'Drehmaschine','Fräsmaschine','Erodiermaschine','Laserschneidanlage',
  'Wasserstrahlschneidanlage','Plasmaschneidanlage',
  'Akkuschrauber','Schlagbohrmaschine','Bohrhammer','Winkelschleifer',
  'Exzenterschleifer','Schwingschleifer','Handkreissäge','Oberfräse',
  'Heißluftpistole','Schweißgerät (MIG)','Schweißgerät (WIG)','Lötstation',
  'Nivellierlaser','Multitool (oszillierend)',
  'Kolbenkompressor','Schraubenkompressor','Druckluftbehälter',
  'Pneumatikzylinder','Pneumatikventil','Druckluftschlauch',
  'Druckluft-Nagler','Druckluft-Schlagschrauber','Sandstrahlgerät',
  'Kreiselpumpe','Tauchpumpe','Schmutzwasserpumpe','Hauswasserwerk',
  'Dosierpumpe','Membranpumpe','Zahnradpumpe','Hydraulikpumpe',
  'Elektromotor','Servomotor','Schrittmotor','Getriebemotor',
  'Frequenzumrichter','Getriebe','Riemenantrieb','Kettenantrieb',
  'Dieselmotor','Benzinmotor',
  'Förderband','Rollenbahn','Kettenförderer','Hubwagen','Gabelstapler',
  'Elektrostapler','Hubarbeitsbühne','Kran (stationär)','Brückenkran',
  'Seilwinde','Aufzug (Lastenaufzug)','Paternoster',
  'Abfüllmaschine','Etikettiermaschine','Verschließmaschine',
  'Schrumpfmaschine','Kartonaufrichter','Palettierer','Folienschweißgerät',
  'Offsetdruckmaschine','Digitaldruckmaschine','Siebdruckmaschine',
  'Flexodruckmaschine','Plotter','Großformatdrucker',
  'Spritzgussmaschine','Extruder','Blasformmaschine','Thermoformmaschine',
  'Granulator','Kunststoffschweißgerät',
  'Formatkreissäge','Kantenanleimmaschine','Breitbandschleifer',
  'Vierseitenhobelmaschine','Holzspalter','Kettensäge',
  'Abkantpresse','Stanzmaschine','Biegemaschine','Walzmaschine',
  'Entgratmaschine','Poliermaschine','Härteofen',
  'Hochdruckreiniger','Industriesauger','Kehrmaschine','Scheuersaugmaschine',
  'Ultraschallreiniger',
  'Rasenmäher (Benzin)','Rasenmäher (Akku)','Mähroboter','Vertikutierer',
  'Häcksler','Laubbläser','Motorsense','Heckenschere (elektrisch)',
  'Stromgenerator (Diesel)','Stromgenerator (Benzin)','Notstromaggregat',
  'Solarmodul','Wechselrichter','Batteriespeicher (Industrie)',
  'SPS (Speicherprogrammierbare Steuerung)','HMI-Panel','Industrieroboter',
  'Cobot (kollaborativer Roboter)','Sensor (Industrie)','Aktor','Linearantrieb',
  'Koordinatenmessgerät','Härteprüfgerät','Zugprüfmaschine',
  'Oberflächenmessgerät','Endoskop (Industrie)','Thermografiekamera',
  'Oszilloskop','Multimeter'
] WHERE name = 'Maschinen';

-- ============================================
-- FERTIG
-- ============================================

SELECT 'Seed data erfolgreich eingefügt!' AS status;
