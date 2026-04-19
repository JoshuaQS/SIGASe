AGENTS.md

## Proyecto
SIGASe (Sistema Integral de Gestión y Acceso SSO eLibro)

## Objetivo de este agente
Este agente trabaja dentro del repositorio SIGASe para localizar, abrir y preparar evidencias visuales del sistema que serán utilizadas como figuras del reporte de estadía, específicamente del Capítulo 3.

No debe inventar evidencia, no debe reinterpretar el reporte y no debe generar figuras aproximadas. Su función es identificar fuentes reales dentro del repositorio o dentro de la carpeta de documentos autorizados y producir capturas consistentes y defendibles.

## Contexto del repositorio
El repositorio contiene:
- backend en Spring Boot
- frontend en React + Vite + TypeScript
- pruebas Playwright
- documentos del reporte dentro de `docs/figuras`

## Carpetas clave
- `server/` → backend
- `client/` → frontend
- `tests/playwright/` → pruebas y navegación automatizada
- `docs/figuras/` → documentos fuente para figuras documentales
- `docs/figuras-output/` → salida esperada de capturas

## Regla principal
Toda figura del Capítulo 3 debe salir únicamente de una de estas fuentes:
1. código real del proyecto
2. interfaz real del sistema
3. documentos dentro de `docs/figuras`

No se deben usar:
- diagramas externos
- imágenes inventadas
- mockups ajenos al sistema
- capturas irrelevantes o solo “parecidas”

## Tipos de figura permitidos
- `documento`
- `codigo`
- `interfaz`
- `prueba`
- `manual_required`

## Prioridad de evidencia
Cuando exista más de una evidencia posible, se debe priorizar:
1. evidencia directa y exacta
2. evidencia clara y legible
3. evidencia consistente con el nombre de la figura
4. evidencia fácil de defender en revisión académica

## Reglas para figuras de código
- capturar únicamente archivos o bloques realmente relacionados con la figura
- mostrar suficiente contexto para que se entienda
- evitar capturas excesivamente largas
- no mezclar archivos sin justificación clara
- si una figura requiere dos piezas, solo hacerlo cuando el nombre de la figura lo justifique

## Reglas para figuras de interfaz
- usar Playwright cuando sea posible
- preferir vistas limpias y completas
- evitar overlays irrelevantes
- esperar a que la vista cargue completamente antes de capturar
- mantener viewport consistente
- si la vista requiere autenticación, usar el flujo mínimo necesario

## Reglas para figuras documentales
- usar solo documentos dentro de `docs/figuras`
- priorizar PDF
- si falta el documento o no contiene la evidencia esperada, marcar `manual_required`
- no reemplazar un documento faltante con otra cosa

## Reglas de salida
Toda captura generada debe guardarse en:
`docs/figuras-output/`

El nombre del archivo debe seguir la convención:
`figura-3-xx-nombre-descriptivo.png`

## Manifest
Toda ejecución debe actualizar un `manifest.json` dentro de `docs/figuras-output/` con:
- número de figura
- nombre
- tipo
- ruta fuente
- archivo de salida
- estado
- notas

## Estados permitidos
- `captured`
- `manual_required`
- `not_found`
- `failed`

## Restricciones importantes
- no modificar el contenido del proyecto
- no alterar el reporte
- no crear figuras nuevas
- no cambiar nombres de figuras
- no marcar como capturada una figura si la evidencia no corresponde realmente

## Comportamiento esperado
Antes de capturar, el agente debe:
1. confirmar la ruta exacta
2. confirmar que la fuente corresponde al título
3. confirmar que la captura será legible

Si no puede cumplir esas tres condiciones, debe marcar la figura como `manual_required` o `not_found`.