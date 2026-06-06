import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict


class SolicitanteIngresoBase(BaseModel):
    nombre: Optional[str] = None
    categoria: Optional[str] = None
    ano_proyecto: Optional[int] = None


class SolicitanteIngresoCreate(SolicitanteIngresoBase):
    pass


class SolicitanteIngresoUpdate(BaseModel):
    nombre: Optional[str] = None
    categoria: Optional[str] = None
    ano_proyecto: Optional[int] = None


class SolicitanteIngresoRead(SolicitanteIngresoBase):
    model_config = ConfigDict(from_attributes=True)

    id_solicitante_ingreso: uuid.UUID
