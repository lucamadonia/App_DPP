# Nachbesserungen zur Trackbliss-Prüfung

## Umgesetzt

- Mobile Bestellkarten, breiter/adaptiver Positionsdialog, umbrechende Produktnamen, beschriftete Produktauswahl und größere Touchflächen.
- Deutsche Produktüberschriften und Formularschritte; neue Texte auf Deutsch und Englisch.
- `/dpp/batch-upload` öffnet einen echten CSV-/JSON-Produktimport mit Vorlage, Spaltenzuordnung, Prüfung, Fortschritt und Ergebnis.
- Importprüfung blockiert vorhandene/innerhalb der Datei doppelte GTINs, ungültige Gewichte, fehlende Pflichtfelder und beschädigte JSON-Strukturen. Strukturierte JSON-Felder und führende Nullen bleiben erhalten. Fehlgeschlagene Dublettenabfragen erlauben keinen Import. Maximal 10 MB/1.000 Zeilen; Tarifprüfung bleibt aktiv.
- Unterbrochene Übertragungen werden nicht automatisch wiederholt. Bei unklarer Zustellung muss vor einem erneuten Import die Produktliste geprüft werden.
- Workflow-Bedingungszweige überspringen ihre erste Aktion nicht mehr. Zyklen werden abgewiesen. Fehlgeschlagene Regeländerungen werden angezeigt.
- Dauerhafte serverseitige Workflow-Ausführung mit Datenbank-Ereignissen, täglichen/wöchentlichen/monatlichen Zeitplänen, überfälligen Retouren/Tickets, manuellen Starts, gespeicherten Verzögerungen und Ausführungsverlauf. Interne Aktionen und Fortschritt werden atomar gespeichert.
- Webhook-Aufträge werden exklusiv übernommen. Eine unklare Zustellung wird zur Prüfung als fehlgeschlagen markiert, statt möglicherweise doppelt gesendet zu werden.
- CI-Warnungsgrenze unverändert bei 386; konkrete Typkorrekturen senken die Zahl darunter. PostgreSQL-Regressionstests laufen künftig zusätzlich in CI.
- Aktualisierte Produktionsabhängigkeiten, insbesondere Router, PDF.js, Tiptap, DOMPurify und Supabase. Temporäre QA-Dateien lösen keine Entwicklungsserver-Neuladungen mehr aus.

## Nachweise nach den Änderungen

| Prüfung | Ergebnis |
|---|---|
| Unit-Tests | 326 Tests in 22 Dateien bestanden |
| ESLint | 0 Fehler, 385 Warnungen; Grenze 386 eingehalten |
| PostgreSQL | Etsy-Reparatur, Mandantentrennung, Workflow-Verzweigung, Verzögerung, Zeitplan-Deduplizierung, Überfälligkeit, Webhook-Übernahme/Bestätigung, Aktionsketten, verbotene Identitätsänderungen und Abbruch wartender Regeln geprüft |
| Gefüllte Kernansichten | 52 Aufrufe bei 360/390/768/1440 px; keine JS-Fehler oder Dokumentüberläufe |
| Bestellpositionsdialog | Alle vier Breiten ohne internes Abschneiden geprüft |
| Import-Browserablauf | Datei → Zuordnung → Prüfung → erfolgreicher Import bei allen vier Breiten; isolierte Backend-Fixtures |
| PDF.js 6 | Einseitiges Test-PDF im Browser: Text extrahiert und PNG-Vorschaubild gerendert |
| Native-Onboarding/Gastmodus | 28 WebKit-Tests bestanden, keine übersprungenen Tests |
| Öffentliche Mobilseiten | 34 WebKit-Tests auf iPhone-SE-/iPad-Mini-Profilen bestanden |
| Workflow-Browserablauf | Manueller Start und sichtbarer Verlauf bei 360/390/768/1440 px; isolierte Backend-Fixtures |
| Native-/Release-Invarianten | bestanden |
| Produktionsabhängigkeiten | `npm audit --omit=dev`: 0 Funde nach den Updates |

Die Prüfungen mit synthetischer Anmeldung belegen Layout und lokale Abläufe, keine echte Anmeldung oder echte Anbietertransaktionen. Der historische 652-Routen-Durchlauf und die ursprünglichen Befunde bleiben in [README.md](README.md) dokumentiert.

## Betrieb der Workflows

Die neue Ausführung ist pro Regel über **Serverseitige Ausführung** einschaltbar. Bestehende Regeln bleiben beim bisherigen Verhalten, bis ihre Aktionen geprüft und sie ausdrücklich umgestellt werden. Beim Deployment wurden keine Regeln aktiviert und keine Testnachrichten an Kunden versandt. Die drei zuvor aktiven Regeln bleiben unverändert.

- Zeitpläne verwenden eine explizite IANA-Zeitzone, standardmäßig `Europe/Berlin`. Monatspläne für den 29.–31. laufen in kürzeren Monaten am letzten Tag. Innerhalb des aktuellen Tages wird ein verpasster Slot einmal nachgeholt; frühere Tage werden nicht nachträglich abgespielt.
- „Retoure überfällig“ meint das eingestellte Bearbeitungsalter ab Erstellung, standardmäßig sieben Tage; abgeschlossene Retouren sind ausgenommen. Es ist keine gesetzliche Widerrufsfrist.
- „Ticket überfällig“ richtet sich nach `sla_resolution_at` und wird pro überschrittener Frist einmal eingeplant.
- Zeitpläne ohne verknüpften Datensatz benötigen passende Aktionen, etwa eine interne Nachricht oder eine E-Mail mit explizitem Empfänger. Datensatzaktionen benötigen einen entsprechenden Ereignis- oder manuellen Kontext; fehlender Kontext wird als Fehler protokolliert.
- Das Abschalten einer Regel bricht wartende Läufe ab. Bereits an einen externen Anbieter übergebene Aufrufe lassen sich dadurch nicht zurückholen.
- Server-Webhooks benötigen vom Betreiber freigegebene Zielhosts in `WORKFLOW_WEBHOOK_HOSTS` (kommagetrennt, exakte Hostnamen). HTTPS, keine Weiterleitungen; kein automatischer Retry nach unklarer Zustellung. Keine Zielhosts wurden für diesen Test freigegeben.
- Änderungen an beliebigen Identitäts-/Finanzfeldern sind nicht erlaubt. `update_field` unterstützt interne Notizen, Begründung, Priorität, Trackingnummer und Versandmethode.

Backend bereits ausgerollt: `20260921_durable_workflows.sql`, `20260921z_durable_workflow_cron.sql`, `workflow-webhooks`. Beide neuen Cron-Jobs sind aktiv und ihre ersten Läufe erfolgreich. Run-Tabelle mit RLS, interner Worker und Webhook-Outbox nicht für normale Nutzer freigegeben. Etsy-Synchronisierung und OAuth-Funktion ebenfalls aktualisiert; OAuth-Callback ohne Plattform-JWT, Start/Test mit funktionsinterner Authentifizierung. Die Einstellungen sind in `supabase/config.toml` festgehalten.

## Abnahmegrenzen

Keine pauschale Freigabe „alle Funktionen auf allen Geräten“: Echte iOS-/Android-Geräte, Zahlungen, Anbieter-OAuth, Versandlabel und Rollenprüfungen mit echten Testkonten benötigen weiterhin eigene Abnahmeläufe. Weitere Versanddienstleister werden nicht durch das Ändern eines Capability-Flags zu fertigen Integrationen.

Nach kompatiblen Sicherheitsupdates verbleiben im gesamten Entwicklungswerkzeugbaum 12 Audit-Funde (5 moderat, 6 hoch, 1 kritisch), vorwiegend in alten Unterabhängigkeiten von Capacitor-Assets und Vercel-Werkzeugen. Produktionsabhängigkeiten sind ohne Funde. Eine erzwungene Hauptversionsänderung oder ein Downgrade nur zur Unterdrückung dieser Meldungen wurde nicht vorgenommen; dieser Werkzeugstand ist deshalb keine uneingeschränkte Sicherheitsfreigabe der Build-Umgebung.

Frontend-Auslieferung und CI sind zusätzlich am Release-Commit zu verifizieren; ein lokaler Build allein ist kein Deploymentnachweis.
