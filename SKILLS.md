# SKILLS.md

## Skill: capture_chapter3_figures

### Propósito
Localizar y generar las capturas visuales necesarias para las figuras del Capítulo 3 del reporte de estadía del proyecto SIGASe.

### Cuándo usar esta skill
Usa esta skill cuando se solicite:
- generar capturas para las figuras del Capítulo 3
- localizar evidencia visual del sistema
- producir imágenes desde código, interfaz o documentos del repo
- construir el set de figuras del reporte

No la uses para:
- redactar el reporte
- modificar el sistema
- crear diagramas
- inventar evidencias

---

## Entradas requeridas

### 1. Workspace
Ruta base del repositorio:
`/Users/joshqs/Documents/GitHub/SIGASe`

### 2. Carpeta de documentos
Ruta:
`/Users/joshqs/Documents/GitHub/SIGASe/docs/figuras`

### 3. Carpeta de salida
Ruta:
`/Users/joshqs/Documents/GitHub/SIGASe/docs/figuras-output`

### 4. Lista cerrada de figuras
La skill debe trabajar exclusivamente con esta lista:

- Figura 3.1 Involucrados del proyecto
- Figura 3.2 Documentación técnica del acceso SSO de eLibro
- Figura 3.3 Sección representativa del documento SRS
- Figura 3.4 Requerimiento funcional del sistema en el SRS
- Figura 3.5 Cronograma general del proyecto
- Figura 3.6 Estructura modular del backend
- Figura 3.7 Estructura base del frontend
- Figura 3.8 Vista general del sistema en ejecución
- Figura 3.9 Organización del backend por dominios funcionales
- Figura 3.10 Entidad y persistencia del sistema
- Figura 3.11 Interfaz de inicio de sesión administrativo
- Figura 3.12 Configuración de seguridad y autenticación JWT
- Figura 3.13 Vista de gestión de estudiantes
- Figura 3.14 Formulario y lógica del módulo de estudiantes
- Figura 3.15 Vista de gestión de administradores
- Figura 3.16 Configuración de credenciales de eLibro
- Figura 3.17 Lógica del servicio SSO con eLibro
- Figura 3.18 Evidencia funcional del acceso a eLibro
- Figura 3.19 Interfaz de login estudiantil híbrido
- Figura 3.20 Portal estudiantil autenticado
- Figura 3.21 Vistas de logs de acceso y auditoría
- Figura 3.22 Estructura de trazabilidad y auditoría del sistema
- Figura 3.23 Dashboard y monitoreo del sistema
- Figura 3.24 Componentes reutilizables del frontend
- Figura 3.25 Evidencia de pruebas y validación del sistema
- Figura 3.26 Evidencia de seguimiento del proyecto
- Figura 3.27 Implementación del login híbrido estudiantil
- Figura 3.28 Evidencia de control de calidad y validación funcional
- Figura 3.29 Vista general del sistema en la demostración final
- Figura 3.30 Estado final del sistema
- Figura 3.31 Vista representativa del conjunto de módulos implementados

---

## Procedimiento general

### Paso 1. Clasificar la figura
Para cada figura, clasifícala como:
- documento
- código
- interfaz
- manual_required

### Paso 2. Usar el mapeo fijo
No descubras rutas nuevas salvo que sea necesario porque una ruta exacta no exista.
Usa primero el mapeo ya definido.

### Paso 3. Verificar la fuente
Antes de capturar:
- confirma que el archivo o pantalla existe
- confirma que coincide con el título de la figura
- confirma que es legible

### Paso 4. Capturar
Según el tipo:
- documento → abrir PDF y capturar sección útil
- código → abrir archivo y capturar bloque relevante
- interfaz → navegar con Playwright y capturar pantalla
- manual_required → registrar sin capturar

### Paso 5. Guardar salida
Guardar cada captura en:
`docs/figuras-output/`

### Paso 6. Actualizar manifest
Registrar para cada figura:
- `figure_number`
- `figure_title`
- `source_type`
- `source_path`
- `output_file`
- `status`
- `notes`

---

## Mapeo fijo por figura

### Documentos
- Figura 3.1 → manual_required, ya está en el Word
- Figura 3.2 → `docs/figuras/elibro-api.pdf`
- Figura 3.3 → `docs/figuras/srs.pdf`
- Figura 3.4 → `docs/figuras/srs.pdf`
- Figura 3.5 → buscar en `docs/figuras`, si no existe cronograma claro → `manual_required`
- Figura 3.26 → `manual_required` salvo evidencia explícita en `docs/figuras`
- Figura 3.28 → `manual_required` salvo evidencia explícita en `docs/figuras`

### Código
- Figura 3.6 → `server/src/main/java/mx/edu/utez/server/`
- Figura 3.7 → `client/src/`
- Figura 3.9 → `server/src/main/java/mx/edu/utez/server/modules/`
- Figura 3.10 → `server/src/main/java/mx/edu/utez/server/modules/elibro/entity/ElibroAccessLog.java` y `server/src/main/java/mx/edu/utez/server/modules/elibro/repository/ElibroAccessLogRepository.java`
- Figura 3.12 → `server/src/main/java/mx/edu/utez/server/security/SecurityConfig.java`
- Figura 3.14 → `client/src/features/students/components/modals/create-student-modal.tsx` y `server/src/main/java/mx/edu/utez/server/modules/students/controller/StudentController.java`
- Figura 3.17 → `server/src/main/java/mx/edu/utez/server/modules/elibro/service/ElibroSsoService.java`
- Figura 3.22 → `server/src/main/java/mx/edu/utez/server/modules/accesslogs/service/AccessLogQueryService.java`, `server/src/main/java/mx/edu/utez/server/modules/auth/entity/AdminAuthEvent.java`, `server/src/main/java/mx/edu/utez/server/modules/students/entity/StudentAuthEvent.java`, `server/src/main/java/mx/edu/utez/server/modules/elibro/entity/ElibroAccessLog.java`
- Figura 3.24 → `client/src/shared/components/ui/data-table.tsx`
- Figura 3.25 → `tests/playwright/e2e/auth/admin-login.spec.ts`

### Interfaces
- Figura 3.8 → vista general del sistema corriendo
- Figura 3.11 → login admin
- Figura 3.13 → students management page
- Figura 3.15 → admins management page
- Figura 3.16 → elibro config page
- Figura 3.18 → portal o CTA de acceso a eLibro
- Figura 3.19 → login híbrido estudiante
- Figura 3.20 → portal estudiantil autenticado
- Figura 3.21 → access logs + audit logs
- Figura 3.23 → monitoring and reports page
- Figura 3.27 → implementación visual del login híbrido
- Figura 3.29 → vista general de demostración final
- Figura 3.30 → vista estable del sistema
- Figura 3.31 → manual_required, ideal como collage

---

## Reglas especiales

### Sobre la figura 3.14
Como su nombre incluye “formulario y lógica”, se permite una composición de dos evidencias:
- formulario de estudiante
- lógica del backend de students

### Sobre la figura 3.21
Como el nombre usa plural, se permite una composición con:
- access logs
- audit logs

### Sobre la figura 3.31
No intentes automatizarla como una sola captura si no existe una vista única que la represente bien.
Debe marcarse como `manual_required` si requiere collage.

---

## Formato de nombres de salida
Usa exactamente esta convención:

- `figura-3-02-documentacion-sso-elibro.png`
- `figura-3-06-estructura-modular-backend.png`
- `figura-3-11-login-admin.png`

Siempre:
- minúsculas
- guiones
- sin espacios
- número de figura incluido

---

## Criterios de calidad
Una figura solo puede marcarse como `captured` si:
1. la fuente existe
2. corresponde al título
3. la captura es legible
4. la evidencia es defendible académicamente

Si falta cualquiera de esas condiciones:
- `manual_required`
- `not_found`
- o `failed`

---

## Salida final esperada
Al terminar, la skill debe producir:
1. capturas PNG en `docs/figuras-output/`
2. `manifest.json` actualizado
3. resumen final por estado:
   - captured
   - manual_required
   - not_found
   - failed