---
name: backend-frontend-contract-sync
description: Alinea el frontend de SIGASe con contratos backend nuevos o corregidos. Úsala cuando cambien DTOs, query params, roles, respuestas paginadas o endpoints y haya que actualizar `client/src/lib/api`, `client/src/types/api.ts`, guards, hooks, formularios, tablas, dashboard o vistas admin para dejar de depender de shapes viejos o mocks.
---

# Objetivo

Sincronizar frontend y backend sin agregar compatibilidades temporales innecesarias.

# Cuándo usarla

- Cuando un controller, DTO o enum backend cambie.
- Cuando el frontend tenga tipos ensanchados o nombres viejos.
- Cuando una página admin siga mockeada pese a que ya existe API real.
- Cuando se introduzcan nuevos estados de error, permisos o filtros.

# Instrucciones detalladas

1. Determina la fuente de verdad.
   - El contrato backend manda.
   - Usa controller + DTO + docs del backend como referencia.
   - No copies shapes ambiguos desde `client/src/types/api.ts` si ya están desactualizados.

2. Recorre la cadena completa en frontend.
   - `client/src/lib/api/*.ts`
   - `client/src/types/api.ts`
   - hooks o stores (`auth-session-store.ts`, `use-auth-user.ts`)
   - adapters/mappers si existen
   - páginas, formularios, tablas y cards del dominio

3. Corrige tipos y clientes.
   - normaliza nombres de params
   - ajusta request/response
   - elimina unions legacy si el backend ya no los necesita
   - evita duplicar envelopes o page wrappers inconsistentes

4. Aterriza la UX de integración.
   - loading states
   - empty states
   - errores de validación
   - `401`
   - `403`
   - sesión expirada
   - permisos por rol

5. Si el dominio es dashboard o logs:
   - valida filtros y exportaciones
   - confirma que la vista y el archivo exportado usan el mismo scope
   - elimina datasets mock si el API ya existe

6. Verifica deuda técnica adicional.
   - imports `@//` inconsistentes
   - shapes duplicados entre archivos
   - fetchers especiales fuera de `api-client`
   - adapters que sólo maquillan un contrato malo

# Formato de entrega

Entrega:

1. Diferencias detectadas entre backend y frontend.
2. Lista de archivos frontend a tocar.
3. Plan de sync en orden de ejecución.
4. Riesgos de regresión.
5. Checklist de verificación manual.

# Criterios de calidad

- Debes cubrir tipos, cliente API y pantalla consumidora.
- No dejes compatibilidad doble por defecto.
- Debes contemplar `401/403`, loading, empty state y errores.
- Si encuentras mocks donde ya debería haber integración real, debes marcarlo como deuda o corregirlo.
