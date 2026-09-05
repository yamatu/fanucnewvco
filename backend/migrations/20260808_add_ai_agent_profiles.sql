-- Named AI profiles and durable SEO-job profile snapshots (MySQL 8.0+).
--
-- This migration is additive and idempotent. It is intended for deployments
-- that deliberately set DB_AUTO_MIGRATE=false. MySQL DDL auto-commits, so take
-- a database backup before running it against production.
--
-- Run this after selecting the application database, for example:
--   mysql -u USER -p DATABASE < backend/migrations/20260808_add_ai_agent_profiles.sql

CREATE TABLE IF NOT EXISTS ai_agent_profiles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(80) NOT NULL,
    base_url VARCHAR(500) NOT NULL,
    api_key_enc TEXT NULL,
    model VARCHAR(120) NOT NULL,
    api_mode VARCHAR(32) NOT NULL DEFAULT 'standard_chat',
    reasoning_effort VARCHAR(32) NULL,
    timeout_seconds BIGINT NULL DEFAULT 75,
    created_at DATETIME(3) NULL,
    updated_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY idx_ai_agent_profiles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @schema_name = DATABASE();

SET @column_exists = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @schema_name AND table_name = 'ai_agent_profiles' AND column_name = 'api_mode'
);
SET @ddl = IF(
    @column_exists = 0,
    'ALTER TABLE ai_agent_profiles ADD COLUMN api_mode VARCHAR(32) NOT NULL DEFAULT ''standard_chat''',
    'SELECT 1'
);
PREPARE migration_statement FROM @ddl;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @column_exists = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @schema_name AND table_name = 'ai_agent_settings' AND column_name = 'active_profile_id'
);
SET @ddl = IF(
    @column_exists = 0,
    'ALTER TABLE ai_agent_settings ADD COLUMN active_profile_id BIGINT UNSIGNED NULL',
    'SELECT 1'
);
PREPARE migration_statement FROM @ddl;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @column_exists = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @schema_name AND table_name = 'ai_agent_settings' AND column_name = 'api_mode'
);
SET @ddl = IF(
    @column_exists = 0,
    'ALTER TABLE ai_agent_settings ADD COLUMN api_mode VARCHAR(32) NULL DEFAULT ''standard_chat''',
    'SELECT 1'
);
PREPARE migration_statement FROM @ddl;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @column_exists = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @schema_name AND table_name = 'ai_agent_seo_jobs' AND column_name = 'ai_profile_id'
);
SET @ddl = IF(
    @column_exists = 0,
    'ALTER TABLE ai_agent_seo_jobs ADD COLUMN ai_profile_id BIGINT UNSIGNED NULL',
    'SELECT 1'
);
PREPARE migration_statement FROM @ddl;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @column_exists = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @schema_name AND table_name = 'ai_agent_seo_jobs' AND column_name = 'ai_profile_name'
);
SET @ddl = IF(
    @column_exists = 0,
    'ALTER TABLE ai_agent_seo_jobs ADD COLUMN ai_profile_name VARCHAR(80) NULL',
    'SELECT 1'
);
PREPARE migration_statement FROM @ddl;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @column_exists = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @schema_name AND table_name = 'ai_agent_seo_jobs' AND column_name = 'ai_model'
);
SET @ddl = IF(
    @column_exists = 0,
    'ALTER TABLE ai_agent_seo_jobs ADD COLUMN ai_model VARCHAR(120) NULL',
    'SELECT 1'
);
PREPARE migration_statement FROM @ddl;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @column_exists = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @schema_name AND table_name = 'ai_agent_seo_jobs' AND column_name = 'ai_api_mode'
);
SET @ddl = IF(
    @column_exists = 0,
    'ALTER TABLE ai_agent_seo_jobs ADD COLUMN ai_api_mode VARCHAR(32) NULL',
    'SELECT 1'
);
PREPARE migration_statement FROM @ddl;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @index_exists = (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = @schema_name AND table_name = 'ai_agent_settings' AND index_name = 'idx_ai_agent_settings_active_profile_id'
);
SET @ddl = IF(
    @index_exists = 0,
    'CREATE INDEX idx_ai_agent_settings_active_profile_id ON ai_agent_settings (active_profile_id)',
    'SELECT 1'
);
PREPARE migration_statement FROM @ddl;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @index_exists = (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = @schema_name AND table_name = 'ai_agent_seo_jobs' AND index_name = 'idx_ai_agent_seo_jobs_ai_profile_id'
);
SET @ddl = IF(
    @index_exists = 0,
    'CREATE INDEX idx_ai_agent_seo_jobs_ai_profile_id ON ai_agent_seo_jobs (ai_profile_id)',
    'SELECT 1'
);
PREPARE migration_statement FROM @ddl;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

UPDATE ai_agent_settings
SET api_mode = 'standard_chat'
WHERE api_mode IS NULL OR api_mode = '';

UPDATE ai_agent_profiles
SET api_mode = 'standard_chat'
WHERE api_mode IS NULL OR api_mode = '';

INSERT INTO ai_agent_profiles (
    name, base_url, api_key_enc, model, api_mode, reasoning_effort,
    timeout_seconds, created_at, updated_at
)
SELECT
    'Default',
    COALESCE(NULLIF(base_url, ''), 'https://api.openai.com/v1'),
    api_key_enc,
    COALESCE(NULLIF(model, ''), 'gpt-5.6-terra'),
    COALESCE(NULLIF(api_mode, ''), 'standard_chat'),
    reasoning_effort,
    CASE WHEN timeout_seconds > 0 THEN timeout_seconds ELSE 75 END,
    UTC_TIMESTAMP(3),
    UTC_TIMESTAMP(3)
FROM ai_agent_settings
WHERE id = 1
  AND NOT EXISTS (SELECT 1 FROM ai_agent_profiles);

UPDATE ai_agent_settings AS settings
SET active_profile_id = (
    SELECT profiles.id FROM ai_agent_profiles AS profiles ORDER BY profiles.id ASC LIMIT 1
)
WHERE settings.id = 1
  AND EXISTS (SELECT 1 FROM ai_agent_profiles)
  AND (
      settings.active_profile_id IS NULL
      OR NOT EXISTS (
          SELECT 1 FROM ai_agent_profiles AS active_profile
          WHERE active_profile.id = settings.active_profile_id
      )
  );

SELECT 'AI profile schema migration completed' AS status;
