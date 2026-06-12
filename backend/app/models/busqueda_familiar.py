import uuid
from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy.dialects.postgresql import UUID
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.nna import NNA
    from app.models.familiar import Familiar


class ProcesoDespejeFamiliar(SQLModel, table=True):
    __tablename__ = "ProcesoDespejeFamiliar"

    id_despeje: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_nna: uuid.UUID = Field(
        foreign_key="NNA.id_nna", unique=True, sa_type=UUID(as_uuid=True)
    )
    fecha_solicitud_informe: Optional[date] = None
    fecha_recepcion_informe: Optional[date] = None
    estado: Optional[str] = None
    url_informe_hijo: Optional[str] = None

    nna: "NNA" = Relationship(back_populates="despeje")
    notificaciones: list["NotificacionFamiliar"] = Relationship(back_populates="despeje")


class NotificacionFamiliar(SQLModel, table=True):
    __tablename__ = "NotificacionFamiliar"

    id_notificacion: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_despeje: uuid.UUID = Field(
        foreign_key="ProcesoDespejeFamiliar.id_despeje", sa_type=UUID(as_uuid=True)
    )
    id_familiar: uuid.UUID = Field(
        foreign_key="Familiar.id_familiar", sa_type=UUID(as_uuid=True)
    )

    fecha_envio_carta_1: Optional[date] = None
    codigo_seguimiento_1: Optional[str] = None
    estado_entrega_1: Optional[str] = None
    fecha_recepcion_carta_1: Optional[date] = None

    fecha_envio_carta_2: Optional[date] = None
    codigo_seguimiento_2: Optional[str] = None
    estado_entrega_2: Optional[str] = None
    fecha_recepcion_carta_2: Optional[date] = None

    resultado_contacto: Optional[str] = None
    fecha_respuesta: Optional[date] = None
    observacion: Optional[str] = None

    despeje: "ProcesoDespejeFamiliar" = Relationship(back_populates="notificaciones")
    familiar: "Familiar" = Relationship(back_populates="notificaciones_despeje")
