import uuid

from sqlalchemy.dialects.postgresql import UUID
from sqlmodel import Field, SQLModel


class RegistroGrupoFamiliar(SQLModel, table=True):
    __tablename__ = "RegistroGrupoFamiliar"

    id_familiar: uuid.UUID = Field(
        foreign_key="Familiar.id_familiar", primary_key=True, sa_type=UUID(as_uuid=True)
    )
    id_antecedente_familiar: uuid.UUID = Field(
        foreign_key="AntecedenteFamiliar.id_antecedente_familiar",
        primary_key=True,
        sa_type=UUID(as_uuid=True),
    )
