<?php
/**
 * API-Endpoint: Sichtbarkeitseinstellungen
 *
 * GET  /api/visibility.php  - Alle Einstellungen abrufen
 * POST /api/visibility.php  - Einstellungen speichern
 */

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

switch ($method) {
    case 'GET':
        handleGet($db);
        break;
    case 'POST':
        handlePost($db);
        break;
    default:
        errorResponse('Methode nicht erlaubt', 405);
}

/**
 * GET: Sichtbarkeitseinstellungen abrufen
 */
function handleGet($db) {
    $stmt = $db->query("SELECT field_key, visibility_level FROM visibility_settings");
    $rows = $stmt->fetchAll();

    $fields = [];
    foreach ($rows as $row) {
        $fields[$row['field_key']] = $row['visibility_level'];
    }

    jsonResponse([
        'version' => 2,
        'fields' => $fields
    ]);
}

/**
 * POST: Sichtbarkeitseinstellungen speichern
 */
function handlePost($db) {
    $data = getJsonInput();

    if (empty($data['fields'])) {
        errorResponse('Keine Felder angegeben');
    }

    $db->beginTransaction();

    try {
        $stmt = $db->prepare("
            INSERT INTO visibility_settings (field_key, visibility_level)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE visibility_level = VALUES(visibility_level)
        ");

        foreach ($data['fields'] as $fieldKey => $level) {
            // Validierung der Sichtbarkeitsstufe
            if (!in_array($level, ['internal', 'customs', 'consumer'])) {
                throw new Exception("Ungültige Sichtbarkeitsstufe für Feld '$fieldKey': $level");
            }
            $stmt->execute([$fieldKey, $level]);
        }

        $db->commit();
        jsonResponse(['success' => true]);

    } catch (Exception $e) {
        $db->rollBack();
        errorResponse('Fehler beim Speichern: ' . $e->getMessage(), 500);
    }
}
