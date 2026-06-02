import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/push/send"

_ESTADO_MENSAJES = {
    "asignada":               ("📋 Caso asignado",           "Tu denuncia ha sido asignada a un operador. Pronto recibirás noticias."),
    "en_seguimiento":         ("🔍 Caso en seguimiento",     "El equipo de Ampara está trabajando en tu caso."),
    "derivada":               ("🚔 Caso derivado",           "Tu caso ha sido derivado a las autoridades correspondientes."),
    "pendiente_confirmacion": ("⏳ Pendiente de confirmación", "El equipo espera confirmar que recibiste ayuda."),
    "cerrada":                ("✅ Caso cerrado",             "Tu caso ha sido cerrado. Si necesitas ayuda nuevamente, estamos aquí."),
}


async def enviar_notificacion_estado(push_token: str, estado: str, extra: dict[str, Any] | None = None) -> bool:
    if not push_token or not push_token.startswith("ExponentPushToken"):
        return False

    titulo, cuerpo = _ESTADO_MENSAJES.get(estado, ("Ampara", f"Actualización en tu caso: {estado}"))

    payload = {
        "to":        push_token,
        "title":     titulo,
        "body":      cuerpo,
        "sound":     "default",
        "data":      {"estado": estado, **(extra or {})},
        "channelId": "denuncias",
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


async def enviar_notificacion_mensaje(push_token: str, preview: str = "") -> bool:
    """Notifica a la víctima cuando el operador envía un mensaje."""
    if not push_token or not push_token.startswith("ExponentPushToken"):
        return False

    payload = {
        "to":        push_token,
        "title":     "💬 Nuevo mensaje de Ampara",
        "body":      preview or "El equipo de Ampara te ha enviado un mensaje. Ábrela en un lugar seguro.",
        "sound":     "default",
        "channelId": "denuncias",
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(EXPO_PUSH_URL, json=payload, headers={"Accept": "application/json", "Content-Type": "application/json"})
            return resp.json().get("data", {}).get("status") != "error"
    except Exception as exc:
        logger.error("Error enviando push notification de mensaje: %s", exc)
        return False
