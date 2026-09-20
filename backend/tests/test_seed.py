"""Pruebas de ``seed.py`` sobre una base scratch.

``seed()`` usa el ``async_session`` global de ``app.core.database``, que se
construye al importar el modulo a partir de ``Settings``. Para sembrar una base
distinta se reemplaza ese ``async_session`` por uno apuntando a la scratch: es
la unica costura necesaria y deja el codigo de produccion intacto.
"""

from __future__ import annotations

import asyncio
from pathlib import Path

import psycopg2
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from sqlmodel import SQLModel, select

import app.models  # noqa: F401  (registra las tablas)
import seed as seed_module
from app.core.config import settings
from app.core.security import verify_password
from app.models import (
    AntecedenteIngreso,
    AntecedenteSalud,
    BaremoE2P,
    Caso,
    CentroSalud,
    E2P,
    EstablecimientoEducacional,
    Familiar,
    InformeTribunal,
    ItemNCFAS,
    NCFAS,
    NNA,
    NotificacionFamiliar,
    PMF,
    PreguntaE2P,
    PreguntaPMF,
    ProcesoDespejeFamiliar,
    RespuestaE2P,
    RespuestaNCFAS,
    RespuestaPMF,
    SolicitanteIngreso,
    Usuario,
)

SCRATCH_DB = "sw_mejor_ninez_seedtest"

# Conteos exactos que produce el seed sobre una base vacia.
CONTEOS_ESPERADOS = {
    "usuarios": 1,
    "solicitantes": 5,
    "establecimientos": 3,
    "centros_salud": 3,
    "preguntas_e2p": 472,
    "baremos_e2p": 400,
    "preguntas_pmf": 114,
    "items_ncfas": 70,
    "nna": 3,
    "familiares": 5,
    "casos": 4,
    "despejes": 3,
    "notificaciones": 5,
    "e2p": 3,
    "pmf": 1,
    "ncfas": 1,
    "ingresos": 3,
    "informes": 2,
    "antecedentes_salud": 3,
}


def _url_sync(dbname: str) -> str:
    return (
        f"postgresql+psycopg2://{settings.DB_USER}:{settings.DB_PASSWORD}"
        f"@{settings.DB_HOST}:{settings.DB_PORT}/{dbname}"
    )


def _url_async(dbname: str) -> str:
    return (
        f"postgresql+asyncpg://{settings.DB_USER}:{settings.DB_PASSWORD}"
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
    conn.autocommit = True
    return conn


def _recrear_scratch() -> None:
    """Recrea la base scratch y le replica el endurecimiento de produccion.

    ``create_all`` construye el esquema a partir de los modelos, que declaran
    ``id_caso`` como ``Optional``; el ``NOT NULL`` real lo impone la ultima
    migracion (``bbf68836b0d8``). Sin repetirlo aqui la base de pruebas queda
    mas permisiva que la de produccion, y el seed pasa aunque en un despliegue
    real falle: fue justo lo que oculto que sembrar una base nueva reventara con
    ``NotNullViolationError``. Las tablas se derivan del propio esquema, para no
    mantener otra lista paralela a las de ``conftest`` y ``test_migrations``.
    """
    assert SCRATCH_DB.endswith("_seedtest")
    conn = _conectar_admin()
    try:
        with conn.cursor() as cur:
            cur.execute(f'DROP DATABASE IF EXISTS "{SCRATCH_DB}" WITH (FORCE)')
            cur.execute(f'CREATE DATABASE "{SCRATCH_DB}"')
    finally:
        conn.close()

    engine = create_engine(_url_sync(SCRATCH_DB))
    try:
        SQLModel.metadata.create_all(engine)
        agrupadas = [
            t.name for t in SQLModel.metadata.tables.values() if "id_caso" in t.columns
        ]
        with engine.begin() as conn:
            for tabla in agrupadas:
                conn.execute(
                    text(f'ALTER TABLE "{tabla}" ALTER COLUMN id_caso SET NOT NULL')
                )
    finally:
        engine.dispose()


def _limpiar_scratch() -> None:
    conn = _conectar_admin()
    try:
        with conn.cursor() as cur:
            cur.execute(f'DROP DATABASE IF EXISTS "{SCRATCH_DB}" WITH (FORCE)')
    finally:
        conn.close()


async def _contar(dbname: str = SCRATCH_DB) -> dict[str, int]:
    engine = create_async_engine(_url_async(dbname), poolclass=NullPool)
    try:
        async with AsyncSession(engine, expire_on_commit=False) as session:
            async def n(model) -> int:
                return len((await session.execute(select(model))).scalars().all())

            return {
                "usuarios": await n(Usuario),
                "solicitantes": await n(SolicitanteIngreso),
                "establecimientos": await n(EstablecimientoEducacional),
                "centros_salud": await n(CentroSalud),
                "preguntas_e2p": await n(PreguntaE2P),
                "baremos_e2p": await n(BaremoE2P),
                "preguntas_pmf": await n(PreguntaPMF),
                "items_ncfas": await n(ItemNCFAS),
                "nna": await n(NNA),
                "familiares": await n(Familiar),
                "casos": await n(Caso),
                "despejes": await n(ProcesoDespejeFamiliar),
                "notificaciones": await n(NotificacionFamiliar),
                "e2p": await n(E2P),
                "pmf": await n(PMF),
                "ncfas": await n(NCFAS),
                "ingresos": await n(AntecedenteIngreso),
                "informes": await n(InformeTribunal),
                "antecedentes_salud": await n(AntecedenteSalud),
            }
    finally:
        await engine.dispose()


def _sembrar(monkeypatch: pytest.MonkeyPatch, dbname: str = SCRATCH_DB) -> None:
    """Ejecuta ``seed.seed()`` contra la base indicada."""
    engine = create_async_engine(_url_async(dbname), poolclass=NullPool)
    maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    monkeypatch.setattr(seed_module, "async_session", maker)
    try:
        asyncio.run(seed_module.seed())
    finally:
        asyncio.run(engine.dispose())


async def _insertar_nna_vacios(cantidad: int) -> None:
    """Inserta NNA sin hijos, para probar el guard de conteo del seed."""
    engine = create_async_engine(_url_async(SCRATCH_DB), poolclass=NullPool)
    try:
        async with AsyncSession(engine, expire_on_commit=False) as session:
            for i in range(cantidad):
                session.add(NNA(nombre=f"Previo {i}", run=f"PREVIO-{i}"))
            await session.commit()
    finally:
        await engine.dispose()


@pytest.fixture
def scratch(monkeypatch: pytest.MonkeyPatch):
    _recrear_scratch()
    try:
        yield SCRATCH_DB
    finally:
        monkeypatch.undo()
        _limpiar_scratch()


# ── Primera corrida ──────────────────────────────────────────────────────────


@pytest.mark.slow
def test_el_seed_crea_la_base_de_demostracion(scratch: str, monkeypatch: pytest.MonkeyPatch):
    _sembrar(monkeypatch)
    assert asyncio.run(_contar()) == CONTEOS_ESPERADOS


@pytest.mark.slow
def test_el_seed_sella_el_caso_de_todos_los_registros_agrupados(
    scratch: str, monkeypatch: pytest.MonkeyPatch
):
    """Ningun registro agrupado queda sin carpeta, y la que tiene es la del NNA.

    La base scratch replica el ``id_caso NOT NULL`` de produccion, asi que un
    registro sin sellar romperia el seed. Esta prueba ademas exige que cada
    ``id_caso`` apunte a un caso del **mismo** NNA, que es lo que la FK compuesta
    ``(id_nna, id_caso)`` garantiza en el esquema migrado.
    """
    _sembrar(monkeypatch)

    async def revisar() -> int:
        engine = create_async_engine(_url_async(SCRATCH_DB), poolclass=NullPool)
        try:
            async with AsyncSession(engine, expire_on_commit=False) as session:
                # Primero comprobar que la base de pruebas es de verdad tan
                # estricta como la de produccion: si el endurecimiento no se
                # aplicara, esta prueba perderia todo su valor sin avisar.
                permisivas = (
                    await session.execute(
                        text(
                            "SELECT table_name FROM information_schema.columns "
                            "WHERE table_schema = 'public' AND column_name = 'id_caso' "
                            "AND is_nullable = 'YES'"
                        )
                    )
                ).scalars().all()
                assert not permisivas, f"id_caso nullable en: {sorted(permisivas)}"

                pares = {
                    (c.id_caso, c.id_nna)
                    for c in (await session.execute(select(Caso))).scalars().all()
                }
                filas = 0
                for model in seed_module.MODELOS_AGRUPADOS:
                    for row in (await session.execute(select(model))).scalars().all():
                        nombre = type(row).__name__
                        assert row.id_caso is not None, f"{nombre} sin id_caso"
                        assert (row.id_caso, row.id_nna) in pares, (
                            f"{nombre}: id_caso no pertenece al caso de su NNA"
                        )
                        filas += 1
                return filas
        finally:
            await engine.dispose()

    assert asyncio.run(revisar()) > 0


@pytest.mark.slow
def test_el_seed_crea_el_admin_por_defecto(scratch: str, monkeypatch: pytest.MonkeyPatch):
    _sembrar(monkeypatch)

    async def leer():
        engine = create_async_engine(_url_async(SCRATCH_DB), poolclass=NullPool)
        try:
            async with AsyncSession(engine, expire_on_commit=False) as session:
                return (await session.execute(select(Usuario))).scalars().first()
        finally:
            await engine.dispose()

    admin = asyncio.run(leer())
    assert admin is not None
    assert admin.email == "admin@mejorninez.cl"
    assert admin.nombre == "Administrador"
    assert admin.is_active is True
    assert admin.hashed_password != "admin123"
    assert verify_password("admin123", admin.hashed_password)


@pytest.mark.slow
def test_el_seed_deja_un_caso_activo_por_nna_y_uno_cerrado(
    scratch: str, monkeypatch: pytest.MonkeyPatch
):
    _sembrar(monkeypatch)

    async def leer():
        engine = create_async_engine(_url_async(SCRATCH_DB), poolclass=NullPool)
        try:
            async with AsyncSession(engine, expire_on_commit=False) as session:
                casos = (await session.execute(select(Caso))).scalars().all()
                nnа = (await session.execute(select(NNA))).scalars().all()
                return casos, nnа
        finally:
            await engine.dispose()

    casos, nnas = asyncio.run(leer())
    activos = [c for c in casos if c.estado == "En Progreso"]
    cerrados = [c for c in casos if c.estado == "Cerrado"]

    assert len(activos) == len(nnas) == 3
    assert len(cerrados) == 1
    # Cada NNA tiene exactamente un caso activo.
    assert sorted(c.id_nna for c in activos) == sorted(n.id_nna for n in nnas)


@pytest.mark.slow
def test_el_seed_sella_los_registros_agrupados_con_su_caso(
    scratch: str, monkeypatch: pytest.MonkeyPatch
):
    _sembrar(monkeypatch)

    async def leer():
        engine = create_async_engine(_url_async(SCRATCH_DB), poolclass=NullPool)
        try:
            async with AsyncSession(engine, expire_on_commit=False) as session:
                casos = (await session.execute(select(Caso))).scalars().all()
                caso_de = {c.id_caso: c.id_nna for c in casos}
                filas = {}
                for nombre, modelo in [
                    ("e2p", E2P),
                    ("pmf", PMF),
                    ("ncfas", NCFAS),
                    ("ingresos", AntecedenteIngreso),
                    ("informes", InformeTribunal),
                    ("salud", AntecedenteSalud),
                    ("despejes", ProcesoDespejeFamiliar),
                ]:
                    filas[nombre] = (await session.execute(select(modelo))).scalars().all()
                return caso_de, filas
        finally:
            await engine.dispose()

    caso_de, filas = asyncio.run(leer())

    for nombre, registros in filas.items():
        assert registros, f"{nombre} quedo vacio"
        for registro in registros:
            assert registro.id_caso is not None, f"{nombre} sin id_caso"
            # La FK compuesta garantiza la coherencia NNA <-> Caso.
            assert caso_de[registro.id_caso] == registro.id_nna, nombre


@pytest.mark.slow
def test_el_seed_no_crea_respuestas_de_instrumentos(
    scratch: str, monkeypatch: pytest.MonkeyPatch
):
    """Hueco conocido: los instrumentos quedan creados pero sin llenar.

    Por eso ``GET /api/e2p/{id}/puntaje`` devuelve 400 con los datos sembrados.
    """
    _sembrar(monkeypatch)

    async def contar_respuestas():
        engine = create_async_engine(_url_async(SCRATCH_DB), poolclass=NullPool)
        try:
            async with AsyncSession(engine, expire_on_commit=False) as session:
                return {
                    "e2p": len((await session.execute(select(RespuestaE2P))).scalars().all()),
                    "pmf": len((await session.execute(select(RespuestaPMF))).scalars().all()),
                    "ncfas": len((await session.execute(select(RespuestaNCFAS))).scalars().all()),
                }
        finally:
            await engine.dispose()

    assert asyncio.run(contar_respuestas()) == {"e2p": 0, "pmf": 0, "ncfas": 0}


@pytest.mark.slow
def test_los_e2p_sembrados_tienen_su_perfil_global_pero_no_puntajes(
    scratch: str, monkeypatch: pytest.MonkeyPatch
):
    _sembrar(monkeypatch)

    async def leer():
        engine = create_async_engine(_url_async(SCRATCH_DB), poolclass=NullPool)
        try:
            async with AsyncSession(engine, expire_on_commit=False) as session:
                return (await session.execute(select(E2P))).scalars().all()
        finally:
            await engine.dispose()

    e2p = asyncio.run(leer())
    assert {e.perfil_resultado_global for e in e2p} == {"Monitoreo", "Optimo", "Riesgo"}


@pytest.mark.slow
def test_el_seed_crea_el_despeje_de_cada_nna(
    scratch: str, monkeypatch: pytest.MonkeyPatch
):
    _sembrar(monkeypatch)

    async def leer():
        engine = create_async_engine(_url_async(SCRATCH_DB), poolclass=NullPool)
        try:
            async with AsyncSession(engine, expire_on_commit=False) as session:
                despejes = (await session.execute(select(ProcesoDespejeFamiliar))).scalars().all()
                notificaciones = (
                    await session.execute(select(NotificacionFamiliar))
                ).scalars().all()
                return despejes, notificaciones
        finally:
            await engine.dispose()

    despejes, notificaciones = asyncio.run(leer())
    assert {d.estado for d in despejes} == {"Cerrado Sin Red", "En Notificación", "Evaluando"}
    # Dos NNA reciben 2 notificaciones y uno recibe 1.
    por_despeje: dict = {}
    for n in notificaciones:
        por_despeje[n.id_despeje] = por_despeje.get(n.id_despeje, 0) + 1
    assert sorted(por_despeje.values()) == [1, 2, 2]


# ── Idempotencia ─────────────────────────────────────────────────────────────


@pytest.mark.slow
def test_el_seed_es_idempotente(scratch: str, monkeypatch: pytest.MonkeyPatch):
    _sembrar(monkeypatch)
    primera = asyncio.run(_contar())

    _sembrar(monkeypatch)
    segunda = asyncio.run(_contar())

    assert segunda == primera == CONTEOS_ESPERADOS


@pytest.mark.slow
def test_la_segunda_corrida_reporta_que_omite_todo(
    scratch: str, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
):
    _sembrar(monkeypatch)
    capsys.readouterr()

    _sembrar(monkeypatch)
    salida = capsys.readouterr().out

    assert "PreguntaE2P ya tiene datos — skipping static seed." in salida
    assert "PreguntaPMF ya tiene datos — skipping static seed." in salida
    assert "ItemNCFAS ya tiene datos — skipping static seed." in salida
    assert "Admin user already exists — skipping." in salida
    assert "Catalogs already seeded — skipping." in salida
    assert "Seed data already exists (3 NNA) — skipping." in salida


@pytest.mark.slow
def test_la_tercera_corrida_tampoco_duplica(
    scratch: str, monkeypatch: pytest.MonkeyPatch
):
    for _ in range(3):
        _sembrar(monkeypatch)
    assert asyncio.run(_contar()) == CONTEOS_ESPERADOS


# ── Coherencia del propio seed ───────────────────────────────────────────────


@pytest.mark.slow
@pytest.mark.characterization
def test_el_mensaje_final_del_seed_exagera_el_numero_de_notificaciones(
    scratch: str, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
):
    """El ``print`` final dice "6 notificaciones" pero el seed crea 5.

    El mensaje esta escrito a mano y se desincronizo del contenido real.
    """
    _sembrar(monkeypatch)
    salida = capsys.readouterr().out

    assert "6 notificaciones" in salida
    assert asyncio.run(_contar())["notificaciones"] == 5


@pytest.mark.slow
def test_con_menos_de_dos_nna_el_seed_si_inserta_la_demografia(
    scratch: str, monkeypatch: pytest.MonkeyPatch
):
    """El corte es ``>= 2``: con un solo NNA el seed anade los 3 de demostracion."""
    asyncio.run(_insertar_nna_vacios(1))

    _sembrar(monkeypatch)
    assert asyncio.run(_contar())["nna"] == 4


@pytest.mark.slow
def test_con_dos_o_mas_nna_el_seed_no_inserta_la_demografia(
    scratch: str, monkeypatch: pytest.MonkeyPatch
):
    asyncio.run(_insertar_nna_vacios(2))

    _sembrar(monkeypatch)
    conteo = asyncio.run(_contar())
    assert conteo["nna"] == 2
    # Los datos estaticos si se siembran aunque la demografia se omita.
    assert conteo["preguntas_e2p"] == CONTEOS_ESPERADOS["preguntas_e2p"]
    assert conteo["items_ncfas"] == CONTEOS_ESPERADOS["items_ncfas"]
    assert conteo["solicitantes"] == CONTEOS_ESPERADOS["solicitantes"]
    assert conteo["casos"] == 0


@pytest.mark.slow
def test_el_seed_usa_los_json_de_app_data(monkeypatch: pytest.MonkeyPatch):
    """Los datos estaticos vienen de ``backend/app/data/*.json``."""
    data = Path(seed_module._DATA_DIR)

    assert data.name == "data"
    assert (data / "e2p_questions.json").is_file()
    assert (data / "e2p_escala.json").is_file()
    assert (data / "pmf_afirmaciones.json").is_file()
    assert len(sorted(data.glob("ncfas_definicion_dimension_*.json"))) == 10
