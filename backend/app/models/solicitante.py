import uuid
from typing import Optional

from sqlalchemy.dialects.postgresql import UUID
from sqlmodel import Field, SQLModel


class SolicitanteIngreso(SQLModel, table=True):
    __tablename__ = "SolicitanteIngreso"

    id_solicitante_ingreso: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    nombre: Optional[str] = None
    categoria: Optional[str] = None
    ano_proyecto: Optional[int] = None
