"""Pruebas de la cadena de migraciones de Alembic y del esquema resultante.

La cadena es **reproducible desde una base vacia**: ``0b733fafb9a6`` crea el
esquema previo a la agrupacion por caso como DDL congelado (antes usaba
``SQLModel.metadata.create_all``, que construia el esquema *actual* y hacia
fallar a ``3f2e134a5977`` con ``DuplicateTable``), y las dos migraciones
siguientes le agregan ``Caso`` y las columnas ``id_caso``. Eso es lo que hace
posible un despliegue nuevo y la restauracion de un ``pg_dump`` en una base
limpia.

Las demas pruebas comprueban que el esquema del que depende la aplicacion esta
completo, comparandolo con ``SQLModel.metadata``: tanto el que construye la
cadena como el que construye ``conftest`` con ``create_all``.
"""

from __future__ import annotations

import re
from pathlib import Path

import psycopg2
import pytest
from sqlalchemy import (
    CheckConstraint,
    ForeignKeyConstraint,
    UniqueConstraint,
    create_engine,
    inspect,
)
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


def _ejecutar_alembic(accion: str, destino: str) -> None:
    """Ejecuta ``upgrade``/``downgrade`` hasta ``destino`` sobre la base scratch.

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
        if accion == "upgrade":
            alembic_command.upgrade(cfg, destino)
        else:
            alembic_command.downgrade(cfg, destino)
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


# ── Reproducibilidad de la cadena ────────────────────────────────────────────


@pytest.mark.slow
def test_upgrade_head_construye_el_esquema_desde_una_base_vacia(scratch: str):
    _ejecutar_alembic("upgrade", "head")

    tablas = _tablas_de(scratch)
    assert "alembic_version" in tablas
    assert set(SQLModel.metadata.tables) <= tablas


@pytest.mark.slow
def test_downgrade_base_no_deja_tablas_de_la_aplicacion(scratch: str):
    _ejecutar_alembic("upgrade", "head")
    _ejecutar_alembic("downgrade", "base")

    tablas = _tablas_de(scratch)
    assert not (set(SQLModel.metadata.tables) & tablas)


@pytest.mark.slow
def test_la_migracion_inicial_crea_el_esquema_previo_a_la_agrupacion(scratch: str):
    """Fija el contrato de la migracion inicial: el mundo *antes* de ``Caso``.

    Es lo que la distingue de un ``create_all`` del esquema actual. Si la inicial
    volviera a crear ``Caso`` y las columnas ``id_caso``, la migracion de
    agrupacion fallaria otra vez y con ella todo despliegue nuevo.
    """
    _ejecutar_alembic("upgrade", REVISION_INICIAL)

    engine = create_engine(_url_sync(scratch))
    try:
        inspector = inspect(engine)
        assert "Caso" not in set(inspector.get_table_names())

        for tabla in TABLAS_AGRUPADAS:
            columnas = {c["name"] for c in inspector.get_columns(tabla)}
            assert "id_caso" not in columnas, tabla

        # El unique historico que bbf68836b0d8 reemplaza por uq_despeje_nna_caso.
        uniques = {
            u["name"]
            for u in inspector.get_unique_constraints("ProcesoDespejeFamiliar")
        }
        assert "ProcesoDespejeFamiliar_id_nna_key" in uniques
    finally:
        engine.dispose()


@pytest.mark.slow
def test_el_ciclo_upgrade_downgrade_upgrade_es_estable(scratch: str):
    """Ida y vuelta completa: la cadena se deshace y se rehace sin residuos."""
    _ejecutar_alembic("upgrade", "head")
    _ejecutar_alembic("downgrade", "base")
    assert not (set(SQLModel.metadata.tables) & _tablas_de(scratch))

    _ejecutar_alembic("upgrade", "head")
    assert set(SQLModel.metadata.tables) <= _tablas_de(scratch)


@pytest.mark.slow
def test_el_esquema_construido_por_la_cadena_coincide_con_los_modelos(scratch: str):
    """Paridad fina entre lo que construye la cadena y lo que declaran los modelos.

    No basta con que esten las tablas: la migracion inicial es DDL congelado, asi
    que esta es la prueba que avisa si se desincroniza de los modelos. Compara
    columnas, nulabilidad, PKs, FKs (por columnas locales) y las restricciones
    con nombre.

    Las restricciones que el modelo deja sin nombre no se comparan por nombre:
    PostgreSQL les inventa uno al crearlas. Por eso se exige que las nombradas
    esten, y no que los conjuntos de nombres sean iguales.
    """
    _ejecutar_alembic("upgrade", "head")

    engine = create_engine(_url_sync(scratch))
    try:
        inspector = inspect(engine)
        for nombre, tabla in SQLModel.metadata.tables.items():
            cols_db = {c["name"]: c for c in inspector.get_columns(nombre)}

            assert {c.name for c in tabla.columns} == set(cols_db), (
                f"{nombre}: columnas distintas entre modelo y cadena"
            )

            for col in tabla.columns:
                if col.name == "id_caso":
                    # Deriva conocida B2: el modelo lo declara Optional y la base
                    # lo exige NOT NULL (lo impone bbf68836b0d8).
                    assert cols_db["id_caso"]["nullable"] is False, nombre
                    continue
                assert bool(col.nullable) == bool(cols_db[col.name]["nullable"]), (
                    f"{nombre}.{col.name}: nullable modelo={col.nullable} "
                    f"cadena={cols_db[col.name]['nullable']}"
                )

            assert [c.name for c in tabla.primary_key.columns] == inspector.get_pk_constraint(
                nombre
            )["constrained_columns"], f"{nombre}: PK distinta"

            esperadas = {
                tuple(sorted(c.name for c in con.columns))
                for con in tabla.constraints
                if isinstance(con, ForeignKeyConstraint)
            }
            reales = {
                tuple(sorted(f["constrained_columns"]))
                for f in inspector.get_foreign_keys(nombre)
            }
            assert esperadas == reales, f"{nombre}: FKs distintas"

            nombres_db = {
                u["name"] for u in inspector.get_unique_constraints(nombre)
            } | {c["name"] for c in inspector.get_check_constraints(nombre)}
            for con in tabla.constraints:
                if con.name and isinstance(con, (UniqueConstraint, CheckConstraint)):
                    assert con.name in nombres_db, f"{nombre}: falta {con.name}"
    finally:
        engine.dispose()


@pytest.mark.slow
def test_alembic_no_detecta_deriva_entre_los_modelos_y_el_esquema_migrado(scratch: str):
    """``--autogenerate`` no propondria ningun cambio sobre una base migrada.

    Es la prueba que fija el impacto del defecto B2. Los 10 modelos agrupados
    declaraban ``id_caso`` como ``Optional`` —*nullable* en la metadata— mientras
    la base lo exigia ``NOT NULL``, asi que ``--autogenerate`` proponia
    ``ALTER COLUMN id_caso DROP NOT NULL``: revertir el endurecimiento de
    ``bbf68836b0d8`` sin que nadie lo notara. Medido antes del arreglo: 10
    entradas, todas ``modify_nullable`` sobre ``id_caso``.

    Se compara la metadata contra el esquema que produce la **cadena de
    migraciones**, no el de ``create_all``: es el unico que representa lo que
    hay en produccion.
    """
    from alembic.autogenerate import compare_metadata
    from alembic.migration import MigrationContext

    _ejecutar_alembic("upgrade", "head")

    engine = create_engine(_url_sync(scratch))
    try:
        with engine.connect() as conn:
            contexto = MigrationContext.configure(conn)
            deriva = compare_metadata(contexto, SQLModel.metadata)
    finally:
        engine.dispose()

    assert deriva == [], (
        f"--autogenerate propondria {len(deriva)} cambio(s): {deriva}"
    )


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
    """El esquema de pruebas, hecho con ``create_all``, es tan estricto como el migrado.

    La base de pruebas ya no necesita replicar el endurecimiento a mano: los
    modelos lo declaran, asi que ``create_all`` lo produce. Que la cadena de
    migraciones haga lo mismo lo cubre
    ``test_el_esquema_construido_por_la_cadena_coincide_con_los_modelos``.
    """
    engine = create_engine(_url_sync(_db_de_pruebas()))
    try:
        inspector = inspect(engine)
        for tabla in TABLAS_AGRUPADAS:
            columnas = {c["name"]: c for c in inspector.get_columns(tabla)}
            assert "id_caso" in columnas, tabla
            assert columnas["id_caso"]["nullable"] is False, tabla
    finally:
        engine.dispose()


def test_los_modelos_declaran_id_caso_no_nulo():
    """Los modelos dicen lo mismo que la base (antes no: defecto B2).

    Los 10 modelos agrupados declaraban ``id_caso: Optional[uuid.UUID] = None``,
    que en ``SQLModel.metadata`` es *nullable*, mientras la base lo exigia
    ``NOT NULL``. Ahora lo declaran con ``sa_column_kwargs={"nullable": False}``.

    La anotacion sigue siendo ``Optional`` a proposito: el registro se arma en
    memoria sin caso y se sella antes del INSERT (``create_nna_child`` y el
    ``before_flush`` del seed), asi que en memoria si puede ser ``None``. Lo que
    no puede es llegar ``NULL`` a la base.
    """
    for tabla in TABLAS_AGRUPADAS:
        columna = SQLModel.metadata.tables[tabla].columns["id_caso"]
        assert columna.nullable is False, f"{tabla}: el modelo lo declara nullable"


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
