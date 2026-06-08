import uuid

from sqlalchemy import Column, text
from sqlalchemy.dialects.postgresql import UUID
from sqlmodel import Field, SQLModel, UniqueConstraint


class RegistroGrupoFamiliar(SQLModel, table=True):
    __tablename__ = "RegistroGrupoFamiliar"
    __table_args__ = (
        UniqueConstraint("id_familiar", "id_antecedente_familiar"),
    )

    id_registro_grupo_familiar: uuid.UUID = Field(
        default=None,
        sa_column=Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")),
    )
    id_familiar: uuid.UUID = Field(
        foreign_key="Familiar.id_familiar", sa_type=UUID(as_uuid=True)
    )
    id_antecedente_familiar: uuid.UUID = Field(
        foreign_key="AntecedenteFamiliar.id_antecedente_familiar",
        sa_type=UUID(as_uuid=True),
    )
