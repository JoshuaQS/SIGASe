---
name: typescript-api-client-refactor
description: Refactoriza la capa TypeScript de consumo API en SIGASe. Úsala cuando haya duplicación o drift entre `client/src/lib/api`, `client/src/types/api.ts`, stores de sesión, mappers, imports `@//`, manejo de errores HTTP o shapes legacy que ya no reflejan el backend Spring real.
---

# Objetivo

Dejar una capa API frontend consistente, tipada y fácil de mantener por dominio.

# Cuándo usarla

- Cuando se agreguen endpoints o módulos nuevos.
- Cuando `client/src/types/api.ts` ya no refleje el backend.
- Cuando haya lógica HTTP repetida fuera de `api-client.ts`.
- Cuando un dominio admin dependa de mock data o wrappers heredados.
- Cuando el manejo de errores o auth headers sea inconsistente.

# Instrucciones detalladas

1. Traza el flujo actual.
   - `api-client.ts`
   - clientes por dominio en `client/src/lib/api/`
   - stores/hydration que dependen del contrato (`auth-session-store.ts`)
   - páginas consumidoras

2. Detecta problemas de estructura.
   - tipos duplicados
   - envelopes redefinidos
   - query builders inconsistentes
   - fetch directo fuera del cliente base
   - imports `@//` mezclados con `@/`
   - adapters sin valor real

3. Refactoriza por dominio.
   - auth
   - students
   - admins
   - dashboard
   - access logs
   - audit logs
   - eLibro config

4. Normaliza comportamientos.
   - auth headers
   - parseo de responses
   - manejo de `204`
   - `401`
   - `403`
   - errores de negocio
   - abort/cancelación

5. Limpia deuda técnica.
   - elimina shapes viejos si el backend ya cambió
   - mueve tipos específicos al cliente de dominio cuando no sean globales
   - deja `types/api.ts` sólo para contratos realmente compartidos

6. Verifica consumo UI.
   - loading/error states
   - formularios
   - tablas
   - dashboards
   - guards o sesión cuando el dominio es auth

# Formato de entrega

Entrega:

1. Diagnóstico de la capa API actual.
2. Plan de refactor por dominio.
3. Cambios estructurales propuestos.
4. Riesgos de regresión.
5. Criterios de verificación.

# Criterios de calidad

- Debes priorizar claridad estructural sobre “compatibilidad” con shapes viejos.
- Debes unificar manejo de errores y auth.
- Debes señalar deuda técnica concreta, no genérica.
- Debes mantener la organización por dominio del frontend.
