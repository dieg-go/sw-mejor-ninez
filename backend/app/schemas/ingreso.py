import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AntecedenteIngresoBase(BaseModel):
    fecha_ingreso_residencia: Optional[date] = None
    quien_solicita_ingreso: Optional[str] = None
    orden_tribunal: bool = False
    fecha_causa: Optional[date] = None
    tribunal: Optional[str] = None
    materia: Optional[str] = None
    codigo_rit: Optional[str] = None
    codigo_ruc: Optional[str] = None


class AntecedenteIngresoCreate(AntecedenteIngresoBase):
    pass


class AntecedenteIngresoUpdate(BaseModel):
    fecha_ingreso_residencia: Optional[date] = None
    quien_solicita_ingreso: Optional[str] = None
    orden_tribunal: Optional[bool] = None
    fecha_causa: Optional[date] = None
    tribunal: Optional[str] = None
    materia: Optional[str] = None
    codigo_rit: Optional[str] = None
    codigo_ruc: Optional[str] = None


class AntecedenteIngresoRead(AntecedenteIngresoBase):
    model_config = ConfigDict(from_attributes=True)

    id_antecedente_ingreso: uuid.UUID
    id_nna: uuid.UUID


class DocumentacionIngresoBase(BaseModel):
    tipo_documento: Optional[str] = None
    estado_recepcion: bool = False
    fecha_recepcion: Optional[date] = None
    observacion: Optional[str] = None


class DocumentacionIngresoCreate(DocumentacionIngresoBase):
    pass


class DocumentacionIngresoUpdate(BaseModel):
    tipo_documento: Optional[str] = None
    estado_recepcion: Optional[bool] = None
    fecha_recepcion: Optional[date] = None
    observacion: Optional[str] = None


class DocumentacionIngresoRead(DocumentacionIngresoBase):
    model_config = ConfigDict(from_attributes=True)

    id_documentacion: uuid.UUID
    id_nna: uuid.UUID


class CausalIngresoBase(BaseModel):
    nombre_causal: Optional[str] = None
    descripcion_detallada: Optional[str] = None
    estado: Optional[str] = None


class CausalIngresoCreate(CausalIngresoBase):
    pass


class CausalIngresoUpdate(BaseModel):
    nombre_causal: Optional[str] = None
    descripcion_detallada: Optional[str] = None
    estado: Optional[str] = None


class CausalIngresoRead(CausalIngresoBase):
    model_config = ConfigDict(from_attributes=True)

    id_registro_causales: uuid.UUID
    id_antecedente_ingreso: uuid.UUID


class DerechoVulneradoBase(BaseModel):
    nombre_derecho: Optional[str] = None
    estado: Optional[str] = None


class DerechoVulneradoCreate(DerechoVulneradoBase):
    pass


class DerechoVulneradoUpdate(BaseModel):
    nombre_derecho: Optional[str] = None
    estado: Optional[str] = None


class DerechoVulneradoRead(DerechoVulneradoBase):
    model_config = ConfigDict(from_attributes=True)

    id_registro_derecho_vulnerado: uuid.UUID
    id_antecedente_ingreso: uuid.UUID
