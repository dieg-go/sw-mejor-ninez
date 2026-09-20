import uuid
from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKeyConstraint, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.nna import NNA
    from app.models.familiar import Familiar


class ProcesoDespejeFamiliar(SQLModel, table=True):
    __tablename__ = "ProcesoDespejeFamiliar"
    __table_args__ = (
        UniqueConstraint("id_nna", "id_caso", name="uq_despeje_nna_caso"),
        ForeignKeyConstraint(
            ["id_nna", "id_caso"],
            ["Caso.id_nna", "Caso.id_caso"],
            name="fk_ProcesoDespejeFamiliar_nna_caso",
        ),
    )

    id_despeje: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_nna: uuid.UUID = Field(
        foreign_key="NNA.id_nna", sa_type=UUID(as_uuid=True)
    )
    # Optional en memoria (el registro se arma sin caso y se sella antes del
    # INSERT), pero NOT NULL en la base: el modelo debe declararlo asi o
    # `--autogenerate` propone quitar el NOT NULL (ver TESTING.md, defecto B2).
    id_caso: Optional[uuid.UUID] = Field(
        default=None,
        foreign_key="Caso.id_caso",
        sa_type=UUID(as_uuid=True),
        sa_column_kwargs={"nullable": False},
    )
    fecha_solicitud_informe: Optional[date] = None
    fecha_recepcion_informe: Optional[date] = None
    estado: Optional[str] = None
    url_informe_hijo: Optional[str] = None

    nna: "NNA" = Relationship(back_populates="despejes")
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
