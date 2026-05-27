"""Renombrar AdultoSignificativo → Familiar y EntornoFamiliar → VinculoFamiliar

Revision ID: 20260526_2116
Revises: ef7302f55ef1
Create Date: 2026-05-26 21:16:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260526_2116"
down_revision: Union[str, None] = "ef7302f55ef1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Renombrar columna PK en AdultoSignificativo (dentro de la misma tabla)
    op.alter_column("AdultoSignificativo", "id_adulto_significativo", new_column_name="id_familiar")

    # 2. Renombrar tabla AdultoSignificativo → Familiar
    op.rename_table("AdultoSignificativo", "Familiar")

    # 3. Renombrar FK column en tablas hijas de Familiar
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

    # 4. Renombrar tabla EntornoFamiliar → VinculoFamiliar
    op.alter_column("EntornoFamiliar", "id_adulto_significativo", new_column_name="id_familiar")
    op.rename_table("EntornoFamiliar", "VinculoFamiliar")


def downgrade() -> None:
    # Revertir en orden inverso

    # 4. VinculoFamiliar → EntornoFamiliar
    op.rename_table("VinculoFamiliar", "EntornoFamiliar")
    op.alter_column("EntornoFamiliar", "id_familiar", new_column_name="id_adulto_significativo")

    # 3. Renombrar FK column de vuelta en tablas hijas
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

    # 2. Familiar → AdultoSignificativo
    op.rename_table("Familiar", "AdultoSignificativo")

    # 1. Renombrar PK de vuelta
    op.alter_column("AdultoSignificativo", "id_familiar", new_column_name="id_adulto_significativo")
