# Reporte de Migracion Docker y CI/CD para SIGASe

Fecha: 2026-04-13

## Objetivo

Adaptar la infraestructura heredada de contenedores y pipeline CI/CD a la arquitectura real y actual de SIGASe, eliminando acoplamientos al stack anterior y dejando una base limpia, moderna y lista para despliegue con:

- Backend: Spring Boot 3.x, Java 21, JPA/Hibernate, MySQL 8
- Frontend: React, Vite, TypeScript, Tailwind, shadcn/ui
- Orquestacion: Docker Compose
- Pipeline: Jenkins

## Alcance implementado

Se migraron y generaron los siguientes archivos dentro del repo actual:

- [docker-compose.yml](/Users/joshqs/Documents/GitHub/SIGASe/docker-compose.yml)
- [server/Dockerfile](/Users/joshqs/Documents/GitHub/SIGASe/server/Dockerfile)
- [client/Dockerfile](/Users/joshqs/Documents/GitHub/SIGASe/client/Dockerfile)
- [Jenkinsfile](/Users/joshqs/Documents/GitHub/SIGASe/Jenkinsfile)
- [client/nginx.docker.conf](/Users/joshqs/Documents/GitHub/SIGASe/client/nginx.docker.conf)
- [server/.dockerignore](/Users/joshqs/Documents/GitHub/SIGASe/server/.dockerignore)
- [.env.example](/Users/joshqs/Documents/GitHub/SIGASe/.env.example)

## Analisis del stack heredado

Los archivos heredados provenian de una solucion distinta a SIGASe:

- Backend basado en Node.js/NestJS/Prisma.
- Frontend basado en Next.js con salida `.next/standalone`.
- Base de datos PostgreSQL.
- SSL/TLS embebido dentro del contenedor frontend.
- Pipeline Jenkins con repo, branch, nombres de proyecto, puertos y rutas hardcodeadas para otro sistema.

### Problemas detectados

- El `back-Dockerfile` heredado no era compatible con Spring Boot ni con Java 21.
- El `front-Dockerfile` heredado esperaba artefactos de Next.js y variables `NEXT_PUBLIC_*`, mientras SIGASe usa Vite y `VITE_*`.
- El `docker-compose` heredado publicaba una arquitectura que no correspondia al contrato actual del backend ni al runtime del frontend.
- Los healthchecks apuntaban a endpoints equivocados para el stack actual.
- La configuracion vieja mezclaba responsabilidades de proxy, SSL y runtime de frontend dentro del mismo contenedor.
- El pipeline viejo probaba cosas dentro de contenedores runtime que ya no son el lugar correcto para compilar o testear.

## Implementacion realizada

## 1. Docker Compose nuevo

Se implemento una composicion de tres servicios:

- `mysql`
- `backend`
- `frontend`

### Decisiones aplicadas

- Se cambio PostgreSQL por MySQL 8.4, alineado al `mysql-connector-j` y a la configuracion real de Spring.
- Se elimino el uso de red externa heredada y se definio una red propia del proyecto.
- Se eliminaron `container_name` fijos para evitar acoplamiento innecesario y mejorar portabilidad.
- Se agrego volumen persistente `mysql-data`.
- Se definieron healthchecks reales para los tres servicios.
- El backend se expone en loopback del host para reducir superficie publica.
- El frontend publica HTTP por Nginx y se comunica con el backend por red interna.

### Ajuste importante de runtime

El backend actual tiene un `server/.env` de desarrollo que incluye `SPRING_JPA_HIBERNATE_DDL_AUTO=update`. Para evitar que eso se cuele al despliegue:

- en runtime Docker se forza `SPRING_PROFILES_ACTIVE=prod`
- en runtime Docker se fuerza `SPRING_JPA_HIBERNATE_DDL_AUTO=validate`
- solo en pruebas del pipeline se usa `update`

## 2. Dockerfile del backend

Se reemplazo el Dockerfile heredado por un build multi-stage para Spring Boot:

- stage de build con `maven:3.9.11-eclipse-temurin-21-alpine`
- stage runtime con `eclipse-temurin:21-jre-alpine`

### Mejoras aplicadas

- empaquetado real del JAR Spring Boot
- uso de Java 21
- runtime mas pequeno al usar JRE en lugar de imagen completa de Maven
- usuario no root dentro del contenedor
- cache de Maven en build para acelerar builds posteriores

### Ajuste adicional

Se elimino un paso que instalaba `wget` en runtime porque la imagen base ya lo trae. Eso evita depender de mirrors Alpine durante el build final.

## 3. Dockerfile del frontend

Se reutilizo la logica correcta para Vite y se adapto a una version final lista para CI/CD:

- stage de dependencias con Node 22 Alpine
- stage de build con `npm run build`
- stage final con `nginx:1.27-alpine`

### Mejoras aplicadas

- uso de `VITE_API_URL` en lugar de `NEXT_PUBLIC_API_URL`
- publicacion del `dist/` de Vite en Nginx
- eliminacion completa de acoplamiento a `.next/`
- separacion clara entre build y runtime

### Hardening por inestabilidad de red

Durante la validacion real aparecieron errores `ECONNRESET` contra `registry.npmjs.org` al ejecutar `npm ci` dentro de Docker. Para reducir ese riesgo se agregaron:

- `fetch-retries=5`
- `fetch-retry-mintimeout=20000`
- `fetch-retry-maxtimeout=120000`
- `maxsockets=1`

Esto no cambia el producto final, pero vuelve mas robusto el proceso de instalacion de dependencias en CI.

## 4. Configuracion Nginx del frontend

Se ajusto [client/nginx.docker.conf](/Users/joshqs/Documents/GitHub/SIGASe/client/nginx.docker.conf) para:

- servir correctamente la SPA de Vite
- proxyear `/api/` hacia `backend:8080`
- agregar un endpoint `GET /healthz`

### Beneficio

El healthcheck del frontend ya no depende de que la SPA responda ni de que el backend este disponible para validar que Nginx esta arriba.

## 5. Jenkinsfile nuevo

Se creo un pipeline nuevo orientado al stack real del proyecto.

### Flujo implementado

1. `Checkout`
2. `Prepare Environment Files`
3. `Validate Compose`
4. `Stop Previous Stack`
5. `Start Database`
6. `Run Backend Tests`
7. `Validate Frontend Build`
8. `Build Runtime Images`
9. `Deploy Stack`
10. `Health Checks`

### Decisiones importantes

- Se usa `checkout scm` en lugar de repo/branch hardcodeados.
- Se espera que Jenkins inyecte:
  - `.env` para Docker Compose
  - `server/.env` para secretos y configuracion del backend
- Las pruebas backend corren en un contenedor Maven separado sobre la misma red Docker del stack.
- La validacion del frontend se hace en un contenedor Node temporal, no en la imagen final de Nginx.
- El deploy queda centrado en `docker compose up -d`, sin reinventar el flujo del servidor.

## Archivos auxiliares agregados

## `.env.example`

Se agrego [/.env.example](/Users/joshqs/Documents/GitHub/SIGASe/.env.example) para documentar variables de Compose y separar:

- configuracion de Compose
- credenciales y secretos reales del backend

## `server/.dockerignore`

Se agrego [server/.dockerignore](/Users/joshqs/Documents/GitHub/SIGASe/server/.dockerignore) para reducir contexto de build y evitar empaquetar archivos innecesarios.

## Resultados de validacion

## Validaciones exitosas

- Se genero correctamente la configuracion de Compose con:
  - `docker compose --env-file .env.example -f docker-compose.yml config -q`
- La imagen del backend construyo correctamente con el Dockerfile final.
- La configuracion final ya no depende de:
  - Prisma
  - Next.js
  - PostgreSQL
  - SSL dentro del contenedor frontend
  - rutas o nombres hardcodeados del proyecto anterior

## Resultado del build del backend

El backend termino exitosamente:

- compilacion Java correcta
- empaquetado Spring Boot correcto
- JAR final generado correctamente
- imagen final construida como `sigase-backend:latest`

## Resultado del build del frontend

El frontend no quedo invalidado por configuracion del repo ni por errores de Vite. El problema observado durante la validacion fue externo al codigo:

- `npm ci` dentro de Docker sufrio multiples `ECONNRESET` contra `registry.npmjs.org`
- el fallo fue intermitente y de red
- por ello se endurecio el Dockerfile y el stage de Jenkins con reintentos y menor concurrencia

### Conclusiones sobre este punto

- No se detecto incompatibilidad estructural del frontend con la solucion propuesta.
- El riesgo remanente esta en la conectividad del entorno hacia npm durante la descarga de dependencias.
- En un Jenkins con salida estable a internet o cache de npm, la solucion deberia comportarse correctamente.

## Estado final de la migracion

La migracion quedo implementada a nivel de archivos, estructura y pipeline para el stack actual de SIGASe.

### Estado por componente

- Docker Compose: listo
- Backend Dockerfile: listo y validado
- Frontend Dockerfile: listo, endurecido contra fallos de red
- Nginx frontend: listo
- Jenkinsfile: listo y alineado al stack real
- Variables base de Compose: listas

## Riesgos o pendientes remanentes

- Confirmar los IDs reales de Jenkins Credentials si no seran:
  - `sigase-compose-env`
  - `sigase-server-env`
- Confirmar si el puerto publico final del frontend sera `18080` o si quedara detras de otro reverse proxy del servidor.
- Confirmar que el entorno Jenkins tenga conectividad estable a `registry.npmjs.org`.
- Si se quiere endurecer aun mas el pipeline, podria considerarse cache local de dependencias npm en Jenkins, pero eso ya es una optimizacion operativa, no un requisito de esta migracion.

## Resumen ejecutivo

Se reemplazo completamente la infraestructura heredada basada en Node/Next/Postgres por una implementacion coherente con SIGASe:

- MySQL 8 como base de datos
- Spring Boot 3.x + Java 21 para backend
- React/Vite servido por Nginx para frontend
- Docker Compose simple y limpio
- Jenkins pipeline orientado a pruebas reales, build correcto y despliegue consistente

El backend y la configuracion Compose quedaron validados. El frontend quedo correctamente migrado a nivel de arquitectura y archivos, con endurecimiento adicional por inestabilidad de red detectada durante la prueba de `npm ci`.
