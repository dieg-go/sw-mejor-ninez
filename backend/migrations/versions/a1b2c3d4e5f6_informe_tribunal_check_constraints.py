"""informe_tribunal_check_constraints

Revision ID: a1b2c3d4e5f6
Revises: 0b733fafb9a6
Create Date: 2026-06-24
"""
from typing import Sequence, Union

from alembic import op


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '0b733fafb9a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        UPDATE "InformeTribunal"
        SET tipo_informe = NULL
        WHERE tipo_informe NOT IN ('Diagnóstico', 'Seguimiento');
    """)

    op.execute("""
        UPDATE "InformeTribunal"
        SET estado = NULL
        WHERE estado NOT IN ('Pendiente', 'Enviado', 'Vencido');
    """)

    op.create_check_constraint(
        "ck_informe_tribunal_tipo_informe",
        "InformeTribunal",
        "tipo_informe IS NULL OR tipo_informe IN ('Diagnóstico', 'Seguimiento')",
    )

    op.create_check_constraint(
        "ck_informe_tribunal_estado",
        "InformeTribunal",
        "estado IS NULL OR estado IN ('Pendiente', 'Enviado', 'Vencido')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_informe_tribunal_tipo_informe", "InformeTribunal", type_="check")
    op.drop_constraint("ck_informe_tribunal_estado", "InformeTribunal", type_="check")
