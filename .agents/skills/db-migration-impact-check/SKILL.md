---
name: db-migration-impact-check
description: Analiza el impacto de refactors o migraciones SQL/JPA en SIGASe. Úsala cuando cambien scripts en `server/docs/db/migrations`, entidades JPA, columnas `status` o `token_version`, relaciones entre módulos, o cualquier campo que pueda romper repositories, DTOs, filtros, formularios, tablas, dashboard o exportaciones.
---

# Objetivo

Detectar impacto funcional, técnico y de QA antes de aceptar cambios de base de datos en SIGASe.

Esta skill existe porque el repo usa migraciones manuales versionadas en `server/docs/db/migrations/` y ya trae refactors recientes de modelo (`2026-04-05_model_refactor_mysql.sql`, `token_version`, `elibro_validation_runs`) con deuda de compatibilidad todavía visible en entidades y contratos.

# Cuándo usarla

- Cuando se agreguen, renombren o eliminen tablas, columnas, constraints o índices.
- Cuando se modifiquen enums, nullability, defaults, claves foráneas o campos auditables.
- Cuando cambien entidades en `server/src/main/java/mx/edu/utez/server/modules/**/entity`.
- Cuando un refactor de DB pueda tocar dashboard, reportes, logs, filtros o exportaciones.
- Cuando haya que revisar si un bridge legacy (`isActive`, `setActive`, nombres viejos de columnas) ya puede desaparecer.

# Instrucciones detalladas

1. Ubica la fuente del cambio.
   - Revisa primero el SQL en `server/docs/db/migrations/`.
   - Contrasta contra entidades, repositorios, DTOs y servicios del dominio afectado.
   - Si el cambio toca auth o eLibro, revisa también `server/docs/auth-session-contract.md` y docs de rollout asociadas.

2. Construye el mapa de impacto backend.
   - Lista tablas, columnas, relaciones, constraints e índices afectados.
   - Verifica impacto en:
     - `entity`
     - `repository`
     - `service`
     - `mapper`
     - `dto`
     - `controller`
   - Revisa queries derivadas, filtros, paginación, ordenamientos y joins.

3. Revisa breaking changes reales.
   - Renames de columna o cambio de enum.
   - `NULL` vs `NOT NULL`.
   - Fechas `Instant` y zonas horarias.
   - campos calculados usados por exportaciones
   - compatibilidad con datos históricos
   - payloads ya consumidos por frontend

4. Baja el impacto al frontend.
   - Revisa `client/src/lib/api/`, `client/src/types/api.ts` y páginas del dominio.
   - Valida formularios, tablas, filtros, badges, cards y exportaciones.
   - Si el cambio afecta dashboard o monitoreo, revisa `MonitoringAndReports.tsx` y los clientes de dashboard/reportes.

5. Revisa impacto transversal en SIGASe.
   - `dashboard`
   - `reports`
   - `logs/audit`
   - `elibro`
   - `students`
   - `admins`
   - auth y sesión si aparece `token_version`

6. Cierra con checklist de rollout.
   - SQL a ejecutar.
   - backfill requerido.
   - validaciones post-migración.
   - pruebas backend.
   - pruebas frontend.
   - riesgos de regresión y rollback.

# Formato de entrega

Entrega siempre en este orden:

1. Resumen del cambio de esquema.
2. Matriz de impacto con columnas:
   - objeto DB
   - cambio
   - backend afectado
   - frontend afectado
   - riesgo
3. Breaking changes detectados o ausencia explícita de ellos.
4. Checklist QA mínimo.
5. Recomendación final:
   - seguro
   - seguro con ajustes
   - no seguro todavía

# Criterios de calidad

- No te quedes en SQL: debes aterrizar el impacto hasta pantallas, filtros y exportaciones.
- Debes nombrar rutas o archivos reales del repo cuando exista evidencia.
- Debes señalar nullability, enums, fechas, joins y paginación si están implicados.
- Si el cambio toca datos usados por dashboard, confirma que siguen midiendo accesos reales a eLibro.
- Si ves compatibilidad legacy innecesaria, dilo explícitamente.
