# Referencia de Filtros: Access Logs y Audit Logs

Este documento enumera filtros reales detectados en el código (frontend + backend), sus valores y diferencias entre capas.

## Access Logs

Fuentes revisadas:
- `client/src/features/access-logs/components/filters/access-logs-filter-fields.ts`
- `client/src/features/access-logs/api/access-logs-api.ts`
- `server/src/main/java/mx/edu/utez/server/modules/accesslogs/controller/AccessLogQueryController.java`
- `server/src/main/java/mx/edu/utez/server/modules/accesslogs/service/AccessLogQueryService.java`

### Catálogo de filtros

| Nombre técnico (UI state) | Param backend | Etiqueta UI | Valores posibles | Qué filtra |
|---|---|---|---|---|
| `actorType` | `actorType` | Tipo de actor | `ALL`, `STUDENT`, `ADMIN` | Tipo de actor del evento de acceso. |
| `scope` | `scope` | Scope | `ALL`, `SIGASE_LOCAL`, `SIGASE_GOOGLE`, `ELIBRO`, `ADMIN_LOGIN` | Fuente/canal del evento. |
| `result` | `result` | Resultado | `''` (todos) + catálogo de resultados | Resultado final del intento de acceso. |
| `sort` | `sort` | Orden | `occurredAt,desc`, `occurredAt,asc`, `result,asc`, `scope,asc` | Ordenamiento del listado. |
| `dateFrom` | `dateFrom` | Fecha inicial | ISO datetime | Límite inferior de fecha/hora. |
| `dateTo` | `dateTo` | Fecha final | ISO datetime | Límite superior de fecha/hora. |
| `studentId` | `studentId` | Student ID | UUID | Filtra por estudiante específico. |
| `adminId` | `adminId` | Admin ID | UUID | Filtra por admin específico. |
| `careerId` | `careerId` | Career ID | UUID | Filtra por carrera específica. |
| `search` | `search` | (barra de búsqueda) | texto libre | Búsqueda textual en actor/correo/ids/campos del log. |
| `page` | `page` | (paginación) | entero >= 0 | Página actual. |
| `size` | `size` | (page size) | entero > 0 | Tamaño de página. |

### Acciones / entidades / severidad / scope

- Acciones: **No aplica** en Access Logs.
- Entidades: **No aplica** como filtro dedicado.
- Tipos de actor: `STUDENT`, `ADMIN`.
- Resultados: catálogo de `AccessLogResult` (auth local/google/admin + eLibro).
- Severidad: **No aplica** en Access Logs.
- Scope: `SIGASE_LOCAL`, `SIGASE_GOOGLE`, `ELIBRO`, `ADMIN_LOGIN`.

### Resultados de Access Logs en UI

Valores expuestos por UI (`ACCESS_LOG_RESULT_OPTIONS`):

- `SUCCESS`
- `FAILED_INVALID_CREDENTIALS`
- `FAILED_STUDENT_NOT_FOUND`
- `FAILED_STUDENT_INACTIVE`
- `FAILED_ADMIN_INACTIVE`
- `FAILED_ACCOUNT_LOCKED`
- `FAILED_INVALID_GOOGLE_TOKEN`
- `FAILED_GOOGLE_PROVIDER_UNAVAILABLE`
- `FAILED_GOOGLE_PROVIDER_ERROR`
- `FAILED_GOOGLE_SUBJECT_MISMATCH`
- `FAILED_INSTITUTIONAL_DOMAIN`
- `FAILED_ELIBRO_CONFIG`
- `FAILED_NEXT_URL_VALIDATION`
- `FAILED_ELIBRO_API`
- `FAILED_ELIBRO_TIMEOUT`
- `FAILED_INTERNAL_ERROR`

### Inconsistencias detectadas (Access Logs)

- No hay inconsistencia de nombres principales UI/API para filtros base.
- Los IDs (`studentId`, `adminId`, `careerId`) se capturan como texto en UI; backend espera UUID válido.

---

## Audit Logs

Fuentes revisadas:
- `client/src/features/audit-logs/components/filters/audit-logs-filter-fields.ts`
- `client/src/features/audit-logs/api/audit-logs-api.ts`
- `server/src/main/java/mx/edu/utez/server/modules/logs/audit/controller/AuditLogQueryController.java`
- `server/src/main/java/mx/edu/utez/server/modules/logs/audit/dto/AuditLogFilterRequest.java`
- `server/src/main/java/mx/edu/utez/server/modules/logs/audit/service/AuditLogQueryService.java`
- Enums: `AuditActorType`, `AuditOutcome`, `AuditSeverity`, `AuditSourceModule`

### Catálogo de filtros

| Nombre técnico (UI state) | Param backend esperado | Etiqueta UI | Valores posibles | Qué filtra |
|---|---|---|---|---|
| `dateFrom` | `dateFrom` | Fecha inicial | ISO datetime | Límite inferior de auditoría. |
| `dateTo` | `dateTo` | Fecha final | ISO datetime | Límite superior de auditoría. |
| `actorEmail` | `actorEmail` | Correo del actor | correo exacto | Coincidencia exacta por correo de actor admin. |
| `action` | `action` | Acción exacta | string | Coincidencia exacta por acción. |
| `entityType` | `entityType` | Entidad exacta | string | Coincidencia exacta por tipo de entidad. |
| `requestId` | `requestId` | Request ID | string | Coincidencia exacta por requestId. |
| `correlationId` | `correlationId` | Correlation ID | string | Coincidencia exacta por correlationId. |
| `actorType` | `actorType` | Tipo de actor | `ALL`, `ADMIN`, `SYSTEM`, `INTEGRATION` | Tipo de actor de auditoría. |
| `outcome` | `outcome` | Resultado | `ALL`, `SUCCESS`, `FAILURE`, `DENIED`, `ERROR` | Resultado del evento auditado. |
| `severity` | `severity` | Severidad | `ALL`, `INFO`, `NOTICE`, `WARNING`, `SECURITY`, `CRITICAL` | Nivel de severidad. |
| `search` | `search` | (barra de búsqueda) | texto libre | Búsqueda textual por acción, entidad, actor, ids, descripción, etc. |
| `sortBy` | `sortBy` | (fijo en página) | `occurredAt`, `actorType`, `action`, `entityType`, `outcome`, `severity`, `requestId`, `correlationId` | Campo de orden. |
| `sortDir` | `sortDir` | (fijo en página) | `asc`, `desc` | Dirección de orden. |
| `page` | `page` | (paginación) | entero >= 0 | Página actual. |
| `size` | `size` | (page size) | entero > 0 | Tamaño de página. |

### Acciones / entidades / severidad / scope

- Acciones: filtro textual exacto (`action`) + búsqueda libre (`search`).
- Entidades: filtro textual exacto (`entityType`) + búsqueda libre (`search`).
- Tipos de actor: `ADMIN`, `SYSTEM`, `INTEGRATION`.
- Resultados: `SUCCESS`, `FAILURE`, `DENIED`, `ERROR`.
- Severidad: `INFO`, `NOTICE`, `WARNING`, `SECURITY`, `CRITICAL`.
- Scope: **No existe** filtro `scope` en Audit Logs.

### Inconsistencias detectadas (Audit Logs)

1. **`sourceModule` existe en modelo de auditoría, pero no está expuesto como filtro en UI ni DTO de filtros.**
   - Enum existente: `AuditSourceModule`.
   - Actualmente solo se visualiza en detalle/tabla, no se filtra.

2. **No existe filtro de `scope` para auditoría.**
   - UI y backend son consistentes en esto (no implementado).

---

## Resumen rápido de discrepancias a vigilar

- Evaluar si conviene agregar `sourceModule` como filtro funcional en auditoría.
