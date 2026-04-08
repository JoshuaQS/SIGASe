---
name: audit-and-access-logs-review
description: Revisa trazabilidad, sanitización y utilidad operativa de access logs y audit logs en SIGASe. Úsala cuando cambien eventos de seguridad, exportaciones, acciones administrativas, `RequestCorrelationFilter`, sanitización de logs, endpoints `/audit-logs` o cualquier flujo que deba dejar evidencia auditable o soporte forense sobre accesos reales a eLibro.
---

# Objetivo

Verificar que SIGASe produzca logs útiles para soporte, seguridad y auditoría sin exponer datos sensibles.

# Cuándo usarla

- Al tocar `modules/logs`, `reports`, `auth`, `elibro` o servicios que registren eventos.
- Cuando cambie la sanitización de IP, email, token, metadata o URLs.
- Cuando se agreguen acciones administrativas críticas.
- Cuando haya dudas sobre qué evento debe ir a audit log y cuál a access log.
- Cuando frontend y backend no coincidan sobre la existencia o forma de los endpoints de logs.

# Instrucciones detalladas

1. Mapea la infraestructura de trazabilidad.
   - `RequestCorrelationFilter`
   - `RequestContext`
   - `SecurityLogSanitizer`
   - `AuditLogService`
   - servicios/reportes que exportan logs

2. Distingue los dos tipos de log.
   - access logs: intentos y resultados del acceso hacia eLibro
   - audit logs: acciones administrativas y eventos sensibles del sistema

3. Revisa payload y persistencia.
   - actor
   - outcome
   - severity
   - entity/entityId
   - requestId/correlationId
   - origen, endpoint y método
   - metadata
   - timestamps

4. Valida sanitización.
   - emails
   - IP
   - tokens
   - query params sensibles
   - metadata JSON
   - user agent

5. Busca gaps reales del repo.
   - frontend con páginas de logs todavía mockeadas
   - clientes TS apuntando a `/access-logs` o `/audit-logs`
   - pruebas de integración que esperan endpoints concretos
   - ausencia o drift de controllers/servicios reales

6. Revisa eventos críticos que sí deben registrarse.
   - login y fallos sensibles
   - password reset
   - cambios de configuración eLibro
   - altas/bajas de administradores
   - importaciones
   - exportaciones
   - cambios de estado de estudiantes

7. Revisa eventos que no deben filtrar datos.
   - secretos de eLibro
   - JWT completos
   - emails o IP sin sanitizar cuando la política no lo permita

# Formato de entrega

Entrega:

1. Evaluación separada de access logs y audit logs.
2. Hallazgos por severidad.
3. Eventos faltantes o eventos sobreexpuestos.
4. Recomendaciones de corrección y QA.

# Criterios de calidad

- Debes cubrir trazabilidad y privacidad al mismo tiempo.
- Debes mencionar `requestId` y `correlationId`.
- Debes distinguir claramente access log vs audit log.
- Si detectas un gap entre frontend, tests y backend real, debes dejarlo explícito.
