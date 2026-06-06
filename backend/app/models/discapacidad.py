import uuid
from typing import TYPE_CHECKING, Optional

from sqlalchemy.dialects.postgresql import UUID
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.nna import NNA
    from app.models.familiar import Familiar


class DiscapacidadNNA(SQLModel, table=True):
    __tablename__ = "DiscapacidadNNA"

    id_discapacidad_nna: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_nna: uuid.UUID = Field(foreign_key="NNA.id_nna", sa_type=UUID(as_uuid=True))
    tipo: Optional[str] = None
    porcentaje_grado: Optional[int] = None
    observacion: Optional[str] = None

    nna: "NNA" = Relationship(back_populates="discapacidades")


class DiscapacidadAdulto(SQLModel, table=True):
    __tablename__ = "DiscapacidadAdulto"

    id_discapacidad_adulto: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_familiar: uuid.UUID = Field(
        foreign_key="Familiar.id_familiar", sa_type=UUID(as_uuid=True)
    )
    tipo: Optional[str] = None
    porcentaje_grado: Optional[int] = None
    observacion: Optional[str] = None

    familiar: "Familiar" = Relationship(back_populates="discapacidades")
