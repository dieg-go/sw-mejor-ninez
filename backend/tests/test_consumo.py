"""Pruebas de ``HistorialConsumoNNA`` y ``HistorialConsumoAdulto``.

Ninguno de los dos esta agrupado por ``Caso``: son entidades de nivel NNA y
Familiar respectivamente. Por eso solo se comprueba el CRUD, la separacion por
padre y el 404.
"""

import uuid

from httpx import AsyncClient

from tests.factories import crear_familiar, crear_nna


# ── Consumo del NNA ──────────────────────────────────────────────────────────


async def test_consumo_nna_empieza_vacio(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    res = await auth_client.get(f"/api/nna/{nna['id_nna']}/historial-consumo")
    assert res.status_code == 200
    assert res.json() == []


async def test_alta_de_consumo_nna(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    res = await auth_client.post(
        f"/api/nna/{nna['id_nna']}/historial-consumo",
        json={
            "nombre_sustancia": "Alcohol",
            "consumo_indirecto_gestacional": True,
            "estado_consumo": "Inactivo",
            "fecha_inicio": "2010-05-01",
            "fecha_termino": "2011-01-01",
            "en_tratamiento": False,
        },
    )
    assert res.status_code == 201, res.text
    cuerpo = res.json()
    assert cuerpo["id_nna"] == nna["id_nna"]
    assert cuerpo["nombre_sustancia"] == "Alcohol"
    assert cuerpo["consumo_indirecto_gestacional"] is True
    assert cuerpo["en_tratamiento"] is False


async def test_alta_minima_de_consumo_nna(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    res = await auth_client.post(f"/api/nna/{nna['id_nna']}/historial-consumo", json={})
    assert res.status_code == 201
    assert res.json()["nombre_sustancia"] is None
    assert res.json()["en_tratamiento"] is False


async def test_los_registros_de_consumo_se_separan_por_nna(auth_client: AsyncClient):
    uno = await crear_nna(auth_client)
    dos = await crear_nna(auth_client)
    await auth_client.post(
        f"/api/nna/{uno['id_nna']}/historial-consumo", json={"nombre_sustancia": "Alcohol"}
    )

    assert len((await auth_client.get(f"/api/nna/{uno['id_nna']}/historial-consumo")).json()) == 1
    assert len((await auth_client.get(f"/api/nna/{dos['id_nna']}/historial-consumo")).json()) == 0


async def test_consulta_de_un_consumo_nna(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    creado = (
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/historial-consumo", json={"nombre_sustancia": "Alcohol"}
        )
    ).json()

    res = await auth_client.get(f"/api/historial-consumo-nna/{creado['id_historial_consumo_nna']}")
    assert res.status_code == 200
    assert res.json() == creado


async def test_consumo_nna_inexistente_devuelve_404(auth_client: AsyncClient):
    res = await auth_client.get(f"/api/historial-consumo-nna/{uuid.uuid4()}")
    assert res.status_code == 404
    assert res.json()["detail"] == "Historial de consumo no encontrado"
    assert (
        await auth_client.put(
            f"/api/historial-consumo-nna/{uuid.uuid4()}", json={"estado_consumo": "X"}
        )
    ).status_code == 404


async def test_actualizacion_de_consumo_nna(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    creado = (
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/historial-consumo",
            json={"nombre_sustancia": "Alcohol", "estado_consumo": "Activo"},
        )
    ).json()

    res = await auth_client.put(
        f"/api/historial-consumo-nna/{creado['id_historial_consumo_nna']}",
        json={"estado_consumo": "En tratamiento", "en_tratamiento": True},
    )
    assert res.status_code == 200
    assert res.json()["estado_consumo"] == "En tratamiento"
    assert res.json()["en_tratamiento"] is True
    assert res.json()["nombre_sustancia"] == "Alcohol"


async def test_varios_consumos_por_nna(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    for sustancia in ("Alcohol", "Marihuana", "Pasta base de cocaína"):
        res = await auth_client.post(
            f"/api/nna/{nna['id_nna']}/historial-consumo", json={"nombre_sustancia": sustancia}
        )
        assert res.status_code == 201

    listado = (await auth_client.get(f"/api/nna/{nna['id_nna']}/historial-consumo")).json()
    assert {c["nombre_sustancia"] for c in listado} == {
        "Alcohol",
        "Marihuana",
        "Pasta base de cocaína",
    }


# ── Consumo del adulto ───────────────────────────────────────────────────────


async def test_consumo_adulto_empieza_vacio(auth_client: AsyncClient):
    familiar = await crear_familiar(auth_client)
    res = await auth_client.get(f"/api/familiares/{familiar['id_familiar']}/historial-consumo")
    assert res.status_code == 200
    assert res.json() == []


async def test_alta_de_consumo_adulto(auth_client: AsyncClient):
    familiar = await crear_familiar(auth_client)
    res = await auth_client.post(
        f"/api/familiares/{familiar['id_familiar']}/historial-consumo",
        json={
            "nombre_sustancia": "Pasta base de cocaína",
            "estado_consumo": "Activo",
            "fecha_inicio": "2020-01-01",
            "en_tratamiento": False,
        },
    )
    assert res.status_code == 201, res.text
    cuerpo = res.json()
    assert cuerpo["id_familiar"] == familiar["id_familiar"]
    assert cuerpo["estado_consumo"] == "Activo"
    assert "consumo_indirecto_gestacional" not in cuerpo


async def test_los_registros_de_consumo_adulto_se_separan_por_familiar(
    auth_client: AsyncClient,
):
    uno = await crear_familiar(auth_client)
    dos = await crear_familiar(auth_client)
    await auth_client.post(
        f"/api/familiares/{uno['id_familiar']}/historial-consumo",
        json={"nombre_sustancia": "Alcohol"},
    )

    assert len(
        (await auth_client.get(f"/api/familiares/{uno['id_familiar']}/historial-consumo")).json()
    ) == 1
    assert len(
        (await auth_client.get(f"/api/familiares/{dos['id_familiar']}/historial-consumo")).json()
    ) == 0


async def test_consulta_y_actualizacion_de_consumo_adulto(auth_client: AsyncClient):
    familiar = await crear_familiar(auth_client)
    creado = (
        await auth_client.post(
            f"/api/familiares/{familiar['id_familiar']}/historial-consumo",
            json={"nombre_sustancia": "Alcohol"},
        )
    ).json()
    id_consumo = creado["id_historial_consumo_adulto"]

    assert (await auth_client.get(f"/api/historial-consumo-adulto/{id_consumo}")).json() == creado

    res = await auth_client.put(
        f"/api/historial-consumo-adulto/{id_consumo}", json={"en_tratamiento": True}
    )
    assert res.status_code == 200
    assert res.json()["en_tratamiento"] is True


async def test_consumo_adulto_inexistente_devuelve_404(auth_client: AsyncClient):
    res = await auth_client.get(f"/api/historial-consumo-adulto/{uuid.uuid4()}")
    assert res.status_code == 404
    assert res.json()["detail"] == "Historial de consumo no encontrado"
    assert (
        await auth_client.put(
            f"/api/historial-consumo-adulto/{uuid.uuid4()}", json={"estado_consumo": "X"}
        )
    ).status_code == 404


async def test_el_consumo_del_nna_no_es_accesible_por_la_ruta_del_adulto(
    auth_client: AsyncClient,
):
    nna = await crear_nna(auth_client)
    creado = (
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/historial-consumo", json={"nombre_sustancia": "Alcohol"}
        )
    ).json()

    res = await auth_client.get(
        f"/api/historial-consumo-adulto/{creado['id_historial_consumo_nna']}"
    )
    assert res.status_code == 404
