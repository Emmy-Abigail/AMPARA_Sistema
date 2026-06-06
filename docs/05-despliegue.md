# Despliegue y Mantenimiento — Ampara

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
| Fotos y audio | `http://161.132.53.226/uploads/*` | Activo |
| APK (preview) | expo.dev → proyecto ampara | Activo |

### Cómo está organizado

Todo corre en un solo VPS con Docker Compose:

```
VPS: 161.132.53.226
├── ampara_dashboard (nginx, puerto 80)   ← único punto de entrada
├── ampara_backend  (FastAPI, puerto 8000) ← interno
├── ampara_db       (PostgreSQL, puerto 5432) ← interno
└── ampara_redis    (Redis, puerto 6379)  ← interno
```

El repositorio está en `~/ampara` del VPS. Los datos persisten en volúmenes Docker que **sobreviven** a reinicios y a `docker compose down`.

---

## 2. Conectarse al VPS

```bash
ssh abigail@10.234.162.153   # red local (Pi / VPS local)
# o
ssh usuario@161.132.53.226   # VPS público
```

Una vez conectado:

```bash
cd ~/ampara
```

Los contenedores siguen corriendo aunque se cierre la sesión SSH.

---

## 3. Actualizar el backend

### Cambio de código Python (lo más común)

```bash
git pull origin main
docker compose up -d --build backend
docker logs ampara_backend --tail 50
```

### Solo cambió `.env`

```bash
docker restart ampara_backend
```

### Hay nuevas migraciones

Las migraciones se aplican automáticamente al arrancar. Para aplicarlas manualmente:

```bash
docker exec ampara_backend alembic upgrade head
docker exec ampara_backend alembic current   # ver migración activa
```

### Verificar que el backend responde

```bash
curl http://161.132.53.226/api/v1/health
# Debe devolver: {"status": "ok", "db": "ok"}
```

---

## 4. Actualizar el dashboard

El dashboard es un sitio estático. Para actualizar, construir localmente y copiar los archivos.

**Opción A — desde la máquina de desarrollo:**

```bash
# 1. Construir
cd dashboard && npm run build && cd ..

# 2. Copiar al servidor
scp -r dashboard/dist/* abigail@10.234.162.153:/home/abigail/ampara/dashboard/dist/

# 3. Reiniciar nginx (lee del volumen montado)
ssh abigail@10.234.162.153 "docker restart ampara_dashboard"
```

**Opción B — desde el VPS:**

```bash
git pull origin main
cd dashboard && npm install && npm run build && cd ..
docker restart ampara_dashboard
```

**Por qué `docker restart` y no reconstruir la imagen**: el `docker-compose.yml` monta `./dashboard/dist` como volumen de solo lectura en nginx. Al hacer el build y reiniciar, nginx ya ve los nuevos archivos.

---

## 5. Construir y distribuir el APK

El APK se construye en los servidores de Expo (EAS Build), no en el VPS.

### Requisitos en tu máquina local

```bash
npm install -g eas-cli
eas login   # cuenta emmy_lopez en expo.dev
```

### Construir el APK de prueba (preview)

```bash
cd mobile
eas build --platform android --profile preview
# Tarda ~10-15 min. Al terminar muestra el enlace de descarga.
# También en: expo.dev/accounts/emmy_lopez/projects/ampara/builds
```

### Ver los builds anteriores

```bash
eas build:list --platform android --limit 5
```

### Cuándo reconstruir

- Cuando cambia `EXPO_PUBLIC_API_URL`
- Cuando se instala un nuevo paquete nativo
- Cuando cambia `app.json` (íconos, permisos, plugins)

Para cambios solo en código TypeScript/TSX, se puede usar EAS Update (sin rebuild):

```bash
eas update --branch preview --message "descripción del cambio"
```

---

## 6. Crear el primer administrador

Solo funciona una vez — el endpoint se desactiva cuando ya existe al menos un admin.

```bash
curl -X POST http://161.132.53.226/api/v1/auth/setup \
  -H "Content-Type: application/json" \
  -d '{
    "admin_secret": "valor-de-ADMIN_SECRET_KEY-en-.env",
    "nombre": "Administrador",
    "email": "admin@ampara.pe",
    "password": "contraseña-segura-minimo-8-chars"
  }'
```

Una vez creado, los operadores y demás admins se crean desde el dashboard en **Gestión de Personal** (sidebar → Personal).

---

## 7. Backups de la base de datos

### Backup manual

```bash
mkdir -p ~/backups
docker exec ampara_db pg_dump -U ampara ampara_db \
  > ~/backups/ampara_$(date +%Y%m%d_%H%M).sql
```

### Backup automático con crontab

```bash
crontab -e
# Agregar — backup diario a las 2:00 AM:
0 2 * * * docker exec ampara_db pg_dump -U ampara ampara_db > /home/abigail/backups/ampara_$(date +\%Y\%m\%d).sql
```

Recomendación: copiar los backups a un servicio externo (Google Drive, S3) para que no estén en el mismo disco que los datos.

### Restaurar desde backup

```bash
# ⚠️ Reemplaza toda la base de datos actual
cat backup_20260606.sql | docker exec -i ampara_db psql -U ampara -d ampara_db
```

### Backup de fotos y audio

```bash
docker exec ampara_backend tar czf /tmp/uploads_backup.tar.gz /app/uploads
docker cp ampara_backend:/tmp/uploads_backup.tar.gz ~/backups/
```

---

## 8. Diagnóstico de problemas

### La app muestra "Network Error"

```bash
docker ps                                          # verificar contenedores activos
curl http://161.132.53.226/api/v1/health           # verificar backend
docker logs ampara_backend --tail 50               # logs del backend
docker logs ampara_dashboard --tail 20             # logs de nginx
```

### El dashboard no carga / página en blanco

```bash
docker ps                                          # verificar nginx
ls dashboard/dist/                                 # verificar que dist/ tiene archivos
cd dashboard && npm run build && cd ..             # si dist/ está vacío
docker restart ampara_dashboard
```

### La base de datos no responde

```bash
docker ps | grep ampara_db
docker logs ampara_db --tail 50
docker restart ampara_db
docker inspect ampara_db | grep -A 5 '"Health"'
```

### Las migraciones no se aplican

```bash
docker exec ampara_backend alembic upgrade head
docker exec ampara_backend alembic history
docker exec ampara_backend alembic current
```

### Redis no responde (rate limiting desactivado)

Si Redis cae, el backend sigue funcionando pero sin rate limiting (falla en modo abierto):

```bash
docker logs ampara_redis --tail 20
docker restart ampara_redis
```

### Ver todos los logs a la vez

```bash
docker compose logs -f
```

### El SOS no envía SMS

```bash
# Verificar variables de entorno de SMS en .env
docker exec ampara_backend env | grep SMS
# Verificar logs del backend al activar SOS
docker logs ampara_backend --tail 30
```

---

## 9. Referencia de comandos Docker

```bash
# Estado de todos los contenedores
docker ps

# Logs en tiempo real
docker logs ampara_backend -f
docker logs ampara_db -f
docker logs ampara_dashboard -f
docker logs ampara_redis -f

# Terminal de un contenedor
docker exec -it ampara_backend bash
docker exec -it ampara_db psql -U ampara -d ampara_db

# Reiniciar uno
docker restart ampara_backend

# Reiniciar todos
docker compose restart

# Detener todo (datos persisten)
docker compose down

# Levantar todo
docker compose up -d

# Reconstruir un servicio
docker compose up -d --build backend

# Espacio usado
docker system df -v
```

---

## 10. Checklist antes de dar acceso a usuarios

### Seguridad

- [ ] `JWT_SECRET_KEY` es una clave aleatoria única (no la del repo)
- [ ] `ADMIN_SECRET_KEY` es una clave aleatoria única
- [ ] `DEBUG=False` en `backend/.env`
- [ ] `ALLOWED_ORIGINS` tiene la URL correcta
- [ ] `POSTGRES_PASSWORD` es una contraseña segura

### Funcionalidad

- [ ] `curl http://161.132.53.226/api/v1/health` devuelve `{"status": "ok", "db": "ok"}`
- [ ] El dashboard carga en `http://161.132.53.226`
- [ ] El login funciona en el dashboard
- [ ] El login funciona en la app
- [ ] Se puede enviar una denuncia desde la app (anónima y con cuenta)
- [ ] La denuncia aparece en el dashboard
- [ ] El operador puede cambiar el estado y enviar un mensaje
- [ ] La usuaria ve el mensaje en la app
- [ ] El SOS activa y cierra correctamente

### Datos

- [ ] Backup automático configurado en crontab
- [ ] Hay al menos un admin creado con `POST /auth/setup`
- [ ] Los operadores tienen sus cuentas creadas desde el dashboard
- [ ] Se ha probado el flujo anónimo completo (denuncia → seguimiento con código de acceso)
