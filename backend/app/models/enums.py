from enum import StrEnum


class TipoInforme(StrEnum):
    DIAGNOSTICO = "Diagnóstico"
    SEGUIMIENTO = "Seguimiento"


class EstadoInforme(StrEnum):
    PENDIENTE = "Pendiente"
    ENVIADO = "Enviado"
    VENCIDO = "Vencido"
