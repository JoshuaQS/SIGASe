---
name: auth-session-hardening
description: Endurece autenticación y sesión en SIGASe. Úsala cuando cambien JWT, bootstrap de sesión, guards, roles admin/estudiante, `/auth/admin/me`, `/auth/student/me`, password reset, logout, `tokenVersion`, manejo de `401/403` o navegación de sesión en frontend y backend.
---

# Objetivo

Revisar auth y sesión como flujo completo, no como endpoints aislados.

# Cuándo usarla

- Al tocar `AdminAuthController`, `StudentAuthController` o servicios de auth.
- Al modificar `JwtTokenProvider`, `SessionTokenValidationService` o filtros de seguridad.
- Al cambiar `auth-session-store.ts`, guards o redirects post-login/logout.
- Cuando un ajuste de password reset, Google login o lockout pueda invalidar sesiones.

# Instrucciones detalladas

1. Lee el contrato vigente.
   - `server/docs/auth-session-contract.md`
   - controllers y DTOs de auth
   - `SecurityConfig` y handlers de `401/403`

2. Revisa backend.
   - emisión de JWT
   - claims y roles
   - expiración por tipo de usuario
   - `tokenVersion`
   - invalidación por cambio de contraseña
   - diferencias reales entre admin y estudiante

3. Revisa frontend.
   - `auth-session-store.ts`
   - `auth-api.ts`
   - guards en `client/src/router/guards/`
   - layouts y redirects
   - diálogo de sesión expirada

4. Confirma manejo correcto de estados.
   - bootstrap inicial
   - sesión persistida
   - token vencido
   - `PASSWORD_CHANGE_REQUIRED`
   - logout lógico
   - recuperación de contraseña
   - usuario sin permisos

5. Busca riesgos de hardening.
   - confiar en localStorage sin revalidación
   - asumir revoke de logout cuando no existe
   - mezclar `401` y `403`
   - perder distinción admin vs estudiante
   - dejar rutas protegidas accesibles por roles erróneos

6. Cierra con checklist QA.
   - login admin
   - login estudiante local
   - login Google estudiante
   - `/me`
   - logout
   - sesión expirada
   - cambio forzado de contraseña
   - reset de contraseña

# Formato de entrega

Entrega:

1. Mapa del flujo de sesión.
2. Riesgos detectados.
3. Ajustes recomendados en backend y frontend.
4. Checklist QA de auth.

# Criterios de calidad

- Debes revisar backend y frontend en conjunto.
- Debes distinguir claramente admin y estudiante.
- Debes hablar de `401`, `403`, `SESSION_EXPIRED` y `tokenVersion`.
- No asumas características de revoke que el backend no implementa hoy.
