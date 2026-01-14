-- Insert sample products with images
-- First, get a category ID to use
SET @category_id = (SELECT id FROM categories LIMIT 1);

-- Insert sample products
INSERT INTO products (name, sku, slug, short_description, description, price, compare_price, cost_price, stock_quantity, min_stock_level, weight, dimensions, brand, category_id, is_active, is_featured, meta_title, meta_description, meta_keywords, created_at, updated_at) VALUES
('FANUC A02B-0120-C041 Servo Drive', 'A02B-0120-C041', 'fanuc-a02b-0120-c041-servo-drive', 'High-performance servo drive for industrial automation', 'The FANUC A02B-0120-C041 is a state-of-the-art servo drive designed for precision control in industrial automation applications. Features advanced motion control algorithms and robust construction for reliable operation in demanding environments.', 2850.00, 3200.00, 2100.00, 25, 5, 2.5, '200x150x100mm', 'FANUC', @category_id, true, true, 'FANUC A02B-0120-C041 Servo Drive - High Performance', 'Buy FANUC A02B-0120-C041 servo drive for industrial automation. High-performance, reliable, and precision control.', 'FANUC, servo drive, A02B-0120-C041, industrial automation, motion control', NOW(), NOW()),

('FANUC A860-0360-T001 Encoder', 'A860-0360-T001', 'fanuc-a860-0360-t001-encoder', 'Precision absolute encoder for servo motors', 'The FANUC A860-0360-T001 is a high-resolution absolute encoder designed for use with FANUC servo motors. Provides accurate position feedback with excellent repeatability and long-term stability.', 1950.00, 2200.00, 1400.00, 18, 3, 0.8, '80x80x50mm', 'FANUC', @category_id, true, false, 'FANUC A860-0360-T001 Absolute Encoder', 'High-precision FANUC A860-0360-T001 absolute encoder for servo motor position feedback.', 'FANUC, encoder, A860-0360-T001, absolute encoder, servo motor, position feedback', NOW(), NOW()),

('FANUC 10S-3000 Spindle Motor', '10S-3000', 'fanuc-10s-3000-spindle-motor', 'High-speed spindle motor for machining centers', 'The FANUC 10S-3000 is a high-speed spindle motor designed for machining centers and CNC machines. Delivers exceptional performance with speeds up to 15,000 RPM and superior surface finish quality.', 4200.00, 4800.00, 3200.00, 8, 2, 15.5, '300x200x200mm', 'FANUC', @category_id, true, true, 'FANUC 10S-3000 High-Speed Spindle Motor', 'FANUC 10S-3000 spindle motor for CNC machining centers. High-speed performance up to 15,000 RPM.', 'FANUC, spindle motor, 10S-3000, CNC, machining center, high-speed', NOW(), NOW());

-- Get the product IDs for adding images
SET @product1_id = (SELECT id FROM products WHERE sku = 'A02B-0120-C041');
SET @product2_id = (SELECT id FROM products WHERE sku = 'A860-0360-T001');
SET @product3_id = (SELECT id FROM products WHERE sku = '10S-3000');

-- Insert product images with external URLs
INSERT INTO product_images (product_id, url, filename, original_name, is_primary, created_at, updated_at) VALUES
-- Product 1 images
(@product1_id, 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500&h=500&fit=crop&crop=center', 'servo-drive-1.jpg', 'FANUC Servo Drive Main Image', true, NOW(), NOW()),
(@product1_id, 'https://images.unsplash.com/photo-1581092795442-6d4b3b8e5b8e?w=500&h=500&fit=crop&crop=center', 'servo-drive-2.jpg', 'FANUC Servo Drive Detail', false, NOW(), NOW()),

-- Product 2 images
(@product2_id, 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=500&h=500&fit=crop&crop=center', 'encoder-1.jpg', 'FANUC Encoder Main Image', true, NOW(), NOW()),
(@product2_id, 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=500&h=500&fit=crop&crop=center', 'encoder-2.jpg', 'FANUC Encoder Detail', false, NOW(), NOW()),

-- Product 3 images
(@product3_id, 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=500&h=500&fit=crop&crop=center', 'spindle-motor-1.jpg', 'FANUC Spindle Motor Main Image', true, NOW(), NOW()),
(@product3_id, 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=500&h=500&fit=crop&crop=center', 'spindle-motor-2.jpg', 'FANUC Spindle Motor Detail', false, NOW(), NOW());

-- Insert product attributes
INSERT INTO product_attributes (product_id, attribute_name, attribute_value, created_at, updated_at) VALUES
-- Product 1 attributes
(@product1_id, 'Voltage', '220V AC', NOW(), NOW()),
(@product1_id, 'Frequency', '50/60 Hz', NOW(), NOW()),
(@product1_id, 'Protection', 'IP65', NOW(), NOW()),
(@product1_id, 'Operating Temperature', '-10°C to +50°C', NOW(), NOW()),

-- Product 2 attributes
(@product2_id, 'Resolution', '17-bit', NOW(), NOW()),
(@product2_id, 'Interface', 'Serial', NOW(), NOW()),
(@product2_id, 'Protection', 'IP67', NOW(), NOW()),
(@product2_id, 'Operating Temperature', '-20°C to +70°C', NOW(), NOW()),

-- Product 3 attributes
(@product3_id, 'Max Speed', '15,000 RPM', NOW(), NOW()),
(@product3_id, 'Power', '3.7 kW', NOW(), NOW()),
(@product3_id, 'Cooling', 'Air Cooled', NOW(), NOW()),
(@product3_id, 'Mounting', 'Flange Mount', NOW(), NOW());

-- Insert purchase links
INSERT INTO purchase_links (product_id, platform, url, price, is_active, created_at, updated_at) VALUES
-- Product 1 purchase links
(@product1_id, 'Official Store', 'https://www.fanuc.com/products/servo-drives', 2850.00, true, NOW(), NOW()),
(@product1_id, 'Authorized Dealer', 'https://dealer.fanuc.com/servo-drives', 2992.50, true, NOW(), NOW()),

-- Product 2 purchase links
(@product2_id, 'Official Store', 'https://www.fanuc.com/products/encoders', 1950.00, true, NOW(), NOW()),
(@product2_id, 'Authorized Dealer', 'https://dealer.fanuc.com/encoders', 2047.50, true, NOW(), NOW()),

-- Product 3 purchase links
(@product3_id, 'Official Store', 'https://www.fanuc.com/products/spindle-motors', 4200.00, true, NOW(), NOW()),
(@product3_id, 'Authorized Dealer', 'https://dealer.fanuc.com/spindle-motors', 4410.00, true, NOW(), NOW());
