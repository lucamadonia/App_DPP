-- =====================================================
-- DPP Manager - Datenbankschema für MySQL/phpMyAdmin
-- =====================================================
-- Dieses SQL-Script in phpMyAdmin importieren (Tab "SQL")
-- =====================================================

-- Tabelle: Produkte
CREATE TABLE IF NOT EXISTS `products` (
    `id` VARCHAR(50) PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `manufacturer` VARCHAR(255) NOT NULL,
    `gtin` VARCHAR(14) NOT NULL,
    `serial_number` VARCHAR(100) NOT NULL,
    `production_date` DATE NOT NULL,
    `expiration_date` DATE NULL,
    `category` VARCHAR(100) NOT NULL,
    `description` TEXT,
    `image_url` VARCHAR(500),

    -- Zollrelevante Felder
    `hs_code` VARCHAR(20),
    `batch_number` VARCHAR(100),
    `country_of_origin` VARCHAR(100),
    `net_weight` INT,
    `gross_weight` INT,

    -- Herstellerdetails
    `manufacturer_address` TEXT,
    `manufacturer_eori` VARCHAR(50),
    `manufacturer_vat` VARCHAR(50),

    -- Metadaten
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Index für schnelle Suche
    INDEX `idx_gtin` (`gtin`),
    INDEX `idx_serial` (`serial_number`),
    UNIQUE KEY `unique_gtin_serial` (`gtin`, `serial_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabelle: Materialien (1:n Beziehung zu Produkte)
CREATE TABLE IF NOT EXISTS `product_materials` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `product_id` VARCHAR(50) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `percentage` DECIMAL(5,2) NOT NULL,
    `recyclable` BOOLEAN DEFAULT FALSE,
    `origin` VARCHAR(100),

    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
    INDEX `idx_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabelle: Zertifizierungen (1:n Beziehung zu Produkte)
CREATE TABLE IF NOT EXISTS `product_certifications` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `product_id` VARCHAR(50) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `issued_by` VARCHAR(255) NOT NULL,
    `valid_until` DATE NOT NULL,
    `certificate_url` VARCHAR(500),

    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
    INDEX `idx_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabelle: CO2-Fußabdruck (1:1 Beziehung zu Produkte)
CREATE TABLE IF NOT EXISTS `product_carbon_footprint` (
    `product_id` VARCHAR(50) PRIMARY KEY,
    `total_kg_co2` DECIMAL(10,2) NOT NULL,
    `production_kg_co2` DECIMAL(10,2) NOT NULL,
    `transport_kg_co2` DECIMAL(10,2) NOT NULL,
    `rating` ENUM('A', 'B', 'C', 'D', 'E') NOT NULL,

    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabelle: Recycling-Info (1:1 Beziehung zu Produkte)
CREATE TABLE IF NOT EXISTS `product_recyclability` (
    `product_id` VARCHAR(50) PRIMARY KEY,
    `recyclable_percentage` INT NOT NULL,
    `instructions` TEXT,

    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabelle: Entsorgungsmethoden (1:n Beziehung zu Recycling)
CREATE TABLE IF NOT EXISTS `product_disposal_methods` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `product_id` VARCHAR(50) NOT NULL,
    `method` VARCHAR(255) NOT NULL,

    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
    INDEX `idx_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabelle: Lieferkette (1:n Beziehung zu Produkte)
CREATE TABLE IF NOT EXISTS `product_supply_chain` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `product_id` VARCHAR(50) NOT NULL,
    `step` INT NOT NULL,
    `location` VARCHAR(255) NOT NULL,
    `country` VARCHAR(100) NOT NULL,
    `date` DATE NOT NULL,
    `description` TEXT,

    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
    INDEX `idx_product` (`product_id`),
    INDEX `idx_step` (`product_id`, `step`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabelle: Sichtbarkeitseinstellungen
CREATE TABLE IF NOT EXISTS `visibility_settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `field_key` VARCHAR(100) NOT NULL UNIQUE,
    `visibility_level` ENUM('internal', 'customs', 'consumer') NOT NULL DEFAULT 'internal',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX `idx_field` (`field_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabelle: QR-Code Einstellungen
CREATE TABLE IF NOT EXISTS `qr_settings` (
    `id` INT PRIMARY KEY DEFAULT 1,
    `size` INT DEFAULT 256,
    `error_correction` ENUM('L', 'M', 'Q', 'H') DEFAULT 'M',
    `foreground_color` VARCHAR(7) DEFAULT '#000000',
    `background_color` VARCHAR(7) DEFAULT '#FFFFFF',
    `margin` INT DEFAULT 2,
    `include_text` BOOLEAN DEFAULT FALSE,
    `resolver` ENUM('gs1', 'local', 'custom') DEFAULT 'local',
    `custom_domain` VARCHAR(255),
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Standardwerte einfügen
-- =====================================================

-- Standard-Sichtbarkeitseinstellungen
INSERT INTO `visibility_settings` (`field_key`, `visibility_level`) VALUES
    -- Grunddaten (öffentlich)
    ('name', 'consumer'),
    ('image', 'consumer'),
    ('description', 'consumer'),
    ('manufacturer', 'consumer'),
    ('category', 'consumer'),
    -- Materialien (öffentlich)
    ('materials', 'consumer'),
    ('materialOrigins', 'consumer'),
    -- Nachhaltigkeit (öffentlich)
    ('carbonFootprint', 'consumer'),
    ('carbonRating', 'consumer'),
    -- Recycling (öffentlich)
    ('recyclability', 'consumer'),
    ('recyclingInstructions', 'consumer'),
    ('disposalMethods', 'consumer'),
    -- Zertifizierungen (öffentlich)
    ('certifications', 'consumer'),
    -- Lieferkette
    ('supplyChainSimple', 'consumer'),
    ('supplyChainFull', 'customs'),
    -- Identifikatoren (nur Zoll)
    ('gtin', 'customs'),
    ('serialNumber', 'customs'),
    ('batchNumber', 'customs'),
    -- Zolldaten (nur Zoll)
    ('hsCode', 'customs'),
    ('countryOfOrigin', 'customs'),
    ('netWeight', 'customs'),
    ('grossWeight', 'customs'),
    ('manufacturerAddress', 'customs'),
    ('manufacturerEORI', 'customs'),
    ('manufacturerVAT', 'customs'),
    ('certificateDownloads', 'customs')
ON DUPLICATE KEY UPDATE `field_key` = `field_key`;

-- Standard QR-Einstellungen
INSERT INTO `qr_settings` (`id`) VALUES (1)
ON DUPLICATE KEY UPDATE `id` = 1;

-- =====================================================
-- Demo-Produkt einfügen (optional)
-- =====================================================

INSERT INTO `products` (
    `id`, `name`, `manufacturer`, `gtin`, `serial_number`, `production_date`,
    `category`, `description`, `image_url`, `hs_code`, `batch_number`,
    `country_of_origin`, `net_weight`, `gross_weight`, `manufacturer_address`,
    `manufacturer_eori`, `manufacturer_vat`
) VALUES (
    '1',
    'Eco Sneaker Pro',
    'GreenStep Footwear GmbH',
    '4012345678901',
    'GSP-2024-001234',
    '2024-01-15',
    'Textilien',
    'Nachhaltig produzierter Sneaker aus recycelten Materialien. Der Eco Sneaker Pro vereint Style mit Umweltbewusstsein.',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600',
    '6404.11.00',
    'B2024-001',
    'Portugal',
    340,
    520,
    'Industriestraße 42, 80339 München, Deutschland',
    'DE123456789012345',
    'DE123456789'
) ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Materialien für Demo-Produkt
INSERT INTO `product_materials` (`product_id`, `name`, `percentage`, `recyclable`, `origin`) VALUES
    ('1', 'Recyceltes Polyester', 45.00, TRUE, 'Deutschland'),
    ('1', 'Bio-Baumwolle', 30.00, TRUE, 'Türkei'),
    ('1', 'Recycelter Gummi', 20.00, TRUE, 'Portugal'),
    ('1', 'Naturkautschuk', 5.00, TRUE, 'Vietnam')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Zertifizierungen für Demo-Produkt
INSERT INTO `product_certifications` (`product_id`, `name`, `issued_by`, `valid_until`, `certificate_url`) VALUES
    ('1', 'OEKO-TEX Standard 100', 'OEKO-TEX Association', '2025-12-31', '/certificates/oeko-tex.pdf'),
    ('1', 'EU Ecolabel', 'European Commission', '2025-06-30', '/certificates/eu-ecolabel.pdf'),
    ('1', 'Fair Trade Certified', 'Fairtrade International', '2025-09-15', '/certificates/fairtrade.pdf')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- CO2-Fußabdruck für Demo-Produkt
INSERT INTO `product_carbon_footprint` (`product_id`, `total_kg_co2`, `production_kg_co2`, `transport_kg_co2`, `rating`)
VALUES ('1', 8.50, 5.20, 3.30, 'B')
ON DUPLICATE KEY UPDATE `total_kg_co2` = VALUES(`total_kg_co2`);

-- Recycling-Info für Demo-Produkt
INSERT INTO `product_recyclability` (`product_id`, `recyclable_percentage`, `instructions`)
VALUES ('1', 85, 'Trennen Sie Sohle und Obermaterial für optimales Recycling. Die Sohle kann im Gummirecycling entsorgt werden, das Obermaterial im Textilrecycling.')
ON DUPLICATE KEY UPDATE `recyclable_percentage` = VALUES(`recyclable_percentage`);

-- Entsorgungsmethoden für Demo-Produkt
INSERT INTO `product_disposal_methods` (`product_id`, `method`) VALUES
    ('1', 'Textilrecycling'),
    ('1', 'Schuh-Rücknahmeprogramm'),
    ('1', 'Gummirecycling')
ON DUPLICATE KEY UPDATE `method` = VALUES(`method`);

-- Lieferkette für Demo-Produkt
INSERT INTO `product_supply_chain` (`product_id`, `step`, `location`, `country`, `date`, `description`) VALUES
    ('1', 1, 'Hamburg', 'Deutschland', '2024-01-10', 'Materialanlieferung'),
    ('1', 2, 'Porto', 'Portugal', '2024-01-12', 'Fertigung'),
    ('1', 3, 'München', 'Deutschland', '2024-01-15', 'Qualitätskontrolle'),
    ('1', 4, 'Berlin', 'Deutschland', '2024-01-18', 'Distribution')
ON DUPLICATE KEY UPDATE `step` = VALUES(`step`);
