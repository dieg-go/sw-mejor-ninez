"""Pruebas de ``VinculoNNA``: el grafo de vinculos entre dos NNA.

El servicio normaliza el par para que ``id_nna_1 < id_nna_2`` y la base lo
refuerza con la CheckConstraint ``chk_vinculo_nna_orden``.
"""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.exc import IntegrityError

from tests.factories import crear_nna


async def test_sin_vinculos_el_listado_esta_vacio(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    res = await auth_client.get(f"/api/nna/{nna['id_nna']}/vinculos-nna")
    assert res.status_code == 200
    assert res.json() == []


async def test_alta_devuelve_201_con_el_par_normalizado(auth_client: AsyncClient):
    uno = await crear_nna(auth_client)
    dos = await crear_nna(auth_client)

    res = await auth_client.post(
        f"/api/nna/{uno['id_nna']}/vinculos-nna",
        json={"id_nna_2": dos["id_nna"], "parentesco": "Hermano"},
    )
    assert res.status_code == 201, res.text
    cuerpo = res.json()
    assert uuid.UUID(cuerpo["id_vinculo_nna"])
    assert cuerpo["id_nna_1"] < cuerpo["id_nna_2"]
    assert {cuerpo["id_nna_1"], cuerpo["id_nna_2"]} == {uno["id_nna"], dos["id_nna"]}
    assert cuerpo["parentesco"] == "Hermano"


async def test_el_vinculo_es_visible_desde_ambos_nna(auth_client: AsyncClient):
    uno = await crear_nna(auth_client)
    dos = await crear_nna(auth_client)
    creado = (
        await auth_client.post(
            f"/api/nna/{uno['id_nna']}/vinculos-nna", json={"id_nna_2": dos["id_nna"]}
        )
    ).json()

    desde_uno = (await auth_client.get(f"/api/nna/{uno['id_nna']}/vinculos-nna")).json()
    desde_dos = (await auth_client.get(f"/api/nna/{dos['id_nna']}/vinculos-nna")).json()

    assert [v["id_vinculo_nna"] for v in desde_uno] == [creado["id_vinculo_nna"]]
    assert [v["id_vinculo_nna"] for v in desde_dos] == [creado["id_vinculo_nna"]]


async def test_el_vinculo_no_es_visible_para_un_tercero(auth_client: AsyncClient):
    uno = await crear_nna(auth_client)
    dos = await crear_nna(auth_client)
    tercero = await crear_nna(auth_client)
    await auth_client.post(
        f"/api/nna/{uno['id_nna']}/vinculos-nna", json={"id_nna_2": dos["id_nna"]}
    )

    res = await auth_client.get(f"/api/nna/{tercero['id_nna']}/vinculos-nna")
    assert res.json() == []


async def test_alta_sin_parentesco(auth_client: AsyncClient):
    uno = await crear_nna(auth_client)
    dos = await crear_nna(auth_client)
    res = await auth_client.post(
        f"/api/nna/{uno['id_nna']}/vinculos-nna", json={"id_nna_2": dos["id_nna"]}
    )
    assert res.status_code == 201
    assert res.json()["parentesco"] is None


async def test_alta_sin_id_nna_2_devuelve_422(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    res = await auth_client.post(
        f"/api/nna/{nna['id_nna']}/vinculos-nna", json={"parentesco": "Hermano"}
    )
    assert res.status_code == 422


async def test_consulta_de_un_vinculo(auth_client: AsyncClient):
    uno = await crear_nna(auth_client)
    dos = await crear_nna(auth_client)
    creado = (
        await auth_client.post(
            f"/api/nna/{uno['id_nna']}/vinculos-nna",
            json={"id_nna_2": dos["id_nna"], "parentesco": "Hermano"},
        )
    ).json()

    res = await auth_client.get(f"/api/vinculo-nna/{creado['id_vinculo_nna']}")
    assert res.status_code == 200
    assert res.json() == creado


async def test_consulta_de_un_vinculo_inexistente_devuelve_404(auth_client: AsyncClient):
    res = await auth_client.get(f"/api/vinculo-nna/{uuid.uuid4()}")
    assert res.status_code == 404
    assert res.json()["detail"] == "Vínculo NNA no encontrado"


async def test_actualizacion_del_parentesco(auth_client: AsyncClient):
    uno = await crear_nna(auth_client)
    dos = await crear_nna(auth_client)
    creado = (
        await auth_client.post(
            f"/api/nna/{uno['id_nna']}/vinculos-nna",
            json={"id_nna_2": dos["id_nna"], "parentesco": "Primo"},
        )
    ).json()

    res = await auth_client.put(
        f"/api/vinculo-nna/{creado['id_vinculo_nna']}", json={"parentesco": "Hermano"}
    )
    assert res.status_code == 200
    assert res.json()["parentesco"] == "Hermano"
    assert res.json()["id_nna_1"] == creado["id_nna_1"]


async def test_actualizacion_de_un_vinculo_inexistente_devuelve_404(
    auth_client: AsyncClient,
):
    res = await auth_client.put(f"/api/vinculo-nna/{uuid.uuid4()}", json={"parentesco": "X"})
    assert res.status_code == 404


@pytest.mark.characterization
async def test_el_mismo_par_no_se_puede_vincular_dos_veces(auth_client: AsyncClient):
    """No hay guard de duplicado: el segundo alta rompe el unique del par."""
    uno = await crear_nna(auth_client)
    dos = await crear_nna(auth_client)
    await auth_client.post(
        f"/api/nna/{uno['id_nna']}/vinculos-nna", json={"id_nna_2": dos["id_nna"]}
    )

    with pytest.raises(IntegrityError):
        await auth_client.post(
            f"/api/nna/{dos['id_nna']}/vinculos-nna", json={"id_nna_2": uno["id_nna"]}
        )


@pytest.mark.characterization
async def test_un_nna_no_se_puede_vincular_consigo_mismo(auth_client: AsyncClient):
    """El orden forzado deja el par igual a si mismo y rompe la CheckConstraint."""
    nna = await crear_nna(auth_client)
    with pytest.raises(IntegrityError):
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/vinculos-nna", json={"id_nna_2": nna["id_nna"]}
        )


@pytest.mark.characterization
async def test_alta_con_un_nna_inexistente_propaga_el_error_de_integridad(
    auth_client: AsyncClient,
):
    nna = await crear_nna(auth_client)
    with pytest.raises(IntegrityError):
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/vinculos-nna", json={"id_nna_2": str(uuid.uuid4())}
        )


async def test_multiples_vinculos_del_mismo_nna(auth_client: AsyncClient):
    central = await crear_nna(auth_client)
    for _ in range(3):
        otro = await crear_nna(auth_client)
        res = await auth_client.post(
            f"/api/nna/{central['id_nna']}/vinculos-nna",
            json={"id_nna_2": otro["id_nna"], "parentesco": "Hermano"},
        )
        assert res.status_code == 201

    vinculos = (await auth_client.get(f"/api/nna/{central['id_nna']}/vinculos-nna")).json()
    assert len(vinculos) == 3
