-- Manual migration for SIGASe eLibro config overview support
-- Safe for MySQL 8+ environments.

ALTER TABLE elibro_configs
    ADD COLUMN IF NOT EXISTS name VARCHAR(160) NULL AFTER id;

UPDATE elibro_configs
SET name = COALESCE(NULLIF(TRIM(channel_name), ''), 'Configuración SSO eLibro')
WHERE name IS NULL OR TRIM(name) = '';

ALTER TABLE elibro_configs
    MODIFY COLUMN name VARCHAR(160) NOT NULL;

CREATE TABLE IF NOT EXISTS elibro_validation_runs (
    id CHAR(36) NOT NULL,
    config_id CHAR(36) NOT NULL,
    executed_by_admin_id CHAR(36) NULL,
    status VARCHAR(20) NOT NULL,
    validation_type VARCHAR(20) NOT NULL,
    message VARCHAR(500) NULL,
    latency_ms BIGINT NULL,
    error_code VARCHAR(80) NULL,
    endpoint_tested VARCHAR(512) NULL,
    request_id VARCHAR(80) NOT NULL,
    correlation_id VARCHAR(80) NOT NULL,
    checked_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_elibro_validation_runs_config
        FOREIGN KEY (config_id) REFERENCES elibro_configs (id) ON DELETE CASCADE,
    CONSTRAINT fk_elibro_validation_runs_admin
        FOREIGN KEY (executed_by_admin_id) REFERENCES admins (id)
);

CREATE INDEX idx_elibro_validation_runs_checked_at
    ON elibro_validation_runs (checked_at);

CREATE INDEX idx_elibro_validation_runs_config_checked_at
    ON elibro_validation_runs (config_id, checked_at);

CREATE INDEX idx_elibro_validation_runs_type_checked_at
    ON elibro_validation_runs (validation_type, checked_at);

CREATE INDEX idx_elibro_validation_runs_status_checked_at
    ON elibro_validation_runs (status, checked_at);
