import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict


class CasoCreate(BaseModel):
    fecha_inicio: Optional[date] = None
    fecha_termino: Optional[date] = None


class CasoUpdate(BaseModel):
    fecha_inicio: Optional[date] = None
    fecha_termino: Optional[date] = None
    estado: Optional[str] = None


class CasoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_caso: uuid.UUID
    id_nna: uuid.UUID
    fecha_inicio: Optional[date] = None
    fecha_termino: Optional[date] = None
    estado: str