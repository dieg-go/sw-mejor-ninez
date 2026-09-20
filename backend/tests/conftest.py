"""Configuracion compartida de la suite de pruebas del backend.

Diseno de aislamiento
---------------------
1. La base de datos de pruebas se fija en la variable de entorno ``DB_NAME``
   *antes* de importar cualquier modulo de ``app``, de modo que el engine
   global y ``Settings`` apunten a la base de pruebas y nunca a la de
   desarrollo.
2. Una fixture de sesion sincrona recrea esa base desde cero y construye el
   esquema a partir de ``SQLModel.metadata``.

   Nota: se usa ``create_all`` (rapido) en vez de ``alembic upgrade head`` para
   construir el esquema. La paridad entre ambos caminos esta cubierta por
   ``test_migrations.py::test_el_esquema_construido_por_la_cadena_coincide_con_los_modelos``,
   asi que la suite no paga el coste de migrar en cada corrida. Los modelos
   declaran las columnas como la base (incluido ``id_caso NOT NULL``), de modo
   que este esquema es tan estricto como el de produccion. Antes no lo era, y
   esa diferencia dejo pasar un ``seed`` roto: ver defecto B2 en ``TESTING.md``.

3. Cada prueba corre dentro de su propia transaccion externa con
   ``join_transaction_mode="create_savepoint"``: los ``commit()`` de las
   rutas liberan savepoints, no la transaccion externa, y el teardown hace
   ``rollback()``. Resultado: cada prueba parte de un mundo limpio sin
   TRUNCATEs y sin orden obligatorio entre archivos.
"""

from __future__ import annotations

import asyncio
import os
import uuid
from typing import AsyncIterator, Iterator

# ── La base de pruebas se fija ANTES de importar `app` ───────────────────────
TEST_DB_NAME = os.environ.get("DB_TEST_NAME", "sw_mejor_ninez_test")
os.environ["DB_NAME"] = TEST_DB_NAME

import psycopg2  # noqa: E402
import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine  # noqa: E402
from sqlalchemy.pool import NullPool  # noqa: E402

import app.models  # noqa: E402,F401  (registra las tablas en SQLModel.metadata)
from app.core.config import settings  # noqa: E402
from app.core.database import get_db  # noqa: E402
from app.main import app  # noqa: E402
from tests.factories import crear_familiar, crear_nna  # noqa: E402

ADMIN_EMAIL = "admin@mejorninez.cl"
ADMIN_PASSWORD = "admin123"


async def _seed_static() -> None:
    """Carga admin, catalogos, preguntas y baremos en la base de pruebas."""
    import seed as seed_module

    engine = create_async_engine(settings.database_url, poolclass=NullPool)
    try:
        async with AsyncSession(engine, expire_on_commit=False) as session:
            await seed_module.seed_admin_user(session)
            await seed_module.seed_e2p_static(session)
            await seed_module.seed_pmf_static(session)
            await seed_module.seed_ncfas_items(session)
            await seed_module.seed_catalogs(session)
    finally:
        await engine.dispose()


def _recreate_database() -> None:
    assert settings.DB_NAME.endswith("_test"), (
        "DB_NAME debe terminar en '_test': esta fixture borra bases de datos "
        f"y el valor actual es {settings.DB_NAME!r}"
    )
    conn = psycopg2.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        dbname="postgres",
    )
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute(f'DROP DATABASE IF EXISTS "{settings.DB_NAME}" WITH (FORCE)')
            cur.execute(f'CREATE DATABASE "{settings.DB_NAME}"')
    finally:
        conn.close()


def _create_schema() -> None:
    """Construye el esquema completo a partir de los modelos SQLModel.

    Los modelos declaran las columnas igual que la base, incluido el
    ``id_caso NOT NULL`` de las 10 tablas agrupadas (via ``sa_column_kwargs``),
    asi que ``create_all`` produce un esquema tan estricto como el de la cadena
    de migraciones.

    Antes no era asi: los modelos declaraban ``id_caso`` como ``Optional`` y
    esta funcion tenia que repetir un ``ALTER TABLE ... SET NOT NULL`` para
    compensar. Esa diferencia entre la base de pruebas y la de produccion dejo
    pasar un ``seed`` que fallaba en un despliegue real (defecto B2, ver
    ``TESTING.md``).
    """
    from sqlmodel import SQLModel

    engine = create_engine(settings.database_url_sync)
    try:
        SQLModel.metadata.create_all(engine)
    finally:
        engine.dispose()


@pytest.fixture(scope="session", autouse=True)
def base_de_datos() -> Iterator[None]:
    """Recrea la base de pruebas, construye el esquema y siembra lo estatico."""
    _recreate_database()
    _create_schema()
    asyncio.run(_seed_static())
    yield


@pytest_asyncio.fixture
async def db_session(base_de_datos: None) -> AsyncIterator[AsyncSession]:
    """Sesion envuelta en una transaccion externa que siempre se revierte."""
    engine = create_async_engine(settings.database_url, poolclass=NullPool)
    conn = await engine.connect()
    trans = await conn.begin()
    session = AsyncSession(
        bind=conn,
        join_transaction_mode="create_savepoint",
        expire_on_commit=False,
    )
    try:
        yield session
    finally:
        await session.close()
        if trans.is_active:
            await trans.rollback()
        await conn.close()
        await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncIterator[AsyncClient]:
    """Cliente HTTP anonimo que comparte la sesion de la prueba."""

    async def _override_get_db() -> AsyncIterator[AsyncSession]:
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient) -> dict[str, str]:
    """Token JWT real obtenido por el endpoint de login."""
    res = await client.post(
        "/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


@pytest_asyncio.fixture
async def auth_client(
    client: AsyncClient, auth_headers: dict[str, str]
) -> AsyncIterator[AsyncClient]:
    """Cliente HTTP con el header de autorizacion ya aplicado."""
    client.headers.update(auth_headers)
    yield client


@pytest_asyncio.fixture
async def token(client: AsyncClient, auth_headers: dict[str, str]) -> str:
    return auth_headers["Authorization"].removeprefix("Bearer ")


@pytest_asyncio.fixture
async def nna(auth_client: AsyncClient) -> dict:
    """NNA recien creado via API, con su caso activo ya generado."""
    return await crear_nna(auth_client)


@pytest_asyncio.fixture
async def familiar(auth_client: AsyncClient) -> dict:
    return await crear_familiar(auth_client)


@pytest.fixture
def run_unico() -> str:
    """RUN unico para evitar colisiones con la restriccion unique."""
    return f"RUN-{uuid.uuid4().hex[:12]}"
