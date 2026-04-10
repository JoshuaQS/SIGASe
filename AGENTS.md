# SIGASe

## Qué es este repo

SIGASe es una plataforma administrativa universitaria para UTEZ con dos superficies principales:

- portal administrativo para gestión, monitoreo, reportes y configuración de eLibro
- portal estudiantil para acceso autenticado hacia eLibro y gestión de primer acceso/contraseña

Stack real del repo:

- `server/`: Java 17, Spring Boot 3.3, Spring Security, Spring Data JPA, MySQL, JWT, Maven
- `client/`: React 19, Vite 8, TypeScript 5, Tailwind v4, React Router 7, Zustand, React Hook Form, Recharts, base UI estilo shadcn `radix-nova`
- `tests/playwright/`: Playwright E2E

Módulos backend visibles hoy:

- `admins`
- `auth`
- `careers`
- `dashboard`
- `elibro`
- `logs/audit`
- `reports`
- `students`

Módulos frontend visibles hoy:

- `modules/admin`
- `modules/auth`
- `modules/student`
- `modules/system`

## Reglas de arquitectura

- El backend es la fuente de verdad para reglas de negocio, permisos, estados y contratos.
- Prefiere refactors limpios sobre bridges temporales. Si necesitas compatibilidad legacy, elimínala en el mismo PR o deja un plan explícito de retiro.
- No hagas renames parciales de arquitectura transversal. El cambio de package base está diferido y documentado en `server/docs/architecture/package-base-migration-plan.md`.
- No introduzcas contratos “parche” en frontend para tapar un contrato backend deficiente. Primero corrige el contrato o documenta el gap.
- Si tocas esquema, asume migración manual: este repo no usa Flyway/Liquibase en runtime. Versiona SQL en `server/docs/db/migrations/` y acompáñalo con guía de rollout si el cambio lo amerita.

## Backend

- Mantén la organización por dominio: `controller`, `service`, `repository`, `dto`, `entity`, `mapper`.
- Reutiliza `ApiRoutes`, `ApiResponse`, `PageResponse` y `BusinessException` antes de inventar patrones paralelos.
- Expón DTOs explícitos; no devuelvas entidades JPA directamente.
- Usa enums y columnas de estado reales (`status`, `tokenVersion`, etc.) en vez de revivir flags legacy booleanos.
- Cuando veas bridges como `setActive/isActive` en entidades (`Admin`, `Career`), trátalos como deuda temporal, no como patrón a expandir.
- Si cambias auth o sesión, revisa también `server/docs/auth-session-contract.md`, `JwtTokenProvider`, `JwtAuthenticationFilter` y `SessionTokenValidationService`.
- Cualquier cambio a logs, exportaciones o dashboard debe validar impacto en `reports`, `dashboard`, `elibro` y tests de integración.

## Frontend

- Mantén el frontend modular por dominio. La lógica de cada área debe vivir en `client/src/modules/<dominio>`, no dispersa en `components/` sin necesidad.
- Centraliza consumo HTTP en `client/src/lib/api/`. No metas `fetch` o `axios` ad hoc dentro de páginas.
- Los tipos TS deben seguir el contrato backend real. Evita ensanchar tipos con unions heredadas salvo que el backend realmente emita esos valores.
- Antes de agregar un mapper/adaptador nuevo, verifica si el shape incorrecto viene de deuda previa en `client/src/types/api.ts` o en un cliente API existente.
- Si el backend ya expone un endpoint real, no dejes páginas admin con datasets mock. Hoy eso ya es un olor visible en `AccessLogs.tsx` y `AuditLogs.tsx`.
- Respeta `client/components.json` y `client/src/styles/global.css` como fuente de tokens, tema y primitives visuales.
- Evita hardcodes visuales cuando ya exista token semántico o componente base.

## Frontend UI y estandarización

- El objetivo visual del frontend admin es SaaS/admin real: denso pero claro, consistente y operativo. No mezcles estilos exploratorios con pantallas productivas.
- Reutiliza primero los patrones ya presentes en `client/src/components/ui/` y `client/src/components/modalsfinal/` antes de crear variantes nuevas.
- Prefiere explícitamente:
  - `SectionHeader` para cabeceras de vista
  - `StatusCard` para KPIs/resúmenes
  - `DataTable` para listados tabulares estándar
  - `filters-panel` o patrones compartidos equivalentes para filtros
  - `Dialog` + `modalFormPrimitives` para formularios/modales
  - `AppConfirmDialog` para acciones destructivas o sensibles
  - `AppToastProvider` / `useAppToast` para feedback transitorio
- Mantén consistencia con el módulo de estudiantes cuando exista un patrón visual reutilizable de densidad, whitespace, jerarquía o composición.
- No crees variantes visuales paralelas sin una razón funcional clara. Si una pantalla puede adoptar el patrón compartido, migra al patrón compartido.
- No hagas refactors cosméticos aislados. Si una vista se toca por UI, mejora layout, proporciones, whitespace y jerarquía en la misma intervención, pero sin romper lógica ni contratos.
- Si una vista se ve “fea” o improvisada, corrige composición, alineación, ritmo vertical, estados vacíos/loading/error y densidad visual antes de inventar componentes nuevos.
- Para vistas de lista admin, prefiere esta secuencia si aplica:
  - `SectionHeader`
  - KPIs o summary cards
  - bloque de filtros consistente
  - tabla o grid de cards
  - paginación, acciones y dialogs alineados al mismo patrón
- Si existe vista tabla y vista cards para el mismo dataset, ambas deben compartir filtros, acciones, estados y semántica.
- Cuando existan mocks visuales en admin y el contrato backend real ya exista, prioriza conectarlos al backend en lugar de pulir el mock indefinidamente.
- Evita abrir una deuda nueva de “estandarizar luego”. Si detectas drift visual obvio durante un cambio funcional, deja la corrección incluida o documenta por qué no entró.

## Codex y skills locales

- Este repo usa instrucciones globales en `AGENTS.md`.
- Las skills locales del proyecto viven en `.agents/skills/<skill-name>/SKILL.md`. Mantén una carpeta por skill y evita documentación auxiliar innecesaria.
- Para cambios de frontend/UI, prioriza las skills locales de estandarización antes de improvisar criterios:
  - `design-system-guardian`
  - `component-standardizer`
  - `layout-refiner`
- Si una tarea toca layout, tablas, modales, filtros, cards, jerarquía visual o tokens, usa esas skills como marco de revisión e implementación.
- Las descripciones de las skills deben ser suficientemente claras para activación implícita y explícita; si una skill deja de reflejar el repo real, actualízala junto con el sistema visual.

## Dashboard, monitoreo y reportes

- El dashboard administrativo debe medir accesos reales a eLibro, no logins internos a SIGASe.
- Separa semánticamente:
  - `Monitoreo y Reportes`: KPIs, tendencias, rankings, exportación analítica
  - `Registros`: access logs y audit logs explorables
- Un filtro aplicado debe impactar de forma coherente KPIs, tablas, gráficas y exportaciones.
- No mezcles filtros globales con filtros locales silenciosos. Si una vista exporta, debe exportar el mismo scope que el usuario está viendo.
- Verifica siempre el alineamiento entre frontend, controller y tests. Ya hay señales de drift en parámetros de dashboard/reportes entre cliente, controller y pruebas.

## Seguridad

- Trata admin y estudiante como superficies distintas: endpoints, roles, bootstrap de sesión y UX de error no son equivalentes.
- Conserva respuestas consistentes para `401`, `403` y `SESSION_EXPIRED`.
- El logout actual es lógico/client-side; la invalidación fuerte depende de `tokenVersion`. No vendas revoke inmediato si el backend no lo implementa.
- No expongas secretos, tokens, correos completos, IPs completas ni metadata sensible en logs o payloads.
- Si tocas recovery, lockout o Google login, revisa también sanitización y trazabilidad.

## Logs y auditoría

- Toda respuesta de error relevante y todo evento sensible debe poder correlacionarse con `requestId` y `correlationId`.
- Reutiliza `RequestCorrelationFilter`, `RequestContext` y `SecurityLogSanitizer`; no dupliques sanitización a mano.
- Audit logs deben registrar actor, outcome, severity, módulo, entidad afectada y contexto útil para soporte/auditoría.
- Access logs deben reflejar el flujo real hacia eLibro: resultado, latencia, canal, errores del proveedor y contexto de red ya sanitizado.
- Exportaciones y cambios administrativos críticos deben dejar traza auditable.

## Estilo de trabajo esperado

- Empieza por leer código y tests existentes antes de proponer estructura nueva.
- Si hay doc interna útil, intégrala al cambio en lugar de ignorarla. En este repo son especialmente importantes:
  - `server/docs/auth-session-contract.md`
  - `server/docs/db/migrations/*`
  - `server/docs/db/token-version-migration.md`
  - `server/docs/db/elibro-config-overview-migration.md`
  - `server/docs/architecture/package-base-migration-plan.md`
- Cuando un cambio sea transversal, deja checklist de impacto: backend, frontend, exportaciones, dashboard, seguridad y QA.
- Si hay contradicción entre código, tests y docs, no la escondas: documéntala y corrige la fuente de verdad.

## Anti-patrones a evitar

- dejar mocks en pantallas administrativas que ya deberían pegar a API
- aceptar nombres de query params viejos solo para “que no se rompa” sin decidir una fuente de verdad
- agregar hardcodes de color, spacing o layout por fuera de los tokens de `global.css`
- ensanchar tipos TS para convivir con contratos malos indefinidamente
- meter compatibilidad legacy nueva por defecto
- parches locales en frontend para ocultar permisos, filtros o códigos HTTP mal definidos
- renames parciales de paquetes o arquitectura base
- abrir variantes de tabla, modal, card o header cuando el repo ya tiene un patrón equivalente
- pulir visualmente mocks administrativos sin decidir si ya deben vivir contra backend real
