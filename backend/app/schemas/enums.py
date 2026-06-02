from enum import Enum


class RolEnum(str, Enum):
    CIUDADANO = "ciudadano"
    INSPECTOR = "inspector"
    ADMIN = "admin"


class EstadoReporteEnum(str, Enum):
    ENVIADO = "enviado"
    EN_REVISION = "en_revision"
    RESUELTO = "resuelto"
    RECHAZADO = "rechazado"
    CANCELADO = "cancelado"


class TipoLugarEnum(str, Enum):
    VIVIENDA = "Vivienda"
    VIA_PUBLICA = "Vía Pública"
    TERRENO_ABANDONADO = "Terreno Abandonado"
    MERCADO = "Mercado"
    COLEGIO = "Colegio"
    OTRO = "Otro"


class TipoObjetoEnum(str, Enum):
    LLANTAS = "Llantas"
    BALDES = "Baldes"
    PLANTAS = "Plantas"
    BOTELLAS = "Botellas"
    CANALES = "Canales"
    OTRO = "Otro"


class ObservaLarvasEnum(str, Enum):
    SI_CLARAMENTE = "Sí, claramente"
    NO_SEGURO = "No estoy seguro"
    NO = "No"


class ConocimientoDengueEnum(str, Enum):
    SI = "Sí"
    NO_LO_SE = "No lo sé"
    NO = "No"
