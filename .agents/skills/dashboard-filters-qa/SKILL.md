---
name: dashboard-filters-qa
description: Revisa la semántica e implementación de filtros del dashboard y monitoreo en SIGASe. Úsala cuando cambien `MonitoringAndReports.tsx`, el composer de filtros, `dashboard-api.ts`, `DashboardController`, exportaciones de dashboard o cualquier regla que afecte KPIs, gráficas, rankings, scopes por estudiante/carrera y coherencia entre vista y export.
---

# Objetivo

Validar que filtros, KPIs, tablas, gráficas y exportaciones del dashboard administrativo sean coherentes y midan accesos reales a eLibro.

# Cuándo usarla

- Al tocar `client/src/modules/admin/pages/MonitoringAndReports.tsx`.
- Al modificar componentes en `client/src/modules/admin/components/monitoring/`.
- Al cambiar endpoints de `dashboard` o exportación analítica.
- Cuando surja la duda entre filtros globales y filtros locales.
- Cuando un ranking, KPI o exportación pueda estar contando otra cosa distinta a accesos reales de eLibro.

# Instrucciones detalladas

1. Identifica el filtro fuente.
   - Localiza el estado aplicado y el estado draft.
   - Revisa cómo se construye el query final (`buildDashboardQueryFromComposer`, clientes API y controller).

2. Revisa la semántica del scope.
   - `students_all`
   - `students_individual`
   - `careers`
   - estado de acceso (`ALL`, `SUCCESS`, `FAILED`)
   - fechas
   - top N

3. Verifica propagación completa.
   - summary
   - access trends
   - top students
   - top careers
   - exportación
   - cualquier tarjeta o insight derivado

4. Busca filtros problemáticos.
   - filtro fantasma: visible pero no aplicado
   - filtro redundante: aplicado dos veces
   - filtro parcial: afecta una gráfica pero no KPIs
   - filtro contradictorio: frontend manda params que controller no consume

5. Comprueba separación conceptual.
   - `Monitoreo y Reportes` no debe mutar en explorador de logs.
   - `Registros de acceso` y `Registros de auditoría` son vistas forenses separadas.
   - El dashboard no debe contar logins internos a SIGASe como si fueran accesos a eLibro.

6. Genera casos QA.
   - sin filtros
   - estudiante individual
   - todas las carreras
   - carrera única
   - rango invertido
   - sin resultados
   - top N fuera de rango
   - exportación con filtros activos

# Formato de entrega

Entrega:

1. Mapa de filtros y superficies afectadas.
2. Hallazgos de coherencia o incoherencia.
3. Casos QA prioritarios.
4. Recomendación de corrección por orden.

# Criterios de calidad

- Debes revisar vista, API y exportación juntos.
- Debes distinguir monitoreo/reportes de registros del sistema.
- Debes confirmar qué se está midiendo realmente.
- Debes cubrir edge cases y no sólo el happy path.
