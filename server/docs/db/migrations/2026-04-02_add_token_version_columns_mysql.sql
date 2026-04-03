-- SIGASe manual schema migration
-- Purpose: Ensure session invalidation columns exist and are enforced.
-- Target DB: MySQL 8.x
-- Safe to run multiple times (idempotent).

START TRANSACTION;

SET @schema_name := DATABASE();

-- ── admins.token_version ───────────────────────────────────────────────
SET @admins_has_token_version := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME = 'admins'
      AND COLUMN_NAME = 'token_version'
);

SET @sql_admin_add := IF(
    @admins_has_token_version = 0,
    'ALTER TABLE admins ADD COLUMN token_version INT NOT NULL DEFAULT 0 AFTER failed_login_attempts',
    'SELECT ''admins.token_version already exists'''
);
PREPARE stmt_admin_add FROM @sql_admin_add;
EXECUTE stmt_admin_add;
DEALLOCATE PREPARE stmt_admin_add;

SET @sql_admin_backfill := IF(
    @admins_has_token_version = 0,
    'SELECT ''admins.token_version backfill skipped (column just created with DEFAULT 0)''',
    'UPDATE admins SET token_version = 0 WHERE token_version IS NULL'
);
PREPARE stmt_admin_backfill FROM @sql_admin_backfill;
EXECUTE stmt_admin_backfill;
DEALLOCATE PREPARE stmt_admin_backfill;

SET @sql_admin_enforce := IF(
    (SELECT COUNT(*)
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name
       AND TABLE_NAME = 'admins'
       AND COLUMN_NAME = 'token_version') = 1,
    'ALTER TABLE admins MODIFY COLUMN token_version INT NOT NULL DEFAULT 0',
    'SELECT ''admins.token_version does not exist; enforce skipped'''
);
PREPARE stmt_admin_enforce FROM @sql_admin_enforce;
EXECUTE stmt_admin_enforce;
DEALLOCATE PREPARE stmt_admin_enforce;

-- ── students.token_version ─────────────────────────────────────────────
SET @students_has_token_version := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME = 'students'
      AND COLUMN_NAME = 'token_version'
);

SET @sql_student_add := IF(
    @students_has_token_version = 0,
    'ALTER TABLE students ADD COLUMN token_version INT NOT NULL DEFAULT 0 AFTER quarter',
    'SELECT ''students.token_version already exists'''
);
PREPARE stmt_student_add FROM @sql_student_add;
EXECUTE stmt_student_add;
DEALLOCATE PREPARE stmt_student_add;

SET @sql_student_backfill := IF(
    @students_has_token_version = 0,
    'SELECT ''students.token_version backfill skipped (column just created with DEFAULT 0)''',
    'UPDATE students SET token_version = 0 WHERE token_version IS NULL'
);
PREPARE stmt_student_backfill FROM @sql_student_backfill;
EXECUTE stmt_student_backfill;
DEALLOCATE PREPARE stmt_student_backfill;

SET @sql_student_enforce := IF(
    (SELECT COUNT(*)
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @schema_name
       AND TABLE_NAME = 'students'
       AND COLUMN_NAME = 'token_version') = 1,
    'ALTER TABLE students MODIFY COLUMN token_version INT NOT NULL DEFAULT 0',
    'SELECT ''students.token_version does not exist; enforce skipped'''
);
PREPARE stmt_student_enforce FROM @sql_student_enforce;
EXECUTE stmt_student_enforce;
DEALLOCATE PREPARE stmt_student_enforce;

COMMIT;

-- Post-check (optional):
-- SELECT token_version, COUNT(*) FROM admins GROUP BY token_version;
-- SELECT token_version, COUNT(*) FROM students GROUP BY token_version;
