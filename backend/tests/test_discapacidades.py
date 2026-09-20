"""Pruebas de ``DiscapacidadNNA`` y ``DiscapacidadAdulto``.

Nivel NNA y Familiar: no estan agrupadas por ``Caso``.
"""

import uuid

from httpx import AsyncClient

from tests.factories import crear_familiar, crear_nna


# ── Discapacidad del NNA ─────────────────────────────────────────────────────


async def test_discapacidades_nna_empiezan_vacias(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    res = await auth_client.get(f"/api/nna/{nna['id_nna']}/discapacidades")
    assert res.status_code == 200
    assert res.json() == []


async def test_alta_de_discapacidad_nna(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    res = await auth_client.post(
        f"/api/nna/{nna['id_nna']}/discapacidades",
        json={
            "tipo": "Auditiva",
            "porcentaje_grado": 35,
            "observacion": "Hipoacusia unilateral moderada.",
        },
    )
    assert res.status_code == 201, res.text
    cuerpo = res.json()
    assert cuerpo["id_nna"] == nna["id_nna"]
    assert cuerpo["tipo"] == "Auditiva"
    assert cuerpo["porcentaje_grado"] == 35


async def test_alta_minima_de_discapacidad_nna(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    res = await auth_client.post(f"/api/nna/{nna['id_nna']}/discapacidades", json={})
    assert res.status_code == 201
    assert res.json()["porcentaje_grado"] is None


async def test_separacion_de_discapacidades_por_nna(auth_client: AsyncClient):
    uno = await crear_nna(auth_client)
    dos = await crear_nna(auth_client)
    await auth_client.post(
        f"/api/nna/{uno['id_nna']}/discapacidades", json={"tipo": "Visual"}
    )

    assert len((await auth_client.get(f"/api/nna/{uno['id_nna']}/discapacidades")).json()) == 1
    assert len((await auth_client.get(f"/api/nna/{dos['id_nna']}/discapacidades")).json()) == 0


async def test_consulta_de_una_discapacidad_nna(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    creado = (
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/discapacidades", json={"tipo": "Motora"}
        )
    ).json()

    res = await auth_client.get(f"/api/discapacidad-nna/{creado['id_discapacidad_nna']}")
    assert res.status_code == 200
    assert res.json() == creado


async def test_discapacidad_nna_inexistente_devuelve_404(auth_client: AsyncClient):
    res = await auth_client.get(f"/api/discapacidad-nna/{uuid.uuid4()}")
    assert res.status_code == 404
    assert res.json()["detail"] == "Discapacidad no encontrada"
    assert (
        await auth_client.put(f"/api/discapacidad-nna/{uuid.uuid4()}", json={"tipo": "X"})
    ).status_code == 404


async def test_actualizacion_de_una_discapacidad_nna(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    creado = (
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/discapacidades",
            json={"tipo": "Auditiva", "porcentaje_grado": 35},
        )
    ).json()

    res = await auth_client.put(
        f"/api/discapacidad-nna/{creado['id_discapacidad_nna']}",
        json={"porcentaje_grado": 40, "observacion": "Reevaluada."},
    )
    assert res.status_code == 200
    assert res.json()["porcentaje_grado"] == 40
    assert res.json()["observacion"] == "Reevaluada."
    assert res.json()["tipo"] == "Auditiva"


async def test_porcentaje_no_numerico_devuelve_422(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    res = await auth_client.post(
        f"/api/nna/{nna['id_nna']}/discapacidades", json={"porcentaje_grado": "mucho"}
    )
    assert res.status_code == 422


# ── Discapacidad del adulto ──────────────────────────────────────────────────


async def test_discapacidades_adulto_empiezan_vacias(auth_client: AsyncClient):
    familiar = await crear_familiar(auth_client)
    res = await auth_client.get(f"/api/familiares/{familiar['id_familiar']}/discapacidades")
    assert res.status_code == 200
    assert res.json() == []


async def test_alta_de_discapacidad_adulto(auth_client: AsyncClient):
    familiar = await crear_familiar(auth_client)
    res = await auth_client.post(
        f"/api/familiares/{familiar['id_familiar']}/discapacidades",
        json={"tipo": "Intelectual", "porcentaje_grado": 60},
    )
    assert res.status_code == 201, res.text
    assert res.json()["id_familiar"] == familiar["id_familiar"]
    assert res.json()["tipo"] == "Intelectual"


async def test_separacion_de_discapacidades_por_familiar(auth_client: AsyncClient):
    uno = await crear_familiar(auth_client)
    dos = await crear_familiar(auth_client)
    await auth_client.post(
        f"/api/familiares/{uno['id_familiar']}/discapacidades", json={"tipo": "Visual"}
    )

    assert len(
        (await auth_client.get(f"/api/familiares/{uno['id_familiar']}/discapacidades")).json()
    ) == 1
    assert len(
        (await auth_client.get(f"/api/familiares/{dos['id_familiar']}/discapacidades")).json()
    ) == 0


async def test_consulta_y_actualizacion_de_discapacidad_adulto(auth_client: AsyncClient):
    familiar = await crear_familiar(auth_client)
    creado = (
        await auth_client.post(
            f"/api/familiares/{familiar['id_familiar']}/discapacidades", json={"tipo": "Visual"}
        )
    ).json()
    id_disc = creado["id_discapacidad_adulto"]

    assert (await auth_client.get(f"/api/discapacidad-adulto/{id_disc}")).json() == creado

    res = await auth_client.put(
        f"/api/discapacidad-adulto/{id_disc}", json={"observacion": "Requiere apoyo."}
    )
    assert res.status_code == 200
    assert res.json()["observacion"] == "Requiere apoyo."
    assert res.json()["tipo"] == "Visual"


async def test_discapacidad_adulto_inexistente_devuelve_404(auth_client: AsyncClient):
    res = await auth_client.get(f"/api/discapacidad-adulto/{uuid.uuid4()}")
    assert res.status_code == 404
    assert res.json()["detail"] == "Discapacidad no encontrada"
    assert (
        await auth_client.put(f"/api/discapacidad-adulto/{uuid.uuid4()}", json={"tipo": "X"})
    ).status_code == 404


async def test_la_discapacidad_del_nna_no_es_accesible_por_la_ruta_del_adulto(
    auth_client: AsyncClient,
):
    nna = await crear_nna(auth_client)
    creado = (
        await auth_client.post(f"/api/nna/{nna['id_nna']}/discapacidades", json={"tipo": "Visual"})
    ).json()

    res = await auth_client.get(f"/api/discapacidad-adulto/{creado['id_discapacidad_nna']}")
    assert res.status_code == 404
