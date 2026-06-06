import uuid
from typing import Optional

from sqlalchemy.dialects.postgresql import UUID
from sqlmodel import Field, SQLModel


class VinculoNNA(SQLModel, table=True):
    __tablename__ = "VinculoNNA"

    id_nna_1: uuid.UUID = Field(
        foreign_key="NNA.id_nna", primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_nna_2: uuid.UUID = Field(
        foreign_key="NNA.id_nna", primary_key=True, sa_type=UUID(as_uuid=True)
    )
    parentesco: Optional[str] = None
