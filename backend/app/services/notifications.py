import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/push/send"

_ESTADO_MENSAJES = {
    "en_revision": ("🔍 Reporte en revisión", "Un inspector está revisando tu reporte. Te avisaremos cuando haya novedades."),
    "resuelto":    ("✅ Reporte resuelto", "¡Tu reporte fue atendido! El criadero ha sido controlado. Gracias por tu aporte."),
    "rechazado":   ("ℹ️ Reporte no procesado", "Tu reporte no pudo ser verificado en campo. Puedes enviar uno nuevo si persiste el problema."),
    "cancelado":   ("Reporte cancelado", "Tu reporte fue cancelado."),
}


async def enviar_notificacion_estado(push_token: str, estado: str, extra: dict[str, Any] | None = None) -> bool:
    if not push_token or not push_token.startswith("ExponentPushToken"):
        return False

    titulo, cuerpo = _ESTADO_MENSAJES.get(estado, ("SIVAPRE", f"Estado de tu reporte: {estado}"))

    payload = {
        "to": push_token,
        "title": titulo,
        "body": cuerpo,
        "sound": "default",
        "data": {"estado": estado, **(extra or {})},
        "channelId": "reportes",
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                EXPO_PUSH_URL,
                json=payload,
                headers={"Accept": "application/json", "Content-Type": "application/json"},
            )
            result = resp.json()
            if result.get("data", {}).get("status") == "error":
                logger.warning("Expo push error: %s", result)
                return False
            return True
    except Exception as exc:
        logger.error("Error enviando push notification: %s", exc)
        return False
