---
name: design-system-guard
description: Protege la consistencia visual y estructural del frontend de SIGASe. Úsala cuando se modifiquen componentes UI, layouts admin/student, formularios, tablas, cards, badges, dialogs, páginas dashboard o tokens en `client/src/styles/global.css` y `client/components.json`, especialmente si hay riesgo de meter hardcodes o romper la línea visual `radix-nova`.
---

# Objetivo

Mantener consistencia visual, semántica y composicional en el frontend real de SIGASe.

# Cuándo usarla

- Al tocar componentes base en `client/src/components/ui/`.
- Al modificar páginas admin o student con mucho peso visual.
- Al ajustar colores, spacing, radios, sombras o dark/light.
- Cuando aparezcan hardcodes de color, tamaño o layout.
- Cuando un formulario, tabla o dashboard se salga del sistema existente.

# Instrucciones detalladas

1. Toma como fuente de verdad visual:
   - `client/components.json`
   - `client/src/styles/global.css`
   - primitives en `client/src/components/ui/`

2. Revisa consistencia de tokens.
   - colores semánticos
   - spacing
   - radios
   - sombras
   - tipografía
   - dark/light
   - variables de topbar y superficies

3. Revisa componentes críticos.
   - formularios
   - tablas
   - cards
   - badges
   - dialogs
   - section headers
   - status cards
   - layouts admin y student

4. Busca anti-patrones.
   - hex/hsl hardcodeados donde ya existe token
   - estilos repetidos entre páginas
   - markup custom cuando ya existe componente base
   - layouts inconsistentes entre módulos admin
   - visuales mock que no parecen parte del producto real

5. Si el cambio toca dashboard o logs:
   - confirma jerarquía visual clara
   - evita mezclar estilos exploratorios con vistas operativas
   - valida estados de loading, empty y error

6. Propón correcciones mínimas y concretas.
   - tokenizar, no improvisar
   - reutilizar componente base, no clonar estilos
   - mantener coherencia entre modo claro y oscuro

# Formato de entrega

Entrega:

1. Hallazgos visuales/estructurales.
2. Componentes o tokens implicados.
3. Correcciones sugeridas.
4. Riesgos de inconsistencia futura.

# Criterios de calidad

- Debes apoyar la revisión en rutas reales del frontend.
- Debes privilegiar tokens y primitives existentes.
- Debes cubrir dark/light cuando el cambio visual sea relevante.
- Debes marcar hardcodes y divergencias de layout sin ambigüedad.
