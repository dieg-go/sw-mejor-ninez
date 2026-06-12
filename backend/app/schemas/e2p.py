import uuid
from datetime import date
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class E2PCreate(BaseModel):
    id_familiar: Optional[uuid.UUID] = None
    fecha_evaluacion: Optional[date] = None
    edad_meses_evaluacion: Optional[int] = None
    rango_etario: Optional[str] = None
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
    id_familiar: Optional[uuid.UUID] = None
    fecha_evaluacion: Optional[date] = None
    edad_meses_evaluacion: Optional[int] = None
    rango_etario: Optional[str] = None
    respuestas: Optional[dict[str, Any]] = None
    perfil_resultado_global: Optional[str] = None
    observacion: Optional[str] = None


class PreguntaE2PRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_pregunta_e2p: uuid.UUID
    rango_etario: str
    numero_item: int
    texto_afirmacion: str
    dimension: str
    subdimension: Optional[str] = None


class BaremoE2PRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_baremo_e2p: uuid.UUID
    rango_etario: str
    dimension: str
    decil: int
    zona: str
    puntaje_min: int
    puntaje_max: int


class PuntajeE2PRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_puntaje_e2p: uuid.UUID
    id_e2p: uuid.UUID
    dimension: str
    puntaje_bruto: int
    decil: Optional[int] = None
    zona: Optional[str] = None
