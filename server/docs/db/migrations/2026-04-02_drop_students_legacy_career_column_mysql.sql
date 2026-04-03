-- SIGASe manual schema migration
-- Purpose: Remove legacy students.career column now that career_id is the source of truth.
-- Target DB: MySQL 8.x
-- Safe to run multiple times (idempotent).

START TRANSACTION;

SET @schema_name := DATABASE();

SET @students_has_legacy_career := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name
      AND TABLE_NAME = 'students'
      AND COLUMN_NAME = 'career'
);

SET @sql_drop_legacy_career := IF(
    @students_has_legacy_career = 1,
    'ALTER TABLE students DROP COLUMN career',
    'SELECT ''students.career already removed'''
);
PREPARE stmt_drop_legacy_career FROM @sql_drop_legacy_career;
EXECUTE stmt_drop_legacy_career;
DEALLOCATE PREPARE stmt_drop_legacy_career;

COMMIT;
