SET @tamagawa_parent_id := (SELECT id FROM categories WHERE slug = 'tamagawa' LIMIT 1);

INSERT INTO categories (name, slug, description, parent_id, sort_order, is_active, created_at, updated_at)
SELECT 'Tamagawa Rotary Encoders', 'tamagawa-rotary-encoders', 'Tamagawa rotary encoders, pulse generators, and FA-CODER feedback units.', @tamagawa_parent_id, 1, 1, NOW(3), NOW(3)
WHERE @tamagawa_parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'tamagawa-rotary-encoders');

INSERT INTO categories (name, slug, description, parent_id, sort_order, is_active, created_at, updated_at)
SELECT 'Tamagawa Absolute Encoders', 'tamagawa-absolute-encoders', 'Tamagawa absolute encoders and serial feedback devices.', @tamagawa_parent_id, 2, 1, NOW(3), NOW(3)
WHERE @tamagawa_parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'tamagawa-absolute-encoders');

INSERT INTO categories (name, slug, description, parent_id, sort_order, is_active, created_at, updated_at)
SELECT 'Tamagawa Resolvers / Smartsyn', 'tamagawa-resolvers-smartsyn', 'Tamagawa Smartsyn brushless resolvers and synchro feedback parts.', @tamagawa_parent_id, 3, 1, NOW(3), NOW(3)
WHERE @tamagawa_parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'tamagawa-resolvers-smartsyn');

INSERT INTO categories (name, slug, description, parent_id, sort_order, is_active, created_at, updated_at)
SELECT 'Tamagawa Servo Motors', 'tamagawa-servo-motors', 'Tamagawa AC servo motors and TBL-i motion parts.', @tamagawa_parent_id, 4, 1, NOW(3), NOW(3)
WHERE @tamagawa_parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'tamagawa-servo-motors');

INSERT INTO categories (name, slug, description, parent_id, sort_order, is_active, created_at, updated_at)
SELECT 'Tamagawa Servo Drivers', 'tamagawa-servo-drivers', 'Tamagawa servo drivers and motion control amplifiers.', @tamagawa_parent_id, 5, 1, NOW(3), NOW(3)
WHERE @tamagawa_parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'tamagawa-servo-drivers');

CREATE TEMPORARY TABLE tmp_tamagawa_seed (
  category_slug VARCHAR(100) NOT NULL,
  sku VARCHAR(100) NOT NULL,
  product_type VARCHAR(120) NOT NULL,
  series_name VARCHAR(120) NOT NULL,
  target_price DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (sku)
);

INSERT INTO tmp_tamagawa_seed (category_slug, sku, product_type, series_name, target_price) VALUES
('tamagawa-rotary-encoders','AU5589','PLG / Rotary Encoder','FA-CODER',669.00),
('tamagawa-rotary-encoders','TS5208N130','Rotary Encoder','FA-CODER',220.00),
('tamagawa-rotary-encoders','TS5208N500','Rotary Encoder','FA-CODER',240.00),
('tamagawa-rotary-encoders','TS5212N510','Rotary Encoder','FA-CODER',260.00),
('tamagawa-rotary-encoders','TS5213N530','Rotary Encoder','FA-CODER',280.00),
('tamagawa-rotary-encoders','TS5214N566','Rotary Encoder','FA-CODER',320.00),
('tamagawa-rotary-encoders','TS5207N136','Rotary Encoder','FA-CODER',210.00),
('tamagawa-rotary-encoders','TS5209N180','Rotary Encoder','FA-CODER',230.00),
('tamagawa-rotary-encoders','OIH48-2500P8-L6-5V','Incremental Rotary Encoder','OIH',360.00),
('tamagawa-rotary-encoders','OIH100-1024C/T-P2-12V','Incremental Rotary Encoder','OIH',420.00),

('tamagawa-absolute-encoders','TS5667N120','Absolute Encoder','Absolute Encoder',520.00),
('tamagawa-absolute-encoders','TS5667N420','Absolute Encoder','Absolute Encoder',620.00),
('tamagawa-absolute-encoders','TS5643N100','Absolute Encoder','Absolute Encoder',480.00),
('tamagawa-absolute-encoders','TS5646N100','Absolute Encoder','Absolute Encoder',520.00),
('tamagawa-absolute-encoders','TS5667N550','Absolute Encoder','Absolute Encoder',680.00),
('tamagawa-absolute-encoders','TS5692N100','Absolute Encoder','Absolute Encoder',760.00),
('tamagawa-absolute-encoders','TS5700N8501','Absolute Encoder','Absolute Encoder',850.00),
('tamagawa-absolute-encoders','TS5778N155','Absolute Encoder','Absolute Encoder',920.00),
('tamagawa-absolute-encoders','TS5703N8501','Absolute Encoder','Absolute Encoder',880.00),
('tamagawa-absolute-encoders','TS5650N8401','Absolute Encoder','Absolute Encoder',640.00),

('tamagawa-resolvers-smartsyn','TS2640N321E64','Brushless Resolver','Smartsyn',260.00),
('tamagawa-resolvers-smartsyn','TS2640N641E64','Brushless Resolver','Smartsyn',280.00),
('tamagawa-resolvers-smartsyn','TS2640N71E10','Brushless Resolver','Smartsyn',240.00),
('tamagawa-resolvers-smartsyn','TS2651N111E78','Brushless Resolver','Smartsyn',320.00),
('tamagawa-resolvers-smartsyn','TS2605N5891E64','Brushless Resolver','Smartsyn',360.00),
('tamagawa-resolvers-smartsyn','TS2620N21E11','Brushless Resolver','Smartsyn',230.00),
('tamagawa-resolvers-smartsyn','TS2620N31E11','Brushless Resolver','Smartsyn',240.00),
('tamagawa-resolvers-smartsyn','TS2610N171E64','Brushless Resolver','Smartsyn',290.00),
('tamagawa-resolvers-smartsyn','TS2460N671E110','Resolver / Synchro','Smartsyn',380.00),
('tamagawa-resolvers-smartsyn','TS2660N31E64','Brushless Resolver','Smartsyn',300.00),

('tamagawa-servo-motors','TS4609N3307E200','AC Servo Motor','TBL-i',780.00),
('tamagawa-servo-motors','TS4607N7135E100','AC Servo Motor','TBL-i',690.00),
('tamagawa-servo-motors','TS4513N9026E200-S00Y-M8828-20','AC Servo Motor','TBL-i',1250.00),
('tamagawa-servo-motors','4513N2821E200','AC Servo Motor','TBL-i',760.00),
('tamagawa-servo-motors','4503N4032E202','AC Servo Motor','TBL-i',520.00),
('tamagawa-servo-motors','4503N9022E200','AC Servo Motor','TBL-i',560.00),
('tamagawa-servo-motors','4507N9028E200-90K93-6231EX','AC Servo Motor','TBL-i',980.00),
('tamagawa-servo-motors','TS4603N1030E200','AC Servo Motor','TBL-i',520.00),
('tamagawa-servo-motors','TS4606N2030E200','AC Servo Motor','TBL-i',620.00),
('tamagawa-servo-motors','TS4602N1020E200','AC Servo Motor','TBL-i',460.00),

('tamagawa-servo-drivers','TA8410N75E111','Servo Driver','TA Series',520.00),
('tamagawa-servo-drivers','TA8410N75E112','Servo Driver','TA Series',560.00),
('tamagawa-servo-drivers','TA8411N77E112','Servo Driver','TA Series',680.00),
('tamagawa-servo-drivers','TA8411NU6E83','Servo Driver','TA Series',720.00),
('tamagawa-servo-drivers','TA8440N200E100','Servo Driver','TA Series',850.00),
('tamagawa-servo-drivers','TAD8810N10E100','Servo Driver','TAD Series',980.00),
('tamagawa-servo-drivers','TAD8811N20E100','Servo Driver','TAD Series',1200.00),
('tamagawa-servo-drivers','TAD8815N30E100','Servo Driver','TAD Series',1450.00),
('tamagawa-servo-drivers','TA8420N50E100','Servo Driver','TA Series',620.00),
('tamagawa-servo-drivers','TA8430N100E100','Servo Driver','TA Series',760.00);

UPDATE products p
JOIN tmp_tamagawa_seed s ON s.sku = p.sku
JOIN categories c ON c.slug = s.category_slug
SET
  p.name = CONCAT('Tamagawa ', s.sku, ' ', s.product_type),
  p.short_description = CONCAT('Tamagawa ', s.sku, ' ', s.product_type, ' for CNC, servo feedback, motion control, repair, and replacement support.'),
  p.description = CONCAT(
    'Tamagawa ', s.sku, ' ', s.product_type, '\n\n',
    'Tamagawa ', s.sku, ' belongs to the ', s.series_name, ' range and is used in motion control, servo feedback, robotics, CNC, and industrial automation maintenance. ',
    'Confirm the exact model, signal format, voltage, cable/connector, resolution, and machine configuration before ordering.\n\n',
    'Key details\n',
    '- Brand: Tamagawa Seiki\n',
    '- Model: ', s.sku, '\n',
    '- Series: ', s.series_name, '\n',
    '- Type: ', s.product_type, '\n',
    '- Condition: New / Refurbished / Used (please confirm before ordering)\n',
    '- Warranty: 12 months\n',
    '- Lead time: 3-7 days\n',
    '- Shipping: Worldwide'
  ),
  p.brand = 'Tamagawa',
  p.model = s.sku,
  p.part_number = s.sku,
  p.category_id = c.id,
  p.price = s.target_price,
  p.compare_price = ROUND(s.target_price * 1.18, 2),
  p.cost_price = ROUND(s.target_price * 0.62, 2),
  p.manufacturer = 'Tamagawa Seiki',
  p.meta_title = CONCAT('Tamagawa ', s.sku, ' ', s.product_type, ' | Vcocnc'),
  p.meta_description = CONCAT('Tamagawa ', s.sku, ' ', s.series_name, ' ', s.product_type, ' for CNC and automation repair. Compatibility support, 12-month warranty, worldwide shipping.'),
  p.meta_keywords = CONCAT(s.sku, ', Tamagawa ', s.series_name, ', ', s.product_type, ', Tamagawa Seiki parts, servo feedback, CNC replacement parts, Vcocnc'),
  p.compatibility_info = CONCAT('Confirm compatibility for ', s.sku, ' against the original label, feedback type, resolution, signal format, connector, servo drive, CNC system, and machine configuration.'),
  p.installation_guide = CONCAT('Install ', s.sku, ' only after isolating power and following the Tamagawa Seiki manual and machine builder maintenance procedure.'),
  p.maintenance_tips = CONCAT('Keep ', s.sku, ' clean, dry, and properly aligned. Check connectors, cable shielding, coupling, mounting, and feedback signal stability during maintenance.'),
  p.updated_at = NOW(3);

INSERT INTO products (
  sku, name, slug, short_description, description, price, compare_price, cost_price, stock_quantity, min_stock_level,
  brand, model, part_number, category_id, is_active, is_featured,
  meta_title, meta_description, meta_keywords, disable_auto_seo, image_urls,
  warranty_period, condition_type, origin_country, manufacturer, lead_time, minimum_order_quantity,
  packaging_info, certifications, technical_specs, compatibility_info, installation_guide, maintenance_tips,
  created_at, updated_at
)
SELECT
  s.sku,
  CONCAT('Tamagawa ', s.sku, ' ', s.product_type),
  CONCAT('tamagawa-', TRIM(BOTH '-' FROM LOWER(REGEXP_REPLACE(s.sku, '[^A-Za-z0-9]+', '-')))),
  CONCAT('Tamagawa ', s.sku, ' ', s.product_type, ' for CNC, servo feedback, motion control, repair, and replacement support.'),
  CONCAT(
    'Tamagawa ', s.sku, ' ', s.product_type, '\n\n',
    'Tamagawa ', s.sku, ' belongs to the ', s.series_name, ' range and is used in motion control, servo feedback, robotics, CNC, and industrial automation maintenance. ',
    'Confirm the exact model, signal format, voltage, cable/connector, resolution, and machine configuration before ordering.\n\n',
    'Key details\n',
    '- Brand: Tamagawa Seiki\n',
    '- Model: ', s.sku, '\n',
    '- Series: ', s.series_name, '\n',
    '- Type: ', s.product_type, '\n',
    '- Condition: New / Refurbished / Used (please confirm before ordering)\n',
    '- Warranty: 12 months\n',
    '- Lead time: 3-7 days\n',
    '- Shipping: Worldwide'
  ),
  s.target_price,
  ROUND(s.target_price * 1.18, 2),
  ROUND(s.target_price * 0.62, 2),
  1,
  0,
  'Tamagawa',
  s.sku,
  s.sku,
  c.id,
  1,
  0,
  CONCAT('Tamagawa ', s.sku, ' ', s.product_type, ' | Vcocnc'),
  CONCAT('Tamagawa ', s.sku, ' ', s.series_name, ' ', s.product_type, ' for CNC and automation repair. Compatibility support, 12-month warranty, worldwide shipping.'),
  CONCAT(s.sku, ', Tamagawa ', s.series_name, ', ', s.product_type, ', Tamagawa Seiki parts, servo feedback, CNC replacement parts, Vcocnc'),
  0,
  JSON_ARRAY(),
  '12 months',
  'new',
  'Japan',
  'Tamagawa Seiki',
  '3-7 days',
  1,
  CONCAT('Standard export packaging for Tamagawa ', s.sku, '.'),
  'CE / RoHS where applicable; confirm by exact model before ordering.',
  JSON_OBJECT('brand','Tamagawa Seiki','series',s.series_name,'model',s.sku,'type',s.product_type),
  CONCAT('Confirm compatibility for ', s.sku, ' against the original label, feedback type, resolution, signal format, connector, servo drive, CNC system, and machine configuration.'),
  CONCAT('Install ', s.sku, ' only after isolating power and following the Tamagawa Seiki manual and machine builder maintenance procedure.'),
  CONCAT('Keep ', s.sku, ' clean, dry, and properly aligned. Check connectors, cable shielding, coupling, mounting, and feedback signal stability during maintenance.'),
  NOW(3),
  NOW(3)
FROM tmp_tamagawa_seed s
JOIN categories c ON c.slug = s.category_slug
LEFT JOIN products existing_sku ON existing_sku.sku = s.sku
LEFT JOIN products existing_slug ON existing_slug.slug = CONCAT('tamagawa-', TRIM(BOTH '-' FROM LOWER(REGEXP_REPLACE(s.sku, '[^A-Za-z0-9]+', '-'))))
WHERE existing_sku.id IS NULL
  AND existing_slug.id IS NULL;

SELECT c.slug, c.name, COUNT(p.id) AS products, MIN(p.price) min_price, MAX(p.price) max_price, ROUND(AVG(p.price), 2) avg_price
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
WHERE c.slug = 'tamagawa' OR c.parent_id = @tamagawa_parent_id
GROUP BY c.id
ORDER BY c.parent_id, c.sort_order, c.id;
