-- SIGASe manual schema migration
-- Purpose: Model refactor — enum status columns, new log tables, extended audit_logs.
-- Target DB: MySQL 8.x
-- Safe to run multiple times (idempotent).

START TRANSACTION;

SET @schema_name := DATABASE();

DROP TABLE IF EXISTS access_logs;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. admins: full_name → name (if legacy column exists)
-- ═══════════════════════════════════════════════════════════════════════════
SET @admins_has_full_name := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME   = 'admins'
      AND COLUMN_NAME  = 'full_name'
);
SET @sql := IF(
    @admins_has_full_name > 0,
    'ALTER TABLE admins RENAME COLUMN full_name TO name',
    'SELECT ''admins.full_name not present, skipping rename'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── admins: active (TINYINT) → status (VARCHAR 16) ─────────────────────
SET @admins_has_active := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME   = 'admins'
      AND COLUMN_NAME  = 'active'
);
SET @admins_has_status := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME   = 'admins'
      AND COLUMN_NAME  = 'status'
);

-- Add status column if missing
SET @sql := IF(
    @admins_has_status = 0,
    'ALTER TABLE admins ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT ''ACTIVE'' AFTER active',
    'SELECT ''admins.status already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill status from active
SET @sql := IF(
    @admins_has_active > 0 AND @admins_has_status = 0,
    'UPDATE admins SET status = CASE WHEN active = 1 THEN ''ACTIVE'' ELSE ''INACTIVE'' END',
    'SELECT ''admins.status backfill skipped'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Drop active column
SET @sql := IF(
    @admins_has_active > 0,
    'ALTER TABLE admins DROP COLUMN active',
    'SELECT ''admins.active already removed'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add index on status
SET @admins_has_idx_status := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME   = 'admins'
      AND INDEX_NAME   = 'idx_admins_status'
);
SET @sql := IF(
    @admins_has_idx_status = 0,
    'ALTER TABLE admins ADD INDEX idx_admins_status (status)',
    'SELECT ''idx_admins_status already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. students: full_name → name (if legacy column exists)
-- ═══════════════════════════════════════════════════════════════════════════
SET @students_has_full_name := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME   = 'students'
      AND COLUMN_NAME  = 'full_name'
);
SET @sql := IF(
    @students_has_full_name > 0,
    'ALTER TABLE students RENAME COLUMN full_name TO name',
    'SELECT ''students.full_name not present, skipping rename'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── students: drop legacy deactivation columns ──────────────────────────
SET @col := 'deactivated_at';
SET @sql := (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'students' AND COLUMN_NAME = @col) > 0,
    CONCAT('ALTER TABLE students DROP COLUMN ', @col),
    CONCAT('SELECT ''students.', @col, ' not present''')));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := 'deactivation_reason';
SET @sql := (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'students' AND COLUMN_NAME = @col) > 0,
    CONCAT('ALTER TABLE students DROP COLUMN ', @col),
    CONCAT('SELECT ''students.', @col, ' not present''')));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := 'reactivated_at';
SET @sql := (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'students' AND COLUMN_NAME = @col) > 0,
    CONCAT('ALTER TABLE students DROP COLUMN ', @col),
    CONCAT('SELECT ''students.', @col, ' not present''')));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := 'reactivation_reason';
SET @sql := (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'students' AND COLUMN_NAME = @col) > 0,
    CONCAT('ALTER TABLE students DROP COLUMN ', @col),
    CONCAT('SELECT ''students.', @col, ' not present''')));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. careers: is_active (TINYINT) → status (VARCHAR 16)
-- ═══════════════════════════════════════════════════════════════════════════
SET @careers_has_is_active := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME   = 'careers'
      AND COLUMN_NAME  = 'is_active'
);
SET @careers_has_status := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME   = 'careers'
      AND COLUMN_NAME  = 'status'
);

SET @sql := IF(
    @careers_has_status = 0,
    'ALTER TABLE careers ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT ''ACTIVE'' AFTER is_active',
    'SELECT ''careers.status already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    @careers_has_is_active > 0 AND @careers_has_status = 0,
    'UPDATE careers SET status = CASE WHEN is_active = 1 THEN ''ACTIVE'' ELSE ''INACTIVE'' END',
    'SELECT ''careers.status backfill skipped'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    @careers_has_is_active > 0,
    'ALTER TABLE careers DROP COLUMN is_active',
    'SELECT ''careers.is_active already removed'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Rename index idx_careers_active → idx_careers_status
SET @has_old_idx := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'careers' AND INDEX_NAME = 'idx_careers_active'
);
SET @has_new_idx := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'careers' AND INDEX_NAME = 'idx_careers_status'
);
SET @sql := IF(@has_old_idx > 0, 'ALTER TABLE careers DROP INDEX idx_careers_active', 'SELECT ''idx_careers_active not found''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_new_idx = 0, 'ALTER TABLE careers ADD INDEX idx_careers_status (status)', 'SELECT ''idx_careers_status already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. elibro_configs: remove auth_endpoint, keep next_url, unique name, status, single ACTIVE
-- ═══════════════════════════════════════════════════════════════════════════
SET @ec_has_active := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'elibro_configs' AND COLUMN_NAME = 'active'
);
SET @ec_has_status := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'elibro_configs' AND COLUMN_NAME = 'status'
);

SET @sql := IF(
    @ec_has_status = 0,
    'ALTER TABLE elibro_configs ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT ''ACTIVE'' AFTER active',
    'SELECT ''elibro_configs.status already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    @ec_has_active > 0 AND @ec_has_status = 0,
    'UPDATE elibro_configs SET status = CASE WHEN active = 1 THEN ''ACTIVE'' ELSE ''INACTIVE'' END',
    'SELECT ''elibro_configs.status backfill skipped'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    @ec_has_active > 0,
    'ALTER TABLE elibro_configs DROP COLUMN active',
    'SELECT ''elibro_configs.active already removed'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add next_url column
SET @ec_has_next_url := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'elibro_configs' AND COLUMN_NAME = 'next_url'
);
SET @sql := IF(
    @ec_has_next_url = 0,
    'ALTER TABLE elibro_configs ADD COLUMN next_url VARCHAR(512) NULL AFTER channel_name',
    'SELECT ''elibro_configs.next_url already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Drop auth_endpoint column if present
SET @ec_has_auth_endpoint := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'elibro_configs' AND COLUMN_NAME = 'auth_endpoint'
);
SET @sql := IF(
    @ec_has_auth_endpoint > 0,
    'ALTER TABLE elibro_configs DROP COLUMN auth_endpoint',
    'SELECT ''elibro_configs.auth_endpoint already removed'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add indexes
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'elibro_configs' AND INDEX_NAME = 'idx_elibro_configs_status') = 0,
    'ALTER TABLE elibro_configs ADD INDEX idx_elibro_configs_status (status)',
    'SELECT ''idx_elibro_configs_status already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ensure at most one ACTIVE config via generated marker + unique index
SET @ec_has_active_marker := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'elibro_configs' AND COLUMN_NAME = 'active_unique_marker'
);
SET @sql := IF(
    @ec_has_active_marker = 0,
    'ALTER TABLE elibro_configs ADD COLUMN active_unique_marker TINYINT GENERATED ALWAYS AS (CASE WHEN status = ''ACTIVE'' THEN 1 ELSE NULL END) STORED',
    'SELECT ''elibro_configs.active_unique_marker already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'elibro_configs' AND INDEX_NAME = 'uq_elibro_configs_single_active') = 0,
    'ALTER TABLE elibro_configs ADD UNIQUE INDEX uq_elibro_configs_single_active (active_unique_marker)',
    'SELECT ''uq_elibro_configs_single_active already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Make name UNIQUE (add unique index if missing)
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'elibro_configs' AND INDEX_NAME = 'idx_elibro_configs_name') = 0,
    'ALTER TABLE elibro_configs ADD UNIQUE INDEX idx_elibro_configs_name (name)',
    'SELECT ''idx_elibro_configs_name already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. elibro_validation_runs: status ERROR → FAILURE
-- ═══════════════════════════════════════════════════════════════════════════
SET @has_error_status := (
    SELECT COUNT(*) FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'elibro_validation_runs'
);
SET @sql := IF(
    @has_error_status > 0,
    'UPDATE elibro_validation_runs SET status = ''FAILURE'' WHERE status = ''ERROR''',
    'SELECT ''elibro_validation_runs table not found, skipping'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. CREATE TABLE elibro_access_logs
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS elibro_access_logs (
    id                  CHAR(36)     NOT NULL,
    student_id          CHAR(36)     NULL,
    attempted_email     VARCHAR(254) NULL,
    normalized_email    VARCHAR(254) NULL,
    result              VARCHAR(50)  NOT NULL,
    error_code          VARCHAR(60)  NULL,
    error_detail        VARCHAR(500) NULL,
    latency_ms          BIGINT       NOT NULL DEFAULT 0,
    request_id          VARCHAR(80)  NOT NULL,
    correlation_id      VARCHAR(80)  NOT NULL,
    ip_address_masked   VARCHAR(60)  NULL,
    ip_address_hash     VARCHAR(64)  NULL,
    user_agent_sanitized VARCHAR(255) NULL,
    session_id          VARCHAR(128) NULL,
    origin              VARCHAR(254) NULL,
    referer             VARCHAR(512) NULL,
    http_method         VARCHAR(10)  NULL,
    request_path        VARCHAR(512) NULL,
    channel_name_snapshot VARCHAR(120) NULL,
    provider_status_code INT         NULL,
    provider_error_code VARCHAR(60)  NULL,
    provider_error_message VARCHAR(500) NULL,
    metadata_json       JSON         NULL,
    next_url            VARCHAR(1000) NULL,
    redirect_url        VARCHAR(1000) NULL,
    occurred_at         DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX idx_elibro_access_logs_occurred_at  (occurred_at),
    INDEX idx_elibro_access_logs_student_id   (student_id),
    INDEX idx_elibro_access_logs_result       (result),
    INDEX idx_elibro_access_logs_norm_email   (normalized_email),
    INDEX idx_elibro_access_logs_request_id   (request_id),
    CONSTRAINT fk_elibro_access_logs_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Align legacy elibro_access_logs shape (if table existed before this migration)
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'elibro_access_logs' AND COLUMN_NAME = 'ip_address') > 0,
    'ALTER TABLE elibro_access_logs DROP COLUMN ip_address',
    'SELECT ''elibro_access_logs.ip_address already removed'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'elibro_access_logs' AND COLUMN_NAME = 'user_agent') > 0,
    'ALTER TABLE elibro_access_logs DROP COLUMN user_agent',
    'SELECT ''elibro_access_logs.user_agent already removed'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'elibro_access_logs' AND COLUMN_NAME = 'ip_address_masked') = 0,
    'ALTER TABLE elibro_access_logs ADD COLUMN ip_address_masked VARCHAR(60) NULL AFTER correlation_id',
    'SELECT ''elibro_access_logs.ip_address_masked already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'elibro_access_logs' AND COLUMN_NAME = 'ip_address_hash') = 0,
    'ALTER TABLE elibro_access_logs ADD COLUMN ip_address_hash VARCHAR(64) NULL AFTER ip_address_masked',
    'SELECT ''elibro_access_logs.ip_address_hash already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'elibro_access_logs' AND COLUMN_NAME = 'user_agent_sanitized') = 0,
    'ALTER TABLE elibro_access_logs ADD COLUMN user_agent_sanitized VARCHAR(255) NULL AFTER ip_address_hash',
    'SELECT ''elibro_access_logs.user_agent_sanitized already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'elibro_access_logs' AND COLUMN_NAME = 'session_id') = 0,
    'ALTER TABLE elibro_access_logs ADD COLUMN session_id VARCHAR(128) NULL AFTER user_agent_sanitized',
    'SELECT ''elibro_access_logs.session_id already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'elibro_access_logs' AND COLUMN_NAME = 'origin') = 0,
    'ALTER TABLE elibro_access_logs ADD COLUMN origin VARCHAR(254) NULL AFTER session_id',
    'SELECT ''elibro_access_logs.origin already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'elibro_access_logs' AND COLUMN_NAME = 'referer') = 0,
    'ALTER TABLE elibro_access_logs ADD COLUMN referer VARCHAR(512) NULL AFTER origin',
    'SELECT ''elibro_access_logs.referer already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'elibro_access_logs' AND COLUMN_NAME = 'http_method') = 0,
    'ALTER TABLE elibro_access_logs ADD COLUMN http_method VARCHAR(10) NULL AFTER referer',
    'SELECT ''elibro_access_logs.http_method already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'elibro_access_logs' AND COLUMN_NAME = 'request_path') = 0,
    'ALTER TABLE elibro_access_logs ADD COLUMN request_path VARCHAR(512) NULL AFTER http_method',
    'SELECT ''elibro_access_logs.request_path already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'elibro_access_logs' AND COLUMN_NAME = 'channel_name_snapshot') = 0,
    'ALTER TABLE elibro_access_logs ADD COLUMN channel_name_snapshot VARCHAR(120) NULL AFTER request_path',
    'SELECT ''elibro_access_logs.channel_name_snapshot already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'elibro_access_logs' AND COLUMN_NAME = 'provider_status_code') = 0,
    'ALTER TABLE elibro_access_logs ADD COLUMN provider_status_code INT NULL AFTER channel_name_snapshot',
    'SELECT ''elibro_access_logs.provider_status_code already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'elibro_access_logs' AND COLUMN_NAME = 'provider_error_code') = 0,
    'ALTER TABLE elibro_access_logs ADD COLUMN provider_error_code VARCHAR(60) NULL AFTER provider_status_code',
    'SELECT ''elibro_access_logs.provider_error_code already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'elibro_access_logs' AND COLUMN_NAME = 'provider_error_message') = 0,
    'ALTER TABLE elibro_access_logs ADD COLUMN provider_error_message VARCHAR(500) NULL AFTER provider_error_code',
    'SELECT ''elibro_access_logs.provider_error_message already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'elibro_access_logs' AND COLUMN_NAME = 'metadata_json') = 0,
    'ALTER TABLE elibro_access_logs ADD COLUMN metadata_json JSON NULL AFTER provider_error_message',
    'SELECT ''elibro_access_logs.metadata_json already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. CREATE TABLE student_auth_events
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS student_auth_events (
    id                  CHAR(36)     NOT NULL,
    student_id          CHAR(36)     NULL,
    attempted_email     VARCHAR(254) NULL,
    normalized_email    VARCHAR(254) NULL,
    auth_method         VARCHAR(16)  NOT NULL,
    result              VARCHAR(50)  NOT NULL,
    error_code          VARCHAR(60)  NULL,
    error_detail        VARCHAR(500) NULL,
    request_id          VARCHAR(80)  NOT NULL,
    correlation_id      VARCHAR(80)  NOT NULL,
    google_subject      VARCHAR(128) NULL,
    ip_address_masked   VARCHAR(60)  NULL,
    ip_address_hash     VARCHAR(64)  NULL,
    user_agent_sanitized VARCHAR(255) NULL,
    session_id          VARCHAR(128) NULL,
    origin              VARCHAR(254) NULL,
    referer             VARCHAR(512) NULL,
    http_method         VARCHAR(10)  NULL,
    request_path        VARCHAR(512) NULL,
    metadata_json       JSON         NULL,
    occurred_at         DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX idx_student_auth_events_occurred_at  (occurred_at),
    INDEX idx_student_auth_events_student_id   (student_id),
    INDEX idx_student_auth_events_result       (result),
    INDEX idx_student_auth_events_norm_email   (normalized_email),
    INDEX idx_student_auth_events_auth_method  (auth_method),
    INDEX idx_student_auth_events_request_id   (request_id),
    CONSTRAINT fk_student_auth_events_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Align legacy student_auth_events shape (if table existed before this migration)
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'student_auth_events' AND COLUMN_NAME = 'ip_address') > 0,
    'ALTER TABLE student_auth_events DROP COLUMN ip_address',
    'SELECT ''student_auth_events.ip_address already removed'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'student_auth_events' AND COLUMN_NAME = 'user_agent') > 0,
    'ALTER TABLE student_auth_events DROP COLUMN user_agent',
    'SELECT ''student_auth_events.user_agent already removed'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'student_auth_events' AND COLUMN_NAME = 'google_subject') = 0,
    'ALTER TABLE student_auth_events ADD COLUMN google_subject VARCHAR(128) NULL AFTER correlation_id',
    'SELECT ''student_auth_events.google_subject already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'student_auth_events' AND COLUMN_NAME = 'ip_address_masked') = 0,
    'ALTER TABLE student_auth_events ADD COLUMN ip_address_masked VARCHAR(60) NULL AFTER google_subject',
    'SELECT ''student_auth_events.ip_address_masked already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'student_auth_events' AND COLUMN_NAME = 'ip_address_hash') = 0,
    'ALTER TABLE student_auth_events ADD COLUMN ip_address_hash VARCHAR(64) NULL AFTER ip_address_masked',
    'SELECT ''student_auth_events.ip_address_hash already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'student_auth_events' AND COLUMN_NAME = 'user_agent_sanitized') = 0,
    'ALTER TABLE student_auth_events ADD COLUMN user_agent_sanitized VARCHAR(255) NULL AFTER ip_address_hash',
    'SELECT ''student_auth_events.user_agent_sanitized already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'student_auth_events' AND COLUMN_NAME = 'session_id') = 0,
    'ALTER TABLE student_auth_events ADD COLUMN session_id VARCHAR(128) NULL AFTER user_agent_sanitized',
    'SELECT ''student_auth_events.session_id already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'student_auth_events' AND COLUMN_NAME = 'origin') = 0,
    'ALTER TABLE student_auth_events ADD COLUMN origin VARCHAR(254) NULL AFTER session_id',
    'SELECT ''student_auth_events.origin already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'student_auth_events' AND COLUMN_NAME = 'referer') = 0,
    'ALTER TABLE student_auth_events ADD COLUMN referer VARCHAR(512) NULL AFTER origin',
    'SELECT ''student_auth_events.referer already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'student_auth_events' AND COLUMN_NAME = 'http_method') = 0,
    'ALTER TABLE student_auth_events ADD COLUMN http_method VARCHAR(10) NULL AFTER referer',
    'SELECT ''student_auth_events.http_method already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'student_auth_events' AND COLUMN_NAME = 'request_path') = 0,
    'ALTER TABLE student_auth_events ADD COLUMN request_path VARCHAR(512) NULL AFTER http_method',
    'SELECT ''student_auth_events.request_path already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'student_auth_events' AND COLUMN_NAME = 'metadata_json') = 0,
    'ALTER TABLE student_auth_events ADD COLUMN metadata_json JSON NULL AFTER request_path',
    'SELECT ''student_auth_events.metadata_json already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. CREATE TABLE student_status_history
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS student_status_history (
    id                  CHAR(36)     NOT NULL,
    student_id          CHAR(36)     NOT NULL,
    from_status         VARCHAR(16)  NULL,
    to_status           VARCHAR(16)  NOT NULL,
    reason              VARCHAR(500) NOT NULL,
    changed_by_admin_id CHAR(36)     NOT NULL,
    occurred_at         DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX idx_student_status_history_student_id  (student_id),
    INDEX idx_student_status_history_occurred_at (occurred_at),
    CONSTRAINT fk_student_status_history_student       FOREIGN KEY (student_id)          REFERENCES students (id) ON DELETE CASCADE,
    CONSTRAINT fk_student_status_history_changed_admin FOREIGN KEY (changed_by_admin_id) REFERENCES admins   (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Enforce non-null reason/changed_by_admin_id for existing student_status_history records
SET @ssh_has_table := (
    SELECT COUNT(*) FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'student_status_history'
);
SET @ssh_has_reason := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'student_status_history' AND COLUMN_NAME = 'reason'
);
SET @ssh_has_changed_by_admin := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'student_status_history' AND COLUMN_NAME = 'changed_by_admin_id'
);

SET @sql := IF(
    @ssh_has_table > 0 AND @ssh_has_reason > 0,
    'UPDATE student_status_history SET reason = ''Sin motivo registrado'' WHERE reason IS NULL OR TRIM(reason) = ''''',
    'SELECT ''student_status_history.reason backfill skipped'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ssh_fallback_admin_id := (
    SELECT id FROM admins ORDER BY created_at ASC LIMIT 1
);
SET @sql := IF(
    @ssh_has_table > 0 AND @ssh_has_changed_by_admin > 0 AND @ssh_fallback_admin_id IS NOT NULL,
    CONCAT(
            'UPDATE student_status_history SET changed_by_admin_id = ''',
            @ssh_fallback_admin_id,
            ''' WHERE changed_by_admin_id IS NULL'
    ),
    'SELECT ''student_status_history.changed_by_admin_id backfill skipped'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ssh_null_changed_admin_count := IF(
    @ssh_has_table > 0 AND @ssh_has_changed_by_admin > 0,
    (SELECT COUNT(*) FROM student_status_history WHERE changed_by_admin_id IS NULL),
    0
);

SET @sql := IF(
    @ssh_has_table > 0 AND @ssh_has_reason > 0,
    'ALTER TABLE student_status_history MODIFY COLUMN reason VARCHAR(500) NOT NULL',
    'SELECT ''student_status_history.reason NOT NULL skipped'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    @ssh_has_table > 0 AND @ssh_has_changed_by_admin > 0 AND @ssh_null_changed_admin_count = 0,
    'ALTER TABLE student_status_history MODIFY COLUMN changed_by_admin_id CHAR(36) NOT NULL',
    'SELECT ''student_status_history.changed_by_admin_id NOT NULL skipped (pending nulls or missing column)'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. audit_logs: add extended columns
-- ═══════════════════════════════════════════════════════════════════════════

-- source_module
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'source_module') = 0,
    'ALTER TABLE audit_logs ADD COLUMN source_module VARCHAR(20) NULL AFTER occurred_at',
    'SELECT ''audit_logs.source_module already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- description
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'description') = 0,
    'ALTER TABLE audit_logs ADD COLUMN description VARCHAR(500) NULL AFTER source_module',
    'SELECT ''audit_logs.description already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- entity_snapshot_name
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'entity_snapshot_name') = 0,
    'ALTER TABLE audit_logs ADD COLUMN entity_snapshot_name VARCHAR(160) NULL AFTER description',
    'SELECT ''audit_logs.entity_snapshot_name already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- target_label
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'target_label') = 0,
    'ALTER TABLE audit_logs ADD COLUMN target_label VARCHAR(254) NULL AFTER entity_snapshot_name',
    'SELECT ''audit_logs.target_label already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- http_method
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'http_method') = 0,
    'ALTER TABLE audit_logs ADD COLUMN http_method VARCHAR(10) NULL AFTER target_label',
    'SELECT ''audit_logs.http_method already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- endpoint
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'endpoint') = 0,
    'ALTER TABLE audit_logs ADD COLUMN endpoint VARCHAR(512) NULL AFTER http_method',
    'SELECT ''audit_logs.endpoint already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- route_pattern
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'route_pattern') = 0,
    'ALTER TABLE audit_logs ADD COLUMN route_pattern VARCHAR(256) NULL AFTER endpoint',
    'SELECT ''audit_logs.route_pattern already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- status_code
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'status_code') = 0,
    'ALTER TABLE audit_logs ADD COLUMN status_code INT NULL AFTER route_pattern',
    'SELECT ''audit_logs.status_code already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- origin
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'origin') = 0,
    'ALTER TABLE audit_logs ADD COLUMN origin VARCHAR(254) NULL AFTER status_code',
    'SELECT ''audit_logs.origin already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- session_id
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'session_id') = 0,
    'ALTER TABLE audit_logs ADD COLUMN session_id VARCHAR(128) NULL AFTER origin',
    'SELECT ''audit_logs.session_id already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ip_address_masked
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'ip_address_masked') = 0,
    'ALTER TABLE audit_logs ADD COLUMN ip_address_masked VARCHAR(60) NULL AFTER session_id',
    'SELECT ''audit_logs.ip_address_masked already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ip_address_hash
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'ip_address_hash') = 0,
    'ALTER TABLE audit_logs ADD COLUMN ip_address_hash VARCHAR(64) NULL AFTER ip_address_masked',
    'SELECT ''audit_logs.ip_address_hash already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- user_agent_sanitized
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'user_agent_sanitized') = 0,
    'ALTER TABLE audit_logs ADD COLUMN user_agent_sanitized VARCHAR(300) NULL AFTER ip_address_hash',
    'SELECT ''audit_logs.user_agent_sanitized already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- changed_fields_json
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'changed_fields_json') = 0,
    'ALTER TABLE audit_logs ADD COLUMN changed_fields_json JSON NULL AFTER user_agent_sanitized',
    'SELECT ''audit_logs.changed_fields_json already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill + enforce NOT NULL for source_module and severity
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'source_module') > 0,
    'UPDATE audit_logs SET source_module = ''SYSTEM'' WHERE source_module IS NULL OR TRIM(source_module) = ''''',
    'SELECT ''audit_logs.source_module backfill skipped'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'severity') > 0,
    'UPDATE audit_logs SET severity = ''INFO'' WHERE severity IS NULL OR TRIM(severity) = ''''',
    'SELECT ''audit_logs.severity backfill skipped'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'source_module') > 0,
    'ALTER TABLE audit_logs MODIFY COLUMN source_module VARCHAR(20) NOT NULL',
    'SELECT ''audit_logs.source_module NOT NULL skipped'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'severity') > 0,
    'ALTER TABLE audit_logs MODIFY COLUMN severity VARCHAR(20) NOT NULL',
    'SELECT ''audit_logs.severity NOT NULL skipped'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add indexes for new audit_log columns
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'audit_logs' AND INDEX_NAME = 'idx_audit_logs_source_module') = 0,
    'ALTER TABLE audit_logs ADD INDEX idx_audit_logs_source_module (source_module)',
    'SELECT ''idx_audit_logs_source_module already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'audit_logs' AND INDEX_NAME = 'idx_audit_logs_outcome') = 0,
    'ALTER TABLE audit_logs ADD INDEX idx_audit_logs_outcome (outcome)',
    'SELECT ''idx_audit_logs_outcome already exists'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

COMMIT;

-- ── Verification queries (run manually if needed) ────────────────────────
-- SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_NAME = 'admins' AND TABLE_SCHEMA = DATABASE();
-- SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_NAME = 'careers' AND TABLE_SCHEMA = DATABASE();
-- SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_NAME = 'elibro_configs' AND TABLE_SCHEMA = DATABASE();
-- SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('elibro_access_logs','student_auth_events','student_status_history');
-- SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_NAME = 'audit_logs' AND TABLE_SCHEMA = DATABASE() ORDER BY ORDINAL_POSITION;
