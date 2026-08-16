import uuid
from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKeyConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.nna import NNA
    from app.models.familiar import Familiar


class PMF(SQLModel, table=True):
    __tablename__ = "PMF"
    __table_args__ = (
        ForeignKeyConstraint(
            ["id_nna", "id_caso"], ["Caso.id_nna", "Caso.id_caso"], name="fk_PMF_nna_caso"
        ),
    )

    id_pmf: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_nna: uuid.UUID = Field(foreign_key="NNA.id_nna", sa_type=UUID(as_uuid=True))
    id_familiar: uuid.UUID = Field(
        foreign_key="Familiar.id_familiar", sa_type=UUID(as_uuid=True)
    )
    id_caso: Optional[uuid.UUID] = Field(
        default=None, foreign_key="Caso.id_caso", sa_type=UUID(as_uuid=True)
    )
    fecha_evaluacion: Optional[date] = None
    fecha_proxima_evaluacion: Optional[date] = None
    resultado: Optional[str] = None
    observacion: Optional[str] = None

    nna: "NNA" = Relationship(
        back_populates="evaluaciones_pmf",
        sa_relationship_kwargs={"foreign_keys": "[PMF.id_nna]"},
    )
    familiar: "Familiar" = Relationship(
        back_populates="evaluaciones_pmf",
        sa_relationship_kwargs={"foreign_keys": "[PMF.id_familiar]"},
    )
    respuestas_list: list["RespuestaPMF"] = Relationship(back_populates="evaluacion")


class PreguntaPMF(SQLModel, table=True):
    __tablename__ = "PreguntaPMF"

    id_pregunta_pmf: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    numero: int = Field()
    afirmacion: str = Field()
    escala: Optional[str] = Field(default=None)

    respuestas: list["RespuestaPMF"] = Relationship(back_populates="pregunta")


class RespuestaPMF(SQLModel, table=True):
    __tablename__ = "RespuestaPMF"

    id_respuesta_pmf: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_pmf: uuid.UUID = Field(
        foreign_key="PMF.id_pmf",
        sa_type=UUID(as_uuid=True),
        ondelete="CASCADE",
    )
    id_pregunta_pmf: uuid.UUID = Field(
        foreign_key="PreguntaPMF.id_pregunta_pmf",
        sa_type=UUID(as_uuid=True),
    )
    respuesta: bool = Field()

    evaluacion: "PMF" = Relationship(back_populates="respuestas_list")
    pregunta: "PreguntaPMF" = Relationship(back_populates="respuestas")
