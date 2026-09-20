"""Pruebas del ciclo CRUD de E2P y de la normalizacion de sus respuestas.

E2P es el instrumento mas complejo: ademas de la cabecera guarda una fila por
pregunta en ``RespuestaE2P`` y los puntajes por dimension en ``PuntajeE2P``.
La API sigue aceptando ``respuestas`` como diccionario (numero de pregunta ->
Likert 0-4) y lo traduce a filas normalizadas.
"""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.e2p import PuntajeE2P, RespuestaE2P
from tests.factories import caso_activo_id, crear_e2p, crear_familiar, crear_nna

RANGO = "19-36_meses"


async def _preguntas_por_dimension(db_session: AsyncSession, rango: str = RANGO) -> dict[str, list[int]]:
    from app.models.e2p import PreguntaE2P

    preguntas = (
        await db_session.execute(select(PreguntaE2P).where(PreguntaE2P.rango_etario == rango))
    ).scalars().all()
    agrupadas: dict[str, list[int]] = {}
    for p in preguntas:
        agrupadas.setdefault(p.dimension, []).append(p.numero_item)
    return agrupadas


async def _respuestas(
    db_session: AsyncSession, valores: dict[str, int], rango: str = RANGO
) -> dict[str, int]:
    agrupadas = await _preguntas_por_dimension(db_session, rango)
    return {
        str(numero): valores[dimension]
        for dimension, numeros in agrupadas.items()
        for numero in numeros
    }


# ── Listado ──────────────────────────────────────────────────────────────────


async def test_listado_empieza_vacio(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    res = await auth_client.get(f"/api/nna/{nna['id_nna']}/e2p")
    assert res.status_code == 200
    assert res.json() == []


async def test_listado_por_familiar_empieza_vacio(auth_client: AsyncClient):
    familiar = await crear_familiar(auth_client)
    res = await auth_client.get(f"/api/familiares/{familiar['id_familiar']}/e2p")
    assert res.status_code == 200
    assert res.json() == []


async def test_listado_filtra_por_caso(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    id_nna = nna["id_nna"]
    activo = await caso_activo_id(auth_client, id_nna)
    await crear_e2p(auth_client, id_nna, familiar["id_familiar"])

    await auth_client.put(f"/api/casos/{activo}", json={"estado": "Cerrado"})
    await auth_client.post(f"/api/nna/{id_nna}/casos", json={})
    await crear_e2p(auth_client, id_nna, familiar["id_familiar"])

    assert len((await auth_client.get(f"/api/nna/{id_nna}/e2p")).json()) == 2
    solo_activo = (await auth_client.get(f"/api/nna/{id_nna}/e2p?id_caso={activo}")).json()
    assert len(solo_activo) == 1
    assert solo_activo[0]["id_caso"] == activo


async def test_el_listado_por_familiar_devuelve_las_evaluaciones_del_familiar(
    auth_client: AsyncClient,
):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    creado = await crear_e2p(auth_client, nna["id_nna"], familiar["id_familiar"])

    listado = (await auth_client.get(f"/api/familiares/{familiar['id_familiar']}/e2p")).json()
    assert [e["id_e2p"] for e in listado] == [creado["id_e2p"]]


# ── Alta ─────────────────────────────────────────────────────────────────────


async def test_alta_minima(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)

    res = await auth_client.post(
        f"/api/nna/{nna['id_nna']}/e2p",
        json={
            "id_familiar": familiar["id_familiar"],
            "fecha_evaluacion": "2024-05-01",
            "edad_meses_evaluacion": 30,
            "rango_etario": RANGO,
        },
    )
    assert res.status_code == 201, res.text
    cuerpo = res.json()
    assert cuerpo["id_nna"] == nna["id_nna"]
    assert cuerpo["id_familiar"] == familiar["id_familiar"]
    assert cuerpo["rango_etario"] == RANGO
    assert cuerpo["respuestas"] is None
    assert cuerpo["perfil_resultado_global"] is None


async def test_alta_sin_campos_requeridos_devuelve_422(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    res = await auth_client.post(f"/api/nna/{nna['id_nna']}/e2p", json={})
    assert res.status_code == 422


@pytest.mark.parametrize(
    "faltante",
    ["fecha_evaluacion", "edad_meses_evaluacion", "rango_etario"],
)
async def test_alta_sin_cada_campo_requerido_devuelve_422(
    auth_client: AsyncClient, faltante: str
):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    payload = {
        "id_familiar": familiar["id_familiar"],
        "fecha_evaluacion": "2024-05-01",
        "edad_meses_evaluacion": 30,
        "rango_etario": RANGO,
    }
    payload.pop(faltante)

    res = await auth_client.post(f"/api/nna/{nna['id_nna']}/e2p", json=payload)
    assert res.status_code == 422


async def test_alta_con_rango_invalido_falla_en_la_base(auth_client: AsyncClient):
    """El schema no valida ``rango_etario``; el rechazo viene de la CheckConstraint."""
    from sqlalchemy.exc import IntegrityError

    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)

    with pytest.raises(IntegrityError):
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/e2p",
            json={
                "id_familiar": familiar["id_familiar"],
                "fecha_evaluacion": "2024-05-01",
                "edad_meses_evaluacion": 30,
                "rango_etario": "3-5-anos",
            },
        )


async def test_el_alta_queda_sellada_con_el_caso_activo(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    creado = await crear_e2p(auth_client, nna["id_nna"], familiar["id_familiar"])
    assert creado["id_caso"] == await caso_activo_id(auth_client, nna["id_nna"])


async def test_alta_con_respuestas_normaliza_las_filas(
    auth_client: AsyncClient, db_session: AsyncSession
):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    todas = await _respuestas(db_session, dict.fromkeys(
        ("Vinculares", "Formativas", "Protectoras", "Reflexivas"), 4
    ))

    res = await auth_client.post(
        f"/api/nna/{nna['id_nna']}/e2p",
        json={
            "id_familiar": familiar["id_familiar"],
            "fecha_evaluacion": "2024-05-01",
            "edad_meses_evaluacion": 30,
            "rango_etario": RANGO,
            "respuestas": todas,
        },
    )
    assert res.status_code == 201, res.text
    assert res.json()["respuestas"] == todas

    filas = (
        await db_session.execute(
            select(RespuestaE2P).where(RespuestaE2P.id_e2p == uuid.UUID(res.json()["id_e2p"]))
        )
    ).scalars().all()
    assert len(filas) == len(todas)
    assert {f.valor_seleccionado for f in filas} == {4}


async def test_alta_con_respuestas_calcula_los_puntajes_por_dimension(
    auth_client: AsyncClient, db_session: AsyncSession
):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    todas = await _respuestas(db_session, dict.fromkeys(
        ("Vinculares", "Formativas", "Protectoras", "Reflexivas"), 4
    ))

    creado = (
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/e2p",
            json={
                "id_familiar": familiar["id_familiar"],
                "fecha_evaluacion": "2024-05-01",
                "edad_meses_evaluacion": 30,
                "rango_etario": RANGO,
                "respuestas": todas,
            },
        )
    ).json()

    puntajes = (
        await db_session.execute(
            select(PuntajeE2P).where(PuntajeE2P.id_e2p == uuid.UUID(creado["id_e2p"]))
        )
    ).scalars().all()
    assert len(puntajes) == 4
    assert {p.dimension for p in puntajes} == {
        "Vinculares",
        "Formativas",
        "Protectoras",
        "Reflexivas",
    }
    assert {p.puntaje_bruto for p in puntajes} == {60}


async def test_alta_sin_respuestas_no_crea_puntajes(
    auth_client: AsyncClient, db_session: AsyncSession
):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    creado = await crear_e2p(auth_client, nna["id_nna"], familiar["id_familiar"])

    puntajes = (
        await db_session.execute(
            select(PuntajeE2P).where(PuntajeE2P.id_e2p == uuid.UUID(creado["id_e2p"]))
        )
    ).scalars().all()
    assert puntajes == []


async def test_las_respuestas_con_un_item_inexistente_se_ignoran(
    auth_client: AsyncClient, db_session: AsyncSession
):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    respuestas = {"1": 4, "99999": 4}

    res = await auth_client.post(
        f"/api/nna/{nna['id_nna']}/e2p",
        json={
            "id_familiar": familiar["id_familiar"],
            "fecha_evaluacion": "2024-05-01",
            "edad_meses_evaluacion": 30,
            "rango_etario": RANGO,
            "respuestas": respuestas,
        },
    )
    assert res.status_code == 201, res.text
    assert res.json()["respuestas"] == {"1": 4}


# ── Consulta ─────────────────────────────────────────────────────────────────


async def test_consulta_por_id(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    creado = await crear_e2p(auth_client, nna["id_nna"], familiar["id_familiar"])

    res = await auth_client.get(f"/api/e2p/{creado['id_e2p']}")
    assert res.status_code == 200
    assert res.json() == creado


async def test_consulta_inexistente_devuelve_404(auth_client: AsyncClient):
    res = await auth_client.get(f"/api/e2p/{uuid.uuid4()}")
    assert res.status_code == 404
    assert res.json()["detail"] == "E2P no encontrado"


async def test_la_consulta_reconstruye_el_diccionario_de_respuestas(
    auth_client: AsyncClient, db_session: AsyncSession
):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    todas = await _respuestas(db_session, dict.fromkeys(
        ("Vinculares", "Formativas", "Protectoras", "Reflexivas"), 3
    ))
    creado = (
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/e2p",
            json={
                "id_familiar": familiar["id_familiar"],
                "fecha_evaluacion": "2024-05-01",
                "edad_meses_evaluacion": 30,
                "rango_etario": RANGO,
                "respuestas": todas,
            },
        )
    ).json()

    res = await auth_client.get(f"/api/e2p/{creado['id_e2p']}")
    assert res.json()["respuestas"] == todas


# ── Actualizacion ────────────────────────────────────────────────────────────


async def test_actualizacion_de_campos_simples(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    creado = await crear_e2p(auth_client, nna["id_nna"], familiar["id_familiar"])

    res = await auth_client.put(
        f"/api/e2p/{creado['id_e2p']}", json={"observacion": "Se observa mejora."}
    )
    assert res.status_code == 200, res.text
    assert res.json()["observacion"] == "Se observa mejora."
    assert res.json()["rango_etario"] == creado["rango_etario"]
    assert res.json()["edad_meses_evaluacion"] == creado["edad_meses_evaluacion"]


async def test_actualizacion_inexistente_devuelve_404(auth_client: AsyncClient):
    res = await auth_client.put(f"/api/e2p/{uuid.uuid4()}", json={"observacion": "x"})
    assert res.status_code == 404


async def test_actualizacion_agregando_respuestas(
    auth_client: AsyncClient, db_session: AsyncSession
):
    """Parte de una E2P sin respuestas y le agrega el cuestionario completo."""
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    creado = await crear_e2p(auth_client, nna["id_nna"], familiar["id_familiar"])
    todas = await _respuestas(db_session, dict.fromkeys(
        ("Vinculares", "Formativas", "Protectoras", "Reflexivas"), 4
    ))

    res = await auth_client.put(
        f"/api/e2p/{creado['id_e2p']}", json={"respuestas": todas}
    )
    assert res.status_code == 200, res.text
    assert res.json()["respuestas"] == todas

    puntajes = (
        await db_session.execute(
            select(PuntajeE2P).where(PuntajeE2P.id_e2p == uuid.UUID(creado["id_e2p"]))
        )
    ).scalars().all()
    assert len(puntajes) == 4


async def test_reescribir_las_mismas_respuestas_no_duplica_ni_falla(
    auth_client: AsyncClient, db_session: AsyncSession
):
    """Reenviar el mismo cuestionario reemplaza las filas sin chocar con el unique.

    La sincronizacion borra e inserta en la misma transaccion; SQLAlchemy
    ordena los DELETE antes de los INSERT, asi que el ciclo es idempotente.
    Es el caso que produce la UI al guardar una evaluacion ya existente
    (``e2p-form-dialog.tsx`` -> ``api.e2p.update`` con ``respuestas``).
    """
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    todas = await _respuestas(db_session, dict.fromkeys(
        ("Vinculares", "Formativas", "Protectoras", "Reflexivas"), 4
    ))
    creado = (
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/e2p",
            json={
                "id_familiar": familiar["id_familiar"],
                "fecha_evaluacion": "2024-05-01",
                "edad_meses_evaluacion": 30,
                "rango_etario": RANGO,
                "respuestas": todas,
            },
        )
    ).json()

    res = await auth_client.put(f"/api/e2p/{creado['id_e2p']}", json={"respuestas": todas})
    assert res.status_code == 200, res.text
    assert res.json()["respuestas"] == todas

    filas = (
        await db_session.execute(
            select(RespuestaE2P).where(RespuestaE2P.id_e2p == uuid.UUID(creado["id_e2p"]))
        )
    ).scalars().all()
    assert len(filas) == len(todas)

    puntajes = (
        await db_session.execute(
            select(PuntajeE2P).where(PuntajeE2P.id_e2p == uuid.UUID(creado["id_e2p"]))
        )
    ).scalars().all()
    assert len(puntajes) == 4


async def test_reescribir_con_respuestas_distintas_actualiza_las_filas(
    auth_client: AsyncClient, db_session: AsyncSession
):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    dimensiones = ("Vinculares", "Formativas", "Protectoras", "Reflexivas")
    inicial = await _respuestas(db_session, dict.fromkeys(dimensiones, 4))
    creado = (
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/e2p",
            json={
                "id_familiar": familiar["id_familiar"],
                "fecha_evaluacion": "2024-05-01",
                "edad_meses_evaluacion": 30,
                "rango_etario": RANGO,
                "respuestas": inicial,
            },
        )
    ).json()

    solo_vinculares = await _respuestas(db_session, dict.fromkeys(dimensiones, 1))
    res = await auth_client.put(
        f"/api/e2p/{creado['id_e2p']}", json={"respuestas": solo_vinculares}
    )
    assert res.status_code == 200, res.text
    assert res.json()["respuestas"] == solo_vinculares

    filas = (
        await db_session.execute(
            select(RespuestaE2P).where(RespuestaE2P.id_e2p == uuid.UUID(creado["id_e2p"]))
        )
    ).scalars().all()
    assert len(filas) == len(inicial)
    assert {f.valor_seleccionado for f in filas} == {1}


@pytest.mark.characterization
async def test_actualizar_solo_la_observacion_conserva_las_respuestas(
    auth_client: AsyncClient, db_session: AsyncSession
):
    """Enviar ``respuestas: null`` explicitamente no borra las filas existentes.

    El endpoint solo sincroniza cuando ``respuestas is not None``; por eso el
    cuestionario sobrevive a una edicion de la observacion.
    """
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    todas = await _respuestas(db_session, dict.fromkeys(
        ("Vinculares", "Formativas", "Protectoras", "Reflexivas"), 4
    ))
    creado = (
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/e2p",
            json={
                "id_familiar": familiar["id_familiar"],
                "fecha_evaluacion": "2024-05-01",
                "edad_meses_evaluacion": 30,
                "rango_etario": RANGO,
                "respuestas": todas,
            },
        )
    ).json()

    res = await auth_client.put(
        f"/api/e2p/{creado['id_e2p']}", json={"observacion": "Editada"}
    )
    assert res.status_code == 200
    assert res.json()["respuestas"] == todas


@pytest.mark.characterization
async def test_un_cambio_de_rango_no_revalida_las_respuestas(
    auth_client: AsyncClient, db_session: AsyncSession
):
    """Cambiar el rango etario sin reenviar respuestas deja los puntajes viejos."""
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    todas = await _respuestas(db_session, dict.fromkeys(
        ("Vinculares", "Formativas", "Protectoras", "Reflexivas"), 4
    ))
    creado = (
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/e2p",
            json={
                "id_familiar": familiar["id_familiar"],
                "fecha_evaluacion": "2024-05-01",
                "edad_meses_evaluacion": 30,
                "rango_etario": RANGO,
                "respuestas": todas,
            },
        )
    ).json()

    res = await auth_client.put(
        f"/api/e2p/{creado['id_e2p']}", json={"rango_etario": "3-5_anos"}
    )
    assert res.status_code == 200
    assert res.json()["rango_etario"] == "3-5_anos"

    # Las filas siguen apuntando a las preguntas de 19-36_meses.
    filas = (
        await db_session.execute(
            select(RespuestaE2P).where(RespuestaE2P.id_e2p == uuid.UUID(creado["id_e2p"]))
        )
    ).scalars().all()
    assert len(filas) == 60
