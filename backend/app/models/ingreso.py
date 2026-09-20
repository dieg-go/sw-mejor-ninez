import uuid
from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKeyConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.nna import NNA
    from app.models.solicitante import SolicitanteIngreso


class AntecedenteIngreso(SQLModel, table=True):
    __tablename__ = "AntecedenteIngreso"
    __table_args__ = (
        ForeignKeyConstraint(
            ["id_nna", "id_caso"],
            ["Caso.id_nna", "Caso.id_caso"],
            name="fk_AntecedenteIngreso_nna_caso",
        ),
    )

    id_antecedente_ingreso: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_nna: uuid.UUID = Field(foreign_key="NNA.id_nna", sa_type=UUID(as_uuid=True))
    id_solicitante_ingreso: uuid.UUID = Field(
        foreign_key="SolicitanteIngreso.id_solicitante_ingreso", sa_type=UUID(as_uuid=True)
    )
    # Optional en memoria (el registro se arma sin caso y se sella antes del
    # INSERT), pero NOT NULL en la base: el modelo debe declararlo asi o
    # `--autogenerate` propone quitar el NOT NULL (ver TESTING.md, defecto B2).
    id_caso: Optional[uuid.UUID] = Field(
        default=None,
        foreign_key="Caso.id_caso",
        sa_type=UUID(as_uuid=True),
        sa_column_kwargs={"nullable": False},
    )
    fecha_ingreso_residencia: Optional[date] = None
    orden_tribunal: bool = False
    fecha_causa: Optional[date] = None
    tribunal: Optional[str] = None
    materia: Optional[str] = None
    codigo_rit: Optional[str] = None
    codigo_ruc: Optional[str] = None

    nna: "NNA" = Relationship(back_populates="antecedentes_ingreso")
    solicitante: "SolicitanteIngreso" = Relationship()
    causales_ingreso: list["RegistroCausalIngreso"] = Relationship(back_populates="antecedente_ingreso")
    derechos_vulnerados: list["RegistroDerechoVulnerado"] = Relationship(back_populates="antecedente_ingreso")


class DocumentacionIngreso(SQLModel, table=True):
    __tablename__ = "DocumentacionIngreso"
    __table_args__ = (
        ForeignKeyConstraint(
            ["id_nna", "id_caso"],
            ["Caso.id_nna", "Caso.id_caso"],
            name="fk_DocumentacionIngreso_nna_caso",
        ),
    )

    id_documentacion: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_nna: uuid.UUID = Field(foreign_key="NNA.id_nna", sa_type=UUID(as_uuid=True))
    # Optional en memoria (el registro se arma sin caso y se sella antes del
    # INSERT), pero NOT NULL en la base: el modelo debe declararlo asi o
    # `--autogenerate` propone quitar el NOT NULL (ver TESTING.md, defecto B2).
    id_caso: Optional[uuid.UUID] = Field(
        default=None,
        foreign_key="Caso.id_caso",
        sa_type=UUID(as_uuid=True),
        sa_column_kwargs={"nullable": False},
    )
    tipo_documento: Optional[str] = None
    estado_recepcion: bool = False
    fecha_recepcion: Optional[date] = None
    observacion: Optional[str] = None
    url_documentacion_ingreso: Optional[str] = None

    nna: "NNA" = Relationship(back_populates="documentacion_ingreso")


class RegistroCausalIngreso(SQLModel, table=True):
    __tablename__ = "RegistroCausalIngreso"

    id_registro_causales: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_antecedente_ingreso: uuid.UUID = Field(
        foreign_key="AntecedenteIngreso.id_antecedente_ingreso", sa_type=UUID(as_uuid=True)
    )
    nombre_causal: Optional[str] = None
    descripcion_detallada: Optional[str] = None
    estado: Optional[str] = None

    antecedente_ingreso: "AntecedenteIngreso" = Relationship(back_populates="causales_ingreso")


class RegistroDerechoVulnerado(SQLModel, table=True):
    __tablename__ = "RegistroDerechoVulnerado"

    id_registro_derecho_vulnerado: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_antecedente_ingreso: uuid.UUID = Field(
        foreign_key="AntecedenteIngreso.id_antecedente_ingreso", sa_type=UUID(as_uuid=True)
    )
    nombre_derecho: Optional[str] = None
    estado: Optional[str] = None

    antecedente_ingreso: "AntecedenteIngreso" = Relationship(back_populates="derechos_vulnerados")
