"""Pruebas de PMF: preguntas (con fallback al JSON), CRUD y respuestas.

Diferencias con E2P que estas pruebas fijan:
- PMF acepta que todos los campos de la cabecera sean opcionales;
- sus respuestas son booleanas y ``RespuestaPMF`` **no** tiene restriccion
  unique, asi que reenviar el cuestionario es idempotente por construccion;
- si la tabla ``PreguntaPMF`` esta vacia, las preguntas se leen de
  ``app/data/pmf_afirmaciones.json``.
"""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.pmf import PreguntaPMF, RespuestaPMF
from tests.factories import caso_activo_id, crear_familiar, crear_nna, crear_pmf

TOTAL_PREGUNTAS_SEMBRADAS = 114


# ── Preguntas ────────────────────────────────────────────────────────────────


async def test_las_preguntas_vienen_de_la_tabla_sembrada(auth_client: AsyncClient):
    res = await auth_client.get("/api/pmf/preguntas")
    assert res.status_code == 200, res.text
    preguntas = res.json()

    assert len(preguntas) == TOTAL_PREGUNTAS_SEMBRADAS
    assert [p["numero"] for p in preguntas] == list(range(1, TOTAL_PREGUNTAS_SEMBRADAS + 1))
    assert all(p["afirmacion"] for p in preguntas)
    assert all(uuid.UUID(p["id_pregunta_pmf"]) for p in preguntas)


async def test_las_preguntas_traen_la_escala_en_null(auth_client: AsyncClient):
    preguntas = (await auth_client.get("/api/pmf/preguntas")).json()
    assert {p["escala"] for p in preguntas} == {None}


async def test_las_preguntas_caen_al_json_si_la_tabla_esta_vacia(
    auth_client: AsyncClient, db_session: AsyncSession
):
    """Fallback documentado: sin filas en la base, se lee el JSON del disco."""
    for pregunta in (await db_session.execute(select(PreguntaPMF))).scalars().all():
        await db_session.delete(pregunta)
    await db_session.commit()
    assert (await db_session.execute(select(PreguntaPMF))).scalars().all() == []

    res = await auth_client.get("/api/pmf/preguntas")
    assert res.status_code == 200, res.text
    preguntas = res.json()

    assert len(preguntas) == TOTAL_PREGUNTAS_SEMBRADAS
    assert [p["numero"] for p in preguntas] == list(range(1, TOTAL_PREGUNTAS_SEMBRADAS + 1))
    assert all(p["afirmacion"] for p in preguntas)
    # El fallback tambien expone el campo escala, en null.
    assert {p["escala"] for p in preguntas} == {None}


async def test_el_fallback_genera_ids_distintos_en_cada_llamada(
    auth_client: AsyncClient, db_session: AsyncSession
):
    """El JSON no tiene PKs: cada respuesta inventa UUID nuevos."""
    for pregunta in (await db_session.execute(select(PreguntaPMF))).scalars().all():
        await db_session.delete(pregunta)
    await db_session.commit()

    primera = (await auth_client.get("/api/pmf/preguntas")).json()
    segunda = (await auth_client.get("/api/pmf/preguntas")).json()

    assert primera[0]["afirmacion"] == segunda[0]["afirmacion"]
    assert primera[0]["id_pregunta_pmf"] != segunda[0]["id_pregunta_pmf"]


# ── Listado ──────────────────────────────────────────────────────────────────


async def test_listado_empieza_vacio(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    res = await auth_client.get(f"/api/nna/{nna['id_nna']}/pmf")
    assert res.status_code == 200
    assert res.json() == []


async def test_listado_por_familiar_empieza_vacio(auth_client: AsyncClient):
    familiar = await crear_familiar(auth_client)
    res = await auth_client.get(f"/api/familiares/{familiar['id_familiar']}/pmf")
    assert res.status_code == 200
    assert res.json() == []


async def test_listado_por_familiar_devuelve_las_evaluaciones_del_familiar(
    auth_client: AsyncClient,
):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    creado = await crear_pmf(auth_client, nna["id_nna"], familiar["id_familiar"])

    listado = (await auth_client.get(f"/api/familiares/{familiar['id_familiar']}/pmf")).json()
    assert [p["id_pmf"] for p in listado] == [creado["id_pmf"]]


async def test_listado_filtra_por_caso(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    id_nna = nna["id_nna"]
    activo = await caso_activo_id(auth_client, id_nna)
    await crear_pmf(auth_client, id_nna, familiar["id_familiar"])

    await auth_client.put(f"/api/casos/{activo}", json={"estado": "Cerrado"})
    await auth_client.post(f"/api/nna/{id_nna}/casos", json={})
    await crear_pmf(auth_client, id_nna, familiar["id_familiar"])

    assert len((await auth_client.get(f"/api/nna/{id_nna}/pmf")).json()) == 2
    solo_activo = (await auth_client.get(f"/api/nna/{id_nna}/pmf?id_caso={activo}")).json()
    assert len(solo_activo) == 1
    assert solo_activo[0]["id_caso"] == activo


# ── Alta ─────────────────────────────────────────────────────────────────────


async def test_alta_con_todos_los_campos(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)

    res = await auth_client.post(
        f"/api/nna/{nna['id_nna']}/pmf",
        json={
            "id_familiar": familiar["id_familiar"],
            "fecha_evaluacion": "2024-05-01",
            "fecha_proxima_evaluacion": "2024-11-01",
            "resultado": "En proceso",
            "observacion": "La madre asiste regularmente a visitas.",
        },
    )
    assert res.status_code == 201, res.text
    cuerpo = res.json()
    assert cuerpo["resultado"] == "En proceso"
    assert cuerpo["fecha_proxima_evaluacion"] == "2024-11-01"
    assert cuerpo["id_caso"] == await caso_activo_id(auth_client, nna["id_nna"])


async def test_alta_vacia_es_valida(auth_client: AsyncClient):
    """Todos los campos de la cabecera son opcionales, salvo el familiar (NOT NULL)."""
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)

    res = await auth_client.post(
        f"/api/nna/{nna['id_nna']}/pmf", json={"id_familiar": familiar["id_familiar"]}
    )
    assert res.status_code == 201, res.text
    assert res.json()["fecha_evaluacion"] is None
    assert res.json()["resultado"] is None


async def test_alta_sin_familiar_falla_en_la_base(auth_client: AsyncClient):
    """``id_familiar`` es opcional en el schema pero NOT NULL en el modelo."""
    from sqlalchemy.exc import IntegrityError

    nna = await crear_nna(auth_client)
    with pytest.raises(IntegrityError):
        await auth_client.post(f"/api/nna/{nna['id_nna']}/pmf", json={})


async def test_alta_con_respuestas(auth_client: AsyncClient, db_session: AsyncSession):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    respuestas = {"1": True, "2": False, "3": True}

    res = await auth_client.post(
        f"/api/nna/{nna['id_nna']}/pmf",
        json={
            "id_familiar": familiar["id_familiar"],
            "respuestas": respuestas,
        },
    )
    assert res.status_code == 201, res.text
    assert res.json()["respuestas"] == respuestas

    filas = (
        await db_session.execute(
            select(RespuestaPMF).where(RespuestaPMF.id_pmf == uuid.UUID(res.json()["id_pmf"]))
        )
    ).scalars().all()
    assert len(filas) == 3
    assert {f.respuesta for f in filas} == {True, False}


async def test_las_respuestas_con_numero_inexistente_se_ignoran(
    auth_client: AsyncClient,
):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)

    res = await auth_client.post(
        f"/api/nna/{nna['id_nna']}/pmf",
        json={
            "id_familiar": familiar["id_familiar"],
            "respuestas": {"1": True, "9999": True},
        },
    )
    assert res.status_code == 201
    assert res.json()["respuestas"] == {"1": True}


# ── Consulta ─────────────────────────────────────────────────────────────────


async def test_consulta_por_id(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    creado = await crear_pmf(auth_client, nna["id_nna"], familiar["id_familiar"])

    res = await auth_client.get(f"/api/pmf/{creado['id_pmf']}")
    assert res.status_code == 200
    assert res.json() == creado


async def test_consulta_inexistente_devuelve_404(auth_client: AsyncClient):
    res = await auth_client.get(f"/api/pmf/{uuid.uuid4()}")
    assert res.status_code == 404
    assert res.json()["detail"] == "PMF no encontrado"


# ── Actualizacion ────────────────────────────────────────────────────────────


async def test_actualizacion_parcial(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    creado = await crear_pmf(auth_client, nna["id_nna"], familiar["id_familiar"])

    res = await auth_client.put(
        f"/api/pmf/{creado['id_pmf']}", json={"resultado": "Logrado"}
    )
    assert res.status_code == 200, res.text
    assert res.json()["resultado"] == "Logrado"
    assert res.json()["fecha_evaluacion"] == creado["fecha_evaluacion"]


async def test_actualizacion_inexistente_devuelve_404(auth_client: AsyncClient):
    res = await auth_client.put(f"/api/pmf/{uuid.uuid4()}", json={"resultado": "x"})
    assert res.status_code == 404


async def test_agregar_respuestas_despues_del_alta(
    auth_client: AsyncClient, db_session: AsyncSession
):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    creado = await crear_pmf(auth_client, nna["id_nna"], familiar["id_familiar"])

    res = await auth_client.put(
        f"/api/pmf/{creado['id_pmf']}", json={"respuestas": {"1": True, "2": True}}
    )
    assert res.status_code == 200, res.text
    assert res.json()["respuestas"] == {"1": True, "2": True}


async def test_reenviar_las_mismas_respuestas_no_falla(
    auth_client: AsyncClient, db_session: AsyncSession
):
    """``RespuestaPMF`` no tiene unique, asi que el ciclo borrar+insertar es seguro."""
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    respuestas = {"1": True, "2": False, "3": True}
    creado = (
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/pmf",
            json={"id_familiar": familiar["id_familiar"], "respuestas": respuestas},
        )
    ).json()

    for _ in range(2):
        res = await auth_client.put(
            f"/api/pmf/{creado['id_pmf']}", json={"respuestas": respuestas}
        )
        assert res.status_code == 200, res.text
        assert res.json()["respuestas"] == respuestas

    filas = (
        await db_session.execute(
            select(RespuestaPMF).where(RespuestaPMF.id_pmf == uuid.UUID(creado["id_pmf"]))
        )
    ).scalars().all()
    assert len(filas) == 3


async def test_reenviar_respuestas_distintas_reemplaza_las_anteriores(
    auth_client: AsyncClient, db_session: AsyncSession
):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    creado = (
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/pmf",
            json={"id_familiar": familiar["id_familiar"], "respuestas": {"1": True, "2": True}},
        )
    ).json()

    res = await auth_client.put(
        f"/api/pmf/{creado['id_pmf']}", json={"respuestas": {"5": False}}
    )
    assert res.status_code == 200
    assert res.json()["respuestas"] == {"5": False}

    filas = (
        await db_session.execute(
            select(RespuestaPMF).where(RespuestaPMF.id_pmf == uuid.UUID(creado["id_pmf"]))
        )
    ).scalars().all()
    assert len(filas) == 1
    assert filas[0].respuesta is False
