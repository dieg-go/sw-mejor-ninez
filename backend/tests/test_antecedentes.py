"""Pruebas de salud, escolar, familiar y vinculo familiar.

Los tres primeros estan agrupados por ``Caso`` (aceptan ``?id_caso=``);
``VinculoFamiliar`` es el grafo estable de relaciones y no lo esta.
"""

import uuid

from httpx import AsyncClient

from tests.factories import (
    caso_activo_id,
    crear_antecedente_escolar,
    crear_antecedente_familiar,
    crear_antecedente_salud,
    crear_familiar,
    crear_nna,
    crear_vinculo_familiar,
)

# (clave, ruta de coleccion, ruta de item, campo id, factory, detalle 404, payload)
GRUPOS = [
    (
        "salud",
        "/api/nna/{id_nna}/antecedentes-salud",
        "/api/antecedente-salud/{id}",
        "id_antecedente_salud",
        crear_antecedente_salud,
        "Antecedente de salud no encontrado",
        {"prevision": "Isapre", "inscrito_en_centro_salud": False},
    ),
    (
        "escolar",
        "/api/nna/{id_nna}/antecedentes-escolares",
        "/api/antecedente-escolar/{id}",
        "id_antecedente_escolar",
        crear_antecedente_escolar,
        "Antecedente escolar no encontrado",
        {"ultimo_ano_cursado": 8, "escolarizado": False},
    ),
    (
        "familiar",
        "/api/nna/{id_nna}/antecedentes-familiares",
        "/api/antecedente-familiar/{id}",
        "id_antecedente_familiar",
        crear_antecedente_familiar,
        "Antecedente familiar no encontrado",
        {"con_quien_vive": "Abuela materna"},
    ),
]

IDS = [g[0] for g in GRUPOS]


# ── Contrato comun de los tres antecedentes agrupados ────────────────────────


async def test_los_antecedentes_empiezan_vacios(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    for _, coleccion, _, _, _, _, _ in GRUPOS:
        res = await auth_client.get(coleccion.format(id_nna=nna["id_nna"]))
        assert res.status_code == 200
        assert res.json() == []


async def test_alta_de_antecedente(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    for _, coleccion, _, _, factory, _, _ in GRUPOS:
        creado = await factory(auth_client, nna["id_nna"])
        assert creado["id_nna"] == nna["id_nna"]


async def test_los_antecedentes_quedan_sellados_con_el_caso_activo(
    auth_client: AsyncClient,
):
    nna = await crear_nna(auth_client)
    id_caso = await caso_activo_id(auth_client, nna["id_nna"])
    for _, _, _, _, factory, _, _ in GRUPOS:
        creado = await factory(auth_client, nna["id_nna"])
        assert creado["id_caso"] == id_caso


async def test_consulta_y_actualizacion_de_antecedente(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    for _, _, item, campo_id, factory, _, payload in GRUPOS:
        creado = await factory(auth_client, nna["id_nna"])
        id_registro = creado[campo_id]

        assert (await auth_client.get(item.format(id=id_registro))).json() == creado

        res = await auth_client.put(item.format(id=id_registro), json=payload)
        assert res.status_code == 200, res.text
        for campo, valor in payload.items():
            assert res.json()[campo] == valor


async def test_antecedente_inexistente_devuelve_404(auth_client: AsyncClient):
    for _, _, item, _, _, detalle, payload in GRUPOS:
        res = await auth_client.get(item.format(id=uuid.uuid4()))
        assert res.status_code == 404
        assert res.json()["detail"] == detalle

        res = await auth_client.put(item.format(id=uuid.uuid4()), json=payload)
        assert res.status_code == 404
        assert res.json()["detail"] == detalle


async def test_los_antecedentes_se_separan_por_nna(auth_client: AsyncClient):
    uno = await crear_nna(auth_client)
    dos = await crear_nna(auth_client)
    for _, coleccion, _, _, factory, _, _ in GRUPOS:
        await factory(auth_client, uno["id_nna"])
        assert len((await auth_client.get(coleccion.format(id_nna=uno["id_nna"]))).json()) == 1
        assert len((await auth_client.get(coleccion.format(id_nna=dos["id_nna"]))).json()) == 0


async def test_los_antecedentes_filtran_por_caso(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    id_nna = nna["id_nna"]
    activo = await caso_activo_id(auth_client, id_nna)

    for _, _, _, _, factory, _, _ in GRUPOS:
        await factory(auth_client, id_nna)

    await auth_client.put(f"/api/casos/{activo}", json={"estado": "Cerrado"})
    await auth_client.post(f"/api/nna/{id_nna}/casos", json={})

    for _, coleccion, _, _, factory, _, _ in GRUPOS:
        await factory(auth_client, id_nna)

        todos = (await auth_client.get(coleccion.format(id_nna=id_nna))).json()
        assert len(todos) == 2

        solo_activo = (
            await auth_client.get(f"{coleccion.format(id_nna=id_nna)}?id_caso={activo}")
        ).json()
        assert len(solo_activo) == 1
        assert solo_activo[0]["id_caso"] == activo


# ── Detalles propios del antecedente de salud ────────────────────────────────


async def test_salud_con_centro_salud_del_catalogo(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    centro = (await auth_client.get("/api/centros-salud")).json()[0]

    creado = await crear_antecedente_salud(
        auth_client, nna["id_nna"], id_centro_salud=centro["id_centro_salud"]
    )
    assert creado["id_centro_salud"] == centro["id_centro_salud"]


async def test_salud_acepta_todos_los_campos(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    res = await auth_client.post(
        f"/api/nna/{nna['id_nna']}/antecedentes-salud",
        json={
            "fecha_antecedente_salud": "2024-04-01",
            "inscrito_en_centro_salud": True,
            "prevision": "Fonasa",
        },
    )
    assert res.status_code == 201
    assert res.json()["fecha_antecedente_salud"] == "2024-04-01"
    assert res.json()["prevision"] == "Fonasa"


# ── Detalles propios del antecedente escolar ─────────────────────────────────


async def test_escolar_con_establecimiento_del_catalogo(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    establecimiento = (await auth_client.get("/api/establecimientos")).json()[0]

    creado = await crear_antecedente_escolar(
        auth_client,
        nna["id_nna"],
        id_establecimiento_educacional=establecimiento["id_establecimiento_educacional"],
    )
    assert (
        creado["id_establecimiento_educacional"]
        == establecimiento["id_establecimiento_educacional"]
    )


async def test_escolar_sin_establecimiento_es_valido(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    creado = await crear_antecedente_escolar(
        auth_client, nna["id_nna"], id_establecimiento_educacional=None, escolarizado=False
    )
    assert creado["id_establecimiento_educacional"] is None
    assert creado["escolarizado"] is False


# ── Detalles propios del antecedente familiar ────────────────────────────────


async def test_familiar_con_adulto_responsable(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)

    creado = await crear_antecedente_familiar(
        auth_client, nna["id_nna"], id_adulto_responsable=familiar["id_familiar"]
    )
    assert creado["id_adulto_responsable"] == familiar["id_familiar"]


async def test_familiar_acepta_detalle_de_convivencia(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    creado = await crear_antecedente_familiar(
        auth_client,
        nna["id_nna"],
        con_quien_vive="Abuela materna",
        con_quien_vive_detalle="Madre con régimen de visitas supervisadas",
    )
    assert creado["con_quien_vive_detalle"] == "Madre con régimen de visitas supervisadas"


# ── Vinculo familiar ─────────────────────────────────────────────────────────


async def test_vinculos_familiares_empiezan_vacios(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    res = await auth_client.get(f"/api/nna/{nna['id_nna']}/vinculos")
    assert res.status_code == 200
    assert res.json() == []


async def test_alta_de_vinculo_familiar(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)

    creado = await crear_vinculo_familiar(auth_client, nna["id_nna"], familiar["id_familiar"])
    assert creado["id_nna"] == nna["id_nna"]
    assert creado["id_familiar"] == familiar["id_familiar"]
    assert creado["parentesco"] == "Madre"
    assert "id_caso" not in creado


async def test_varios_vinculos_por_nna(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    for parentesco in ("Madre", "Padre", "Tío"):
        familiar = await crear_familiar(auth_client)
        await crear_vinculo_familiar(
            auth_client, nna["id_nna"], familiar["id_familiar"], parentesco=parentesco
        )

    listado = (await auth_client.get(f"/api/nna/{nna['id_nna']}/vinculos")).json()
    assert {v["parentesco"] for v in listado} == {"Madre", "Padre", "Tío"}


async def test_consulta_y_actualizacion_de_vinculo_familiar(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    creado = await crear_vinculo_familiar(auth_client, nna["id_nna"], familiar["id_familiar"])
    id_vinculo = creado["id_vinculo_familiar"]

    assert (await auth_client.get(f"/api/vinculo-familiar/{id_vinculo}")).json() == creado

    res = await auth_client.put(
        f"/api/vinculo-familiar/{id_vinculo}", json={"parentesco": "Madre biológica"}
    )
    assert res.status_code == 200
    assert res.json()["parentesco"] == "Madre biológica"
    assert res.json()["id_familiar"] == familiar["id_familiar"]


async def test_vinculo_familiar_inexistente_devuelve_404(auth_client: AsyncClient):
    res = await auth_client.get(f"/api/vinculo-familiar/{uuid.uuid4()}")
    assert res.status_code == 404
    assert res.json()["detail"] == "Vínculo familiar no encontrado"
    assert (
        await auth_client.put(
            f"/api/vinculo-familiar/{uuid.uuid4()}", json={"parentesco": "X"}
        )
    ).status_code == 404


async def test_el_mismo_familiar_puede_estar_en_dos_nna(auth_client: AsyncClient):
    uno = await crear_nna(auth_client)
    dos = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client, nombre="Marta Muñoz")

    await crear_vinculo_familiar(auth_client, uno["id_nna"], familiar["id_familiar"])
    res = await crear_vinculo_familiar(auth_client, dos["id_nna"], familiar["id_familiar"])
    assert res["id_familiar"] == familiar["id_familiar"]
