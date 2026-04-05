# Package Base Migration Plan (Deferred)

## Decision

En esta iteración **no** se migra el package base de `mx.edu.utez.server` a `mx.edu.utez.sigase`.

## Why It Is Deferred

El cambio completo es de alto impacto y supera el alcance seguro de esta ronda de cierre:

- ~163 clases Java en `src/main/java`
- ~16 clases Java en `src/test/java`
- ~680 referencias directas en código de producción al package actual
- ~185 referencias directas en pruebas

Ejecutarlo en paralelo con hardening de auth/logging/reportes incrementa el riesgo de regresión en:

- escaneo de componentes Spring
- wiring de seguridad y filtros
- pruebas de integración con contexto completo
- imports transversales de módulos

## Required Next Phase (Package Rename)

1. Crear rama dedicada solo para package-rename.
2. Aplicar rename atómico con IDE para:
   - `src/main/java`
   - `src/test/java`
3. Ajustar imports manuales residuales, `@ComponentScan` (si aplica), y referencias textuales.
4. Ejecutar suite de pruebas completa + smoke tests de endpoints críticos.
5. Publicar como cambio aislado en PR exclusivo para facilitar review y rollback.

## Constraint

Regla operativa: **o rename completo y validado, o no rename**.  
No se permite renaming parcial.
