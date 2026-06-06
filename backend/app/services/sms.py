"""Servicio SMS para notificaciones del círculo de confianza.

Usa la REST API de Twilio directamente vía httpx (sin SDK extra).
Si las variables TWILIO_* no están configuradas, registra el mensaje en logs.
El sistema funciona sin SMS — es degradación controlada, no fallo fatal.
"""
import base64
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_TWILIO_BASE = "https://api.twilio.com/2010-04-01/Accounts"


async def enviar_sms(to: str, texto: str) -> bool:
    """Envía un SMS. Devuelve True si se envió, False si hubo error o no hay config."""
    if not all([settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN, settings.TWILIO_FROM_NUMBER]):
        logger.info("[SMS-MOCK] → %s | %s", to, texto)
        return False

    sid   = settings.TWILIO_ACCOUNT_SID
    token = settings.TWILIO_AUTH_TOKEN
    creds = base64.b64encode(f"{sid}:{token}".encode()).decode()

    url = f"{_TWILIO_BASE}/{sid}/Messages.json"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                url,
                headers={"Authorization": f"Basic {creds}"},
                data={
                    "From": settings.TWILIO_FROM_NUMBER,
                    "To":   to,
                    "Body": texto,
                },
            )
        if resp.status_code in (200, 201):
            return True
        logger.warning("[SMS] Error Twilio %s → %s", resp.status_code, resp.text[:200])
        return False
    except httpx.HTTPError as exc:
        logger.error("[SMS] HTTP error: %s", exc)
        return False


def _texto_sos(nombre: str | None, lat: float | None, lon: float | None) -> str:
    quien = nombre or "una usuaria de Ampara"
    if lat is not None and lon is not None:
        mapa = f"https://maps.google.com/?q={lat},{lon}"
        return (
            f"⚠ ALERTA AMPARA: {quien} necesita ayuda urgente ahora mismo. "
            f"Su ubicación actual: {mapa} — Por favor contáctala de inmediato."
        )
    return (
        f"⚠ ALERTA AMPARA: {quien} activó una alerta de emergencia. "
        f"No se pudo obtener su ubicación. Por favor contáctala de inmediato."
    )
