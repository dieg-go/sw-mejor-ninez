"""normalize_e2p

Revision ID: ae12f00b467b
Revises: 65efebdbb730
Create Date: 2026-05-29 21:24:14.530348

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'ae12f00b467b'
down_revision: Union[str, None] = '65efebdbb730'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('BaremoE2P',
    sa.Column('id_baremo_e2p', sa.UUID(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.Column('categoria', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('zona', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('puntaje_min', sa.Integer(), nullable=False),
    sa.Column('puntaje_max', sa.Integer(), nullable=False),
    sa.PrimaryKeyConstraint('id_baremo_e2p')
    )
    op.create_table('PreguntaE2P',
    sa.Column('id_pregunta_e2p', sa.UUID(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.Column('numero', sa.Integer(), nullable=False),
    sa.Column('texto', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('categoria', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.PrimaryKeyConstraint('id_pregunta_e2p')
    )
    op.create_table('RespuestaE2P',
    sa.Column('id_respuesta_e2p', sa.UUID(), nullable=False),
    sa.Column('id_instrumento', sa.UUID(), nullable=False),
    sa.Column('id_pregunta_e2p', sa.UUID(), nullable=False),
    sa.Column('valor', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['id_instrumento'], ['E2P.id_instrumento'], ),
    sa.ForeignKeyConstraint(['id_pregunta_e2p'], ['PreguntaE2P.id_pregunta_e2p'], ),
    sa.PrimaryKeyConstraint('id_respuesta_e2p')
    )


def downgrade() -> None:
    op.drop_table('RespuestaE2P')
    op.drop_table('PreguntaE2P')
    op.drop_table('BaremoE2P')
