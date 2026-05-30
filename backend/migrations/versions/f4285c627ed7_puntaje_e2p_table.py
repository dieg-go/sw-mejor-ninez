"""puntaje_e2p_table

Revision ID: f4285c627ed7
Revises: ae12f00b467b
Create Date: 2026-05-29 22:43:26.136828

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'f4285c627ed7'
down_revision: Union[str, None] = 'ae12f00b467b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('PuntajeE2P',
    sa.Column('id_puntaje_e2p', sa.UUID(), nullable=False),
    sa.Column('id_instrumento', sa.UUID(), nullable=False),
    sa.Column('categoria', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('puntaje_bruto', sa.Integer(), nullable=False),
    sa.Column('puntaje_max', sa.Integer(), nullable=False),
    sa.Column('zona', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('rango_zona', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.ForeignKeyConstraint(['id_instrumento'], ['E2P.id_instrumento'], ),
    sa.PrimaryKeyConstraint('id_puntaje_e2p')
    )


def downgrade() -> None:
    op.drop_table('PuntajeE2P')
