import uuid
from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy.dialects.postgresql import UUID
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.nna import NNA
    from app.models.adulto import AdultoSignificativo


class AntecedenteSalud(SQLModel, table=True):
    __tablename__ = "AntecedenteSalud"

    id_antecedente_salud: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_nna: uuid.UUID = Field(foreign_key="NNA.id_nna", sa_type=UUID(as_uuid=True))
    fecha_antecedente_salud: Optional[date] = None
    inscrito_en_consultorio: bool = False
    establecimiento: Optional[str] = None
    prevision: Optional[str] = None

    nna: "NNA" = Relationship(back_populates="antecedentes_salud")


class AntecedenteEscolar(SQLModel, table=True):
    __tablename__ = "AntecedenteEscolar"

    id_antecedente_escolar: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_nna: uuid.UUID = Field(foreign_key="NNA.id_nna", sa_type=UUID(as_uuid=True))
    fecha_antecedente_escolar: Optional[date] = None
    escolarizado: bool = False
    establecimiento: Optional[str] = None
    ultimo_ano_curso: Optional[int] = None

    nna: "NNA" = Relationship(back_populates="antecedentes_escolares")


class AntecedenteFamiliar(SQLModel, table=True):
    __tablename__ = "AntecedenteFamiliar"

    id_antecedente_familiar: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_nna: uuid.UUID = Field(foreign_key="NNA.id_nna", sa_type=UUID(as_uuid=True))
    fecha_antecedente_familiar: Optional[date] = None

    nna: "NNA" = Relationship(back_populates="antecedentes_familiares")
    entorno_familiar: list["EntornoFamiliar"] = Relationship(back_populates="antecedente_familiar")


class EntornoFamiliar(SQLModel, table=True):
    __tablename__ = "EntornoFamiliar"

    id_entorno_familiar: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_antecedente_familiar: uuid.UUID = Field(
        foreign_key="AntecedenteFamiliar.id_antecedente_familiar", sa_type=UUID(as_uuid=True)
    )
    id_adulto_significativo: uuid.UUID = Field(
        foreign_key="AdultoSignificativo.id_adulto_significativo", sa_type=UUID(as_uuid=True)
    )
    parentesco: Optional[str] = None
    es_adulto_responsable: bool = False

    antecedente_familiar: "AntecedenteFamiliar" = Relationship(back_populates="entorno_familiar")
    adulto_significativo: "AdultoSignificativo" = Relationship(back_populates="entorno_familiar")
