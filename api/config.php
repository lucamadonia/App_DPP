<?php
/**
 * Datenbank-Konfiguration für All-Inkl
 *
 * Diese Werte finden Sie in Ihrem All-Inkl KAS unter:
 * Datenbanken → [Ihre Datenbank] → Übersicht
 */

// Datenbank-Zugangsdaten für All-Inkl
define('DB_HOST', 'localhost');
define('DB_NAME', 'd04604fd');
define('DB_USER', 'd04604fd');
define('DB_PASS', 'd04604fd');  // PASSWORT HIER EINTRAGEN!
define('DB_CHARSET', 'utf8mb4');

// CORS-Einstellungen (für Entwicklung - in Produktion einschränken!)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=UTF-8');

// OPTIONS-Requests direkt beantworten (für CORS Preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Datenbank-Verbindung herstellen
function getDB() {
    static $pdo = null;

    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Datenbankverbindung fehlgeschlagen: ' . $e->getMessage()]);
            exit();
        }
    }

    return $pdo;
}

// Hilfsfunktion für JSON-Response
function jsonResponse($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

// Hilfsfunktion für Fehler-Response
function errorResponse($message, $code = 400) {
    jsonResponse(['error' => $message], $code);
}

// JSON-Input lesen
function getJsonInput() {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        return [];
    }
    return $data;
}
