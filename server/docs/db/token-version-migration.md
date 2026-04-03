# Token Version Migration (Manual Rollout)

## Context

`tokenVersion` is now part of SIGASe session hardening:

- `admins.token_version`
- `students.token_version`

JWT authentication rejects tokens whose `tokenVersion` claim is older than the current DB value.  
Because this repository currently does **not** use Flyway/Liquibase in runtime, rollout is managed with a versioned manual SQL script.

## Script

Run:

- `docs/db/migrations/2026-04-02_add_token_version_columns_mysql.sql`

This script is idempotent and enforces:

- column exists in both tables
- `INT NOT NULL DEFAULT 0`
- backfill null values to `0` when needed

## Execution Steps (Production-Safe)

1. Take DB backup/snapshot.
2. Put application in maintenance/read-only mode (recommended).
3. Execute the SQL script on the target schema:
   ```sql
   SOURCE docs/db/migrations/2026-04-02_add_token_version_columns_mysql.sql;
   ```
4. Validate result:
   ```sql
   SHOW COLUMNS FROM admins LIKE 'token_version';
   SHOW COLUMNS FROM students LIKE 'token_version';
   SELECT COUNT(*) AS admins_nulls FROM admins WHERE token_version IS NULL;
   SELECT COUNT(*) AS students_nulls FROM students WHERE token_version IS NULL;
   ```
5. Deploy backend version that enforces tokenVersion checks.

## Rollback Notes

Functional rollback should prioritize application rollback plus DB restore from backup.

Dropping `token_version` columns is **not** recommended once code depends on them.  
If a rollback is unavoidable, restore from snapshot taken before step 3.

## Compatibility

- Existing rows become compatible via default/backfill (`0`).
- Existing JWTs without `tokenVersion` are parsed as `0`; once password lifecycle increments version, stale tokens are invalidated as expected.
