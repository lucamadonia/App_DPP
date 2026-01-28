<?php
/**
 * API-Endpoint: Produkte
 *
 * GET    /api/products.php              - Alle Produkte abrufen
 * GET    /api/products.php?gtin=X&serial=Y - Ein Produkt abrufen
 * POST   /api/products.php              - Neues Produkt anlegen
 * PUT    /api/products.php?id=X         - Produkt aktualisieren
 * DELETE /api/products.php?id=X         - Produkt löschen
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
    case 'PUT':
        handlePut($db);
        break;
    case 'DELETE':
        handleDelete($db);
        break;
    default:
        errorResponse('Methode nicht erlaubt', 405);
}

/**
 * GET: Produkte abrufen
 */
function handleGet($db) {
    // Einzelnes Produkt per GTIN + Serial
    if (isset($_GET['gtin']) && isset($_GET['serial'])) {
        $gtin = $_GET['gtin'];
        $serial = $_GET['serial'];

        $product = getProductByGtinSerial($db, $gtin, $serial);

        if ($product) {
            jsonResponse($product);
        } else {
            errorResponse('Produkt nicht gefunden', 404);
        }
    }

    // Einzelnes Produkt per ID
    if (isset($_GET['id'])) {
        $product = getProductById($db, $_GET['id']);

        if ($product) {
            jsonResponse($product);
        } else {
            errorResponse('Produkt nicht gefunden', 404);
        }
    }

    // Alle Produkte (mit optionaler Suche)
    $search = $_GET['search'] ?? '';
    $products = getAllProducts($db, $search);
    jsonResponse($products);
}

/**
 * Produkt mit allen Beziehungen laden
 */
function getProductByGtinSerial($db, $gtin, $serial) {
    $stmt = $db->prepare("SELECT * FROM products WHERE gtin = ? AND serial_number = ?");
    $stmt->execute([$gtin, $serial]);
    $product = $stmt->fetch();

    if (!$product) return null;

    return enrichProduct($db, $product);
}

function getProductById($db, $id) {
    $stmt = $db->prepare("SELECT * FROM products WHERE id = ?");
    $stmt->execute([$id]);
    $product = $stmt->fetch();

    if (!$product) return null;

    return enrichProduct($db, $product);
}

/**
 * Produkt mit zugehörigen Daten anreichern
 */
function enrichProduct($db, $product) {
    $id = $product['id'];

    // Materialien laden
    $stmt = $db->prepare("SELECT name, percentage, recyclable, origin FROM product_materials WHERE product_id = ?");
    $stmt->execute([$id]);
    $product['materials'] = $stmt->fetchAll();

    // Zertifizierungen laden
    $stmt = $db->prepare("SELECT name, issued_by, valid_until, certificate_url FROM product_certifications WHERE product_id = ?");
    $stmt->execute([$id]);
    $product['certifications'] = array_map(function($cert) {
        return [
            'name' => $cert['name'],
            'issuedBy' => $cert['issued_by'],
            'validUntil' => $cert['valid_until'],
            'certificateUrl' => $cert['certificate_url']
        ];
    }, $stmt->fetchAll());

    // CO2-Fußabdruck laden
    $stmt = $db->prepare("SELECT * FROM product_carbon_footprint WHERE product_id = ?");
    $stmt->execute([$id]);
    $carbon = $stmt->fetch();
    if ($carbon) {
        $product['carbonFootprint'] = [
            'totalKgCO2' => (float)$carbon['total_kg_co2'],
            'productionKgCO2' => (float)$carbon['production_kg_co2'],
            'transportKgCO2' => (float)$carbon['transport_kg_co2'],
            'rating' => $carbon['rating']
        ];
    }

    // Recycling-Info laden
    $stmt = $db->prepare("SELECT * FROM product_recyclability WHERE product_id = ?");
    $stmt->execute([$id]);
    $recycling = $stmt->fetch();

    $stmt = $db->prepare("SELECT method FROM product_disposal_methods WHERE product_id = ?");
    $stmt->execute([$id]);
    $methods = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if ($recycling) {
        $product['recyclability'] = [
            'recyclablePercentage' => (int)$recycling['recyclable_percentage'],
            'instructions' => $recycling['instructions'],
            'disposalMethods' => $methods
        ];
    }

    // Lieferkette laden
    $stmt = $db->prepare("SELECT step, location, country, date, description FROM product_supply_chain WHERE product_id = ? ORDER BY step");
    $stmt->execute([$id]);
    $product['supplyChain'] = $stmt->fetchAll();

    // Feldnamen für Frontend anpassen (snake_case -> camelCase)
    return [
        'id' => $product['id'],
        'name' => $product['name'],
        'manufacturer' => $product['manufacturer'],
        'gtin' => $product['gtin'],
        'serialNumber' => $product['serial_number'],
        'productionDate' => $product['production_date'],
        'expirationDate' => $product['expiration_date'],
        'category' => $product['category'],
        'description' => $product['description'],
        'imageUrl' => $product['image_url'],
        'hsCode' => $product['hs_code'],
        'batchNumber' => $product['batch_number'],
        'countryOfOrigin' => $product['country_of_origin'],
        'netWeight' => $product['net_weight'] ? (int)$product['net_weight'] : null,
        'grossWeight' => $product['gross_weight'] ? (int)$product['gross_weight'] : null,
        'manufacturerAddress' => $product['manufacturer_address'],
        'manufacturerEORI' => $product['manufacturer_eori'],
        'manufacturerVAT' => $product['manufacturer_vat'],
        'materials' => $product['materials'],
        'certifications' => $product['certifications'],
        'carbonFootprint' => $product['carbonFootprint'] ?? null,
        'recyclability' => $product['recyclability'] ?? null,
        'supplyChain' => $product['supplyChain']
    ];
}

/**
 * Alle Produkte abrufen (Übersicht ohne Details)
 */
function getAllProducts($db, $search = '') {
    $sql = "SELECT id, name, manufacturer, gtin, serial_number, category, image_url, batch_number
            FROM products";
    $params = [];

    if ($search) {
        $sql .= " WHERE name LIKE ? OR gtin LIKE ? OR serial_number LIKE ?";
        $searchTerm = "%$search%";
        $params = [$searchTerm, $searchTerm, $searchTerm];
    }

    $sql .= " ORDER BY created_at DESC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    return array_map(function($row) {
        return [
            'id' => $row['id'],
            'name' => $row['name'],
            'manufacturer' => $row['manufacturer'],
            'gtin' => $row['gtin'],
            'serial' => $row['serial_number'],
            'category' => $row['category'],
            'imageUrl' => $row['image_url'],
            'batch' => $row['batch_number']
        ];
    }, $stmt->fetchAll());
}

/**
 * POST: Neues Produkt anlegen
 */
function handlePost($db) {
    $data = getJsonInput();

    if (empty($data['name']) || empty($data['gtin']) || empty($data['serialNumber'])) {
        errorResponse('Name, GTIN und Seriennummer sind erforderlich');
    }

    $db->beginTransaction();

    try {
        // Produkt-ID generieren
        $id = $data['id'] ?? uniqid('prod_');

        // Hauptprodukt einfügen
        $stmt = $db->prepare("
            INSERT INTO products (
                id, name, manufacturer, gtin, serial_number, production_date,
                expiration_date, category, description, image_url, hs_code,
                batch_number, country_of_origin, net_weight, gross_weight,
                manufacturer_address, manufacturer_eori, manufacturer_vat
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $id,
            $data['name'],
            $data['manufacturer'] ?? '',
            $data['gtin'],
            $data['serialNumber'],
            $data['productionDate'] ?? date('Y-m-d'),
            $data['expirationDate'] ?? null,
            $data['category'] ?? '',
            $data['description'] ?? '',
            $data['imageUrl'] ?? null,
            $data['hsCode'] ?? null,
            $data['batchNumber'] ?? null,
            $data['countryOfOrigin'] ?? null,
            $data['netWeight'] ?? null,
            $data['grossWeight'] ?? null,
            $data['manufacturerAddress'] ?? null,
            $data['manufacturerEORI'] ?? null,
            $data['manufacturerVAT'] ?? null
        ]);

        // Materialien einfügen
        if (!empty($data['materials'])) {
            $stmt = $db->prepare("INSERT INTO product_materials (product_id, name, percentage, recyclable, origin) VALUES (?, ?, ?, ?, ?)");
            foreach ($data['materials'] as $material) {
                $stmt->execute([
                    $id,
                    $material['name'],
                    $material['percentage'],
                    $material['recyclable'] ?? false,
                    $material['origin'] ?? null
                ]);
            }
        }

        // Zertifizierungen einfügen
        if (!empty($data['certifications'])) {
            $stmt = $db->prepare("INSERT INTO product_certifications (product_id, name, issued_by, valid_until, certificate_url) VALUES (?, ?, ?, ?, ?)");
            foreach ($data['certifications'] as $cert) {
                $stmt->execute([
                    $id,
                    $cert['name'],
                    $cert['issuedBy'],
                    $cert['validUntil'],
                    $cert['certificateUrl'] ?? null
                ]);
            }
        }

        // CO2-Fußabdruck einfügen
        if (!empty($data['carbonFootprint'])) {
            $cf = $data['carbonFootprint'];
            $stmt = $db->prepare("INSERT INTO product_carbon_footprint (product_id, total_kg_co2, production_kg_co2, transport_kg_co2, rating) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$id, $cf['totalKgCO2'], $cf['productionKgCO2'], $cf['transportKgCO2'], $cf['rating']]);
        }

        // Recycling-Info einfügen
        if (!empty($data['recyclability'])) {
            $rec = $data['recyclability'];
            $stmt = $db->prepare("INSERT INTO product_recyclability (product_id, recyclable_percentage, instructions) VALUES (?, ?, ?)");
            $stmt->execute([$id, $rec['recyclablePercentage'], $rec['instructions']]);

            if (!empty($rec['disposalMethods'])) {
                $stmt = $db->prepare("INSERT INTO product_disposal_methods (product_id, method) VALUES (?, ?)");
                foreach ($rec['disposalMethods'] as $method) {
                    $stmt->execute([$id, $method]);
                }
            }
        }

        // Lieferkette einfügen
        if (!empty($data['supplyChain'])) {
            $stmt = $db->prepare("INSERT INTO product_supply_chain (product_id, step, location, country, date, description) VALUES (?, ?, ?, ?, ?, ?)");
            foreach ($data['supplyChain'] as $entry) {
                $stmt->execute([
                    $id,
                    $entry['step'],
                    $entry['location'],
                    $entry['country'],
                    $entry['date'],
                    $entry['description'] ?? ''
                ]);
            }
        }

        $db->commit();
        jsonResponse(['success' => true, 'id' => $id], 201);

    } catch (Exception $e) {
        $db->rollBack();
        errorResponse('Fehler beim Speichern: ' . $e->getMessage(), 500);
    }
}

/**
 * PUT: Produkt aktualisieren
 */
function handlePut($db) {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        errorResponse('Produkt-ID erforderlich');
    }

    $data = getJsonInput();
    $db->beginTransaction();

    try {
        // Hauptprodukt aktualisieren
        $stmt = $db->prepare("
            UPDATE products SET
                name = ?, manufacturer = ?, gtin = ?, serial_number = ?,
                production_date = ?, expiration_date = ?, category = ?,
                description = ?, image_url = ?, hs_code = ?, batch_number = ?,
                country_of_origin = ?, net_weight = ?, gross_weight = ?,
                manufacturer_address = ?, manufacturer_eori = ?, manufacturer_vat = ?
            WHERE id = ?
        ");

        $stmt->execute([
            $data['name'],
            $data['manufacturer'] ?? '',
            $data['gtin'],
            $data['serialNumber'],
            $data['productionDate'],
            $data['expirationDate'] ?? null,
            $data['category'] ?? '',
            $data['description'] ?? '',
            $data['imageUrl'] ?? null,
            $data['hsCode'] ?? null,
            $data['batchNumber'] ?? null,
            $data['countryOfOrigin'] ?? null,
            $data['netWeight'] ?? null,
            $data['grossWeight'] ?? null,
            $data['manufacturerAddress'] ?? null,
            $data['manufacturerEORI'] ?? null,
            $data['manufacturerVAT'] ?? null,
            $id
        ]);

        // Alte Beziehungen löschen und neu einfügen
        $db->prepare("DELETE FROM product_materials WHERE product_id = ?")->execute([$id]);
        $db->prepare("DELETE FROM product_certifications WHERE product_id = ?")->execute([$id]);
        $db->prepare("DELETE FROM product_carbon_footprint WHERE product_id = ?")->execute([$id]);
        $db->prepare("DELETE FROM product_recyclability WHERE product_id = ?")->execute([$id]);
        $db->prepare("DELETE FROM product_disposal_methods WHERE product_id = ?")->execute([$id]);
        $db->prepare("DELETE FROM product_supply_chain WHERE product_id = ?")->execute([$id]);

        // Neue Beziehungen einfügen (gleiche Logik wie POST)
        // ... (Code wie in handlePost)

        $db->commit();
        jsonResponse(['success' => true]);

    } catch (Exception $e) {
        $db->rollBack();
        errorResponse('Fehler beim Aktualisieren: ' . $e->getMessage(), 500);
    }
}

/**
 * DELETE: Produkt löschen
 */
function handleDelete($db) {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        errorResponse('Produkt-ID erforderlich');
    }

    $stmt = $db->prepare("DELETE FROM products WHERE id = ?");
    $stmt->execute([$id]);

    if ($stmt->rowCount() > 0) {
        jsonResponse(['success' => true]);
    } else {
        errorResponse('Produkt nicht gefunden', 404);
    }
}
