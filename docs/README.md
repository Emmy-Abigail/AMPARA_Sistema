# Ampara — Documentación

**Plataforma de denuncias de violencia de género**

Ampara permite reportar situaciones de VG de forma anónima o con cuenta desde la app móvil. Los operadores y administradores gestionan los casos desde el panel web.

---

## Documentación disponible

| Documento | Qué encontrarás |
|---|---|
| [01-arquitectura.md](01-arquitectura.md) | Visión general: actores, flujo de datos, infraestructura, stack tecnológico |
| [02-backend.md](02-backend.md) | API REST completa, base de datos, autenticación JWT, seguridad, almacenamiento de evidencia, migraciones |
| [03-app-movil.md](03-app-movil.md) | Pantallas, arquitectura offline-first, SQLite, sync engine, build del APK con EAS |
| [04-dashboard.md](04-dashboard.md) | Componentes, mapa de casos, filtros, gestión de personal |
| [05-despliegue.md](05-despliegue.md) | Cómo actualizar el VPS, construir el APK, hacer backups, diagnosticar problemas |

---

## Estado en producción

| Servicio | URL |
|---|---|
| Dashboard | http://161.132.53.226 |
| API | http://161.132.53.226/api/v1 |
| APK (Android) | expo.dev → proyecto ampara → último build preview |
