from enum import Enum


class RolEnum(str, Enum):
    USUARIO   = "usuario"
    OPERADOR  = "operador"
    ADMIN     = "admin"


class TipoViolenciaEnum(str, Enum):
    FISICA        = "Física"
    PSICOLOGICA   = "Psicológica"
    SEXUAL        = "Sexual"
    ECONOMICA     = "Económica"
    OTRA          = "Otra"


class RelacionAgresorEnum(str, Enum):
    CONYUGE      = "Cónyuge"
    EXPAREJA     = "Expareja"
    FAMILIAR     = "Familiar"
    CONOCIDO     = "Conocido"
    DESCONOCIDO  = "Desconocido"


class NivelRiesgoEnum(str, Enum):
    URGENTE  = "urgente"
    ALTO     = "alto"
    MODERADO = "moderado"


class PreferenciaContactoEnum(str, Enum):
    APP      = "app"
    LLAMADA  = "llamada"
    NINGUNO  = "ninguno"


class EstadoCasoEnum(str, Enum):
    NUEVA                  = "nueva"
    ASIGNADA               = "asignada"
    EN_SEGUIMIENTO         = "en_seguimiento"
    DERIVADA               = "derivada"
    PENDIENTE_CONFIRMACION = "pendiente_confirmacion"
    CERRADA                = "cerrada"


class AutorMensajeEnum(str, Enum):
    OPERADOR = "operador"
    SISTEMA  = "sistema"
