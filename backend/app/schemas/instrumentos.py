import uuid
from datetime import date
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class InstrumentoBase(BaseModel):
    id_adulto_significativo: Optional[uuid.UUID] = None
    fecha_evaluacion: Optional[date] = None
    fecha_proxima_evaluacion: Optional[date] = None
    version: Optional[int] = None
    respuestas: Optional[dict[str, Any]] = None
    resultado: Optional[str] = None
    observacion: Optional[str] = None


class InstrumentoCreate(InstrumentoBase):
    pass


class InstrumentoUpdate(BaseModel):
    id_adulto_significativo: Optional[uuid.UUID] = None
    fecha_evaluacion: Optional[date] = None
    fecha_proxima_evaluacion: Optional[date] = None
    version: Optional[int] = None
    respuestas: Optional[dict[str, Any]] = None
    resultado: Optional[str] = None
    observacion: Optional[str] = None


class InstrumentoRead(InstrumentoBase):
    model_config = ConfigDict(from_attributes=True)

    id_instrumento: uuid.UUID
    id_nna: uuid.UUID
