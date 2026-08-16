"""caso grouping

Revision ID: 3f2e134a5977
Revises: 0b733fafb9a6
Create Date: 2026-08-16 16:09:06.247684

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '3f2e134a5977'
down_revision: Union[str, None] = '0b733fafb9a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

GROUPED_TABLES = [
    "AntecedenteEscolar",
    "AntecedenteFamiliar",
    "AntecedenteIngreso",
    "AntecedenteSalud",
    "DocumentacionIngreso",
    "E2P",
    "InformeTribunal",
    "NCFAS",
    "PMF",
    "ProcesoDespejeFamiliar",
]


def upgrade() -> None:
    op.create_table('Caso',
    sa.Column('id_caso', sa.UUID(), nullable=False),
    sa.Column('id_nna', sa.UUID(), nullable=False),
    sa.Column('fecha_inicio', sa.Date(), nullable=True),
    sa.Column('fecha_termino', sa.Date(), nullable=True),
    sa.Column('estado', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.CheckConstraint("estado IN ('En Progreso','Cerrado')", name='chk_estado_caso'),
    sa.ForeignKeyConstraint(['id_nna'], ['NNA.id_nna'], ),
    sa.PrimaryKeyConstraint('id_caso')
    )
    op.create_index('uq_caso_activo_por_nna', 'Caso', ['id_nna'], unique=True, postgresql_where=sa.text("estado = 'En Progreso'"))
    for table in GROUPED_TABLES:
        op.add_column(table, sa.Column('id_caso', sa.UUID(), nullable=True))
        op.create_foreign_key(f'fk_{table}_id_caso', table, 'Caso', ['id_caso'], ['id_caso'])

    op.execute(
        """
        INSERT INTO "Caso" (id_caso, id_nna, estado)
        SELECT gen_random_uuid(), id_nna, 'En Progreso'
        FROM "NNA"
        """
    )
    for table in GROUPED_TABLES:
        op.execute(
            f'UPDATE "{table}" SET id_caso = c.id_caso FROM "Caso" c '
            f'WHERE c.id_nna = "{table}".id_nna'
        )


def downgrade() -> None:
    for table in GROUPED_TABLES:
        op.drop_constraint(f'fk_{table}_id_caso', table, type_='foreignkey')
        op.drop_column(table, 'id_caso')
    op.drop_index('uq_caso_activo_por_nna', table_name='Caso', postgresql_where=sa.text("estado = 'En Progreso'"))
    op.drop_table('Caso')