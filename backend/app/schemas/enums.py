from enum import Enum


class RolEnum(str, Enum):
    USUARIO  = "usuario"
    OPERADOR = "operador"
    ADMIN    = "admin"


class TipoViolenciaEnum(str, Enum):
    FISICA      = "Física"
    PSICOLOGICA = "Psicológica"
    VERBAL      = "Verbal"
    SEXUAL      = "Sexual"
    ECONOMICA   = "Económica"
    DIGITAL     = "Digital"
    # Mantenido para compatibilidad con registros v1
    OTRA        = "Otra"


class RelacionAgresorEnum(str, Enum):
    PAREJA_O_EXPAREJA  = "Pareja o expareja"
    FAMILIAR           = "Familiar"
    CONOCIDA           = "Conocido/a"
    FIGURA_AUTORIDAD   = "Figura de autoridad"
    DESCONOCIDA        = "Desconocido/a"
    # Mantenidos para compatibilidad con registros v1
    CONYUGE            = "Cónyuge"
    EXPAREJA           = "Expareja"
    CONOCIDO           = "Conocido"
    DESCONOCIDO        = "Desconocido"


class FactorRiesgoEnum(str, Enum):
    AMENAZAS_MUERTE          = "amenazas_muerte"
    ACCESO_ARMAS             = "acceso_armas"
    VIOLENCIA_ESCALANDO      = "violencia_escalando"
    CONVIVE                  = "convive"
    SEGUIMIENTO_VIGILANCIA   = "seguimiento_vigilancia"
    ORDEN_ALEJAMIENTO_VIOLADA = "orden_alejamiento_violada"


class NivelRiesgoEnum(str, Enum):
    URGENTE  = "urgente"
    ALTO     = "alto"
    MEDIO    = "medio"
    BAJO     = "bajo"
    # Mantenido para compatibilidad con registros v1
    MODERADO = "moderado"


class PreferenciaContactoEnum(str, Enum):
    APP     = "app"
    LLAMADA = "llamada"
    NINGUNO = "ninguno"


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
    USUARIA  = "usuaria"
