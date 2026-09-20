"""Pruebas de ``/api/familiares`` y de sus antecedentes penales."""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient

from tests.factories import crear_familiar, crear_nna


# ── Familiar CRUD ────────────────────────────────────────────────────────────


async def test_listado_empieza_vacio(auth_client: AsyncClient):
    res = await auth_client.get("/api/familiares")
    assert res.status_code == 200
    assert res.json() == []


async def test_alta_devuelve_201_con_todos_los_campos(auth_client: AsyncClient):
    res = await auth_client.post(
        "/api/familiares",
        json={
            "nombre": "Marta Muñoz",
            "run": "12.345.678-9",
            "fecha_nacimiento": "1986-07-20",
            "direccion": "Av. Matta 1234",
            "numero_telefono": "+56912345678",
            "tiene_antecedentes_penales": False,
        },
    )
    assert res.status_code == 201, res.text
    cuerpo = res.json()
    assert uuid.UUID(cuerpo["id_familiar"])
    assert cuerpo["nombre"] == "Marta Muñoz"
    assert cuerpo["numero_telefono"] == "+56912345678"
    assert cuerpo["tiene_antecedentes_penales"] is False


async def test_alta_sin_campos_crea_un_familiar_vacio(auth_client: AsyncClient):
    res = await auth_client.post("/api/familiares", json={})
    assert res.status_code == 201
    assert res.json()["nombre"] is None
    assert res.json()["tiene_antecedentes_penales"] is False


async def test_listado_respeta_skip_y_limit(auth_client: AsyncClient):
    for _ in range(3):
        await crear_familiar(auth_client)

    assert len((await auth_client.get("/api/familiares")).json()) == 3
    assert len((await auth_client.get("/api/familiares?limit=2")).json()) == 2
    assert len((await auth_client.get("/api/familiares?skip=2")).json()) == 1


async def test_consulta_por_id(auth_client: AsyncClient):
    creado = await crear_familiar(auth_client)
    res = await auth_client.get(f"/api/familiares/{creado['id_familiar']}")
    assert res.status_code == 200
    assert res.json() == creado


async def test_consulta_inexistente_devuelve_404(auth_client: AsyncClient):
    res = await auth_client.get(f"/api/familiares/{uuid.uuid4()}")
    assert res.status_code == 404
    assert res.json()["detail"] == "Familiar no encontrado"


async def test_consulta_con_uuid_invalido_devuelve_422(auth_client: AsyncClient):
    res = await auth_client.get("/api/familiares/abc")
    assert res.status_code == 422


async def test_actualizacion_parcial(auth_client: AsyncClient):
    creado = await crear_familiar(auth_client, nombre="Pedro Muñoz", direccion="Calle Falsa 456")

    res = await auth_client.put(
        f"/api/familiares/{creado['id_familiar']}", json={"numero_telefono": "+56900000000"}
    )
    assert res.status_code == 200
    assert res.json()["numero_telefono"] == "+56900000000"
    assert res.json()["nombre"] == "Pedro Muñoz"
    assert res.json()["direccion"] == "Calle Falsa 456"


async def test_actualizacion_permite_marcar_antecedentes_penales(auth_client: AsyncClient):
    creado = await crear_familiar(auth_client)
    res = await auth_client.put(
        f"/api/familiares/{creado['id_familiar']}",
        json={"tiene_antecedentes_penales": True},
    )
    assert res.status_code == 200
    assert res.json()["tiene_antecedentes_penales"] is True


async def test_actualizacion_inexistente_devuelve_404(auth_client: AsyncClient):
    res = await auth_client.put(f"/api/familiares/{uuid.uuid4()}", json={"nombre": "X"})
    assert res.status_code == 404


async def test_actualizacion_con_fecha_invalida_devuelve_422(auth_client: AsyncClient):
    creado = await crear_familiar(auth_client)
    res = await auth_client.put(
        f"/api/familiares/{creado['id_familiar']}", json={"fecha_nacimiento": "hoy"}
    )
    assert res.status_code == 422


# ── Antecedentes penales ─────────────────────────────────────────────────────


async def test_antecedentes_penales_empiezan_vacios(auth_client: AsyncClient):
    familiar = await crear_familiar(auth_client)
    res = await auth_client.get(f"/api/familiares/{familiar['id_familiar']}/antecedentes-penales")
    assert res.status_code == 200
    assert res.json() == []


async def test_alta_de_antecedente_penal(auth_client: AsyncClient):
    familiar = await crear_familiar(auth_client, tiene_antecedentes_penales=True)
    res = await auth_client.post(
        f"/api/familiares/{familiar['id_familiar']}/antecedentes-penales",
        json={
            "descripcion": "Violencia intrafamiliar — condena 2019",
            "url_documento_adjunto": "/uploads/certificado.pdf",
        },
    )
    assert res.status_code == 201, res.text
    cuerpo = res.json()
    assert cuerpo["id_familiar"] == familiar["id_familiar"]
    assert cuerpo["descripcion"] == "Violencia intrafamiliar — condena 2019"
    assert cuerpo["url_documento_adjunto"] == "/uploads/certificado.pdf"


async def test_alta_de_antecedente_penal_sin_descripcion(auth_client: AsyncClient):
    familiar = await crear_familiar(auth_client)
    res = await auth_client.post(
        f"/api/familiares/{familiar['id_familiar']}/antecedentes-penales", json={}
    )
    assert res.status_code == 201
    assert res.json()["descripcion"] is None


async def test_listado_de_antecedentes_separa_por_familiar(auth_client: AsyncClient):
    uno = await crear_familiar(auth_client)
    dos = await crear_familiar(auth_client)
    await auth_client.post(
        f"/api/familiares/{uno['id_familiar']}/antecedentes-penales",
        json={"descripcion": "Solo del primero"},
    )

    assert len((await auth_client.get(f"/api/familiares/{uno['id_familiar']}/antecedentes-penales")).json()) == 1
    assert len((await auth_client.get(f"/api/familiares/{dos['id_familiar']}/antecedentes-penales")).json()) == 0


async def test_consulta_de_un_antecedente_penal(auth_client: AsyncClient):
    familiar = await crear_familiar(auth_client)
    creado = (
        await auth_client.post(
            f"/api/familiares/{familiar['id_familiar']}/antecedentes-penales",
            json={"descripcion": "Robo"},
        )
    ).json()

    res = await auth_client.get(f"/api/antecedente-penal/{creado['id_antecedente_penal']}")
    assert res.status_code == 200
    assert res.json()["descripcion"] == "Robo"


async def test_consulta_de_un_antecedente_penal_inexistente_devuelve_404(
    auth_client: AsyncClient,
):
    res = await auth_client.get(f"/api/antecedente-penal/{uuid.uuid4()}")
    assert res.status_code == 404
    assert res.json()["detail"] == "Antecedente penal no encontrado"


async def test_actualizacion_de_un_antecedente_penal(auth_client: AsyncClient):
    familiar = await crear_familiar(auth_client)
    creado = (
        await auth_client.post(
            f"/api/familiares/{familiar['id_familiar']}/antecedentes-penales",
            json={"descripcion": "Robo", "url_documento_adjunto": None},
        )
    ).json()

    res = await auth_client.put(
        f"/api/antecedente-penal/{creado['id_antecedente_penal']}",
        json={"descripcion": "Robo con intimidación"},
    )
    assert res.status_code == 200
    assert res.json()["descripcion"] == "Robo con intimidación"


async def test_actualizacion_de_un_antecedente_penal_inexistente_devuelve_404(
    auth_client: AsyncClient,
):
    res = await auth_client.put(f"/api/antecedente-penal/{uuid.uuid4()}", json={"descripcion": "X"})
    assert res.status_code == 404


@pytest.mark.characterization
async def test_el_flag_tiene_antecedentes_penales_no_se_recalcula(
    auth_client: AsyncClient,
):
    """El flag es desnormalizado y el backend no lo mantiene al crear el detalle.

    Ver "Key Conventions & Gotchas" en AGENTS.md: es una divergencia conocida.
    """
    familiar = await crear_familiar(auth_client, tiene_antecedentes_penales=False)
    await auth_client.post(
        f"/api/familiares/{familiar['id_familiar']}/antecedentes-penales",
        json={"descripcion": "Condena vigente"},
    )

    actual = await auth_client.get(f"/api/familiares/{familiar['id_familiar']}")
    assert actual.json()["tiene_antecedentes_penales"] is False


async def test_antecedentes_penales_editable_con_el_caso_cerrado(auth_client: AsyncClient):
    """Los antecedentes penales son del Familiar, no estan agrupados por caso."""
    from tests.factories import caso_activo_id

    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    creado = (
        await auth_client.post(
            f"/api/familiares/{familiar['id_familiar']}/antecedentes-penales",
            json={"descripcion": "Inicial"},
        )
    ).json()
    id_caso = await caso_activo_id(auth_client, nna["id_nna"])
    await auth_client.put(f"/api/casos/{id_caso}", json={"estado": "Cerrado"})

    res = await auth_client.put(
        f"/api/antecedente-penal/{creado['id_antecedente_penal']}",
        json={"descripcion": "Editado con el caso cerrado"},
    )
    assert res.status_code == 200
    assert res.json()["descripcion"] == "Editado con el caso cerrado"
