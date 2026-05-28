import uuid
from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy.dialects.postgresql import UUID
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.consumo import HistorialConsumoAdulto
    from app.models.discapacidad import DiscapacidadAdulto
    from app.models.antecedentes import VinculoFamiliar
    from app.models.e2p import E2P
    from app.models.pmf import PMF
    from app.models.ncfas import NCFAS


class Familiar(SQLModel, table=True):
    __tablename__ = "Familiar"

    id_familiar: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    nombre: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    run: Optional[str] = None
    direccion: Optional[str] = None
    numero_telefono: Optional[str] = None
    tiene_antecedentes_penales: bool = False

    historial_consumo: list["HistorialConsumoAdulto"] = Relationship(back_populates="familiar")
    discapacidades: list["DiscapacidadAdulto"] = Relationship(back_populates="familiar")
    antecedentes_penales: list["AntecedentesPenales"] = Relationship(back_populates="familiar")
    entorno_familiar: list["VinculoFamiliar"] = Relationship(back_populates="familiar")
    evaluaciones_e2p: list["E2P"] = Relationship(
        back_populates="familiar",
        sa_relationship_kwargs={"foreign_keys": "E2P.id_familiar"},
    )
    evaluaciones_pmf: list["PMF"] = Relationship(
        back_populates="familiar",
        sa_relationship_kwargs={"foreign_keys": "PMF.id_familiar"},
    )
    evaluaciones_ncfas: list["NCFAS"] = Relationship(
        back_populates="familiar",
        sa_relationship_kwargs={"foreign_keys": "NCFAS.id_familiar"},
    )


class AntecedentesPenales(SQLModel, table=True):
    __tablename__ = "AntecedentesPenales"

    id_antecedentes_penales: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_familiar: uuid.UUID = Field(
        foreign_key="Familiar.id_familiar", sa_type=UUID(as_uuid=True)
    )
    descripcion: Optional[str] = None

    familiar: "Familiar" = Relationship(back_populates="antecedentes_penales")
