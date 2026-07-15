import uuid
from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy import CheckConstraint, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.nna import NNA
    from app.models.familiar import Familiar


class E2P(SQLModel, table=True):
    __tablename__ = "E2P"
    __table_args__ = (
        CheckConstraint(
            "rango_etario IN ('0-3_meses','4-10_meses','11-18_meses','19-36_meses','3-5_anos','6-7_anos','8-12_anos','13-17_anos')",
            name="chk_edad_dentro_de_rango",
        ),
        CheckConstraint(
            "perfil_resultado_global IN ('Riesgo','Monitoreo','Optimo')",
            name="chk_perfil_resultado",
        ),
    )

    id_e2p: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_nna: uuid.UUID = Field(foreign_key="NNA.id_nna", sa_type=UUID(as_uuid=True))
    id_familiar: uuid.UUID = Field(
        foreign_key="Familiar.id_familiar", sa_type=UUID(as_uuid=True)
    )
    fecha_evaluacion: date = Field()
    edad_meses_evaluacion: int = Field()
    rango_etario: str = Field()
    perfil_resultado_global: Optional[str] = None
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
    __table_args__ = (
        UniqueConstraint("rango_etario", "numero_item"),
        CheckConstraint(
            "rango_etario IN ('0-3_meses','4-10_meses','11-18_meses','19-36_meses','3-5_anos','6-7_anos','8-12_anos','13-17_anos')",
            name="chk_edad_dentro_de_rango",
        ),
        CheckConstraint(
            "dimension IN ('Vinculares','Formativas','Protectoras','Reflexivas')",
            name="chk_dimension",
        ),
    )

    id_pregunta_e2p: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    rango_etario: str = Field()
    numero_item: int = Field()
    texto_afirmacion: str = Field()
    dimension: str = Field()
    subdimension: Optional[str] = None

    respuestas: list["RespuestaE2P"] = Relationship(back_populates="pregunta")


class RespuestaE2P(SQLModel, table=True):
    __tablename__ = "RespuestaE2P"
    __table_args__ = (
        UniqueConstraint("id_e2p", "id_pregunta_e2p"),
        CheckConstraint("valor_seleccionado BETWEEN 0 AND 4"),
        CheckConstraint("puntaje_calculado BETWEEN 0 AND 4"),
    )

    id_respuesta_e2p: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_e2p: uuid.UUID = Field(
        foreign_key="E2P.id_e2p", sa_type=UUID(as_uuid=True)
    )
    id_pregunta_e2p: uuid.UUID = Field(
        foreign_key="PreguntaE2P.id_pregunta_e2p", sa_type=UUID(as_uuid=True)
    )
    valor_seleccionado: int = Field()
    puntaje_calculado: int = Field()

    evaluacion: "E2P" = Relationship(back_populates="respuestas_list")
    pregunta: "PreguntaE2P" = Relationship(back_populates="respuestas")


class BaremoE2P(SQLModel, table=True):
    __tablename__ = "BaremoE2P"
    __table_args__ = (
        CheckConstraint(
            "rango_etario IN ('0-3_meses','4-10_meses','11-18_meses','19-36_meses','3-5_anos','6-7_anos','8-12_anos','13-17_anos')"
        ),
        CheckConstraint(
            "dimension IN ('Vinculares','Formativas','Protectoras','Reflexivas','Total')"
        ),
        CheckConstraint("decil BETWEEN 1 AND 10"),
        CheckConstraint(
            "zona IN ('Baja frecuencia','Frecuencia intermedia','Alta frecuencia')"
        ),
    )

    id_baremo_e2p: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    rango_etario: str = Field()
    dimension: str = Field()
    decil: int = Field()
    zona: str = Field()
    puntaje_min: int = Field()
    puntaje_max: int = Field()


class PuntajeE2P(SQLModel, table=True):
    __tablename__ = "PuntajeE2P"
    __table_args__ = (
        UniqueConstraint("id_e2p", "dimension"),
        CheckConstraint(
            "dimension IN ('Vinculares','Formativas','Protectoras','Reflexivas','Total')"
        ),
        CheckConstraint(
            "zona IN ('Baja frecuencia','Frecuencia intermedia','Alta frecuencia')"
        ),
    )

    id_puntaje_e2p: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_e2p: uuid.UUID = Field(
        foreign_key="E2P.id_e2p", sa_type=UUID(as_uuid=True)
    )
    dimension: str = Field()
    puntaje_bruto: int = Field()
    decil: Optional[int] = None
    zona: Optional[str] = None

    evaluacion: "E2P" = Relationship(back_populates="puntajes")
