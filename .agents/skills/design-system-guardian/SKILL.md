---
name: design-system-guardian
description: Protege la consistencia visual del frontend de SIGASe. Úsala cuando se toquen tokens, estilos, tablas, cards, badges, dialogs, filtros, layouts admin/student o cualquier vista con riesgo de meter hardcodes, variantes paralelas o drift respecto al design system existente.
---

# Objetivo

Mantener a SIGASe dentro de un lenguaje visual coherente, reutilizable y claramente ligado a su design system actual.

# Cuándo usarla

- Al modificar pantallas admin o student con peso visual.
- Al tocar `client/src/styles/global.css`, `client/components.json` o primitives UI.
- Cuando aparezcan clases ad hoc, colores directos, radios/sombras inconsistentes o badges improvisados.
- Cuando una vista parezca separada del resto del producto.

# Flujo de trabajo

1. Toma como fuente de verdad:
   - `client/components.json`
   - `client/src/styles/global.css`
   - `client/src/components/ui/`
   - patrones visuales maduros del módulo `student`

2. Revisa primero reutilización antes que diseño nuevo.
   - `SectionHeader`
   - `StatusCard`
   - `Card`
   - `Badge`
   - `DataTable`
   - `Dialog`
   - `modalFormPrimitives`
   - `AppConfirmDialog`
   - `AppToastProvider`

3. Detecta drift visual.
   - hardcodes de color o fondo cuando ya exista token
   - clases repetidas para spacing/radius/shadow
   - jerarquía tipográfica inconsistente
   - badges y estados con semántica visual distinta entre vistas
   - tablas o cards que no se sientan parte del mismo producto

4. Corrige con el cambio mínimo efectivo.
   - tokeniza
   - reutiliza componente compartido
   - elimina variantes paralelas innecesarias
   - conserva compatibilidad con light/dark si aplica

# Qué evitar

- meter una nueva variante visual solo para resolver una pantalla
- hardcodear HSL/hex si ya hay token semántico
- duplicar estilos de modal, tabla o header por comodidad
- “mejorar” una vista rompiendo el patrón que ya usa el resto del repo

# Entrega esperada

Entrega:

1. hallazgos de inconsistencia
2. componentes o tokens a reutilizar
3. ajuste mínimo recomendado
4. riesgo si se deja igual
