import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict


class CentroSaludBase(BaseModel):
    nombre: Optional[str] = None
    tipo_recinto: Optional[str] = None


class CentroSaludCreate(CentroSaludBase):
    pass


class CentroSaludUpdate(BaseModel):
    nombre: Optional[str] = None
    tipo_recinto: Optional[str] = None


class CentroSaludRead(CentroSaludBase):
    model_config = ConfigDict(from_attributes=True)

    id_centro_salud: uuid.UUID
