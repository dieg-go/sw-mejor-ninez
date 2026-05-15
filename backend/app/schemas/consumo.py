import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict


class HistorialConsumoNNABase(BaseModel):
    nombre_sustancia: Optional[str] = None
    consumo_indirecto_gestacional: bool = False
    estado_consumo: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_termino: Optional[date] = None
    en_tratamiento: bool = False


class HistorialConsumoNNACreate(HistorialConsumoNNABase):
    pass


class HistorialConsumoNNAUpdate(BaseModel):
    nombre_sustancia: Optional[str] = None
    consumo_indirecto_gestacional: Optional[bool] = None
    estado_consumo: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_termino: Optional[date] = None
    en_tratamiento: Optional[bool] = None


class HistorialConsumoNNARead(HistorialConsumoNNABase):
    model_config = ConfigDict(from_attributes=True)

    id_historial_consumo: uuid.UUID
    id_nna: uuid.UUID


class HistorialConsumoAdultoBase(BaseModel):
    nombre_sustancia: Optional[str] = None
    estado_consumo: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_termino: Optional[date] = None
    en_tratamiento: bool = False


class HistorialConsumoAdultoCreate(HistorialConsumoAdultoBase):
    pass


class HistorialConsumoAdultoUpdate(BaseModel):
    nombre_sustancia: Optional[str] = None
    estado_consumo: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_termino: Optional[date] = None
    en_tratamiento: Optional[bool] = None


class HistorialConsumoAdultoRead(HistorialConsumoAdultoBase):
    model_config = ConfigDict(from_attributes=True)

    id_historial_consumo: uuid.UUID
    id_adulto_significativo: uuid.UUID
