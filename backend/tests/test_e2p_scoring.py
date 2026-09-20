"""Pruebas del motor de scoring de E2P.

Se cubren las tres piezas:
1. la tabla de verdad de ``_determinar_resultado`` (unit, sin base);
2. la clasificacion por baremos (``decil``/``zona``) y el perfil global, con
   baremos sinteticos para tener control total de los cortes;
3. el endpoint ``GET /api/e2p/{id}/puntaje``.

Se usa el rango ``19-36_meses``: 15 preguntas por dimension, asi que el puntaje
bruto de una dimension con todas las respuestas en ``v`` es ``15 * v``.
"""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.api.routes.e2p import _determinar_resultado
from app.models.e2p import BaremoE2P, E2P, PreguntaE2P, PuntajeE2P
from tests.factories import crear_familiar, crear_nna

RANGO = "19-36_meses"
DIMENSIONES = ("Vinculares", "Formativas", "Protectoras", "Reflexivas")
PREGUNTAS_POR_DIMENSION = 15
MAX_POR_DIMENSION = PREGUNTAS_POR_DIMENSION * 4

# Cortes sinteticos: con 15 items y respuestas 0-4 el bruto va de 0 a 60.
ZONAS = [
    (1, "Baja frecuencia", 0, 20),
    (5, "Frecuencia intermedia", 21, 40),
    (10, "Alta frecuencia", 41, 60),
]


# ── 1. Tabla de verdad de _determinar_resultado ──────────────────────────────


def _z(dimension: str, zona: str) -> dict:
    return {"dimension": dimension, "zona": zona}


@pytest.mark.parametrize(
    ("puntajes", "esperado", "motivo"),
    [
        ([], None, "sin dimensiones no hay perfil"),
        (
            [_z("Vinculares", "Baja frecuencia"), _z("Formativas", "Baja frecuencia")],
            "Riesgo",
            "dos zonas bajas",
        ),
        (
            [_z("Vinculares", "Baja frecuencia"), _z("Formativas", "Alta frecuencia")],
            "Riesgo",
            "una sola baja, pero Vinculares es baja",
        ),
        (
            [_z("Vinculares", "Alta frecuencia"), _z("Formativas", "Baja frecuencia")],
            "Monitoreo",
            "una sola baja no vincular",
        ),
        (
            [_z("Vinculares", "Frecuencia intermedia"), _z("Formativas", "Frecuencia intermedia")],
            "Monitoreo",
            "dos intermedias y ninguna baja",
        ),
        (
            [_z("Vinculares", "Alta frecuencia"), _z("Formativas", "Frecuencia intermedia")],
            None,
            "una intermedia y ninguna baja no alcanza",
        ),
        (
            [
                _z("Vinculares", "Alta frecuencia"),
                _z("Formativas", "Alta frecuencia"),
                _z("Protectoras", "Alta frecuencia"),
            ],
            "Optimo",
            "tres altas y ninguna baja",
        ),
        (
            [_z("Vinculares", "Alta frecuencia"), _z("Formativas", "Alta frecuencia")],
            None,
            "dos altas no alcanzan para Optimo",
        ),
        (
            [
                _z("Vinculares", "Baja frecuencia"),
                _z("Formativas", "Baja frecuencia"),
                _z("Protectoras", "Alta frecuencia"),
                _z("Reflexivas", "Alta frecuencia"),
            ],
            "Riesgo",
            "el riesgo manda sobre las altas",
        ),
        (
            [
                _z("Vinculares", "Frecuencia intermedia"),
                _z("Formativas", "Frecuencia intermedia"),
                _z("Protectoras", "Baja frecuencia"),
                _z("Reflexivas", "Baja frecuencia"),
            ],
            "Riesgo",
            "dos bajas con dos intermedias",
        ),
        (
            [_z("Vinculares", "Alta frecuencia"), _z("Formativas", "Frecuencia intermedia"),
             _z("Protectoras", "Frecuencia intermedia"), _z("Reflexivas", "Frecuencia intermedia")],
            "Monitoreo",
            "tres intermedias y ninguna baja",
        ),
        (
            [_z("Vinculares", "Alta frecuencia"), _z("Formativas", "Alta frecuencia"),
             _z("Protectoras", "Alta frecuencia"), _z("Reflexivas", "Frecuencia intermedia")],
            "Optimo",
            "tres altas y una intermedia",
        ),
    ],
)
def test_determinar_resultado(puntajes: list[dict], esperado: str | None, motivo: str):
    assert _determinar_resultado(puntajes) == esperado, motivo


def test_el_orden_de_las_dimensiones_no_importa():
    directo = [_z("Vinculares", "Baja frecuencia"), _z("Formativas", "Baja frecuencia")]
    invertido = list(reversed(directo))
    assert _determinar_resultado(directo) == _determinar_resultado(invertido) == "Riesgo"


def test_una_zona_vacia_no_cuenta_como_baja():
    assert _determinar_resultado([_z("Vinculares", ""), _z("Formativas", "")]) is None


# ── 2. Clasificacion por baremos ─────────────────────────────────────────────


async def _baremos_sinteticos(db_session: AsyncSession, rango: str = RANGO) -> None:
    """Reemplaza los baremos del rango por cortes controlados."""
    existentes = (
        await db_session.execute(select(BaremoE2P).where(BaremoE2P.rango_etario == rango))
    ).scalars().all()
    for baremo in existentes:
        await db_session.delete(baremo)

    for dimension in DIMENSIONES:
        for decil, zona, minimo, maximo in ZONAS:
            db_session.add(
                BaremoE2P(
                    rango_etario=rango,
                    dimension=dimension,
                    decil=decil,
                    zona=zona,
                    puntaje_min=minimo,
                    puntaje_max=maximo,
                )
            )
    # Un baremo "Total" deliberadamente absurdo: el scoring debe ignorarlo.
    db_session.add(
        BaremoE2P(
            rango_etario=rango,
            dimension="Total",
            decil=1,
            zona="Baja frecuencia",
            puntaje_min=0,
            puntaje_max=0,
        )
    )
    await db_session.commit()


async def _respuestas_planas(
    db_session: AsyncSession, valores: dict[str, int], rango: str = RANGO
) -> dict[str, int]:
    preguntas = (
        await db_session.execute(select(PreguntaE2P).where(PreguntaE2P.rango_etario == rango))
    ).scalars().all()
    return {str(p.numero_item): valores[p.dimension] for p in preguntas}


async def _crear_e2p(
    auth_client: AsyncClient, db_session: AsyncSession, valores: dict[str, int]
) -> dict:
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    respuestas = await _respuestas_planas(db_session, valores)
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
    return res.json()


async def test_todas_las_respuestas_altas_dan_perfil_optimo(
    auth_client: AsyncClient, db_session: AsyncSession
):
    await _baremos_sinteticos(db_session)
    creado = await _crear_e2p(auth_client, db_session, dict.fromkeys(DIMENSIONES, 4))

    assert creado["perfil_resultado_global"] == "Optimo"
    puntajes = (
        await db_session.execute(
            select(PuntajeE2P).where(PuntajeE2P.id_e2p == uuid.UUID(creado["id_e2p"]))
        )
    ).scalars().all()
    assert {p.puntaje_bruto for p in puntajes} == {60}
    assert {p.zona for p in puntajes} == {"Alta frecuencia"}
    assert {p.decil for p in puntajes} == {10}


async def test_una_vinculares_baja_da_perfil_de_riesgo(
    auth_client: AsyncClient, db_session: AsyncSession
):
    await _baremos_sinteticos(db_session)
    valores = dict.fromkeys(DIMENSIONES, 4) | {"Vinculares": 1}
    creado = await _crear_e2p(auth_client, db_session, valores)

    assert creado["perfil_resultado_global"] == "Riesgo"

    puntajes = {
        p.dimension: p
        for p in (
            await db_session.execute(
                select(PuntajeE2P).where(PuntajeE2P.id_e2p == uuid.UUID(creado["id_e2p"]))
            )
        ).scalars().all()
    }
    assert puntajes["Vinculares"].puntaje_bruto == 15
    assert puntajes["Vinculares"].zona == "Baja frecuencia"
    assert puntajes["Formativas"].zona == "Alta frecuencia"


async def test_una_baja_no_vincular_da_perfil_de_monitoreo(
    auth_client: AsyncClient, db_session: AsyncSession
):
    await _baremos_sinteticos(db_session)
    valores = dict.fromkeys(DIMENSIONES, 4) | {"Formativas": 1}
    creado = await _crear_e2p(auth_client, db_session, valores)

    assert creado["perfil_resultado_global"] == "Monitoreo"


async def test_respuestas_intermedias_dan_perfil_de_monitoreo(
    auth_client: AsyncClient, db_session: AsyncSession
):
    await _baremos_sinteticos(db_session)
    creado = await _crear_e2p(auth_client, db_session, dict.fromkeys(DIMENSIONES, 2))

    assert creado["perfil_resultado_global"] == "Monitoreo"
    puntajes = (
        await db_session.execute(
            select(PuntajeE2P).where(PuntajeE2P.id_e2p == uuid.UUID(creado["id_e2p"]))
        )
    ).scalars().all()
    assert {p.puntaje_bruto for p in puntajes} == {30}
    assert {p.zona for p in puntajes} == {"Frecuencia intermedia"}


async def test_el_baremo_total_no_se_usa_para_clasificar(
    auth_client: AsyncClient, db_session: AsyncSession
):
    """El baremo ``Total`` (0-0, Baja) no debe arrastrar el perfil a Riesgo."""
    await _baremos_sinteticos(db_session)
    creado = await _crear_e2p(auth_client, db_session, dict.fromkeys(DIMENSIONES, 4))

    assert creado["perfil_resultado_global"] == "Optimo"
    puntajes = (
        await db_session.execute(
            select(PuntajeE2P).where(PuntajeE2P.id_e2p == uuid.UUID(creado["id_e2p"]))
        )
    ).scalars().all()
    assert "Total" not in {p.dimension for p in puntajes}


async def test_el_desglose_manda_sobre_el_perfil_global_previo(
    auth_client: AsyncClient, db_session: AsyncSession
):
    """El recálculo sobrescribe el ``perfil_resultado_global`` anterior."""
    await _baremos_sinteticos(db_session)
    creado = await _crear_e2p(auth_client, db_session, dict.fromkeys(DIMENSIONES, 4))
    assert creado["perfil_resultado_global"] == "Optimo"

    valores = dict.fromkeys(DIMENSIONES, 1)
    respuestas = await _respuestas_planas(db_session, valores)
    res = await auth_client.put(
        f"/api/e2p/{creado['id_e2p']}", json={"respuestas": respuestas}
    )
    assert res.status_code == 200, res.text
    assert res.json()["perfil_resultado_global"] == "Riesgo"


@pytest.mark.characterization
async def test_sin_baremos_la_zona_queda_nula_y_el_perfil_no_se_fija(
    auth_client: AsyncClient, db_session: AsyncSession
):
    """Si el rango no tiene baremos, se guardan bruto y decil nulos sin fallar."""
    existentes = (
        await db_session.execute(select(BaremoE2P).where(BaremoE2P.rango_etario == RANGO))
    ).scalars().all()
    for baremo in existentes:
        await db_session.delete(baremo)
    await db_session.commit()

    creado = await _crear_e2p(auth_client, db_session, dict.fromkeys(DIMENSIONES, 4))

    puntajes = (
        await db_session.execute(
            select(PuntajeE2P).where(PuntajeE2P.id_e2p == uuid.UUID(creado["id_e2p"]))
        )
    ).scalars().all()
    assert len(puntajes) == 4
    assert {p.puntaje_bruto for p in puntajes} == {60}
    assert {p.zona for p in puntajes} == {None}
    assert {p.decil for p in puntajes} == {None}
    assert creado["perfil_resultado_global"] is None


# ── 3. Colapso especial del rango 0-3_meses ──────────────────────────────────


@pytest.mark.parametrize(
    ("respondido", "esperado"),
    [(0, 2), (1, 2), (2, 2), (3, 3), (4, 4)],
)
async def test_el_rango_0_3_meses_colapsa_los_valores_bajos(
    auth_client: AsyncClient, db_session: AsyncSession, respondido: int, esperado: int
):
    """Para 0-3_meses, 0/1/2 se guardan como 2; 3 y 4 se mantienen."""
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    respuestas = await _respuestas_planas(db_session, dict.fromkeys(DIMENSIONES, respondido), "0-3_meses")

    creado = (
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/e2p",
            json={
                "id_familiar": familiar["id_familiar"],
                "fecha_evaluacion": "2024-05-01",
                "edad_meses_evaluacion": 2,
                "rango_etario": "0-3_meses",
                "respuestas": respuestas,
            },
        )
    ).json()

    filas = (
        await db_session.execute(
            select(PreguntaE2P.numero_item, PreguntaE2P.dimension).where(
                PreguntaE2P.rango_etario == "0-3_meses"
            )
        )
    ).all()
    esperado_por_item = {str(numero): dimension for numero, dimension in filas}

    from app.models.e2p import RespuestaE2P

    respuestas_db = (
        await db_session.execute(
            select(RespuestaE2P).where(RespuestaE2P.id_e2p == uuid.UUID(creado["id_e2p"]))
        )
    ).scalars().all()
    assert len(respuestas_db) == len(esperado_por_item)
    # El valor seleccionado se conserva crudo; el puntaje se colapsa.
    assert {r.valor_seleccionado for r in respuestas_db} == {respondido}
    assert {r.puntaje_calculado for r in respuestas_db} == {esperado}


async def test_el_colapso_de_0_3_meses_baja_el_puntaje_bruto(
    auth_client: AsyncClient, db_session: AsyncSession
):
    """15 items colapsados a 2 dan bruto 30, no 0 (que seria con respuestas 0)."""
    await _baremos_sinteticos(db_session, "0-3_meses")
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    respuestas = await _respuestas_planas(db_session, dict.fromkeys(DIMENSIONES, 0), "0-3_meses")

    creado = (
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/e2p",
            json={
                "id_familiar": familiar["id_familiar"],
                "fecha_evaluacion": "2024-05-01",
                "edad_meses_evaluacion": 2,
                "rango_etario": "0-3_meses",
                "respuestas": respuestas,
            },
        )
    ).json()

    puntajes = (
        await db_session.execute(
            select(PuntajeE2P).where(PuntajeE2P.id_e2p == uuid.UUID(creado["id_e2p"]))
        )
    ).scalars().all()
    assert {p.puntaje_bruto for p in puntajes} == {2 * PREGUNTAS_POR_DIMENSION}
    assert {p.zona for p in puntajes} == {"Frecuencia intermedia"}


async def test_los_otros_rangos_no_colapsan(
    auth_client: AsyncClient, db_session: AsyncSession
):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    respuestas = await _respuestas_planas(db_session, dict.fromkeys(DIMENSIONES, 1))

    creado = (
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/e2p",
            json={
                "id_familiar": familiar["id_familiar"],
                "fecha_evaluacion": "2024-05-01",
                "edad_meses_evaluacion": 30,
                "rango_etario": RANGO,
                "respuestas": respuestas,
            },
        )
    ).json()

    from app.models.e2p import RespuestaE2P

    filas = (
        await db_session.execute(
            select(RespuestaE2P).where(RespuestaE2P.id_e2p == uuid.UUID(creado["id_e2p"]))
        )
    ).scalars().all()
    assert {f.puntaje_calculado for f in filas} == {1}


# ── 4. Endpoint de puntaje ───────────────────────────────────────────────────


async def test_puntaje_inexistente_devuelve_404(auth_client: AsyncClient):
    res = await auth_client.get(f"/api/e2p/{uuid.uuid4()}/puntaje")
    assert res.status_code == 404
    assert res.json()["detail"] == "E2P no encontrado"


async def test_puntaje_sin_respuestas_devuelve_400(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    from tests.factories import crear_e2p

    creado = await crear_e2p(auth_client, nna["id_nna"], familiar["id_familiar"])

    res = await auth_client.get(f"/api/e2p/{creado['id_e2p']}/puntaje")
    assert res.status_code == 400
    assert res.json()["detail"] == "E2P sin puntajes registrados"


async def test_puntaje_completo(auth_client: AsyncClient, db_session: AsyncSession):
    await _baremos_sinteticos(db_session)
    creado = await _crear_e2p(auth_client, db_session, dict.fromkeys(DIMENSIONES, 4))

    res = await auth_client.get(f"/api/e2p/{creado['id_e2p']}/puntaje")
    assert res.status_code == 200, res.text
    cuerpo = res.json()

    assert cuerpo["rango_etario"] == RANGO
    assert cuerpo["edad"] == "19 a 36 meses"
    assert cuerpo["escala"] == {
        "0": "Nunca",
        "1": "Casi Nunca",
        "2": "A veces",
        "3": "Casi Siempre",
        "4": "Siempre",
    }
    assert cuerpo["respuestas"] and len(cuerpo["respuestas"]) == 4 * PREGUNTAS_POR_DIMENSION

    categorias = {c["dimension"]: c for c in cuerpo["categorias"]}
    assert set(categorias) == set(DIMENSIONES)
    for categoria in categorias.values():
        assert categoria["puntaje_bruto"] == 60
        assert categoria["puntaje_max"] == MAX_POR_DIMENSION
        assert categoria["zona"] == "Alta frecuencia"
        assert categoria["decil"] == 10


async def test_puntaje_calcula_el_maximo_desde_las_preguntas_del_rango(
    auth_client: AsyncClient, db_session: AsyncSession
):
    """``puntaje_max`` es ``nº de preguntas de la dimension x 4``."""
    await _baremos_sinteticos(db_session)
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    respuestas = await _respuestas_planas(db_session, dict.fromkeys(DIMENSIONES, 4))

    creado = (
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/e2p",
            json={
                "id_familiar": familiar["id_familiar"],
                "fecha_evaluacion": "2024-05-01",
                "edad_meses_evaluacion": 30,
                "rango_etario": RANGO,
                "respuestas": respuestas,
            },
        )
    ).json()

    cuerpo = (await auth_client.get(f"/api/e2p/{creado['id_e2p']}/puntaje")).json()
    for categoria in cuerpo["categorias"]:
        assert categoria["puntaje_max"] == MAX_POR_DIMENSION


async def test_el_maximo_refleja_las_preguntas_reales_del_rango_13_17(
    auth_client: AsyncClient, db_session: AsyncSession
):
    """13-17_anos no tiene 15 items en todas las dimensiones."""
    rango = "13-17_anos"
    await _baremos_sinteticos(db_session, rango)
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    respuestas = await _respuestas_planas(db_session, dict.fromkeys(DIMENSIONES, 4), rango)

    creado = (
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/e2p",
            json={
                "id_familiar": familiar["id_familiar"],
                "fecha_evaluacion": "2024-05-01",
                "edad_meses_evaluacion": 180,
                "rango_etario": rango,
                "respuestas": respuestas,
            },
        )
    ).json()

    conteos = dict(
        (
            await db_session.execute(
                select(PreguntaE2P.dimension, func.count())
                .where(PreguntaE2P.rango_etario == rango)
                .group_by(PreguntaE2P.dimension)
            )
        ).all()
    )

    cuerpo = (await auth_client.get(f"/api/e2p/{creado['id_e2p']}/puntaje")).json()
    for categoria in cuerpo["categorias"]:
        assert categoria["puntaje_max"] == conteos[categoria["dimension"]] * 4
    assert conteos["Protectoras"] != conteos["Vinculares"]


async def test_borrar_las_respuestas_limpia_el_perfil_global(
    auth_client: AsyncClient, db_session: AsyncSession
):
    await _baremos_sinteticos(db_session)
    creado = await _crear_e2p(auth_client, db_session, dict.fromkeys(DIMENSIONES, 4))
    assert creado["perfil_resultado_global"] == "Optimo"

    res = await auth_client.put(f"/api/e2p/{creado['id_e2p']}", json={"respuestas": {}})
    assert res.status_code == 200, res.text

    e2p = (
        await db_session.execute(select(E2P).where(E2P.id_e2p == uuid.UUID(creado["id_e2p"])))
    ).scalar_one()
    await db_session.refresh(e2p)
    assert e2p.perfil_resultado_global is None

    puntajes = (
        await db_session.execute(
            select(PuntajeE2P).where(PuntajeE2P.id_e2p == uuid.UUID(creado["id_e2p"]))
        )
    ).scalars().all()
    assert puntajes == []
