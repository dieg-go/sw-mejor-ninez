import uuid
from datetime import date
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class E2PCreate(BaseModel):
    id_familiar: Optional[uuid.UUID] = None
    fecha_evaluacion: Optional[date] = None
    fecha_proxima_evaluacion: Optional[date] = None
    version: Optional[int] = None
    respuestas: Optional[dict[str, Any]] = None
    observacion: Optional[str] = None


class E2PUpdate(BaseModel):
    id_familiar: Optional[uuid.UUID] = None
    fecha_evaluacion: Optional[date] = None
    fecha_proxima_evaluacion: Optional[date] = None
    version: Optional[int] = None
    respuestas: Optional[dict[str, Any]] = None
    observacion: Optional[str] = None


class E2PRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_e2p: uuid.UUID
    id_nna: uuid.UUID
    id_familiar: Optional[uuid.UUID] = None
    fecha_evaluacion: Optional[date] = None
    fecha_proxima_evaluacion: Optional[date] = None
    version: Optional[int] = None
    respuestas: Optional[dict[str, Any]] = None
    resultado: Optional[str] = None
    observacion: Optional[str] = None


class PreguntaE2PRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_pregunta_e2p: uuid.UUID
    version: int
    numero: int
    texto: str
    categoria: str


class BaremoE2PRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_baremo_e2p: uuid.UUID
    version: int
    categoria: str
    zona: str
    puntaje_min: int
    puntaje_max: int


class PuntajeE2PRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_puntaje_e2p: uuid.UUID
    id_instrumento: uuid.UUID
    categoria: str
    puntaje_bruto: int
    puntaje_max: int
    zona: str
    rango_zona: str
