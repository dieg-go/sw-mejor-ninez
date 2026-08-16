import uuid
from datetime import date
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


# ── Item schemas ───────────────────────────────────────────────────────────────

class ItemNCFASRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_item_ncfas: uuid.UUID
    letra_dimension: str
    nombre_dimension: str
    numero_item: int
    nombre_item: str
    definiciones: Optional[dict] = None
    es_item_general: bool


class DimensionNCFASRead(BaseModel):
    letra: str
    nombre: str
    items: list[ItemNCFASRead]


# ── Comentario schemas ─────────────────────────────────────────────────────────

class ComentarioDimensionNCFASCreate(BaseModel):
    letra_dimension: str
    comentario: str


class ComentarioDimensionNCFASRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_comentario_ncfas: uuid.UUID
    id_ncfas: uuid.UUID
    letra_dimension: str
    comentario: str


# ── NCFAS header schemas ───────────────────────────────────────────────────────

class NCFASCreate(BaseModel):
    id_familiar: Optional[uuid.UUID] = None
    es_reunificacion: bool = False
    fecha_apertura: Optional[date] = None
    fecha_cierre: Optional[date] = None
    estado: Optional[str] = None
    observacion_general: Optional[str] = None
    respuestas: Optional[dict[str, dict[str, str]]] = None


class NCFASUpdate(BaseModel):
    id_familiar: Optional[uuid.UUID] = None
    es_reunificacion: Optional[bool] = None
    fecha_apertura: Optional[date] = None
    fecha_cierre: Optional[date] = None
    estado: Optional[str] = None
    observacion_general: Optional[str] = None
    respuestas: Optional[dict[str, dict[str, str]]] = None


class NCFASRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_ncfas: uuid.UUID
    id_nna: uuid.UUID
    id_familiar: Optional[uuid.UUID] = None
    id_caso: Optional[uuid.UUID] = None
    es_reunificacion: bool
    fecha_apertura: Optional[date] = None
    fecha_cierre: Optional[date] = None
    estado: Optional[str] = None
    observacion_general: Optional[str] = None
    respuestas: Optional[dict[str, dict[str, str]]] = None
