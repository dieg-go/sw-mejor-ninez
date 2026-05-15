import uuid
from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy.dialects.postgresql import UUID
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.nna import NNA
    from app.models.adulto import AdultoSignificativo


class E2P(SQLModel, table=True):
    __tablename__ = "E2P"

    id_instrumento: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_nna: uuid.UUID = Field(foreign_key="NNA.id_nna", sa_type=UUID(as_uuid=True))
    id_adulto_significativo: uuid.UUID = Field(
        foreign_key="AdultoSignificativo.id_adulto_significativo", sa_type=UUID(as_uuid=True)
    )
    fecha_evaluacion: Optional[date] = None
    fecha_proxima_evaluacion: Optional[date] = None
    resultado: Optional[str] = None
    observacion: Optional[str] = None

    nna: "NNA" = Relationship(
        back_populates="evaluaciones_e2p",
        sa_relationship_kwargs={"foreign_keys": "[E2P.id_nna]"},
    )
    adulto_significativo: "AdultoSignificativo" = Relationship(
        back_populates="evaluaciones_e2p",
        sa_relationship_kwargs={"foreign_keys": "[E2P.id_adulto_significativo]"},
    )


class PMF(SQLModel, table=True):
    __tablename__ = "PMF"

    id_instrumento: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_nna: uuid.UUID = Field(foreign_key="NNA.id_nna", sa_type=UUID(as_uuid=True))
    id_adulto_significativo: uuid.UUID = Field(
        foreign_key="AdultoSignificativo.id_adulto_significativo", sa_type=UUID(as_uuid=True)
    )
    fecha_evaluacion: Optional[date] = None
    fecha_proxima_evaluacion: Optional[date] = None
    resultado: Optional[str] = None
    observacion: Optional[str] = None

    nna: "NNA" = Relationship(
        back_populates="evaluaciones_pmf",
        sa_relationship_kwargs={"foreign_keys": "[PMF.id_nna]"},
    )
    adulto_significativo: "AdultoSignificativo" = Relationship(
        back_populates="evaluaciones_pmf",
        sa_relationship_kwargs={"foreign_keys": "[PMF.id_adulto_significativo]"},
    )


class NCFAS(SQLModel, table=True):
    __tablename__ = "NCFAS"

    id_instrumento: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_nna: uuid.UUID = Field(foreign_key="NNA.id_nna", sa_type=UUID(as_uuid=True))
    id_adulto_significativo: uuid.UUID = Field(
        foreign_key="AdultoSignificativo.id_adulto_significativo", sa_type=UUID(as_uuid=True)
    )
    fecha_evaluacion: Optional[date] = None
    fecha_proxima_evaluacion: Optional[date] = None
    resultado: Optional[str] = None
    observacion: Optional[str] = None

    nna: "NNA" = Relationship(
        back_populates="evaluaciones_ncfas",
        sa_relationship_kwargs={"foreign_keys": "[NCFAS.id_nna]"},
    )
    adulto_significativo: "AdultoSignificativo" = Relationship(
        back_populates="evaluaciones_ncfas",
        sa_relationship_kwargs={"foreign_keys": "[NCFAS.id_adulto_significativo]"},
    )
