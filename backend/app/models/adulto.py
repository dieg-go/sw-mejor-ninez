import uuid
from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy.dialects.postgresql import UUID
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.consumo import HistorialConsumoAdulto
    from app.models.discapacidad import DiscapacidadAdulto
    from app.models.antecedentes import EntornoFamiliar
    from app.models.instrumentos import E2P, PMF, NCFAS


class AdultoSignificativo(SQLModel, table=True):
    __tablename__ = "AdultoSignificativo"

    id_adulto_significativo: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    nombre: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    run: Optional[str] = None
    direccion: Optional[str] = None
    numero_telefono: Optional[str] = None
    tiene_antecedentes_penales: bool = False

    historial_consumo: list["HistorialConsumoAdulto"] = Relationship(back_populates="adulto")
    discapacidades: list["DiscapacidadAdulto"] = Relationship(back_populates="adulto")
    antecedentes_penales: list["AntecedentesPenales"] = Relationship(back_populates="adulto")
    entorno_familiar: list["EntornoFamiliar"] = Relationship(back_populates="adulto_significativo")
    evaluaciones_e2p: list["E2P"] = Relationship(
        back_populates="adulto_significativo",
        sa_relationship_kwargs={"foreign_keys": "E2P.id_adulto_significativo"},
    )
    evaluaciones_pmf: list["PMF"] = Relationship(
        back_populates="adulto_significativo",
        sa_relationship_kwargs={"foreign_keys": "PMF.id_adulto_significativo"},
    )
    evaluaciones_ncfas: list["NCFAS"] = Relationship(
        back_populates="adulto_significativo",
        sa_relationship_kwargs={"foreign_keys": "NCFAS.id_adulto_significativo"},
    )


class AntecedentesPenales(SQLModel, table=True):
    __tablename__ = "AntecedentesPenales"

    id_antecedentes_penales: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_adulto_significativo: uuid.UUID = Field(
        foreign_key="AdultoSignificativo.id_adulto_significativo", sa_type=UUID(as_uuid=True)
    )
    descripcion: Optional[str] = None

    adulto: "AdultoSignificativo" = Relationship(back_populates="antecedentes_penales")
