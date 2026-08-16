import uuid
from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKeyConstraint, String
from sqlalchemy.dialects.postgresql import UUID
from sqlmodel import Field, Relationship, SQLModel

from app.models.enums import EstadoInforme, TipoInforme

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
    __table_args__ = (
        ForeignKeyConstraint(
            ["id_nna", "id_caso"],
            ["Caso.id_nna", "Caso.id_caso"],
            name="fk_InformeTribunal_nna_caso",
        ),
    )

    id_informe: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_nna: uuid.UUID = Field(foreign_key="NNA.id_nna", sa_type=UUID(as_uuid=True))
    id_caso: Optional[uuid.UUID] = Field(
        default=None, foreign_key="Caso.id_caso", sa_type=UUID(as_uuid=True)
    )
    tipo_informe: Optional[TipoInforme] = Field(default=None, sa_type=String)
    fecha_vencimiento: Optional[date] = None
    fecha_envio_real: Optional[date] = None
    estado: Optional[EstadoInforme] = Field(default=None, sa_type=String)
    url_documento: Optional[str] = None

    nna: "NNA" = Relationship(back_populates="informes_tribunal")
