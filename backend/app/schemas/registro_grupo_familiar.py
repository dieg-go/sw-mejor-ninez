import uuid

from pydantic import BaseModel, ConfigDict


class RegistroGrupoFamiliarBase(BaseModel):
    id_familiar: uuid.UUID
    id_antecedente_familiar: uuid.UUID


class RegistroGrupoFamiliarCreate(RegistroGrupoFamiliarBase):
    pass


class RegistroGrupoFamiliarRead(RegistroGrupoFamiliarBase):
    model_config = ConfigDict(from_attributes=True)
    id_registro_grupo_familiar: uuid.UUID
