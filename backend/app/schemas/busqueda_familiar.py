import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ProcesoDespejeFamiliarBase(BaseModel):
    fecha_solicitud_informe: Optional[date] = None
    fecha_recepcion_informe: Optional[date] = None
    estado: Optional[str] = None
    url_informe_hijo: Optional[str] = None


class ProcesoDespejeFamiliarCreate(ProcesoDespejeFamiliarBase):
    pass


class ProcesoDespejeFamiliarUpdate(BaseModel):
    fecha_solicitud_informe: Optional[date] = None
    fecha_recepcion_informe: Optional[date] = None
    estado: Optional[str] = None
    url_informe_hijo: Optional[str] = None


class ProcesoDespejeFamiliarRead(ProcesoDespejeFamiliarBase):
    model_config = ConfigDict(from_attributes=True)

    id_despeje: uuid.UUID
    id_nna: uuid.UUID
    id_caso: Optional[uuid.UUID] = None


class NotificacionFamiliarBase(BaseModel):
    id_familiar: uuid.UUID
    fecha_envio_carta_1: Optional[date] = None
    codigo_seguimiento_1: Optional[str] = None
    estado_entrega_1: Optional[str] = None
    fecha_recepcion_carta_1: Optional[date] = None
    fecha_envio_carta_2: Optional[date] = None
    codigo_seguimiento_2: Optional[str] = None
    estado_entrega_2: Optional[str] = None
    fecha_recepcion_carta_2: Optional[date] = None
    resultado_contacto: Optional[str] = None
    fecha_respuesta: Optional[date] = None
    observacion: Optional[str] = None


class NotificacionFamiliarCreate(NotificacionFamiliarBase):
    pass


class NotificacionFamiliarUpdate(BaseModel):
    fecha_envio_carta_1: Optional[date] = None
    codigo_seguimiento_1: Optional[str] = None
    estado_entrega_1: Optional[str] = None
    fecha_recepcion_carta_1: Optional[date] = None
    fecha_envio_carta_2: Optional[date] = None
    codigo_seguimiento_2: Optional[str] = None
    estado_entrega_2: Optional[str] = None
    fecha_recepcion_carta_2: Optional[date] = None
    resultado_contacto: Optional[str] = None
    fecha_respuesta: Optional[date] = None
    observacion: Optional[str] = None


class NotificacionFamiliarRead(NotificacionFamiliarBase):
    model_config = ConfigDict(from_attributes=True)

    id_notificacion: uuid.UUID
    id_despeje: uuid.UUID
