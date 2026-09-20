"""Pruebas de la cadena de migraciones de Alembic y del esquema resultante.

**Hallazgo principal**: la cadena de migraciones **no es reproducible desde una
base vacia**. ``0b733fafb9a6_initial.py`` ejecuta
``SQLModel.metadata.create_all(...)``, que crea el esquema *actual* (incluida la
tabla ``Caso`` y las columnas ``id_caso``), y a continuacion
``3f2e134a5977_caso_grouping.py`` intenta ``op.create_table('Caso', ...)`` y
falla con ``DuplicateTable``. Las dos pruebas de reproducibilidad estan marcadas
``xfail(strict=True)``: si alguien arregla las migraciones, empezaran a fallar
(y eso es la senal buscada).

Las demas pruebas comprueban que el esquema del que depende la aplicacion si
esta completo, comparandolo con ``SQLModel.metadata``.
"""

from __future__ import annotations

import re
from pathlib import Path

import psycopg2
import pytest
from sqlalchemy import create_engine, inspect
from sqlmodel import SQLModel

import app.models  # noqa: F401  (registra las tablas)
from app.core.config import settings

BACKEND_ROOT = Path(__file__).resolve().parent.parent
VERSIONS_DIR = BACKEND_ROOT / "migrations" / "versions"

REVISION_INICIAL = "0b733fafb9a6"
REVISION_CASO_GROUPING = "3f2e134a5977"
REVISION_HEAD = "bbf68836b0d8"

TABLAS_AGRUPADAS = (
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
)

SCRATCH_DB = "sw_mejor_ninez_migtest"


# ── Helpers sincronos (Alembic y psycopg2 no son async) ──────────────────────


def _url_sync(dbname: str) -> str:
    return (
        f"postgresql+psycopg2://{settings.DB_USER}:{settings.DB_PASSWORD}"
        f"@{settings.DB_HOST}:{settings.DB_PORT}/{dbname}"
    )


def _conectar_admin():
    conn = psycopg2.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        dbname="postgres",
    )
    # DROP DATABASE no puede correr dentro de un bloque de transaccion.
    conn.autocommit = True
    return conn


def _recrear_scratch() -> None:
    assert SCRATCH_DB.endswith("_migtest")
    conn = _conectar_admin()
    try:
        with conn.cursor() as cur:
            cur.execute(f'DROP DATABASE IF EXISTS "{SCRATCH_DB}" WITH (FORCE)')
            cur.execute(f'CREATE DATABASE "{SCRATCH_DB}"')
    finally:
        conn.close()


def _ejecutar_alembic(comando: str) -> None:
    """Ejecuta ``upgrade head`` o ``downgrade base`` sobre la base scratch.

    ``migrations/env.py`` calcula la URL desde ``settings.database_url_sync``,
    asi que hay que redirigir ``settings.DB_NAME`` mientras corre Alembic.
    """
    from alembic import command as alembic_command
    from alembic.config import Config

    original = settings.DB_NAME
    settings.DB_NAME = SCRATCH_DB
    try:
        cfg = Config(str(BACKEND_ROOT / "alembic.ini"))
        cfg.set_main_option("script_location", str(BACKEND_ROOT / "migrations"))
        cfg.set_main_option("sqlalchemy.url", settings.database_url_sync)
        if comando == "upgrade":
            alembic_command.upgrade(cfg, "head")
        else:
            alembic_command.downgrade(cfg, "base")
    finally:
        settings.DB_NAME = original


def _tablas_de(dbname: str) -> set[str]:
    engine = create_engine(_url_sync(dbname))
    try:
        return set(inspect(engine).get_table_names())
    finally:
        engine.dispose()


def _limpiar_scratch() -> None:
    conn = _conectar_admin()
    try:
        with conn.cursor() as cur:
            cur.execute(f'DROP DATABASE IF EXISTS "{SCRATCH_DB}" WITH (FORCE)')
    finally:
        conn.close()


@pytest.fixture
def scratch():
    _recrear_scratch()
    try:
        yield SCRATCH_DB
    finally:
        _limpiar_scratch()


# ── Estructura de los archivos de migracion (no toca la base) ────────────────


def _leer_revisiones() -> dict[str, dict]:
    """Extrae ``revision`` y ``down_revision`` de cada archivo de version."""
    revisiones = {}
    for path in sorted(VERSIONS_DIR.glob("*.py")):
        contenido = path.read_text(encoding="utf-8")
        revision = re.search(r"^revision:\s*str\s*=\s*['\"]([^'\"]+)['\"]", contenido, re.M)
        down = re.search(
            r"^down_revision:\s*Union\[str,\s*None\]\s*=\s*(?:['\"]([^'\"]+)['\"]|None)",
            contenido,
            re.M,
        )
        if revision:
            revisiones[revision.group(1)] = {
                "archivo": path.name,
                "down_revision": down.group(1) if down and down.group(1) else None,
                "contenido": contenido,
            }
    return revisiones


def test_hay_exactamente_tres_migraciones():
    assert len(list(VERSIONS_DIR.glob("*.py"))) == 3


def test_la_cadena_de_migraciones_es_lineal_y_termina_en_el_head_esperado():
    revisiones = _leer_revisiones()
    assert set(revisiones) == {REVISION_INICIAL, REVISION_CASO_GROUPING, REVISION_HEAD}

    assert revisiones[REVISION_INICIAL]["down_revision"] is None
    assert revisiones[REVISION_CASO_GROUPING]["down_revision"] == REVISION_INICIAL
    assert revisiones[REVISION_HEAD]["down_revision"] == REVISION_CASO_GROUPING

    # El head es el unico que nadie referencia como down_revision.
    referenciadas = {r["down_revision"] for r in revisiones.values() if r["down_revision"]}
    assert set(revisiones) - referenciadas == {REVISION_HEAD}


def test_la_migracion_de_agrupacion_lista_las_diez_tablas():
    contenido = _leer_revisiones()[REVISION_CASO_GROUPING]["contenido"]
    for tabla in TABLAS_AGRUPADAS:
        assert f'"{tabla}"' in contenido, tabla


def test_la_migracion_de_endurecimiento_lista_las_diez_fks_compuestas():
    contenido = _leer_revisiones()[REVISION_HEAD]["contenido"]
    for tabla in TABLAS_AGRUPADAS:
        assert f"fk_{tabla}_nna_caso" in contenido, tabla


def test_los_nombres_de_tabla_de_las_migraciones_existen_en_los_modelos():
    """Ninguna migracion menciona una tabla que ya no exista en los modelos."""
    tablas_modelo = set(SQLModel.metadata.tables)
    for revision in _leer_revisiones().values():
        for tabla in TABLAS_AGRUPADAS:
            if tabla in revision["contenido"]:
                assert tabla in tablas_modelo, tabla


# ── Reproducibilidad de la cadena (defecto conocido) ─────────────────────────


@pytest.mark.slow
@pytest.mark.xfail(
    strict=True,
    reason=(
        "Defecto conocido: 0b733fafb9a6 usa SQLModel.metadata.create_all (esquema "
        "ACTUAL) y 3f2e134a5977 vuelve a crear la tabla Caso -> DuplicateTable. "
        "Un despliegue nuevo con el volumen vacio no puede migrar."
    ),
)
def test_upgrade_head_construye_el_esquema_desde_una_base_vacia(scratch: str):
    _ejecutar_alembic("upgrade")

    tablas = _tablas_de(scratch)
    assert "alembic_version" in tablas
    assert set(SQLModel.metadata.tables) <= tablas


@pytest.mark.slow
@pytest.mark.xfail(
    strict=True,
    reason=(
        "Defecto conocido: mismo origen que el upgrade. El downgrade de "
        "3f2e134a5977 intenta borrar restricciones 'fk_<tabla>_id_caso' que el "
        "create_all de la migracion inicial nunca creo."
    ),
)
def test_downgrade_base_no_deja_tablas_de_la_aplicacion(scratch: str):
    _ejecutar_alembic("upgrade")
    _ejecutar_alembic("downgrade")

    tablas = _tablas_de(scratch)
    assert not (set(SQLModel.metadata.tables) & tablas)


@pytest.mark.slow
def test_el_upgrade_desde_cero_falla_en_la_migracion_de_agrupacion(scratch: str):
    """Documenta el punto exacto del fallo, para que el arreglo sea dirigido."""
    from sqlalchemy.exc import ProgrammingError

    with pytest.raises(ProgrammingError) as exc:
        _ejecutar_alembic("upgrade")

    assert "Caso" in str(exc.value)
    assert "already exists" in str(exc.value)


@pytest.mark.slow
def test_el_fallo_del_upgrade_no_deja_estado_parcial(scratch: str):
    """PostgreSQL aplica DDL transaccional: el fallo revierte todo el upgrade.

    La base scratch queda vacia, sin tablas ni ``alembic_version``. Es un
    consuelo: un despliegue nuevo falla ruidosamente al arrancar (entrypoint.sh
    usa ``set -e``), pero no deja la base a medias.
    """
    from sqlalchemy.exc import ProgrammingError

    with pytest.raises(ProgrammingError):
        _ejecutar_alembic("upgrade")

    tablas = _tablas_de(scratch)
    assert tablas == set(), f"quedaron tablas tras el fallo: {tablas}"


# ── Paridad entre los modelos y el esquema de pruebas ────────────────────────


def _db_de_pruebas() -> str:
    """La base que crea ``conftest`` a partir de ``SQLModel.metadata``."""
    assert settings.DB_NAME.endswith("_test")
    return settings.DB_NAME


def test_todas_las_tablas_de_los_modelos_existen_en_el_esquema():
    tablas = _tablas_de(_db_de_pruebas())
    faltantes = set(SQLModel.metadata.tables) - tablas
    assert not faltantes, f"tablas declaradas en los modelos y ausentes en la base: {faltantes}"


def test_no_hay_tablas_de_aplicacion_de_mas():
    """La base de pruebas se construye con ``create_all``, asi que es exacta."""
    inspector_tablas = _tablas_de(_db_de_pruebas())
    assert inspector_tablas == set(SQLModel.metadata.tables)


def test_todas_las_columnas_de_los_modelos_existen():
    engine = create_engine(_url_sync(_db_de_pruebas()))
    try:
        inspector = inspect(engine)
        for nombre, tabla in SQLModel.metadata.tables.items():
            columnas_db = {c["name"] for c in inspector.get_columns(nombre)}
            faltantes = {c.name for c in tabla.columns} - columnas_db
            assert not faltantes, f"{nombre}: columnas ausentes {faltantes}"
    finally:
        engine.dispose()


def test_las_tablas_agrupadas_tienen_id_caso_no_nulo():
    """El esquema de pruebas replica el endurecimiento de ``bbf68836b0d8``."""
    engine = create_engine(_url_sync(_db_de_pruebas()))
    try:
        inspector = inspect(engine)
        for tabla in TABLAS_AGRUPADAS:
            columnas = {c["name"]: c for c in inspector.get_columns(tabla)}
            assert "id_caso" in columnas, tabla
            assert columnas["id_caso"]["nullable"] is False, tabla
    finally:
        engine.dispose()


@pytest.mark.characterization
def test_los_modelos_declaran_id_caso_como_opcional_y_la_base_lo_exige():
    """Deriva conocida entre modelos y migraciones.

    Los 10 modelos agrupados declaran ``id_caso: Optional[uuid.UUID] = None``,
    asi que ``SQLModel.metadata`` lo describe como *nullable*. El ``NOT NULL``
    real solo existe porque ``bbf68836b0d8`` lo impone con un ``ALTER TABLE``.

    Consecuencias:
    - la migracion inicial (``create_all``) genera un esquema mas permisivo que
      el head, y por eso ``tests/conftest.py`` repite el ``ALTER TABLE`` al
      construir la base de pruebas;
    - un ``alembic revision --autogenerate`` propondria *quitar* el ``NOT NULL``.
    """
    for tabla in TABLAS_AGRUPADAS:
        columna = SQLModel.metadata.tables[tabla].columns["id_caso"]
        assert columna.nullable is True, tabla

    engine = create_engine(_url_sync(_db_de_pruebas()))
    try:
        inspector = inspect(engine)
        for tabla in TABLAS_AGRUPADAS:
            columnas = {c["name"]: c for c in inspector.get_columns(tabla)}
            assert columnas["id_caso"]["nullable"] is False, tabla
    finally:
        engine.dispose()


def test_las_tablas_agrupadas_tienen_la_fk_compuesta_contra_caso():
    engine = create_engine(_url_sync(_db_de_pruebas()))
    try:
        inspector = inspect(engine)
        for tabla in TABLAS_AGRUPADAS:
            fks = inspector.get_foreign_keys(tabla)
            compuestas = [
                fk
                for fk in fks
                if fk["referred_table"] == "Caso"
                and set(fk["constrained_columns"]) == {"id_nna", "id_caso"}
            ]
            assert compuestas, f"{tabla} no tiene FK compuesta (id_nna, id_caso) -> Caso"
    finally:
        engine.dispose()


def test_existe_el_indice_parcial_de_un_solo_caso_activo_por_nna():
    engine = create_engine(_url_sync(_db_de_pruebas()))
    try:
        indices = inspect(engine).get_indexes("Caso")
    finally:
        engine.dispose()

    activo = next((i for i in indices if i["name"] == "uq_caso_activo_por_nna"), None)
    assert activo is not None, f"indices encontrados: {[i['name'] for i in indices]}"
    assert activo["unique"] is True
    assert activo["column_names"] == ["id_nna"]


def test_la_tabla_caso_tiene_las_restricciones_de_unicidad():
    engine = create_engine(_url_sync(_db_de_pruebas()))
    try:
        inspector = inspect(engine)
        uniques = {u["name"] for u in inspector.get_unique_constraints("Caso")}
        checks = {c["name"] for c in inspector.get_check_constraints("Caso")}
    finally:
        engine.dispose()

    assert "uq_caso_nna_caso" in uniques
    assert "chk_estado_caso" in checks


def test_despeje_es_unico_por_nna_y_caso():
    engine = create_engine(_url_sync(_db_de_pruebas()))
    try:
        uniques = {u["name"] for u in inspect(engine).get_unique_constraints("ProcesoDespejeFamiliar")}
    finally:
        engine.dispose()

    assert "uq_despeje_nna_caso" in uniques
    assert "ProcesoDespejeFamiliar_id_nna_key" not in uniques


def test_las_tablas_hijas_de_instrumentos_tienen_su_unique():
    engine = create_engine(_url_sync(_db_de_pruebas()))
    try:
        inspector = inspect(engine)
        e2p = {u["name"] for u in inspector.get_unique_constraints("RespuestaE2P")}
        ncfas = {u["name"] for u in inspector.get_unique_constraints("RespuestaNCFAS")}
        vinculo = {u["name"] for u in inspector.get_unique_constraints("VinculoNNA")}
    finally:
        engine.dispose()

    assert ncfas == {"uq_respuesta_ncfas_item_momento"}
    assert vinculo == {"VinculoNNA_id_nna_1_id_nna_2_key"}
    # El unique de RespuestaE2P es anonimo (no se le dio nombre).
    assert len(e2p) == 1


def test_los_instrumentos_cascada_declaran_ondelete():
    """PMF y NCFAS si tienen CASCADE; E2P no (pendiente conocido del proyecto)."""
    respuestas_ncfas = SQLModel.metadata.tables["RespuestaNCFAS"]
    comentarios = SQLModel.metadata.tables["ComentarioDimensionNCFAS"]
    respuestas_pmf = SQLModel.metadata.tables["RespuestaPMF"]
    respuestas_e2p = SQLModel.metadata.tables["RespuestaE2P"]

    def ondelete(tabla, columna: str) -> str | None:
        fk = next(iter(tabla.columns[columna].foreign_keys))
        return fk.ondelete

    assert ondelete(respuestas_ncfas, "id_ncfas") == "CASCADE"
    assert ondelete(comentarios, "id_ncfas") == "CASCADE"
    assert ondelete(respuestas_pmf, "id_pmf") == "CASCADE"
    # Pendiente: sin ondelete, la FK bloquea cualquier borrado de E2P.
    assert ondelete(respuestas_e2p, "id_e2p") is None
