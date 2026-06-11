"""restructure_ncfas_tables

Revision ID: b9466b980885
Revises: 12d87334457e
Create Date: 2026-06-10 21:55:21.378434

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'b9466b980885'
down_revision: Union[str, None] = '12d87334457e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop old flat NCFAS table
    op.execute("DROP TABLE IF EXISTS \"NCFAS\" CASCADE")

    # Create new NCFAS table with updated columns per db-schema-reference
    op.create_table(
        "NCFAS",
        sa.Column("id_ncfas", sa.UUID(), nullable=False),
        sa.Column("id_nna", sa.UUID(), nullable=False),
        sa.Column("id_familiar", sa.UUID(), nullable=False),
        sa.Column("es_reunificacion", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("fecha_apertura", sa.Date(), nullable=True),
        sa.Column("fecha_cierre", sa.Date(), nullable=True),
        sa.Column("estado", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("observacion_general", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.PrimaryKeyConstraint("id_ncfas"),
        sa.ForeignKeyConstraint(["id_nna"], ["NNA.id_nna"], ondelete="NO ACTION"),
        sa.ForeignKeyConstraint(["id_familiar"], ["Familiar.id_familiar"], ondelete="NO ACTION"),
    )

    # Create ItemNCFAS catalog table
    op.create_table(
        "ItemNCFAS",
        sa.Column("id_item_ncfas", sa.UUID(), nullable=False),
        sa.Column("letra_dimension", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("nombre_dimension", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("numero_item", sa.Integer(), nullable=False),
        sa.Column("nombre_item", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("definiciones", sa.JSON(), nullable=True),
        sa.Column("es_item_general", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.PrimaryKeyConstraint("id_item_ncfas"),
    )

    # Create RespuestaNCFAS (scores per item per momento)
    op.create_table(
        "RespuestaNCFAS",
        sa.Column("id_respuesta_ncfas", sa.UUID(), nullable=False),
        sa.Column("id_ncfas", sa.UUID(), nullable=False),
        sa.Column("id_item_ncfas", sa.UUID(), nullable=False),
        sa.Column("momento_evaluacion", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("puntaje", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.PrimaryKeyConstraint("id_respuesta_ncfas"),
        sa.ForeignKeyConstraint(["id_ncfas"], ["NCFAS.id_ncfas"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["id_item_ncfas"], ["ItemNCFAS.id_item_ncfas"], ondelete="NO ACTION"),
        sa.UniqueConstraint("id_ncfas", "id_item_ncfas", "momento_evaluacion",
                           name="uq_respuesta_ncfas_item_momento"),
    )

    # Check constraints for RespuestaNCFAS
    op.create_check_constraint(
        "chk_momento_ncfas",
        "RespuestaNCFAS",
        "\"momento_evaluacion\" IN ('Ingreso', 'Intermedio', 'Cierre')",
    )
    op.create_check_constraint(
        "chk_puntaje_ncfas",
        "RespuestaNCFAS",
        "\"puntaje\" IN ('+2', '+1', '0', '-1', '-2', '-3', 'DN', 'N/A')",
    )

    # Create ComentarioDimensionNCFAS
    op.create_table(
        "ComentarioDimensionNCFAS",
        sa.Column("id_comentario_ncfas", sa.UUID(), nullable=False),
        sa.Column("id_ncfas", sa.UUID(), nullable=False),
        sa.Column("letra_dimension", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("comentario", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.PrimaryKeyConstraint("id_comentario_ncfas"),
        sa.ForeignKeyConstraint(["id_ncfas"], ["NCFAS.id_ncfas"], ondelete="CASCADE"),
        sa.UniqueConstraint("id_ncfas", "letra_dimension",
                           name="uq_comentario_ncfas_dimension"),
    )


def downgrade() -> None:
    op.drop_table("ComentarioDimensionNCFAS")
    op.drop_table("RespuestaNCFAS")
    op.drop_table("ItemNCFAS")

    op.execute("DROP TABLE IF EXISTS \"NCFAS\" CASCADE")

    # Recreate old flat NCFAS table
    op.create_table(
        "NCFAS",
        sa.Column("id_ncfas", sa.UUID(), nullable=False),
        sa.Column("id_nna", sa.UUID(), nullable=False),
        sa.Column("id_familiar", sa.UUID(), nullable=False),
        sa.Column("fecha_evaluacion", sa.Date(), nullable=True),
        sa.Column("fecha_proxima_evaluacion", sa.Date(), nullable=True),
        sa.Column("resultado", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("observacion", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.PrimaryKeyConstraint("id_ncfas"),
        sa.ForeignKeyConstraint(["id_nna"], ["NNA.id_nna"], ondelete="NO ACTION"),
        sa.ForeignKeyConstraint(["id_familiar"], ["Familiar.id_familiar"], ondelete="NO ACTION"),
    )
