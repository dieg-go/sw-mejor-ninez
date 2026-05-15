import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict


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


class GestionBusquedaFamiliarBase(BaseModel):
    tipo_gestion: Optional[str] = None
    fecha_solicitud_envio: Optional[date] = None
    fecha_respuesta_recepcion: Optional[date] = None
    resultado: Optional[str] = None
    comprobante_adjunto: bool = False


class GestionBusquedaFamiliarCreate(GestionBusquedaFamiliarBase):
    pass


class GestionBusquedaFamiliarUpdate(BaseModel):
    tipo_gestion: Optional[str] = None
    fecha_solicitud_envio: Optional[date] = None
    fecha_respuesta_recepcion: Optional[date] = None
    resultado: Optional[str] = None
    comprobante_adjunto: Optional[bool] = None


class GestionBusquedaFamiliarRead(GestionBusquedaFamiliarBase):
    model_config = ConfigDict(from_attributes=True)

    id_gestion_busqueda: uuid.UUID
    id_nna: uuid.UUID


class InformeTribunalBase(BaseModel):
    tipo_informe: Optional[str] = None
    fecha_vencimiento: Optional[date] = None
    fecha_envio_real: Optional[date] = None
    estado: Optional[str] = None


class InformeTribunalCreate(InformeTribunalBase):
    pass


class InformeTribunalUpdate(BaseModel):
    tipo_informe: Optional[str] = None
    fecha_vencimiento: Optional[date] = None
    fecha_envio_real: Optional[date] = None
    estado: Optional[str] = None


class InformeTribunalRead(InformeTribunalBase):
    model_config = ConfigDict(from_attributes=True)

    id_informe: uuid.UUID
    id_nna: uuid.UUID
