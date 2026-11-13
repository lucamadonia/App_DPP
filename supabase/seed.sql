-- ============================================
-- DPP Manager - Seed Data for Master Tables
-- ============================================
-- Führen Sie dieses SQL nach dem schema.sql aus
-- ============================================

-- ============================================
-- LÄNDER
-- ============================================

INSERT INTO countries (code, name, flag, regulations, checklists, authorities, description) VALUES
('DE', 'Deutschland', '🇩🇪', 45, 12, ARRAY['Bundesministerium für Wirtschaft und Energie', 'Bundesministerium für Umwelt, Klimaschutz, Naturschutz und nukleare Sicherheit', 'Umweltbundesamt', 'Bundesnetzagentur'], 'Größter EU-Markt mit strengen Umweltauflagen'),
('FR', 'Frankreich', '🇫🇷', 38, 10, ARRAY['Ministère de la Transition écologique', 'ADEME', 'DGCCRF'], 'Vorreiter bei Reparierbarkeits- und Haltbarkeitsindex (AGEC)'),
('AT', 'Österreich', '🇦🇹', 32, 8, ARRAY['Bundesministerium für Land- und Forstwirtschaft, Klima- und Umweltschutz, Regionen und Wasserwirtschaft', 'Umweltbundesamt'], 'Hohe Standards bei Nachhaltigkeit'),
('IT', 'Italien', '🇮🇹', 35, 9, ARRAY['Ministero dell''Ambiente e della Sicurezza Energetica', 'ISPRA', 'CONAI'], 'Fokus auf Kreislaufwirtschaft'),
('ES', 'Spanien', '🇪🇸', 30, 7, ARRAY['Ministerio para la Transición Ecológica y el Reto Demográfico', 'MITECO'], 'Wachsender Nachhaltigkeitsmarkt'),
('NL', 'Niederlande', '🇳🇱', 33, 9, ARRAY['Rijkswaterstaat', 'RIVM'], 'Führend bei Kreislaufwirtschaft'),
('BE', 'Belgien', '🇧🇪', 28, 7, ARRAY['SPF Santé publique', 'IBGE-BIM'], 'Strikte Verpackungsvorschriften'),
('PL', 'Polen', '🇵🇱', 25, 6, ARRAY['Ministerstwo Klimatu i Środowiska'], 'Aufstrebender Markt'),
('SE', 'Schweden', '🇸🇪', 40, 10, ARRAY['Naturvårdsverket', 'Kemikalieinspektionen'], 'Nachhaltigkeitspionier'),
('CH', 'Schweiz', '🇨🇭', 35, 8, ARRAY['BAFU', 'SECO'], 'Hohe Qualitätsstandards')
ON CONFLICT (code) DO NOTHING;

-- Weitere EU-Länder
INSERT INTO countries (code, name, flag, regulations, checklists, authorities, description) VALUES
('BG', 'Bulgarien', '🇧🇬', 20, 5, ARRAY['Ministerium für Umwelt und Wasser'], 'EU-Mitglied seit 2007'),
('CY', 'Zypern', '🇨🇾', 18, 4, ARRAY['Department of Environment'], 'Inselstaat im Mittelmeer'),
('CZ', 'Tschechien', '🇨🇿', 28, 7, ARRAY['Ministerstvo životního prostředí'], 'Starker Industriestandort'),
('DK', 'Dänemark', '🇩🇰', 38, 10, ARRAY['Miljøstyrelsen'], 'Vorreiter bei grüner Energie'),
('EE', 'Estland', '🇪🇪', 22, 5, ARRAY['Keskkonnaministeerium'], 'Digitaler Vorreiter'),
('FI', 'Finnland', '🇫🇮', 36, 9, ARRAY['Ympäristöministeriö'], 'Hohe Umweltstandards'),
('GR', 'Griechenland', '🇬🇷', 24, 6, ARRAY['Υπουργείο Περιβάλλοντος και Ενέργειας'], 'Fokus auf Tourismus und Landwirtschaft'),
('HR', 'Kroatien', '🇭🇷', 20, 5, ARRAY['Ministarstvo gospodarstva i održivog razvoja'], 'EU-Mitglied seit 2013'),
('HU', 'Ungarn', '🇭🇺', 25, 6, ARRAY['Energiaügyi Minisztérium'], 'Wachsender Industriestandort'),
('IE', 'Irland', '🇮🇪', 30, 8, ARRAY['Environmental Protection Agency'], 'Wichtiger Tech-Standort'),
('LT', 'Litauen', '🇱🇹', 22, 5, ARRAY['Aplinkos ministerija'], 'Baltischer EU-Staat'),
('LU', 'Luxemburg', '🇱🇺', 28, 7, ARRAY['Ministère de l''Environnement'], 'Finanz- und Verwaltungszentrum'),
('LV', 'Lettland', '🇱🇻', 21, 5, ARRAY['Vides aizsardzības un reģionālās attīstības ministrija'], 'Baltischer EU-Staat'),
('MT', 'Malta', '🇲🇹', 18, 4, ARRAY['Environment and Resources Authority'], 'Kleinster EU-Staat'),
('PT', 'Portugal', '🇵🇹', 30, 7, ARRAY['Agência Portuguesa do Ambiente'], 'Wachsender Nachhaltigkeitsmarkt'),
('RO', 'Rumänien', '🇷🇴', 22, 5, ARRAY['Ministerul Mediului'], 'EU-Mitglied seit 2007'),
('SI', 'Slowenien', '🇸🇮', 24, 6, ARRAY['Ministrstvo za okolje, podnebje in energijo', 'Ministrstvo za naravne vire in prostor'], 'Grüner Alpenstaat'),
('SK', 'Slowakei', '🇸🇰', 23, 6, ARRAY['Ministerstvo životného prostredia'], 'Starke Automobilindustrie')
ON CONFLICT (code) DO NOTHING;

-- EWR-Länder (nicht EU)
INSERT INTO countries (code, name, flag, regulations, checklists, authorities, description) VALUES
('NO', 'Norwegen', '🇳🇴', 35, 9, ARRAY['Miljødirektoratet'], 'EWR-Mitglied, hohe Umweltstandards'),
('IS', 'Island', '🇮🇸', 20, 5, ARRAY['Umhverfis-, orku- og loftslagsráðuneytið'], 'EWR-Mitglied, erneuerbare Energien'),
('LI', 'Liechtenstein', '🇱🇮', 18, 4, ARRAY['Amt für Umwelt'], 'EWR-Mitglied, Kleinstaat')
ON CONFLICT (code) DO NOTHING;

-- Wichtige Handelspartner
INSERT INTO countries (code, name, flag, regulations, checklists, authorities, description) VALUES
('GB', 'Vereinigtes Königreich', '🇬🇧', 40, 10, ARRAY['Department for Environment, Food & Rural Affairs', 'Environment Agency', 'Office for Product Safety and Standards'], 'Wichtiger Handelspartner nach Brexit'),
('US', 'Vereinigte Staaten', '🇺🇸', 35, 8, ARRAY['EPA', 'FTC', 'CPSC'], 'Größte Volkswirtschaft weltweit'),
('CN', 'China', '🇨🇳', 30, 7, ARRAY['Ministry of Ecology and Environment'], 'Größter Produktionsstandort'),
('JP', 'Japan', '🇯🇵', 32, 8, ARRAY['Ministry of the Environment'], 'Hohe Qualitäts- und Umweltstandards'),
('KR', 'Südkorea', '🇰🇷', 28, 7, ARRAY['Ministry of Environment'], 'Technologieführer in Asien'),
('IN', 'Indien', '🇮🇳', 22, 5, ARRAY['Ministry of Environment, Forest and Climate Change'], 'Wachsender Markt'),
('TR', 'Türkei', '🇹🇷', 25, 6, ARRAY['Çevre, Şehircilik ve İklim Değişikliği Bakanlığı'], 'Wichtiger Handelspartner'),
('TW', 'Taiwan', '🇹🇼', 26, 6, ARRAY['Ministry of Environment (MOENV)'], 'Halbleiter- und Elektronikproduktion')
ON CONFLICT (code) DO NOTHING;

-- Europa (nicht EU/EWR)
INSERT INTO countries (code, name, flag, regulations, checklists, authorities, description) VALUES
('AD', 'Andorra', '🇦🇩', 0, 0, '{}', 'Kleinstaat in den Pyrenäen'),
('AL', 'Albanien', '🇦🇱', 0, 0, '{}', 'EU-Beitrittskandidat auf dem Westbalkan'),
('BA', 'Bosnien und Herzegowina', '🇧🇦', 0, 0, '{}', 'Westbalkanstaat mit EU-Perspektive'),
('BY', 'Belarus', '🇧🇾', 0, 0, '{}', 'Osteuropäischer Binnenstaat'),
('GE', 'Georgien', '🇬🇪', 0, 0, '{}', 'Kaukasusrepublik mit EU-Assoziierung'),
('MD', 'Moldau', '🇲🇩', 0, 0, '{}', 'EU-Beitrittskandidat in Osteuropa'),
('ME', 'Montenegro', '🇲🇪', 0, 0, '{}', 'EU-Beitrittskandidat an der Adria'),
('MK', 'Nordmazedonien', '🇲🇰', 0, 0, '{}', 'EU-Beitrittskandidat auf dem Westbalkan'),
('MC', 'Monaco', '🇲🇨', 0, 0, '{}', 'Stadtstaat an der Côte d''Azur'),
('RS', 'Serbien', '🇷🇸', 0, 0, '{}', 'EU-Beitrittskandidat auf dem Westbalkan'),
('RU', 'Russland', '🇷🇺', 0, 0, '{}', 'Größtes Land der Welt'),
('SM', 'San Marino', '🇸🇲', 0, 0, '{}', 'Kleinstaat in Italien'),
('UA', 'Ukraine', '🇺🇦', 0, 0, '{}', 'EU-Beitrittskandidat in Osteuropa'),
('VA', 'Vatikanstadt', '🇻🇦', 0, 0, '{}', 'Kleinster Staat der Welt'),
('XK', 'Kosovo', '🇽🇰', 0, 0, '{}', 'Westbalkanstaat mit EU-Perspektive')
ON CONFLICT (code) DO NOTHING;

-- Afrika
INSERT INTO countries (code, name, flag, regulations, checklists, authorities, description) VALUES
('DZ', 'Algerien', '🇩🇿', 0, 0, '{}', 'Größter afrikanischer Staat'),
('AO', 'Angola', '🇦🇴', 0, 0, '{}', 'Rohstoffreicher Staat im südlichen Afrika'),
('BJ', 'Benin', '🇧🇯', 0, 0, '{}', 'Westafrikanischer Küstenstaat'),
('BW', 'Botswana', '🇧🇼', 0, 0, '{}', 'Stabile Demokratie im südlichen Afrika'),
('BF', 'Burkina Faso', '🇧🇫', 0, 0, '{}', 'Westafrikanischer Binnenstaat'),
('BI', 'Burundi', '🇧🇮', 0, 0, '{}', 'Ostafrikanischer Binnenstaat'),
('CV', 'Cabo Verde', '🇨🇻', 0, 0, '{}', 'Inselstaat im Atlantik vor Westafrika'),
('CM', 'Kamerun', '🇨🇲', 0, 0, '{}', 'Zentralafrikanischer Staat am Golf von Guinea'),
('CF', 'Zentralafrikanische Republik', '🇨🇫', 0, 0, '{}', 'Binnenstaat in Zentralafrika'),
('TD', 'Tschad', '🇹🇩', 0, 0, '{}', 'Binnenstaat in Zentralafrika'),
('KM', 'Komoren', '🇰🇲', 0, 0, '{}', 'Inselstaat im Indischen Ozean'),
('CG', 'Kongo', '🇨🇬', 0, 0, '{}', 'Zentralafrikanischer Staat'),
('CD', 'Demokratische Republik Kongo', '🇨🇩', 0, 0, '{}', 'Rohstoffreicher Staat in Zentralafrika'),
('CI', 'Elfenbeinküste', '🇨🇮', 0, 0, '{}', 'Größter Kakaoproduzent weltweit'),
('DJ', 'Dschibuti', '🇩🇯', 0, 0, '{}', 'Strategisch gelegener Staat am Horn von Afrika'),
('EG', 'Ägypten', '🇪🇬', 0, 0, '{}', 'Bevölkerungsreichster arabischer Staat'),
('GQ', 'Äquatorialguinea', '🇬🇶', 0, 0, '{}', 'Ölreicher Staat in Zentralafrika'),
('ER', 'Eritrea', '🇪🇷', 0, 0, '{}', 'Staat am Horn von Afrika'),
('SZ', 'Eswatini', '🇸🇿', 0, 0, '{}', 'Kleiner Binnenstaat im südlichen Afrika'),
('ET', 'Äthiopien', '🇪🇹', 0, 0, '{}', 'Bevölkerungsreichster Binnenstaat Afrikas'),
('GA', 'Gabun', '🇬🇦', 0, 0, '{}', 'Ölreicher Staat in Zentralafrika'),
('GM', 'Gambia', '🇬🇲', 0, 0, '{}', 'Kleinster Staat auf dem afrikanischen Festland'),
('GH', 'Ghana', '🇬🇭', 0, 0, '{}', 'Westafrikanischer Küstenstaat'),
('GN', 'Guinea', '🇬🇳', 0, 0, '{}', 'Bauxitreicher Staat in Westafrika'),
('GW', 'Guinea-Bissau', '🇬🇼', 0, 0, '{}', 'Westafrikanischer Küstenstaat'),
('KE', 'Kenia', '🇰🇪', 0, 0, '{}', 'Wirtschaftszentrum Ostafrikas'),
('LS', 'Lesotho', '🇱🇸', 0, 0, '{}', 'Gebirgiger Binnenstaat im südlichen Afrika'),
('LR', 'Liberia', '🇱🇷', 0, 0, '{}', 'Westafrikanischer Küstenstaat'),
('LY', 'Libyen', '🇱🇾', 0, 0, '{}', 'Ölreicher Staat in Nordafrika'),
('MG', 'Madagaskar', '🇲🇬', 0, 0, '{}', 'Viertgrößte Insel der Welt'),
('MW', 'Malawi', '🇲🇼', 0, 0, '{}', 'Ostafrikanischer Binnenstaat'),
('ML', 'Mali', '🇲🇱', 0, 0, '{}', 'Westafrikanischer Binnenstaat'),
('MR', 'Mauretanien', '🇲🇷', 0, 0, '{}', 'Westafrikanischer Wüstenstaat'),
('MU', 'Mauritius', '🇲🇺', 0, 0, '{}', 'Inselstaat im Indischen Ozean'),
('MA', 'Marokko', '🇲🇦', 0, 0, '{}', 'Nordafrikanischer Staat an der Meerenge von Gibraltar'),
('MZ', 'Mosambik', '🇲🇿', 0, 0, '{}', 'Ostafrikanischer Küstenstaat'),
('NA', 'Namibia', '🇳🇦', 0, 0, '{}', 'Rohstoffreicher Staat im südlichen Afrika'),
('NE', 'Niger', '🇳🇪', 0, 0, '{}', 'Westafrikanischer Binnenstaat'),
('NG', 'Nigeria', '🇳🇬', 0, 0, '{}', 'Bevölkerungsreichster Staat Afrikas'),
('RW', 'Ruanda', '🇷🇼', 0, 0, '{}', 'Ostafrikanischer Binnenstaat'),
('ST', 'São Tomé und Príncipe', '🇸🇹', 0, 0, '{}', 'Inselstaat im Golf von Guinea'),
('SN', 'Senegal', '🇸🇳', 0, 0, '{}', 'Westafrikanischer Küstenstaat'),
('SC', 'Seychellen', '🇸🇨', 0, 0, '{}', 'Inselstaat im Indischen Ozean'),
('SL', 'Sierra Leone', '🇸🇱', 0, 0, '{}', 'Westafrikanischer Küstenstaat'),
('SO', 'Somalia', '🇸🇴', 0, 0, '{}', 'Staat am Horn von Afrika'),
('ZA', 'Südafrika', '🇿🇦', 0, 0, '{}', 'Größte Volkswirtschaft Afrikas'),
('SS', 'Südsudan', '🇸🇸', 0, 0, '{}', 'Jüngster Staat der Welt'),
('SD', 'Sudan', '🇸🇩', 0, 0, '{}', 'Staat in Nordostafrika'),
('TZ', 'Tansania', '🇹🇿', 0, 0, '{}', 'Ostafrikanischer Küstenstaat'),
('TG', 'Togo', '🇹🇬', 0, 0, '{}', 'Westafrikanischer Küstenstaat'),
('TN', 'Tunesien', '🇹🇳', 0, 0, '{}', 'Nordafrikanischer Mittelmeeranrainer'),
('UG', 'Uganda', '🇺🇬', 0, 0, '{}', 'Ostafrikanischer Binnenstaat'),
('ZM', 'Sambia', '🇿🇲', 0, 0, '{}', 'Kupferreicher Binnenstaat im südlichen Afrika'),
('ZW', 'Simbabwe', '🇿🇼', 0, 0, '{}', 'Binnenstaat im südlichen Afrika')
ON CONFLICT (code) DO NOTHING;

-- Asien (ohne CN, JP, KR, IN, TR, TW)
INSERT INTO countries (code, name, flag, regulations, checklists, authorities, description) VALUES
('AF', 'Afghanistan', '🇦🇫', 0, 0, '{}', 'Binnenstaat in Zentralasien'),
('AM', 'Armenien', '🇦🇲', 0, 0, '{}', 'Kaukasusrepublik'),
('AZ', 'Aserbaidschan', '🇦🇿', 0, 0, '{}', 'Kaukasusrepublik am Kaspischen Meer'),
('BH', 'Bahrain', '🇧🇭', 0, 0, '{}', 'Inselstaat im Persischen Golf'),
('BD', 'Bangladesch', '🇧🇩', 0, 0, '{}', 'Großer Textilproduzent in Südasien'),
('BT', 'Bhutan', '🇧🇹', 0, 0, '{}', 'Himalaya-Königreich'),
('BN', 'Brunei', '🇧🇳', 0, 0, '{}', 'Sultanat auf Borneo'),
('KH', 'Kambodscha', '🇰🇭', 0, 0, '{}', 'Südostasiatischer Staat'),
('ID', 'Indonesien', '🇮🇩', 0, 0, '{}', 'Größter Inselstaat der Welt'),
('IQ', 'Irak', '🇮🇶', 0, 0, '{}', 'Ölreicher Staat im Nahen Osten'),
('IR', 'Iran', '🇮🇷', 0, 0, '{}', 'Staat im Nahen Osten'),
('IL', 'Israel', '🇮🇱', 0, 0, '{}', 'Technologiestandort im Nahen Osten'),
('JO', 'Jordanien', '🇯🇴', 0, 0, '{}', 'Staat im Nahen Osten'),
('KZ', 'Kasachstan', '🇰🇿', 0, 0, '{}', 'Größter Binnenstaat der Welt'),
('KW', 'Kuwait', '🇰🇼', 0, 0, '{}', 'Ölreicher Golfstaat'),
('KG', 'Kirgisistan', '🇰🇬', 0, 0, '{}', 'Zentralasiatischer Binnenstaat'),
('LA', 'Laos', '🇱🇦', 0, 0, '{}', 'Südostasiatischer Binnenstaat'),
('LB', 'Libanon', '🇱🇧', 0, 0, '{}', 'Mittelmeeranrainer im Nahen Osten'),
('MY', 'Malaysia', '🇲🇾', 0, 0, '{}', 'Südostasiatischer Industriestaat'),
('MV', 'Malediven', '🇲🇻', 0, 0, '{}', 'Inselstaat im Indischen Ozean'),
('MN', 'Mongolei', '🇲🇳', 0, 0, '{}', 'Zentralasiatischer Binnenstaat'),
('MM', 'Myanmar', '🇲🇲', 0, 0, '{}', 'Südostasiatischer Staat'),
('NP', 'Nepal', '🇳🇵', 0, 0, '{}', 'Himalaya-Staat in Südasien'),
('KP', 'Nordkorea', '🇰🇵', 0, 0, '{}', 'Ostasiatischer Staat'),
('OM', 'Oman', '🇴🇲', 0, 0, '{}', 'Sultanat auf der Arabischen Halbinsel'),
('PK', 'Pakistan', '🇵🇰', 0, 0, '{}', 'Bevölkerungsreicher Staat in Südasien'),
('PS', 'Palästina', '🇵🇸', 0, 0, '{}', 'Staat im Nahen Osten'),
('PH', 'Philippinen', '🇵🇭', 0, 0, '{}', 'Südostasiatischer Inselstaat'),
('QA', 'Katar', '🇶🇦', 0, 0, '{}', 'Gasreicher Golfstaat'),
('SA', 'Saudi-Arabien', '🇸🇦', 0, 0, '{}', 'Größter Staat auf der Arabischen Halbinsel'),
('SG', 'Singapur', '🇸🇬', 0, 0, '{}', 'Internationales Handels- und Finanzzentrum'),
('LK', 'Sri Lanka', '🇱🇰', 0, 0, '{}', 'Inselstaat im Indischen Ozean'),
('SY', 'Syrien', '🇸🇾', 0, 0, '{}', 'Staat im Nahen Osten'),
('TJ', 'Tadschikistan', '🇹🇯', 0, 0, '{}', 'Zentralasiatischer Binnenstaat'),
('TH', 'Thailand', '🇹🇭', 0, 0, '{}', 'Südostasiatischer Industriestaat'),
('TL', 'Timor-Leste', '🇹🇱', 0, 0, '{}', 'Inselstaat in Südostasien'),
('TM', 'Turkmenistan', '🇹🇲', 0, 0, '{}', 'Zentralasiatischer Binnenstaat'),
('AE', 'Vereinigte Arabische Emirate', '🇦🇪', 0, 0, '{}', 'Handels- und Finanzzentrum am Persischen Golf'),
('UZ', 'Usbekistan', '🇺🇿', 0, 0, '{}', 'Bevölkerungsreichster zentralasiatischer Staat'),
('VN', 'Vietnam', '🇻🇳', 0, 0, '{}', 'Wachsender Produktionsstandort in Südostasien'),
('YE', 'Jemen', '🇾🇪', 0, 0, '{}', 'Staat auf der Arabischen Halbinsel')
ON CONFLICT (code) DO NOTHING;

-- Amerika (ohne US)
INSERT INTO countries (code, name, flag, regulations, checklists, authorities, description) VALUES
('AG', 'Antigua und Barbuda', '🇦🇬', 0, 0, '{}', 'Karibischer Inselstaat'),
('AR', 'Argentinien', '🇦🇷', 0, 0, '{}', 'Zweitgrößter Staat Südamerikas'),
('BS', 'Bahamas', '🇧🇸', 0, 0, '{}', 'Karibischer Inselstaat'),
('BB', 'Barbados', '🇧🇧', 0, 0, '{}', 'Karibischer Inselstaat'),
('BZ', 'Belize', '🇧🇿', 0, 0, '{}', 'Zentralamerikanischer Küstenstaat'),
('BO', 'Bolivien', '🇧🇴', 0, 0, '{}', 'Südamerikanischer Binnenstaat'),
('BR', 'Brasilien', '🇧🇷', 0, 0, '{}', 'Größter Staat Südamerikas'),
('CA', 'Kanada', '🇨🇦', 0, 0, '{}', 'Zweitgrößter Staat der Welt'),
('CL', 'Chile', '🇨🇱', 0, 0, '{}', 'Südamerikanischer Pazifikstaat'),
('CO', 'Kolumbien', '🇨🇴', 0, 0, '{}', 'Viertgrößter Staat Südamerikas'),
('CR', 'Costa Rica', '🇨🇷', 0, 0, '{}', 'Zentralamerikanischer Staat mit Fokus auf Ökotourismus'),
('CU', 'Kuba', '🇨🇺', 0, 0, '{}', 'Größter karibischer Inselstaat'),
('DM', 'Dominica', '🇩🇲', 0, 0, '{}', 'Karibischer Inselstaat'),
('DO', 'Dominikanische Republik', '🇩🇴', 0, 0, '{}', 'Karibischer Staat auf Hispaniola'),
('EC', 'Ecuador', '🇪🇨', 0, 0, '{}', 'Südamerikanischer Pazifikstaat am Äquator'),
('SV', 'El Salvador', '🇸🇻', 0, 0, '{}', 'Kleinster zentralamerikanischer Staat'),
('GD', 'Grenada', '🇬🇩', 0, 0, '{}', 'Karibischer Inselstaat'),
('GT', 'Guatemala', '🇬🇹', 0, 0, '{}', 'Bevölkerungsreichster zentralamerikanischer Staat'),
('GY', 'Guyana', '🇬🇾', 0, 0, '{}', 'Südamerikanischer Staat an der Karibikküste'),
('HT', 'Haiti', '🇭🇹', 0, 0, '{}', 'Karibischer Staat auf Hispaniola'),
('HN', 'Honduras', '🇭🇳', 0, 0, '{}', 'Zentralamerikanischer Staat'),
('JM', 'Jamaika', '🇯🇲', 0, 0, '{}', 'Karibischer Inselstaat'),
('MX', 'Mexiko', '🇲🇽', 0, 0, '{}', 'Drittgrößter Staat Nordamerikas'),
('NI', 'Nicaragua', '🇳🇮', 0, 0, '{}', 'Größter zentralamerikanischer Staat'),
('PA', 'Panama', '🇵🇦', 0, 0, '{}', 'Zentralamerikanischer Staat am Panamakanal'),
('PY', 'Paraguay', '🇵🇾', 0, 0, '{}', 'Südamerikanischer Binnenstaat'),
('PE', 'Peru', '🇵🇪', 0, 0, '{}', 'Südamerikanischer Pazifikstaat'),
('KN', 'St. Kitts und Nevis', '🇰🇳', 0, 0, '{}', 'Kleinster Staat Amerikas'),
('LC', 'St. Lucia', '🇱🇨', 0, 0, '{}', 'Karibischer Inselstaat'),
('VC', 'St. Vincent und die Grenadinen', '🇻🇨', 0, 0, '{}', 'Karibischer Inselstaat'),
('SR', 'Suriname', '🇸🇷', 0, 0, '{}', 'Südamerikanischer Staat an der Karibikküste'),
('TT', 'Trinidad und Tobago', '🇹🇹', 0, 0, '{}', 'Karibischer Inselstaat'),
('UY', 'Uruguay', '🇺🇾', 0, 0, '{}', 'Südamerikanischer Staat am Río de la Plata'),
('VE', 'Venezuela', '🇻🇪', 0, 0, '{}', 'Ölreicher Staat in Südamerika')
ON CONFLICT (code) DO NOTHING;

-- Ozeanien
INSERT INTO countries (code, name, flag, regulations, checklists, authorities, description) VALUES
('AU', 'Australien', '🇦🇺', 0, 0, '{}', 'Größter Staat in Ozeanien'),
('FJ', 'Fidschi', '🇫🇯', 0, 0, '{}', 'Pazifischer Inselstaat'),
('KI', 'Kiribati', '🇰🇮', 0, 0, '{}', 'Pazifischer Inselstaat'),
('MH', 'Marshallinseln', '🇲🇭', 0, 0, '{}', 'Pazifischer Inselstaat'),
('FM', 'Mikronesien', '🇫🇲', 0, 0, '{}', 'Pazifischer Inselstaat'),
('NR', 'Nauru', '🇳🇷', 0, 0, '{}', 'Kleinster Inselstaat der Welt'),
('NZ', 'Neuseeland', '🇳🇿', 0, 0, '{}', 'Pazifischer Staat mit hohen Umweltstandards'),
('PW', 'Palau', '🇵🇼', 0, 0, '{}', 'Pazifischer Inselstaat'),
('PG', 'Papua-Neuguinea', '🇵🇬', 0, 0, '{}', 'Pazifischer Inselstaat'),
('WS', 'Samoa', '🇼🇸', 0, 0, '{}', 'Pazifischer Inselstaat'),
('SB', 'Salomonen', '🇸🇧', 0, 0, '{}', 'Pazifischer Inselstaat'),
('TO', 'Tonga', '🇹🇴', 0, 0, '{}', 'Pazifisches Königreich'),
('TV', 'Tuvalu', '🇹🇻', 0, 0, '{}', 'Kleinster pazifischer Inselstaat'),
('VU', 'Vanuatu', '🇻🇺', 0, 0, '{}', 'Pazifischer Inselstaat')
ON CONFLICT (code) DO NOTHING;

-- Wichtige Territorien
INSERT INTO countries (code, name, flag, regulations, checklists, authorities, description) VALUES
('HK', 'Hongkong', '🇭🇰', 0, 0, '{}', 'Sonderverwaltungszone Chinas, internationales Handelszentrum'),
('MO', 'Macau', '🇲🇴', 0, 0, '{}', 'Sonderverwaltungszone Chinas'),
('PR', 'Puerto Rico', '🇵🇷', 0, 0, '{}', 'US-Außengebiet in der Karibik'),
('GI', 'Gibraltar', '🇬🇮', 0, 0, '{}', 'Britisches Überseegebiet an der Südspitze Spaniens'),
('GL', 'Grönland', '🇬🇱', 0, 0, '{}', 'Autonomes Territorium Dänemarks'),
('FO', 'Färöer', '🇫🇴', 0, 0, '{}', 'Autonomes Territorium Dänemarks im Nordatlantik')
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
-- NATIONALE REGULIERUNGEN
-- ============================================
-- Rechtsstand geprüft: 2026-11-10. Quelle je Eintrag als Kommentar.
-- Die Tabelle hat kein Status-Feld; ersetzte Gesetze werden daher nicht mehr eingespielt:
--   VerpackG (2019) -> abgelöst durch VerpackDG am 12.08.2026
--   BattG (2009)    -> abgelöst durch BattDG am 07.10.2025

INSERT INTO national_regulations (country_code, name, description, category, mandatory, effective_date, authority, penalties, products, link) VALUES
-- Quelle: https://www.verpackungsregister.org/hilfe/rollen-pflichten
--         https://www.umweltpakt.bayern.de/abfall/recht/bund/520/verpackdg-verpackungsrecht-durchfuehrungsgesetz (Gesetz vom 13.07.2026, BGBl. 2026 I)
('DE', 'Verpackungsrecht-Durchführungsgesetz (VerpackDG)', 'Führt seit 12.08.2026 die EU-Verpackungsverordnung (EU) 2025/40 (PPWR) in Deutschland durch und löst das Verpackungsgesetz (VerpackG, 2019) ab. Registrierung weiterhin im Verpackungsregister LUCID der ZSVR (zugleich nationales PPWR-Register); bestehende Registrierungen bleiben gültig, Angaben wie Markennamen, Verpackungsarten oder Bevollmächtigter sind ggf. anzupassen. Systembeteiligung für Verpackungen, die beim privaten Endverbraucher anfallen. Für Verpackungen außerhalb der Systembeteiligung dürfen Hersteller bis 31.12.2027 ohne Zulassung durch die ZSVR in Verkehr bringen (sonstige Organisationen für Herstellerverantwortung bis 31.10.2027); danach ist eine kostenpflichtige Zulassung erforderlich.', 'Recycling', true, '2026-08-12', 'Zentrale Stelle Verpackungsregister (ZSVR)', 'Bußgelder und Vertriebsverbot bei fehlender Registrierung oder Systembeteiligung', ARRAY['Verpackungen'], 'https://www.verpackungsregister.org/hilfe/rollen-pflichten'),

-- Quelle: https://www.ihk.de/freiburg/unternehmen-beraten/umwelt-energie-und-klimaschutz/umwelt-und-ressourcen/abfall-und-kreislaufwirtschaft/elektrog-ueberblick-6861386
('DE', 'Elektro- und Elektronikgerätegesetz (ElektroG)', 'Registrierung, Rücknahme und Entsorgung von Elektro- und Elektronikgeräten (WEEE). Novelle Ende November 2025 verkündet, überwiegend in Kraft seit 01.01.2026: neues Sammelstellen-Logo (Stecker-Logo) für Rücknahmestellen der Hersteller ab Januar 2026; ab 01.07.2026 Anzeige im Laden und online (§ 18a) sowie unentgeltliche Rücknahme von E-Zigaretten und Tabakerhitzern durch alle Verkäufer; erweiterte Hinweise zu Risiken lithiumhaltiger Batterien; Hersteller veröffentlichen Sammel- und Recyclingquoten auf ihrer Website. Marktplätze und Fulfilment-Dienstleister dürfen nur registrierte Hersteller bedienen.', 'Recycling', true, '2005-08-16', 'Stiftung Elektro-Altgeräte Register (stiftung ear) / Umweltbundesamt', 'Bis zu 100.000 EUR', ARRAY['Elektronik'], 'https://www.stiftung-ear.de'),

-- Quelle: https://www.ihk.de/koeln/hauptnavigation/umwelt-energie-nachhaltigkeit/umwelt/neues-batterierecht-durchfuehrungsgesetz-battdg--6803718
--         https://www.umweltbundesamt.de/themen/batterieverordnung-uba-aktualisiert-beleihung-der
('DE', 'Batterierecht-Durchführungsgesetz (BattDG)', 'Seit 07.10.2025 in Kraft; ersetzt das Batteriegesetz (BattG) und führt die EU-Batterieverordnung (EU) 2023/1542 in Deutschland durch (deren abfallrechtliche Vorgaben gelten unmittelbar seit 18.08.2025). Herstellerregistrierung bei der stiftung ear, erweiterte Herstellerverantwortung, Rücknahme- und Informationspflichten.', 'Recycling', true, '2025-10-07', 'Stiftung Elektro-Altgeräte Register (stiftung ear)', 'Bußgelder, Vertriebsverbot oder Widerruf der Registrierung', ARRAY['Batterien'], 'https://www.stiftung-ear.de'),

-- Quelle: https://www.ihk.de/dresden/servicenavigation/presse-publikationen/meldungen/lieferkettengesetz-bafa-stellt-pruefung-von-berichten-ein-6751146
--         https://dserver.bundestag.de/btd/21/024/2102474.pdf
('DE', 'Lieferkettensorgfaltspflichtengesetz (LkSG)', 'Menschenrechtliche und umweltbezogene Sorgfaltspflichten in der Lieferkette für Unternehmen ab 1.000 Beschäftigten im Inland (seit 2024). Das BAFA prüft keine Berichte mehr; der Regierungsentwurf (BT-Drs. 21/2474) sieht die rückwirkende Streichung der Berichtspflicht und weniger Bußgeldtatbestände vor, war beim letzten Prüfstand aber noch nicht verkündet. Die Sorgfaltspflichten selbst gelten unverändert.', 'Nachhaltigkeit', true, '2023-01-01', 'BAFA', 'Bis zu 8 Mio. EUR bzw. bis zu 2% des durchschnittlichen Jahresumsatzes', ARRAY['Alle'], 'https://www.bafa.de/lieferketten'),

-- Quelle: https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000041553759
('FR', 'Loi Anti-Gaspillage (AGEC)', 'Loi n° 2020-105 vom 10.02.2020 gegen Verschwendung und für die Kreislaufwirtschaft: erweiterte Herstellerverantwortung (REP) für zahlreiche Produktgruppen, Verbot der Vernichtung unverkaufter Non-Food-Waren, Verbraucherinformation zu Umwelteigenschaften, Sortierkennzeichnung (Triman/Info-tri) sowie Reparierbarkeits- und Haltbarkeitsindex.', 'Recycling', true, '2020-02-10', 'Ministère de la Transition écologique / ADEME', 'Variable Strafen', ARRAY['Elektronik', 'Textilien', 'Möbel', 'Verpackungen'], 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000041553759'),

-- Quelle: https://www.ecologie.gouv.fr/politiques-publiques/indice-durabilite
('FR', 'Indice de réparabilité', 'Reparierbarkeitsindex (0–10) für bestimmte Elektro- und Elektronikgeräte. Wird schrittweise durch das Indice de durabilité ersetzt (Fernseher seit 08.01.2025, Waschmaschinen seit 08.04.2025); Smartphones und Tablets fallen seit Juni 2025 unter das EU-Energielabel mit Reparierbarkeitsklasse.', 'Kennzeichnung', true, '2021-01-01', 'DGCCRF', 'Bis zu 15.000 EUR', ARRAY['Elektronik'], 'https://www.ecologie.gouv.fr/politiques-publiques/indice-durabilite'),

-- Quelle: https://www.ecologie.gouv.fr/politiques-publiques/indice-durabilite
('FR', 'Indice de durabilité', 'Haltbarkeitsindex (0–10), kombiniert Reparierbarkeit und Zuverlässigkeit; ersetzt das Indice de réparabilité für Fernseher (seit 08.01.2025) und Waschmaschinen (Front- und Toplader, seit 08.04.2025). Berechnung durch Hersteller/Importeure, Anzeige am Verkaufsort und online; weitere Gerätekategorien sollen folgen.', 'Kennzeichnung', true, '2025-01-08', 'DGCCRF', 'Bis zu 15.000 EUR', ARRAY['Elektronik', 'Haushaltsgeräte'], 'https://www.ecologie.gouv.fr/politiques-publiques/indice-durabilite'),

-- Quelle: https://www.adelphe.fr/sites/default/files/Documents/2025-10/adelphe_guide_info-tri_fr.pdf
--         https://cms.law/en/fra/news-information/logo-triman-la-france-devant-la-cjue
('FR', 'Triman & Info-tri', 'Pflicht-Sortierkennzeichnung (Triman-Logo und Info-tri-Sortierhinweis) für Haushaltsverpackungen und weitere REP-Produkte, verpflichtend seit 01.01.2022. Bleibt trotz PPWR bis zur Anwendung der harmonisierten EU-Sortierkennzeichnung verpflichtend; die EU-Kommission hat Frankreich wegen des Triman vor dem EuGH verklagt (keine aufschiebende Wirkung). Dematerialisierung bei sehr kleinen Verpackungen möglich.', 'Kennzeichnung', true, '2022-01-01', 'Ministère de la Transition écologique / ADEME', 'Verwaltungssanktionen nach Code de l''environnement', ARRAY['Verpackungen', 'Textilien', 'Elektronik', 'Möbel'], 'https://www.adelphe.fr/sites/default/files/Documents/2025-10/adelphe_guide_info-tri_fr.pdf'),

-- Quelle: https://www.lcalex.it/wp-content/uploads/2021/08/ETICHETTATURA-AMBIENTALE-DEGLI-IMBALLAGGI.pdf
--         https://www.certifico.com/ambiente/documenti-ambiente/documenti-ambiente-enti/linea-guida-etichettatura-ambientale-imballaggi
--         https://certifico.com/ambiente/news-ambiente/decreto-mase-n-360-del-28-settembre-2022
('IT', 'Etichettatura ambientale degli imballaggi', 'Umweltkennzeichnungspflicht für alle Verpackungen nach Art. 219 Abs. 5 D.Lgs. 152/2006 (geändert durch D.Lgs. 116/2020), operativ seit 01.01.2023: Materialcode nach Entscheidung 97/129/EG, für Verbraucherverpackungen zusätzlich Entsorgungshinweise; verbindliche Leitlinien per DM MASE Nr. 360 vom 28.09.2022 (ersetzt DM Nr. 114 vom 16.03.2022) und CONAI-Leitfaden; digitale Kennzeichnung (App/QR-Code) zulässig. Gilt neben der PPWR fort, bis deren harmonisierte Kennzeichnung anwendbar ist.', 'Kennzeichnung', true, '2023-01-01', 'Ministero dell''Ambiente e della Sicurezza Energetica (MASE) / CONAI', '', ARRAY['Verpackungen'], 'https://www.certifico.com/ambiente/documenti-ambiente/documenti-ambiente-enti/linea-guida-etichettatura-ambientale-imballaggi'),

-- Quelle: https://www.miteco.gob.es/es/calidad-y-evaluacion-ambiental/temas/prevencion-y-gestion-residuos/registro-productores-producto/registro-productores-producto-seccion-envases.html
--         https://www.miteco.gob.es/content/dam/miteco/es/calidad-y-evaluacion-ambiental/sgecocir/envases/nota%20aclaratoria%20sobre%20la%20aplicaci%C3%B3n%20del%20Reglamento%202025-40%20y%20sus%20efectos%20sobre%20el%20RD%201055-2022.pdf
('ES', 'Real Decreto 1055/2022 de envases y residuos de envases', 'Spanische Verpackungsverordnung mit erweiterter Herstellerverantwortung für Haushalts-, Gewerbe- und Industrieverpackungen. Eintragung im Registro de Productores de Producto (Sección envases) und jährliche Meldung der in Verkehr gebrachten Verpackungen (Daten 2025: 02.01.–02.04.2026). Seit 12.08.2026 hat die PPWR (EU) 2025/40 Vorrang vor unvereinbarem nationalem Recht, u. a. gilt deren Herstellerdefinition.', 'Recycling', true, '2022-12-29', 'Ministerio para la Transición Ecológica y el Reto Demográfico (MITECO)', '', ARRAY['Verpackungen'], 'https://www.miteco.gob.es/es/calidad-y-evaluacion-ambiental/temas/prevencion-y-gestion-residuos/registro-productores-producto/registro-productores-producto-seccion-envases.html'),

-- Quelle: https://www.bmluk.gv.at/themen/abfall-und-kreislaufwirtschaft/abfallsammlung-behandlung-und-verbringung/verpackungen/merkblatt-verpackungsvo.html
('AT', 'Verpackungsverordnung 2014 / AWG 2002', 'Lizenzierungspflicht (Teilnahme an einem Sammel- und Verwertungssystem, § 13g AWG 2002) für Haushalts- und gewerbliche Verpackungen. Seit 12.08.2026 gilt die PPWR (EU) 2025/40; österreichische Regelungen bleiben bestehen, soweit mit der PPWR vereinbar. Anpassungen über geplante Novellen von AWG 2002 und Verpackungsverordnung 2014; bestehende Sammelsysteme und Meldewege bleiben vorerst aufrecht.', 'Recycling', true, '2015-01-01', 'Bundesministerium für Land- und Forstwirtschaft, Klima- und Umweltschutz, Regionen und Wasserwirtschaft (BMLUK)', '', ARRAY['Verpackungen'], 'https://www.bmluk.gv.at/themen/abfall-und-kreislaufwirtschaft/abfallsammlung-behandlung-und-verbringung/verpackungen/merkblatt-verpackungsvo.html'),

-- Quelle: https://www.verpact.nl/en/news/nieuws-netherlands-belgium-france-and-luxembourg-join-forces-more-sustainable-packaging-europe
('NL', 'Besluit beheer verpakkingen 2014', 'Niederländische Verpackungsverordnung mit Herstellerverantwortung; Melde- und Beitragspflicht über Verpact (ehemals Afvalfonds Verpakkingen). Seit 12.08.2026 gilt ergänzend die PPWR (EU) 2025/40.', 'Recycling', true, '2015-01-01', 'Verpact / Inspectie Leefomgeving en Transport (ILT)', '', ARRAY['Verpackungen'], 'https://www.verpact.nl'),

-- Quelle: https://www.gov.uk/government/news/preparing-for-pepr-year-1-invoicing-key-information-for-liable-producers
('GB', 'Extended Producer Responsibility for Packaging (pEPR)', 'Producer Responsibility Obligations (Packaging and Packaging Waste) Regulations 2024: Datenmeldung über Report Packaging Data, Gebühren an PackUK. Erste Gebührenbescheide (Notice of Liability) im Oktober 2025 für das Jahr 01.04.2025–31.03.2026, Zahlung binnen 50 Tagen oder in Raten; recyclingbasierte Gebührenmodulation ab 2026.', 'Recycling', true, '2025-01-01', 'Defra / PackUK / Environment Agency', '', ARRAY['Verpackungen'], 'https://www.gov.uk/government/news/preparing-for-pepr-year-1-invoicing-key-information-for-liable-producers'),

-- Quelle: https://www.bakermckenzie.com/en/insight/publications/resources/product-risk-radar-articles/product-security-telecommunications-infrastructure-regime
('GB', 'Product Security and Telecommunications Infrastructure (PSTI) Regime', 'Cybersicherheits-Mindestanforderungen für vernetzbare Verbraucherprodukte (Teil 1 PSTI Act 2022 und Security Requirements Regulations 2023), anwendbar seit 29.04.2024: keine universellen Standardpasswörter, Meldestelle für Sicherheitslücken, Angabe des Mindestzeitraums für Sicherheitsupdates, Statement of Compliance.', 'Produktsicherheit', true, '2024-04-29', 'Office for Product Safety and Standards (OPSS)', 'Bis zu 10 Mio. GBP oder 4% des weltweiten Umsatzes', ARRAY['Elektronik', 'Smart Home', 'Spielzeug'], 'https://www.legislation.gov.uk/ukpga/2022/46'),

-- Quelle: https://www.gov.uk/government/publications/continued-recognition-of-eu-requirements-including-ce-marking-for-placing-products-on-the-gb-market/continued-recognition-of-eu-requirements-including-ce-marking-for-placing-products-on-the-gb-market
--         https://www.pinsentmasons.com/out-law/news/deadline-new-ukca-product-marking-extended-indefinitely
--         https://www.gov.uk/government/news/government-confirms-indefinite-recognition-of-ce-marked-medical-devices (21.10.2026)
('GB', 'UKCA- / CE-Kennzeichnung (Großbritannien)', 'Konformitätskennzeichnung für den Markt in Großbritannien: Die CE-Kennzeichnung wird für die meisten Produktbereiche (u. a. Spielzeug, Maschinen, PSA, Gasgeräte, Messgeräte, Aerosole) unbefristet anerkannt; alternativ UKCA. Für Medizinprodukte wurde im Oktober 2026 die unbefristete Anerkennung CE-gekennzeichneter Produkte angekündigt. In Nordirland gelten gesonderte Regeln.', 'Kennzeichnung', true, '2024-10-01', 'Office for Product Safety and Standards (OPSS)', '', ARRAY['Alle'], 'https://www.gov.uk/government/publications/continued-recognition-of-eu-requirements-including-ce-marking-for-placing-products-on-the-gb-market/continued-recognition-of-eu-requirements-including-ce-marking-for-placing-products-on-the-gb-market'),

-- Quelle: https://www.omm.com/insights/alerts-publications/2026-plastics-epr-packaging-rules-update-what-sb-54-sb-343-state-reporting-deadlines-prc-laws-the-eu-ppwr-mean-for-producers-retailers/
--         https://www.venable.com/insights/publications/2026/05/california-finalizes-long-awaited-epr-regulations
('US', 'California SB 54 (Plastic Pollution Prevention and Packaging Producer Responsibility Act)', 'Erweiterte Herstellerverantwortung für Einwegverpackungen und Kunststoff-Einweg-Lebensmittelgeschirr in Kalifornien; PRO ist die Circular Action Alliance. Dauerhafte Durchführungsverordnung von OAL am 01.05.2026 genehmigt und in Kraft; Herstellerregistrierung (bei CAA oder als unabhängiger/kleiner Hersteller bei CalRecycle) bis 01.06.2026. Volle Programmumsetzung ab Januar 2027; gegen die Verordnung sind Klagen anhängig.', 'Recycling', true, '2023-01-01', 'CalRecycle', '', ARRAY['Verpackungen'], 'https://calrecycle.ca.gov/laws/rulemaking/sb54regulations/'),

-- Quelle: https://www.omm.com/insights/alerts-publications/2026-plastics-epr-packaging-rules-update-what-sb-54-sb-343-state-reporting-deadlines-prc-laws-the-eu-ppwr-mean-for-producers-retailers/
--         https://www.hklaw.com/en/insights/publications/2026/08/federal-court-upholds-oregons-epr-law-in-full-after-constitutional
--         https://resource-recycling.com/policy-now/2026/09/25/naw-appeals-oregon-epr-ruling/
('US', 'Oregon Plastic Pollution and Recycling Modernization Act', 'Operatives Verpackungs-EPR-Programm in Oregon (SB 582, 2021) mit Registrierungs-, Melde- und Gebührenpflichten für Hersteller, i. d. R. über die Circular Action Alliance (eigene PRO oder Ausnahmen möglich); jährliche Mengenmeldung zum 31.05. Das Bundesbezirksgericht hat das Gesetz am 27.08.2026 vollständig bestätigt; die einstweilige Verfügung zugunsten von NAW-Mitgliedern (Feb. 2026) ist damit entfallen. Berufung beim Ninth Circuit anhängig (seit 24.09.2026), ohne aufschiebende Wirkung.', 'Recycling', true, '2025-07-01', 'Oregon Department of Environmental Quality (DEQ)', '', ARRAY['Verpackungen'], 'https://www.oregon.gov/deq')
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
