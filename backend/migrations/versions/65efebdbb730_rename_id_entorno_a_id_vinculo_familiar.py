"""rename_id_entorno_a_id_vinculo_familiar

Revision ID: 65efebdbb730
Revises: 20260526_2116
Create Date: 2026-05-29 10:59:10.348388

"""
from typing import Sequence, Union

from alembic import op


revision: str = "65efebdbb730"
down_revision: Union[str, None] = "20260526_2116"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "VinculoFamiliar",
        "id_entorno_familiar",
        new_column_name="id_vinculo_familiar",
    )


def downgrade() -> None:
    op.alter_column(
        "VinculoFamiliar",
        "id_vinculo_familiar",
        new_column_name="id_entorno_familiar",
    )
