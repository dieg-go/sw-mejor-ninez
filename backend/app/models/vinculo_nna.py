import uuid
from typing import Optional

from sqlalchemy import CheckConstraint, Column, text
from sqlalchemy.dialects.postgresql import UUID
from sqlmodel import Field, SQLModel, UniqueConstraint


class VinculoNNA(SQLModel, table=True):
    __tablename__ = "VinculoNNA"
    __table_args__ = (
        UniqueConstraint("id_nna_1", "id_nna_2"),
        CheckConstraint("id_nna_1 < id_nna_2", name="chk_vinculo_nna_orden"),
    )

    id_vinculo_nna: uuid.UUID = Field(
        default=None,
        sa_column=Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")),
    )
    id_nna_1: uuid.UUID = Field(
        foreign_key="NNA.id_nna", sa_type=UUID(as_uuid=True)
    )
    id_nna_2: uuid.UUID = Field(
        foreign_key="NNA.id_nna", sa_type=UUID(as_uuid=True)
    )
    parentesco: Optional[str] = None
