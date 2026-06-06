import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict


class VinculoNNABase(BaseModel):
    parentesco: Optional[str] = None


class VinculoNNACreate(VinculoNNABase):
    id_nna_2: uuid.UUID


class VinculoNNAUpdate(BaseModel):
    parentesco: Optional[str] = None


class VinculoNNARead(VinculoNNABase):
    model_config = ConfigDict(from_attributes=True)

    id_nna_1: uuid.UUID
    id_nna_2: uuid.UUID
