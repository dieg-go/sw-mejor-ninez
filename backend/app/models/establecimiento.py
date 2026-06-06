import uuid
from typing import Optional

from sqlalchemy.dialects.postgresql import UUID
from sqlmodel import Field, SQLModel


class EstablecimientoEducacional(SQLModel, table=True):
    __tablename__ = "EstablecimientoEducacional"

    id_establecimiento_educacional: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    nombre: Optional[str] = None
    rbd: Optional[int] = None
