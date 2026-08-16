import uuid
from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKeyConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.nna import NNA
    from app.models.familiar import Familiar
    from app.models.centro_salud import CentroSalud
    from app.models.establecimiento import EstablecimientoEducacional


class AntecedenteSalud(SQLModel, table=True):
    __tablename__ = "AntecedenteSalud"
    __table_args__ = (
        ForeignKeyConstraint(
            ["id_nna", "id_caso"],
            ["Caso.id_nna", "Caso.id_caso"],
            name="fk_AntecedenteSalud_nna_caso",
        ),
    )

    id_antecedente_salud: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_nna: uuid.UUID = Field(foreign_key="NNA.id_nna", sa_type=UUID(as_uuid=True))
    id_caso: Optional[uuid.UUID] = Field(
        default=None, foreign_key="Caso.id_caso", sa_type=UUID(as_uuid=True)
    )
    id_centro_salud: Optional[uuid.UUID] = Field(
        default=None, foreign_key="CentroSalud.id_centro_salud", sa_type=UUID(as_uuid=True)
    )
    fecha_antecedente_salud: Optional[date] = None
    prevision: Optional[str] = None
    inscrito_en_centro_salud: bool = False

    nna: "NNA" = Relationship(back_populates="antecedentes_salud")
    centro_salud: Optional["CentroSalud"] = Relationship()


class AntecedenteEscolar(SQLModel, table=True):
    __tablename__ = "AntecedenteEscolar"
    __table_args__ = (
        ForeignKeyConstraint(
            ["id_nna", "id_caso"],
            ["Caso.id_nna", "Caso.id_caso"],
            name="fk_AntecedenteEscolar_nna_caso",
        ),
    )

    id_antecedente_escolar: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_nna: uuid.UUID = Field(foreign_key="NNA.id_nna", sa_type=UUID(as_uuid=True))
    id_caso: Optional[uuid.UUID] = Field(
        default=None, foreign_key="Caso.id_caso", sa_type=UUID(as_uuid=True)
    )
    id_establecimiento_educacional: Optional[uuid.UUID] = Field(
        default=None,
        foreign_key="EstablecimientoEducacional.id_establecimiento_educacional",
        sa_type=UUID(as_uuid=True),
    )
    fecha_antecedente_escolar: Optional[date] = None
    ultimo_ano_cursado: Optional[int] = None
    escolarizado: bool = False

    nna: "NNA" = Relationship(back_populates="antecedentes_escolares")
    establecimiento: Optional["EstablecimientoEducacional"] = Relationship()


class AntecedenteFamiliar(SQLModel, table=True):
    __tablename__ = "AntecedenteFamiliar"
    __table_args__ = (
        ForeignKeyConstraint(
            ["id_nna", "id_caso"],
            ["Caso.id_nna", "Caso.id_caso"],
            name="fk_AntecedenteFamiliar_nna_caso",
        ),
    )

    id_antecedente_familiar: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_nna: uuid.UUID = Field(foreign_key="NNA.id_nna", sa_type=UUID(as_uuid=True))
    id_caso: Optional[uuid.UUID] = Field(
        default=None, foreign_key="Caso.id_caso", sa_type=UUID(as_uuid=True)
    )
    id_adulto_responsable: Optional[uuid.UUID] = Field(
        default=None,
        foreign_key="Familiar.id_familiar",
        sa_type=UUID(as_uuid=True),
    )
    fecha_antecedente_familiar: Optional[date] = None
    con_quien_vive: Optional[str] = None
    con_quien_vive_detalle: Optional[str] = None

    nna: "NNA" = Relationship(back_populates="antecedentes_familiares")
    adulto_responsable: Optional["Familiar"] = Relationship()


class VinculoFamiliar(SQLModel, table=True):
    __tablename__ = "VinculoFamiliar"

    id_vinculo_familiar: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_nna: uuid.UUID = Field(foreign_key="NNA.id_nna", sa_type=UUID(as_uuid=True))
    id_familiar: uuid.UUID = Field(
        foreign_key="Familiar.id_familiar", sa_type=UUID(as_uuid=True)
    )
    parentesco: Optional[str] = None

    nna: "NNA" = Relationship()
    familiar: "Familiar" = Relationship(back_populates="vinculos_familiares")
