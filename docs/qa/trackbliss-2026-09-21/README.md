# Trackbliss: Readiness- und Mobilprüfung vom 21.09.2026

**Historischer Ausgangsbefund. Die anschließenden Korrekturen und ihre Nachweise stehen in [FIXES.md](FIXES.md).**

Geprüfter Stand: `d8b66078562c6b7bb9029b065bee42a2a7c91b65`, Web-Production `https://dpp-app.fambliss.eu` und lokale Builds. Diese Prüfung verändert weder Produktivdaten noch Anwendungscode. Der zuvor durchgeführte Etsy-Fix ist ein separater Vorgang.

## Umfang und belastbare Ergebnisse

| Prüfung | Ergebnis | Aussagegrenze |
|---|---|---|
| Routeninventar aus React-Router-Konfiguration | 175 Einträge: 40 öffentlich, 8 Native, 7 Kunden-Auth, 13 Admin, 107 Mandanten-Auth | Routen sind nicht gleich unterschiedliche Screens; Weiterleitungen und parametrisierte Varianten sind enthalten. |
| Breiter Chromium-Durchlauf | 163 Routen × 360/390/768/1440 px = 652 Aufrufe; kein horizontaler Dokumentüberlauf | Isolierte synthetische Anmeldung, vollständig abgefangene Backendaufrufe. Teilweise nur leere Listen, Fehlerseiten oder Weiterleitungen. Kein Nachweis echter Datenoperationen. |
| Gefüllte Kernansichten | 13 Routen × 4 Breiten = 52 Aufrufe; keine Laufzeitfehler | Synthetische Produkte, Etsy-Bestellung und Sendung. Dialog-Clipping trotz passendem Dokumentmaß gefunden. |
| DPP-Templates | 12 Varianten × 360/768/1440 px = 36 Aufrufe; Produkt tatsächlich angezeigt, keine Laufzeitfehler oder Dokumentüberläufe | Basis-Testprodukt, nicht jede optionale Sektion, Übersetzung oder Zollansicht. |
| Öffentliche WebKit-Mobiltests | 34 bestanden auf iPhone-SE-/iPad-Mini-Profilen | Öffentliche Seiten einschließlich ungültiger Produkt-/Portalparameter; keine angemeldeten Geschäftsabläufe. |
| Onboarding und Gastmodus | 28 bestanden auf separatem Build mit `VITE_E2E_FIRST_RUN=1` | WebKit-Geräteprofile, keine physische iOS-/Android-Abnahme. |
| Unit-Tests | 302 in 19 Dateien bestanden | Gemockte Services; keine vollständige Integration mit externen Anbietern. |
| Native-/Release-Konfiguration und Store-Dateien | vorhandene Prüfskripte bestanden | Kein Nachweis aktueller TestFlight-/Play-Auslieferung oder echter Gerätefunktion. |
| ESLint | 0 Fehler, **409 Warnungen** | CI erlaubt maximal 386; daher keine grüne CI. |
| Live-Stichprobe | Login, Preise und ungültiger Feedback-Link bei 390 px ohne JS-Fehler, HTTP-Fehler oder Dokumentüberlauf | Nur öffentliche, lesende Aufrufe. |

Der bestehende kombinierte E2E-Aufruf gegen den normalen Webbuild meldete zunächst 7 Fehlschläge und 10 übersprungene Tests in der Native-Suite. Gegen den ausdrücklich dafür erstellten Native-Testbuild bestehen alle 28 Native-Tests. Diese anfänglichen Befunde sind **Testkonfigurationsprobleme**, keine bestätigten Onboarding-Produktfehler.

## Bestätigte Befunde

### 1. Bestellpositionsdialog schneidet Inhalt ab — hohe Priorität

Reproduktion: Commerce → Alle Bestellungen → Bestellung mit langem Produktnamen öffnen. Bei 360 px ist der Dialog innen 358 px breit, sein Inhalt benötigt 564 px. Auch bei 390 px und im 510 px breiten Desktopdialog wurde internes horizontales Überlaufen gemessen. Die Dokumentbreite bleibt korrekt, weshalb ein Test ausschließlich auf `documentElement.scrollWidth` diesen Fehler übersieht.

Betroffen: `src/components/commerce/OrderItemsDialog.tsx`, insbesondere Dialogbreite, Grid-/Flex-Mindestbreiten und das native Produktauswahlfeld. Titel, Beschreibung und Auswahltext liegen teilweise außerhalb des sichtbaren Ausschnitts. Zusätzlich besitzt das Produktauswahlfeld kein explizites Label.

Beleg: [Dialog bei 360 px](order-dialog-360.png), [Messwerte](commerce-results.json).

### 2. CI ist rot — hohe Priorität für Releasefreigabe

Der lokale Lintlauf über den Anwendungscode ergibt 409 Warnungen. `.github/workflows/ci.yml` verwendet `--max-warnings 386`. Der letzte GitHub-Lauf `35574534514` für den geprüften Commit ist fehlgeschlagen; der Build selbst ist erfolgreich. Die Warnungen müssen fachlich bereinigt werden; ein Webdeployment ersetzt diese Prüfung nicht.

### 3. DPP-Batch-Upload ist ein Platzhalter — Funktionslücke

`src/App.tsx:541` bindet `/dpp/batch-upload` ausdrücklich an `PlaceholderPage`. Der Screen ist erreichbar, aber der versprochene Ablauf ist dort nicht implementiert.

### 4. Deutsche Oberflächen sind nicht vollständig übersetzt

Die deutsche Produktliste zeigt unter anderem „Products“ und „Create your first product to get started with Trackbliss.“. Das Produktformular zeigt „Basic Data“. Die betreffenden Schlüssel fehlen im verwendeten deutschen Namespace oder werden dort nicht korrekt aufgelöst. Die bestehenden Sprachparitätstests erkennen fehlende Schlüssel in beiden Sprachen nicht vollständig.

Belege: [Produktliste](products-empty-360.png), [Produktformular](product-form-360.png); `src/pages/ProductsPage.tsx:326` und `:506`.

### 5. Workflow-Funktionsumfang ist unvollständig

Überfälligkeits- und tägliche/wöchentliche/monatliche Trigger sind im Konfigurator auswählbar. Bei der Suche im aktuellen Repository wurden dafür keine entsprechenden Auslöser in Services/Edge Functions gefunden. `rh-workflows.ts:14` bildet den alten `return_overdue`-Trigger sogar auf `return_created` ab. Das ist keine gleichwertige Ausführung.

Die Verzögerungen der Workflow-Engine laufen über `setTimeout` im Browser (`rh-workflow-engine.ts:250`); ein geschlossener Tab kann diesen Ablauf nicht zuverlässig fortsetzen. Diese Automatisierungen benötigen eine serverseitige Ausführung oder eine klare Einschränkung der Oberfläche. Eine außerhalb des Repositories eingerichtete Ausführung wurde nicht nachgewiesen.

### 6. Nicht alle Versanddienstleister unterstützen Labels

Der aktuelle Carrier-Katalog unterstützt Labelerstellung bei DHL Parcel DE. DHL Express, UPS, GLS, DPD und Hermes sind ausdrücklich als `labels: false` hinterlegt. Verbindungen/Trackinglinks sind keine vollständige Versandlabel-Integration. Das ist vorhandener Produktumfang, kein neu nachgewiesener Ausfall.

### 7. Weitere mobile Qualitätsstellen

Die Sendungsdetailseite besitzt eine sehr hohe vertikale Statusdarstellung und horizontal verschiebbare Kennzahlen. Letztere sind absichtlich als Scrollbereich implementiert; sie sind **nicht** pauschal als defekt zu bewerten. Die Bedienbarkeit verdient eine echte Geräteprüfung. Die Commerce-Bestellliste bleibt ebenfalls eine horizontal scrollende Tabelle statt einer Mobilkartenansicht.

Beleg: [Sendungsdetail](shipment-detail-360.png). Der statische Seitenscan markiert 69 von 162 Seitendateien als Prüfkandidaten; diese Zahl ist ausdrücklich **keine Fehleranzahl**.

## Durchgeführte Interaktionen

- Mobiles „Mehr“-Menü geöffnet: 53 Navigationslinks sichtbar bei 360 und 390 px; kein Dokumentüberlauf. [Beleg](more-menu-360.png).
- Etsy-Bestellpositionsdialog aus einer gefüllten Bestellung bei allen vier Breiten geöffnet. Produktauswahl und bestehende Zuordnung werden angezeigt; dabei wurde der Clippingfehler festgestellt.
- Vorhandene Native-Suite: acht Einstiegsseiten, Ausstiege, reduzierte Bewegung, Gastnavigation und Touchziele geprüft.
- Keine echten E-Mails, Zahlungen, Bestellungen, Labels oder Retouren erzeugt; keine produktiven Zuordnungen geändert.

## Nicht als abgeschlossen bewertbar

Für die folgenden Bereiche fehlt eine vollständige End-to-End-Abnahme mit einem separaten Testmandanten bzw. geeigneten Testanbieterzugängen:

| Bereich | Noch zu belegen |
|---|---|
| Anmeldung und Benutzerverwaltung | echte DE/EN-Registrierung, Google/Apple, Magic Link, Passwortreset, MFA, Einladungen, Rollen und Mandantentrennung |
| Produkte und DPP | Anlegen/Ändern/Löschen mit Persistenz, Bilder/Dokumente, Varianten/Chargen, alle Sichtbarkeitsstufen und gefüllte optionale Templateabschnitte |
| Lager und Versand | Wareneingang, Bestandsreservierung, Picken, Packen, Label, Storno, Teilversand und Rückwärtswechsel ohne falsche Bestände |
| Commerce | wiederholter echter Etsy-/Shopify-Sync, Matching, Bestand/Fulfillment, konkurrierende Aufrufe, API-Fehler und Wiederanmeldung |
| Retouren/Kundenportal/CRM | echte Kunden-Session, vollständige Registrierung und Retoure, Tickets, Anhänge, Erstattung und Mandantenisolation |
| Billing/AI | Stripe-Sandbox-Checkout, Webhooks, Berechtigungen/Quoten, AI-Creditverbrauch, Abbruch/Fehlerfall, Berichtsexport |
| Feedback/Workflows | gültige Einladungen, Einreichung/Moderation, Benachrichtigungen, Zeittrigger und Wiederaufnahme |
| Admin | echte zulässige/gesperrte Rollen sowie valide API-Daten; breite Mockprüfung allein genügt nicht |
| Native Apps | Kamera/Scanner, Datei-/PDF-Export und Teilen, Tastatur/Safe Areas, Deep Links, Offline/Resume auf echten iOS-/Android-Geräten |
| Barrierefreiheit | kein vollständiger Axe-/Screenreader-/Tastatur- oder WCAG-Nachweis |

Ein separater Testzugang wurde während dieses Audits angefragt, aber nicht bereitgestellt. Deshalb wurden geschützte Oberflächen mit **lokalen, nicht gültigen Testtokens** und abgefangenen Antworten geprüft; diese gelangen nicht zum Produktivbackend.

Bei 36 der 652 allgemeinen Aufrufe wurde eine Weiterleitung gemessen (Kunden-Login bzw. fehlende Workflow-/Kampagnendetails), bei 80 ein Not-found-Zustand. Vier JS-Fehler auf dem gemockten Feedback-Link gingen auf die pauschale leere Mockantwort zurück; der öffentliche Liveaufruf mit ungültigem Token zeigte korrekt „Link nicht gefunden“ ohne JS-Fehler. Diese Mockbefunde werden nicht als Produktionsfehler gezählt. Weitere Admin-Fehlerzustände bleiben mangels valider API-Fixtures unbewertet.

## Abdeckung und nächste Freigabeschritte

Die [Routenmatrix](route-coverage.csv) enthält alle 175 Routeneinträge mit Authentifizierungsart, Codeposition und tatsächlich erreichtem Testzustand. Rohdaten: [allgemeine Browserprüfung](browser-results.json), [gefüllte Kernansichten](populated-results.json), [DPP-Templates](dpp-results.json), [Native-Tests](native-tests.json), [Live-Stichprobe](live-public.json).

1. Bestellpositionsdialog und fehlende Übersetzungen korrigieren; innere Containerbreiten ausdrücklich in Regressionstests prüfen.
2. CI-Warnungen bereinigen und komplette Pipeline grün ausführen.
3. Batch-Upload und nicht ausführbare Workflow-Trigger implementieren oder eindeutig aus dem verfügbaren Produktumfang entfernen.
4. Vollständige zentrale Geschäftsabläufe in einem Testmandanten prüfen.
5. Anschließend reale iPhone-/Android-Abnahme einschließlich Scanner, Dateien, Tastatur und Deep Links durchführen.

**Fazit:** breite Mobilbasis nachgewiesen; vollständige Funktions- und Gerätefreigabe derzeit nicht nachgewiesen und wegen der bestätigten Befunde nicht zu empfehlen.
