import uuid
from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy.dialects.postgresql import UUID
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.nna import NNA


class HistorialRedProteccional(SQLModel, table=True):
    __tablename__ = "HistorialRedProteccional"

    id_historial_red: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_nna: uuid.UUID = Field(foreign_key="NNA.id_nna", sa_type=UUID(as_uuid=True))
    nombre_programa: Optional[str] = None
    fecha_ingreso: Optional[date] = None
    fecha_egreso: Optional[date] = None
    motivo_egreso: Optional[str] = None

    nna: "NNA" = Relationship(back_populates="historial_red_proteccional")


class InformeTribunal(SQLModel, table=True):
    __tablename__ = "InformeTribunal"

    id_informe: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_nna: uuid.UUID = Field(foreign_key="NNA.id_nna", sa_type=UUID(as_uuid=True))
    tipo_informe: Optional[str] = None
    fecha_vencimiento: Optional[date] = None
    fecha_envio_real: Optional[date] = None
    estado: Optional[str] = None

    nna: "NNA" = Relationship(back_populates="informes_tribunal")
