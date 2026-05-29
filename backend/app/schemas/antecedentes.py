import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AntecedenteSaludBase(BaseModel):
    fecha_antecedente_salud: Optional[date] = None
    inscrito_en_consultorio: bool = False
    establecimiento: Optional[str] = None
    prevision: Optional[str] = None


class AntecedenteSaludCreate(AntecedenteSaludBase):
    pass


class AntecedenteSaludUpdate(BaseModel):
    fecha_antecedente_salud: Optional[date] = None
    inscrito_en_consultorio: Optional[bool] = None
    establecimiento: Optional[str] = None
    prevision: Optional[str] = None


class AntecedenteSaludRead(AntecedenteSaludBase):
    model_config = ConfigDict(from_attributes=True)

    id_antecedente_salud: uuid.UUID
    id_nna: uuid.UUID


class AntecedenteEscolarBase(BaseModel):
    fecha_antecedente_escolar: Optional[date] = None
    escolarizado: bool = False
    establecimiento: Optional[str] = None
    ultimo_ano_curso: Optional[int] = None


class AntecedenteEscolarCreate(AntecedenteEscolarBase):
    pass


class AntecedenteEscolarUpdate(BaseModel):
    fecha_antecedente_escolar: Optional[date] = None
    escolarizado: Optional[bool] = None
    establecimiento: Optional[str] = None
    ultimo_ano_curso: Optional[int] = None


class AntecedenteEscolarRead(AntecedenteEscolarBase):
    model_config = ConfigDict(from_attributes=True)

    id_antecedente_escolar: uuid.UUID
    id_nna: uuid.UUID


class AntecedenteFamiliarBase(BaseModel):
    fecha_antecedente_familiar: Optional[date] = None


class AntecedenteFamiliarCreate(AntecedenteFamiliarBase):
    pass


class AntecedenteFamiliarUpdate(BaseModel):
    fecha_antecedente_familiar: Optional[date] = None


class AntecedenteFamiliarRead(AntecedenteFamiliarBase):
    model_config = ConfigDict(from_attributes=True)

    id_antecedente_familiar: uuid.UUID
    id_nna: uuid.UUID


class VinculoFamiliarBase(BaseModel):
    parentesco: Optional[str] = None
    es_adulto_responsable: bool = False


class VinculoFamiliarCreate(VinculoFamiliarBase):
    id_familiar: Optional[uuid.UUID] = None


class VinculoFamiliarUpdate(BaseModel):
    parentesco: Optional[str] = None
    es_adulto_responsable: Optional[bool] = None
    id_familiar: Optional[uuid.UUID] = None


class VinculoFamiliarRead(VinculoFamiliarBase):
    model_config = ConfigDict(from_attributes=True)

    id_vinculo_familiar: uuid.UUID
    id_antecedente_familiar: uuid.UUID
    id_familiar: Optional[uuid.UUID] = None
