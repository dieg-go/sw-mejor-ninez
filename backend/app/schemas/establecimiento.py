import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict


class EstablecimientoEducacionalBase(BaseModel):
    nombre: Optional[str] = None
    rbd: Optional[int] = None


class EstablecimientoEducacionalCreate(EstablecimientoEducacionalBase):
    pass


class EstablecimientoEducacionalUpdate(BaseModel):
    nombre: Optional[str] = None
    rbd: Optional[int] = None


class EstablecimientoEducacionalRead(EstablecimientoEducacionalBase):
    model_config = ConfigDict(from_attributes=True)

    id_establecimiento_educacional: uuid.UUID
