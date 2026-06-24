import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.enums import EstadoInforme, TipoInforme


class HistorialRedProteccionalBase(BaseModel):
    nombre_programa: Optional[str] = None
    fecha_ingreso: Optional[date] = None
    fecha_egreso: Optional[date] = None
    motivo_egreso: Optional[str] = None


class HistorialRedProteccionalCreate(HistorialRedProteccionalBase):
    pass


class HistorialRedProteccionalUpdate(BaseModel):
    nombre_programa: Optional[str] = None
    fecha_ingreso: Optional[date] = None
    fecha_egreso: Optional[date] = None
    motivo_egreso: Optional[str] = None


class HistorialRedProteccionalRead(HistorialRedProteccionalBase):
    model_config = ConfigDict(from_attributes=True)

    id_historial_red: uuid.UUID
    id_nna: uuid.UUID



class InformeTribunalBase(BaseModel):
    tipo_informe: Optional[TipoInforme] = None
    fecha_vencimiento: Optional[date] = None
    fecha_envio_real: Optional[date] = None
    estado: Optional[EstadoInforme] = None


class InformeTribunalCreate(InformeTribunalBase):
    pass


class InformeTribunalUpdate(BaseModel):
    tipo_informe: Optional[TipoInforme] = None
    fecha_vencimiento: Optional[date] = None
    fecha_envio_real: Optional[date] = None
    estado: Optional[EstadoInforme] = None


class InformeTribunalRead(InformeTribunalBase):
    model_config = ConfigDict(from_attributes=True)

    id_informe: uuid.UUID
    id_nna: uuid.UUID


class InformeAlertaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_informe: uuid.UUID
    id_nna: uuid.UUID
    tipo_informe: Optional[TipoInforme] = None
    fecha_vencimiento: Optional[date] = None
    estado: Optional[EstadoInforme] = None
    nombre_nna: Optional[str] = None
    dias_restantes: Optional[int] = None
