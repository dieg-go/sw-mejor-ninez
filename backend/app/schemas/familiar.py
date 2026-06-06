import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict


class FamiliarBase(BaseModel):
    nombre: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    run: Optional[str] = None
    direccion: Optional[str] = None
    numero_telefono: Optional[str] = None
    tiene_antecedentes_penales: bool = False


class FamiliarCreate(FamiliarBase):
    pass


class FamiliarUpdate(BaseModel):
    nombre: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    run: Optional[str] = None
    direccion: Optional[str] = None
    numero_telefono: Optional[str] = None
    tiene_antecedentes_penales: Optional[bool] = None


class FamiliarRead(FamiliarBase):
    model_config = ConfigDict(from_attributes=True)

    id_familiar: uuid.UUID


class AntecedentePenalBase(BaseModel):
    descripcion: Optional[str] = None
    url_documento_adjunto: Optional[str] = None


class AntecedentePenalCreate(AntecedentePenalBase):
    pass


class AntecedentePenalUpdate(BaseModel):
    descripcion: Optional[str] = None
    url_documento_adjunto: Optional[str] = None


class AntecedentePenalRead(AntecedentePenalBase):
    model_config = ConfigDict(from_attributes=True)

    id_antecedente_penal: uuid.UUID
    id_familiar: uuid.UUID
