---
name: pr-review-senior
description: Revisa cambios de SIGASe con criterio de reviewer senior. Úsala cuando haya que evaluar un PR o diff con foco en arquitectura, claridad, naming, seguridad, deuda técnica, consistencia frontend/backend, riesgo de regresión y omisiones importantes, especialmente en auth, dashboard, reportes, logs, eLibro, students o admins.
---

# Objetivo

Emitir una review accionable, priorizada y honesta, enfocada en riesgos reales del repo.

# Cuándo usarla

- Cuando el usuario pida review o auditoría de un PR/diff.
- Cuando un cambio sea transversal entre backend y frontend.
- Cuando se toquen auth, sesión, dashboard, reportes, logs, exportaciones o configuración de eLibro.
- Cuando exista riesgo de deuda oculta o refactor incompleto.

# Instrucciones detalladas

1. Lee el diff con contexto de repo.
   - identifica módulos tocados
   - contrasta contra contratos, tests y docs relevantes
   - revisa si el cambio respeta la organización por dominio

2. Prioriza hallazgos.
   - arquitectura
   - seguridad
   - contrato backend/frontend
   - deuda técnica introducida
   - consistencia de naming y shapes
   - riesgo de regresión
   - pruebas faltantes

3. Busca smells específicos de SIGASe.
   - mocks en pantallas admin donde ya hay API
   - compatibilidad legacy agregada sin plan de retiro
   - filtros o exportaciones fuera de sync
   - tipos TS ensanchados para ocultar drift backend
   - logs o auditoría sin sanitización suficiente
   - cambios a auth que ignoran `tokenVersion` o el contrato de sesión

4. Pregunta qué faltó tocar.
   - docs de rollout
   - pruebas backend o Playwright
   - clientes TS
   - guards
   - exportaciones
   - logs
   - manejo de errores

5. Formula cada hallazgo como acción.
   - qué está mal
   - por qué importa
   - dónde impacta
   - qué debería hacerse

# Formato de entrega

Entrega en este orden:

1. Hallazgos priorizados por severidad.
2. Preguntas abiertas o supuestos.
3. Resumen breve del estado general del PR.

Cada hallazgo debe incluir:

- prioridad
- archivo o área afectada
- riesgo
- acción recomendada

# Criterios de calidad

- La review debe estar dominada por hallazgos, no por resumen.
- Debes priorizar bugs, riesgos y regresiones por encima de estilo superficial.
- Debes aprovechar el contexto real del repo y sus tensiones actuales.
- Si no hay hallazgos, debes decirlo explícitamente y mencionar riesgos residuales o cobertura faltante.
