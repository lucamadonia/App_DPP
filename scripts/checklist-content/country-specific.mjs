// ============================================================
// Trackbliss - Kuratierter Checklisten-Fachcontent (Landes-Ebene)
// ============================================================
// ZWEI Exporte:
//   COUNTRY_GENERAL  - kategorieUEBERGREIFENDE Landes-Pflichten.
//                      Werden vom Seed-Script auf ALLE 15 Kategorien
//                      expandiert. category ist immer
//                      'Marktzugang & Registrierung', sortOrder 0-9.
//   COUNTRY_CATEGORY - landes- UND kategoriespezifische Zusaetze.
//                      sortOrder 90-120 (haengen hinter den
//                      EU-Basis-Items der jeweiligen Kategorie).
//
// Schreibweise: ASCII-Transliteration (ue/oe/ae/ss) wie in
// supabase/seed-checklist-templates.sql, damit Titel beim
// Upsert-Merge exakt matchen (z. B. 'Verpackungsregistrierung LUCID',
// 'Ruecknahme- und Entsorgungspflichten').
//
// Item-Schema:
// { title, description, detailedDescription, mandatory, category,
//   subcategory?, documentRequired, documentTypes?, legalBasis,
//   authority?, deadline?, penalties?, tips?, links?, applicableProducts?,
//   priority, sortOrder }
// ============================================================

const MZ = 'Marktzugang & Registrierung';

export const COUNTRY_GENERAL = {
  // ==========================================================
  // DEUTSCHLAND
  // ==========================================================
  DE: [
    {
      title: 'Verpackungsregistrierung LUCID',
      description: 'Vor dem ersten Inverkehrbringen verpackter Ware im Verpackungsregister LUCID registrieren und systembeteiligungspflichtige Verpackungen bei einem dualen System lizenzieren.',
      detailedDescription: 'Jeder, der verpackte Ware in Deutschland erstmals gewerblich in Verkehr bringt - auch auslaendische Versandhaendler -, muss sich VOR Vertriebsbeginn im LUCID-Portal der Zentralen Stelle Verpackungsregister (ZSVR) registrieren. Systembeteiligungspflichtige Verkaufs- und Umverpackungen muessen zusaetzlich bei einem dualen System (z. B. Der Gruene Punkt, Interseroh+) lizenziert werden. Ohne Registrierung gilt ein faktisches Vertriebsverbot, das Marktplaetze wie Amazon und eBay aktiv durchsetzen. Jaehrlich sind Mengenmeldungen an das duale System UND die ZSVR abzugeben.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['LUCID-Registrierungsnachweis', 'Systembeteiligungsvertrag', 'Mengenmeldung'],
      legalBasis: 'VerpackG, Verordnung (EU) 2024/3249 (PPWR)',
      authority: 'Zentrale Stelle Verpackungsregister (ZSVR)',
      deadline: 'Registrierung VOR dem ersten Inverkehrbringen',
      penalties: 'Bussgeld bis 200.000 EUR, Vertriebsverbot, Abmahnrisiko durch Wettbewerber',
      tips: [
        'LUCID-Registrierung ist kostenlos und online in ca. 30 Minuten erledigt',
        'Registrierungsnummer im Marktplatz-Account hinterlegen (Amazon/eBay pruefen aktiv)',
        'Ab 80 t Glas / 50 t Papier-Pappe-Karton / 30 t sonstige Materialien: Vollstaendigkeitserklaerung mit registriertem Pruefer noetig',
        'Auch Serviceverpackungen (Versandkartons, Fuellmaterial) sind systembeteiligungspflichtig',
      ],
      links: [
        { title: 'LUCID Verpackungsregister', url: 'https://lucid.verpackungsregister.org' },
        { title: 'Zentrale Stelle Verpackungsregister (ZSVR)', url: 'https://www.verpackungsregister.org' },
      ],
      priority: 'critical',
      sortOrder: 0,
    },
    {
      title: 'Bedienungsanleitung in deutscher Sprache',
      description: 'Gebrauchsanleitungen, Sicherheits- und Warnhinweise muessen dem Produkt in deutscher Sprache beiliegen.',
      detailedDescription: 'Nach Paragraf 6 ProdSG und Art. 9 GPSR muessen Anleitungen und Sicherheitsinformationen fuer Verbraucherprodukte in deutscher Sprache mitgeliefert werden. Rein englischsprachige Dokumentation ist unzulaessig und einer der haeufigsten Beanstandungsgruende der Marktueberwachung. Die Uebersetzung muss fachlich korrekt sein; maschinelle Rohuebersetzungen ohne Review gelten als Mangel. Digitale Anleitungen (QR-Code) sind nur ergaenzend zulaessig, sicherheitsrelevante Informationen muessen physisch beiliegen.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['Bedienungsanleitung (DE)', 'Sicherheitshinweise (DE)'],
      legalBasis: 'ProdSG Paragraf 6, Verordnung (EU) 2023/988 (GPSR) Art. 9',
      authority: 'Marktueberwachungsbehoerden der Bundeslaender',
      penalties: 'Vertriebsuntersagung, Bussgelder nach ProdSG, wettbewerbsrechtliche Abmahnungen',
      tips: [
        'Professionelle Fachuebersetzung beauftragen, nicht nur maschinell uebersetzen',
        'Warnhinweise und Piktogramme nach einschlaegigen Normen (z. B. EN 82079-1) gestalten',
        'Sicherheitsrelevante Hinweise immer gedruckt beilegen, Details duerfen digital ergaenzt werden',
      ],
      links: [
        { title: 'Produktsicherheitsgesetz (ProdSG)', url: 'https://www.gesetze-im-internet.de/prodsg_2021/' },
        { title: 'GPSR im EUR-Lex', url: 'https://eur-lex.europa.eu/eli/reg/2023/988' },
      ],
      priority: 'high',
      sortOrder: 1,
    },
    {
      title: 'GPSR Wirtschaftsakteur-Pflichten',
      description: 'Verantwortliche Person in der EU benennen und deren Kontaktdaten auf Produkt oder Verpackung angeben.',
      detailedDescription: 'Seit dem 13.12.2024 darf ein Verbraucherprodukt nur in Verkehr gebracht werden, wenn ein in der EU niedergelassener Wirtschaftsakteur (Hersteller, Importeur, Bevollmaechtigter oder Fulfillment-Dienstleister) als verantwortliche Person nach Art. 16 GPSR fungiert. Name, Postanschrift und elektronische Adresse muessen auf dem Produkt, der Verpackung oder einem Begleitdokument stehen. Die verantwortliche Person muss technische Unterlagen vorhalten und mit den Marktueberwachungsbehoerden kooperieren, inklusive Unfallmeldungen ueber das Safety Business Gateway.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['Benennung EU-Bevollmaechtigter', 'Technische Dokumentation'],
      legalBasis: 'Verordnung (EU) 2023/988 (GPSR) Art. 16',
      authority: 'Marktueberwachungsbehoerden der Bundeslaender',
      deadline: 'Gilt seit 13.12.2024 fuer alle Verbraucherprodukte',
      penalties: 'Vertriebsverbot, Rueckrufanordnungen, Bussgelder nach ProdSG bis 100.000 EUR',
      tips: [
        'Pruefen, ob eine eigene EU-Niederlassung als verantwortliche Person fungieren kann',
        'Andernfalls EU-Bevollmaechtigten vertraglich bestellen (ca. 500-2.000 EUR/Jahr)',
        'Kontaktdaten in Produktlistings auf Online-Marktplaetzen hinterlegen (Pflichtangabe)',
      ],
      links: [
        { title: 'GPSR im EUR-Lex', url: 'https://eur-lex.europa.eu/eli/reg/2023/988' },
        { title: 'Safety Business Gateway', url: 'https://webgate.ec.europa.eu/gpsd' },
      ],
      priority: 'critical',
      sortOrder: 2,
    },
  ],

  // ==========================================================
  // FRANKREICH
  // ==========================================================
  FR: [
    {
      title: 'REP-Registrierung (Responsabilite elargie du producteur)',
      description: 'Fuer jede betroffene REP-Produktfamilie bei einem Eco-Organisme registrieren und den Identifiant Unique (IDU) der ADEME fuehren.',
      detailedDescription: 'Das AGEC-Gesetz hat in Frankreich rund 20 REP-Filieres etabliert (Verpackungen, Elektro, Textil, Moebel, Batterien, Spielzeug, Sportartikel u. v. m.). Hersteller und Importeure muessen je Filiere einem zugelassenen Eco-Organisme beitreten (z. B. Citeo fuer Verpackungen) und erhalten ueber das ADEME-Register SYDEREP einen Identifiant Unique (IDU). Der IDU muss in den AGB und auf Online-Verkaufsseiten angegeben werden. Online-Marktplaetze pruefen den IDU; ohne Registrierung droht ein faktisches Vertriebsverbot.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['Eco-Organisme-Vertrag', 'IDU-Nachweis (SYDEREP)'],
      legalBasis: 'Loi AGEC 2020-105, Code de l\'environnement Art. L541-10',
      authority: 'ADEME (Agence de la transition ecologique)',
      deadline: 'Registrierung VOR dem ersten Inverkehrbringen in Frankreich',
      penalties: 'Verwaltungsstrafen bis 30.000 EUR pro Verstoss, Vertriebsverbot auf Marktplaetzen',
      tips: [
        'Zuerst pruefen, welche REP-Filieres die eigenen Produkte betreffen (oft mehrere parallel: Produkt + Verpackung)',
        'IDU je Filiere separat beantragen und in Impressum/AGB ausweisen',
        'Eco-Organisme uebernimmt Mengenmeldung und Entgeltabrechnung (Eco-Modulation beachten)',
      ],
      links: [
        { title: 'ADEME SYDEREP', url: 'https://syderep.ademe.fr' },
        { title: 'Citeo (Verpackungen)', url: 'https://www.citeo.com' },
      ],
      priority: 'critical',
      sortOrder: 0,
    },
    {
      title: 'Triman-Symbol und Info-tri',
      description: 'Triman-Logo mit Sortierhinweis (Info-tri) auf Produkt oder Verpackung fuer alle REP-pflichtigen Produkte anbringen.',
      detailedDescription: 'Frankreich verlangt fuer praktisch alle Haushaltsprodukte mit REP-Pflicht das Triman-Symbol zusammen mit der Info-tri (konkrete Sortieranweisung: welcher Bestandteil in welche Tonne). Die Kennzeichnung muss auf dem Produkt, der Verpackung oder den Begleitunterlagen erscheinen; bei kleinen Verpackungen sind digitale Loesungen nur eingeschraenkt zulaessig. Die genaue Gestaltung gibt das jeweilige Eco-Organisme vor und stellt Vorlagen bereit. Fehlende Kennzeichnung ist ein haeufiger Grund fuer Beanstandungen durch die DGCCRF.',
      mandatory: true,
      category: MZ,
      documentRequired: false,
      legalBasis: 'Loi AGEC 2020-105 Art. 17, Decret 2021-835',
      authority: 'DGCCRF, ADEME',
      penalties: 'Verwaltungsstrafen bis 15.000 EUR, Verkaufsstopp bei wiederholten Verstoessen',
      tips: [
        'Info-tri-Vorlagen direkt vom Eco-Organisme (z. B. Citeo) generieren lassen',
        'Triman gilt zusaetzlich zur EU-Kennzeichnung - deutsches/EU-Layout reicht nicht',
        'Bei Multi-Material-Verpackungen jede Komponente mit eigener Sortieranweisung listen',
      ],
      links: [
        { title: 'Info-tri bei Citeo', url: 'https://www.citeo.com/le-mag/linfo-tri' },
        { title: 'Loi AGEC (Legifrance)', url: 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000041553759' },
      ],
      priority: 'critical',
      sortOrder: 1,
    },
    {
      title: 'Loi Toubon: Franzoesische Sprachpflicht',
      description: 'Alle Pflichtinformationen, Anleitungen, Garantien und Werbung muessen in franzoesischer Sprache vorliegen.',
      detailedDescription: 'Das Sprachgesetz Loi Toubon (94-665) verlangt, dass Produktbezeichnungen, Gebrauchsanleitungen, Sicherheitshinweise, Garantiebedingungen und Werbeaussagen in Frankreich auf Franzoesisch verfuegbar sind. Fremdsprachige Angaben duerfen ergaenzend stehen, aber nicht prominenter als die franzoesische Fassung. Die DGCCRF kontrolliert aktiv und beanstandet besonders Online-Shops mit rein englischen Produktseiten. Auch Software-Oberflaechen sicherheitsrelevanter Produkte sollten lokalisiert sein.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['Bedienungsanleitung (FR)', 'Sicherheitshinweise (FR)'],
      legalBasis: 'Loi 94-665 (Loi Toubon), Code de la consommation',
      authority: 'DGCCRF',
      penalties: 'Geldstrafen je Verstoss (Wiederholung kumulierend), Verkaufsbeschraenkungen',
      tips: [
        'Komplette Customer Journey pruefen: Verpackung, Beileger, Webshop, Rechnung',
        'Garantie- und Widerrufsbedingungen ebenfalls uebersetzen',
        'Professionelle Uebersetzung verwenden - DGCCRF beanstandet fehlerhafte Maschinenuebersetzungen',
      ],
      links: [
        { title: 'Loi Toubon (Legifrance)', url: 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000349929' },
        { title: 'DGCCRF', url: 'https://www.economie.gouv.fr/dgccrf' },
      ],
      priority: 'high',
      sortOrder: 2,
    },
  ],

  // ==========================================================
  // OESTERREICH
  // ==========================================================
  AT: [
    {
      title: 'ARA-Lizenzierung Verpackungen Oesterreich',
      description: 'Verpackungen vor dem Inverkehrbringen bei einem Sammel- und Verwertungssystem (z. B. ARA) entpflichten und im EDM-Portal registrieren.',
      detailedDescription: 'Nach der oesterreichischen Verpackungsverordnung muessen Primaerverpflichtete ihre Haushalts- und Gewerbeverpackungen bei einem genehmigten Sammel- und Verwertungssystem wie der Altstoff Recycling Austria (ARA) lizenzieren. Zusaetzlich ist eine Registrierung im Elektronischen Datenmanagement (EDM) des Klimaschutzministeriums erforderlich. Die Tarife richten sich nach Material und Menge; Mengenmeldungen erfolgen je nach Volumen monatlich, quartalsweise oder jaehrlich.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['ARA-Vertrag/Entpflichtungsnachweis', 'EDM-Registrierung', 'Mengenmeldung'],
      legalBasis: 'Verpackungsverordnung 2014 (BGBl. II 184/2014), AWG 2002',
      authority: 'BMK / Klimaschutzministerium, EDM',
      deadline: 'Vor dem ersten Inverkehrbringen in Oesterreich',
      penalties: 'Verwaltungsstrafen bis 8.400 EUR (im Wiederholungsfall hoeher), Nachzahlung der Entgelte',
      tips: [
        'ARA-Lizenzierung deckt nicht die EDM-Registrierung ab - beides separat erledigen',
        'Tarifkategorien (Haushalt vs. Gewerbe) korrekt zuordnen, sonst drohen Nachforderungen',
        'Bei kleinen Mengen vereinfachte Pauschalentpflichtung pruefen',
      ],
      links: [
        { title: 'Altstoff Recycling Austria (ARA)', url: 'https://www.ara.at' },
        { title: 'EDM-Portal', url: 'https://edm.gv.at' },
      ],
      priority: 'critical',
      sortOrder: 0,
    },
    {
      title: 'Bevollmaechtigter fuer auslaendische Versandhaendler (Oesterreich)',
      description: 'Versandhaendler ohne Sitz in Oesterreich muessen fuer Verpackungen (und Elektrogeraete) einen in Oesterreich niedergelassenen Bevollmaechtigten bestellen.',
      detailedDescription: 'Seit 2023 verpflichtet die Verpackungsverordnung auslaendische Versandhaendler, die direkt an oesterreichische Endverbraucher liefern, zur Bestellung eines Bevollmaechtigten mit Sitz in Oesterreich. Der Bevollmaechtigte uebernimmt Registrierung, Lizenzierung und Mengenmeldungen. Online-Marktplaetze muessen die Compliance ihrer Haendler pruefen und nicht-konforme Anbieter sperren. Dieselbe Bevollmaechtigten-Pflicht gilt parallel fuer Elektro- und Elektronikgeraete nach EAG-VO.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['Bestellung Bevollmaechtigter (notariell beglaubigt)'],
      legalBasis: 'Verpackungsverordnung 2014 idF BGBl. II 283/2022, AWG 2002 Paragraf 13j',
      authority: 'BMK / Klimaschutzministerium',
      penalties: 'Vertriebsverbot ueber Marktplaetze, Verwaltungsstrafen',
      tips: [
        'Dienstleister wie ARA bieten Bevollmaechtigten-Services fuer auslaendische Haendler an',
        'Bestellung muss notariell oder gerichtlich beglaubigt sein',
        'Pruefen, ob auch die EAG-/Batterien-Bevollmaechtigung gleich mit erledigt werden kann',
      ],
      links: [
        { title: 'ARA Service fuer auslaendische Unternehmen', url: 'https://www.ara.at' },
        { title: 'BMK Verpackungen', url: 'https://www.bmk.gv.at' },
      ],
      priority: 'critical',
      sortOrder: 1,
    },
    {
      title: 'Deutsche Sprachpflicht Oesterreich',
      description: 'Anleitungen, Sicherheits- und Warnhinweise muessen in deutscher Sprache beigefuegt werden.',
      detailedDescription: 'Das oesterreichische Produktsicherheitsgesetz (PSG 2004) und die GPSR verlangen fuer Verbraucherprodukte deutschsprachige Gebrauchs- und Sicherheitsinformationen. Bestehende deutsche Unterlagen aus dem DACH-Raum koennen in der Regel uebernommen werden; oesterreichspezifische Kontaktangaben (z. B. Servicestellen, Entsorgungshinweise) sollten ergaenzt werden. Die Marktueberwachung erfolgt durch Bundesministerium und Bezirksverwaltungsbehoerden.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['Bedienungsanleitung (DE)', 'Sicherheitshinweise (DE)'],
      legalBasis: 'PSG 2004, Verordnung (EU) 2023/988 (GPSR) Art. 9',
      authority: 'BMSGPK / Marktueberwachung, Bezirksverwaltungsbehoerden',
      penalties: 'Vertriebsuntersagung, Verwaltungsstrafen',
      tips: [
        'Deutsche Unterlagen aus Deutschland sind meist 1:1 verwendbar',
        'Entsorgungs- und Ruecknahmehinweise auf oesterreichische Systeme anpassen',
      ],
      links: [
        { title: 'Produktsicherheit Oesterreich (BMSGPK)', url: 'https://www.sozialministerium.at' },
      ],
      priority: 'high',
      sortOrder: 2,
    },
  ],

  // ==========================================================
  // ITALIEN
  // ==========================================================
  IT: [
    {
      title: 'CONAI-Registrierung Italien',
      description: 'Beim italienischen Verpackungskonsortium CONAI registrieren und den Umweltbeitrag (Contributo Ambientale) abfuehren.',
      detailedDescription: 'Hersteller und Importeure verpackter Ware muessen in Italien dem Consorzio Nazionale Imballaggi (CONAI) beitreten und den materialabhaengigen Contributo Ambientale CONAI (CAC) auf in Verkehr gebrachte Verpackungen zahlen. Auslaendische Unternehmen ohne italienische Niederlassung koennen die Pflicht vertraglich auf den italienischen Erstabnehmer verlagern oder sich freiwillig selbst registrieren - die Zustaendigkeit muss aber eindeutig geklaert sein. Meldungen erfolgen je nach Volumen monatlich, quartalsweise oder jaehrlich.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['CONAI-Beitrittsbestaetigung', 'CAC-Meldungen'],
      legalBasis: 'D.Lgs. 152/2006 (Testo Unico Ambientale)',
      authority: 'CONAI',
      deadline: 'Vor dem ersten Inverkehrbringen in Italien',
      penalties: 'Nachzahlungen mit Zuschlaegen, Verwaltungsstrafen',
      tips: [
        'Bei B2B-Lieferungen vertraglich festhalten, wer den CAC abfuehrt (Importeur vs. Lieferant)',
        'Materialgenaue Verpackungsdaten pflegen - der CAC unterscheidet stark nach Material und Recyclingfaehigkeit',
        'Vereinfachte Verfahren fuer geringe Mengen pruefen',
      ],
      links: [
        { title: 'CONAI', url: 'https://www.conai.org' },
      ],
      priority: 'critical',
      sortOrder: 0,
    },
    {
      title: 'Italienische Verpackungskennzeichnung D.Lgs. 116/2020',
      description: 'Alle Verpackungen fuer den italienischen Markt mit Materialcode und Entsorgungshinweis (etichettatura ambientale) kennzeichnen.',
      detailedDescription: 'Italien verlangt seit 2023 verpflichtend die Umweltkennzeichnung aller Verpackungen: Materialcode nach Entscheidung 97/129/EG (z. B. PAP 21, PET 1) plus Hinweis zur korrekten Sammlung (z. B. Raccolta carta). B2C-Verpackungen brauchen zusaetzlich die Entsorgungsanweisung fuer Verbraucher in italienischer Sprache. Bei kleinen Verpackungen oder Importware sind digitale Loesungen (QR-Code, Website) unter bestimmten Bedingungen zulaessig. CONAI stellt mit dem Tool e-tichetta eine Generierungshilfe bereit.',
      mandatory: true,
      category: MZ,
      documentRequired: false,
      legalBasis: 'D.Lgs. 116/2020, Entscheidung 97/129/EG',
      authority: 'Ministero dell\'Ambiente, CONAI',
      penalties: 'Verwaltungsstrafen von 5.200 bis 40.000 EUR',
      tips: [
        'CONAI-Tool e-tichetta fuer die korrekte Kennzeichnung nutzen',
        'Jede trennbare Verpackungskomponente einzeln codieren (Karton, Folie, Einlage)',
        'Bestandsware pruefen: Abverkaufsfristen fuer unkonform gekennzeichnete Ware sind abgelaufen',
      ],
      links: [
        { title: 'CONAI Etichettatura Ambientale', url: 'https://www.etichetta-conai.com' },
      ],
      priority: 'high',
      sortOrder: 1,
    },
    {
      title: 'Italienische Sprachpflicht (Codice del Consumo)',
      description: 'Produktinformationen, Anleitungen und Sicherheitshinweise muessen auf Italienisch verfuegbar sein.',
      detailedDescription: 'Der Codice del Consumo (D.Lgs. 206/2005) verlangt, dass alle fuer Verbraucher bestimmten Pflichtinformationen - Bezeichnung, Zusammensetzung, Gebrauchs- und Warnhinweise - in italienischer Sprache vorliegen. Mehrsprachige Etiketten sind zulaessig, sofern die italienische Fassung vollstaendig und gleichwertig ist. Verstoesse werden von den Handelskammern und der Guardia di Finanza im Rahmen der Marktueberwachung geahndet.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['Bedienungsanleitung (IT)', 'Etikett (IT)'],
      legalBasis: 'D.Lgs. 206/2005 (Codice del Consumo) Art. 9',
      authority: 'Camere di Commercio, MIMIT',
      penalties: 'Verwaltungsstrafen von 516 bis 25.823 EUR',
      tips: [
        'Etiketten und Anleitungen vor dem Import uebersetzen lassen - Nachetikettierung im Zolllager ist teuer',
        'Sicherheitswarnungen wortgenau nach einschlaegigen Normen uebersetzen',
      ],
      links: [
        { title: 'Codice del Consumo (Normattiva)', url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2005-09-06;206' },
      ],
      priority: 'high',
      sortOrder: 2,
    },
  ],
  // ==========================================================
  // SPANIEN
  // ==========================================================
  ES: [
    {
      title: 'Ecoembes-Registrierung Spanien',
      description: 'Verpackungs-EPR nach RD 1055/2022 erfuellen: Eintrag ins Produzentenregister und Beitritt zu einem Kollektivsystem (z. B. Ecoembes).',
      detailedDescription: 'Das Real Decreto 1055/2022 verpflichtet alle Erstinverkehrbringer verpackter Ware in Spanien - auch im Fernabsatz aus dem Ausland - zur Eintragung in das Registro de Productores de Producto (Sektion Envases) beim Ministerium MITECO und zur Erfuellung der erweiterten Herstellerverantwortung ueber ein Kollektivsystem (SCRAP) wie Ecoembes. Unternehmen ohne Sitz in Spanien benoetigen einen dort niedergelassenen Bevollmaechtigten (representante autorizado). Jaehrliche Verpackungsmengen-Deklarationen sind verpflichtend.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['Registro de Productores Eintrag', 'SCRAP-Vertrag (z. B. Ecoembes)', 'Jahresdeklaration'],
      legalBasis: 'Real Decreto 1055/2022, Ley 7/2022',
      authority: 'MITECO (Ministerio para la Transicion Ecologica)',
      deadline: 'Registrierung vor dem ersten Inverkehrbringen',
      penalties: 'Bussgelder bis 100.000 EUR (schwere Verstoesse bis 3,5 Mio. EUR), Vertriebsverbot',
      tips: [
        'Auslaendische Versandhaendler brauchen einen representante autorizado mit Sitz in Spanien',
        'Registernummer in Rechnungen und gegenueber Marktplaetzen ausweisen',
        'Auch Gewerbe- und Transportverpackungen fallen seit RD 1055/2022 unter die EPR-Pflicht',
      ],
      links: [
        { title: 'MITECO Registro de Productores', url: 'https://www.miteco.gob.es' },
        { title: 'Ecoembes', url: 'https://www.ecoembes.com' },
      ],
      priority: 'critical',
      sortOrder: 0,
    },
    {
      title: 'Spanische Plastiksteuer (Impuesto al plastico)',
      description: 'Steuer von 0,45 EUR/kg auf nicht-recycelten Kunststoff in Einwegverpackungen pruefen, registrieren und abfuehren.',
      detailedDescription: 'Spanien erhebt seit 2023 eine Sondersteuer auf nicht wiederverwendbare Kunststoffverpackungen: 0,45 EUR je Kilogramm nicht-recyceltem Kunststoffanteil. Steuerpflichtig sind Hersteller, innergemeinschaftliche Erwerber und Importeure; bei innergemeinschaftlichen Erwerben ueber 5 kg pro Monat besteht Registrierungs- und Erklaerungspflicht bei der Steuerbehoerde AEAT. Recycelte Anteile muessen durch Zertifikate (z. B. nach EN 15343, UNE-EN-Zertifizierung) nachgewiesen werden, sonst gilt der gesamte Kunststoff als steuerpflichtig.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['AEAT-Registrierung', 'Steuererklaerungen', 'Rezyklat-Zertifikate'],
      legalBasis: 'Ley 7/2022 Art. 67 ff.',
      authority: 'AEAT (Agencia Tributaria)',
      penalties: 'Steuernachforderungen mit Zuschlaegen, Bussgelder nach allgemeinem Steuerrecht',
      tips: [
        'Kunststoffgewichte je Verpackungskomponente vom Lieferanten dokumentieren lassen',
        'Rezyklatanteile nur mit akkreditierter Zertifizierung ansetzen',
        'Freigrenze 5 kg/Monat bei innergemeinschaftlichen Erwerben pruefen',
      ],
      links: [
        { title: 'AEAT Impuesto sobre envases de plastico', url: 'https://sede.agenciatributaria.gob.es' },
      ],
      priority: 'high',
      sortOrder: 1,
    },
    {
      title: 'Spanische Kennzeichnung in Castellano',
      description: 'Etiketten, Anleitungen und Sicherheitshinweise muessen mindestens in spanischer Sprache (Castellano) vorliegen.',
      detailedDescription: 'Das Real Decreto 1468/1988 und das Verbraucherschutzgesetz verlangen, dass alle Pflichtangaben fuer in Spanien vermarktete Produkte mindestens auf Castellano verfuegbar sind. Das betrifft Produktbezeichnung, Zusammensetzung, Gebrauchsanweisung, Warn- und Sicherheitshinweise. Regionale Sprachen (Katalanisch, Baskisch, Galicisch) sind optional. Die Marktueberwachung der Autonomen Gemeinschaften kontrolliert besonders Importware und Online-Handel.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['Etikett (ES)', 'Bedienungsanleitung (ES)'],
      legalBasis: 'Real Decreto 1468/1988, RDL 1/2007 (Verbraucherschutzgesetz)',
      authority: 'Ministerio de Consumo, Autonome Gemeinschaften',
      penalties: 'Bussgelder je nach Schwere bis 100.000 EUR, Vertriebsuntersagung',
      tips: [
        'Lateinamerikanisches Spanisch genuegt formal, sollte aber terminologisch fuer Spanien geprueft werden',
        'Sicherheitshinweise und Warnungen wortgenau uebersetzen lassen',
      ],
      links: [
        { title: 'Ministerio de Consumo', url: 'https://www.consumo.gob.es' },
      ],
      priority: 'high',
      sortOrder: 2,
    },
  ],

  // ==========================================================
  // NIEDERLANDE
  // ==========================================================
  NL: [
    {
      title: 'Afvalfonds Verpakkingen Niederlande',
      description: 'Ab 50.000 kg in Verkehr gebrachter Verpackungen pro Jahr beim Afvalfonds Verpakkingen melden und Abfallmanagementbeitrag zahlen.',
      detailedDescription: 'In den Niederlanden gilt die erweiterte Herstellerverantwortung fuer Verpackungen ueber das Afvalfonds Verpakkingen. Wer mehr als 50.000 kg Verpackungen pro Jahr erstmals in den Niederlanden in Verkehr bringt, muss sich registrieren, jaehrlich Mengen melden und die Afvalbeheersbijdrage zahlen. Unterhalb der Schwelle besteht keine Beitragspflicht, die Pruefung und Dokumentation der Mengen wird aber erwartet. Auslaendische Fernabsatzhaendler fallen seit der EU-weiten EPR-Verschaerfung ebenfalls unter die Meldepflicht.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['Afvalfonds-Registrierung', 'Jahresmeldung Verpackungsmengen'],
      legalBasis: 'Besluit beheer verpakkingen 2014, Verordnung (EU) 2024/3249 (PPWR)',
      authority: 'Stichting Afvalfonds Verpakkingen',
      deadline: 'Jahresmeldung jeweils bis 1. April fuer das Vorjahr',
      penalties: 'Nachforderungen, Zwangsgelder durch die ILT',
      tips: [
        'Auch unter 50.000 kg: Mengen dokumentieren, um die Schwellenpruefung belegen zu koennen',
        'Logistik- und Serviceverpackungen in die Mengenrechnung einbeziehen',
        'Tarife differenzieren nach Material - Mono-Materialien sind guenstiger',
      ],
      links: [
        { title: 'Afvalfonds Verpakkingen', url: 'https://www.afvalfondsverpakkingen.nl' },
      ],
      priority: 'critical',
      sortOrder: 0,
    },
    {
      title: 'Niederlaendische Kennzeichnungspflichten (Warenwet)',
      description: 'Sicherheits- und Pflichtinformationen muessen nach der Warenwet auf Niederlaendisch verfuegbar sein.',
      detailedDescription: 'Die niederlaendische Warenwet und ihre Produktverordnungen verlangen, dass Warn- und Sicherheitshinweise sowie vorgeschriebene Verbraucherinformationen in niederlaendischer Sprache angebracht oder beigelegt werden. Fuer allgemeine Gebrauchsanleitungen ist die NVWA pragmatisch, sicherheitsrelevante Informationen muessen jedoch zwingend auf Niederlaendisch vorliegen. Bei Lebensmitteln, Kosmetik und Chemikalien gelten strengere, vollstaendige Sprachvorgaben.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['Etikett (NL)', 'Sicherheitshinweise (NL)'],
      legalBasis: 'Warenwet, Warenwetbesluit algemene productveiligheid, GPSR Art. 9',
      authority: 'NVWA (Nederlandse Voedsel- en Warenautoriteit)',
      penalties: 'Verwaltungsbussgelder, Vertriebsuntersagung',
      tips: [
        'Mindestens Warnhinweise und Sicherheitsinformationen auf Niederlaendisch uebersetzen',
        'Bei Lebensmitteln/Kosmetik vollstaendige NL-Etikettierung einplanen',
      ],
      links: [
        { title: 'NVWA', url: 'https://www.nvwa.nl' },
      ],
      priority: 'high',
      sortOrder: 1,
    },
    {
      title: 'GPSR Wirtschaftsakteur-Pflichten',
      description: 'Verantwortliche Person in der EU benennen und auf Produkt oder Verpackung angeben (gilt auch fuer Lieferungen in die Niederlande).',
      detailedDescription: 'Auch fuer den niederlaendischen Markt gilt seit 13.12.2024 die GPSR: Ohne in der EU niedergelassenen verantwortlichen Wirtschaftsakteur (Hersteller, Importeur, Bevollmaechtigter oder Fulfillment-Dienstleister) duerfen Verbraucherprodukte nicht angeboten werden. Name und Kontaktdaten der verantwortlichen Person muessen auf dem Produkt, der Verpackung oder einem Begleitdokument stehen. Die NVWA und die ILT setzen die Anforderungen aktiv im Online-Handel durch.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['Benennung EU-Bevollmaechtigter', 'Technische Dokumentation'],
      legalBasis: 'Verordnung (EU) 2023/988 (GPSR) Art. 16',
      authority: 'NVWA, ILT',
      deadline: 'Gilt seit 13.12.2024',
      penalties: 'Vertriebsverbot, Rueckrufanordnungen, Bussgelder',
      tips: [
        'Eine EU-weite verantwortliche Person deckt alle Mitgliedstaaten ab - keine NL-spezifische Bestellung noetig',
        'Kontaktdaten auch in Online-Listings angeben',
      ],
      links: [
        { title: 'GPSR im EUR-Lex', url: 'https://eur-lex.europa.eu/eli/reg/2023/988' },
      ],
      priority: 'critical',
      sortOrder: 2,
    },
  ],

  // ==========================================================
  // POLEN
  // ==========================================================
  PL: [
    {
      title: 'BDO-Register Polen',
      description: 'Vor dem Inverkehrbringen im polnischen Abfallregister BDO registrieren und die BDO-Nummer auf Geschaeftsdokumenten fuehren.',
      detailedDescription: 'Das BDO (Baza danych o produktach i opakowaniach oraz o gospodarce odpadami) ist Polens zentrales Register fuer Produkte, Verpackungen und Abfallwirtschaft. Registrierungspflichtig sind u. a. Inverkehrbringer von Verpackungen, Elektrogeraeten, Batterien, Oelen und Reifen. Die zugeteilte BDO-Nummer muss auf Rechnungen und Geschaeftspapieren angegeben werden. Unternehmen ohne Sitz in Polen benoetigen in der Regel einen Bevollmaechtigten. Ohne BDO-Eintrag drohen empfindliche Geldbussen und ein Vertriebsverbot.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['BDO-Registrierungsbescheid', 'BDO-Nummer'],
      legalBasis: 'Abfallgesetz vom 14.12.2012 (Ustawa o odpadach), Verpackungsgesetz vom 13.06.2013',
      authority: 'Marschallamt der Woiwodschaft (Urzad Marszalkowski)',
      deadline: 'Registrierung vor Aufnahme der Taetigkeit in Polen',
      penalties: 'Geldbussen bis 1.000.000 PLN, Vertriebsverbot',
      tips: [
        'BDO-Nummer auf allen Rechnungen nach Polen angeben - Geschaeftspartner pruefen das',
        'Registrierung erfolgt beim Marschallamt der jeweiligen Woiwodschaft, online ueber das BDO-Portal',
        'Auslaendische Versandhaendler: Bevollmaechtigten fuer Verpackungs-/Elektro-Pflichten bestellen',
      ],
      links: [
        { title: 'BDO-Portal', url: 'https://bdo.mos.gov.pl' },
      ],
      priority: 'critical',
      sortOrder: 0,
    },
    {
      title: 'Jahresberichte im BDO-System',
      description: 'Jaehrliche Mengen- und Gebuehrenberichte (u. a. Verpackungen) bis 15. Maerz ueber das BDO-System einreichen.',
      detailedDescription: 'Registrierte Unternehmen muessen jaehrlich bis zum 15. Maerz Berichte ueber in Verkehr gebrachte Verpackungen, Produkte und erzielte Verwertungsquoten elektronisch im BDO einreichen. Werden die gesetzlichen Recycling-Quoten nicht ueber eine Verwertungsorganisation (organizacja odzysku) erfuellt, faellt eine Produktgebuehr (oplata produktowa) an. Die Berichte sind auch bei Null-Mengen abzugeben, solange die Registrierung aktiv ist.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['BDO-Jahresbericht', 'Nachweis Verwertungsorganisation'],
      legalBasis: 'Verpackungsgesetz vom 13.06.2013, Abfallgesetz',
      authority: 'Marschallamt der Woiwodschaft',
      deadline: 'Jaehrlich bis 15. Maerz fuer das Vorjahr',
      penalties: 'Produktgebuehr-Nachforderungen, Geldbussen bei Nichtabgabe',
      tips: [
        'Vertrag mit einer organizacja odzysku schliessen, um Quoten kostenguenstig zu erfuellen',
        'Mengendaten unterjaehrig pflegen statt erst im Februar zu rekonstruieren',
      ],
      links: [
        { title: 'BDO-Portal Berichte', url: 'https://bdo.mos.gov.pl' },
      ],
      priority: 'high',
      sortOrder: 1,
    },
    {
      title: 'Polnische Sprachpflicht',
      description: 'Produktkennzeichnung, Anleitungen und Garantiebedingungen muessen in polnischer Sprache vorliegen.',
      detailedDescription: 'Das Gesetz ueber die polnische Sprache (Ustawa o jezyku polskim) und das Verbraucherrechtsgesetz verlangen, dass alle Verbraucherinformationen - Etiketten, Gebrauchsanweisungen, Sicherheitshinweise, Garantien - auf Polnisch verfuegbar sind. Das gilt auch fuer Online-Shops, die sich an polnische Verbraucher richten. Die Handelsinspektion (Inspekcja Handlowa) kontrolliert die Einhaltung und kann Produkte vom Markt nehmen.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['Etikett (PL)', 'Bedienungsanleitung (PL)'],
      legalBasis: 'Ustawa o jezyku polskim vom 7.10.1999, Verbraucherrechtsgesetz',
      authority: 'UOKiK / Inspekcja Handlowa',
      penalties: 'Geldbussen, Vertriebsuntersagung',
      tips: [
        'Polnische Uebersetzungen fachlich pruefen lassen - Inspekcja Handlowa beanstandet fehlerhafte Texte',
        'Auch Garantiekarten und Beileger uebersetzen',
      ],
      links: [
        { title: 'UOKiK', url: 'https://uokik.gov.pl' },
      ],
      priority: 'high',
      sortOrder: 2,
    },
  ],

  // ==========================================================
  // TSCHECHIEN
  // ==========================================================
  CZ: [
    {
      title: 'EKO-KOM Verpackungslizenzierung Tschechien',
      description: 'Verpackungspflichten nach Gesetz 477/2001 ueber das autorisierte System EKO-KOM erfuellen.',
      detailedDescription: 'Wer verpackte Ware in Tschechien in Verkehr bringt, muss die Ruecknahme- und Verwertungspflichten des Verpackungsgesetzes (Zakon c. 477/2001 Sb.) erfuellen. Der Standardweg ist der Beitritt zum autorisierten System EKO-KOM, das gegen mengenbasierte Entgelte Sammlung und Recycling organisiert. Alternativ ist eine Eintragung in die Herstellerliste des Umweltministeriums mit Eigenerfuellung moeglich, was fuer die meisten Unternehmen unpraktisch ist. Quartalsweise Mengenmeldungen an EKO-KOM sind Standard.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['EKO-KOM-Vertrag', 'Mengenmeldungen'],
      legalBasis: 'Zakon c. 477/2001 Sb. (Verpackungsgesetz)',
      authority: 'Ministerstvo zivotniho prostredi (MZP), EKO-KOM',
      deadline: 'Vor dem ersten Inverkehrbringen in Tschechien',
      penalties: 'Geldbussen bis 10.000.000 CZK',
      tips: [
        'Kleinmengenregelung pruefen (vereinfachte Pauschale fuer geringe Verpackungsmengen)',
        'Auslaendische Fernabsatzhaendler koennen direkt mit EKO-KOM kontrahieren',
      ],
      links: [
        { title: 'EKO-KOM', url: 'https://www.ekokom.cz' },
        { title: 'Umweltministerium (MZP)', url: 'https://www.mzp.cz' },
      ],
      priority: 'critical',
      sortOrder: 0,
    },
    {
      title: 'Tschechische Sprachpflicht (Gesetz 634/1992)',
      description: 'Verbraucherinformationen, Anleitungen und Warnhinweise muessen auf Tschechisch verfuegbar sein.',
      detailedDescription: 'Das Verbraucherschutzgesetz (Zakon c. 634/1992 Sb.) verlangt, dass Verbraucher alle wesentlichen Produktinformationen in tschechischer Sprache erhalten: Bezeichnung, Gebrauchsanweisung, Wartungs- und Sicherheitshinweise sowie Gefahrenwarnungen. Die tschechische Handelsinspektion (CTIA/COI) kontrolliert stationaeren und Online-Handel und verhaengt regelmaessig Bussgelder fuer fehlende tschechische Texte.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['Etikett (CS)', 'Bedienungsanleitung (CS)'],
      legalBasis: 'Zakon c. 634/1992 Sb. (Verbraucherschutzgesetz)',
      authority: 'Ceska obchodni inspekce (COI)',
      penalties: 'Geldbussen bis 5.000.000 CZK',
      tips: [
        'Slowakisch ist NICHT ausreichend - eigenstaendige tschechische Fassung erstellen',
        'Warnhinweise auf Verpackung direkt aufdrucken statt nur beizulegen',
      ],
      links: [
        { title: 'Ceska obchodni inspekce', url: 'https://www.coi.cz' },
      ],
      priority: 'high',
      sortOrder: 1,
    },
    {
      title: 'GPSR Wirtschaftsakteur-Pflichten',
      description: 'Verantwortliche Person in der EU benennen und auf Produkt oder Verpackung angeben (gilt auch fuer Lieferungen nach Tschechien).',
      detailedDescription: 'Auch fuer den tschechischen Markt verlangt die GPSR seit 13.12.2024 einen in der EU niedergelassenen verantwortlichen Wirtschaftsakteur, dessen Name und Kontaktdaten auf dem Produkt, der Verpackung oder einem Begleitdokument angegeben sind. Die COI prueft dies verstaerkt bei Importware und im Online-Handel. Eine bereits fuer andere EU-Maerkte benannte verantwortliche Person deckt Tschechien mit ab.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['Benennung EU-Bevollmaechtigter'],
      legalBasis: 'Verordnung (EU) 2023/988 (GPSR) Art. 16',
      authority: 'Ceska obchodni inspekce (COI)',
      deadline: 'Gilt seit 13.12.2024',
      penalties: 'Vertriebsverbot, Bussgelder',
      tips: [
        'EU-weite Benennung reicht - keine tschechienspezifische Bestellung noetig',
      ],
      links: [
        { title: 'GPSR im EUR-Lex', url: 'https://eur-lex.europa.eu/eli/reg/2023/988' },
      ],
      priority: 'critical',
      sortOrder: 2,
    },
  ],

  // ==========================================================
  // SCHWEDEN
  // ==========================================================
  SE: [
    {
      title: 'Schwedisches Produzentenregister Verpackungen (Naturvardsverket)',
      description: 'Als Verpackungsproduzent bei der schwedischen Umweltbehoerde Naturvardsverket registrieren.',
      detailedDescription: 'Die Foerpackningsfoerordning (2022:1274) verpflichtet jeden, der verpackte Ware in Schweden erstmals bereitstellt - einschliesslich auslaendischer Fernabsatzhaendler -, sich im Produzentenregister der Naturvardsverket zu registrieren und jaehrlich Verpackungsmengen zu melden. Die Registrierung ist gebuehrenpflichtig (Jahresgebuehr). Fernabsatzhaendler ohne Niederlassung in Schweden muessen einen Bevollmaechtigten bestellen oder sich direkt registrieren, je nach Konstellation.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['Registrierungsbestaetigung Naturvardsverket', 'Jahresmeldung'],
      legalBasis: 'Foerpackningsfoerordning (2022:1274)',
      authority: 'Naturvardsverket',
      deadline: 'Registrierung vor dem ersten Inverkehrbringen; Mengenmeldung jaehrlich bis 31. Maerz',
      penalties: 'Umweltsanktionsgebuehren, Untersagungsverfuegungen',
      tips: [
        'Registrierung online ueber das Portal der Naturvardsverket',
        'Jahresgebuehr einplanen (mengenunabhaengige Grundgebuehr)',
      ],
      links: [
        { title: 'Naturvardsverket Produzentenregister', url: 'https://www.naturvardsverket.se' },
      ],
      priority: 'critical',
      sortOrder: 0,
    },
    {
      title: 'Anschluss an ein Verpackungs-Ruecknahmesystem (NPA)',
      description: 'Einem zugelassenen Producer Responsibility Organisation wie Naringslivets Producentansvar (NPA) beitreten und Entgelte zahlen.',
      detailedDescription: 'Seit 2024 organisieren in Schweden zugelassene Producer Responsibility Organisations die Sammlung von Haushaltsverpackungen; die Kommunen sammeln, die PROs finanzieren. Produzenten muessen einer zugelassenen PRO wie Naringslivets Producentansvar (NPA) beitreten und materialabhaengige Verpackungsentgelte zahlen. Die PRO uebernimmt die operative Mengenabwicklung gegenueber den Kommunen, ersetzt aber nicht die eigene Registrierung bei der Naturvardsverket.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['PRO-Beitrittsvertrag (z. B. NPA)'],
      legalBasis: 'Foerpackningsfoerordning (2022:1274)',
      authority: 'Naturvardsverket',
      penalties: 'Umweltsanktionsgebuehren, Nachforderung der Entgelte',
      tips: [
        'NPA ist die groesste zugelassene PRO und buendelt die frueheren FTI-Strukturen',
        'Materialgenaue Verpackungsdaten liefern - Oeko-Modulation senkt Entgelte fuer recyclingfaehige Verpackungen',
      ],
      links: [
        { title: 'Naringslivets Producentansvar (NPA)', url: 'https://npa.se' },
      ],
      priority: 'critical',
      sortOrder: 1,
    },
    {
      title: 'Schwedische Kennzeichnungs- und Sprachanforderungen',
      description: 'Sicherheitsinformationen und Pflichtangaben muessen auf Schwedisch verfuegbar sein.',
      detailedDescription: 'Das schwedische Produktsicherheitsgesetz (Produktsaekerhetslag 2004:451) und die GPSR verlangen, dass Warnhinweise, Sicherheits- und Gebrauchsinformationen fuer Verbraucherprodukte auf Schwedisch vorliegen. Konsumentverket als Marktueberwachungsbehoerde beanstandet regelmaessig englischsprachige Anleitungen. Fuer Lebensmittel, Chemikalien und Kosmetik gelten zusaetzlich vollstaendige schwedische Etikettierungspflichten.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['Bedienungsanleitung (SV)', 'Sicherheitshinweise (SV)'],
      legalBasis: 'Produktsaekerhetslag (2004:451), GPSR Art. 9',
      authority: 'Konsumentverket',
      penalties: 'Untersagungsverfuegungen, Zwangsgelder',
      tips: [
        'Skandinavische Sammelanleitungen (SV/DA/NO/FI) sind gaengige Praxis und akzeptiert',
        'Sicherheitswarnungen immer auf Schwedisch, auch wenn die Restdoku englisch bleibt',
      ],
      links: [
        { title: 'Konsumentverket', url: 'https://www.konsumentverket.se' },
      ],
      priority: 'high',
      sortOrder: 2,
    },
  ],

  // ==========================================================
  // DAENEMARK
  // ==========================================================
  DK: [
    {
      title: 'Daenische Verpackungs-EPR (Dansk Producentansvar)',
      description: 'Als Verpackungsproduzent im daenischen Produzentenregister (DPA) registrieren - EPR-Pflichten gelten seit Oktober 2025.',
      detailedDescription: 'Daenemark hat die erweiterte Herstellerverantwortung fuer Verpackungen zum 1. Oktober 2025 eingefuehrt. Inverkehrbringer verpackter Ware muessen sich bei Dansk Producentansvar (DPA) registrieren, Verpackungsmengen melden und die Kosten der Sammlung und Verwertung tragen - direkt oder ueber ein Kollektivsystem. Die Registrierungspflicht traf bereits 2024 (Vorab-Mengenmeldung). Auslaendische Fernabsatzhaendler benoetigen einen in Daenemark niedergelassenen Bevollmaechtigten.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['DPA-Registrierung', 'Mengenmeldung', 'ggf. Bevollmaechtigten-Bestellung'],
      legalBasis: 'Miljoebeskyttelsesloven, Bekendtgoerelse om udvidet producentansvar for emballage',
      authority: 'Dansk Producentansvar (DPA), Miljoestyrelsen',
      deadline: 'EPR-Pflichten seit 1. Oktober 2025; jaehrliche Mengenmeldungen',
      penalties: 'Bussgelder, Vertriebsbeschraenkungen',
      tips: [
        'Fruehzeitig Kollektivsystem waehlen - mehrere private Systeme konkurrieren',
        'Graphische Oeko-Modulation: recyclingfaehige Verpackungen zahlen niedrigere Entgelte',
        'DPA verwaltet auch WEEE- und Batterien-Register - Synergien nutzen',
      ],
      links: [
        { title: 'Dansk Producentansvar (DPA)', url: 'https://producentansvar.dk' },
      ],
      priority: 'critical',
      sortOrder: 0,
    },
    {
      title: 'Daenische Sprachpflicht',
      description: 'Sicherheits- und Warnhinweise sowie Pflichtangaben muessen auf Daenisch verfuegbar sein.',
      detailedDescription: 'Das daenische Produktsicherheitsgesetz (Produktsikkerhedsloven) und sektorale Vorschriften verlangen daenischsprachige Sicherheits- und Gebrauchsinformationen fuer Verbraucherprodukte. Die Sikkerhedsstyrelsen akzeptiert bei einfachen Produkten teils englische Dokumentation, sicherheitsrelevante Warnungen muessen aber auf Daenisch vorliegen. Lebensmittel, Kosmetik und Chemikalien benoetigen vollstaendig daenische Etiketten.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['Sicherheitshinweise (DA)', 'Bedienungsanleitung (DA)'],
      legalBasis: 'Produktsikkerhedsloven, GPSR Art. 9',
      authority: 'Sikkerhedsstyrelsen',
      penalties: 'Untersagungsverfuegungen, Bussgelder',
      tips: [
        'Skandinavische Sammelanleitung (DA/SV/NO) ist verbreitete und akzeptierte Praxis',
        'Warnhinweise und Altersangaben zwingend auf Daenisch',
      ],
      links: [
        { title: 'Sikkerhedsstyrelsen', url: 'https://www.sik.dk' },
      ],
      priority: 'high',
      sortOrder: 1,
    },
    {
      title: 'GPSR Wirtschaftsakteur-Pflichten',
      description: 'Verantwortliche Person in der EU benennen und auf Produkt oder Verpackung angeben (gilt auch fuer Lieferungen nach Daenemark).',
      detailedDescription: 'Fuer den daenischen Markt gilt seit 13.12.2024 die GPSR: Verbraucherprodukte brauchen einen in der EU niedergelassenen verantwortlichen Wirtschaftsakteur, dessen Kontaktdaten auf Produkt, Verpackung oder Begleitdokument angegeben sind. Die Sikkerhedsstyrelsen prueft dies insbesondere bei Direktimporten aus Drittstaaten und im Online-Handel. Eine EU-weit benannte verantwortliche Person deckt Daenemark ab.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['Benennung EU-Bevollmaechtigter'],
      legalBasis: 'Verordnung (EU) 2023/988 (GPSR) Art. 16',
      authority: 'Sikkerhedsstyrelsen',
      deadline: 'Gilt seit 13.12.2024',
      penalties: 'Vertriebsverbot, Bussgelder',
      tips: [
        'EU-weite Benennung reicht - keine daenemarkspezifische Bestellung noetig',
      ],
      links: [
        { title: 'GPSR im EUR-Lex', url: 'https://eur-lex.europa.eu/eli/reg/2023/988' },
      ],
      priority: 'critical',
      sortOrder: 2,
    },
  ],
  // ==========================================================
  // BELGIEN
  // ==========================================================
  BE: [
    {
      title: 'Fost Plus Registrierung (Haushaltsverpackungen)',
      description: 'Haushaltsverpackungen ab 50 kg/Jahr bei Fost Plus anmelden und Gruener-Punkt-Entgelte zahlen.',
      detailedDescription: 'Das belgische Kooperationsabkommen ueber Verpackungsabfaelle verpflichtet Inverkehrbringer von Haushaltsverpackungen ab 50 kg pro Jahr zur Ruecknahme und Verwertung. Der Standardweg ist die Mitgliedschaft bei Fost Plus, dem zugelassenen System fuer Haushaltsverpackungen, mit jaehrlicher Mengen-Deklaration und materialabhaengigen Entgelten. Die Aufsicht fuehrt die Interregionale Verpackungskommission (IVC/CIE), bei der sich Verpflichtete alternativ direkt registrieren koennen.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['Fost-Plus-Vertrag', 'Jahresdeklaration'],
      legalBasis: 'Kooperationsabkommen vom 4.11.2008 ueber Verpackungsabfaelle',
      authority: 'Interregionale Verpackungskommission (IVC/CIE), Fost Plus',
      deadline: 'Anmeldung im Jahr des Ueberschreitens der 50-kg-Schwelle',
      penalties: 'Verwaltungsstrafen, Nachzahlung der Entgelte',
      tips: [
        'Schwelle von 50 kg/Jahr ist sehr niedrig - praktisch jeder Haendler ist betroffen',
        'B2C- und B2B-Verpackungen getrennt erfassen (Fost Plus vs. Valipac)',
      ],
      links: [
        { title: 'Fost Plus', url: 'https://www.fostplus.be' },
        { title: 'IVC/CIE', url: 'https://www.ivcie.be' },
      ],
      priority: 'critical',
      sortOrder: 0,
    },
    {
      title: 'Valipac Registrierung (Gewerbeverpackungen)',
      description: 'Gewerbliche und industrielle Verpackungen ueber Valipac entpflichten.',
      detailedDescription: 'Fuer Gewerbe- und Industrieverpackungen (B2B) gilt in Belgien dieselbe Ruecknahmepflicht wie fuer Haushaltsverpackungen. Valipac ist das zugelassene System fuer diesen Bereich und uebernimmt gegen Entgelt die Nachweisfuehrung der Verwertungsquoten. Wer sowohl B2C- als auch B2B-Verpackungen in Verkehr bringt, braucht in der Regel beide Mitgliedschaften (Fost Plus und Valipac). Die Mengenmeldung erfolgt jaehrlich.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['Valipac-Vertrag', 'Jahresdeklaration'],
      legalBasis: 'Kooperationsabkommen vom 4.11.2008 ueber Verpackungsabfaelle',
      authority: 'Interregionale Verpackungskommission (IVC/CIE), Valipac',
      penalties: 'Verwaltungsstrafen, Nachzahlung der Entgelte',
      tips: [
        'Transport- und Umverpackungen (Paletten, Folien, Kartons) zaehlen zu den Gewerbeverpackungen',
        'Valipac zahlt Praemien an belgische Abnehmer fuer nachgewiesene Sortierung - Marketingargument',
      ],
      links: [
        { title: 'Valipac', url: 'https://www.valipac.be' },
      ],
      priority: 'high',
      sortOrder: 1,
    },
    {
      title: 'Belgische Dreisprachigkeit (NL/FR/DE)',
      description: 'Pflichtinformationen muessen in der Sprache der jeweiligen Sprachregion vorliegen - faktisch Niederlaendisch UND Franzoesisch, in Ostbelgien Deutsch.',
      detailedDescription: 'Das belgische Wirtschaftsgesetzbuch (Code de droit economique, Buch VI) verlangt, dass Etiketten, Anleitungen und Garantien mindestens in der Sprache der Sprachregion abgefasst sind, in der das Produkt vermarktet wird. Wer landesweit verkauft (insbesondere online), muss daher Niederlaendisch und Franzoesisch abdecken, fuer die Deutschsprachige Gemeinschaft zusaetzlich Deutsch. Einsprachige Kennzeichnung ist nur bei rein regionalem Vertrieb zulaessig und ein haeufiger Beanstandungsgrund der Wirtschaftsinspektion.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['Etikett (NL/FR)', 'Bedienungsanleitung (NL/FR/DE)'],
      legalBasis: 'Code de droit economique Buch VI Art. VI.8, Sprachengesetzgebung',
      authority: 'FOD Economie / SPF Economie (Wirtschaftsinspektion)',
      penalties: 'Strafrechtliche Geldbussen, Verkaufsuntersagung',
      tips: [
        'Bei landesweitem Online-Vertrieb immer NL + FR vorsehen, DE fuer Ostbelgien ergaenzen',
        'Mehrsprachige Etiketten aus den Nachbarlaendern (NL + FR) wiederverwenden',
      ],
      links: [
        { title: 'FOD Economie', url: 'https://economie.fgov.be' },
      ],
      priority: 'high',
      sortOrder: 2,
    },
  ],

  // ==========================================================
  // PORTUGAL
  // ==========================================================
  PT: [
    {
      title: 'Ponto Verde (SPV) Verpackungslizenzierung Portugal',
      description: 'Verpackungen ueber die Sociedade Ponto Verde (oder ein anderes zugelassenes System) lizenzieren.',
      detailedDescription: 'Das portugiesische Verpackungsrecht (UNILEX, Decreto-Lei 152-D/2017) verpflichtet Inverkehrbringer verpackter Ware zur erweiterten Herstellerverantwortung. Der gaengige Weg ist ein Lizenzvertrag mit der Sociedade Ponto Verde (SPV), die gegen materialabhaengige Entgelte Sammlung und Verwertung organisiert. Zusaetzlich ist die Eintragung in das elektronische Produzentenregister der Umweltbehoerde APA (Plattform SILiAmb/RAP) erforderlich. Jaehrliche Mengen-Deklarationen sind Pflicht.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['SPV-Lizenzvertrag', 'SILiAmb-Registrierung', 'Jahresdeklaration'],
      legalBasis: 'Decreto-Lei 152-D/2017 (UNILEX)',
      authority: 'APA (Agencia Portuguesa do Ambiente), SPV',
      deadline: 'Registrierung vor dem ersten Inverkehrbringen',
      penalties: 'Ordnungswidrigkeiten-Bussen bis 216.000 EUR (juristische Personen)',
      tips: [
        'SILiAmb-Registrierung bei der APA ist von der SPV-Lizenz getrennt - beides erledigen',
        'Auslaendische Fernabsatzhaendler benoetigen einen Bevollmaechtigten in Portugal',
      ],
      links: [
        { title: 'Sociedade Ponto Verde', url: 'https://www.pontoverde.pt' },
        { title: 'APA SILiAmb', url: 'https://siliamb.apambiente.pt' },
      ],
      priority: 'critical',
      sortOrder: 0,
    },
    {
      title: 'Portugiesische Sprachpflicht (DL 238/86)',
      description: 'Alle Verbraucherinformationen muessen nach Decreto-Lei 238/86 in portugiesischer Sprache abgefasst sein.',
      detailedDescription: 'Das Decreto-Lei 238/86 schreibt vor, dass Informationen ueber Art, Eigenschaften und Garantien von Waren, die in Portugal vermarktet werden, auf Portugiesisch verfasst sein muessen. Das umfasst Etiketten, Verpackungsaufdrucke, Anleitungen, Kataloge und Garantiescheine. Die Wirtschafts- und Lebensmittelaufsicht ASAE kontrolliert aktiv; rein spanisch- oder englischsprachige Ware ist ein klassischer Beanstandungsfall.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['Etikett (PT)', 'Bedienungsanleitung (PT)'],
      legalBasis: 'Decreto-Lei 238/86, Decreto-Lei 383/89',
      authority: 'ASAE (Autoridade de Seguranca Alimentar e Economica)',
      penalties: 'Ordnungswidrigkeiten-Bussen, Beschlagnahme nicht konformer Ware',
      tips: [
        'Spanisch ist NICHT ausreichend - eigene portugiesische Fassung erstellen',
        'Brasilianisches Portugiesisch wird toleriert, europaeische Terminologie ist aber vorzuziehen',
      ],
      links: [
        { title: 'ASAE', url: 'https://www.asae.gov.pt' },
      ],
      priority: 'high',
      sortOrder: 1,
    },
    {
      title: 'GPSR Wirtschaftsakteur-Pflichten',
      description: 'Verantwortliche Person in der EU benennen und auf Produkt oder Verpackung angeben (gilt auch fuer Lieferungen nach Portugal).',
      detailedDescription: 'Fuer den portugiesischen Markt gilt seit 13.12.2024 die GPSR: Verbraucherprodukte benoetigen einen in der EU niedergelassenen verantwortlichen Wirtschaftsakteur mit Angabe der Kontaktdaten auf Produkt, Verpackung oder Begleitdokument. Die ASAE prueft dies bei Importware und im Online-Handel. Eine EU-weit benannte verantwortliche Person deckt Portugal ab.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['Benennung EU-Bevollmaechtigter'],
      legalBasis: 'Verordnung (EU) 2023/988 (GPSR) Art. 16',
      authority: 'ASAE',
      deadline: 'Gilt seit 13.12.2024',
      penalties: 'Vertriebsverbot, Bussgelder',
      tips: [
        'EU-weite Benennung reicht - keine portugalspezifische Bestellung noetig',
      ],
      links: [
        { title: 'GPSR im EUR-Lex', url: 'https://eur-lex.europa.eu/eli/reg/2023/988' },
      ],
      priority: 'critical',
      sortOrder: 2,
    },
  ],

  // ==========================================================
  // IRLAND
  // ==========================================================
  IE: [
    {
      title: 'Repak Verpackungs-Compliance Irland',
      description: 'Verpackungspflichten in Irland pruefen: ab 10 t Verpackungen und 1 Mio. EUR Umsatz Repak-Mitgliedschaft oder Selbst-Compliance.',
      detailedDescription: 'Die European Union (Packaging) Regulations 2014 verpflichten Major Producers - Unternehmen mit mehr als 10 Tonnen in Irland in Verkehr gebrachten Verpackungen und ueber 1 Mio. EUR Jahresumsatz - zur erweiterten Herstellerverantwortung. Der Standardweg ist die Mitgliedschaft bei Repak; alternativ ist Selbst-Compliance mit Registrierung bei der lokalen Behoerde und eigener Ruecknahme moeglich, aber aufwaendig. Unterhalb der Schwellen bestehen lediglich allgemeine Ruecknahme-Kooperationspflichten.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['Repak-Mitgliedschaft', 'Mengenmeldung'],
      legalBasis: 'European Union (Packaging) Regulations 2014 (S.I. 282/2014)',
      authority: 'EPA Ireland, Local Authorities, Repak',
      deadline: 'Beitritt im Jahr des Ueberschreitens der Schwellen',
      penalties: 'Geldstrafen bei Verurteilung, Naming durch lokale Behoerden',
      tips: [
        'Schwellen jaehrlich pruefen: 10 t Verpackungen UND 1 Mio. EUR Umsatz (kumulativ)',
        'Repak-Entgelte sind materialabhaengig - recyclingfaehige Verpackungen sparen Kosten',
        'Fernabsatz nach Irland zaehlt zur 10-t-Schwelle dazu',
      ],
      links: [
        { title: 'Repak', url: 'https://repak.ie' },
        { title: 'EPA Ireland', url: 'https://www.epa.ie' },
      ],
      priority: 'critical',
      sortOrder: 0,
    },
    {
      title: 'Englische Kennzeichnung Irland',
      description: 'Pflichtinformationen in englischer Sprache sind in Irland ausreichend - irische Sprache ist nicht erforderlich.',
      detailedDescription: 'Irland verlangt fuer Produktkennzeichnung, Anleitungen und Sicherheitshinweise die englische Sprache; eine Uebersetzung ins Irische (Gaeilge) ist nicht erforderlich. Bestehende englischsprachige Unterlagen (z. B. fuer den britischen Markt) koennen in der Regel uebernommen werden, muessen aber EU-Recht referenzieren (CE statt UKCA, EU-Konformitaetserklaerung, EU-Wirtschaftsakteur). Metrische Einheiten sind verpflichtend.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['Etikett (EN)', 'Bedienungsanleitung (EN)'],
      legalBasis: 'GPSR Art. 9, sektorale EU-Vorschriften',
      authority: 'CCPC (Competition and Consumer Protection Commission)',
      penalties: 'Vertriebsuntersagung bei fehlenden Pflichtangaben',
      tips: [
        'UK-Dokumente pruefen: Verweise auf UK-Recht/UKCA durch EU-Recht/CE ersetzen',
        'EU-Wirtschaftsakteur (nicht UK Responsible Person) angeben',
      ],
      links: [
        { title: 'CCPC', url: 'https://www.ccpc.ie' },
      ],
      priority: 'medium',
      sortOrder: 1,
    },
  ],

  // ==========================================================
  // GROSSBRITANNIEN
  // ==========================================================
  GB: [
    {
      title: 'UKCA vs. CE-Kennzeichnung (Grossbritannien)',
      description: 'Konformitaetskennzeichnung fuer GB pruefen: CE wird fuer die meisten Produktbereiche unbefristet weiter anerkannt, UKCA bleibt optional.',
      detailedDescription: 'Nach dem Brexit hat die britische Regierung 2024 entschieden, die CE-Kennzeichnung fuer die meisten unter das DBT fallenden Produktbereiche (u. a. Elektro, EMV, RoHS, Spielzeug, Maschinen) unbefristet anzuerkennen - eine UKCA-Umstellung ist dort nicht mehr erforderlich, UKCA bleibt als Alternative zulaessig. Ausnahmen mit eigenen Regimen gelten u. a. fuer Medizinprodukte, Bauprodukte, Aufzuege und Ex-Schutz (UKCA bzw. eigene Uebergangsfristen). In Nordirland gilt weiterhin CE (bzw. CE+UKNI) nach dem Windsor Framework. Vor dem GB-Vertrieb je Produktkategorie die aktuelle Anerkennungslage pruefen.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['Konformitaetsbewertung', 'Kennzeichnungskonzept GB/NI'],
      legalBasis: 'Product Safety and Metrology etc. (Amendment) Regulations, UK Product Regulations',
      authority: 'DBT / Office for Product Safety and Standards (OPSS)',
      penalties: 'Vertriebsverbot, Bussgelder, Rueckrufanordnungen',
      tips: [
        'Fuer die meisten Konsumgueter reicht weiterhin CE - keine UKCA-Doppelkennzeichnung noetig',
        'Sonderregime pruefen: Medizinprodukte, Bauprodukte, Aufzuege, ATEX haben eigene Regeln',
        'Nordirland separat betrachten (CE nach Windsor Framework)',
      ],
      links: [
        { title: 'GOV.UK: Using the UKCA marking', url: 'https://www.gov.uk/guidance/using-the-ukca-marking' },
        { title: 'OPSS', url: 'https://www.gov.uk/government/organisations/office-for-product-safety-and-standards' },
      ],
      priority: 'critical',
      sortOrder: 0,
    },
    {
      title: 'UK Responsible Person benennen',
      description: 'Fuer den GB-Markt einen im Vereinigten Koenigreich niedergelassenen verantwortlichen Wirtschaftsakteur (Importeur oder Authorised Representative) sicherstellen.',
      detailedDescription: 'Produkte ohne britischen Hersteller benoetigen einen im UK niedergelassenen Wirtschaftsakteur, der die Konformitaet verantwortet - typischerweise der UK-Importeur oder ein vertraglich bestellter UK Authorised Representative. Dessen Name und Anschrift muessen auf dem Produkt oder den Begleitunterlagen erscheinen. Der EU-Bevollmaechtigte deckt GB nach dem Brexit nicht mehr ab. Fuer Kosmetik und Medizinprodukte gelten eigene Responsible-Person-Regime mit Registrierungspflichten.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['Bestellung UK Responsible Person / Importeursvereinbarung'],
      legalBasis: 'UK Product Safety Regulations, General Product Safety Regulations 2005',
      authority: 'OPSS, Trading Standards',
      penalties: 'Vertriebsverbot, strafbewehrte Verstoesse',
      tips: [
        'UK-Adresse des Importeurs/AR auf Etikett oder Begleitdokument drucken',
        'Bei Kosmetik: UK Responsible Person plus SCPN-Produktnotifizierung erforderlich',
        'Dienstleister bieten UK-AR-Services ab ca. 300-1.500 GBP/Jahr an',
      ],
      links: [
        { title: 'GOV.UK: Placing goods on the GB market', url: 'https://www.gov.uk/guidance/placing-manufactured-goods-on-the-market-in-great-britain' },
      ],
      priority: 'critical',
      sortOrder: 1,
    },
    {
      title: 'UK Packaging EPR (Report Packaging Data)',
      description: 'Verpackungsdaten im UK-EPR-System melden und ab Schwellenwerten Entgelte an PackUK zahlen.',
      detailedDescription: 'Das UK hat die erweiterte Herstellerverantwortung fuer Verpackungen (pEPR) eingefuehrt: Unternehmen mit mehr als 1 Mio. GBP Umsatz und ueber 25 t gehandhabter Verpackungen muessen sich registrieren und Verpackungsdaten melden (Large Producers halbjaehrlich, Small Producers jaehrlich). Seit 2025 zahlen Large Producers zusaetzlich Entsorgungsgebuehren fuer Haushaltsverpackungen an den Scheme Administrator PackUK, moduliert nach Recyclingfaehigkeit. Fernabsatz nach GB zaehlt mit; Online-Marktplaetze haben eigene Meldepflichten fuer Drittlandsware.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['EPR-Registrierung (report packaging data)', 'Datenmeldungen'],
      legalBasis: 'Producer Responsibility Obligations (Packaging and Packaging Waste) Regulations 2024',
      authority: 'Environment Agency / PackUK (DEFRA)',
      deadline: 'Registrierung und Datenmeldung nach Producer-Status (halbjaehrlich/jaehrlich)',
      penalties: 'Zivilrechtliche Sanktionen, Bussgelder, Veroeffentlichung von Verstoessen',
      tips: [
        'Producer-Status bestimmen: Small (>1 Mio. GBP + >25 t) vs. Large (>2 Mio. GBP + >50 t)',
        'Recyclingfaehigkeits-Bewertung (RAM) beeinflusst die Gebuehrenhoehe erheblich',
        'Auch das frueher separate PRN-System (Recyclingnachweise) laeuft im neuen Regime weiter',
      ],
      links: [
        { title: 'GOV.UK: Packaging producer responsibilities', url: 'https://www.gov.uk/guidance/packaging-producer-responsibilities' },
      ],
      priority: 'critical',
      sortOrder: 2,
    },
    {
      title: 'GB-Konformitaetserklaerung bereithalten',
      description: 'Fuer GB eine UK Declaration of Conformity (bei UKCA) bzw. die EU-Konformitaetserklaerung mit UK-Bezug verfuegbar halten.',
      detailedDescription: 'Auch bei fortgesetzter CE-Anerkennung muessen fuer den GB-Markt Konformitaetsunterlagen vorgehalten und den britischen Behoerden auf Verlangen vorgelegt werden. Wer UKCA nutzt, braucht eine UK Declaration of Conformity mit Verweis auf die UK-Rechtsvorschriften und designated standards; bei CE genuegt die EU-Konformitaetserklaerung mit den harmonisierten Normen. Der UK-Importeur muss Zugriff auf die technische Dokumentation haben (10 Jahre Aufbewahrung).',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['UK Declaration of Conformity', 'EU-Konformitaetserklaerung', 'Technische Dokumentation'],
      legalBasis: 'UK Product Regulations (z. B. Electrical Equipment (Safety) Regulations 2016)',
      authority: 'OPSS, Trading Standards',
      penalties: 'Bussgelder, Vertriebsuntersagung bei fehlenden Unterlagen',
      tips: [
        'UK DoC referenziert UK Statutory Instruments und designated standards, nicht EU-Richtlinien',
        'Dokumente in Englisch ausstellen und dem UK-Importeur zugaenglich machen',
      ],
      links: [
        { title: 'GOV.UK: UK Declaration of Conformity', url: 'https://www.gov.uk/guidance/uk-declaration-of-conformity' },
      ],
      priority: 'high',
      sortOrder: 3,
    },
  ],

  // ==========================================================
  // USA
  // ==========================================================
  US: [
    {
      title: 'US-Marktzugang: Kein CE - produktspezifisches Bundesrecht pruefen',
      description: 'Die CE-Kennzeichnung hat in den USA keine Bedeutung - die anwendbaren US-Bundesvorschriften je Produktart identifizieren.',
      detailedDescription: 'Der US-Markt kennt kein horizontales Konformitaetszeichen wie CE. Stattdessen gelten produktspezifische Bundesregime: CPSC fuer Konsumgueter, FCC fuer Funk/Elektronik, FDA fuer Lebensmittel/Kosmetik/Medizinprodukte, EPA fuer Chemikalien und Pestizide, DOT fuer Transportgueter. Vor dem Markteintritt muss je Produkt geklaert werden, welche Behoerde zustaendig ist und welche Pruef-, Registrierungs- und Kennzeichnungspflichten gelten. Zusaetzlich existiert einzelstaatliches Recht (z. B. Kalifornien), das strenger sein kann als Bundesrecht.',
      mandatory: true,
      category: MZ,
      documentRequired: false,
      legalBasis: 'CPSA, FCC Rules (47 CFR), FD&C Act, TSCA - je nach Produktart',
      authority: 'CPSC, FCC, FDA, EPA - je nach Produktart',
      penalties: 'Civil Penalties bis in Millionenhoehe, Importverweigerung, Rueckrufe',
      tips: [
        'Regulatorisches Mapping VOR Produktentwicklung machen - US-Anforderungen unterscheiden sich technisch von EU-Normen',
        'CE-Pruefberichte sind nur begrenzt wiederverwendbar; US-Normen (ANSI/UL/ASTM) pruefen',
        'Einzelstaaten-Recht (insb. Kalifornien) separat checken',
      ],
      links: [
        { title: 'CPSC Business Guidance', url: 'https://www.cpsc.gov/Business--Manufacturing' },
        { title: 'FDA Industry', url: 'https://www.fda.gov/industry' },
      ],
      priority: 'critical',
      sortOrder: 0,
    },
    {
      title: 'CPSC/CPSIA-Grundpflichten (GCC/CPC)',
      description: 'Fuer Konsumgueter ein General Certificate of Conformity (GCC) bzw. fuer Kinderprodukte ein Children\'s Product Certificate (CPC) ausstellen.',
      detailedDescription: 'Der Consumer Product Safety Improvement Act (CPSIA) verlangt fuer importierte Konsumgueter, die einer CPSC-Regel unterliegen, ein General Certificate of Conformity auf Basis von Tests oder einem angemessenen Pruefprogramm. Kinderprodukte benoetigen ein Children\'s Product Certificate auf Basis von Tests durch ein CPSC-akkreditiertes Drittlabor sowie eine permanente Tracking-Kennzeichnung. Die Zertifikate muessen Haendlern und der CPSC/dem Zoll auf Verlangen vorgelegt werden; Importeure sind dafuer verantwortlich.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['GCC / CPC', 'Drittlabor-Pruefberichte', 'Tracking-Label-Konzept'],
      legalBasis: 'CPSIA 2008, CPSA, 16 CFR Part 1110',
      authority: 'CPSC (Consumer Product Safety Commission)',
      penalties: 'Civil Penalties bis ca. 120.000 USD je Verstoss (inflationsindexiert), Importstopp',
      tips: [
        'Pruefen, welche CPSC-Rules das Produkt betreffen (z. B. 16 CFR 1500er-Serie)',
        'Kinderprodukte: nur CPSC-akzeptierte Labore verwenden (Liste auf cpsc.gov)',
        'Zertifikat muss jede Produktcharge abdecken - Periodic Testing einplanen',
      ],
      links: [
        { title: 'CPSC Certification', url: 'https://www.cpsc.gov/Business--Manufacturing/Testing-Certification' },
      ],
      priority: 'critical',
      sortOrder: 1,
    },
    {
      title: 'California Proposition 65 Warnpflichten',
      description: 'Produkte auf Prop-65-Stoffe pruefen und bei Exposition die vorgeschriebene Warnung fuer Kalifornien anbringen.',
      detailedDescription: 'Kaliforniens Proposition 65 verlangt eine deutliche Warnung, wenn ein Produkt Verbraucher einem der ueber 900 gelisteten Stoffe (krebserzeugend oder reproduktionstoxisch, z. B. Blei, Cadmium, Phthalate, Acrylamid) oberhalb der Safe-Harbor-Grenzwerte aussetzt. Betroffen ist jeder Verkauf nach Kalifornien, auch online. Die Durchsetzung erfolgt massgeblich durch private Klaeger (Abmahnindustrie); Vergleiche kosten regelmaessig fuenfstellige Betraege. Strategie: Stoffpruefung, Reformulierung oder standardisierte Short-Form-Warnung.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['Stoffanalysen', 'Prop-65-Risikobewertung'],
      legalBasis: 'California Health and Safety Code 25249.5 ff. (Proposition 65)',
      authority: 'OEHHA (Kalifornien), private Durchsetzung',
      penalties: 'Bis 2.500 USD pro Tag und Verstoss, kostspielige private Vergleiche',
      tips: [
        'Lieferkette auf gelistete Stoffe screenen (insb. Blei, Cadmium, Phthalate, BPA)',
        'Short-Form-Warnung nach den seit 2025 verschaerften OEHHA-Formatregeln verwenden',
        'Warnung auch im Online-Listing VOR dem Kauf anzeigen',
      ],
      links: [
        { title: 'P65Warnings (OEHHA)', url: 'https://www.p65warnings.ca.gov' },
      ],
      priority: 'high',
      sortOrder: 2,
    },
    {
      title: 'State-EPR fuer Verpackungen (CA/CO/OR/ME u. a.)',
      description: 'Verpackungs-EPR-Programme einzelner US-Bundesstaaten pruefen und sich bei den Producer Responsibility Organizations registrieren.',
      detailedDescription: 'Mehrere US-Bundesstaaten haben EPR-Gesetze fuer Verpackungen eingefuehrt - vorneweg Oregon (Recycling Modernization Act, Gebuehren seit Juli 2025), Kalifornien (SB 54), Colorado und Maine; weitere Staaten (u. a. Minnesota, Maryland, Washington) folgen. Producer muessen sich in der Regel bei der Circular Action Alliance (CAA) als PRO registrieren, Verpackungsdaten melden und mengen-/materialabhaengige Gebuehren zahlen. Die Definitionen von Producer und die Schwellenwerte unterscheiden sich je Staat.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['CAA/PRO-Registrierung', 'Verpackungsdatenmeldungen'],
      legalBasis: 'CA SB 54, OR Recycling Modernization Act, CO HB22-1355, ME LD 1541',
      authority: 'Circular Action Alliance (PRO), CalRecycle, Oregon DEQ u. a.',
      deadline: 'Je Staat unterschiedlich - Oregon-Gebuehren laufen seit 07/2025, Kalifornien folgt gestaffelt',
      penalties: 'Verkaufsverbote in den jeweiligen Staaten, Bussgelder',
      tips: [
        'Pruefen, in welche Staaten relevant geliefert wird und ob Small-Producer-Ausnahmen greifen',
        'Verpackungsdaten zentral pflegen - dieselben Daten dienen EU-EPR und US-State-EPR',
        'CAA-Registrierung deckt mehrere Staaten ueber eine Plattform ab',
      ],
      links: [
        { title: 'Circular Action Alliance', url: 'https://circularactionalliance.org' },
        { title: 'CalRecycle SB 54', url: 'https://calrecycle.ca.gov/packaging/epr/' },
      ],
      priority: 'high',
      sortOrder: 3,
    },
    {
      title: 'FTC- und Zollkennzeichnung (Country of Origin, FPLA)',
      description: 'US-Kennzeichnungsrecht erfuellen: Country-of-Origin-Markierung, Fair Packaging and Labeling Act und FTC-Regeln zu Werbeaussagen.',
      detailedDescription: 'Importware muss nach 19 U.S.C. 1304 dauerhaft und sichtbar mit dem Ursprungsland gekennzeichnet sein (z. B. Made in China); der US-Zoll (CBP) weist falsch markierte Ware zurueck oder erhebt Marking Duties. Der Fair Packaging and Labeling Act verlangt auf Konsumgueter-Verpackungen Identitaet des Produkts, Name und Sitz des Verantwortlichen sowie Mengenangabe in US- und metrischen Einheiten. Werbeaussagen wie Made in USA oder Umweltclaims unterliegen strengen FTC-Regeln (Green Guides).',
      mandatory: true,
      category: MZ,
      documentRequired: false,
      legalBasis: '19 U.S.C. 1304, Fair Packaging and Labeling Act (15 U.S.C. 1451 ff.), FTC Act',
      authority: 'FTC, CBP (U.S. Customs and Border Protection)',
      penalties: 'Marking Duties (10 Prozent), Importverweigerung, FTC-Verfahren mit Civil Penalties',
      tips: [
        'Ursprungslandangabe dauerhaft am Produkt anbringen, nicht nur am Umkarton',
        'Mengenangaben dual deklarieren (oz/lb UND g/kg)',
        'Umwelt- und Made-in-USA-Claims nur mit belastbarer Substantiierung verwenden',
      ],
      links: [
        { title: 'FTC Labeling', url: 'https://www.ftc.gov/business-guidance' },
        { title: 'CBP Marking Requirements', url: 'https://www.cbp.gov/trade/rulings/informed-compliance-publications' },
      ],
      priority: 'high',
      sortOrder: 4,
    },
    {
      title: 'Importer of Record und Zollpflichten (USA)',
      description: 'Einen Importer of Record mit US-Haftung bestimmen und Zollprozesse (Customs Bond, Entry, Tarifierung) aufsetzen.',
      detailedDescription: 'Jede US-Einfuhr braucht einen Importer of Record (IOR), der gegenueber CBP fuer Zollanmeldung, korrekte Tarifierung (HTSUS), Zollwert und Einhaltung aller Einfuhrvorschriften haftet. Auslaendische Unternehmen koennen als Foreign Importer of Record mit US-Zollagent und Customs Bond agieren oder einen US-Distributor/Dienstleister einsetzen. Reasonable Care ist gesetzlicher Massstab; Verstoesse fuehren zu Strafzuschlaegen. Partner-Behoerden (FDA, CPSC, FCC) koppeln ihre Freigaben an die Zollabfertigung.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['Customs Bond', 'Power of Attorney Zollagent', 'HTSUS-Tarifierungsliste'],
      legalBasis: '19 U.S.C. 1484 (Entry of Merchandise), 19 CFR',
      authority: 'CBP (U.S. Customs and Border Protection)',
      penalties: 'Strafzuschlaege bis zum Warenwert, Beschlagnahme, Importsperren',
      tips: [
        'Lizenzierten Customs Broker beauftragen und Continuous Bond abschliessen',
        'HTSUS-Tarifierung dokumentieren - falsche Codes sind der haeufigste Compliance-Fehler',
        'Sektion-301-Zusatzzoelle (China-Ware) in der Kalkulation beruecksichtigen',
      ],
      links: [
        { title: 'CBP Importing into the U.S.', url: 'https://www.cbp.gov/trade/basic-import-export' },
      ],
      priority: 'high',
      sortOrder: 5,
    },
  ],

  // ==========================================================
  // SCHWEIZ
  // ==========================================================
  CH: [
    {
      title: 'Cassis-de-Dijon-Prinzip und THG (Schweiz)',
      description: 'Pruefen, ob das Produkt nach dem Cassis-de-Dijon-Prinzip mit EU-Konformitaet in die Schweiz darf - oder unter eine Ausnahme faellt.',
      detailedDescription: 'Das Bundesgesetz ueber die technischen Handelshemmnisse (THG) erlaubt es, Produkte, die rechtmaessig in der EU/im EWR in Verkehr sind, grundsaetzlich ohne zusaetzliche Schweizer Pruefung zu vermarkten (Cassis-de-Dijon-Prinzip). Wichtige Ausnahmen bestehen u. a. fuer zulassungspflichtige Produkte, Lebensmittel (Bewilligung des BLV noetig), Chemikalien-Anmeldungen und Bereiche mit ausdruecklichen Schweizer Sondervorschriften. Fuer Bereiche mit bilateralen Abkommen (MRA) gelten harmonisierte Konformitaetsverfahren - mit Ausnahme der Medizinprodukte, wo das MRA nicht aktualisiert wurde.',
      mandatory: true,
      category: MZ,
      documentRequired: false,
      legalBasis: 'THG (SR 946.51), VIPaV (SR 946.513.8)',
      authority: 'SECO (Staatssekretariat fuer Wirtschaft)',
      penalties: 'Vertriebsverbot bei Ausnahmetatbestaenden ohne Schweizer Konformitaet',
      tips: [
        'Negativliste des SECO pruefen: nicht alle Produkte profitieren vom Cassis-de-Dijon-Prinzip',
        'Lebensmittel nach Cassis-de-Dijon brauchen eine BLV-Bewilligung',
        'Medizinprodukte: MRA-Wegfall beachten - eigenes Schweizer Regime (siehe Kategorie-Items)',
      ],
      links: [
        { title: 'SECO Cassis-de-Dijon', url: 'https://www.seco.admin.ch/seco/de/home/Aussenwirtschaftspolitik_Wirtschaftliche_Zusammenarbeit/Wirtschaftsbeziehungen/Technische_Handelshemmnisse/Cassis-de-Dijon-Prinzip.html' },
      ],
      priority: 'high',
      sortOrder: 0,
    },
    {
      title: 'Schweizer Wirtschaftsakteur / Bevollmaechtigter pruefen',
      description: 'Klaeren, ob fuer die Produktkategorie ein in der Schweiz niedergelassener Wirtschaftsakteur oder Bevollmaechtigter (CH-REP) noetig ist.',
      detailedDescription: 'Anders als in der EU besteht in der Schweiz keine horizontale Pflicht zu einem inlaendischen Wirtschaftsakteur - fuer einzelne Bereiche ist sie aber zwingend: Medizinprodukte und IVD benoetigen seit dem MRA-Wegfall einen CH-REP und Schweizer Importeur, bei Chemikalien und Biozid-Produkten ist eine Schweizer Anmelde-/Zulassungsadresse erforderlich, und Lebensmittel brauchen eine in der Schweiz domizilierte verantwortliche Person bzw. Importadresse auf dem Etikett. Fuer klassische CE-Konsumgueter genuegt dagegen meist der EU-Wirtschaftsakteur.',
      mandatory: false,
      category: MZ,
      documentRequired: true,
      documentTypes: ['CH-REP-Mandat (falls einschlaegig)'],
      legalBasis: 'MepV (SR 812.213), LGV (SR 817.02), ChemV (SR 813.11) - je nach Produktart',
      authority: 'Swissmedic, BLV, BAG - je nach Produktart',
      penalties: 'Vertriebsverbot in den regulierten Bereichen',
      tips: [
        'Je Produktkategorie pruefen - pauschale Antworten sind hier falsch',
        'Lebensmittel: Schweizer Adresse der verantwortlichen Person auf dem Etikett angeben',
        'CH-REP-Dienstleister buendeln oft Medizinprodukte-, Chemikalien- und Kosmetikvertretung',
      ],
      links: [
        { title: 'Swissmedic CH-REP', url: 'https://www.swissmedic.ch' },
      ],
      priority: 'high',
      sortOrder: 1,
    },
    {
      title: 'Schweizer Sprachregelung (DE/FR/IT)',
      description: 'Sicherheits- und Pflichtinformationen in den Amtssprachen der Vertriebsregionen bereitstellen - im Zweifel Deutsch, Franzoesisch und Italienisch.',
      detailedDescription: 'Produktinformationen muessen in der Schweiz in der Amtssprache des Vertriebsgebiets vorliegen; bei landesweitem Vertrieb bedeutet das praktisch Deutsch, Franzoesisch und Italienisch. Das Produktesicherheitsgesetz (PrSG) verlangt Warn- und Sicherheitshinweise in der Sprache des Verwendungsorts, Lebensmittel- und Chemikalienrecht schreiben die Amtssprachen ausdruecklich vor (Chemikalien: mindestens zwei Amtssprachen fuer Gefahrenkennzeichnung). Englisch allein ist nicht ausreichend.',
      mandatory: true,
      category: MZ,
      documentRequired: true,
      documentTypes: ['Etikett (DE/FR/IT)', 'Bedienungsanleitung (DE/FR/IT)'],
      legalBasis: 'PrSG (SR 930.11), LIV (SR 817.022.16), ChemV (SR 813.11)',
      authority: 'BFK / kantonale Vollzugsbehoerden, BLV',
      penalties: 'Vertriebsuntersagung, Bussen',
      tips: [
        'EU-Mehrsprachenetiketten (DE/FR/IT) lassen sich meist direkt weiterverwenden',
        'Chemikalien: Gefahrenkennzeichnung in mindestens zwei Amtssprachen',
        'Bei Online-Only-Vertrieb in eine Region kann eine Sprache genuegen - dokumentieren',
      ],
      links: [
        { title: 'Produktesicherheit Schweiz (SECO)', url: 'https://www.seco.admin.ch' },
      ],
      priority: 'high',
      sortOrder: 2,
    },
    {
      title: 'VOC-Lenkungsabgabe (Schweiz)',
      description: 'Bei Produkten mit fluechtigen organischen Verbindungen (Farben, Lacke, Reiniger, Kosmetik) die Schweizer VOC-Abgabe pruefen und deklarieren.',
      detailedDescription: 'Die Schweiz erhebt eine Lenkungsabgabe von 3 CHF pro Kilogramm fluechtiger organischer Verbindungen (VOC) auf Importe und inlaendische Herstellung. Betroffen sind Stoffe der Positivliste der VOCV sowie VOC-haltige Produkte wie Farben, Lacke, Klebstoffe, Reinigungsmittel und kosmetische Erzeugnisse. Die Abgabe wird bei der Einfuhr durch das BAZG erhoben; der VOC-Gehalt muss in der Zollanmeldung deklariert werden. Befreiungen sind ueber das Verpflichtungsverfahren moeglich, wenn VOC nicht in die Umwelt gelangen.',
      mandatory: false,
      category: MZ,
      documentRequired: true,
      documentTypes: ['VOC-Deklaration', 'Produktrezeptur/VOC-Gehaltsnachweis'],
      legalBasis: 'VOCV (SR 814.018), USG',
      authority: 'BAZG (Bundesamt fuer Zoll und Grenzsicherheit), BAFU',
      penalties: 'Nachforderungen mit Verzugszins, zollstrafrechtliche Verfahren',
      tips: [
        'VOC-Gehalt je Rezeptur vom Lieferanten bestaetigen lassen',
        'Positivliste der VOCV pruefen - nicht jedes Loesemittel ist abgabepflichtig',
        'Bei hohen Volumina Verpflichtungsverfahren zur Rueckerstattung pruefen',
      ],
      links: [
        { title: 'BAZG VOC-Abgabe', url: 'https://www.bazg.admin.ch/bazg/de/home/informationen-firmen/abgaben-und-steuern/einfuhr-in-die-schweiz/lenkungsabgabe-voc.html' },
      ],
      priority: 'medium',
      sortOrder: 3,
    },
  ],
};

export const COUNTRY_CATEGORY = {
  // ==========================================================
  // DEUTSCHLAND - kategoriespezifisch
  // ==========================================================
  DE: {
    electronics: [
      {
        title: 'WEEE-Registrierung bei Stiftung EAR',
        description: 'Vor dem Inverkehrbringen je Marke und Geraeteart bei der Stiftung Elektro-Altgeraete Register (EAR) registrieren.',
        detailedDescription: 'Das ElektroG verlangt eine Registrierung bei der Stiftung EAR fuer jede Kombination aus Marke und Geraeteart, BEVOR Geraete in Deutschland in Verkehr gebracht werden. Die WEEE-Registrierungsnummer (WEEE-Reg.-Nr. DE) muss auf Rechnungen und beim Online-Vertrieb angegeben werden. Hersteller ohne Niederlassung in Deutschland muessen einen Bevollmaechtigten bestellen. Die Bearbeitung dauert mehrere Wochen - Vorlauf einplanen. Monatliche bzw. jaehrliche Mengenmeldungen an die EAR sind Pflicht.',
        mandatory: true,
        category: 'Registrierung & Entsorgung',
        documentRequired: true,
        documentTypes: ['EAR-Registrierungsbescheid', 'WEEE-Reg.-Nr.', 'Mengenmeldungen'],
        legalBasis: 'ElektroG Paragraf 6',
        authority: 'Stiftung Elektro-Altgeraete Register (EAR)',
        deadline: 'Registrierung VOR dem ersten Inverkehrbringen (Bearbeitungszeit 8-10 Wochen)',
        penalties: 'Bussgeld bis 100.000 EUR je Verstoss, Vertriebsverbot, Gewinnabschoepfung',
        tips: [
          'Jede Marke und jede Geraeteart einzeln registrieren - eine Sammelregistrierung gibt es nicht',
          'WEEE-Nummer in Marktplatz-Accounts hinterlegen (Amazon/eBay sperren ohne Nachweis)',
          'Geraeteart-Zuordnung sorgfaeltig pruefen - falsche Kategorien fuehren zu Beanstandungen',
        ],
        links: [
          { title: 'Stiftung EAR', url: 'https://www.stiftung-ear.de' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
      {
        title: 'Insolvenzsichere Garantie fuer B2C-Geraete',
        description: 'Fuer Elektrogeraete, die in privaten Haushalten genutzt werden koennen, jaehrlich eine insolvenzsichere Garantie nachweisen.',
        detailedDescription: 'Hersteller von b2c-faehigen Elektrogeraeten muessen der Stiftung EAR jaehrlich eine insolvenzsichere Garantie fuer die Finanzierung der Entsorgung nachweisen (Paragraf 7 ElektroG). Zulaessig sind u. a. Buergschaften, Garantiesysteme oder die Teilnahme an kollektiven Garantiesystemen. Ohne gueltige Garantie erlischt die Registrierung fuer die betroffene Geraeteart. Die Garantiehoehe richtet sich nach den gemeldeten Mengen.',
        mandatory: true,
        category: 'Registrierung & Entsorgung',
        documentRequired: true,
        documentTypes: ['Garantienachweis (Buergschaft/Garantiesystem)'],
        legalBasis: 'ElektroG Paragraf 7',
        authority: 'Stiftung Elektro-Altgeraete Register (EAR)',
        deadline: 'Jaehrlich vor Ablauf der bestehenden Garantie',
        penalties: 'Widerruf der Registrierung, Vertriebsverbot',
        tips: [
          'Kollektive Garantiesysteme sind fuer kleine Mengen meist guenstiger als Einzelbuergschaften',
          'Garantie laeuft kalenderjaehrlich - Verlaengerung rechtzeitig beantragen',
        ],
        links: [
          { title: 'Stiftung EAR Garantie', url: 'https://www.stiftung-ear.de/de/hersteller-bv/garantie' },
        ],
        priority: 'high',
        sortOrder: 91,
      },
      {
        title: 'Ruecknahme- und Entsorgungspflichten',
        description: 'Vertreiber-Ruecknahmepflichten erfuellen: ab 400 qm Verkaufs- bzw. Lagerflaeche Altgeraete kostenlos zuruecknehmen.',
        detailedDescription: 'Haendler mit mindestens 400 qm Verkaufsflaeche fuer Elektrogeraete (bzw. Versandhaendler mit 400 qm Lagerflaeche) muessen Altgeraete kostenlos zuruecknehmen: grosse Geraete bei Neukauf eines gleichwertigen Geraets (1:1), kleine Geraete bis 25 cm Kantenlaenge auch ohne Neukauf (0:1). Versandhaendler muessen bei Auslieferung von Waermeuebertraegern, Bildschirmgeraeten und Grossgeraeten die kostenlose Abholung aktiv anbieten. Kunden sind ueber Ruecknahmemoeglichkeiten zu informieren.',
        mandatory: true,
        category: 'Registrierung & Entsorgung',
        documentRequired: false,
        legalBasis: 'ElektroG Paragraf 17',
        authority: 'Umweltbundesamt, Landesbehoerden',
        penalties: 'Bussgelder bis 100.000 EUR, Abmahnungen',
        tips: [
          'Im Online-Shop einen gut auffindbaren Hinweis auf Ruecknahmemoeglichkeiten platzieren',
          'Abholangebot fuer Grossgeraete in den Checkout-Prozess integrieren',
          'Ruecknahmeprozess mit dem Logistikpartner vertraglich regeln',
        ],
        links: [
          { title: 'Umweltbundesamt ElektroG', url: 'https://www.umweltbundesamt.de/themen/abfall-ressourcen/produktverantwortung-in-der-abfallwirtschaft/elektroaltgeraete' },
        ],
        priority: 'high',
        sortOrder: 92,
      },
      {
        title: 'Kennzeichnung durchgestrichene Muelltonne',
        description: 'Alle Elektrogeraete dauerhaft mit dem Symbol der durchgestrichenen Muelltonne und Herstellerkennung versehen.',
        detailedDescription: 'Elektrogeraete muessen nach Paragraf 9 ElektroG dauerhaft mit dem Symbol der durchgestrichenen Abfalltonne (EN 50419) gekennzeichnet sein, damit Verbraucher sie nicht im Hausmuell entsorgen. Zusaetzlich ist eine eindeutige Herstellerkennzeichnung und ein Produktionsdatum bzw. Inverkehrbringungszeitraum erforderlich. Bei sehr kleinen Geraeten darf das Symbol auf Verpackung und Begleitpapiere ausweichen. Die Kennzeichnung muss ueber die Lebensdauer lesbar bleiben.',
        mandatory: true,
        category: 'Kennzeichnung & Information',
        documentRequired: false,
        legalBasis: 'ElektroG Paragraf 9, EN 50419',
        authority: 'Stiftung EAR, Marktueberwachung der Laender',
        penalties: 'Bussgelder, Vertriebsbeschraenkungen',
        tips: [
          'Symbol direkt ins Gehaeuse praegen oder dauerhaft lasern statt Aufkleber verwenden',
          'Mindestgroesse und Proportionen nach EN 50419 einhalten',
        ],
        links: [
          { title: 'Stiftung EAR Kennzeichnung', url: 'https://www.stiftung-ear.de' },
        ],
        priority: 'high',
        sortOrder: 93,
      },
    ],
    batteries: [
      {
        title: 'BattG-Registrierung im EAR-Batterieregister',
        description: 'Vor dem Inverkehrbringen von Batterien (auch eingebauten) im Batterieregister der Stiftung EAR registrieren und einem Ruecknahmesystem beitreten.',
        detailedDescription: 'Das Batteriegesetz verpflichtet Hersteller und Importeure von Batterien - einschliesslich in Geraete eingebauter Zellen - zur Registrierung im Batterieregister der Stiftung EAR vor dem ersten Inverkehrbringen. Geraetebatterien-Hersteller muessen sich zusaetzlich einem zugelassenen Ruecknahmesystem (z. B. GRS Batterien, Stiftung EAR-Systeme) anschliessen und jaehrlich Mengen melden. Die EU-Batterieverordnung 2023/1542 ueberfuehrt diese Pflichten schrittweise in ein harmonisiertes EPR-Regime; die deutsche Registrierung bleibt vorerst bestehen.',
        mandatory: true,
        category: 'Registrierung & Entsorgung',
        documentRequired: true,
        documentTypes: ['BattG-Registrierungsnachweis', 'Ruecknahmesystem-Vertrag', 'Mengenmeldung'],
        legalBasis: 'BattG, Verordnung (EU) 2023/1542',
        authority: 'Stiftung Elektro-Altgeraete Register (EAR)',
        deadline: 'Registrierung VOR dem ersten Inverkehrbringen',
        penalties: 'Bussgeld bis 100.000 EUR, Vertriebsverbot',
        tips: [
          'Auch fest eingebaute Akkus in Geraeten loesen die Registrierungspflicht aus',
          'Bei Geraete- UND Batterieregistrierung: beide Register der EAR getrennt bedienen',
          'Uebergang zur EU-Batterieverordnung beobachten - neue Registerpflichten ab 2025/2026',
        ],
        links: [
          { title: 'EAR Batterieregister', url: 'https://www.stiftung-ear.de/de/hersteller-bv/batterien' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
    ],
    food_supplements: [
      {
        title: 'NemV Paragraf 5: Anzeige beim BVL',
        description: 'Nahrungsergaenzungsmittel spaetestens beim ersten Inverkehrbringen mit Musteretikett beim Bundesamt fuer Verbraucherschutz (BVL) anzeigen.',
        detailedDescription: 'Nach Paragraf 5 der Nahrungsergaenzungsmittelverordnung (NemV) muss der Hersteller oder Einfuehrer dem BVL spaetestens beim ersten Inverkehrbringen ein Muster des verwendeten Etiketts uebermitteln. Die Anzeige erfolgt elektronisch ueber das BVL-Portal und ist gebuehrenfrei; sie ist eine reine Meldung, keine Zulassung - die Verantwortung fuer die Verkehrsfaehigkeit (zulaessige Vitamine/Mineralstoffe nach Anlagen 1 und 2 NemV, Health Claims nach VO 1924/2006) bleibt beim Unternehmen. Unterlassene Anzeigen sind bussgeldbewehrt und fallen bei amtlichen Kontrollen regelmaessig auf.',
        mandatory: true,
        category: 'Lebensmittel- & Gesundheitsrecht',
        documentRequired: true,
        documentTypes: ['BVL-Anzeigebestaetigung', 'Musteretikett'],
        legalBasis: 'NemV Paragraf 5, Richtlinie 2002/46/EG',
        authority: 'Bundesamt fuer Verbraucherschutz und Lebensmittelsicherheit (BVL)',
        deadline: 'Spaetestens beim ersten Inverkehrbringen in Deutschland',
        penalties: 'Bussgeld, Beanstandung durch Lebensmittelueberwachung',
        tips: [
          'Anzeige online ueber das BVL-Verbraucherportal einreichen und Bestaetigung archivieren',
          'Bei Rezeptur- oder Etikettaenderungen erneut anzeigen',
          'Nur Vitamin- und Mineralstoffverbindungen der NemV-Anlagen verwenden',
        ],
        links: [
          { title: 'BVL Anzeige Nahrungsergaenzungsmittel', url: 'https://www.bvl.bund.de/DE/Arbeitsbereiche/01_Lebensmittel/03_Verbraucher/04_NEM/NEM_node.html' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
    ],
    chemicals: [
      {
        title: 'Giftinformations-Meldung (BfR/ECHA-PCN)',
        description: 'Gefaehrliche Gemische vor dem Inverkehrbringen ueber das ECHA-PCN-Portal mit UFI-Code an die Giftinformationszentren melden.',
        detailedDescription: 'Fuer Gemische, die als gesundheitsgefaehrlich oder physikalisch gefaehrlich eingestuft sind, verlangt Anhang VIII der CLP-Verordnung eine harmonisierte Mitteilung an die Giftinformationszentren ueber das PCN-Portal der ECHA - in Deutschland laeuft die Information beim BfR zusammen. Das Etikett muss den eindeutigen Rezepturidentifikator (UFI) tragen. Die fruehere nationale Meldung nach Paragraf 16e ChemG ist im PCN-Verfahren aufgegangen. Ohne gueltige Meldung und UFI ist das Inverkehrbringen unzulaessig.',
        mandatory: true,
        category: 'Chemikalien & Stoffe',
        documentRequired: true,
        documentTypes: ['PCN-Meldebestaetigung', 'UFI-Codes', 'Sicherheitsdatenblaetter'],
        legalBasis: 'CLP-Verordnung (EG) 1272/2008 Anhang VIII, ChemG Paragraf 16e',
        authority: 'BfR / ECHA (PCN-Portal)',
        deadline: 'VOR dem ersten Inverkehrbringen',
        penalties: 'Bussgelder nach ChemG, Vertriebsuntersagung',
        tips: [
          'UFI-Code je Rezeptur generieren und dauerhaft auf das Etikett drucken',
          'Bei Rezepturaenderung neue Meldung mit neuem UFI einreichen',
          'B2B-only-Gemische haben erleichterte Meldepflichten - Anwendungsbereich pruefen',
        ],
        links: [
          { title: 'ECHA Poison Centre Notification', url: 'https://poisoncentres.echa.europa.eu' },
          { title: 'BfR Produktmeldungen', url: 'https://www.bfr.bund.de' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
    ],
    medical_devices: [
      {
        title: 'DMIDS-Anzeige nach MPDG',
        description: 'Taetigkeit und Produkte im Deutschen Medizinprodukte-Informations- und Datenbanksystem (DMIDS) anzeigen, soweit EUDAMED noch nicht verpflichtend ist.',
        detailedDescription: 'Wirtschaftsakteure mit Sitz in Deutschland muessen ihre Taetigkeitsaufnahme und bestimmte Produkte nach dem Medizinprodukterecht-Durchfuehrungsgesetz (MPDG) ueber das DMIDS des DIMDI/BfArM anzeigen, solange die entsprechenden EUDAMED-Module noch nicht verpflichtend nutzbar sind. Parallel gelten die MDR-Pflichten: Registrierung als Akteur (SRN), Benennung einer verantwortlichen Person nach Art. 15 MDR und UDI-Kennzeichnung. Sonderanzeigen gelten u. a. fuer Sonderanfertigungen und klinische Pruefungen.',
        mandatory: true,
        category: 'Lebensmittel- & Gesundheitsrecht',
        documentRequired: true,
        documentTypes: ['DMIDS-Anzeigebestaetigung', 'SRN-Registrierung', 'Technische Dokumentation'],
        legalBasis: 'MPDG, Verordnung (EU) 2017/745 (MDR)',
        authority: 'BfArM',
        deadline: 'Vor Aufnahme der Taetigkeit bzw. dem ersten Inverkehrbringen',
        penalties: 'Bussgelder, Vertriebsuntersagung',
        tips: [
          'EUDAMED-Rollout verfolgen - Anzeigen wandern modulweise von DMIDS zu EUDAMED',
          'Verantwortliche Person nach Art. 15 MDR mit nachweisbarer Qualifikation benennen',
        ],
        links: [
          { title: 'BfArM DMIDS', url: 'https://www.bfarm.de/DE/Medizinprodukte/Aufgaben/DMIDS/_node.html' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
    ],
  },

  // ==========================================================
  // FRANKREICH - kategoriespezifisch
  // ==========================================================
  FR: {
    electronics: [
      {
        title: 'DEEE-Registrierung bei ecosystem/Ecologic',
        description: 'Fuer Elektrogeraete einem franzoesischen DEEE-Eco-Organisme (ecosystem oder Ecologic) beitreten.',
        detailedDescription: 'Die franzoesische WEEE-Umsetzung (DEEE) verlangt den Beitritt zu einem zugelassenen Eco-Organisme - fuer Haushaltsgeraete sind das ecosystem und Ecologic. Der Beitritt erzeugt die Registrierung im ADEME-Register mit eigenem IDU fuer die Filiere DEEE. Mengenmeldungen und Eco-Beitraege laufen ueber das Eco-Organisme. Hersteller ohne Sitz in Frankreich koennen direkt beitreten oder einen mandataire benennen; Marktplaetze pruefen die DEEE-Compliance aktiv.',
        mandatory: true,
        category: 'Registrierung & Entsorgung',
        documentRequired: true,
        documentTypes: ['Eco-Organisme-Vertrag (ecosystem/Ecologic)', 'IDU DEEE'],
        legalBasis: 'Code de l\'environnement Art. L541-10-1, Richtlinie 2012/19/EU',
        authority: 'ADEME, ecosystem / Ecologic',
        deadline: 'Vor dem ersten Inverkehrbringen in Frankreich',
        penalties: 'Verwaltungsstrafen bis 30.000 EUR, Sperrung auf Marktplaetzen',
        tips: [
          'IDU der DEEE-Filiere getrennt vom Verpackungs-IDU beantragen',
          'Eco-Beitraege je Geraetetyp kalkulieren - sie variieren stark',
        ],
        links: [
          { title: 'ecosystem', url: 'https://www.ecosystem.eco' },
          { title: 'Ecologic', url: 'https://www.ecologic-france.com' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
      {
        title: 'Eco-participation sichtbar ausweisen',
        description: 'Die Eco-participation (Entsorgungsbeitrag) fuer Elektrogeraete und Moebel auf Rechnungen und Produktseiten separat ausweisen.',
        detailedDescription: 'Frankreich verlangt fuer Elektrogeraete (und Moebel), dass der an das Eco-Organisme gezahlte Entsorgungsbeitrag - die Eco-participation - dem Endkunden gegenueber sichtbar und als separater Betrag ausgewiesen wird (visible fee). Das gilt auf Produktseiten im Online-Shop, in Angeboten und auf Rechnungen. Der Betrag wird vom Eco-Organisme je Produkttyp festgelegt und darf weder rabattiert noch in den Produktpreis eingerechnet versteckt werden.',
        mandatory: true,
        category: 'Kennzeichnung & Information',
        documentRequired: false,
        legalBasis: 'Code de l\'environnement Art. L541-10-2',
        authority: 'DGCCRF, Eco-Organismes',
        penalties: 'Verwaltungsstrafen, Beanstandungen durch DGCCRF',
        tips: [
          'Eco-participation-Saetze regelmaessig aktualisieren (Tarifaenderungen der Eco-Organismes)',
          'Shop-System um separates Preisfeld fuer die visible fee erweitern',
        ],
        links: [
          { title: 'ecosystem Eco-participation', url: 'https://www.ecosystem.eco/fr/article/eco-participation' },
        ],
        priority: 'high',
        sortOrder: 91,
      },
      {
        title: 'Indice de reparabilite (Reparierbarkeitsindex)',
        description: 'Fuer betroffene Geraetekategorien den franzoesischen Reparierbarkeits- bzw. Haltbarkeitsindex berechnen und am Verkaufsort anzeigen.',
        detailedDescription: 'Frankreich verlangt seit 2021 fuer bestimmte Elektrogeraete (u. a. Smartphones, Laptops, TV, Waschmaschinen, Staubsauger) die Anzeige eines Reparierbarkeitsindex (Note von 0-10) am Verkaufsort und im Online-Shop. Seit 2025 wird der Index fuer erste Kategorien (Waschmaschinen, TV u. a.) schrittweise durch den umfassenderen Haltbarkeitsindex (indice de durabilite) ersetzt, der zusaetzlich Zuverlaessigkeit bewertet. Die Berechnung erfolgt durch den Hersteller anhand amtlicher Kriterientabellen; die Detailtabellen muessen auf Anfrage bereitgestellt werden.',
        mandatory: true,
        category: 'Kennzeichnung & Information',
        documentRequired: true,
        documentTypes: ['Index-Berechnungstabellen', 'Grafik-Dateien Index-Logo'],
        legalBasis: 'Loi AGEC Art. 16, Decret 2020-1757; indice de durabilite: Decret 2024-316',
        authority: 'ADEME, DGCCRF',
        penalties: 'Verwaltungsstrafen bis 15.000 EUR je Verstoss',
        tips: [
          'Pruefen, ob die Kategorie schon auf den Haltbarkeitsindex umgestellt ist',
          'Index gut sichtbar neben dem Preis anzeigen (auch im Online-Listing)',
          'Berechnungstabellen versionieren und fuer DGCCRF-Anfragen bereithalten',
        ],
        links: [
          { title: 'Indice de reparabilite (Ministere)', url: 'https://www.ecologie.gouv.fr/indice-reparabilite' },
        ],
        priority: 'high',
        sortOrder: 92,
      },
    ],
    textiles: [
      {
        title: 'REP Textiles - Refashion Registrierung',
        description: 'Als Inverkehrbringer von Bekleidung, Haushaltswaesche oder Schuhen dem Eco-Organisme Refashion beitreten.',
        detailedDescription: 'Frankreich betreibt seit 2007 eine REP-Filiere fuer Textilien, Haushaltswaesche und Schuhe (filiere TLC). Inverkehrbringer muessen dem zugelassenen Eco-Organisme Refashion beitreten, erhalten den IDU fuer die Filiere und zahlen stueckbasierte Eco-Beitraege mit Oeko-Modulation (Boni fuer Haltbarkeit und Rezyklatanteil). Die Mitgliedschaft ist Voraussetzung fuer den legalen Vertrieb; Marktplaetze verlangen den IDU-Nachweis.',
        mandatory: true,
        category: 'Registrierung & Entsorgung',
        documentRequired: true,
        documentTypes: ['Refashion-Vertrag', 'IDU TLC', 'Mengenmeldung'],
        legalBasis: 'Code de l\'environnement Art. L541-10-1 (11), Loi AGEC',
        authority: 'ADEME, Refashion',
        deadline: 'Vor dem ersten Inverkehrbringen in Frankreich',
        penalties: 'Verwaltungsstrafen bis 30.000 EUR, Marktplatz-Sperrung',
        tips: [
          'Stueckzahlen je Produkttyp melden - Tarife sind stueck-, nicht gewichtsbasiert',
          'Oeko-Modulations-Boni fuer langlebige Produkte aktiv beantragen',
        ],
        links: [
          { title: 'Refashion', url: 'https://refashion.fr' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
      {
        title: 'Umweltkennzeichnung Textilien (Decret 2022-748)',
        description: 'Verbraucherinformation zu Umwelteigenschaften (Rezyklat, Mikroplastik, Rueckverfolgbarkeit) fuer Textilien nach AGEC bereitstellen.',
        detailedDescription: 'Das Decret 2022-748 zur Verbraucherinformation ueber Umwelteigenschaften verpflichtet groessere Inverkehrbringer von Textilien, produktbezogene Angaben offenzulegen: Recyclingfaehigkeit, Rezyklatanteil, Freisetzung von Kunststoff-Mikrofasern (bei ueber 50 Prozent Synthetikanteil) sowie das Land der wesentlichen Fertigungsschritte (Weben, Faerben, Konfektion). Die Angaben muessen digital frei zugaenglich sein (Produktseite) und zwei Jahre nach Verkauf des letzten Exemplars verfuegbar bleiben. Die Schwellen wurden gestaffelt eingefuehrt und gelten inzwischen ab 10 Mio. EUR Umsatz und 10.000 Einheiten.',
        mandatory: true,
        category: 'Kennzeichnung & Information',
        documentRequired: true,
        documentTypes: ['Umwelteigenschaften-Datenblatt', 'Traceability-Nachweise'],
        legalBasis: 'Loi AGEC Art. 13, Decret 2022-748',
        authority: 'DGCCRF, ADEME',
        penalties: 'Verwaltungsstrafen bis 15.000 EUR',
        tips: [
          'Fertigungslaender je Prozessschritt (Weben/Faerben/Naehen) in der Lieferkette erheben',
          'Mikroplastik-Hinweis ab 50 Prozent Synthetikfasern verpflichtend',
          'Daten passen gut in den Digitalen Produktpass - doppelt nutzen',
        ],
        links: [
          { title: 'Decret 2022-748 (Legifrance)', url: 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000045836679' },
        ],
        priority: 'high',
        sortOrder: 91,
      },
    ],
    batteries: [
      {
        title: 'REP Batterien - Corepile/Screlec',
        description: 'Fuer Batterien und Akkus einem franzoesischen Eco-Organisme (Corepile oder Screlec) beitreten.',
        detailedDescription: 'Inverkehrbringer von Geraetebatterien und Akkus in Frankreich muessen die REP-Pflichten ueber ein zugelassenes Eco-Organisme erfuellen - Corepile oder Screlec. Der Beitritt umfasst die ADEME-Registrierung (IDU Filiere Piles), Mengenmeldungen und Eco-Beitraege je Batterietyp. Auch in Geraete eingebaute Batterien zaehlen. Mit der EU-Batterieverordnung 2023/1542 werden die Systeme schrittweise auf die neuen EPR-Kategorien (inkl. LMT- und EV-Batterien) erweitert.',
        mandatory: true,
        category: 'Registrierung & Entsorgung',
        documentRequired: true,
        documentTypes: ['Corepile/Screlec-Vertrag', 'IDU Piles'],
        legalBasis: 'Code de l\'environnement, Verordnung (EU) 2023/1542',
        authority: 'ADEME, Corepile / Screlec',
        deadline: 'Vor dem ersten Inverkehrbringen',
        penalties: 'Verwaltungsstrafen, Marktplatz-Sperrung',
        tips: [
          'Eingebaute Akkus in Elektrogeraeten loesen DEEE- UND Batterien-Pflicht aus',
          'Batterietyp-Klassifizierung nach neuer EU-Verordnung pruefen',
        ],
        links: [
          { title: 'Corepile', url: 'https://www.corepile.fr' },
          { title: 'Screlec', url: 'https://www.screlec.fr' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
    ],
    food_supplements: [
      {
        title: 'DGCCRF-Meldung Nahrungsergaenzungsmittel (Teleicare/Compl\'Alim)',
        description: 'Nahrungsergaenzungsmittel vor dem Inverkehrbringen in Frankreich elektronisch bei der DGCCRF deklarieren.',
        detailedDescription: 'Das Decret 2006-352 verlangt fuer Nahrungsergaenzungsmittel eine Vorab-Deklaration bei der DGCCRF - historisch ueber das Portal Teleicare, das durch die neue Plattform Compl\'Alim abgeloest wird. Die Meldung umfasst Rezeptur, Etikett und ggf. Nachweise zur Verkehrsfaehigkeit der Zutaten (insb. Pflanzenstoffe nach den franzoesischen Plantes-Listen). Anders als in Deutschland prueft die DGCCRF aktiv und kann innerhalb der Bearbeitungsfrist Einwaende erheben; bestimmte neuartige Zutaten erfordern das aufwendigere Artikel-16-Verfahren.',
        mandatory: true,
        category: 'Lebensmittel- & Gesundheitsrecht',
        documentRequired: true,
        documentTypes: ['Compl\'Alim/Teleicare-Meldebestaetigung', 'Rezeptur', 'Etikett (FR)'],
        legalBasis: 'Decret 2006-352, Richtlinie 2002/46/EG',
        authority: 'DGCCRF',
        deadline: 'VOR dem ersten Inverkehrbringen in Frankreich',
        penalties: 'Vertriebsverbot, Verwaltungsstrafen, Rueckrufe',
        tips: [
          'Pflanzliche Zutaten gegen die franzoesische Arrete-Plantes-Liste pruefen',
          'Franzoesisches Etikett mit Pflichtwarnhinweisen vor der Meldung finalisieren',
          'Neue Plattform Compl\'Alim nutzen - Teleicare wird abgeschaltet',
        ],
        links: [
          { title: 'Compl\'Alim', url: 'https://compl-alim.beta.gouv.fr' },
          { title: 'DGCCRF Complements alimentaires', url: 'https://www.economie.gouv.fr/dgccrf/Publications/Vie-pratique/Fiches-pratiques/Complement-alimentaire' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
    ],
  },

  // ==========================================================
  // OESTERREICH - kategoriespezifisch
  // ==========================================================
  AT: {
    electronics: [
      {
        title: 'EAG-VO Registrierung Oesterreich',
        description: 'Elektrogeraete-Hersteller im EDM-Register anmelden; auslaendische Versandhaendler brauchen einen Bevollmaechtigten.',
        detailedDescription: 'Die Elektroaltgeraeteverordnung (EAG-VO) verpflichtet Hersteller und Importeure von Elektrogeraeten zur Registrierung im Elektronischen Datenmanagement (EDM) des Klimaschutzministeriums vor dem Inverkehrbringen. Auslaendische Versandhaendler, die direkt an oesterreichische Endkunden liefern, muessen einen in Oesterreich niedergelassenen Bevollmaechtigten bestellen, der Registrierung und Mengenmeldungen uebernimmt. Die Geraete sind mit der durchgestrichenen Muelltonne zu kennzeichnen.',
        mandatory: true,
        category: 'Registrierung & Entsorgung',
        documentRequired: true,
        documentTypes: ['EDM-Registrierung', 'ggf. Bevollmaechtigten-Bestellung', 'Mengenmeldungen'],
        legalBasis: 'EAG-VO (BGBl. II 121/2005 idgF), AWG 2002',
        authority: 'BMK, EDM',
        deadline: 'Vor dem ersten Inverkehrbringen in Oesterreich',
        penalties: 'Verwaltungsstrafen, Vertriebsverbot',
        tips: [
          'EDM-Registrierung gilt je Geraetekategorie - Sortiment vollstaendig zuordnen',
          'Bevollmaechtigten-Service oft beim selben Anbieter wie fuer Verpackungen buchbar',
        ],
        links: [
          { title: 'EDM-Portal', url: 'https://edm.gv.at' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
      {
        title: 'Teilnahme an einem Sammel- und Verwertungssystem (EAG)',
        description: 'Fuer Haushalts-Elektrogeraete einem oesterreichischen Sammel- und Verwertungssystem (z. B. ERA, UFH, Interzero) beitreten.',
        detailedDescription: 'Hersteller von Elektrogeraeten fuer private Haushalte muessen ihre Ruecknahme- und Verwertungspflichten in Oesterreich ueber ein genehmigtes Sammel- und Verwertungssystem erfuellen - etablierte Anbieter sind ERA, UFH und Interzero. Das System uebernimmt gegen mengenbasierte Tarife die Finanzierung der kommunalen Sammlung und das Reporting an die Behoerden. Die Teilnahme ist neben der EDM-Registrierung eine eigene, vertragliche Pflicht.',
        mandatory: true,
        category: 'Registrierung & Entsorgung',
        documentRequired: true,
        documentTypes: ['Systemvertrag (ERA/UFH/Interzero)'],
        legalBasis: 'EAG-VO, AWG 2002',
        authority: 'BMK',
        penalties: 'Verwaltungsstrafen, Nachforderung der Entgelte',
        tips: [
          'Tarife der Systeme vergleichen - Preisunterschiede je Geraetekategorie sind erheblich',
          'Mengenmeldungen an System und EDM konsistent halten',
        ],
        links: [
          { title: 'ERA Elektro Recycling Austria', url: 'https://www.era-gmbh.at' },
          { title: 'UFH', url: 'https://www.ufh.at' },
        ],
        priority: 'high',
        sortOrder: 91,
      },
    ],
    batteries: [
      {
        title: 'Oesterreichische Batteriesammlung und -verwertung',
        description: 'Batterien-Inverkehrbringer im EDM registrieren und einem Batterien-Sammelsystem anschliessen.',
        detailedDescription: 'Die oesterreichische Batterienverordnung verpflichtet Hersteller und Importeure von Geraetebatterien - auch eingebauten Akkus - zur Registrierung im EDM und zur Teilnahme an einem genehmigten Sammel- und Verwertungssystem (z. B. ERA, UFH). Mengenmeldungen erfolgen jaehrlich. Mit der EU-Batterieverordnung 2023/1542 kommen erweiterte Kategorien (LMT-Batterien) und Kennzeichnungspflichten hinzu. Auslaendische Versandhaendler benoetigen wie bei Elektrogeraeten einen Bevollmaechtigten.',
        mandatory: true,
        category: 'Registrierung & Entsorgung',
        documentRequired: true,
        documentTypes: ['EDM-Registrierung Batterien', 'Systemvertrag'],
        legalBasis: 'Batterienverordnung (BGBl. II 159/2008 idgF), Verordnung (EU) 2023/1542',
        authority: 'BMK, EDM',
        deadline: 'Vor dem ersten Inverkehrbringen',
        penalties: 'Verwaltungsstrafen, Vertriebsverbot',
        tips: [
          'Geraete mit eingebauten Akkus: EAG- UND Batterien-Pflichten parallel erfuellen',
          'Sammelsystem-Vertrag oft als Kombi-Paket mit EAG-System verfuegbar',
        ],
        links: [
          { title: 'EDM-Portal', url: 'https://edm.gv.at' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
    ],
  },

  // ==========================================================
  // ITALIEN - kategoriespezifisch
  // ==========================================================
  IT: {
    electronics: [
      {
        title: 'RAEE-Registrierung Italien',
        description: 'Vor dem Inverkehrbringen ins italienische Registro AEE eintragen; auslaendische Hersteller brauchen einen rappresentante autorizzato.',
        detailedDescription: 'Das italienische WEEE-Recht (D.Lgs. 49/2014) verlangt die Eintragung in das Registro nazionale dei produttori AEE ueber die Handelskammer, BEVOR Elektrogeraete in Italien in Verkehr gebracht werden. Hersteller ohne Niederlassung in Italien muessen per notarieller Vollmacht einen rappresentante autorizzato bestellen, der die Registrierung vornimmt. Die zugeteilte Registernummer (IT-Nummer) muss auf Rechnungen angegeben werden; jaehrliche Mengenmeldungen sind verpflichtend.',
        mandatory: true,
        category: 'Registrierung & Entsorgung',
        documentRequired: true,
        documentTypes: ['Registro-AEE-Eintrag', 'Vollmacht rappresentante autorizzato', 'Mengenmeldung'],
        legalBasis: 'D.Lgs. 49/2014',
        authority: 'Registro AEE / Handelskammern, Ministero dell\'Ambiente',
        deadline: 'Registrierung VOR dem ersten Inverkehrbringen',
        penalties: 'Verwaltungsstrafen von 30.000 bis 100.000 EUR bei fehlender Registrierung',
        tips: [
          'Notarielle Bestellung des rappresentante autorizzato fruehzeitig einleiten',
          'IT-Registernummer auf alle Rechnungen nach Italien drucken',
        ],
        links: [
          { title: 'Registro AEE', url: 'https://www.registroaee.it' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
      {
        title: 'Beitritt zu einem RAEE-Kollektivsystem',
        description: 'Ruecknahme- und Verwertungspflichten fuer Haushaltsgeraete ueber ein sistema collettivo (z. B. Erion, Ecodom-Nachfolger) erfuellen.',
        detailedDescription: 'Fuer Haushalts-Elektrogeraete muessen Hersteller in Italien einem Kollektivsystem (sistema collettivo) beitreten, das die Finanzierung der RAEE-Sammlung ueber das Koordinierungszentrum Centro di Coordinamento RAEE abwickelt - groesster Anbieter ist Erion WEEE. Der Systembeitritt ist Voraussetzung fuer die Registro-AEE-Eintragung bei B2C-Geraeten. Die Entgelte richten sich nach Geraetekategorie und Gewicht.',
        mandatory: true,
        category: 'Registrierung & Entsorgung',
        documentRequired: true,
        documentTypes: ['Beitrittsvertrag sistema collettivo'],
        legalBasis: 'D.Lgs. 49/2014',
        authority: 'Centro di Coordinamento RAEE',
        penalties: 'Verwaltungsstrafen, Registerloeschung',
        tips: [
          'Systembeitritt VOR der Registro-AEE-Anmeldung klaeren - die Registernummer setzt ihn voraus',
          'B2B-Geraete koennen alternativ ueber individuelle Systeme abgewickelt werden',
        ],
        links: [
          { title: 'Centro di Coordinamento RAEE', url: 'https://www.cdcraee.it' },
          { title: 'Erion', url: 'https://www.erion.it' },
        ],
        priority: 'high',
        sortOrder: 91,
      },
    ],
    batteries: [
      {
        title: 'Registro Pile e Accumulatori Italien',
        description: 'Batterien und Akkus vor dem Inverkehrbringen im italienischen Batterieregister eintragen und einem Sammelsystem beitreten.',
        detailedDescription: 'Das D.Lgs. 188/2008 verlangt fuer Inverkehrbringer von Batterien und Akkumulatoren die Eintragung in das Registro nazionale dei produttori di pile e accumulatori (gefuehrt ueber die Handelskammern, gleiches Portal wie das Registro AEE). Auslaendische Hersteller benoetigen einen rappresentante autorizzato. Fuer Geraetebatterien ist zusaetzlich der Beitritt zu einem Sammelsystem unter dem Centro di Coordinamento Pile (CDCNPA) erforderlich; jaehrliche Mengenmeldungen sind Pflicht.',
        mandatory: true,
        category: 'Registrierung & Entsorgung',
        documentRequired: true,
        documentTypes: ['Registro-Pile-Eintrag', 'Sammelsystem-Vertrag'],
        legalBasis: 'D.Lgs. 188/2008, Verordnung (EU) 2023/1542',
        authority: 'Registro Pile / Handelskammern, CDCNPA',
        deadline: 'Registrierung VOR dem ersten Inverkehrbringen',
        penalties: 'Verwaltungsstrafen bis 100.000 EUR',
        tips: [
          'Registrierung laesst sich mit der Registro-AEE-Eintragung kombinieren (gleiches Portal)',
          'Eingebaute Akkus in Geraeten loesen beide Registerpflichten aus',
        ],
        links: [
          { title: 'Registro Pile e Accumulatori', url: 'https://www.registropile.it' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
    ],
    food_supplements: [
      {
        title: 'Notifica beim Ministero della Salute',
        description: 'Nahrungsergaenzungsmittel vor dem Inverkehrbringen elektronisch beim italienischen Gesundheitsministerium notifizieren.',
        detailedDescription: 'Italien verlangt fuer Nahrungsergaenzungsmittel eine elektronische Notifizierung des Etiketts beim Ministero della Salute ueber das NSIS-Portal, bevor das Produkt in Verkehr gebracht wird. Notifizierte Produkte werden in das oeffentliche Register der Integratori alimentari aufgenommen. Die Notifica ist gebuehrenpflichtig und setzt ein italienisches Etikett voraus; das Ministerium prueft Rezeptur (zulaessige Pflanzenstoffe nach den italienischen Botanicals-Listen) und Pflichthinweise und kann Beanstandungen aussprechen.',
        mandatory: true,
        category: 'Lebensmittel- & Gesundheitsrecht',
        documentRequired: true,
        documentTypes: ['NSIS-Notifizierungsbestaetigung', 'Etikett (IT)', 'Rezeptur'],
        legalBasis: 'D.Lgs. 169/2004, Richtlinie 2002/46/EG',
        authority: 'Ministero della Salute',
        deadline: 'VOR dem ersten Inverkehrbringen in Italien',
        penalties: 'Vertriebsverbot, Verwaltungsstrafen',
        tips: [
          'Italienische Botanicals-Liste (Allegato 1) fuer Pflanzenextrakte pruefen',
          'Eintrag im oeffentlichen Register als Vertrauenssignal im Marketing nutzen',
          'Gebuehr und Bearbeitungszeit in den Launch-Plan einkalkulieren',
        ],
        links: [
          { title: 'Ministero della Salute - Integratori', url: 'https://www.salute.gov.it/portale/temi/p2_6.jsp?lingua=italiano&id=1267&area=Alimenti%20particolari%20e%20integratori&menu=integratori' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
    ],
  },

  // ==========================================================
  // SPANIEN - kategoriespezifisch
  // ==========================================================
  ES: {
    electronics: [
      {
        title: 'RAEE-Registrierung Spanien',
        description: 'Elektrogeraete-Hersteller im spanischen RII-AEE-Register (RD 110/2015) eintragen.',
        detailedDescription: 'Das Real Decreto 110/2015 verpflichtet Hersteller und Importeure von Elektrogeraeten zur Eintragung in das Registro Integrado Industrial, Sektion RII-AEE, beim Industrieministerium, bevor Geraete in Spanien in Verkehr gebracht werden. Unternehmen ohne Sitz in Spanien muessen einen representante autorizado bestellen. Die Registernummer ist auf Rechnungen anzugeben; jaehrliche Mengenmeldungen ueber die Plattform des Ministeriums sind verpflichtend.',
        mandatory: true,
        category: 'Registrierung & Entsorgung',
        documentRequired: true,
        documentTypes: ['RII-AEE-Registrierung', 'Bestellung representante autorizado'],
        legalBasis: 'Real Decreto 110/2015',
        authority: 'Ministerio de Industria (RII-AEE)',
        deadline: 'Registrierung VOR dem ersten Inverkehrbringen',
        penalties: 'Bussgelder nach Abfallgesetz, Vertriebsverbot',
        tips: [
          'Geraetekategorien nach RD 110/2015 Anhang korrekt zuordnen',
          'Representante autorizado kann Registrierung und Mengenmeldung uebernehmen',
        ],
        links: [
          { title: 'RII-AEE (Ministerio de Industria)', url: 'https://www.mincotur.gob.es' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
      {
        title: 'SCRAP-Beitritt Elektroaltgeraete Spanien',
        description: 'Ruecknahmepflichten fuer Elektrogeraete ueber ein spanisches Kollektivsystem (SCRAP, z. B. Ecotic, Ecolec, Recyclia) erfuellen.',
        detailedDescription: 'Neben der RII-AEE-Registrierung muessen Hersteller von Haushalts-Elektrogeraeten in Spanien einem Sistema Colectivo de Responsabilidad Ampliada del Productor (SCRAP) beitreten, das Sammlung und Verwertung finanziert - etablierte Systeme sind Ecotic, Ecolec, Ecoasimelec/Recyclia und ERP Espana. Die Entgelte richten sich nach Kategorie und Gewicht. Der Systembeitritt ist gegenueber dem Register nachzuweisen.',
        mandatory: true,
        category: 'Registrierung & Entsorgung',
        documentRequired: true,
        documentTypes: ['SCRAP-Vertrag'],
        legalBasis: 'Real Decreto 110/2015, Ley 7/2022',
        authority: 'MITECO, Autonome Gemeinschaften',
        penalties: 'Bussgelder, Registerloeschung',
        tips: [
          'Tarife mehrerer SCRAPs vergleichen - der Markt ist kompetitiv',
          'Mengenmeldungen an SCRAP und Register konsistent halten',
        ],
        links: [
          { title: 'Ecotic', url: 'https://www.ecotic.es' },
          { title: 'Fundacion Ecolec', url: 'https://www.ecolec.es' },
        ],
        priority: 'high',
        sortOrder: 91,
      },
    ],
    food_supplements: [
      {
        title: 'AESAN-Notifizierung Nahrungsergaenzungsmittel',
        description: 'Nahrungsergaenzungsmittel beim spanischen Lebensmittelsicherheitsamt AESAN vor dem Inverkehrbringen notifizieren.',
        detailedDescription: 'Das Real Decreto 1487/2009 verlangt fuer Nahrungsergaenzungsmittel eine Mitteilung an die AESAN (bzw. die zustaendige Behoerde der Autonomen Gemeinschaft) mit Musteretikett, bevor das Produkt in Spanien vermarktet wird. Bei Produkten, die bereits in einem anderen EU-Staat rechtmaessig vertrieben werden, ist das Verfahren als Anerkennungsmeldung ausgestaltet. Die Behoerde prueft Etikett und Rezeptur (zulaessige Naehrstoffe, spanische Pflichtangaben) und kann den Vertrieb beanstanden.',
        mandatory: true,
        category: 'Lebensmittel- & Gesundheitsrecht',
        documentRequired: true,
        documentTypes: ['AESAN-Notifizierungsbestaetigung', 'Etikett (ES)'],
        legalBasis: 'Real Decreto 1487/2009, Richtlinie 2002/46/EG',
        authority: 'AESAN (Agencia Espanola de Seguridad Alimentaria y Nutricion)',
        deadline: 'VOR dem ersten Inverkehrbringen in Spanien',
        penalties: 'Vertriebsverbot, Bussgelder nach Lebensmittelrecht',
        tips: [
          'Spanisches Etikett mit allen Pflichtwarnhinweisen vor der Meldung finalisieren',
          'Bei EU-Vorvermarktung das vereinfachte Anerkennungsverfahren nutzen',
        ],
        links: [
          { title: 'AESAN Complementos alimenticios', url: 'https://www.aesan.gob.es/AECOSAN/web/seguridad_alimentaria/subdetalle/complementos_alimenticios.htm' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
    ],
  },

  // ==========================================================
  // NIEDERLANDE - kategoriespezifisch
  // ==========================================================
  NL: {
    electronics: [
      {
        title: 'Stichting OPEN Registrierung Niederlande',
        description: 'Elektrogeraete-Hersteller muessen sich bei Stichting OPEN registrieren und Verwertungsbeitraege zahlen.',
        detailedDescription: 'In den Niederlanden erfuellt die Stichting OPEN (Organisatie Producentenverantwoordelijkheid E-waste Nederland) seit 2021 mit Allgemeinverbindlichkeitserklaerung die WEEE-Herstellerverantwortung fuer alle Inverkehrbringer von Elektrogeraeten. Hersteller und Importeure muessen sich registrieren, Mengen melden und die Verwertungsbeitraege (afvalbeheerbijdrage) zahlen. Die Registrierung beim Nationalen (W)EEE-Register erfolgt ueber Stichting OPEN mit; auslaendische Fernabsatzhaendler benoetigen einen in den Niederlanden ansaessigen Bevollmaechtigten.',
        mandatory: true,
        category: 'Registrierung & Entsorgung',
        documentRequired: true,
        documentTypes: ['Stichting-OPEN-Registrierung', 'Mengenmeldung'],
        legalBasis: 'Regeling AEEA, Richtlinie 2012/19/EU',
        authority: 'Stichting OPEN, Nationaal (W)EEE Register, ILT',
        deadline: 'Vor dem ersten Inverkehrbringen in den Niederlanden',
        penalties: 'Zwangsgelder durch die ILT, Nachforderung der Beitraege',
        tips: [
          'Beitragstarife je Geraetekategorie auf der OPEN-Website pruefen',
          'Fernabsatz aus dem Ausland: Bevollmaechtigten in NL bestellen',
        ],
        links: [
          { title: 'Stichting OPEN', url: 'https://www.stichting-open.org' },
          { title: 'Nationaal (W)EEE Register', url: 'https://www.nationaalweeeregister.nl' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
    ],
    food_supplements: [
      {
        title: 'Niederlaendische Nahrungsergaenzungsmittel',
        description: 'In den Niederlanden besteht keine Notifizierungspflicht fuer Nahrungsergaenzungsmittel - Warenwet-Vorgaben und NL-Etikett genuegen.',
        detailedDescription: 'Anders als Deutschland, Frankreich, Italien oder Spanien kennt die niederlaendische Umsetzung der Richtlinie 2002/46/EG (Warenwetbesluit voedingssupplementen) KEINE behoerdliche Anmelde- oder Notifizierungspflicht vor dem Inverkehrbringen. Erforderlich sind ein vollstaendig niederlaendisches Etikett, die Einhaltung der zugelassenen Vitamin- und Mineralstoffverbindungen sowie der nationalen Hoechstmengen (u. a. fuer Vitamin B6 und Monacolin-Beschraenkungen). Die NVWA ueberwacht den Markt nachgelagert.',
        mandatory: false,
        category: 'Lebensmittel- & Gesundheitsrecht',
        documentRequired: true,
        documentTypes: ['Etikett (NL)', 'Rezeptur-Compliance-Pruefung'],
        legalBasis: 'Warenwetbesluit voedingssupplementen, Richtlinie 2002/46/EG',
        authority: 'NVWA',
        penalties: 'Nachgelagerte Beanstandung durch NVWA, Bussgelder bei Verstoessen',
        tips: [
          'Keine Meldung noetig - dafuer Etikett und Hoechstmengen besonders sorgfaeltig pruefen',
          'Niederlaendische Sonderregeln (z. B. Vitamin-B6-Hoechstmenge 21 mg/Tag) beachten',
        ],
        links: [
          { title: 'NVWA Voedingssupplementen', url: 'https://www.nvwa.nl/onderwerpen/voedingssupplementen-en-kruidenpreparaten' },
        ],
        priority: 'medium',
        sortOrder: 90,
      },
    ],
  },
  // ==========================================================
  // POLEN - kategoriespezifisch
  // ==========================================================
  PL: {
    electronics: [
      {
        title: 'BDO-Registrierung Elektrogeraete Polen',
        description: 'Elektrogeraete-Inverkehrbringer im BDO-Register (Abteilung Elektro) eintragen; auslaendische Haendler brauchen einen Bevollmaechtigten.',
        detailedDescription: 'Das polnische Elektrogesetz (Ustawa o zuzytym sprzecie) verlangt vor dem Inverkehrbringen von Elektrogeraeten die Eintragung in die Elektro-Abteilung des BDO-Registers. Hersteller ohne Sitz in Polen muessen einen autorisierten Vertreter (autoryzowany przedstawiciel) bestellen. Jaehrliche Mengen- und Verwertungsberichte sind ueber das BDO einzureichen; die gesetzlichen Sammelquoten werden ueblicherweise ueber eine organizacja odzysku erfuellt.',
        mandatory: true,
        category: 'Registrierung & Entsorgung',
        documentRequired: true,
        documentTypes: ['BDO-Eintrag Elektro', 'Bestellung autoryzowany przedstawiciel'],
        legalBasis: 'Ustawa o zuzytym sprzecie elektrycznym i elektronicznym vom 11.09.2015',
        authority: 'Marschallamt der Woiwodschaft, BDO',
        deadline: 'Registrierung VOR dem ersten Inverkehrbringen',
        penalties: 'Geldbussen bis 1.000.000 PLN, Vertriebsverbot',
        tips: [
          'BDO-Nummer auf Rechnungen nach Polen angeben',
          'Sammelquoten ueber organizacja odzysku absichern - Eigenerfuellung ist unrealistisch',
        ],
        links: [
          { title: 'BDO-Portal', url: 'https://bdo.mos.gov.pl' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
      {
        title: 'Vertrag mit einer Organizacja Odzysku (Elektro)',
        description: 'Sammel- und Verwertungsquoten fuer Elektrogeraete ueber eine polnische Verwertungsorganisation erfuellen.',
        detailedDescription: 'Die polnischen Sammel- und Recyclingquoten fuer Elektroaltgeraete sind durch den einzelnen Hersteller praktisch nicht selbst erfuellbar. Standard ist ein Vertrag mit einer organizacja odzysku sprzetu elektrycznego, die gegen mengenbasierte Entgelte die Quoten nachweist und die Berichte vorbereitet. Ohne Quotenerfuellung wird eine Produktgebuehr (oplata produktowa) faellig, die deutlich teurer ist als die Systembeitraege.',
        mandatory: true,
        category: 'Registrierung & Entsorgung',
        documentRequired: true,
        documentTypes: ['Vertrag organizacja odzysku'],
        legalBasis: 'Ustawa o zuzytym sprzecie vom 11.09.2015',
        authority: 'Marschallamt der Woiwodschaft',
        penalties: 'Produktgebuehr-Nachforderung, Geldbussen',
        tips: [
          'Vertrag vor Jahresbeginn schliessen - rueckwirkende Quotenerfuellung ist nicht moeglich',
          'Anbieter vergleichen, Preisunterschiede je Geraetegruppe sind gross',
        ],
        links: [
          { title: 'BDO-Portal', url: 'https://bdo.mos.gov.pl' },
        ],
        priority: 'high',
        sortOrder: 91,
      },
    ],
    batteries: [
      {
        title: 'BDO-Registrierung Batterien Polen',
        description: 'Batterien-Inverkehrbringer in der Batterien-Abteilung des BDO registrieren und Sammel-/Recyclingpflichten erfuellen.',
        detailedDescription: 'Das polnische Batteriegesetz (Ustawa o bateriach i akumulatorach) verlangt die BDO-Registrierung vor dem Inverkehrbringen von Batterien und Akkus - auch eingebauten. Hersteller muessen Sammelquoten fuer Geraetebatterien erfuellen (typisch ueber einen Vertrag mit einem Sammel-/Verwertungspartner), eine oeffentliche Aufklaerungskampagnen-Abgabe leisten und jaehrlich ueber das BDO berichten. Bei Quotenverfehlung wird die oplata produktowa faellig.',
        mandatory: true,
        category: 'Registrierung & Entsorgung',
        documentRequired: true,
        documentTypes: ['BDO-Eintrag Batterien', 'Sammelpartner-Vertrag'],
        legalBasis: 'Ustawa o bateriach i akumulatorach vom 24.04.2009, Verordnung (EU) 2023/1542',
        authority: 'Marschallamt der Woiwodschaft, BDO',
        deadline: 'Registrierung VOR dem ersten Inverkehrbringen',
        penalties: 'Geldbussen, Produktgebuehr-Nachforderungen',
        tips: [
          'Geraete mit eingebauten Akkus: Elektro- UND Batterien-Abteilung im BDO bedienen',
          'Kampagnen-Abgabe (kampania edukacyjna) in der Kalkulation beruecksichtigen',
        ],
        links: [
          { title: 'BDO-Portal', url: 'https://bdo.mos.gov.pl' },
        ],
        priority: 'critical',
        sortOrder: 92,
      },
    ],
  },

  // ==========================================================
  // TSCHECHIEN - kategoriespezifisch
  // ==========================================================
  CZ: {
    electronics: [
      {
        title: 'WEEE-Herstellerregistrierung Tschechien (Seznam vyrobcu)',
        description: 'Elektrogeraete-Hersteller in die Herstellerliste des Umweltministeriums eintragen - ueblich ueber ein Kollektivsystem wie RETELA oder Elektrowin.',
        detailedDescription: 'Das tschechische Altprodukte-Gesetz (Zakon c. 542/2020 Sb.) verlangt vor dem Inverkehrbringen von Elektrogeraeten die Eintragung in den Seznam vyrobcu des Umweltministeriums. Die Ruecknahme- und Verwertungspflichten werden in der Praxis ueber ein Kollektivsystem erfuellt - etablierte Anbieter sind Elektrowin (Haushaltsgrossgeraete), RETELA und ASEKOL. Auslaendische Fernabsatzhaendler muessen einen Bevollmaechtigten (poverena osoba) bestellen. Jaehrliche Mengenmeldungen sind Pflicht.',
        mandatory: true,
        category: 'Registrierung & Entsorgung',
        documentRequired: true,
        documentTypes: ['Eintrag Seznam vyrobcu', 'Kollektivsystem-Vertrag'],
        legalBasis: 'Zakon c. 542/2020 Sb. (Gesetz ueber Altprodukte)',
        authority: 'Ministerstvo zivotniho prostredi (MZP)',
        deadline: 'Registrierung VOR dem ersten Inverkehrbringen',
        penalties: 'Geldbussen bis 10.000.000 CZK',
        tips: [
          'Kollektivsystem nach Geraetekategorie waehlen (Elektrowin vs. ASEKOL vs. RETELA)',
          'Das Kollektivsystem uebernimmt meist auch die Registrierung im Seznam vyrobcu',
        ],
        links: [
          { title: 'RETELA', url: 'https://www.retela.cz' },
          { title: 'Elektrowin', url: 'https://www.elektrowin.cz' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
    ],
  },

  // ==========================================================
  // SCHWEDEN - kategoriespezifisch
  // ==========================================================
  SE: {
    electronics: [
      {
        title: 'EE-Produzentenregister und El-Kretsen Anschluss (Schweden)',
        description: 'Elektrogeraete-Hersteller bei der Naturvardsverket im EE-Register anmelden und dem Ruecknahmesystem El-Kretsen beitreten.',
        detailedDescription: 'Die schwedische Elektronikverordnung (Foerordning 2014:1075 om producentansvar foer elutrustning) verlangt die Registrierung im EE- und Batterieregister der Naturvardsverket vor dem Inverkehrbringen sowie jaehrliche Mengenmeldungen. Die operative Sammlung und Verwertung wird ueblicherweise ueber das landesweite System El-Kretsen erfuellt, das mit den Kommunen das Sammelnetz Elretur betreibt. Fernabsatzhaendler aus dem Ausland muessen sich ebenfalls registrieren oder einen Bevollmaechtigten bestellen.',
        mandatory: true,
        category: 'Registrierung & Entsorgung',
        documentRequired: true,
        documentTypes: ['EE-Register-Anmeldung (Naturvardsverket)', 'El-Kretsen-Vertrag'],
        legalBasis: 'Foerordning (2014:1075) om producentansvar foer elutrustning',
        authority: 'Naturvardsverket, El-Kretsen',
        deadline: 'Registrierung VOR dem ersten Inverkehrbringen',
        penalties: 'Umweltsanktionsgebuehren, Untersagungsverfuegungen',
        tips: [
          'EE-Register und Batterieregister der Naturvardsverket in einem Zug bedienen',
          'El-Kretsen deckt auch die Batterien-Sammlung mit ab - Kombi-Vertrag pruefen',
        ],
        links: [
          { title: 'El-Kretsen', url: 'https://www.el-kretsen.se' },
          { title: 'Naturvardsverket EE-Register', url: 'https://www.naturvardsverket.se' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
    ],
  },

  // ==========================================================
  // DAENEMARK - kategoriespezifisch
  // ==========================================================
  DK: {
    electronics: [
      {
        title: 'DPA-Registrierung Elektrogeraete Daenemark',
        description: 'Elektrogeraete-Hersteller bei Dansk Producentansvar (DPA) registrieren und Ruecknahmepflichten ueber ein Kollektivsystem erfuellen.',
        detailedDescription: 'Daenemarks WEEE-Umsetzung (Elektronikaffaldsbekendtgoerelsen) verlangt die Registrierung bei Dansk Producentansvar (DPA-System) vor dem Inverkehrbringen von Elektrogeraeten sowie jaehrliche Mengenmeldungen. Die Sammel- und Verwertungspflichten fuer Haushaltsgeraete werden ueber die von der DPA zugeteilten Sammelmengen oder ein Kollektivsystem (z. B. Elretur) erfuellt. Auslaendische Fernabsatzhaendler benoetigen einen in Daenemark niedergelassenen Bevollmaechtigten. Die DPA fuehrt parallel auch die Register fuer Batterien und Verpackungen.',
        mandatory: true,
        category: 'Registrierung & Entsorgung',
        documentRequired: true,
        documentTypes: ['DPA-Registrierung', 'Mengenmeldung', 'ggf. Kollektivsystem-Vertrag'],
        legalBasis: 'Elektronikaffaldsbekendtgoerelsen, Richtlinie 2012/19/EU',
        authority: 'Dansk Producentansvar (DPA), Miljoestyrelsen',
        deadline: 'Registrierung VOR dem ersten Inverkehrbringen',
        penalties: 'Bussgelder, Vertriebsbeschraenkungen',
        tips: [
          'WEEE-, Batterien- und Verpackungsregistrierung bei der DPA buendeln',
          'Mengenmeldung jaehrlich zum 31. Maerz einplanen',
        ],
        links: [
          { title: 'Dansk Producentansvar (DPA)', url: 'https://producentansvar.dk' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
    ],
  },

  // ==========================================================
  // BELGIEN - kategoriespezifisch
  // ==========================================================
  BE: {
    electronics: [
      {
        title: 'Recupel-Registrierung Belgien',
        description: 'Elektrogeraete-Hersteller bei Recupel anmelden und den Recupel-Beitrag je Geraet abfuehren.',
        detailedDescription: 'In Belgien wird die WEEE-Herstellerverantwortung ueber Recupel organisiert. Inverkehrbringer von Elektrogeraeten muessen sich bei Recupel registrieren, je Geraet den sichtbaren Recupel-Beitrag abfuehren und regelmaessig Mengen deklarieren. Die zugrunde liegenden Pflichten sind regional geregelt (Flandern/VLAREMA, Wallonien, Bruessel), werden aber einheitlich ueber Recupel und die Verwaltungsplattform abgewickelt. Auslaendische Fernabsatzhaendler koennen sich direkt registrieren.',
        mandatory: true,
        category: 'Registrierung & Entsorgung',
        documentRequired: true,
        documentTypes: ['Recupel-Vertrag', 'Mengendeklaration'],
        legalBasis: 'Regionale Abfalldekrete (VLAREMA u. a.), Richtlinie 2012/19/EU',
        authority: 'Recupel, OVAM / regionale Behoerden',
        deadline: 'Vor dem ersten Inverkehrbringen in Belgien',
        penalties: 'Nachforderungen, regionale Verwaltungsstrafen',
        tips: [
          'Recupel-Beitrag wie in Frankreich als sichtbarer Beitrag ausweisbar - Preiskalkulation anpassen',
          'Deklarationsrhythmus (monatlich/quartalsweise/jaehrlich) haengt vom Volumen ab',
        ],
        links: [
          { title: 'Recupel', url: 'https://www.recupel.be' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
    ],
    batteries: [
      {
        title: 'Bebat-Registrierung Belgien',
        description: 'Batterien-Inverkehrbringer muessen sich bei Bebat anmelden und Umweltbeitraege je Batterie zahlen.',
        detailedDescription: 'Die belgische Batterien-Herstellerverantwortung laeuft ueber Bebat, das fuer Inverkehrbringer von Batterien und Akkus (inklusive eingebauter Zellen) Sammlung, Recycling und Behoerden-Reporting uebernimmt. Die Registrierung muss vor dem Inverkehrbringen erfolgen; je Batterie wird ein typabhaengiger Beitrag faellig, der quartalsweise deklariert wird. Bebat gilt fuer alle drei Regionen Belgiens.',
        mandatory: true,
        category: 'Registrierung & Entsorgung',
        documentRequired: true,
        documentTypes: ['Bebat-Vertrag', 'Quartalsdeklaration'],
        legalBasis: 'Regionale Abfalldekrete, Verordnung (EU) 2023/1542',
        authority: 'Bebat, regionale Behoerden',
        deadline: 'Vor dem ersten Inverkehrbringen',
        penalties: 'Nachforderungen, Verwaltungsstrafen',
        tips: [
          'Geraete mit eingebauten Akkus: Recupel UND Bebat parallel bedienen',
          'Beitragstabellen je Batterietyp jaehrlich aktualisieren',
        ],
        links: [
          { title: 'Bebat', url: 'https://www.bebat.be' },
        ],
        priority: 'critical',
        sortOrder: 91,
      },
    ],
  },

  // ==========================================================
  // PORTUGAL - kategoriespezifisch
  // ==========================================================
  PT: {
    electronics: [
      {
        title: 'WEEE-Registrierung Portugal (SILiAmb/ERP)',
        description: 'Elektrogeraete-Hersteller im portugiesischen Produzentenregister (SILiAmb) eintragen und einem Kollektivsystem wie ERP Portugal oder Electrao beitreten.',
        detailedDescription: 'Das Decreto-Lei 152-D/2017 verpflichtet Inverkehrbringer von Elektrogeraeten in Portugal zur Eintragung in das elektronische Produzentenregister der Umweltbehoerde APA (Plattform SILiAmb) und zur Erfuellung der Ruecknahmepflichten ueber ein lizenziertes Kollektivsystem - etablierte Anbieter sind ERP Portugal und Electrao. Auslaendische Fernabsatzhaendler benoetigen einen Bevollmaechtigten in Portugal. Jaehrliche Mengenmeldungen ueber SILiAmb sind verpflichtend.',
        mandatory: true,
        category: 'Registrierung & Entsorgung',
        documentRequired: true,
        documentTypes: ['SILiAmb-Registrierung', 'Kollektivsystem-Vertrag (ERP/Electrao)'],
        legalBasis: 'Decreto-Lei 152-D/2017 (UNILEX)',
        authority: 'APA (Agencia Portuguesa do Ambiente)',
        deadline: 'Registrierung VOR dem ersten Inverkehrbringen',
        penalties: 'Ordnungswidrigkeiten-Bussen bis 216.000 EUR',
        tips: [
          'SILiAmb-Konto deckt auch Verpackungen und Batterien ab - Registrierungen buendeln',
          'Kollektivsystem-Tarife (ERP vs. Electrao) vergleichen',
        ],
        links: [
          { title: 'ERP Portugal', url: 'https://erp-recycling.org/pt-pt/' },
          { title: 'APA SILiAmb', url: 'https://siliamb.apambiente.pt' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
    ],
  },

  // ==========================================================
  // IRLAND - kategoriespezifisch
  // ==========================================================
  IE: {
    electronics: [
      {
        title: 'WEEE Register Ireland (Producer Registration)',
        description: 'Elektrogeraete-Hersteller bei der WEEE Register Society Ireland registrieren und einem Compliance-System (WEEE Ireland/ERP) beitreten.',
        detailedDescription: 'Irland verlangt fuer Inverkehrbringer von Elektrogeraeten die Registrierung bei der WEEE Register Society (Producer Register Ltd), dem nationalen Blackbox-Register, sowie den Beitritt zu einem genehmigten Compliance Scheme - WEEE Ireland oder ERP Ireland - oder Selbst-Compliance. Die Producer Registration Number muss auf Rechnungen erscheinen. Fernabsatzhaendler aus dem Ausland muessen sich ebenfalls registrieren oder einen Authorised Representative bestellen; das Register verwaltet parallel auch die Batterien-Produzentenpflichten.',
        mandatory: true,
        category: 'Registrierung & Entsorgung',
        documentRequired: true,
        documentTypes: ['WEEE Producer Registration', 'Compliance-Scheme-Vertrag'],
        legalBasis: 'European Union (WEEE) Regulations 2014 (S.I. 149/2014)',
        authority: 'WEEE Register Society, EPA Ireland',
        deadline: 'Registrierung VOR dem ersten Inverkehrbringen',
        penalties: 'Geldstrafen bei Verurteilung, Vertriebsuntersagung',
        tips: [
          'Registernummer auf Rechnungen an irische Kunden ausweisen',
          'Batterien-Registrierung gleich mit erledigen (gleiches Register)',
        ],
        links: [
          { title: 'WEEE Register Society', url: 'https://www.weeeregister.ie' },
          { title: 'WEEE Ireland', url: 'https://www.weeeireland.ie' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
    ],
  },

  // ==========================================================
  // GROSSBRITANNIEN - kategoriespezifisch
  // ==========================================================
  GB: {
    electronics: [
      {
        title: 'UK WEEE Producer Registration',
        description: 'Elektrogeraete-Hersteller fuer den GB-Markt bei der Environment Agency registrieren - ab 5 t direkt, darunter ueber ein Producer Compliance Scheme.',
        detailedDescription: 'Die UK WEEE Regulations 2013 verlangen eine Producer-Registrierung fuer alle, die Elektrogeraete erstmals auf den GB-Markt bringen: Small Producers (unter 5 t EEE/Jahr) registrieren sich direkt bei der Environment Agency, groessere Hersteller muessen einem Producer Compliance Scheme (PCS) beitreten, das die Sammel- und Verwertungspflichten uebernimmt. Die WEEE-Registrierungsnummer ist Haendlern mitzuteilen. Online-Marktplaetze werden zunehmend in die Verantwortung fuer Drittlandsverkaeufer einbezogen.',
        mandatory: true,
        category: 'Registrierung & Entsorgung',
        documentRequired: true,
        documentTypes: ['UK WEEE Producer Registration', 'PCS-Vertrag'],
        legalBasis: 'WEEE Regulations 2013 (UK S.I. 2013/3113)',
        authority: 'Environment Agency (England), SEPA/NRW/NIEA',
        deadline: 'Registrierung vor dem ersten Inverkehrbringen, jaehrliche Erneuerung',
        penalties: 'Bussgelder, strafrechtliche Verfolgung bei Nichtregistrierung',
        tips: [
          '5-Tonnen-Schwelle jaehrlich pruefen - darueber ist PCS-Beitritt Pflicht',
          'GB- und NI-Pflichten getrennt betrachten (NI folgt teilweise EU-Recht)',
        ],
        links: [
          { title: 'GOV.UK: EEE producer responsibility', url: 'https://www.gov.uk/guidance/electrical-and-electronic-equipment-eee-producer-responsibility' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
    ],
    food_supplements: [
      {
        title: 'FSA Novel Foods und UK-Supplement-Vorgaben',
        description: 'Fuer GB pruefen, ob Zutaten unter das eigenstaendige UK-Novel-Foods-Regime fallen, und die FSA-Vorgaben fuer Supplements einhalten.',
        detailedDescription: 'Seit dem Brexit fuehrt Grossbritannien ein eigenes Novel-Foods-Zulassungsregime unter der Food Standards Agency (FSA): EU-Zulassungen nach dem Stichtag gelten nicht automatisch, neuartige Zutaten (z. B. CBD, bestimmte Botanicals) brauchen eine separate GB-Zulassung ueber das FSA-Portal - prominent ist die CBD-Public-List. Nahrungsergaenzungsmittel benoetigen englischsprachige Etiketten nach den Food Supplements (England) Regulations 2003 sowie ggf. eine in GB ansaessige Food Business Operator-Adresse. Eine Notifizierungspflicht wie in Deutschland besteht nicht.',
        mandatory: true,
        category: 'Lebensmittel- & Gesundheitsrecht',
        documentRequired: true,
        documentTypes: ['Novel-Food-Status-Pruefung', 'Etikett (EN/GB)'],
        legalBasis: 'Food Supplements (England) Regulations 2003, Retained Regulation 2015/2283 (UK Novel Foods)',
        authority: 'Food Standards Agency (FSA)',
        penalties: 'Vertriebsverbot, Enforcement durch Local Authorities',
        tips: [
          'Zutaten gegen die FSA-Novel-Food-Liste und CBD-Public-List pruefen',
          'GB-Etikett mit UK-Adresse des Lebensmittelunternehmers versehen',
          'EU-Health-Claims-Liste gilt als retained law weiter, Aenderungen divergieren aber zunehmend',
        ],
        links: [
          { title: 'FSA Novel Foods', url: 'https://www.food.gov.uk/business-guidance/regulated-products/novel-foods-guidance' },
        ],
        priority: 'high',
        sortOrder: 91,
      },
    ],
  },

  // ==========================================================
  // USA - kategoriespezifisch
  // ==========================================================
  US: {
    electronics: [
      {
        title: 'FCC Part 15: SDoC oder Certification',
        description: 'Elektronik mit Funktechnik oder Taktfrequenzen fuer den US-Markt nach FCC Part 15 autorisieren (Supplier\'s Declaration of Conformity oder Certification).',
        detailedDescription: 'Praktisch jede Elektronik faellt in den USA unter FCC Part 15: Unbeabsichtigte Strahler (Digitalelektronik) durchlaufen die Supplier\'s Declaration of Conformity (SDoC) mit Tests in einem akkreditierten Labor und einem US-ansaessigen verantwortlichen Akteur; beabsichtigte Strahler (WLAN, Bluetooth, Funk) benoetigen eine FCC Certification ueber einen Telecommunication Certification Body mit FCC-ID auf dem Geraet. Kennzeichnungs- und Informationspflichten (Compliance Statement in der Anleitung) gelten in beiden Verfahren. Seit 2023 duerfen keine Geraete gelisteter chinesischer Hersteller (Covered List) autorisiert werden.',
        mandatory: true,
        category: 'Produktsicherheit & Pruefung',
        documentRequired: true,
        documentTypes: ['FCC-Pruefberichte', 'FCC-ID-Grant bzw. SDoC', 'Compliance Statement'],
        legalBasis: '47 CFR Part 15, Communications Act',
        authority: 'FCC (Federal Communications Commission)',
        penalties: 'Forfeitures bis ueber 20.000 USD pro Tag und Verstoss, Importstopp, Geraetebeschlagnahme',
        tips: [
          'SDoC erfordert einen US-ansaessigen Verantwortlichen - fruehzeitig benennen',
          'FCC-ID dauerhaft auf dem Geraet anbringen (E-Label bei Geraeten mit Display moeglich)',
          'EU-EMV-Berichte sind nicht direkt verwendbar - US-Messverfahren (ANSI C63.4) noetig',
        ],
        links: [
          { title: 'FCC Equipment Authorization', url: 'https://www.fcc.gov/engineering-technology/laboratory-division/general/equipment-authorization' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
      {
        title: 'UL/NRTL-Zertifizierung (Marktpraxis)',
        description: 'Elektrische Sicherheit durch ein NRTL (z. B. UL, ETL) zertifizieren lassen - rechtlich nicht immer Pflicht, aber faktischer Marktstandard.',
        detailedDescription: 'Eine bundesweite gesetzliche Pflicht zur UL-Zertifizierung fuer Consumer-Elektronik existiert nicht - in der Praxis verlangen aber Haendler, Versicherer, Importeure und viele lokale Vorschriften (OSHA am Arbeitsplatz, einzelstaatliche Codes) eine Zertifizierung durch ein Nationally Recognized Testing Laboratory (NRTL) wie UL oder Intertek (ETL). Netzbetriebene Geraete ohne NRTL-Listing sind im US-Handel kaum platzierbar und ein erhebliches Produkthaftungsrisiko. Die Pruefung erfolgt nach US-Normen (UL-Standards), nicht nach IEC/EN.',
        mandatory: false,
        category: 'Produktsicherheit & Pruefung',
        documentRequired: true,
        documentTypes: ['NRTL-Listing (UL/ETL)', 'Pruefberichte'],
        legalBasis: 'OSHA 29 CFR 1910.303 (Arbeitsplatz), einzelstaatliche Codes, Handelsanforderungen',
        authority: 'OSHA (NRTL-Programm), private Zertifizierer',
        penalties: 'Kein direktes Bussgeld fuer Consumer-Ware, aber Delisting, Haftungs- und Versicherungsrisiken',
        tips: [
          'UL- und IEC-Normen unterscheiden sich - Design fruehzeitig auf UL-Anforderungen auslegen',
          'ETL (Intertek) ist oft guenstiger und gleichwertig anerkannt',
          'Listing-Mark mit Follow-Up-Service einplanen (laufende Fabrikinspektionen)',
        ],
        links: [
          { title: 'OSHA NRTL Program', url: 'https://www.osha.gov/nationally-recognized-testing-laboratory-program' },
        ],
        priority: 'high',
        sortOrder: 91,
      },
      {
        title: 'State Battery Laws und Batterie-EPR (USA)',
        description: 'Einzelstaatliche Batterie-Gesetze pruefen: Kennzeichnung, Ruecknahmepflichten und neue EPR-Programme (z. B. Kalifornien, Washington, Vermont).',
        detailedDescription: 'Batterien unterliegen in den USA einem Flickenteppich aus Bundes- und Staatenrecht: Der Mercury-Containing and Rechargeable Battery Management Act regelt Kennzeichnung und Sammelfaehigkeit von Akkus bundesweit, waehrend Staaten wie Kalifornien (AB 2440 - Responsible Battery Recycling Act), Washington und Vermont eigene EPR-Programme mit Registrierungs- und Stewardship-Pflichten fuer Batterien und batteriebetriebene Produkte eingefuehrt haben. New York City und einige Staaten regeln zusaetzlich Lithium-Ionen-Akkus (Zertifizierungspflicht fuer E-Mobility-Akkus). Vor dem US-Vertrieb je Zielstaat pruefen, ob Registrierung bei einer Battery Stewardship Organization noetig ist.',
        mandatory: true,
        category: 'Registrierung & Entsorgung',
        documentRequired: true,
        documentTypes: ['Stewardship-Registrierungen je Staat', 'Kennzeichnungsnachweis'],
        legalBasis: 'Battery Act 1996 (Bund), CA AB 2440, WA SB 5144 u. a.',
        authority: 'EPA, CalRecycle, Staaten-Umweltbehoerden',
        penalties: 'Verkaufsverbote im jeweiligen Staat, Civil Penalties',
        tips: [
          'Kalifornien-Programm (gestaffelt seit 2026/2027) fruehzeitig beobachten',
          'Recycling-Symbole und Chemie-Kennzeichnung (Li-Ion, NiMH) nach Battery Act anbringen',
          'E-Bike/E-Scooter-Akkus: UL 2271/2849-Zertifizierung fuer NYC und mehrere Staaten',
        ],
        links: [
          { title: 'EPA Battery Regulations', url: 'https://www.epa.gov/recycle/used-lithium-ion-batteries' },
          { title: 'CalRecycle Battery EPR', url: 'https://calrecycle.ca.gov/electronics/batteries/' },
        ],
        priority: 'high',
        sortOrder: 92,
      },
    ],
    toys: [
      {
        title: 'ASTM F963 Pruefung + CPC durch CPSC-Drittlabor',
        description: 'Spielzeug fuer die USA nach ASTM F963 in einem CPSC-akzeptierten Drittlabor pruefen und ein Children\'s Product Certificate ausstellen.',
        detailedDescription: 'Die Spielzeugnorm ASTM F963 ist in den USA als verbindliche Consumer Product Safety Rule festgeschrieben. Jedes Spielzeug muss von einem CPSC-akzeptierten Drittlabor auf ASTM F963, die Bleigrenzwerte (90 ppm Farbe, 100 ppm Substrat), Phthalate (16 CFR 1307) und ggf. Kleinteile-/Magnetregeln geprueft werden. Auf Basis der Tests stellt der Importeur das Children\'s Product Certificate (CPC) aus. Zusaetzlich ist ein permanentes Tracking Label mit Hersteller, Produktionsdatum und Chargeninformation auf Produkt und Verpackung Pflicht. EN-71-Berichte ersetzen die US-Tests nicht.',
        mandatory: true,
        category: 'Produktsicherheit & Pruefung',
        documentRequired: true,
        documentTypes: ['ASTM-F963-Pruefberichte', 'Children\'s Product Certificate', 'Tracking-Label-Konzept'],
        legalBasis: 'CPSIA, 16 CFR 1250 (ASTM F963), 16 CFR 1307',
        authority: 'CPSC',
        deadline: 'Vor dem Import; Periodic Testing mindestens jaehrlich',
        penalties: 'Civil Penalties bis ca. 120.000 USD je Verstoss, Importstopp, Rueckrufe',
        tips: [
          'Nur Labore aus der offiziellen CPSC-Akzeptanzliste beauftragen',
          'Tracking Label schon im Produktdesign vorsehen (dauerhaft, nicht nur Aufkleber)',
          'Altersgrenzen-Bewertung dokumentieren - sie bestimmt die anwendbaren Tests',
        ],
        links: [
          { title: 'CPSC Toy Safety', url: 'https://www.cpsc.gov/Business--Manufacturing/Business-Education/Toy-Safety' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
    ],
    cosmetics: [
      {
        title: 'MoCRA: FDA-Registrierung und Product Listing',
        description: 'Kosmetik-Herstellungsstaetten bei der FDA registrieren und jedes Produkt mit Rezeptur listen (Modernization of Cosmetics Regulation Act).',
        detailedDescription: 'Der MoCRA von 2022 hat das US-Kosmetikrecht grundlegend verschaerft: Herstellungs- und Verarbeitungsbetriebe muessen bei der FDA registriert werden (Renewal alle zwei Jahre), jedes Kosmetikprodukt ist mit Rezeptur ueber das Portal Cosmetics Direct zu listen (jaehrliche Aktualisierung). Zusaetzlich verlangt MoCRA eine Responsible Person mit US-Adresse auf dem Etikett, Safety Substantiation fuer jedes Produkt, Adverse-Event-Meldungen binnen 15 Werktagen und kuenftig GMP nach FDA-Regeln sowie Talk-/PFAS-Sondervorschriften. Kleinstunternehmen haben Teilausnahmen.',
        mandatory: true,
        category: 'Lebensmittel- & Gesundheitsrecht',
        documentRequired: true,
        documentTypes: ['Facility Registration', 'Product Listing (Cosmetics Direct)', 'Safety Substantiation Dossier'],
        legalBasis: 'MoCRA 2022, FD&C Act Kapitel VI',
        authority: 'FDA',
        deadline: 'Registrierung/Listing vor Vermarktung; Facility-Renewal alle 2 Jahre',
        penalties: 'Produkt gilt als adulterated/misbranded, Importverweigerung, Mandatory Recalls',
        tips: [
          'Responsible Person mit US-Kontakt auf dem Etikett angeben',
          'Safety Substantiation analog EU-Sicherheitsbewertung aufbauen - vorhandene CPSR-Daten nutzen',
          'Fragrance-Allergene und kuenftige FDA-GMP-Regeln im Blick behalten',
        ],
        links: [
          { title: 'FDA MoCRA', url: 'https://www.fda.gov/cosmetics/cosmetics-laws-regulations/modernization-cosmetics-regulation-act-2022-mocra' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
    ],
    food: [
      {
        title: 'FDA Facility Registration, FSVP und US Nutrition Facts',
        description: 'Lebensmittelbetriebe bei der FDA registrieren, FSVP-Importprogramm aufsetzen und Etiketten auf das US-Nutrition-Facts-Format umstellen.',
        detailedDescription: 'Fuer Lebensmittelexporte in die USA gilt ein Dreiklang: Erstens muessen alle herstellenden, verarbeitenden und lagernden Betriebe bei der FDA registriert sein (Food Facility Registration mit US-Agent, Renewal alle zwei Jahre); jede Sendung erfordert eine Prior Notice. Zweitens braucht der US-Importeur ein Foreign Supplier Verification Program (FSVP) nach FSMA, das die Lebensmittelsicherheit des auslaendischen Lieferanten dokumentiert. Drittens muessen Etiketten dem US-Recht entsprechen: Nutrition-Facts-Panel im FDA-Format, US-Allergenkennzeichnung (FALCPA inkl. Sesam), Zutaten in absteigender Reihenfolge mit US-Bezeichnungen - das EU-Naehrwertformat ist nicht zulaessig.',
        mandatory: true,
        category: 'Lebensmittel- & Gesundheitsrecht',
        documentRequired: true,
        documentTypes: ['FDA Facility Registration', 'FSVP-Dokumentation', 'US-konformes Etikett'],
        legalBasis: 'FD&C Act, FSMA, 21 CFR 101 (Labeling), 21 CFR 1.500 ff. (FSVP)',
        authority: 'FDA, CBP',
        deadline: 'Registrierung vor dem Export; Renewal in geraden Jahren (Okt-Dez)',
        penalties: 'Importverweigerung (Import Alert), Detention without Physical Examination',
        tips: [
          'US-Agent mit physischer US-Praesenz benennen (Pflichtbestandteil der Registrierung)',
          'Nutrition Facts von einem US-Labelling-Spezialisten erstellen lassen - Rundungsregeln sind eigen',
          'FSVP-Verantwortung vertraglich mit dem US-Importeur klaeren',
        ],
        links: [
          { title: 'FDA Food Facility Registration', url: 'https://www.fda.gov/food/guidance-regulation-food-and-dietary-supplements/registration-food-facilities-and-other-submissions' },
          { title: 'FDA FSVP', url: 'https://www.fda.gov/food/food-safety-modernization-act-fsma/fsma-final-rule-foreign-supplier-verification-programs-fsvp-importers-food-humans-and-animals' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
    ],
    food_supplements: [
      {
        title: 'FDA-Anforderungen Supplements: NDI, cGMP 21 CFR 111, DSHEA-Disclaimer',
        description: 'Dietary Supplements nach DSHEA vermarkten: NDI-Pruefung fuer neue Zutaten, cGMP-Herstellung nach 21 CFR 111 und Pflicht-Disclaimer auf dem Etikett.',
        detailedDescription: 'In den USA gelten Nahrungsergaenzungsmittel als Dietary Supplements unter DSHEA: Zutaten, die nach dem 15.10.1994 erstmals vermarktet wurden, erfordern eine New Dietary Ingredient (NDI) Notification an die FDA 75 Tage vor Markteintritt. Die Herstellung muss den cGMP-Regeln nach 21 CFR Part 111 entsprechen - auch auslaendische Hersteller werden von der FDA inspiziert. Etiketten brauchen das Supplement-Facts-Panel und bei Structure/Function-Claims den woertlichen DSHEA-Disclaimer (This statement has not been evaluated by the FDA...); Claims sind der FDA binnen 30 Tagen nach Markteintritt zu melden. Krankheitsbezogene Aussagen machen das Produkt zum unzulaessigen Arzneimittel.',
        mandatory: true,
        category: 'Lebensmittel- & Gesundheitsrecht',
        documentRequired: true,
        documentTypes: ['NDI-Status-Pruefung', 'cGMP-Nachweise (21 CFR 111)', 'Supplement-Facts-Etikett'],
        legalBasis: 'DSHEA 1994, FD&C Act, 21 CFR 111, 21 CFR 101.36',
        authority: 'FDA, FTC (Werbung)',
        penalties: 'Import Alerts, Warning Letters, Seizures, FTC-Verfahren bei Werbeclaims',
        tips: [
          'Zutaten gegen Old-Dietary-Ingredient-Listen pruefen, NDI-Notification fruehzeitig einreichen',
          'DSHEA-Disclaimer woertlich und in Etikettennaehe zum Claim platzieren',
          'FDA-Facility-Registrierung (Lebensmittelkategorie) nicht vergessen - gilt auch fuer Supplements',
        ],
        links: [
          { title: 'FDA Dietary Supplements', url: 'https://www.fda.gov/food/dietary-supplements' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
    ],
    medical_devices: [
      {
        title: 'FDA 510(k) / Establishment Registration und Device Listing',
        description: 'Medizinprodukte fuer die USA klassifizieren, ggf. 510(k)-Clearance einholen sowie Establishment Registration und Device Listing durchfuehren.',
        detailedDescription: 'Der US-Marktzugang fuer Medizinprodukte laeuft vollstaendig ueber die FDA: Das Produkt wird einer US-Klasse (I/II/III) zugeordnet - die Klassifizierung weicht teils von der EU-MDR ab. Klasse-II-Produkte benoetigen in der Regel eine 510(k) Premarket Notification mit Nachweis der substantiellen Aequivalenz zu einem Predicate Device, Klasse III ein PMA-Verfahren. Unabhaengig davon muessen Hersteller, Importeure und der benannte US-Agent jaehrlich die Establishment Registration (gebuehrenpflichtig) und das Device Listing durchfuehren. UDI-Kennzeichnung und QMS nach 21 CFR 820 (kuenftig QMSR/ISO 13485) sind verpflichtend; CE-Kennzeichnung hat keine Anerkennungswirkung.',
        mandatory: true,
        category: 'Lebensmittel- & Gesundheitsrecht',
        documentRequired: true,
        documentTypes: ['510(k)-Clearance bzw. Klassifizierungsnachweis', 'Establishment Registration', 'Device Listing', 'UDI-Daten (GUDID)'],
        legalBasis: 'FD&C Act Sec. 510, 21 CFR 807, 21 CFR 820',
        authority: 'FDA (CDRH)',
        deadline: 'Registrierung/Listing vor Vermarktung, jaehrliche Erneuerung (Gebuehr)',
        penalties: 'Importverweigerung, Warning Letters, Seizures, strafrechtliche Verfolgung',
        tips: [
          'Predicate-Device-Recherche in der 510(k)-Datenbank vor der Entwicklung durchfuehren',
          'US-Agent mit US-Adresse benennen (Pflicht fuer auslaendische Hersteller)',
          'Umstellung auf QMSR (ISO-13485-Harmonisierung, wirksam 2026) einplanen',
        ],
        links: [
          { title: 'FDA Device Registration and Listing', url: 'https://www.fda.gov/medical-devices/how-study-and-market-your-device/device-registration-and-listing' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
    ],
    chemicals: [
      {
        title: 'TSCA-Inventory und OSHA HazCom (GHS-Etiketten, SDS)',
        description: 'Chemische Stoffe gegen das TSCA-Inventory pruefen (EPA) und Arbeitsplatz-Chemikalien nach OSHA HazCom 2012 mit GHS-Etikett und SDS ausstatten.',
        detailedDescription: 'Fuer Chemikalien-Importe in die USA gilt der Toxic Substances Control Act: Jeder Stoff muss im TSCA-Inventory der EPA gelistet sein oder vor dem Import per Premanufacture Notice (PMN) angemeldet werden; Importeure muessen je Sendung eine TSCA-Zertifizierung (positive oder negative Certification) gegenueber dem Zoll abgeben. Parallel verlangt der OSHA Hazard Communication Standard (29 CFR 1910.1200, an GHS angelehnt) fuer gefaehrliche Chemikalien GHS-konforme Etiketten und Safety Data Sheets im 16-Abschnitte-Format auf Englisch. Die US-GHS-Umsetzung weicht in Details (Kategorien, Pflichtsaetze) von EU-CLP ab; zusaetzlich gelten einzelstaatliche Regeln wie Kaliforniens Prop 65.',
        mandatory: true,
        category: 'Chemikalien & Stoffe',
        documentRequired: true,
        documentTypes: ['TSCA-Inventory-Abgleich', 'TSCA Import Certification', 'SDS (US-Format)', 'GHS-Etiketten'],
        legalBasis: 'TSCA (15 U.S.C. 2601 ff.), 29 CFR 1910.1200 (HazCom 2012)',
        authority: 'EPA, OSHA, CBP',
        penalties: 'Civil Penalties bis ca. 50.000 USD pro Tag und Verstoss, Importverweigerung',
        tips: [
          'CAS-Nummern aller Inhaltsstoffe gegen das TSCA-Inventory (CompTox) abgleichen',
          'EU-SDS nicht 1:1 uebernehmen - US-HazCom-Abweichungen einarbeiten',
          'TSCA-Sondervorschriften (PFAS-Reporting, Sec. 6-Verbote) fuer Bestandsstoffe pruefen',
        ],
        links: [
          { title: 'EPA TSCA Inventory', url: 'https://www.epa.gov/tsca-inventory' },
          { title: 'OSHA Hazard Communication', url: 'https://www.osha.gov/hazcom' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
    ],
  },

  // ==========================================================
  // SCHWEIZ - kategoriespezifisch
  // ==========================================================
  CH: {
    electronics: [
      {
        title: 'SENS/SWICO vRG (vorgezogener Recyclingbeitrag)',
        description: 'Elektrogeraete fuer den Schweizer Markt bei SENS eRecycling bzw. SWICO anmelden und den vorgezogenen Recyclingbeitrag (vRG) abfuehren.',
        detailedDescription: 'Die Schweiz organisiert das Elektrogeraete-Recycling ueber die Branchensysteme SENS eRecycling (Haushaltsgeraete, Leuchten) und SWICO Recycling (IT, Unterhaltungselektronik). Hersteller und Importeure schliessen eine Konvention ab und fuehren je Geraet den vorgezogenen Recyclingbeitrag (vRG) ab, der die spaetere Entsorgung finanziert. Die Teilnahme ist formal freiwillig, faktisch aber Branchenstandard und Handelsvoraussetzung; die VREG verpflichtet Haendler und Hersteller unabhaengig davon zur kostenlosen Ruecknahme von Altgeraeten.',
        mandatory: true,
        category: 'Registrierung & Entsorgung',
        documentRequired: true,
        documentTypes: ['SENS/SWICO-Konvention', 'vRG-Deklaration'],
        legalBasis: 'VREG (SR 814.620), Branchenkonventionen SENS/SWICO',
        authority: 'BAFU, SENS eRecycling / SWICO',
        deadline: 'Vor dem ersten Inverkehrbringen in der Schweiz',
        penalties: 'Ruecknahme-/Entsorgungspflicht auf eigene Kosten, Handelsbeschraenkungen',
        tips: [
          'Systemzuordnung pruefen: SWICO fuer IT/CE, SENS fuer Haushalt/Licht',
          'vRG-Saetze je Geraetekategorie in die Preiskalkulation einrechnen',
        ],
        links: [
          { title: 'SENS eRecycling', url: 'https://www.sens.ch' },
          { title: 'SWICO Recycling', url: 'https://www.swico.ch' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
      {
        title: 'VREG-Ruecknahmepflicht und Schweizer Geraete-Konformitaet',
        description: 'Ruecknahmepflichten nach VREG erfuellen und die Schweizer Konformitaetsanforderungen (VEMV, NEV, FAV) fuer Elektrogeraete pruefen.',
        detailedDescription: 'Die VREG verpflichtet Haendler, Hersteller und Importeure, Elektro- und Elektronikgeraete der eigenen Sortimente kostenlos zurueckzunehmen und der fachgerechten Entsorgung zuzufuehren. Fuer das Inverkehrbringen gelten die Schweizer Pendants zum EU-Recht: VEMV (EMV), NEV (Niederspannung) und FAV (Funkanlagen) - EU-Konformitaetsnachweise werden ueber das MRA grundsaetzlich anerkannt, die Dokumentation muss aber einem Schweizer Ansprechpartner zugaenglich sein. Bei Funkanlagen sind Schweizer Frequenz-Besonderheiten und die BAKOM-Vorgaben zu pruefen.',
        mandatory: true,
        category: 'Produktsicherheit & Pruefung',
        documentRequired: true,
        documentTypes: ['Konformitaetserklaerung', 'Technische Dokumentation'],
        legalBasis: 'VREG (SR 814.620), VEMV (SR 734.5), NEV (SR 734.26), FAV (SR 784.101.2)',
        authority: 'BAFU, ESTI, BAKOM',
        penalties: 'Vertriebsbeschraenkungen, Bussen',
        tips: [
          'EU-DoC um Verweis auf die Schweizer Verordnungen ergaenzen',
          'Bei Funkprodukten BAKOM-Frequenzplan gegen EU-Harmonisierung abgleichen',
        ],
        links: [
          { title: 'BAKOM', url: 'https://www.bakom.admin.ch' },
          { title: 'ESTI', url: 'https://www.esti.admin.ch' },
        ],
        priority: 'high',
        sortOrder: 91,
      },
    ],
    cosmetics: [
      {
        title: 'Schweizer Anpreisungsvorschriften Kosmetik',
        description: 'Kosmetik nach Schweizer Recht (LGV/VKos) kennzeichnen und die strengen Anpreisungs- und Taeuschungsverbote beachten.',
        detailedDescription: 'Kosmetika unterliegen in der Schweiz dem Lebensmittelgesetz und der Verordnung ueber kosmetische Mittel (VKos), die materiell weitgehend der EU-Kosmetikverordnung folgt - eine CPNP-Notifizierung gibt es jedoch nicht und sie entfaltet in der Schweiz keine Wirkung. Besonders streng ist das Taeuschungsverbot nach Art. 18 LMG: Heilanpreisungen (krankheitsbezogene Aussagen) sind verboten und werden von den Kantonschemikern aktiv beanstandet. Etiketten muessen in mindestens einer Amtssprache des Vertriebsgebiets vorliegen; eine in der Schweiz ansaessige verantwortliche Adresse ist anzugeben.',
        mandatory: true,
        category: 'Kennzeichnung & Information',
        documentRequired: true,
        documentTypes: ['Etikett (DE/FR/IT)', 'Sicherheitsbewertung', 'Claim-Substantiierung'],
        legalBasis: 'LMG (SR 817.0) Art. 18, VKos (SR 817.023.31), LGV (SR 817.02)',
        authority: 'BLV, kantonale Vollzugsbehoerden (Kantonschemiker)',
        penalties: 'Beanstandung, Vertriebsverbot, Bussen',
        tips: [
          'EU-Produktdossiers (PIF) als Basis nutzen - Schweizer Abweichungen sind gering',
          'Wirkaussagen gegen das Heilanpreisungsverbot pruefen (keine Krankheitsbezuege)',
          'Schweizer Adresse der verantwortlichen Person auf dem Etikett angeben',
        ],
        links: [
          { title: 'BLV Kosmetika', url: 'https://www.blv.admin.ch/blv/de/home/gebrauchsgegenstaende/kosmetika.html' },
        ],
        priority: 'high',
        sortOrder: 90,
      },
    ],
    food: [
      {
        title: 'Schweizer Lebensmittelrecht (LIV) und Bewilligungen',
        description: 'Lebensmittel-Etiketten an die Schweizer LIV anpassen und pruefen, ob eine BLV-Bewilligung (z. B. Cassis-de-Dijon, neuartige Lebensmittel) noetig ist.',
        detailedDescription: 'Lebensmittel folgen in der Schweiz eigenem Recht: Die Verordnung betreffend die Information ueber Lebensmittel (LIV) verlangt Kennzeichnung in mindestens einer Amtssprache, Angabe des Produktionslandes, der Schweizer Importeur-Adresse sowie teils abweichende Pflichtangaben gegenueber der EU-LMIV (z. B. Herkunft der Rohstoffe). EU-konforme Lebensmittel, die Schweizer Vorschriften nicht vollstaendig erfuellen, brauchen eine Cassis-de-Dijon-Bewilligung des BLV; neuartige Lebensmittel und angereicherte Produkte unterliegen eigenen Schweizer Zulassungs- bzw. Bewilligungsregimen. Hoechstmengen fuer Vitamin- und Mineralstoffzusaetze weichen von der EU ab.',
        mandatory: true,
        category: 'Lebensmittel- & Gesundheitsrecht',
        documentRequired: true,
        documentTypes: ['Etikett (CH-konform)', 'ggf. BLV-Bewilligung'],
        legalBasis: 'LMG (SR 817.0), LGV (SR 817.02), LIV (SR 817.022.16)',
        authority: 'BLV, kantonale Vollzugsbehoerden',
        deadline: 'Bewilligungen VOR dem Inverkehrbringen einholen',
        penalties: 'Beanstandung, Vertriebsverbot, Bussen',
        tips: [
          'Produktionsland und Schweizer Importadresse sind Pflicht - EU-Etikett reicht nicht 1:1',
          'Cassis-de-Dijon-Bewilligungsliste des BLV pruefen, ob ein vergleichbares Produkt bereits bewilligt ist',
          'Anreicherungen (Vitamine/Mineralstoffe) gegen Schweizer Hoechstmengen pruefen',
        ],
        links: [
          { title: 'BLV Lebensmittel', url: 'https://www.blv.admin.ch/blv/de/home/lebensmittel-und-ernaehrung.html' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
    ],
    medical_devices: [
      {
        title: 'Swissmedic: CH-REP und Registrierung (MRA-Wegfall)',
        description: 'Nach dem Wegfall des MRA fuer Medizinprodukte einen Schweizer Bevollmaechtigten (CH-REP) bestellen, Produkte kennzeichnen und bei Swissmedic registrieren.',
        detailedDescription: 'Seit dem Auslaufen des Mutual Recognition Agreement (2021) behandelt die Schweiz EU-Hersteller von Medizinprodukten als Drittstaaten-Hersteller: Erforderlich sind ein in der Schweiz niedergelassener Bevollmaechtigter (CH-REP), dessen Angabe auf Produkt oder Begleitdokumenten, ein Schweizer Importeur sowie die Registrierung der Wirtschaftsakteure bei Swissmedic (CHRN - Swiss Single Registration Number). Die MepV folgt materiell der EU-MDR, EU-Zertifikate benannter Stellen werden derzeit einseitig anerkannt. Vigilance-Meldungen laufen ueber den CH-REP an Swissmedic; eine Schweizer Produktdatenbank (swissdamed) ist im Aufbau.',
        mandatory: true,
        category: 'Lebensmittel- & Gesundheitsrecht',
        documentRequired: true,
        documentTypes: ['CH-REP-Mandat', 'CHRN-Registrierung', 'Kennzeichnung mit CH-REP-Angabe'],
        legalBasis: 'MepV (SR 812.213), IvDV (SR 812.219)',
        authority: 'Swissmedic',
        deadline: 'CH-REP und CHRN VOR dem Inverkehrbringen in der Schweiz',
        penalties: 'Vertriebsverbot, Bussen nach Heilmittelgesetz',
        tips: [
          'CH-REP-Angabe kann produktnah oder auf Begleitdokumenten erfolgen - Fristenregeln beachten',
          'CHRN fuer Hersteller, CH-REP und Importeur separat beantragen',
          'swissdamed-Registrierungspflichten (Akteurs- und Produktmodul) im Rollout verfolgen',
        ],
        links: [
          { title: 'Swissmedic Medizinprodukte', url: 'https://www.swissmedic.ch/swissmedic/de/home/medizinprodukte.html' },
        ],
        priority: 'critical',
        sortOrder: 90,
      },
    ],
  },
};
