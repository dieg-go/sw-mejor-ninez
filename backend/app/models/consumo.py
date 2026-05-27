import uuid
from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy.dialects.postgresql import UUID
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.nna import NNA
    from app.models.adulto import Familiar


class HistorialConsumoNNA(SQLModel, table=True):
    __tablename__ = "HistorialConsumoNNA"

    id_historial_consumo: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_nna: uuid.UUID = Field(foreign_key="NNA.id_nna", sa_type=UUID(as_uuid=True))
    nombre_sustancia: Optional[str] = None
    consumo_indirecto_gestacional: bool = False
    estado_consumo: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_termino: Optional[date] = None
    en_tratamiento: bool = False

    nna: "NNA" = Relationship(back_populates="historial_consumo")


class HistorialConsumoAdulto(SQLModel, table=True):
    __tablename__ = "HistorialConsumoAdulto"

    id_historial_consumo: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_familiar: uuid.UUID = Field(
        foreign_key="Familiar.id_familiar", sa_type=UUID(as_uuid=True)
    )
    nombre_sustancia: Optional[str] = None
    estado_consumo: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_termino: Optional[date] = None
    en_tratamiento: bool = False

    familiar: "Familiar" = Relationship(back_populates="historial_consumo")
