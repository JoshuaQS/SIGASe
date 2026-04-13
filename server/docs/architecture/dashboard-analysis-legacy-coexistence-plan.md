# Dashboard Analysis Legacy Coexistence Plan

## Source of Truth actual

El source of truth del dashboard analítico adaptativo es el namespace nuevo:

- `POST /api/v1/dashboard/analysis`
- `GET /api/v1/dashboard/analysis/metadata`
- `POST /api/v1/dashboard/analysis/options`
- `GET /api/v1/dashboard/analysis/students/search`
- `GET /api/v1/dashboard/analysis/careers/search`
- `POST /api/v1/dashboard/analysis/export`

Ese namespace resuelve el universo analítico, el layout y los widgets desde backend.

## Qué sigue siendo legacy

El controller legacy del dashboard sigue siendo:

- `DashboardController`

Sus endpoints mantienen compatibilidad temporal para las vistas/consumidores previos basados en
query params y snapshots fijos.

## Regla de convivencia temporal

Durante la coexistencia:

- nuevas reglas analíticas solo deben entrar al pipeline de `analysis`
- wizard, autocomplete y export nuevos solo deben apoyarse en el namespace `analysis`
- no se deben mezclar widgets/layouts nuevos con `DashboardController` o `DashboardService`
- no se debe recrear semántica del pipeline adaptativo dentro del legacy

## Criterio de migración gradual

La migración puede considerarse cerrada cuando:

1. el frontend administrativo ya consuma exclusivamente el namespace `analysis`
2. exportaciones analíticas usen solo `POST /analysis/export`
3. no queden vistas activas dependiendo de snapshots legacy del dashboard
4. las pruebas de contrato/parity cubran los layouts necesarios del pipeline nuevo

## Criterio de retiro futuro

El retiro del legacy debe hacerse cuando:

- la UI productiva ya no consuma `DashboardController`
- exista cobertura mínima de regresión sobre `analysis`
- el export nuevo cubra los casos que hoy dependen del camino legacy

Hasta entonces, ambos caminos pueden convivir, pero el crecimiento funcional del dashboard debe
ocurrir únicamente sobre el módulo adaptativo de `analysis`.
