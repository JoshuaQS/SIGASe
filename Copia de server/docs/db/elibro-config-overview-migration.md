# eLibro Config Overview Migration (Manual Rollout)

## Context

This change adds backend support for the eLibro SSO configuration overview:

- `elibro_configs.name` (required display name)
- new table `elibro_validation_runs` for manual/scheduled validation telemetry

Runtime migration tooling is not enabled in this repository, so rollout is manual with a versioned SQL script.

## Script

Run:

- `docs/db/migrations/2026-04-02_add_elibro_config_name_and_validation_runs_mysql.sql`

## Deployment Steps

1. Create a DB backup/snapshot.
2. Put SIGASe backend in maintenance mode.
3. Execute the script in the target schema.
4. Validate:

```sql
SHOW COLUMNS FROM elibro_configs LIKE 'name';
SELECT COUNT(*) AS missing_name FROM elibro_configs WHERE name IS NULL OR TRIM(name) = '';
SHOW TABLES LIKE 'elibro_validation_runs';
SHOW INDEX FROM elibro_validation_runs;
```

5. Deploy backend build with the new eLibro overview endpoints.

## Compatibility Notes

- Existing `elibro_configs` rows are backfilled using `channel_name`.
- Existing endpoints remain compatible; new response fields are additive.
- `elibro_validation_runs.executed_by_admin_id` is nullable for future scheduled/system validations.
