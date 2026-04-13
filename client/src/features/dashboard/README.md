# Dashboard Analysis Frontend

## Source of truth del panel

El flujo principal de `Monitoreo y Reportes` debe consumir exclusivamente el namespace:

- `/api/v1/dashboard/analysis`
- `/api/v1/dashboard/analysis/metadata`
- `/api/v1/dashboard/analysis/options`
- `/api/v1/dashboard/analysis/students/search`
- `/api/v1/dashboard/analysis/careers/search`
- `/api/v1/dashboard/analysis/export`

Cualquier consumo viejo de `/dashboard/*` dentro del panel de monitoreo debe considerarse **legacy** y candidato a retiro. No deben mezclarse reglas del dashboard legacy con el flujo nuevo de analysis.

## Frontera de negocio

El frontend no decide localmente:

- `mode`
- `rankingMode`
- `topN`
- `canSubmit`

Esas reglas viven en backend y llegan a través de `options`, salvo el mapper estrictamente visual que traduce la selección del wizard a un request final compatible con el backend.

## Renderer

`dashboard-analysis-renderer.tsx` puede tener ramas visuales especializadas por `layoutType`, pero debe respetar siempre:

- `layoutType + widgets` como contrato fuente
- sin inventar widgets ausentes
- sin reconstruir un dashboard fijo por fuera del layout resuelto
- sin reinterpretar semántica de negocio ya resuelta por backend

## Export

La exportación siempre debe salir del **request activo aplicado**. Nunca debe construirse desde el estado parcial/draft del wizard.

## Widget controls

`widgetControls` es la vía oficial para expansión futura de controles locales del dashboard.

- no se aceptarán mapas libres por widget
- cualquier control tabular o rankeable nuevo debe agregarse como subcontrato explícito dentro de `widgetControls`
- por ahora solo cubre:
  - `STUDENT_ACTIVITY_TABLE`
  - `CAREER_STUDENT_TABLE`
- los ranking tables siguen fuera hasta que exista una decisión explícita de producto/UX

## Decisión sobre "Seleccionar todas"

En carreras, `ALL` no se detecta comparando la selección visual contra un catálogo exhaustivo del autocomplete.

- se resuelve mediante la acción explícita `Seleccionar todas`
- eso evita tratar autocomplete como fuente total del universo
- el mapper visual traduce esa acción a `mode=ALL` con `careerIds=null`

## Residuos legacy visibles

Fuera del flujo principal nuevo todavía existen piezas legacy o sobrantes que no deben reactivarse:

- `client/src/features/dashboard/components/shell.tsx`
- `client/src/app/router/route-config.tsx.bak`

## Estado de validación del feature

- el flujo nuevo del dashboard pasó lint en sus archivos del feature
- el typecheck/build global sigue bloqueado por un problema ajeno al módulo nuevo:
  - `client/src/main.tsx` importa `./app/app`
  - el archivo real es `client/src/app/App.tsx`
- ese bloqueo no pertenece al módulo nuevo de `analysis/composer`
