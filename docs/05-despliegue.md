# Despliegue y Mantenimiento — SIVAPRE

Cómo actualizar el sistema en el VPS, construir nuevas versiones del APK, hacer backups y diagnosticar problemas.

---

## Índice

1. [Estado actual de producción](#1-estado-actual-de-producción)
2. [Conectarse al VPS](#2-conectarse-al-vps)
3. [Actualizar el backend](#3-actualizar-el-backend)
4. [Actualizar el dashboard](#4-actualizar-el-dashboard)
5. [Construir y distribuir el APK](#5-construir-y-distribuir-el-apk)
6. [Crear el primer administrador](#6-crear-el-primer-administrador)
7. [Backups de la base de datos](#7-backups-de-la-base-de-datos)
8. [Diagnóstico de problemas](#8-diagnóstico-de-problemas)
9. [Referencia de comandos Docker](#9-referencia-de-comandos-docker)
10. [Checklist antes de dar acceso a usuarios](#10-checklist-antes-de-dar-acceso-a-usuarios)

---

## 1. Estado actual de producción

| Componente | Dirección | Estado |
|---|---|---|
| Dashboard | `http://161.132.53.226` | Activo |
| API | `http://161.132.53.226/api/v1` | Activo |
| Fotos | `http://161.132.53.226/uploads/*` | Activo |
| APK (preview) | Descargable desde expo.dev | Activo |

### Cómo está organizado

Todo corre en un solo VPS con Docker Compose:

```
VPS: 161.132.53.226
├── nginx (puerto 80)         ← único punto de entrada
├── FastAPI (puerto 8000)     ← interno, solo accesible desde Docker
├── PostgreSQL (puerto 5432)  ← interno
└── Redis (puerto 6379)       ← interno
```

El repositorio está en `~/sivapre` del VPS. Los datos persisten en volúmenes Docker que **sobreviven** a reinicios y a `docker compose down`.

---

## 2. Conectarse al VPS

```bash
ssh usuario@161.132.53.226
```

Una vez conectado, ir al directorio del proyecto:

```bash
cd ~/sivapre
```

La sesión SSH puede cerrarse sin problema — los contenedores Docker siguen corriendo en segundo plano. Los datos no se pierden al cerrar la laptop o cortar la conexión.

---

## 3. Actualizar el backend

### Caso más común — cambio de código Python

```bash
# 1. Bajar los cambios del repositorio
git pull origin main

# 2. Reconstruir el contenedor del backend
docker compose up -d --build backend

# 3. Verificar que está corriendo bien
docker logs sivapre_backend --tail 50
```

### Si solo cambió el .env (variables de entorno)

```bash
# Las variables se leen al arrancar — solo hace falta reiniciar
docker restart sivapre_backend
```

### Si hay nuevas migraciones de base de datos

Las migraciones se aplican automáticamente al iniciar el contenedor. Para aplicarlas manualmente si algo falla:

```bash
docker exec sivapre_backend alembic upgrade head

# Ver qué migración está aplicada actualmente
docker exec sivapre_backend alembic current
```

### Verificar que el backend responde

```bash
curl http://161.132.53.226/api/v1/health
# Debe devolver: {"status": "ok", "db": "ok"}
```

Si el health check devuelve 503, la base de datos no está respondiendo:

```bash
docker ps   # verificar que sivapre_db está en estado "healthy"
docker logs sivapre_db --tail 30
```

---

## 4. Actualizar el dashboard

El dashboard es un sitio estático. Para actualizar hay que hacer el build y copiar los archivos al contenedor de nginx.

```bash
# 1. Bajar los cambios
git pull origin main

# 2. Instalar dependencias si cambiaron (si no, se puede saltar)
cd dashboard && npm install && cd ..

# 3. Construir
cd dashboard && npm run build && cd ..

# 4. Reiniciar el contenedor de nginx
#    (usa el volumen montado en docker-compose: ./dashboard/dist → /usr/share/nginx/html)
docker restart sivapre_dashboard

# 5. Verificar
curl -s http://161.132.53.226 | head -5
# Debe devolver las primeras líneas del index.html
```

**Por qué `docker restart` en vez de reconstruir la imagen**: el `docker-compose.yml` monta `./dashboard/dist` como un volumen de solo lectura en nginx. Al hacer el build local y reiniciar, nginx ya ve los nuevos archivos. No hace falta reconstruir la imagen Docker del dashboard.

---

## 5. Construir y distribuir el APK

El APK se construye en los servidores de Expo (EAS Build), no en el VPS.

### Requisitos en tu máquina local

```bash
npm install -g eas-cli
eas login   # con la cuenta de expo.dev
```

### Construir el APK de prueba (preview)

```bash
cd mobile

# Construir — tarda ~10-15 minutos en los servidores de EAS
eas build --platform android --profile preview

# Al terminar muestra un enlace de descarga y un QR
# También se puede ver en: expo.dev/accounts/emmy_lopez/projects/sivapre/builds
```

### Ver los builds anteriores

```bash
eas build:list --platform android --limit 5
```

### Qué incluye cada perfil

| Perfil | API URL | Tipo | Uso |
|---|---|---|---|
| `preview` | `http://161.132.53.226/api/v1` | APK | Pruebas internas, distribución a inspectores |
| `production` | `https://api.sivapre.gob/api/v1` | AAB | Google Play Store (futuro) |

### Cuándo reconstruir el APK

- Cuando cambia la URL del backend (`EXPO_PUBLIC_API_URL`)
- Cuando se instala un nuevo paquete con módulo nativo
- Cuando cambia `app.json` (íconos, permisos, plugins)

Para cambios solo en código TypeScript, se puede publicar una actualización sin rebuild:

```bash
eas update --branch preview --message "descripción del cambio"
```

---

## 6. Crear el primer administrador

Solo se puede hacer una vez — el endpoint deja de funcionar después de que existe al menos un administrador.

```bash
curl -X POST http://161.132.53.226/api/v1/auth/setup \
  -H "Content-Type: application/json" \
  -d '{
    "admin_secret": "valor-de-ADMIN_SECRET_KEY-en-.env",
    "nombre": "Administrador",
    "email": "admin@sivapre.gob.pe",
    "password": "contraseña-segura-minimo-8-chars"
  }'
```

La clave `admin_secret` debe coincidir con `ADMIN_SECRET_KEY` en `backend/.env`.

Una vez creado el primer admin, los inspectores y demás admins se crean desde el dashboard en **Gestión de Personal**.

---

## 7. Backups de la base de datos

### Backup manual

```bash
# Crear backup con timestamp
docker exec sivapre_db pg_dump -U sivapre sivapre_db \
  > ~/backups/sivapre_$(date +%Y%m%d_%H%M).sql

echo "Backup creado: ~/backups/sivapre_$(date +%Y%m%d_%H%M).sql"
```

### Backup automático con crontab

```bash
# Editar el crontab del servidor
crontab -e

# Agregar esta línea para hacer backup todos los días a las 2:00 AM:
0 2 * * * docker exec sivapre_db pg_dump -U sivapre sivapre_db > /home/usuario/backups/sivapre_$(date +\%Y\%m\%d).sql
```

Recomendación: copiar los backups a un servicio externo (Dropbox, Google Drive, S3) para que no estén en el mismo disco que los datos.

### Restaurar desde backup

```bash
# ⚠️ Esto reemplaza toda la base de datos actual
cat backup_20260513.sql \
  | docker exec -i sivapre_db psql -U sivapre -d sivapre_db
```

### Backup de fotos

Las fotos están en el volumen Docker `uploads_data`. Para hacer backup:

```bash
# Comprimir y copiar el directorio de uploads
docker exec sivapre_backend tar czf /tmp/uploads_backup.tar.gz /app/uploads
docker cp sivapre_backend:/tmp/uploads_backup.tar.gz ~/backups/
```

---

## 8. Diagnóstico de problemas

### La app muestra "Network Error"

1. Verificar que el backend está corriendo: `docker ps`
2. Verificar que nginx responde: `curl http://161.132.53.226/api/v1/health`
3. Ver logs del backend: `docker logs sivapre_backend --tail 50`
4. Ver logs de nginx: `docker logs sivapre_dashboard --tail 20`

### El dashboard no carga / muestra página en blanco

1. Verificar que el contenedor nginx está corriendo: `docker ps`
2. Verificar que `dashboard/dist/` existe y tiene archivos: `ls dashboard/dist/`
3. Si `dist/` está vacío: reconstruir con `cd dashboard && npm run build`
4. Reiniciar nginx: `docker restart sivapre_dashboard`

### La base de datos no responde

```bash
# Ver estado del contenedor
docker ps | grep sivapre_db

# Ver logs de PostgreSQL
docker logs sivapre_db --tail 50

# Reiniciar (los datos persisten en el volumen)
docker restart sivapre_db

# Verificar que el health check pasa
docker inspect sivapre_db | grep -A 5 '"Health"'
```

### El backend no aplica las migraciones

```bash
# Ver qué migraciones están pendientes
docker exec sivapre_backend alembic upgrade head --sql | head -30

# Aplicar manualmente
docker exec sivapre_backend alembic upgrade head

# Ver el historial
docker exec sivapre_backend alembic history
```

### Redis no responde (rate limiting desactivado)

Si Redis cae, el backend sigue funcionando pero sin rate limiting. Ver los logs:

```bash
docker logs sivapre_redis --tail 20
docker restart sivapre_redis
```

### Ver todos los logs juntos

```bash
docker compose logs -f
# Ctrl+C para salir
```

---

## 9. Referencia de comandos Docker

```bash
# Estado de todos los contenedores
docker ps

# Estado incluyendo contenedores parados
docker ps -a

# Logs de un contenedor (en tiempo real)
docker logs sivapre_backend -f
docker logs sivapre_db -f
docker logs sivapre_dashboard -f

# Acceder a la terminal de un contenedor
docker exec -it sivapre_backend bash
docker exec -it sivapre_db psql -U sivapre -d sivapre_db

# Reiniciar un contenedor
docker restart sivapre_backend

# Reiniciar todos los contenedores
docker compose restart

# Detener todo (los datos persisten)
docker compose down

# Levantar todo
docker compose up -d

# Reconstruir un contenedor específico
docker compose up -d --build backend

# Ver cuánto espacio usan los volúmenes y contenedores
docker system df -v
```

---

## 10. Checklist antes de dar acceso a usuarios

### Seguridad

- [ ] `JWT_SECRET_KEY` es una clave aleatoria única (no la del repo)
- [ ] `ADMIN_SECRET_KEY` es una clave aleatoria única
- [ ] `DEBUG=False` en `backend/.env`
- [ ] `ALLOWED_ORIGINS` tiene la URL correcta (no `*`)
- [ ] `POSTGRES_PASSWORD` es una contraseña segura

### Funcionalidad

- [ ] `curl http://161.132.53.226/api/v1/health` devuelve `{"status": "ok", "db": "ok"}`
- [ ] El dashboard carga en `http://161.132.53.226`
- [ ] El login funciona en el dashboard
- [ ] El login funciona en el APK
- [ ] Se puede enviar un reporte desde el APK (con foto y GPS)
- [ ] El reporte aparece en el dashboard
- [ ] Cambiar el estado de un reporte desde el dashboard funciona

### Datos y backups

- [ ] Backup automático configurado en crontab
- [ ] Hay al menos un admin creado con `POST /auth/setup`
- [ ] Los inspectores tienen sus cuentas creadas desde el dashboard
