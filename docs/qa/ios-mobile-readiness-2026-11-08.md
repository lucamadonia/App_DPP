# Trackbliss: iOS- und Mobilprüfung vom 8. November 2026

Ziel ist die Optimierung der vorhandenen Capacitor-App für iPhone und iPad. Die App bleibt eine React-/Capacitor-Anwendung. Eine SwiftUI-Neuentwicklung ist nicht Teil dieser Änderung.

## Umgesetzt

- Einheitlicher dunkler iOS-Startbildschirm und animierter Übergang mit demselben, stationären Logo. Kein Warten auf nachladende Schriftarten; reduzierte Bewegung wird berücksichtigt.
- Tastaturhöhe steuert sichtbaren Arbeitsbereich, Dialoghöhe und Formularaktionen. Formularleisten ersetzen auf schmalen Geräten die darunterliegende Tab-Leiste. Safe Areas behalten die passenden Seitenabstände für Telefon und Tablet.
- Größere berührbare Bedienelemente, horizontal erreichbare Tabs und umbrechende Beschriftungen.
- Korrigierte Anordnungen in Produkt-/Chargenformularen, QR-Generator, DPP-Design und Sichtbarkeit, Compliance, Lager/Versand, Verpackungen, Kategorien, Piktogrammen, Einstellungen und Admin-Navigation.
- Der DPP-Sichtbarkeitseditor verwendet auf schmaleren Arbeitsflächen Zusatzbereiche zum Öffnen statt drei gleichzeitig sichtbarer Spalten.
- „Als Entwurf speichern“ speichert über den bestehenden Produktservice und öffnet anschließend das gespeicherte Produkt. Schalterbeschriftungen für DPP-Sichtbarkeit steuern jeweils das richtige Feld.
- Produktdetails zeigen den tatsächlichen Produktstatus. Der zuvor wirkungslose Export speichert Produkt und Chargen als JSON und verwendet auf iOS die vorhandene Teilen-Funktion. Eine fest eingetragene Compliance-Prozentzahl wurde durch den Einstieg in die echte Prüfung ersetzt.
- Der projektspezifische Tiptap-Texteditor wird nach dem Einhängen in React initialisiert und schützt seine Effekte vor bereits verworfenen Instanzen. Das behebt den beobachteten sporadischen Absturz beim Bearbeiten vorhandener Produkte. Shadcn-Grundkomponenten wurden nicht geändert.
- Fehlende CRM-Kunden und Ladefehler erhalten einen abschließenden Zustand mit Rücknavigation bzw. erneutem Laden.
- Die API-Einstellungen zeigen keine erfundenen Zugangsschlüssel oder wirkungslosen Aktionen mehr. Ein eigener API-Zugang ist weiterhin nicht implementiert; vorhandene Shop-Integrationen sind über den Commerce Hub erreichbar.
- Native Bilddateien sind vor Zeilenumwandlungen durch Git geschützt.
- Die Produkt-Unteransichten einschließlich Lieferantendatenanfragen und Etikettenvorschau sind auf schmale Ansichten angepasst. Die Etikettenvorschau verwendet stabile Chargendaten, statt sich durch einen neuen Filter bei jeder Darstellung endlos neu aufzubauen.

## Prüfverfahren und Grenzen

Die neue Seitenliste wird aus dem Router gelesen und umfasst 120 angemeldete App-/Admin-Routen. WebKit prüft 320 × 568 Pixel (iPhone-SE-Profil) und 768 × 1024 Pixel (iPad Mini). Detailseiten verwenden isolierte Beispieldaten oder ihren leeren Zustand. Die Prüfung wartet auf sichtbaren Inhalt und das Ende der Platzhalteranzeige, erkennt Fehlergrenzen und misst Überbreiten. Absichtliches horizontales Scrollen innerhalb von Tabs und Tabellen ist erlaubt.

Zusätzliche Abläufe prüfen Entwurfsspeicherung, Formularschritte, Drehung ohne Eingabeverlust, Tab-Auswahl, Admin-Menü, Dialoge und Tastaturabstände. Öffentliche Seiten und der vorhandene Versandablauf bleiben im Testumfang. Die CI prüft außerdem die vorhandenen Onboarding-/Gastmodusseiten mit ihrem ausschließlich für Tests gesetzten Build-Schalter.

Die Produktprüfung durchläuft alle neun Formularschritte und alle elf vorhandenen Unteransichten eines Einzelprodukts. Der Dateiexport wird auf Dateiname und Inhalt geprüft; bearbeiteter Beschreibungstext muss nach einem Wechsel des Formularschritts erhalten bleiben.

Alle Datenanfragen der neuen angemeldeten Tests werden lokal beantwortet; sonstige externe Anfragen werden blockiert. Die Tests verändern keine Produktivdaten. Die Tastaturprüfung simuliert die CSS-Vereinbarung des nativen Plugins und ersetzt keinen Test auf einem echten Gerät. Die Routenprüfung belegt nicht jede mögliche Datenkombination, jede Unteransicht oder sämtliche Backend-Integrationen.

## Release-Stand

- Änderungsvorschlag: [PR #42](https://github.com/lucamadonia/App_DPP/pull/42).
- Lokaler nativer Build, Release-/Asset-Prüfungen und Übernahme der Web-Dateien ins iOS-Projekt wurden erfolgreich ausgeführt. Das native Paket enthält weder eine Live-Reload-Adresse noch einen Service Worker.
- Zwei Zwischenstände wurden bereits erfolgreich auf macOS signiert und als IPA exportiert: [erster Prüflauf](https://github.com/lucamadonia/App_DPP/actions/runs/42508272320), [zweiter Prüflauf](https://github.com/lucamadonia/App_DPP/actions/runs/42508866918). Beide liefen mit `verify_only=true`; es erfolgte kein TestFlight-Upload.
- Der App-Stand `e0ceb86` wurde im [signierten iOS-Prüflauf](https://github.com/lucamadonia/App_DPP/actions/runs/42522917291) erfolgreich gebaut und exportiert. Der [vollständige CI-Lauf](https://github.com/lucamadonia/App_DPP/actions/runs/42522641381) ist erfolgreich: 413 Unit-Tests, Datenbankregressionen, Lint, Build, native/Release-Prüfungen und 328 WebKit-Tests bestanden, zwei Tests übersprungen.
- Der [erste TestFlight-Upload für 1.2.0 (23)](https://github.com/lucamadonia/App_DPP/actions/runs/42523585130) stoppte vor der Übermittlung bei Apples Zugangsdatenprüfung (`Authentication error`, Code 1235). Der Build und der signierte Export waren erfolgreich. Der Workflow entfernt in `bbec963` kopierte Leerzeichen und Zeilenumbrüche aus den Upload-Zugangsdaten und maskiert das bereinigte Passwort zusätzlich; der App-Code ist unverändert.
- Der [erneute Upload](https://github.com/lucamadonia/App_DPP/actions/runs/42524322337) war erfolgreich: **1.2.0 (24)**, Commit `bbec963`. Apple bestätigte die Paketprüfung um 21:21:55 UTC und `UPLOAD SUCCEEDED with no errors` um 21:23:11 UTC am 8. November 2026. Übermittlungs-ID: `af22c3d4-055a-4c2c-afcb-0d9c279a6cb9`. Das gespeicherte Passwort musste nicht erneut eingegeben werden. Die [erneute CI](https://github.com/lucamadonia/App_DPP/actions/runs/42524315043) war ebenfalls vollständig erfolgreich: erneut 413 Unit-Tests und 328 WebKit-Tests bestanden, zwei übersprungen.
- Der Benutzer hat Build 1.2.0 (24) in TestFlight bestätigt und anschließend Fehler aus der installierten iPhone-App gemeldet: fehlende Markenidentität und seitlich verschiebbare Seiten. Damit ist die Installierbarkeit bestätigt, die Geräteabnahme jedoch nicht bestanden. Der angelegte Gruppenpfad lautet [Trackbliss Internal](https://appstoreconnect.apple.com/teams/15a6913c-fd9c-4b29-907c-0da3d2f1edb8/apps/6832345307/testflight/groups/c8f019b4-1556-49be-84c9-7e9412118a57). Es wurde keine öffentliche App-Store-Veröffentlichung vorgenommen.

## Nachbesserung nach iPhone-Rückmeldung vom 9. November

- Das tatsächliche Xcode-AppIcon enthielt noch das Capacitor-Standardsymbol. Es wurde durch das bestehende Trackbliss-Markenzeichen ersetzt. Icon-Generator und Release-Prüfung berücksichtigen nun die tatsächlich von Xcode verwendeten Bilddateien; die Prüfung vergleicht deren Bildpunkte mit den Markenassets.
- Die mobile Kopfzeile enthält ein sichtbares Logo mit lokalem Trackbliss-Fallback. Der Startbildschirm verwendet ausschließlich das lokale Trackbliss-Logo und den Markennamen; seine Animation startet erst nach der Übergabe vom nativen Startbild und der HTML-Ladefläche. Der neue Ablauf zeigt Lichtkreis, Glanz und Namenseinblendung mit Rücksicht auf reduzierte Bewegung.
- Die Zurück-Geste hatte automatische Drag-Listener auf dem gesamten Seiteninhalt. Die Randprüfung verhinderte nur das Zurücknavigieren, nicht das vorherige Verschieben. Manuelle Drag-Steuerung startet jetzt ausschließlich am linken Rand und außerhalb interaktiver Bedienelemente. Rücknavigation nach einem Direkteinstieg bleibt innerhalb der App.
- Das native App-Dokument wird fixiert; der Arbeitsbereich ist der einzige vertikale Scroller. Horizontales Scrollen bleibt auf dafür vorgesehene Tabellen und Tabs begrenzt.
- Pull-to-refresh prüft den tatsächlichen scrollenden Vorfahren statt des stets bei null stehenden Dokuments. Abgebrochene und seitliche Gesten lösen keine Aktualisierung aus.
- Neue WebKit-Regressionen aktivieren Bewegung ausdrücklich. Frühere reine Layoutprüfungen verwendeten reduzierte Bewegung und konnten den Drag-Fehler dadurch nicht erkennen. Ein zusätzlicher Komponententest prüft die verzögerte Übergabe des Startbilds.
- Die Randgeste hat eine eigene, 24 Pixel breite Berührungsfläche über dem Seitenabstand. Nur dort wird horizontale Touch-Bewegung übernommen. Abgebrochene Gesten navigieren nicht zurück. Der Test wartet auf die tatsächlich dargestellte Bewegung, bevor er den Finger löst.
- Lokale Splash-Tests: sechs bestanden. Gezielte Codeprüfung der geänderten Dateien: erfolgreich. Die vollständige CI für `d21ca1d` bestand 414 Unit-Tests und 338 WebKit-Tests, meldete jedoch zwei Fehler zur Randgeste. Der parallel angelaufene Release 25 wurde vor dem Upload abgebrochen. Nach der Korrektur bestanden lokal alle **14 Gestentests in WebKit** auf beiden Geräteprofilen, einschließlich Rücknavigation, Abbruch, festem Header und stabilen Seiten.
- Die [vollständige CI für `07672bc`](https://github.com/lucamadonia/App_DPP/actions/runs/42536873249) ist erfolgreich: **414 Unit-Tests und 342 WebKit-Tests bestanden**, zwei übersprungen; Build, Lint, Datenbankregressionen und native/Release-Prüfungen ebenfalls erfolgreich.
- Der [iOS-Release](https://github.com/lucamadonia/App_DPP/actions/runs/42536892808) übermittelte **1.2.0 (26)** erfolgreich am 8. November 2026 um 23:56:59 UTC. Apple meldete `UPLOAD SUCCEEDED with no errors`; Übermittlungs-ID `ed1df474-941c-40d9-9f68-ae6e09912e0b`. App Store Connect zeigte danach die laufende Verarbeitung.
- Das tatsächlich signierte IPA wurde zusätzlich geprüft: Bundle-ID `eu.trackbliss.app`, Version 1.2.0, Build 26, neue Randgeste und Markenanimation enthalten, keine externe Live-Reload-Adresse, kein Service Worker. Das kompilierte iPhone-AppIcon wurde aus dem Paket entnommen, aus Apples CgBI-Format dekodiert und visuell als korrektes Trackbliss-Logo bestätigt.
- Apple hat Build 26 vollständig verarbeitet. Er wurde der bestehenden Gruppe **Trackbliss Internal** zugeordnet; die abschließende App-Store-Connect-Ansicht bestätigt **1 Tester, 2 Builds** und **1.2.0 (26): Im Test**. Damit ist das Update für den vorhandenen Tester verfügbar. Die Installation und Geräteabnahme dieses neuen Builds sind noch offen.

## Apple-Einrichtung und TestFlight

In der GitHub-Umgebung `app-store` sind Signierzertifikat, Zertifikatspasswort, Provisioning-Profil und die Supabase-Buildwerte vorhanden. Der vom Nutzer genannte Apple-Account wurde zusätzlich als `APPLE_ID` hinterlegt.

- Das Secret `APPLE_APP_SPECIFIC_PASSWORD` wurde vom Benutzer am 8. November 2026 geschützt hinterlegt; seine Existenz wurde anschließend geprüft, sein Inhalt nicht ausgelesen.
- Die Variable `APPLE_SIGN_IN_CONFIGURED=true` wurde nach dem erfolgreichen interaktiven Apple-Login gesetzt.

Passwörter gehören in die geschützten Einstellungen, nicht in Chat, Repository oder Prüfprotokoll. Der Upload-Workflow prüft diese Voraussetzungen vor der Verteilung. Eine erfolgreich exportierte IPA ist noch keine von Apple verarbeitete TestFlight-Version.

Der ausdrücklich freigegebene App-Eintrag wurde im Team MYFAMBLISS GROUP LTD als „Trackbliss: Product Passport“ erstellt: [Apple-ID 6832345307](https://appstoreconnect.apple.com/apps/6832345307/distribution), iOS, Englisch (USA), Bundle-ID `eu.trackbliss.app`, SKU `trackbliss-ios`. Die Variable `APP_STORE_CONNECT_APP_ID=6832345307` ist in der GitHub-Umgebung `app-store` hinterlegt und verifiziert. Der Name „Trackbliss“ allein war bei Apple bereits vergeben.

Nach ausdrücklicher Benutzerfreigabe wurde Apple im produktiven Backend mit dem bestehenden Trackbliss-Schlüssel `8489VR52C4` und Services-Identifier `eu.trackbliss.app.web` aktiviert. Der private Schlüssel bleibt lokal; nur der daraus erzeugte Client-Secret wurde geschützt an Supabase übertragen. Die Berechtigung wurde für 180 Tage ausgestellt und muss vor dem 7. Mai 2027 erneuert werden. Der öffentliche Auth-Endpunkt bestätigt `apple=true`, `email=true`; der Autorisierungsaufruf liefert HTTP 302 zu Apple mit korrekter Client-ID und dem Supabase-Callback. Der Benutzer bestätigte den erfolgreichen interaktiven Apple-Login. Das Backend protokollierte am 8. November 2026 um 21:00:58 UTC `Login`, Provider `apple`, ohne Fehler; das angemeldete Dashboard wurde anschließend im Browser beobachtet. Google bleibt unkonfiguriert.

Die native App verwendet `https://trackbliss.eu/auth/callback`, `/auth/reset-password` und `/customer/*/auth/callback`. Nach ausdrücklicher Benutzerfreigabe wurden genau diese drei URLs in der Backend-Allowlist ergänzt und zurückgelesen; alle bisherigen Einträge blieben erhalten. Die öffentliche Apple-App-Link-Datei auf `trackbliss.eu` antwortet mit HTTP 200 und enthält die richtige Team-/Bundle-ID sowie die passenden Pfade.

Für die Geräteabnahme sind ein echter iPhone-/iPad-Durchlauf mit Kaltstart, Tastatur, Rotation, Apple-Anmeldung, Rücksprung über App-Links, Kamera/Scanner, Teilen/Dateiexport und Offline-/Wiederaufnahmeverhalten offen. Diese Geräteprüfung wurde hier nicht durchgeführt und kann mit dem internen TestFlight-Build erfolgen. Die Google-Anmeldung benötigt zunächst ihre eigene Backend-Konfiguration.

Die bereits vorhandenen lokalen Änderungen an Abrechnung/Stripe und deren Migration gehören nicht zu PR #42 und wurden nicht verändert oder mitveröffentlicht.
