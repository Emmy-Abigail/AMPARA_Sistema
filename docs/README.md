# Ampara — Documentación técnica

**Plataforma de denuncias de violencia de género**

Ampara permite reportar situaciones de VG de forma anónima o con cuenta desde la app móvil. Los operadores y administradores gestionan los casos desde el panel web.

---

## Documentación disponible

| Documento | Qué encontrarás |
|---|---|
| [01-arquitectura.md](01-arquitectura.md) | Visión general: actores, flujo de datos, máquina de estados, infraestructura, stack tecnológico |
| [02-backend.md](02-backend.md) | API REST completa, base de datos, autenticación JWT + anónima, seguridad, migraciones |
| [03-app-movil.md](03-app-movil.md) | Pantallas, arquitectura offline-first, SQLite, sync engine, modo anónimo, SOS, APK con EAS |
| [04-dashboard.md](04-dashboard.md) | Componentes, expedientes por tabs, alertas SOS en tiempo real, mensajería, gestión de personal |
| [05-despliegue.md](05-despliegue.md) | Cómo actualizar el VPS, construir el APK, backups, diagnóstico de problemas |

---

## Estado en producción

| Servicio | URL |
|---|---|
| Dashboard | http://161.132.53.226 |
| API | http://161.132.53.226/api/v1 |
| APK (Android) | expo.dev → proyecto ampara → último build preview |
