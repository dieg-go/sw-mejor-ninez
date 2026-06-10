import uuid
from datetime import date
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class PMFCreate(BaseModel):
    id_familiar: Optional[uuid.UUID] = None
    fecha_evaluacion: Optional[date] = None
    fecha_proxima_evaluacion: Optional[date] = None
    respuestas: Optional[dict[str, Any]] = None
    resultado: Optional[str] = None
    observacion: Optional[str] = None


class PMFUpdate(BaseModel):
    id_familiar: Optional[uuid.UUID] = None
    fecha_evaluacion: Optional[date] = None
    fecha_proxima_evaluacion: Optional[date] = None
    respuestas: Optional[dict[str, Any]] = None
    resultado: Optional[str] = None
    observacion: Optional[str] = None


class PMFRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_pmf: uuid.UUID
    id_nna: uuid.UUID
    id_familiar: Optional[uuid.UUID] = None
    fecha_evaluacion: Optional[date] = None
    fecha_proxima_evaluacion: Optional[date] = None
    respuestas: Optional[dict[str, Any]] = None
    resultado: Optional[str] = None
    observacion: Optional[str] = None


class PreguntaPMFRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_pregunta_pmf: uuid.UUID
    numero: int
    afirmacion: str
    escala: Optional[str] = None
