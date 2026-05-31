"""add_usuario_table

Revision ID: 6ee297be7960
Revises: f4285c627ed7
Create Date: 2026-05-31 02:00:39.362449

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '6ee297be7960'
down_revision: Union[str, None] = 'f4285c627ed7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('Usuario',
    sa.Column('id_usuario', sa.UUID(), nullable=False),
    sa.Column('email', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('hashed_password', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('nombre', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id_usuario')
    )
    op.create_index(op.f('ix_Usuario_email'), 'Usuario', ['email'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_Usuario_email'), table_name='Usuario')
    op.drop_table('Usuario')
