---
name: layout-refiner
description: Refina la composición visual de vistas SIGASe. Úsala cuando una pantalla se sienta vacía, estirada, desbalanceada o hecha por bloques sueltos, y haga falta mejorar grids, proporciones, whitespace, densidad, jerarquía y distribución sin tocar la lógica de negocio.
---

# Objetivo

Hacer que las vistas se sientan como una app administrativa coherente y no como pantallas aisladas.

# Cuándo usarla

- Cuando sobren huecos blancos o existan paneles demasiado largos.
- Cuando KPIs, filtros, tablas y side panels compitan entre sí.
- Cuando la grilla no acompañe la densidad real de contenido.
- Cuando una vista sea funcional pero visualmente tosca.

# Flujo de trabajo

1. Lee la pantalla por bloques.
   - header
   - summary/KPIs
   - filtros
   - contenido principal
   - side panels
   - dialogs y estados

2. Evalúa composición.
   - ritmo vertical
   - equilibrio entre columnas
   - densidad visual
   - continuidad entre cards
   - jerarquía de títulos, subtítulos y meta info

3. Ajusta sin rehacer.
   - compacta paneles largos
   - reduce whitespace improductivo
   - mejora proporciones de grid
   - agrupa acciones relacionadas
   - hace más clara la lectura primaria/secundaria

4. Conserva la base del proyecto.
   - reutiliza `Card`, `SectionHeader`, `StatusCard`, `Badge` y tokens existentes
   - no cambies lógica, contratos ni navegación salvo que el layout lo exija de verdad

# Qué evitar

- “embellecer” con estilos nuevos en vez de corregir composición
- mover demasiadas piezas a la vez
- introducir nuevas secciones si el problema era proporción o spacing
- romper consistencia entre desktop y mobile

# Entrega esperada

Entrega:

1. qué bloque desbalancea la vista
2. qué ajuste de layout lo corrige
3. impacto esperado en claridad y densidad
4. qué no debe tocarse para no romper la pantalla
