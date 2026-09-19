import uuid
from datetime import date
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class E2PCreate(BaseModel):
    id_familiar: Optional[uuid.UUID] = None
    fecha_evaluacion: date
    edad_meses_evaluacion: int
    rango_etario: str
    respuestas: Optional[dict[str, Any]] = None
    observacion: Optional[str] = None


class E2PUpdate(BaseModel):
    id_familiar: Optional[uuid.UUID] = None
    fecha_evaluacion: Optional[date] = None
    edad_meses_evaluacion: Optional[int] = None
    rango_etario: Optional[str] = None
    respuestas: Optional[dict[str, Any]] = None
    observacion: Optional[str] = None


class E2PRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_e2p: uuid.UUID
    id_nna: uuid.UUID
    id_familiar: uuid.UUID
    id_caso: Optional[uuid.UUID] = None
    fecha_evaluacion: date
    edad_meses_evaluacion: int
    rango_etario: str
    respuestas: Optional[dict[str, Any]] = None
    perfil_resultado_global: Optional[str] = None
    observacion: Optional[str] = None
