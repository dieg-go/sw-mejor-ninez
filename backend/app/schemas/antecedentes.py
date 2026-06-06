import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AntecedenteSaludBase(BaseModel):
    id_centro_salud: Optional[uuid.UUID] = None
    fecha_antecedente_salud: Optional[date] = None
    prevision: Optional[str] = None
    inscrito_en_centro_salud: bool = False


class AntecedenteSaludCreate(AntecedenteSaludBase):
    pass


class AntecedenteSaludUpdate(BaseModel):
    id_centro_salud: Optional[uuid.UUID] = None
    fecha_antecedente_salud: Optional[date] = None
    prevision: Optional[str] = None
    inscrito_en_centro_salud: Optional[bool] = None


class AntecedenteSaludRead(AntecedenteSaludBase):
    model_config = ConfigDict(from_attributes=True)

    id_antecedente_salud: uuid.UUID
    id_nna: uuid.UUID


class AntecedenteEscolarBase(BaseModel):
    id_establecimiento_educacional: Optional[uuid.UUID] = None
    fecha_antecedente_escolar: Optional[date] = None
    ultimo_ano_cursado: Optional[int] = None
    escolarizado: bool = False


class AntecedenteEscolarCreate(AntecedenteEscolarBase):
    pass


class AntecedenteEscolarUpdate(BaseModel):
    id_establecimiento_educacional: Optional[uuid.UUID] = None
    fecha_antecedente_escolar: Optional[date] = None
    ultimo_ano_cursado: Optional[int] = None
    escolarizado: Optional[bool] = None


class AntecedenteEscolarRead(AntecedenteEscolarBase):
    model_config = ConfigDict(from_attributes=True)

    id_antecedente_escolar: uuid.UUID
    id_nna: uuid.UUID


class AntecedenteFamiliarBase(BaseModel):
    id_adulto_responsable: Optional[uuid.UUID] = None
    fecha_antecedente_familiar: Optional[date] = None
    con_quien_vive: Optional[str] = None
    con_quien_vive_detalle: Optional[str] = None


class AntecedenteFamiliarCreate(AntecedenteFamiliarBase):
    pass


class AntecedenteFamiliarUpdate(BaseModel):
    id_adulto_responsable: Optional[uuid.UUID] = None
    fecha_antecedente_familiar: Optional[date] = None
    con_quien_vive: Optional[str] = None
    con_quien_vive_detalle: Optional[str] = None


class AntecedenteFamiliarRead(AntecedenteFamiliarBase):
    model_config = ConfigDict(from_attributes=True)

    id_antecedente_familiar: uuid.UUID
    id_nna: uuid.UUID


class VinculoFamiliarBase(BaseModel):
    id_familiar: uuid.UUID
    parentesco: Optional[str] = None


class VinculoFamiliarCreate(VinculoFamiliarBase):
    pass


class VinculoFamiliarUpdate(BaseModel):
    id_familiar: Optional[uuid.UUID] = None
    parentesco: Optional[str] = None


class VinculoFamiliarRead(VinculoFamiliarBase):
    model_config = ConfigDict(from_attributes=True)

    id_vinculo_familiar: uuid.UUID
    id_nna: uuid.UUID
