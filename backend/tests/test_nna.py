"""Pruebas de ``/api/nna``: listado, alta, consulta y actualizacion parcial."""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.exc import IntegrityError

from tests.factories import caso_activo_id, crear_caso, crear_nna


# ── Listado ──────────────────────────────────────────────────────────────────


async def test_listado_empieza_vacio(auth_client: AsyncClient):
    res = await auth_client.get("/api/nna")
    assert res.status_code == 200
    assert res.json() == []


async def test_listado_devuelve_el_estado_del_caso_activo(auth_client: AsyncClient):
    await crear_nna(auth_client)

    res = await auth_client.get("/api/nna")
    assert res.status_code == 200
    (nna,) = res.json()
    assert nna["estado_caso"] == "En Progreso"


async def test_listado_prioriza_el_caso_activo_sobre_uno_cerrado(
    auth_client: AsyncClient,
):
    nna = await crear_nna(auth_client)
    id_nna = nna["id_nna"]

    primer_caso = await caso_activo_id(auth_client, id_nna)
    res = await auth_client.put(f"/api/casos/{primer_caso}", json={"estado": "Cerrado"})
    assert res.status_code == 200
    await crear_caso(auth_client, id_nna)

    res = await auth_client.get(f"/api/nna/{id_nna}")
    assert res.status_code == 200
    # El detalle no trae estado_caso; el listado si.
    listado = (await auth_client.get("/api/nna")).json()
    assert listado[0]["estado_caso"] == "En Progreso"


async def test_listado_devuelve_cerrado_cuando_no_hay_caso_activo(
    auth_client: AsyncClient,
):
    nna = await crear_nna(auth_client)
    id_caso = await caso_activo_id(auth_client, nna["id_nna"])
    await auth_client.put(f"/api/casos/{id_caso}", json={"estado": "Cerrado"})

    listado = (await auth_client.get("/api/nna")).json()
    assert listado[0]["estado_caso"] == "Cerrado"


async def test_listado_respeta_skip_y_limit(auth_client: AsyncClient):
    for _ in range(3):
        await crear_nna(auth_client)

    completos = (await auth_client.get("/api/nna?skip=0&limit=100")).json()
    assert len(completos) == 3

    primeros_dos = (await auth_client.get("/api/nna?skip=0&limit=2")).json()
    assert len(primeros_dos) == 2
    assert [n["id_nna"] for n in primeros_dos] == [n["id_nna"] for n in completos[:2]]

    ultimo = (await auth_client.get("/api/nna?skip=2&limit=2")).json()
    assert [n["id_nna"] for n in ultimo] == [completos[2]["id_nna"]]


async def test_limit_invalido_devuelve_422(auth_client: AsyncClient):
    res = await auth_client.get("/api/nna?limit=no-es-un-numero")
    assert res.status_code == 422


# ── Alta ─────────────────────────────────────────────────────────────────────


async def test_alta_devuelve_201_y_el_nna_creado(auth_client: AsyncClient):
    res = await auth_client.post(
        "/api/nna",
        json={
            "nombre": "Ana Muñoz",
            "run": "23.456.789-1",
            "fecha_nacimiento": "2011-03-04",
            "sexo": "Femenino",
            "etnia_declarada": "Mapuche",
            "nacionalidad": "Chilena",
            "domicilio": "Av. Matta 1234",
            "poblacion_o_villa": "Villa Frei",
            "comuna": "Santiago",
            "region": "Metropolitana",
        },
    )
    assert res.status_code == 201, res.text
    cuerpo = res.json()
    assert uuid.UUID(cuerpo["id_nna"])
    assert cuerpo["nombre"] == "Ana Muñoz"
    assert cuerpo["run"] == "23.456.789-1"
    assert cuerpo["fecha_nacimiento"] == "2011-03-04"
    assert cuerpo["comuna"] == "Santiago"


async def test_alta_acepta_solo_campos_opcionales_vacios(auth_client: AsyncClient):
    """Todos los campos del NNA son opcionales."""
    res = await auth_client.post("/api/nna", json={})
    assert res.status_code == 201
    assert res.json()["nombre"] is None


async def test_alta_crea_un_caso_activo_automaticamente(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)

    casos = (await auth_client.get(f"/api/nna/{nna['id_nna']}/casos")).json()
    assert len(casos) == 1
    assert casos[0]["estado"] == "En Progreso"
    assert casos[0]["id_nna"] == nna["id_nna"]
    assert casos[0]["fecha_termino"] is None


async def test_alta_con_fecha_invalida_devuelve_422(auth_client: AsyncClient):
    res = await auth_client.post("/api/nna", json={"fecha_nacimiento": "no-es-fecha"})
    assert res.status_code == 422


@pytest.mark.characterization
async def test_alta_con_run_duplicado_propaga_el_error_de_integridad(
    auth_client: AsyncClient,
):
    """Sin manejo de errores de integridad, el duplicado no da 409 sino un 500."""
    await auth_client.post("/api/nna", json={"nombre": "Uno", "run": "11.111.111-1"})

    with pytest.raises(IntegrityError):
        await auth_client.post("/api/nna", json={"nombre": "Dos", "run": "11.111.111-1"})


@pytest.mark.characterization
async def test_alta_con_id_sis_duplicado_propaga_el_error_de_integridad(
    auth_client: AsyncClient,
):
    await auth_client.post("/api/nna", json={"nombre": "Uno", "id_sis": "SIS-1"})

    with pytest.raises(IntegrityError):
        await auth_client.post("/api/nna", json={"nombre": "Dos", "id_sis": "SIS-1"})


# ── Consulta ─────────────────────────────────────────────────────────────────


async def test_consulta_devuelve_el_nna(auth_client: AsyncClient):
    creado = await crear_nna(auth_client)
    res = await auth_client.get(f"/api/nna/{creado['id_nna']}")
    assert res.status_code == 200
    assert res.json()["id_nna"] == creado["id_nna"]
    assert res.json()["nombre"] == creado["nombre"]


async def test_consulta_de_un_id_inexistente_devuelve_404(auth_client: AsyncClient):
    res = await auth_client.get(f"/api/nna/{uuid.uuid4()}")
    assert res.status_code == 404
    assert res.json()["detail"] == "NNA no encontrado"


async def test_consulta_con_uuid_invalido_devuelve_422(auth_client: AsyncClient):
    res = await auth_client.get("/api/nna/no-es-un-uuid")
    assert res.status_code == 422


# ── Actualizacion ────────────────────────────────────────────────────────────


async def test_actualizacion_parcial_no_pisa_los_demas_campos(auth_client: AsyncClient):
    creado = await crear_nna(auth_client)
    id_nna = creado["id_nna"]

    res = await auth_client.put(f"/api/nna/{id_nna}", json={"comuna": "Valparaíso"})
    assert res.status_code == 200, res.text
    cuerpo = res.json()
    assert cuerpo["comuna"] == "Valparaíso"
    assert cuerpo["nombre"] == creado["nombre"]
    assert cuerpo["run"] == creado["run"]
    assert cuerpo["fecha_nacimiento"] == creado["fecha_nacimiento"]
    assert cuerpo["region"] == "Metropolitana"


async def test_actualizacion_permite_dejar_un_campo_en_null(auth_client: AsyncClient):
    creado = await crear_nna(auth_client)
    res = await auth_client.put(
        f"/api/nna/{creado['id_nna']}", json={"comuna": None}
    )
    assert res.status_code == 200
    assert res.json()["comuna"] is None


async def test_actualizacion_vacia_no_cambia_nada(auth_client: AsyncClient):
    creado = await crear_nna(auth_client)
    res = await auth_client.put(f"/api/nna/{creado['id_nna']}", json={})
    assert res.status_code == 200
    for campo, valor in creado.items():
        assert res.json()[campo] == valor


async def test_actualizacion_de_un_id_inexistente_devuelve_404(auth_client: AsyncClient):
    res = await auth_client.put(f"/api/nna/{uuid.uuid4()}", json={"nombre": "X"})
    assert res.status_code == 404
    assert res.json()["detail"] == "NNA no encontrado"


async def test_actualizacion_con_fecha_invalida_devuelve_422(auth_client: AsyncClient):
    creado = await crear_nna(auth_client)
    res = await auth_client.put(
        f"/api/nna/{creado['id_nna']}", json={"fecha_nacimiento": "31-13-2020"}
    )
    assert res.status_code == 422


async def test_el_nna_sigue_siendo_editable_con_su_caso_cerrado(
    auth_client: AsyncClient,
):
    """El NNA no esta agrupado por caso: su ficha siempre es editable."""
    nna = await crear_nna(auth_client)
    id_caso = await caso_activo_id(auth_client, nna["id_nna"])
    await auth_client.put(f"/api/casos/{id_caso}", json={"estado": "Cerrado"})

    res = await auth_client.put(
        f"/api/nna/{nna['id_nna']}", json={"domicilio": "Nueva dirección 999"}
    )
    assert res.status_code == 200
    assert res.json()["domicilio"] == "Nueva dirección 999"
