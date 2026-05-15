"""initial

Revision ID: 0b733fafb9a6
Revises: 
Create Date: 2026-05-15 09:47:43.860386

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0b733fafb9a6'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    import app.models  # noqa: F401 — register all tables
    from sqlmodel import SQLModel
    
    SQLModel.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    import app.models  # noqa: F401
    from sqlmodel import SQLModel
    
    SQLModel.metadata.drop_all(bind=op.get_bind())
