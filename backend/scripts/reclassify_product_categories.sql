UPDATE products p
JOIN (
  SELECT
    base.id,
    CASE
      WHEN base.brand_key IN ('mitsubishi', 'misubishi', 'melsec') OR base.text_key LIKE '%MITSUBISHI%' THEN
        CASE
          WHEN base.model_key LIKE 'MR-J4%' THEN 'melservo-mr-j4'
          WHEN base.model_key LIKE 'MR-J3%' THEN 'melservo-mr-j3'
          WHEN base.model_key LIKE 'MR-J2%' THEN 'melservo-mr-j2'
          WHEN base.model_key LIKE 'HC%' THEN 'melservo-hc'
          WHEN base.model_key LIKE 'HF%' THEN 'hf-series'
          WHEN base.model_key LIKE 'HG%' THEN 'hg-series'
          WHEN base.model_key LIKE 'FR-%' THEN 'freqrol-fr'
          WHEN base.model_key LIKE 'MDS%' THEN 'mds-servo-drives'
          WHEN base.model_key LIKE 'Q%' THEN 'melsec-q'
          WHEN base.model_key LIKE 'GOT%' OR base.model_key LIKE 'GT%' THEN 'got1000'
          WHEN base.model_key LIKE 'FX%' THEN 'fx-series'
          ELSE 'a-series'
        END
      WHEN base.brand_key IN ('ab', 'allenbradley', 'allen-bradley', 'rockwell') THEN
        CASE
          WHEN base.model_key REGEXP '^(20|22)' OR base.text_key LIKE '%POWERFLEX%' THEN 'variable-frequency-drive'
          ELSE 'ab'
        END
      WHEN base.brand_key = 'tamagawa' THEN
        CASE
          WHEN base.model_key REGEXP '^(TA|TAD)' THEN 'tamagawa-servo-drivers'
          WHEN base.model_key REGEXP '^(TS45|TS46|450|451)' THEN 'tamagawa-servo-motors'
          WHEN base.model_key REGEXP '^(TS26|TS24)' THEN 'tamagawa-resolvers-smartsyn'
          WHEN base.model_key REGEXP '^(TS56|TS57)' THEN 'tamagawa-absolute-encoders'
          WHEN base.model_key REGEXP '^(TS52|AU|OIH)' THEN 'tamagawa-rotary-encoders'
          ELSE 'tamagawa'
        END
      WHEN base.brand_key = 'sick' THEN 'sick'
      WHEN base.brand_key = 'fanuc' OR base.model_key REGEXP '^(A02B|A03B|A04B|A05B|A06B|A08B|A13B|A14B|A16B|A17B|A18B|A20B|A230|A250|A290|A300|A370|A660|A860|A9[078]L)' THEN
        CASE
          WHEN base.text_key REGEXP 'SPINDLE[[:space:]]+(AMPLIFIER|DRIVE)' OR base.model_key LIKE 'A06B-6111%' THEN 'fanuc-spindle-amplifier-drive'
          WHEN base.text_key REGEXP 'SPINDLE[[:space:]]+MOTOR' THEN 'fanuc-spindle-motor'
          WHEN base.model_key REGEXP '^A06B-6' THEN 'fanuc-servo-amplifier-drive'
          WHEN base.model_key REGEXP '^A06B-[0-4]' OR base.text_key REGEXP 'SERVO[[:space:]]+MOTOR' THEN 'fanuc-servo-motor'
          WHEN base.text_key REGEXP 'SERVO[[:space:]]+(AMPLIFIER|DRIVE)' THEN 'fanuc-servo-amplifier-drive'
          WHEN base.model_key REGEXP '^(A860)' OR base.text_key REGEXP '(ENCODER|PULSECODER|FEEDBACK)' THEN 'fanuc-encoder-feedback'
          WHEN base.model_key REGEXP '^(A660|A66L)' OR base.text_key REGEXP '(CABLE|CONNECTOR|HARNESS|PLUG|SOCKET)' THEN 'fanuc-cables-connectors'
          WHEN base.model_key REGEXP '^(A03B|A04B|A08B)' OR base.text_key REGEXP '(I/O|IO MODULE|INPUT MODULE|OUTPUT MODULE)' THEN 'fanuc-i-o-module'
          WHEN base.text_key REGEXP '(PENDANT|OPERATOR PANEL|MDI|KEYBOARD)' OR base.model_key REGEXP '^(A05B)' THEN 'fanuc-operator-panel-mdi'
          WHEN base.text_key REGEXP '(DISPLAY|MONITOR|LCD|CRT)' THEN 'fanuc-display-monitor'
          WHEN base.text_key REGEXP '(MEMORY|SRAM|ROM|STORAGE)' THEN 'fanuc-memory-storage'
          WHEN base.model_key LIKE 'A98L-0031%' OR base.text_key REGEXP '(BATTERY|BATTERIES)' THEN 'fanuc-battery'
          WHEN base.model_key REGEXP '^A90L' OR base.text_key REGEXP '(FILTER|COOLING|(^|[^A-Z])FAN([^A-Z]|$))' THEN 'fanuc-filters-fan-unit-cooling'
          WHEN base.model_key REGEXP '^(A14B|A50L|A58L|A60L)' OR base.text_key REGEXP '(POWER SUPPLY|PSU|FUSE|TRANSISTOR)' THEN 'fanuc-power-supply'
          WHEN base.model_key REGEXP '^(A02B|A16B|A17B|A18B|A20B|F02B|A15L)' OR base.text_key REGEXP '(PCB|BOARD|CPU|AXIS CONTROL|MAIN BOARD|CARD)' THEN 'fanuc-pcb-control-board'
          WHEN base.model_key REGEXP '^(A230|A250|A13B|A87L|A990|A980)' OR base.text_key REGEXP '(CNC SYSTEM|CONTROL UNIT|CONTROLLER)' THEN 'fanuc-cnc-system-parts'
          ELSE 'fanuc-accessories-others'
        END
      ELSE NULL
    END AS target_slug
  FROM (
    SELECT
      id,
      LOWER(REPLACE(REPLACE(REPLACE(COALESCE(brand, ''), ' ', ''), '_', ''), '--', '-')) AS brand_key,
      UPPER(COALESCE(NULLIF(model, ''), NULLIF(part_number, ''), sku)) AS model_key,
      UPPER(CONCAT_WS(' ', sku, name, model, part_number)) AS text_key
    FROM products
  ) base
) classified ON classified.id = p.id
JOIN categories c ON c.slug = classified.target_slug
SET
  p.category_id = c.id,
  p.updated_at = NOW(3)
WHERE classified.target_slug IS NOT NULL
  AND p.category_id <> c.id;
