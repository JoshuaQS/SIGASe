# SIGASe - Design Document

## 1. Objetivo
Definir el diseno tecnico vigente de SIGASe (Sistema Integral de Gestion y Acceso SSO eLibro), alineado al codigo actual del repositorio.

## 2. Alcance
Este documento cubre:
- Arquitectura general (frontend, backend, datos, pruebas)
- Seguridad y autenticacion
- Modulos funcionales y contratos API
- Flujo SSO con eLibro
- Observabilidad y despliegue
- Riesgos y decisiones abiertas

No cubre:
- Manuales de usuario
- Planes academicos de reporte
- Detalle exhaustivo de cada endpoint

## 3. Stack Tecnologico

### 3.1 Frontend
- React 19 + TypeScript + Vite
- React Router
- Tailwind + componentes UI reutilizables
- Cliente HTTP propio con manejo de sesion

### 3.2 Backend
- Spring Boot 3.5.x (Java 21)
- Spring Security JWT stateless
- Spring Data JPA + Hibernate
- MySQL 8 (runtime) / H2 (tests)
- Springdoc OpenAPI

### 3.3 Pruebas
- Playwright E2E en `tests/playwright`
- Integracion backend para exportaciones/reportes

### 3.4 Infraestructura
- Docker Compose: `mysql`, `backend`, `frontend`
- Nginx para servir SPA y proxy `/api`
- Jenkins pipeline para build/test/deploy

## 4. Arquitectura de Alto Nivel
SIGASe implementa una arquitectura por capas con separacion clara:

1. Cliente web (React) para administradores y estudiantes.
2. API REST versionada (`/api/v1`) con modulos de negocio.
3. Persistencia relacional y auditoria de eventos.
4. Integracion externa con proveedor eLibro via servicio SSO.

Patron dominante backend por modulo:
- Controller -> Service -> Repository -> Entity/DTO

## 5. Frontend Design

### 5.1 Estructura funcional
Features principales en `client/src/features`:
- `auth`
- `students`
- `admins`
- `dashboard`
- `access-logs`
- `audit-logs`
- `elibro-config`
- `student-portal`
- `notifications`
- `careers`

### 5.2 Ruteo y guardas
Ruteo centralizado en `client/src/app/router/route-config.tsx` con:
- `GuestGuard` para rutas publicas (`/login`, recuperacion)
- `SessionGuard` para rutas autenticadas
- `RoleGuard` por rol admin y admin TI
- Guardas de cambio obligatorio de contrasena para estudiantes

### 5.3 Sesion y API client
- Estado de sesion en `auth-session-store`
- Persistencia en localStorage (`sigase.auth.user`)
- Inyeccion automatica de Bearer token
- Invalidacion de sesion ante `401` por token expirado/invalidado
- Manejo de `PASSWORD_CHANGE_REQUIRED` en `403`

## 6. Backend Design

### 6.1 Prefijo API y versionado
- Prefijo global REST: `/api`
- Version funcional: `/v1`
- Base efectiva: `/api/v1`

### 6.2 Modulos backend
Modulos en `server/src/main/java/.../modules`:
- `auth`: login admin/estudiante, reset password, me/logout
- `students`: CRUD, metricas, importacion CSV, estado
- `admins`: gestion de administradores y dashboard metrics
- `elibro`: configuracion, validacion, acceso SSO, portal estudiante
- `dashboard`: analisis, metadata, opciones, export
- `accesslogs`: consulta y metricas de accesos
- `logs/audit`: trazabilidad/auditoria
- `notifications`: bandeja, conteo, preferencias
- `reports`: exportes de students/access logs/audit logs
- `careers`: catalogo de carreras

### 6.3 Patrones de servicio
- DTOs de request/response para contratos estables
- Validaciones de negocio con `BusinessException`
- Servicios especializados para export (CSV/XLSX)
- Servicios de soporte para analitica de dashboard

## 7. Seguridad

### 7.1 Modelo
- JWT stateless (sin sesion servidor)
- `JwtAuthenticationFilter` en cada request privada
- Roles por authorities (`ROLE_*`)

### 7.2 Rutas publicas
Permitidas explicitamente:
- OpenAPI/Swagger
- Healthcheck
- Login/reset y login Google

### 7.3 Endurecimiento
- Lockout policy configurable
- Invalidez por version de token en servidor
- Flujo forzado de cambio de contrasena en estudiantes
- CORS controlado con lista configurable + defaults locales

## 8. Datos y Persistencia

### 8.1 Base de datos
- Motor principal: MySQL
- JPA/Hibernate con `open-in-view=false`
- Zona horaria UTC en JDBC/Jackson

### 8.2 Entidades clave
- Estudiantes, historial de estado, eventos auth
- Administradores y eventos auth admin
- Configuracion eLibro, validaciones y accesos eLibro
- Logs de acceso y auditoria
- Notificaciones y preferencias

### 8.3 Configuracion
`AppProperties` concentra configuracion de:
- JWT
- lockout auth
- CORS
- sanitizacion de logs
- eLibro (base URL, encryption key, hosts permitidos)
- Google (dominio y audiencia)
- seed de administradores

## 9. Flujo SSO eLibro

Flujo principal (`ElibroSsoService`):
1. Valida estudiante autenticado y activo.
2. Valida `next` contra hosts permitidos.
3. Carga configuracion eLibro activa.
4. Descifra credenciales cifradas (AES).
5. Construye payload hacia eLibro.
6. Ejecuta POST con token proveedor.
7. Extrae URL de redireccion y responde al cliente.
8. Registra evento completo en log de acceso eLibro (success/failure, metadatos HTTP, latencia, provider status).

## 10. Observabilidad y Calidad

### 10.1 Observabilidad
- `actuator/health`
- `X-Request-Id` y `X-Correlation-Id`
- Sanitizacion configurable de PII en logs

### 10.2 Pruebas
- E2E Playwright multi-browser (chromium/firefox/webkit)
- Specs smoke para login, dashboard export, logs, expiracion de sesion
- Tests backend de integracion para exportes

## 11. Despliegue y Operacion

### 11.1 Compose
`docker-compose.yml` levanta:
- `mysql` con volumen persistente
- `backend` Spring Boot
- `frontend` Nginx + SPA

### 11.2 Pipeline Jenkins
Etapas implementadas:
1. Checkout
2. Preparacion de `.env`
3. Validacion Compose
4. Levantar DB
5. Tests backend
6. Build frontend
7. Build imagenes runtime
8. Deploy stack
9. Health checks

## 12. Riesgos Tecnicos Actuales
- Dependencia de variables de entorno para secretos criticos (debe mantenerse gestion segura en CI/CD).
- `ddl-auto=update` en desarrollo puede introducir drift si no se formalizan migraciones para produccion.
- Integracion con proveedor externo eLibro depende de disponibilidad/contrato del tercero.
- Diferencias de lockfiles en `tests/playwright` (npm/pnpm) pueden causar variacion de versiones si no se estandariza.

## 13. Habilidades que ayudan a mantener este design.md
Estas skills del entorno son las mas utiles para crear y mantener este documento:

1. `superpowers:writing-plans`
   - Ayuda a ordenar secciones, alcance y pasos de actualizacion documental.
2. `superpowers:verification-before-completion`
   - Obliga a validar el contenido contra codigo real antes de marcarlo como terminado.
3. `superpowers:requesting-code-review`
   - Util para pedir revision tecnica del documento cuando cambian modulos o contratos.
4. `github:github`
   - Facilita rastrear PRs/commits para actualizar decisiones de arquitectura.
5. `superpowers:systematic-debugging`
   - Sirve para documentar fallas arquitectonicas reales y su impacto en el design.

## 14. Fuentes de Verificacion
Este documento se construyo desde:
- `server/pom.xml`
- `server/src/main/resources/application*.properties`
- `server/src/main/java/mx/edu/utez/server/config/*`
- `server/src/main/java/mx/edu/utez/server/security/*`
- `server/src/main/java/mx/edu/utez/server/shared/api/ApiRoutes.java`
- `server/src/main/java/mx/edu/utez/server/modules/**`
- `client/src/app/router/route-config.tsx`
- `client/src/features/auth/store/auth-session-store.ts`
- `client/src/shared/lib/http/api-client.ts`
- `tests/playwright/playwright.config.ts`
- `docker-compose.yml`
- `Jenkinsfile`
- `DOCKER_CICD_MIGRATION_REPORT.md`

