import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict


class PMFCreate(BaseModel):
    id_familiar: Optional[uuid.UUID] = None
    fecha_evaluacion: Optional[date] = None
    fecha_proxima_evaluacion: Optional[date] = None
    resultado: Optional[str] = None
    observacion: Optional[str] = None


class PMFUpdate(BaseModel):
    id_familiar: Optional[uuid.UUID] = None
    fecha_evaluacion: Optional[date] = None
    fecha_proxima_evaluacion: Optional[date] = None
    resultado: Optional[str] = None
    observacion: Optional[str] = None


class PMFRead(PMFCreate):
    model_config = ConfigDict(from_attributes=True)

    id_instrumento: uuid.UUID
    id_nna: uuid.UUID
