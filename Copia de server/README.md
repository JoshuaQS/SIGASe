# SIGASe Backend

## Variables de entorno

Spring Boot no carga `.env` automáticamente por defecto.  
Este proyecto lo habilita con:

```properties
spring.config.import=optional:file:.env[.properties]
```

Nota:
- `.env` se interpreta con sintaxis de `.properties`.
- Evita variables anidadas en el mismo `.env` para prevenir warnings del parser de IDE.

## Configuración rápida

1. Copia el ejemplo:

```bash
cp .env.example .env
```

2. Ajusta tus valores reales en `.env`.
3. Inicia el backend desde la carpeta `server/`.

## Gestión de entorno local

- `.env` es **solo local** (no versionable).
- `.env.example` es la plantilla oficial versionada para nuevos entornos.
- Si necesitas nuevas variables, agrégalas primero en `.env.example`.

## Variables críticas

Si faltan estas variables, la app fallará al iniciar con error claro de configuración:

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `APP_JWT_SECRET`
- `APP_AES_SECRET`
- `APP_GOOGLE_CLIENT_ID`
- `APP_GOOGLE_ALLOWED_DOMAIN`
- `APP_ELIBRO_ALLOWED_HOSTS`

## Seguridad

- Nunca subas `.env` al repositorio.
- Usa secretos distintos por ambiente.
- No imprimas secretos en logs.

## Migraciones de esquema

Actualmente el backend no aplica migraciones automáticas con Flyway/Liquibase en runtime.
Para cambios de esquema se utiliza script SQL versionado + guía de rollout:

- Script: `docs/db/migrations/2026-04-02_add_token_version_columns_mysql.sql`
- Guía: `docs/db/token-version-migration.md`

## Naming de package base

La migración de package base (`mx.edu.utez.server` → `mx.edu.utez.sigase`) está documentada como fase separada para evitar renaming parcial riesgoso:

- `docs/architecture/package-base-migration-plan.md`
