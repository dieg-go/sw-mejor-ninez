import uuid
from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy.dialects.postgresql import UUID
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.nna import NNA
    from app.models.familiar import Familiar


class E2P(SQLModel, table=True):
    __tablename__ = "E2P"

    id_instrumento: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_nna: uuid.UUID = Field(foreign_key="NNA.id_nna", sa_type=UUID(as_uuid=True))
    id_familiar: uuid.UUID = Field(
        foreign_key="Familiar.id_familiar", sa_type=UUID(as_uuid=True)
    )
    fecha_evaluacion: Optional[date] = None
    fecha_proxima_evaluacion: Optional[date] = None
    version: int = Field()
    resultado: Optional[str] = None
    observacion: Optional[str] = None

    nna: "NNA" = Relationship(
        back_populates="evaluaciones_e2p",
        sa_relationship_kwargs={"foreign_keys": "[E2P.id_nna]"},
    )
    familiar: "Familiar" = Relationship(
        back_populates="evaluaciones_e2p",
        sa_relationship_kwargs={"foreign_keys": "[E2P.id_familiar]"},
    )
    respuestas_list: list["RespuestaE2P"] = Relationship(back_populates="evaluacion")
    puntajes: list["PuntajeE2P"] = Relationship(back_populates="evaluacion")


class PreguntaE2P(SQLModel, table=True):
    __tablename__ = "PreguntaE2P"

    id_pregunta_e2p: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    version: int = Field()
    numero: int = Field()
    texto: str = Field()
    categoria: str = Field()

    respuestas: list["RespuestaE2P"] = Relationship(back_populates="pregunta")


class RespuestaE2P(SQLModel, table=True):
    __tablename__ = "RespuestaE2P"

    id_respuesta_e2p: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_instrumento: uuid.UUID = Field(
        foreign_key="E2P.id_instrumento", sa_type=UUID(as_uuid=True)
    )
    id_pregunta_e2p: uuid.UUID = Field(
        foreign_key="PreguntaE2P.id_pregunta_e2p", sa_type=UUID(as_uuid=True)
    )
    valor: int = Field()

    evaluacion: "E2P" = Relationship(back_populates="respuestas_list")
    pregunta: "PreguntaE2P" = Relationship(back_populates="respuestas")


class BaremoE2P(SQLModel, table=True):
    __tablename__ = "BaremoE2P"

    id_baremo_e2p: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    version: int = Field()
    categoria: str = Field()
    zona: str = Field()
    puntaje_min: int = Field()
    puntaje_max: int = Field()


class PuntajeE2P(SQLModel, table=True):
    __tablename__ = "PuntajeE2P"

    id_puntaje_e2p: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_instrumento: uuid.UUID = Field(
        foreign_key="E2P.id_instrumento", sa_type=UUID(as_uuid=True)
    )
    categoria: str = Field()
    puntaje_bruto: int = Field()
    puntaje_max: int = Field()
    zona: str = Field()
    rango_zona: str = Field()

    evaluacion: "E2P" = Relationship(back_populates="puntajes")
