SET @sick_parent_id := (SELECT id FROM categories WHERE slug = 'sick' LIMIT 1);

INSERT INTO categories (name, slug, description, parent_id, sort_order, is_active, created_at, updated_at)
SELECT 'SICK Photoelectric Sensors', 'sick-photoelectric-sensors', 'SICK photoelectric sensors, retro-reflective sensors, diffuse sensors, and through-beam sensors.', @sick_parent_id, 1, 1, NOW(3), NOW(3)
WHERE @sick_parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'sick-photoelectric-sensors');

INSERT INTO categories (name, slug, description, parent_id, sort_order, is_active, created_at, updated_at)
SELECT 'SICK Inductive Proximity Sensors', 'sick-inductive-proximity-sensors', 'SICK inductive proximity sensors for metal object detection in industrial automation.', @sick_parent_id, 2, 1, NOW(3), NOW(3)
WHERE @sick_parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'sick-inductive-proximity-sensors');

INSERT INTO categories (name, slug, description, parent_id, sort_order, is_active, created_at, updated_at)
SELECT 'SICK Safety Light Curtains', 'sick-safety-light-curtains', 'SICK safety light curtains and electro-sensitive protective equipment.', @sick_parent_id, 3, 1, NOW(3), NOW(3)
WHERE @sick_parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'sick-safety-light-curtains');

INSERT INTO categories (name, slug, description, parent_id, sort_order, is_active, created_at, updated_at)
SELECT 'SICK Encoders', 'sick-encoders', 'SICK incremental and absolute encoders for motion, speed, and position feedback.', @sick_parent_id, 4, 1, NOW(3), NOW(3)
WHERE @sick_parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'sick-encoders');

INSERT INTO categories (name, slug, description, parent_id, sort_order, is_active, created_at, updated_at)
SELECT 'SICK LiDAR Sensors', 'sick-lidar-sensors', 'SICK 2D LiDAR, safety laser scanners, and ranging sensors for industrial detection.', @sick_parent_id, 5, 1, NOW(3), NOW(3)
WHERE @sick_parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'sick-lidar-sensors');

INSERT INTO categories (name, slug, description, parent_id, sort_order, is_active, created_at, updated_at)
SELECT 'SICK Barcode Scanners', 'sick-barcode-scanners', 'SICK fixed-mount barcode scanners and code readers for logistics and production.', @sick_parent_id, 6, 1, NOW(3), NOW(3)
WHERE @sick_parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'sick-barcode-scanners');

INSERT INTO categories (name, slug, description, parent_id, sort_order, is_active, created_at, updated_at)
SELECT 'SICK RFID', 'sick-rfid', 'SICK RFID read/write devices and identification products.', @sick_parent_id, 7, 1, NOW(3), NOW(3)
WHERE @sick_parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'sick-rfid');

INSERT INTO categories (name, slug, description, parent_id, sort_order, is_active, created_at, updated_at)
SELECT 'SICK Ultrasonic & Distance Sensors', 'sick-ultrasonic-distance-sensors', 'SICK ultrasonic, displacement, and distance measurement sensors.', @sick_parent_id, 8, 1, NOW(3), NOW(3)
WHERE @sick_parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'sick-ultrasonic-distance-sensors');

CREATE TEMPORARY TABLE tmp_sick_seed (
  category_slug VARCHAR(100) NOT NULL,
  sku VARCHAR(100) NOT NULL,
  product_type VARCHAR(120) NOT NULL,
  series_name VARCHAR(120) NOT NULL,
  PRIMARY KEY (sku)
);

INSERT INTO tmp_sick_seed (category_slug, sku, product_type, series_name) VALUES
('sick-photoelectric-sensors','WTB4-3P3161','Photoelectric Sensor','W4'),
('sick-photoelectric-sensors','WTB4-3N1361','Photoelectric Sensor','W4'),
('sick-photoelectric-sensors','WTB9-3P2461','Photoelectric Sensor','W9'),
('sick-photoelectric-sensors','WTB12-3P2431','Photoelectric Sensor','W12'),
('sick-photoelectric-sensors','WL12-3P2431','Photoelectric Sensor','W12'),
('sick-photoelectric-sensors','WL12G-3B2531','Photoelectric Sensor','W12G'),
('sick-photoelectric-sensors','WTT12L-B2562','Photoelectric Distance Sensor','W12'),
('sick-photoelectric-sensors','WTB27-3P2411','Photoelectric Sensor','W27'),
('sick-photoelectric-sensors','WL27-3P2430','Retro-reflective Sensor','W27'),
('sick-photoelectric-sensors','WS/WE12-3P2430','Through-beam Photoelectric Sensor','W12'),

('sick-inductive-proximity-sensors','IME08-02BPSZW2S','Inductive Proximity Sensor','IME'),
('sick-inductive-proximity-sensors','IME12-04BPSZW2S','Inductive Proximity Sensor','IME'),
('sick-inductive-proximity-sensors','IME18-08BPSZW2S','Inductive Proximity Sensor','IME'),
('sick-inductive-proximity-sensors','IME30-15BPSZW2S','Inductive Proximity Sensor','IME'),
('sick-inductive-proximity-sensors','IME12-04NPSZW2S','Inductive Proximity Sensor','IME'),
('sick-inductive-proximity-sensors','IME18-08NPSZW2S','Inductive Proximity Sensor','IME'),
('sick-inductive-proximity-sensors','IMB12-04BPSVC0S','Inductive Proximity Sensor','IMB'),
('sick-inductive-proximity-sensors','IMF12-04BPSNC0S','Inductive Proximity Sensor','IMF'),
('sick-inductive-proximity-sensors','IQG10-06BPS-KT0','Inductive Proximity Sensor','IQG'),
('sick-inductive-proximity-sensors','IMC12-04BPSZC0S','Inductive Proximity Sensor','IMC'),

('sick-safety-light-curtains','C4C-EA03010A10000','Safety Light Curtain','deTec4'),
('sick-safety-light-curtains','C4C-EA06010A10000','Safety Light Curtain','deTec4'),
('sick-safety-light-curtains','C4C-EA09010A10000','Safety Light Curtain','deTec4'),
('sick-safety-light-curtains','C4C-EA12010A10000','Safety Light Curtain','deTec4'),
('sick-safety-light-curtains','C4C-EA15010A10000','Safety Light Curtain','deTec4'),
('sick-safety-light-curtains','C4C-SA03010A10000','Safety Light Curtain','deTec4'),
('sick-safety-light-curtains','C4C-SA06010A10000','Safety Light Curtain','deTec4'),
('sick-safety-light-curtains','C4C-SA09010A10000','Safety Light Curtain','deTec4'),
('sick-safety-light-curtains','C4C-SA12010A10000','Safety Light Curtain','deTec4'),
('sick-safety-light-curtains','EXE-12D6803B020','Safety Light Curtain Extension','deTec'),

('sick-encoders','DFS60B-BDPL10000','Incremental Encoder','DFS60'),
('sick-encoders','DFS60A-TBPA65536','Incremental Encoder','DFS60'),
('sick-encoders','DFS60I-BHPM65536','Incremental Encoder','DFS60'),
('sick-encoders','DFS60B-S4EA00200','Incremental Encoder','DFS60'),
('sick-encoders','DFS60B-S4PM05000','Incremental Encoder','DFS60'),
('sick-encoders','AFS60B-BEPK032768','Absolute Encoder','AFS60'),
('sick-encoders','AFM60S-TESC262144','Absolute Encoder','AFM60'),
('sick-encoders','DUS60E-S4AA01024','Incremental Encoder','DUS60'),
('sick-encoders','VFS60A-T4KA01024','Incremental Encoder','VFS60'),
('sick-encoders','ARS60-F4A08192','Absolute Encoder','ARS60'),

('sick-lidar-sensors','LMS111-10100','2D LiDAR Sensor','LMS1xx'),
('sick-lidar-sensors','LMS151-10100','2D LiDAR Sensor','LMS1xx'),
('sick-lidar-sensors','LMS511-10100S01','2D LiDAR Sensor','LMS5xx'),
('sick-lidar-sensors','LMS511-20100','2D LiDAR Sensor','LMS5xx'),
('sick-lidar-sensors','LMS500-20000','2D LiDAR Sensor','LMS5xx'),
('sick-lidar-sensors','TiM551-2050001','2D LiDAR Sensor','TiM5xx'),
('sick-lidar-sensors','TiM571-2050101','2D LiDAR Sensor','TiM5xx'),
('sick-lidar-sensors','TiM781S-2174104','Safety LiDAR Sensor','TiM7xx'),
('sick-lidar-sensors','MRS1000P','3D LiDAR Sensor','MRS1000'),
('sick-lidar-sensors','microScan3 Core I/O','Safety Laser Scanner','microScan3'),

('sick-barcode-scanners','CLV615-F2000','Fixed Mount Barcode Scanner','CLV61x'),
('sick-barcode-scanners','CLV620-0120','Fixed Mount Barcode Scanner','CLV62x'),
('sick-barcode-scanners','CLV621-0120','Fixed Mount Barcode Scanner','CLV62x'),
('sick-barcode-scanners','CLV622-1000','Fixed Mount Barcode Scanner','CLV62x'),
('sick-barcode-scanners','CLV630-0120','Fixed Mount Barcode Scanner','CLV63x'),
('sick-barcode-scanners','CLV631-0120','Fixed Mount Barcode Scanner','CLV63x'),
('sick-barcode-scanners','CLV632-1000','Fixed Mount Barcode Scanner','CLV63x'),
('sick-barcode-scanners','CLV640-0120','Fixed Mount Barcode Scanner','CLV64x'),
('sick-barcode-scanners','CLV650-0120','Fixed Mount Barcode Scanner','CLV65x'),
('sick-barcode-scanners','CLV690-1000','Fixed Mount Barcode Scanner','CLV69x'),

('sick-rfid','RFU610-10600','RFID Read/Write Device','RFU61x'),
('sick-rfid','RFU620-10400','RFID Read/Write Device','RFU62x'),
('sick-rfid','RFU630-13100','RFID Read/Write Device','RFU63x'),
('sick-rfid','RFU650-10100','RFID Read/Write Device','RFU65x'),
('sick-rfid','RFU65X-10100','RFID Read/Write Device','RFU65x'),
('sick-rfid','RFH515-1000001','HF RFID Read/Write Device','RFH5xx'),
('sick-rfid','RFH620-1001201','HF RFID Read/Write Device','RFH6xx'),
('sick-rfid','RFH630-1102101','HF RFID Read/Write Device','RFH6xx'),
('sick-rfid','RFU61X-10600','RFID Read/Write Device','RFU61x'),
('sick-rfid','RFU62X-10400','RFID Read/Write Device','RFU62x'),

('sick-ultrasonic-distance-sensors','UC4-11341','Ultrasonic Sensor','UC4'),
('sick-ultrasonic-distance-sensors','UC12-11231','Ultrasonic Sensor','UC12'),
('sick-ultrasonic-distance-sensors','UC30-21416','Ultrasonic Sensor','UC30'),
('sick-ultrasonic-distance-sensors','UM18-217161101','Ultrasonic Sensor','UM18'),
('sick-ultrasonic-distance-sensors','UM30-214113','Ultrasonic Sensor','UM30'),
('sick-ultrasonic-distance-sensors','OD2-P250W150I0','Displacement Sensor','OD Mini'),
('sick-ultrasonic-distance-sensors','OD1000-6001','Distance Sensor','OD1000'),
('sick-ultrasonic-distance-sensors','DT35-B15551','Distance Sensor','Dx35'),
('sick-ultrasonic-distance-sensors','DS35-B15521','Distance Sensor','Dx35'),
('sick-ultrasonic-distance-sensors','DL100-21AA2101','Long Range Distance Sensor','DL100');

UPDATE products p
JOIN tmp_sick_seed s ON s.sku = p.sku
JOIN categories c ON c.slug = s.category_slug
SET
  p.name = CONCAT('SICK ', s.sku, ' ', s.product_type),
  p.short_description = CONCAT('SICK ', s.sku, ' ', s.product_type, ' for industrial automation sensing, identification, safety, and replacement support.'),
  p.description = CONCAT(
    'SICK ', s.sku, ' ', s.product_type, '\n\n',
    'SICK ', s.sku, ' belongs to the ', s.series_name, ' range and is used in industrial automation for sensing, measurement, identification, machine safety, or maintenance replacement. ',
    'Confirm the exact part number, sensing principle, electrical interface, range, resolution, and machine configuration before ordering.\n\n',
    'Key details\n',
    '- Brand: SICK\n',
    '- Model: ', s.sku, '\n',
    '- Series: ', s.series_name, '\n',
    '- Type: ', s.product_type, '\n',
    '- Condition: New / Refurbished / Used (please confirm before ordering)\n',
    '- Warranty: 12 months\n',
    '- Lead time: 3-7 days\n',
    '- Shipping: Worldwide'
  ),
  p.brand = 'SICK',
  p.model = s.sku,
  p.part_number = s.sku,
  p.category_id = c.id,
  p.manufacturer = 'SICK AG',
  p.meta_title = CONCAT('SICK ', s.sku, ' ', s.product_type, ' | Vcocnc'),
  p.meta_description = CONCAT('SICK ', s.sku, ' ', s.series_name, ' ', s.product_type, ' for automation repair and replacement. Compatibility support, 12-month warranty, worldwide shipping.'),
  p.meta_keywords = CONCAT(s.sku, ', SICK ', s.series_name, ', ', s.product_type, ', SICK sensor, industrial automation parts, Vcocnc'),
  p.compatibility_info = CONCAT('Confirm compatibility for ', s.sku, ' against the original label, sensor family, connection type, output type, range, safety rating if applicable, and machine configuration.'),
  p.installation_guide = CONCAT('Install ', s.sku, ' only after isolating power and following the SICK manual and machine builder maintenance procedure.'),
  p.maintenance_tips = CONCAT('Keep ', s.sku, ' clean, dry, and correctly aligned. Check connectors, cabling, optics or sensing face, and mounting during maintenance.'),
  p.updated_at = NOW(3);

INSERT INTO products (
  sku, name, slug, short_description, description, price, stock_quantity, min_stock_level,
  brand, model, part_number, category_id, is_active, is_featured,
  meta_title, meta_description, meta_keywords, disable_auto_seo, image_urls,
  warranty_period, condition_type, origin_country, manufacturer, lead_time, minimum_order_quantity,
  packaging_info, certifications, technical_specs, compatibility_info, installation_guide, maintenance_tips,
  created_at, updated_at
)
SELECT
  s.sku,
  CONCAT('SICK ', s.sku, ' ', s.product_type),
  CONCAT('sick-', TRIM(BOTH '-' FROM LOWER(REGEXP_REPLACE(s.sku, '[^A-Za-z0-9]+', '-')))),
  CONCAT('SICK ', s.sku, ' ', s.product_type, ' for industrial automation sensing, identification, safety, and replacement support.'),
  CONCAT(
    'SICK ', s.sku, ' ', s.product_type, '\n\n',
    'SICK ', s.sku, ' belongs to the ', s.series_name, ' range and is used in industrial automation for sensing, measurement, identification, machine safety, or maintenance replacement. ',
    'Confirm the exact part number, sensing principle, electrical interface, range, resolution, and machine configuration before ordering.\n\n',
    'Key details\n',
    '- Brand: SICK\n',
    '- Model: ', s.sku, '\n',
    '- Series: ', s.series_name, '\n',
    '- Type: ', s.product_type, '\n',
    '- Condition: New / Refurbished / Used (please confirm before ordering)\n',
    '- Warranty: 12 months\n',
    '- Lead time: 3-7 days\n',
    '- Shipping: Worldwide'
  ),
  0.00,
  1,
  0,
  'SICK',
  s.sku,
  s.sku,
  c.id,
  1,
  0,
  CONCAT('SICK ', s.sku, ' ', s.product_type, ' | Vcocnc'),
  CONCAT('SICK ', s.sku, ' ', s.series_name, ' ', s.product_type, ' for automation repair and replacement. Compatibility support, 12-month warranty, worldwide shipping.'),
  CONCAT(s.sku, ', SICK ', s.series_name, ', ', s.product_type, ', SICK sensor, industrial automation parts, Vcocnc'),
  0,
  JSON_ARRAY(),
  '12 months',
  'new',
  'Germany',
  'SICK AG',
  '3-7 days',
  1,
  CONCAT('Standard export packaging for SICK ', s.sku, '.'),
  'CE / RoHS where applicable; confirm by exact model before ordering.',
  JSON_OBJECT('brand','SICK','series',s.series_name,'model',s.sku,'type',s.product_type),
  CONCAT('Confirm compatibility for ', s.sku, ' against the original label, sensor family, connection type, output type, range, safety rating if applicable, and machine configuration.'),
  CONCAT('Install ', s.sku, ' only after isolating power and following the SICK manual and machine builder maintenance procedure.'),
  CONCAT('Keep ', s.sku, ' clean, dry, and correctly aligned. Check connectors, cabling, optics or sensing face, and mounting during maintenance.'),
  NOW(3),
  NOW(3)
FROM tmp_sick_seed s
JOIN categories c ON c.slug = s.category_slug
LEFT JOIN products existing_sku ON existing_sku.sku = s.sku
LEFT JOIN products existing_slug ON existing_slug.slug = CONCAT('sick-', TRIM(BOTH '-' FROM LOWER(REGEXP_REPLACE(s.sku, '[^A-Za-z0-9]+', '-'))))
WHERE existing_sku.id IS NULL
  AND existing_slug.id IS NULL;

SELECT c.slug, c.name, COUNT(p.id) AS products
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
WHERE c.slug = 'sick' OR c.parent_id = @sick_parent_id
GROUP BY c.id
ORDER BY c.parent_id, c.sort_order, c.id;
