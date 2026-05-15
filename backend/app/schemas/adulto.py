import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AdultoSignificativoBase(BaseModel):
    nombre: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    run: Optional[str] = None
    direccion: Optional[str] = None
    numero_telefono: Optional[str] = None
    tiene_antecedentes_penales: bool = False


class AdultoSignificativoCreate(AdultoSignificativoBase):
    pass


class AdultoSignificativoUpdate(BaseModel):
    nombre: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    run: Optional[str] = None
    direccion: Optional[str] = None
    numero_telefono: Optional[str] = None
    tiene_antecedentes_penales: Optional[bool] = None


class AdultoSignificativoRead(AdultoSignificativoBase):
    model_config = ConfigDict(from_attributes=True)

    id_adulto_significativo: uuid.UUID


class AntecedentePenalBase(BaseModel):
    descripcion: Optional[str] = None


class AntecedentePenalCreate(AntecedentePenalBase):
    pass


class AntecedentePenalUpdate(BaseModel):
    descripcion: Optional[str] = None


class AntecedentePenalRead(AntecedentePenalBase):
    model_config = ConfigDict(from_attributes=True)

    id_antecedentes_penales: uuid.UUID
    id_adulto_significativo: uuid.UUID
