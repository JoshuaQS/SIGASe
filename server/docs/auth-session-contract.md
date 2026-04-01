# Auth Session Contract (Phase 0/1)

## Admin logout behavior
- Endpoint: `POST /api/v1/auth/admin/logout`
- Current behavior: logical logout only.
- Server-side JWT revocation: not implemented in this phase.
- Client responsibility:
  - remove JWT from storage
  - clear session state
  - redirect to login

## Student logout behavior
- Current behavior: logical logout only (client-side).
- Server-side JWT revocation: not implemented in this phase.
- Client responsibility:
  - remove JWT from storage
  - clear session state
  - redirect to login

## Expired token contract
All protected endpoints return `401` with consistent payload for expired token:

```json
{
  "success": false,
  "message": "Sesión expirada. Inicia sesión nuevamente.",
  "errorCode": "SESSION_EXPIRED",
  "timestamp": "...",
  "requestId": "..."
}
```

## Student Google auth semantics

- `401`:
  - Google token inválido/malformado/no verificable (`INVALID_TOKEN`)
- `403`:
  - token Google válido pero sin autorización institucional (`FORBIDDEN`):
    - dominio institucional no permitido
    - estudiante no registrado
    - estudiante inactivo
    - `googleSubject` no coincide con el registro institucional
