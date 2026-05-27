import uuid
from datetime import date
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.nna import NNA
    from app.models.adulto import Familiar


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
    respuestas: Optional[dict[str, Any]] = Field(default=None, sa_type=JSON)
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
