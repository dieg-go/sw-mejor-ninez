import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlmodel import Field, SQLModel


class Usuario(SQLModel, table=True):
    __tablename__ = "Usuario"

    id_usuario: uuid.UUID = Field(
        default_factory=uuid.uuid4, primary_key=True, sa_type=UUID(as_uuid=True)
    )
    email: str = Field(unique=True, index=True)
    hashed_password: str = Field()
    nombre: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"server_default": func.now()},
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_type=DateTime(timezone=True),
    )
