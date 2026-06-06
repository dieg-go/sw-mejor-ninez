import uuid
from typing import Optional

from sqlalchemy.dialects.postgresql import UUID
from sqlmodel import Field, SQLModel


class CentroSalud(SQLModel, table=True):
    __tablename__ = "CentroSalud"

    id_centro_salud: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    nombre: Optional[str] = None
    tipo_recinto: Optional[str] = None
