---
name: component-standardizer
description: Migra vistas de SIGASe hacia patrones compartidos del proyecto. Úsala cuando haya tablas legacy, modales disparejos, headers distintos, filtros improvisados o acciones dispersas y se necesite unificar la pantalla con DataTable, modal forms, dialogs, cards, toasts y componentes compartidos existentes.
---

# Objetivo

Estandarizar vistas sin rehacer el frontend completo ni introducir capas nuevas de compatibilidad.

# Cuándo usarla

- Al modernizar vistas admin antiguas.
- Cuando una página combine demasiados patrones de tabla/card/header/filtro.
- Cuando un modal no siga `Dialog` + `modalFormPrimitives`.
- Cuando una pantalla siga en mock aunque el backend real ya exista.

# Flujo de trabajo

1. Clasifica la vista.
   - listado operativo
   - configuración
   - detalle
   - flujo con modal
   - vista híbrida tabla/cards

2. Busca el patrón compartido más cercano.
   - `SectionHeader` para cabecera
   - `StatusCard` para resumen
   - `DataTable` para listas estándar
   - `filters-panel` o bloque de filtros compartido
   - `Dialog` + `modalFormPrimitives` para formularios
   - `AppConfirmDialog` para confirmaciones
   - `useAppToast` para feedback

3. Estandariza sin romper semántica.
   - conserva contratos backend y comportamiento
   - mueve la vista al patrón compartido
   - elimina markup duplicado si el componente base ya lo resuelve
   - comparte filtros/acciones entre vista tabla y cards cuando representen el mismo dataset

4. Si hay mocks y endpoint real:
   - conecta la vista al backend
   - retira el mock en la misma intervención o deja retiro explícito

# Qué evitar

- crear wrappers temporales sobre wrappers
- dejar tabla custom si `DataTable` ya cubre el caso
- mantener dos estilos de modal para la misma familia de acciones
- unificar solo la apariencia y dejar la lógica fragmentada

# Entrega esperada

Entrega:

1. patrón actual detectado
2. patrón compartido destino
3. componentes a reemplazar o adoptar
4. cambios mínimos para completar la migración
