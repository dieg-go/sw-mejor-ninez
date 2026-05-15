import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class NNABase(BaseModel):
    nombre: Optional[str] = None
    run: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    sexo: Optional[str] = None
    etnia_declarada: Optional[str] = None
    nacionalidad: Optional[str] = None
    domicilio: Optional[str] = None
    poblacion_o_villa: Optional[str] = None
    comuna: Optional[str] = None
    region: Optional[str] = None


class NNACreate(NNABase):
    pass


class NNAUpdate(BaseModel):
    nombre: Optional[str] = None
    run: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    sexo: Optional[str] = None
    etnia_declarada: Optional[str] = None
    nacionalidad: Optional[str] = None
    domicilio: Optional[str] = None
    poblacion_o_villa: Optional[str] = None
    comuna: Optional[str] = None
    region: Optional[str] = None


class NNARead(NNABase):
    model_config = ConfigDict(from_attributes=True)

    id_nna: uuid.UUID
