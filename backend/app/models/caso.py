import uuid
from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy import CheckConstraint, Index, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.nna import NNA


class Caso(SQLModel, table=True):
    __tablename__ = "Caso"
    __table_args__ = (
        CheckConstraint(
            "estado IN ('En Progreso','Cerrado')",
            name="chk_estado_caso",
        ),
        Index(
            "uq_caso_activo_por_nna",
            "id_nna",
            unique=True,
            postgresql_where=text("estado = 'En Progreso'"),
        ),
        UniqueConstraint("id_nna", "id_caso", name="uq_caso_nna_caso"),
    )

    id_caso: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_nna: uuid.UUID = Field(foreign_key="NNA.id_nna", sa_type=UUID(as_uuid=True))
    fecha_inicio: Optional[date] = Field(default_factory=date.today)
    fecha_termino: Optional[date] = None
    estado: str = Field(default="En Progreso")

    nna: "NNA" = Relationship(back_populates="casos")