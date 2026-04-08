---
name: spring-api-review
description: Revisa contratos HTTP del backend Spring antes de conectar o modificar frontend en SIGASe. Úsala cuando cambien controllers, DTOs, validaciones, roles, códigos HTTP o endpoints en `modules/auth`, `dashboard`, `reports`, `students`, `admins`, `elibro` o `logs`, especialmente si el frontend depende de esos contratos para sesión, filtros o exportaciones.
---

# Objetivo

Auditar contratos backend Spring para evitar que frontend, tests y documentación queden desalineados.

# Cuándo usarla

- Antes de conectar una pantalla nueva a un endpoint existente.
- Cuando cambien `@RequestParam`, `@RequestBody`, `@PreAuthorize`, DTOs o error handling.
- Cuando haya dudas entre `401` y `403`.
- Cuando un endpoint toque datos sensibles, auth, logs o exportaciones.
- Cuando existan señales de drift entre código, docs y pruebas, como ya ocurre en dashboard/reportes.

# Instrucciones detalladas

1. Empieza por la ruta real.
   - Revisa `ApiRoutes` si aplica.
   - Lee el controller concreto y sus anotaciones.
   - Confirma si usa `ApiResponse`, `PageResponse`, `ResponseEntity<Void>` u otro patrón.

2. Documenta el contrato del endpoint.
   - método y URL final
   - parámetros y nombres exactos
   - body request
   - body response
   - permisos/roles
   - estados HTTP esperados
   - errores de validación o negocio

3. Valida consistencia semántica.
   - `401` para token inválido/expirado
   - `403` para falta de permisos o reglas institucionales
   - no mezclar `204` y `ApiResponse` sin motivo
   - no devolver payloads que expongan hashes, secretos, emails completos o metadata sensible

4. Revisa dependencias contractuales.
   - auth: `server/docs/auth-session-contract.md`
   - errores: `GlobalExceptionHandler`, `ErrorCode`
   - seguridad: `SecurityConfig`, `JwtAuthenticationEntryPoint`, `JwtAccessDeniedHandler`
   - frontend consumidor: `client/src/lib/api/*.ts`, `auth-session-store.ts`, guards y páginas

5. Busca inconsistencias reales.
   - nombres de query params divergentes entre controller, tests y frontend
   - enums que frontend tipa distinto
   - respuestas parciales no documentadas
   - roles permitidos que no coinciden con navegación o guards

6. Cierra con checklist de integración frontend.
   - tipos TS a tocar
   - empty/loading/error states
   - manejo de `401/403`
   - pruebas a actualizar

# Formato de entrega

Entrega por endpoint o grupo de endpoints:

1. Contrato aprobado.
2. Hallazgos de riesgo, priorizados.
3. Impacto frontend inmediato.
4. Decisión recomendada:
   - conectar ya
   - conectar después de ajustes
   - bloquear integración

# Criterios de calidad

- Debes citar nombres exactos de params y códigos HTTP.
- Si hay drift entre controller, tests y frontend, dilo con claridad.
- Debes revisar permisos y exposición de datos sensibles.
- No basta con “se ve bien”: la revisión debe terminar en acciones concretas.
