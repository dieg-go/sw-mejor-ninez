import uuid
from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy.dialects.postgresql import UUID
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.nna import NNA
    from app.models.adulto import Familiar


class NCFAS(SQLModel, table=True):
    __tablename__ = "NCFAS"

    id_instrumento: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_nna: uuid.UUID = Field(foreign_key="NNA.id_nna", sa_type=UUID(as_uuid=True))
    id_familiar: uuid.UUID = Field(
        foreign_key="Familiar.id_familiar", sa_type=UUID(as_uuid=True)
    )
    fecha_evaluacion: Optional[date] = None
    fecha_proxima_evaluacion: Optional[date] = None
    resultado: Optional[str] = None
    observacion: Optional[str] = None

    nna: "NNA" = Relationship(
        back_populates="evaluaciones_ncfas",
        sa_relationship_kwargs={"foreign_keys": "[NCFAS.id_nna]"},
    )
    familiar: "Familiar" = Relationship(
        back_populates="evaluaciones_ncfas",
        sa_relationship_kwargs={"foreign_keys": "[NCFAS.id_familiar]"},
    )
