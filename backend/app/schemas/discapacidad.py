import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict


class DiscapacidadNNABase(BaseModel):
    tipo: Optional[str] = None
    porcentaje_grado: Optional[int] = None
    observacion: Optional[str] = None


class DiscapacidadNNACreate(DiscapacidadNNABase):
    pass


class DiscapacidadNNAUpdate(BaseModel):
    tipo: Optional[str] = None
    porcentaje_grado: Optional[int] = None
    observacion: Optional[str] = None


class DiscapacidadNNARead(DiscapacidadNNABase):
    model_config = ConfigDict(from_attributes=True)

    id_discapacidad_nna: uuid.UUID
    id_nna: uuid.UUID


class DiscapacidadAdultoBase(BaseModel):
    tipo: Optional[str] = None
    porcentaje_grado: Optional[int] = None
    observacion: Optional[str] = None


class DiscapacidadAdultoCreate(DiscapacidadAdultoBase):
    pass


class DiscapacidadAdultoUpdate(BaseModel):
    tipo: Optional[str] = None
    porcentaje_grado: Optional[int] = None
    observacion: Optional[str] = None


class DiscapacidadAdultoRead(DiscapacidadAdultoBase):
    model_config = ConfigDict(from_attributes=True)

    id_discapacidad_adulto: uuid.UUID
    id_familiar: uuid.UUID
