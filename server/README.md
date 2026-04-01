# SGB-UTEZ Backend

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
