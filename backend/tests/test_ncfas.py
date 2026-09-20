"""Pruebas de NCFAS: items por dimension, CRUD, respuestas y comentarios.

Particularidades que estas pruebas fijan:
- los items se leen de ``ItemNCFAS`` (10 dimensiones A-J) con fallback al JSON;
- las respuestas son ``{momento: {letra_numero: puntaje}}`` con tres momentos
  (Ingreso, Intermedio, Cierre) y un catalogo cerrado de puntajes;
- los valores fuera de catalogo se descartan en silencio;
- el comentario por dimension es un upsert que normaliza la letra a mayusculas;
- ``RespuestaNCFAS`` tiene unique ``(id_ncfas, id_item_ncfas, momento)``.
"""

import uuid

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.ncfas import (
    ComentarioDimensionNCFAS,
    ItemNCFAS,
    RespuestaNCFAS,
)
from tests.factories import caso_activo_id, crear_familiar, crear_ncfas, crear_nna

DIMENSIONES = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]
MOMENTOS = ["Ingreso", "Intermedio", "Cierre"]
PUNTAJES_VALIDOS = ["+2", "+1", "0", "-1", "-2", "-3", "DN", "N/A"]


async def _items(db_session: AsyncSession) -> list[ItemNCFAS]:
    return list((await db_session.execute(select(ItemNCFAS))).scalars().all())


async def _clave_de(item: ItemNCFAS) -> str:
    return f"{item.letra_dimension}_{item.numero_item}"


# ── Items y dimensiones ──────────────────────────────────────────────────────


async def test_las_dimensiones_estan_agrupadas_y_ordenadas(auth_client: AsyncClient):
    res = await auth_client.get("/api/ncfas/items")
    assert res.status_code == 200, res.text
    dimensiones = res.json()

    assert [d["letra"] for d in dimensiones] == DIMENSIONES
    assert all(d["nombre"] for d in dimensiones)
    assert all(d["items"] for d in dimensiones)


async def test_los_items_de_cada_dimension_vienen_ordenados_por_numero(
    auth_client: AsyncClient,
):
    for dimension in (await auth_client.get("/api/ncfas/items")).json():
        numeros = [i["numero_item"] for i in dimension["items"]]
        assert numeros == sorted(numeros), dimension["letra"]


async def test_cada_dimension_tiene_exactamente_un_item_general_al_final(
    auth_client: AsyncClient,
):
    for dimension in (await auth_client.get("/api/ncfas/items")).json():
        generales = [i for i in dimension["items"] if i["es_item_general"]]
        assert len(generales) == 1, dimension["letra"]
        assert generales[0]["numero_item"] == max(i["numero_item"] for i in dimension["items"])


async def test_los_items_traen_sus_rubricas(auth_client: AsyncClient):
    dimensiones = (await auth_client.get("/api/ncfas/items")).json()
    con_definiciones = [
        item for d in dimensiones for item in d["items"] if item["definiciones"] is not None
    ]
    assert con_definiciones, "ningun item trae rubricas"
    assert all(isinstance(i["definiciones"], dict) for i in con_definiciones)


async def test_los_items_caen_al_json_si_la_tabla_esta_vacia(
    auth_client: AsyncClient, db_session: AsyncSession
):
    for item in await _items(db_session):
        await db_session.delete(item)
    await db_session.commit()

    res = await auth_client.get("/api/ncfas/items")
    assert res.status_code == 200, res.text
    dimensiones = res.json()
    assert [d["letra"] for d in dimensiones] == DIMENSIONES
    assert all(d["items"] for d in dimensiones)


async def test_el_fallback_del_json_conserva_el_item_general(
    auth_client: AsyncClient, db_session: AsyncSession
):
    for item in await _items(db_session):
        await db_session.delete(item)
    await db_session.commit()

    for dimension in (await auth_client.get("/api/ncfas/items")).json():
        generales = [i for i in dimension["items"] if i["es_item_general"]]
        assert len(generales) == 1, dimension["letra"]


# ── CRUD ─────────────────────────────────────────────────────────────────────


async def test_listado_empieza_vacio(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    assert (await auth_client.get(f"/api/nna/{nna['id_nna']}/ncfas")).json() == []


async def test_listado_por_familiar_empieza_vacio(auth_client: AsyncClient):
    familiar = await crear_familiar(auth_client)
    res = await auth_client.get(f"/api/familiares/{familiar['id_familiar']}/ncfas")
    assert res.status_code == 200
    assert res.json() == []


async def test_alta_con_todos_los_campos(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)

    res = await auth_client.post(
        f"/api/nna/{nna['id_nna']}/ncfas",
        json={
            "id_familiar": familiar["id_familiar"],
            "es_reunificacion": True,
            "fecha_apertura": "2024-05-01",
            "fecha_cierre": None,
            "estado": "Ingreso completado",
            "observacion_general": "Padre no se presentó a la última sesión.",
        },
    )
    assert res.status_code == 201, res.text
    cuerpo = res.json()
    assert cuerpo["es_reunificacion"] is True
    assert cuerpo["estado"] == "Ingreso completado"
    assert cuerpo["id_caso"] == await caso_activo_id(auth_client, nna["id_nna"])


async def test_alta_minima(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)

    res = await auth_client.post(
        f"/api/nna/{nna['id_nna']}/ncfas", json={"id_familiar": familiar["id_familiar"]}
    )
    assert res.status_code == 201, res.text
    assert res.json()["es_reunificacion"] is False
    assert res.json()["estado"] is None


async def test_listado_por_familiar_devuelve_la_evaluacion(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    creado = await crear_ncfas(auth_client, nna["id_nna"], familiar["id_familiar"])

    listado = (await auth_client.get(f"/api/familiares/{familiar['id_familiar']}/ncfas")).json()
    assert [n["id_ncfas"] for n in listado] == [creado["id_ncfas"]]


async def test_listado_filtra_por_caso(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    id_nna = nna["id_nna"]
    activo = await caso_activo_id(auth_client, id_nna)
    await crear_ncfas(auth_client, id_nna, familiar["id_familiar"])

    await auth_client.put(f"/api/casos/{activo}", json={"estado": "Cerrado"})
    await auth_client.post(f"/api/nna/{id_nna}/casos", json={})
    await crear_ncfas(auth_client, id_nna, familiar["id_familiar"])

    assert len((await auth_client.get(f"/api/nna/{id_nna}/ncfas")).json()) == 2
    solo_activo = (await auth_client.get(f"/api/nna/{id_nna}/ncfas?id_caso={activo}")).json()
    assert len(solo_activo) == 1
    assert solo_activo[0]["id_caso"] == activo


async def test_consulta_por_id(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    creado = await crear_ncfas(auth_client, nna["id_nna"], familiar["id_familiar"])

    res = await auth_client.get(f"/api/ncfas/{creado['id_ncfas']}")
    assert res.status_code == 200
    assert res.json() == creado


async def test_consulta_inexistente_devuelve_404(auth_client: AsyncClient):
    res = await auth_client.get(f"/api/ncfas/{uuid.uuid4()}")
    assert res.status_code == 404
    assert res.json()["detail"] == "NCFAS no encontrado"


async def test_actualizacion_parcial(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    creado = await crear_ncfas(auth_client, nna["id_nna"], familiar["id_familiar"])

    res = await auth_client.put(
        f"/api/ncfas/{creado['id_ncfas']}",
        json={"estado": "Cierre completado", "fecha_cierre": "2024-12-31"},
    )
    assert res.status_code == 200, res.text
    assert res.json()["estado"] == "Cierre completado"
    assert res.json()["fecha_cierre"] == "2024-12-31"
    assert res.json()["fecha_apertura"] == creado["fecha_apertura"]


async def test_actualizacion_inexistente_devuelve_404(auth_client: AsyncClient):
    res = await auth_client.put(f"/api/ncfas/{uuid.uuid4()}", json={"estado": "x"})
    assert res.status_code == 404


# ── Respuestas ───────────────────────────────────────────────────────────────


async def test_alta_con_respuestas_normaliza_las_filas(
    auth_client: AsyncClient, db_session: AsyncSession
):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    items = await _items(db_session)
    respuestas = {
        "Ingreso": {await _clave_de(items[0]): "+2", await _clave_de(items[1]): "-1"},
        "Cierre": {await _clave_de(items[0]): "+1"},
    }

    res = await auth_client.post(
        f"/api/nna/{nna['id_nna']}/ncfas",
        json={"id_familiar": familiar["id_familiar"], "respuestas": respuestas},
    )
    assert res.status_code == 201, res.text
    assert res.json()["respuestas"] == respuestas

    filas = (
        await db_session.execute(
            select(RespuestaNCFAS).where(RespuestaNCFAS.id_ncfas == uuid.UUID(res.json()["id_ncfas"]))
        )
    ).scalars().all()
    assert len(filas) == 3
    assert {f.momento_evaluacion for f in filas} == {"Ingreso", "Cierre"}


async def test_se_aceptan_los_tres_momentos(
    auth_client: AsyncClient, db_session: AsyncSession
):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    items = await _items(db_session)
    clave = await _clave_de(items[0])

    respuestas = {momento: {clave: "+1"} for momento in MOMENTOS}
    creado = (
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/ncfas",
            json={"id_familiar": familiar["id_familiar"], "respuestas": respuestas},
        )
    ).json()
    assert creado["respuestas"] == respuestas


async def test_se_aceptan_todos_los_puntajes_del_catalogo(
    auth_client: AsyncClient, db_session: AsyncSession
):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    items = await _items(db_session)
    respuestas = {
        "Ingreso": {
            await _clave_de(item): puntaje
            for item, puntaje in zip(items, PUNTAJES_VALIDOS, strict=False)
        }
    }

    creado = (
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/ncfas",
            json={"id_familiar": familiar["id_familiar"], "respuestas": respuestas},
        )
    ).json()
    assert set(creado["respuestas"]["Ingreso"].values()) == set(PUNTAJES_VALIDOS)


async def test_se_descartan_los_momentos_invalidos(
    auth_client: AsyncClient, db_session: AsyncSession
):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    items = await _items(db_session)
    clave = await _clave_de(items[0])
    respuestas = {
        "Ingreso": {clave: "+1"},
        "Egreso": {clave: "+2"},
        "": {clave: "+2"},
    }

    creado = (
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/ncfas",
            json={"id_familiar": familiar["id_familiar"], "respuestas": respuestas},
        )
    ).json()
    assert creado["respuestas"] == {"Ingreso": {clave: "+1"}}


async def test_se_descartan_los_puntajes_fuera_del_catalogo(
    auth_client: AsyncClient, db_session: AsyncSession
):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    items = await _items(db_session)
    clave_1 = await _clave_de(items[0])
    clave_2 = await _clave_de(items[1])
    respuestas = {"Ingreso": {clave_1: "+1", clave_2: "+5"}}

    creado = (
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/ncfas",
            json={"id_familiar": familiar["id_familiar"], "respuestas": respuestas},
        )
    ).json()
    assert creado["respuestas"] == {"Ingreso": {clave_1: "+1"}}


async def test_se_descartan_los_items_desconocidos(
    auth_client: AsyncClient, db_session: AsyncSession
):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    items = await _items(db_session)
    clave = await _clave_de(items[0])
    respuestas = {"Ingreso": {clave: "+1", "Z_99": "+2", "A_999": "+2", "sin_formato": "+2"}}

    creado = (
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/ncfas",
            json={"id_familiar": familiar["id_familiar"], "respuestas": respuestas},
        )
    ).json()
    assert creado["respuestas"] == {"Ingreso": {clave: "+1"}}


async def test_las_respuestas_aceptan_letra_minuscula(
    auth_client: AsyncClient, db_session: AsyncSession
):
    """``_make_item_key`` usa la letra tal cual: la minuscula no encuentra el item."""
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    items = await _items(db_session)
    item = items[0]

    creado = (
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/ncfas",
            json={
                "id_familiar": familiar["id_familiar"],
                "respuestas": {"Ingreso": {f"{item.letra_dimension.lower()}_{item.numero_item}": "+1"}},
            },
        )
    ).json()
    assert creado["respuestas"] is None


async def test_reenviar_las_mismas_respuestas_no_falla(
    auth_client: AsyncClient, db_session: AsyncSession
):
    """Aunque hay unique ``(id_ncfas, id_item, momento)``, el ciclo es idempotente."""
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    items = await _items(db_session)
    respuestas = {
        "Ingreso": {await _clave_de(items[0]): "+2", await _clave_de(items[1]): "+1"}
    }
    creado = (
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/ncfas",
            json={"id_familiar": familiar["id_familiar"], "respuestas": respuestas},
        )
    ).json()

    for _ in range(2):
        res = await auth_client.put(
            f"/api/ncfas/{creado['id_ncfas']}", json={"respuestas": respuestas}
        )
        assert res.status_code == 200, res.text
        assert res.json()["respuestas"] == respuestas

    filas = (
        await db_session.execute(
            select(RespuestaNCFAS).where(RespuestaNCFAS.id_ncfas == uuid.UUID(creado["id_ncfas"]))
        )
    ).scalars().all()
    assert len(filas) == 2


async def test_reenviar_respuestas_distintas_reemplaza_las_anteriores(
    auth_client: AsyncClient, db_session: AsyncSession
):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    items = await _items(db_session)
    creado = (
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/ncfas",
            json={
                "id_familiar": familiar["id_familiar"],
                "respuestas": {"Ingreso": {await _clave_de(items[0]): "+2"}},
            },
        )
    ).json()

    nuevas = {"Cierre": {await _clave_de(items[2]): "-2"}}
    res = await auth_client.put(
        f"/api/ncfas/{creado['id_ncfas']}", json={"respuestas": nuevas}
    )
    assert res.status_code == 200
    assert res.json()["respuestas"] == nuevas

    filas = (
        await db_session.execute(
            select(RespuestaNCFAS).where(RespuestaNCFAS.id_ncfas == uuid.UUID(creado["id_ncfas"]))
        )
    ).scalars().all()
    assert len(filas) == 1
    assert filas[0].momento_evaluacion == "Cierre"


# ── Comentarios por dimension ────────────────────────────────────────────────


async def test_comentarios_empiezan_vacios(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    creado = await crear_ncfas(auth_client, nna["id_nna"], familiar["id_familiar"])

    res = await auth_client.get(f"/api/ncfas/{creado['id_ncfas']}/comentarios")
    assert res.status_code == 200
    assert res.json() == []


async def test_crear_un_comentario(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    creado = await crear_ncfas(auth_client, nna["id_nna"], familiar["id_familiar"])

    res = await auth_client.put(
        f"/api/ncfas/{creado['id_ncfas']}/comentarios/A", json={"comentario": "Fortaleza clara."}
    )
    assert res.status_code == 200, res.text
    cuerpo = res.json()
    assert cuerpo["letra_dimension"] == "A"
    assert cuerpo["comentario"] == "Fortaleza clara."
    assert cuerpo["id_ncfas"] == creado["id_ncfas"]


async def test_el_comentario_es_un_upsert(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    creado = await crear_ncfas(auth_client, nna["id_nna"], familiar["id_familiar"])
    id_ncfas = creado["id_ncfas"]

    primero = (
        await auth_client.put(
            f"/api/ncfas/{id_ncfas}/comentarios/B", json={"comentario": "Primero"}
        )
    ).json()
    segundo = (
        await auth_client.put(
            f"/api/ncfas/{id_ncfas}/comentarios/B", json={"comentario": "Segundo"}
        )
    ).json()

    assert segundo["id_comentario_ncfas"] == primero["id_comentario_ncfas"]
    assert segundo["comentario"] == "Segundo"

    listado = (await auth_client.get(f"/api/ncfas/{id_ncfas}/comentarios")).json()
    assert len(listado) == 1


async def test_la_letra_se_normaliza_a_mayusculas(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    creado = await crear_ncfas(auth_client, nna["id_nna"], familiar["id_familiar"])
    id_ncfas = creado["id_ncfas"]

    minuscula = (
        await auth_client.put(
            f"/api/ncfas/{id_ncfas}/comentarios/c", json={"comentario": "Desde minúscula"}
        )
    ).json()
    assert minuscula["letra_dimension"] == "C"

    # El upsert con la letra en mayúscula actualiza el mismo registro.
    mayuscula = (
        await auth_client.put(
            f"/api/ncfas/{id_ncfas}/comentarios/C", json={"comentario": "Desde mayúscula"}
        )
    ).json()
    assert mayuscula["id_comentario_ncfas"] == minuscula["id_comentario_ncfas"]
    assert mayuscula["comentario"] == "Desde mayúscula"

    assert len((await auth_client.get(f"/api/ncfas/{id_ncfas}/comentarios")).json()) == 1


async def test_varios_comentarios_por_evaluacion(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    creado = await crear_ncfas(auth_client, nna["id_nna"], familiar["id_familiar"])
    id_ncfas = creado["id_ncfas"]

    for letra in ("A", "B", "C"):
        res = await auth_client.put(
            f"/api/ncfas/{id_ncfas}/comentarios/{letra}", json={"comentario": f"Nota {letra}"}
        )
        assert res.status_code == 200

    listado = (await auth_client.get(f"/api/ncfas/{id_ncfas}/comentarios")).json()
    assert [c["letra_dimension"] for c in listado] == ["A", "B", "C"]


async def test_comentario_sobre_una_evaluacion_inexistente_devuelve_404(
    auth_client: AsyncClient,
):
    res = await auth_client.put(
        f"/api/ncfas/{uuid.uuid4()}/comentarios/A", json={"comentario": "x"}
    )
    assert res.status_code == 404
    assert res.json()["detail"] == "NCFAS no encontrado"


async def test_comentario_sin_cuerpo_devuelve_422(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    creado = await crear_ncfas(auth_client, nna["id_nna"], familiar["id_familiar"])

    res = await auth_client.put(f"/api/ncfas/{creado['id_ncfas']}/comentarios/A", json={})
    assert res.status_code == 422


async def test_los_comentarios_se_borran_junto_con_los_de_otra_evaluacion(
    auth_client: AsyncClient, db_session: AsyncSession
):
    """Los comentarios se separan por ``id_ncfas``."""
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    uno = await crear_ncfas(auth_client, nna["id_nna"], familiar["id_familiar"])
    dos = await crear_ncfas(auth_client, nna["id_nna"], familiar["id_familiar"])

    await auth_client.put(
        f"/api/ncfas/{uno['id_ncfas']}/comentarios/A", json={"comentario": "Del primero"}
    )

    assert len((await auth_client.get(f"/api/ncfas/{uno['id_ncfas']}/comentarios")).json()) == 1
    assert (await auth_client.get(f"/api/ncfas/{dos['id_ncfas']}/comentarios")).json() == []

    total = (await db_session.execute(select(ComentarioDimensionNCFAS))).scalars().all()
    assert len(total) == 1
