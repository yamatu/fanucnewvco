-- Datasheets.com product search API integration.
--
-- Three tables, all additive:
--   datasheet_settings        one row: encrypted API key, local quota counters
--   datasheet_lookup_caches   one row per normalised part number, so a repeated
--                             lookup costs no provider quota
--   product_datasheet_drafts  the review queue; a parameter reaches a product
--                             only after an administrator approves the draft
--
-- Column names match the Go models exactly, so AutoMigrate and this script
-- produce the same schema.

CREATE TABLE IF NOT EXISTS `datasheet_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `enabled` tinyint(1) NOT NULL DEFAULT 0,
  `api_key_enc` text,
  `api_key_from_env` tinyint(1) NOT NULL DEFAULT 0,
  `per_minute_limit` bigint NOT NULL DEFAULT 60,
  `per_hour_limit` bigint NOT NULL DEFAULT 500,
  `monthly_limit` bigint NOT NULL DEFAULT 5000,
  `auto_stop_percent` bigint NOT NULL DEFAULT 90,
  `cache_ttl_days` bigint NOT NULL DEFAULT 90,
  `default_page_limit` bigint NOT NULL DEFAULT 10,
  `quota_month` varchar(7) NOT NULL DEFAULT '',
  `monthly_used` bigint NOT NULL DEFAULT 0,
  `quota_reset_at` datetime(3) DEFAULT NULL,
  `last_call_at` datetime(3) DEFAULT NULL,
  `last_call_status` bigint NOT NULL DEFAULT 0,
  `last_call_query` varchar(160) NOT NULL DEFAULT '',
  `last_call_message` text,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `datasheet_lookup_caches` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `query_key` varchar(160) DEFAULT NULL,
  `mpn` varchar(160) DEFAULT NULL,
  `result_count` bigint NOT NULL DEFAULT 0,
  `match_count` bigint NOT NULL DEFAULT 0,
  `payload_json` mediumtext,
  `fetched_at` datetime(3) DEFAULT NULL,
  `expires_at` datetime(3) DEFAULT NULL,
  `last_hit_at` datetime(3) DEFAULT NULL,
  `hit_count` bigint NOT NULL DEFAULT 0,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uni_datasheet_lookup_caches_query_key` (`query_key`),
  KEY `idx_datasheet_lookup_caches_fetched_at` (`fetched_at`),
  KEY `idx_datasheet_lookup_caches_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `product_datasheet_drafts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint unsigned DEFAULT NULL,
  `sku` varchar(120) DEFAULT NULL,
  `brand` varchar(120) DEFAULT NULL,
  `model` varchar(160) DEFAULT NULL,
  `status` varchar(24) DEFAULT NULL,
  `source_mpn` varchar(160) DEFAULT NULL,
  `source_url` varchar(500) DEFAULT NULL,
  `source_title` varchar(255) DEFAULT NULL,
  `specs_json` json DEFAULT NULL,
  `candidates_json` json DEFAULT NULL,
  `notes` text,
  `requested_by` bigint unsigned DEFAULT NULL,
  `reviewed_by` bigint unsigned DEFAULT NULL,
  `reviewed_at` datetime(3) DEFAULT NULL,
  `applied_at` datetime(3) DEFAULT NULL,
  `reject_reason` text,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_product_datasheet_drafts_product_id` (`product_id`),
  KEY `idx_product_datasheet_drafts_sku` (`sku`),
  KEY `idx_product_datasheet_drafts_brand` (`brand`),
  KEY `idx_product_datasheet_drafts_model` (`model`),
  KEY `idx_product_datasheet_drafts_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed the singleton settings row with the provider defaults. The API key stays
-- empty: it is entered in the admin UI and stored encrypted.
INSERT INTO `datasheet_settings`
  (`enabled`, `api_key_enc`, `api_key_from_env`, `per_minute_limit`, `per_hour_limit`,
   `monthly_limit`, `auto_stop_percent`, `cache_ttl_days`, `default_page_limit`,
   `quota_month`, `monthly_used`, `last_call_status`, `last_call_query`, `last_call_message`,
   `created_at`, `updated_at`)
SELECT 1, '', 0, 60, 500, 5000, 90, 90, 10, '', 0, 0, '', '', NOW(3), NOW(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `datasheet_settings`);
