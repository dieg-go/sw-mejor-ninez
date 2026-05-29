"""Renombrar AdultoSignificativo → Familiar y EntornoFamiliar → VinculoFamiliar

Revision ID: 20260526_2116
Revises: ef7302f55ef1
Create Date: 2026-05-26 21:16:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


revision: str = "20260526_2116"
down_revision: Union[str, None] = "ef7302f55ef1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(table_name: str) -> bool:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    if not _has_table("AdultoSignificativo"):
        return

    op.alter_column("AdultoSignificativo", "id_adulto_significativo", new_column_name="id_familiar")
    op.rename_table("AdultoSignificativo", "Familiar")

    child_tables = [
        "HistorialConsumoAdulto",
        "DiscapacidadAdulto",
        "AntecedentesPenales",
        "E2P",
        "PMF",
        "NCFAS",
    ]
    for table in child_tables:
        op.alter_column(table, "id_adulto_significativo", new_column_name="id_familiar")

    op.alter_column("EntornoFamiliar", "id_adulto_significativo", new_column_name="id_familiar")
    op.rename_table("EntornoFamiliar", "VinculoFamiliar")


def downgrade() -> None:
    if not _has_table("Familiar"):
        return

    op.rename_table("VinculoFamiliar", "EntornoFamiliar")
    op.alter_column("EntornoFamiliar", "id_familiar", new_column_name="id_adulto_significativo")

    child_tables = [
        "HistorialConsumoAdulto",
        "DiscapacidadAdulto",
        "AntecedentesPenales",
        "E2P",
        "PMF",
        "NCFAS",
    ]
    for table in child_tables:
        op.alter_column(table, "id_familiar", new_column_name="id_adulto_significativo")

    op.rename_table("Familiar", "AdultoSignificativo")
    op.alter_column("AdultoSignificativo", "id_familiar", new_column_name="id_adulto_significativo")
