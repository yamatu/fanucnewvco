CREATE TEMPORARY TABLE tmp_seeded_product_prices AS
SELECT
  p.id,
  CASE
    WHEN p.brand = 'Mitsubishi' AND c.slug = 'a-series' THEN
      CASE
        WHEN p.name REGEXP 'Ethernet|Communication' THEN 280.00
        WHEN p.name REGEXP 'Analog|Temperature' THEN 180.00
        WHEN p.name REGEXP 'Input|Output' THEN 85.00
        ELSE 220.00
      END
    WHEN p.brand = 'Mitsubishi' AND c.slug = 'freqrol-fr' THEN
      CASE
        WHEN p.sku LIKE 'FR-F840%' THEN 1350.00
        WHEN p.sku LIKE 'FR-A840%' THEN 980.00
        WHEN p.sku LIKE 'FR-A740-3.7K%' THEN 720.00
        WHEN p.sku LIKE 'FR-A740-2.2K%' THEN 580.00
        WHEN p.sku LIKE 'FR-A740-1.5K%' THEN 460.00
        WHEN p.sku LIKE 'FR-A740-0.4K%' THEN 310.00
        WHEN p.sku LIKE 'FR-F740%' THEN 520.00
        WHEN p.sku LIKE 'FR-E840%' THEN 380.00
        WHEN p.sku LIKE 'FR-E740-1.5K%' THEN 260.00
        WHEN p.sku LIKE 'FR-E740-0.4K%' THEN 190.00
        WHEN p.sku LIKE 'FR-D740-1.5K%' THEN 230.00
        ELSE 170.00
      END
    WHEN p.brand = 'Mitsubishi' AND c.slug = 'fx-series' THEN
      CASE
        WHEN p.sku LIKE 'FX5UC%' THEN 820.00
        WHEN p.sku LIKE 'FX5U-64%' THEN 920.00
        WHEN p.sku LIKE 'FX5U-32%' THEN 720.00
        WHEN p.sku LIKE 'FX3U-64%' THEN 620.00
        WHEN p.sku LIKE 'FX3U-48%' THEN 540.00
        WHEN p.sku LIKE 'FX3U-32%' THEN 420.00
        WHEN p.sku LIKE 'FX3U-16%' THEN 320.00
        WHEN p.sku LIKE 'FX3G%' THEN 360.00
        WHEN p.sku LIKE 'FX2N%' THEN 280.00
        WHEN p.sku LIKE 'FX3U-4AD%' THEN 170.00
        ELSE 300.00
      END
    WHEN p.brand = 'Mitsubishi' AND c.slug = 'got1000' THEN
      CASE
        WHEN p.sku LIKE 'GT1695%' THEN 1650.00
        WHEN p.sku LIKE 'GT1675%' THEN 1350.00
        WHEN p.sku LIKE 'GT1665%' THEN 1200.00
        WHEN p.sku LIKE 'GT1585%' THEN 1100.00
        WHEN p.sku LIKE 'GT1575%' THEN 960.00
        WHEN p.sku LIKE 'GT1565%' THEN 850.00
        WHEN p.sku LIKE 'GT1555%' THEN 780.00
        WHEN p.sku LIKE 'GT1155%' THEN 520.00
        WHEN p.sku LIKE 'GT1150%' THEN 430.00
        WHEN p.sku LIKE 'GT1030%' THEN 260.00
        ELSE 220.00
      END
    WHEN p.brand = 'Mitsubishi' AND c.slug IN ('hf-series', 'hg-series', 'melservo-hc') THEN
      CASE
        WHEN p.sku REGEXP '1534|1524|202' THEN 1500.00
        WHEN p.sku REGEXP '152' THEN 1050.00
        WHEN p.sku REGEXP '102|103' THEN 800.00
        WHEN p.sku REGEXP '73|72' THEN 580.00
        WHEN p.sku REGEXP '52' THEN 550.00
        WHEN p.sku REGEXP '43' THEN 420.00
        WHEN p.sku REGEXP '23' THEN 320.00
        ELSE 280.00
      END
    WHEN p.brand = 'Mitsubishi' AND c.slug = 'mds-servo-drives' THEN
      CASE
        WHEN p.sku LIKE '%SPV3%' THEN 4200.00
        WHEN p.sku LIKE '%CV-185%' THEN 3200.00
        WHEN p.sku LIKE '%SP-110%' THEN 2600.00
        WHEN p.sku LIKE '%SP-37%' THEN 2200.00
        WHEN p.sku LIKE '%C1-V2%' THEN 1400.00
        WHEN p.sku LIKE '%SVJ3-20%' THEN 950.00
        WHEN p.sku LIKE '%SVJ3-10%' THEN 750.00
        WHEN p.sku LIKE '%SVJ3-04%' THEN 580.00
        WHEN p.sku LIKE '%B-SVJ2-20%' THEN 520.00
        WHEN p.sku LIKE '%B-SVJ2-10%' THEN 420.00
        ELSE 850.00
      END
    WHEN p.brand = 'Mitsubishi' AND c.slug = 'melsec-q' THEN
      CASE
        WHEN p.sku LIKE 'Q26%' THEN 1200.00
        WHEN p.sku LIKE 'Q13%' THEN 950.00
        WHEN p.sku LIKE 'Q06%' THEN 750.00
        WHEN p.sku LIKE 'Q04%' THEN 650.00
        WHEN p.sku LIKE 'Q03UDV%' THEN 680.00
        WHEN p.sku LIKE 'Q03%' THEN 480.00
        WHEN p.sku LIKE 'Q02%' THEN 350.00
        WHEN p.sku LIKE 'Q01%' THEN 280.00
        WHEN p.sku LIKE 'Q00CPU%' THEN 220.00
        WHEN p.sku LIKE 'Q00J%' THEN 190.00
        WHEN p.sku LIKE 'QJ71%' THEN 260.00
        WHEN p.sku LIKE 'QX40%' THEN 85.00
        ELSE 240.00
      END
    WHEN p.brand = 'Mitsubishi' AND c.slug = 'melservo-mr-j4' THEN
      CASE
        WHEN p.sku LIKE 'MR-J4W3%' THEN 1600.00
        WHEN p.sku LIKE 'MR-J4W2%' THEN 1100.00
        WHEN p.sku LIKE '%500%' THEN 1850.00
        WHEN p.sku LIKE '%350%' THEN 1450.00
        WHEN p.sku LIKE '%200%' THEN 950.00
        WHEN p.sku LIKE '%100%' THEN 620.00
        WHEN p.sku LIKE '%70%' THEN 520.00
        WHEN p.sku LIKE '%40%' THEN 380.00
        WHEN p.sku LIKE '%20%' THEN 300.00
        ELSE 260.00
      END
    WHEN p.brand = 'Mitsubishi' AND c.slug = 'melservo-mr-j3' THEN
      CASE
        WHEN p.sku LIKE '%500%' THEN 1250.00
        WHEN p.sku LIKE '%350%' THEN 980.00
        WHEN p.sku LIKE '%200%' THEN 760.00
        WHEN p.sku LIKE '%100%' THEN 520.00
        WHEN p.sku LIKE '%70%' THEN 420.00
        WHEN p.sku LIKE '%40%' THEN 320.00
        WHEN p.sku LIKE '%20%' THEN 260.00
        ELSE 220.00
      END
    WHEN p.brand = 'Mitsubishi' AND c.slug = 'melservo-mr-j2' THEN
      CASE
        WHEN p.sku LIKE '%200%' THEN 520.00
        WHEN p.sku LIKE '%100%' THEN 380.00
        WHEN p.sku LIKE '%70%' THEN 320.00
        WHEN p.sku LIKE '%60%' THEN 300.00
        WHEN p.sku LIKE '%40%' THEN 260.00
        WHEN p.sku LIKE '%20%' THEN 220.00
        ELSE 180.00
      END

    WHEN p.brand = 'SICK' AND c.slug = 'sick-photoelectric-sensors' THEN
      CASE
        WHEN p.sku LIKE 'WTT%' THEN 280.00
        WHEN p.sku REGEXP 'W27' THEN 190.00
        WHEN p.sku REGEXP 'W12' THEN 150.00
        WHEN p.sku REGEXP 'W9' THEN 110.00
        ELSE 75.00
      END
    WHEN p.brand = 'SICK' AND c.slug = 'sick-inductive-proximity-sensors' THEN
      CASE
        WHEN p.sku LIKE 'IQG%' THEN 140.00
        WHEN p.sku REGEXP 'IMB|IMF|IMC' THEN 70.00
        WHEN p.sku LIKE 'IME30%' THEN 85.00
        WHEN p.sku LIKE 'IME18%' THEN 48.00
        ELSE 38.00
      END
    WHEN p.brand = 'SICK' AND c.slug = 'sick-safety-light-curtains' THEN
      CASE
        WHEN p.sku LIKE 'EXE%' THEN 220.00
        WHEN p.sku REGEXP '15010' THEN 1800.00
        WHEN p.sku REGEXP '12010' THEN 1500.00
        WHEN p.sku REGEXP '09010' THEN 1200.00
        WHEN p.sku REGEXP '06010' THEN 900.00
        ELSE 650.00
      END
    WHEN p.brand = 'SICK' AND c.slug = 'sick-encoders' THEN
      CASE
        WHEN p.sku LIKE 'AFM%' THEN 1150.00
        WHEN p.sku LIKE 'AFS%' THEN 980.00
        WHEN p.sku LIKE 'DFS60I%' THEN 720.00
        WHEN p.sku LIKE 'DFS60A%' THEN 650.00
        WHEN p.sku LIKE 'ARS%' THEN 750.00
        WHEN p.sku REGEXP 'DUS|VFS' THEN 380.00
        ELSE 520.00
      END
    WHEN p.brand = 'SICK' AND c.slug = 'sick-lidar-sensors' THEN
      CASE
        WHEN p.sku LIKE 'LMS511%' THEN 8900.00
        WHEN p.sku LIKE 'LMS500%' THEN 7800.00
        WHEN p.sku LIKE 'MRS1000%' THEN 5200.00
        WHEN p.sku LIKE 'TiM781%' THEN 3600.00
        WHEN p.sku LIKE 'microScan3%' THEN 2400.00
        WHEN p.sku LIKE 'LMS151%' THEN 2800.00
        WHEN p.sku LIKE 'LMS111%' THEN 1800.00
        WHEN p.sku LIKE 'TiM571%' THEN 1900.00
        ELSE 1650.00
      END
    WHEN p.brand = 'SICK' AND c.slug = 'sick-barcode-scanners' THEN
      CASE
        WHEN p.sku LIKE 'CLV690%' THEN 2200.00
        WHEN p.sku LIKE 'CLV650%' THEN 1600.00
        WHEN p.sku LIKE 'CLV640%' THEN 1300.00
        WHEN p.sku LIKE 'CLV63%' THEN 950.00
        WHEN p.sku LIKE 'CLV62%' THEN 700.00
        ELSE 520.00
      END
    WHEN p.brand = 'SICK' AND c.slug = 'sick-rfid' THEN
      CASE
        WHEN p.sku REGEXP 'RFU650|RFU65X' THEN 1850.00
        WHEN p.sku LIKE 'RFU630%' THEN 1250.00
        WHEN p.sku REGEXP 'RFU620|RFU62X' THEN 820.00
        WHEN p.sku REGEXP 'RFH630' THEN 980.00
        WHEN p.sku REGEXP 'RFH620' THEN 780.00
        WHEN p.sku REGEXP 'RFH515' THEN 520.00
        ELSE 620.00
      END
    WHEN p.brand = 'SICK' AND c.slug = 'sick-ultrasonic-distance-sensors' THEN
      CASE
        WHEN p.sku LIKE 'DL100%' THEN 2200.00
        WHEN p.sku LIKE 'OD1000%' THEN 1800.00
        WHEN p.sku LIKE 'OD2%' THEN 650.00
        WHEN p.sku REGEXP 'DT35|DS35' THEN 360.00
        WHEN p.sku REGEXP 'UC30|UM30' THEN 280.00
        WHEN p.sku LIKE 'UM18%' THEN 180.00
        WHEN p.sku LIKE 'UC12%' THEN 140.00
        ELSE 95.00
      END
    ELSE NULL
  END AS target_price
FROM products p
JOIN categories c ON c.id = p.category_id
WHERE p.brand IN ('Mitsubishi', 'SICK');

UPDATE products p
JOIN tmp_seeded_product_prices priced ON priced.id = p.id
SET
  p.price = priced.target_price,
  p.compare_price = ROUND(priced.target_price * 1.18, 2),
  p.cost_price = ROUND(priced.target_price * 0.62, 2),
  p.updated_at = NOW(3)
WHERE priced.target_price IS NOT NULL
  AND (p.price IS NULL OR p.price = 0 OR p.compare_price IS NULL OR p.cost_price IS NULL);

SELECT p.brand, COUNT(*) total, SUM(p.price = 0 OR p.price IS NULL) zero_price, MIN(p.price) min_price, MAX(p.price) max_price, ROUND(AVG(p.price), 2) avg_price
FROM products p
WHERE p.brand IN ('Mitsubishi', 'SICK')
GROUP BY p.brand;

SELECT c.slug, c.name, COUNT(p.id) products, MIN(p.price) min_price, MAX(p.price) max_price, ROUND(AVG(p.price), 2) avg_price
FROM categories c
JOIN products p ON p.category_id = c.id
WHERE p.brand IN ('Mitsubishi', 'SICK')
GROUP BY c.id
ORDER BY c.slug;
