"""schema_reference_alignment

Revision ID: 1bf65e3da946
Revises: 6ee297be7960
Create Date: 2026-06-05 16:44:59.222778

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '1bf65e3da946'
down_revision: Union[str, None] = '6ee297be7960'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── New tables ────────────────────────────────────────────────────────
    op.create_table('CentroSalud',
        sa.Column('id_centro_salud', sa.UUID(), nullable=False),
        sa.Column('nombre', sa.Text(), nullable=True),
        sa.Column('tipo_recinto', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id_centro_salud'),
    )
    op.create_table('EstablecimientoEducacional',
        sa.Column('id_establecimiento_educacional', sa.UUID(), nullable=False),
        sa.Column('nombre', sa.Text(), nullable=True),
        sa.Column('rbd', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id_establecimiento_educacional'),
    )
    op.create_table('SolicitanteIngreso',
        sa.Column('id_solicitante_ingreso', sa.UUID(), nullable=False),
        sa.Column('nombre', sa.Text(), nullable=True),
        sa.Column('categoria', sa.Text(), nullable=True),
        sa.Column('ano_proyecto', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id_solicitante_ingreso'),
    )
    op.create_table('VinculoNNA',
        sa.Column('id_nna_1', sa.UUID(), nullable=False),
        sa.Column('id_nna_2', sa.UUID(), nullable=False),
        sa.Column('parentesco', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['id_nna_1'], ['NNA.id_nna']),
        sa.ForeignKeyConstraint(['id_nna_2'], ['NNA.id_nna']),
        sa.PrimaryKeyConstraint('id_nna_1', 'id_nna_2'),
    )
    op.create_table('RegistroGrupoFamiliar',
        sa.Column('id_familiar', sa.UUID(), nullable=False),
        sa.Column('id_antecedente_familiar', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['id_antecedente_familiar'], ['AntecedenteFamiliar.id_antecedente_familiar']),
        sa.ForeignKeyConstraint(['id_familiar'], ['Familiar.id_familiar']),
        sa.PrimaryKeyConstraint('id_familiar', 'id_antecedente_familiar'),
    )

    # ── PK column renames (RENAME COLUMN preserves data) ────────────────
    op.execute('ALTER TABLE "AntecedentesPenales" RENAME COLUMN id_antecedentes_penales TO id_antecedente_penal')
    op.execute('ALTER TABLE "DiscapacidadAdulto" RENAME COLUMN id_discapacidad TO id_discapacidad_adulto')
    op.execute('ALTER TABLE "DiscapacidadNNA" RENAME COLUMN id_discapacidad TO id_discapacidad_nna')
    op.execute('ALTER TABLE "E2P" RENAME COLUMN id_instrumento TO id_e2p')
    op.execute('ALTER TABLE "HistorialConsumoAdulto" RENAME COLUMN id_historial_consumo TO id_historial_consumo_adulto')
    op.execute('ALTER TABLE "HistorialConsumoNNA" RENAME COLUMN id_historial_consumo TO id_historial_consumo_nna')
    op.execute('ALTER TABLE "NCFAS" RENAME COLUMN id_instrumento TO id_ncfas')
    op.execute('ALTER TABLE "PMF" RENAME COLUMN id_instrumento TO id_pmf')

    # ── Drop stale E2P.respuestas column if it still exists ──────────────
    op.execute("DO $$ BEGIN ALTER TABLE \"E2P\" DROP COLUMN IF EXISTS respuestas; EXCEPTION WHEN undefined_column THEN NULL; END $$")

    # ── AntecedenteEscolar ───────────────────────────────────────────────
    op.add_column('AntecedenteEscolar', sa.Column('id_establecimiento_educacional', sa.UUID(), nullable=True))
    op.execute('ALTER TABLE "AntecedenteEscolar" RENAME COLUMN ultimo_ano_curso TO ultimo_ano_cursado')
    op.create_foreign_key(None, 'AntecedenteEscolar', 'EstablecimientoEducacional',
        ['id_establecimiento_educacional'], ['id_establecimiento_educacional'])
    op.drop_column('AntecedenteEscolar', 'establecimiento')

    # ── AntecedenteFamiliar ──────────────────────────────────────────────
    op.add_column('AntecedenteFamiliar', sa.Column('id_adulto_responsable', sa.UUID(), nullable=True))
    op.add_column('AntecedenteFamiliar', sa.Column('con_quien_vive', sa.Text(), nullable=True))
    op.add_column('AntecedenteFamiliar', sa.Column('con_quien_vive_detalle', sa.Text(), nullable=True))
    op.create_foreign_key(None, 'AntecedenteFamiliar', 'Familiar',
        ['id_adulto_responsable'], ['id_familiar'])

    # ── AntecedenteIngreso ───────────────────────────────────────────────
    op.add_column('AntecedenteIngreso', sa.Column('id_solicitante_ingreso', sa.UUID(), nullable=True))
    op.create_foreign_key(None, 'AntecedenteIngreso', 'SolicitanteIngreso',
        ['id_solicitante_ingreso'], ['id_solicitante_ingreso'])
    op.drop_column('AntecedenteIngreso', 'quien_solicita_ingreso')

    # ── AntecedenteSalud ─────────────────────────────────────────────────
    op.add_column('AntecedenteSalud', sa.Column('id_centro_salud', sa.UUID(), nullable=True))
    op.execute('ALTER TABLE "AntecedenteSalud" RENAME COLUMN inscrito_en_consultorio TO inscrito_en_centro_salud')
    op.create_foreign_key(None, 'AntecedenteSalud', 'CentroSalud',
        ['id_centro_salud'], ['id_centro_salud'])
    op.drop_column('AntecedenteSalud', 'establecimiento')

    # ── AntecedentesPenales url_documento_adjunto ────────────────────────
    op.add_column('AntecedentesPenales', sa.Column('url_documento_adjunto', sa.Text(), nullable=True))

    # ── NNA id_sis ──────────────────────────────────────────────────────
    op.add_column('NNA', sa.Column('id_sis', sa.Text(), nullable=True))
    op.create_unique_constraint(None, 'NNA', ['id_sis'])

    # ── VinculoFamiliar restructuring ────────────────────────────────────
    op.add_column('VinculoFamiliar', sa.Column('id_nna', sa.UUID(), nullable=True))
    op.drop_constraint('VinculoFamiliar_id_antecedente_familiar_fkey', 'VinculoFamiliar', type_='foreignkey')
    op.create_foreign_key(None, 'VinculoFamiliar', 'NNA', ['id_nna'], ['id_nna'])
    op.drop_column('VinculoFamiliar', 'id_antecedente_familiar')
    op.drop_column('VinculoFamiliar', 'es_adulto_responsable')

    # ── Re-point RespuestaE2P FK to new E2P PK name ─────────────────────
    op.drop_constraint('RespuestaE2P_id_instrumento_fkey', 'RespuestaE2P', type_='foreignkey')
    op.create_foreign_key(None, 'RespuestaE2P', 'E2P', ['id_instrumento'], ['id_e2p'])

    # ── Re-point PuntajeE2P FK to new E2P PK name ───────────────────────
    op.drop_constraint('PuntajeE2P_id_instrumento_fkey', 'PuntajeE2P', type_='foreignkey')
    op.create_foreign_key(None, 'PuntajeE2P', 'E2P', ['id_instrumento'], ['id_e2p'])


def downgrade() -> None:
    # ── Revert FKs ──────────────────────────────────────────────────────
    op.drop_constraint(None, 'PuntajeE2P', type_='foreignkey')
    op.create_foreign_key('PuntajeE2P_id_instrumento_fkey', 'PuntajeE2P', 'E2P',
        ['id_instrumento'], ['id_instrumento'])
    op.drop_constraint(None, 'RespuestaE2P', type_='foreignkey')
    op.create_foreign_key('RespuestaE2P_id_instrumento_fkey', 'RespuestaE2P', 'E2P',
        ['id_instrumento'], ['id_instrumento'])

    # ── VinculoFamiliar revert ──────────────────────────────────────────
    op.alter_column('VinculoFamiliar', 'id_nna', nullable=True)
    op.add_column('VinculoFamiliar', sa.Column('es_adulto_responsable', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('VinculoFamiliar', sa.Column('id_antecedente_familiar', sa.UUID(), nullable=True))
    op.drop_constraint(None, 'VinculoFamiliar', type_='foreignkey')
    op.create_foreign_key('VinculoFamiliar_id_antecedente_familiar_fkey', 'VinculoFamiliar',
        'AntecedenteFamiliar', ['id_antecedente_familiar'], ['id_antecedente_familiar'])
    op.drop_column('VinculoFamiliar', 'id_nna')

    # ── NNA id_sis ──────────────────────────────────────────────────────
    op.drop_constraint(None, 'NNA', type_='unique')
    op.drop_column('NNA', 'id_sis')

    # ── AntecedentesPenales revert ──────────────────────────────────────
    op.drop_column('AntecedentesPenales', 'url_documento_adjunto')

    # ── AntecedenteSalud revert ─────────────────────────────────────────
    op.add_column('AntecedenteSalud', sa.Column('establecimiento', sa.Text(), nullable=True))
    op.drop_constraint(None, 'AntecedenteSalud', type_='foreignkey')
    op.execute('ALTER TABLE "AntecedenteSalud" RENAME COLUMN inscrito_en_centro_salud TO inscrito_en_consultorio')
    op.drop_column('AntecedenteSalud', 'id_centro_salud')

    # ── AntecedenteIngreso revert ───────────────────────────────────────
    op.add_column('AntecedenteIngreso', sa.Column('quien_solicita_ingreso', sa.Text(), nullable=True))
    op.drop_constraint(None, 'AntecedenteIngreso', type_='foreignkey')
    op.drop_column('AntecedenteIngreso', 'id_solicitante_ingreso')

    # ── AntecedenteFamiliar revert ──────────────────────────────────────
    op.drop_constraint(None, 'AntecedenteFamiliar', type_='foreignkey')
    op.drop_column('AntecedenteFamiliar', 'con_quien_vive_detalle')
    op.drop_column('AntecedenteFamiliar', 'con_quien_vive')
    op.drop_column('AntecedenteFamiliar', 'id_adulto_responsable')

    # ── AntecedenteEscolar revert ───────────────────────────────────────
    op.add_column('AntecedenteEscolar', sa.Column('establecimiento', sa.Text(), nullable=True))
    op.drop_constraint(None, 'AntecedenteEscolar', type_='foreignkey')
    op.execute('ALTER TABLE "AntecedenteEscolar" RENAME COLUMN ultimo_ano_cursado TO ultimo_ano_curso')
    op.drop_column('AntecedenteEscolar', 'id_establecimiento_educacional')

    # ── PK renames revert ───────────────────────────────────────────────
    op.execute('ALTER TABLE "PMF" RENAME COLUMN id_pmf TO id_instrumento')
    op.execute('ALTER TABLE "NCFAS" RENAME COLUMN id_ncfas TO id_instrumento')
    op.execute('ALTER TABLE "HistorialConsumoNNA" RENAME COLUMN id_historial_consumo_nna TO id_historial_consumo')
    op.execute('ALTER TABLE "HistorialConsumoAdulto" RENAME COLUMN id_historial_consumo_adulto TO id_historial_consumo')
    op.execute('ALTER TABLE "E2P" RENAME COLUMN id_e2p TO id_instrumento')
    op.execute('ALTER TABLE "DiscapacidadNNA" RENAME COLUMN id_discapacidad_nna TO id_discapacidad')
    op.execute('ALTER TABLE "DiscapacidadAdulto" RENAME COLUMN id_discapacidad_adulto TO id_discapacidad')
    op.execute('ALTER TABLE "AntecedentesPenales" RENAME COLUMN id_antecedente_penal TO id_antecedentes_penales')

    # ── Drop new tables ─────────────────────────────────────────────────
    op.drop_table('RegistroGrupoFamiliar')
    op.drop_table('VinculoNNA')
    op.drop_table('SolicitanteIngreso')
    op.drop_table('EstablecimientoEducacional')
    op.drop_table('CentroSalud')
