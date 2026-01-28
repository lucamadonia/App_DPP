# DPP Manager - API Setup für All-Inkl

## 1. Datenbank einrichten

1. Öffnen Sie **phpMyAdmin** in All-Inkl KAS
2. Wählen Sie Ihre Datenbank `d04604fd`
3. Klicken Sie auf **"SQL"** Tab
4. Kopieren Sie den Inhalt von `schema.sql` und führen Sie ihn aus
5. Klicken Sie auf **"OK"** / **"Ausführen"**

## 2. Dateien hochladen

Laden Sie den `api/` Ordner auf Ihren All-Inkl Webspace hoch:

```
/www/htdocs/IHR_ACCOUNT/
└── api/
    ├── config.php      (Zugangsdaten anpassen!)
    ├── products.php
    ├── visibility.php
    └── .htaccess
```

## 3. config.php anpassen

Bearbeiten Sie `config.php` und tragen Sie Ihr **Datenbank-Passwort** ein:

```php
define('DB_PASS', 'IHR_ECHTES_PASSWORT');
```

## 4. CORS für Produktion anpassen

In `config.php`, ersetzen Sie:
```php
header('Access-Control-Allow-Origin: *');
```

Mit Ihrer Domain:
```php
header('Access-Control-Allow-Origin: https://ihre-domain.de');
```

## 5. API testen

Öffnen Sie im Browser:
- `https://ihre-domain.de/api/products.php` → Sollte `[]` oder Produkte zeigen
- `https://ihre-domain.de/api/visibility.php` → Sollte Sichtbarkeitseinstellungen zeigen

## API Endpunkte

| Methode | URL | Beschreibung |
|---------|-----|--------------|
| GET | `/api/products.php` | Alle Produkte |
| GET | `/api/products.php?gtin=X&serial=Y` | Ein Produkt |
| POST | `/api/products.php` | Produkt anlegen |
| PUT | `/api/products.php?id=X` | Produkt bearbeiten |
| DELETE | `/api/products.php?id=X` | Produkt löschen |
| GET | `/api/visibility.php` | Sichtbarkeitseinstellungen |
| POST | `/api/visibility.php` | Sichtbarkeit speichern |
