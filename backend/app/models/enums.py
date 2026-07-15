from enum import StrEnum


class TipoInforme(StrEnum):
    DIAGNOSTICO = "Diagnóstico"
    AVANCE = "Avance"


class EstadoInforme(StrEnum):
    PENDIENTE = "Pendiente"
    ENVIADO = "Enviado"
    VENCIDO = "Vencido"
