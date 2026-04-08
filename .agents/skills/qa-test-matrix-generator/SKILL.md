---
name: qa-test-matrix-generator
description: Genera una matriz de pruebas útil y accionable para módulos de SIGASe. Úsala cuando se implemente o refactorice un flujo en backend o frontend y haga falta una cobertura clara de happy path, validaciones, permisos por rol, seguridad, regresión, UX y oportunidades de automatización con JUnit o Playwright.
---

# Objetivo

Convertir cambios funcionales en una matriz de pruebas concreta, priorizada y reutilizable por equipo técnico o QA.

# Cuándo usarla

- Después de cambios en auth, dashboard, students, admins, eLibro, logs o reportes.
- Antes de cerrar un PR grande.
- Cuando un flujo combina backend + frontend + exportación.
- Cuando haga falta decidir qué automatizar en Spring tests y qué automatizar en Playwright.

# Instrucciones detalladas

1. Define el módulo y alcance.
   - identifica pantallas, endpoints, roles y efectos colaterales
   - ubica si ya hay pruebas en `server/src/test/java` o `tests/playwright/e2e`

2. Cubre al menos estas categorías.
   - happy path
   - validaciones
   - edge cases
   - permisos por rol
   - seguridad
   - regresión
   - UX/consistencia
   - exportaciones o side effects si aplican

3. Usa el contexto real del repo.
   - roles: `ROLE_ADMIN_TI`, `ROLE_ADMIN_BIBLIOTECA`, `ROLE_STUDENT`
   - contratos HTTP
   - estados del dominio
   - filtros y exportaciones
   - sesión expirada y `401/403`

4. Decide nivel de automatización.
   - backend/integración para contratos, seguridad, validación, exportación
   - frontend/E2E para navegación, formularios, guards y flows críticos
   - manual para exploración visual o verificación contextual todavía no automatizada

5. Prioriza.
   - P0: seguridad, permisos, datos sensibles, sesiones, exportaciones críticas
   - P1: contratos, filtros, reglas de negocio
   - P2: UX, consistencia visual, textos y afinado

# Formato de entrega

Entrega una tabla con estas columnas:

- ID
- Tipo
- Escenario
- Precondiciones
- Pasos
- Resultado esperado
- Prioridad

Después agrega una sección corta de automatización recomendada:

- qué conviene automatizar en Spring/JUnit
- qué conviene automatizar en Playwright
- qué dejar manual por ahora

# Criterios de calidad

- La matriz debe ser específica del módulo, no genérica.
- Debes incluir roles y seguridad cuando apliquen.
- Debes cubrir regresión y no sólo el flujo feliz.
- Los resultados esperados deben ser verificables.
