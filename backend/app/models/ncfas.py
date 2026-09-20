import uuid
from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy import CheckConstraint, ForeignKeyConstraint, JSON, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.nna import NNA
    from app.models.familiar import Familiar


class ItemNCFAS(SQLModel, table=True):
    __tablename__ = "ItemNCFAS"

    id_item_ncfas: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    letra_dimension: str = Field()
    nombre_dimension: str = Field()
    numero_item: int = Field()
    nombre_item: str = Field()
    definiciones: Optional[dict] = Field(default=None, sa_type=JSON)
    es_item_general: bool = Field(default=False)

    respuestas: list["RespuestaNCFAS"] = Relationship(back_populates="item")


class NCFAS(SQLModel, table=True):
    __tablename__ = "NCFAS"
    __table_args__ = (
        ForeignKeyConstraint(
            ["id_nna", "id_caso"], ["Caso.id_nna", "Caso.id_caso"], name="fk_NCFAS_nna_caso"
        ),
    )

    id_ncfas: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_nna: uuid.UUID = Field(foreign_key="NNA.id_nna", sa_type=UUID(as_uuid=True))
    id_familiar: uuid.UUID = Field(
        foreign_key="Familiar.id_familiar", sa_type=UUID(as_uuid=True)
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
    es_reunificacion: bool = Field(default=False)
    fecha_apertura: Optional[date] = None
    fecha_cierre: Optional[date] = None
    estado: Optional[str] = None
    observacion_general: Optional[str] = None

    nna: "NNA" = Relationship(
        back_populates="evaluaciones_ncfas",
        sa_relationship_kwargs={"foreign_keys": "[NCFAS.id_nna]"},
    )
    familiar: "Familiar" = Relationship(
        back_populates="evaluaciones_ncfas",
        sa_relationship_kwargs={"foreign_keys": "[NCFAS.id_familiar]"},
    )
    respuestas_list: list["RespuestaNCFAS"] = Relationship(
        back_populates="evaluacion",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )
    comentarios: list["ComentarioDimensionNCFAS"] = Relationship(
        back_populates="evaluacion",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class RespuestaNCFAS(SQLModel, table=True):
    __tablename__ = "RespuestaNCFAS"
    __table_args__ = (
        UniqueConstraint(
            "id_ncfas", "id_item_ncfas", "momento_evaluacion",
            name="uq_respuesta_ncfas_item_momento",
        ),
        CheckConstraint(
            "\"momento_evaluacion\" IN ('Ingreso', 'Intermedio', 'Cierre')",
            name="chk_momento_ncfas",
        ),
        CheckConstraint(
            "\"puntaje\" IN ('+2', '+1', '0', '-1', '-2', '-3', 'DN', 'N/A')",
            name="chk_puntaje_ncfas",
        ),
    )

    id_respuesta_ncfas: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_ncfas: uuid.UUID = Field(
        foreign_key="NCFAS.id_ncfas",
        sa_type=UUID(as_uuid=True),
        ondelete="CASCADE",
    )
    id_item_ncfas: uuid.UUID = Field(
        foreign_key="ItemNCFAS.id_item_ncfas",
        sa_type=UUID(as_uuid=True),
    )
    momento_evaluacion: str = Field()
    puntaje: str = Field()

    evaluacion: "NCFAS" = Relationship(back_populates="respuestas_list")
    item: "ItemNCFAS" = Relationship(back_populates="respuestas")


class ComentarioDimensionNCFAS(SQLModel, table=True):
    __tablename__ = "ComentarioDimensionNCFAS"
    __table_args__ = (
        UniqueConstraint(
            "id_ncfas", "letra_dimension",
            name="uq_comentario_ncfas_dimension",
        ),
    )

    id_comentario_ncfas: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_ncfas: uuid.UUID = Field(
        foreign_key="NCFAS.id_ncfas",
        sa_type=UUID(as_uuid=True),
        ondelete="CASCADE",
    )
    letra_dimension: str = Field()
    comentario: str = Field()

    evaluacion: "NCFAS" = Relationship(back_populates="comentarios")
