"""Pruebas de los catalogos: solicitantes, establecimientos y centros de salud.

Los tres routers comparten exactamente el mismo contrato (listar, crear,
consultar, actualizar), asi que se prueban con un unico conjunto
parametrizado.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

import pytest
from httpx import AsyncClient


@dataclass(frozen=True)
class Catalogo:
    nombre: str
    ruta: str
    campo_id: str
    payload: dict
    payload_actualizacion: dict
    detalle_404: str


CATALOGOS = [
    Catalogo(
        nombre="solicitantes",
        ruta="/api/solicitantes",
        campo_id="id_solicitante_ingreso",
        payload={"nombre": "Tribunal de Familia de Valparaíso", "categoria": "Tribunal", "ano_proyecto": 2025},
        payload_actualizacion={"categoria": "PRM"},
        detalle_404="Solicitante de ingreso no encontrado",
    ),
    Catalogo(
        nombre="establecimientos",
        ruta="/api/establecimientos",
        campo_id="id_establecimiento_educacional",
        payload={"nombre": "Liceo Nuevo", "rbd": 12345},
        payload_actualizacion={"rbd": 54321},
        detalle_404="Establecimiento educacional no encontrado",
    ),
    Catalogo(
        nombre="centros-salud",
        ruta="/api/centros-salud",
        campo_id="id_centro_salud",
        payload={"nombre": "CESFAM Nuevo", "tipo_recinto": "CESFAM"},
        payload_actualizacion={"tipo_recinto": "Hospital"},
        detalle_404="Centro de salud no encontrado",
    ),
]

IDS = [c.nombre for c in CATALOGOS]


# ── Datos sembrados ──────────────────────────────────────────────────────────


@pytest.mark.parametrize("catalogo", CATALOGOS, ids=IDS)
async def test_el_seed_deja_datos_en_el_catalogo(auth_client: AsyncClient, catalogo: Catalogo):
    res = await auth_client.get(catalogo.ruta)
    assert res.status_code == 200
    assert len(res.json()) >= 3


async def test_los_solicitantes_sembrados_cubren_las_categorias_del_dominio(
    auth_client: AsyncClient,
):
    categorias = {s["categoria"] for s in (await auth_client.get("/api/solicitantes")).json()}
    assert {"Tribunal", "PIB", "OPD", "PRM", "PRK"} <= categorias


# ── Alta ─────────────────────────────────────────────────────────────────────


@pytest.mark.parametrize("catalogo", CATALOGOS, ids=IDS)
async def test_alta_devuelve_201_y_el_registro(auth_client: AsyncClient, catalogo: Catalogo):
    res = await auth_client.post(catalogo.ruta, json=catalogo.payload)
    assert res.status_code == 201, res.text
    cuerpo = res.json()
    assert uuid.UUID(cuerpo[catalogo.campo_id])
    for campo, valor in catalogo.payload.items():
        assert cuerpo[campo] == valor


@pytest.mark.parametrize("catalogo", CATALOGOS, ids=IDS)
async def test_alta_aparece_en_el_listado(auth_client: AsyncClient, catalogo: Catalogo):
    creado = (await auth_client.post(catalogo.ruta, json=catalogo.payload)).json()
    listado = (await auth_client.get(catalogo.ruta)).json()
    assert creado[catalogo.campo_id] in [r[catalogo.campo_id] for r in listado]


# ── Consulta ─────────────────────────────────────────────────────────────────


@pytest.mark.parametrize("catalogo", CATALOGOS, ids=IDS)
async def test_consulta_por_id(auth_client: AsyncClient, catalogo: Catalogo):
    creado = (await auth_client.post(catalogo.ruta, json=catalogo.payload)).json()
    res = await auth_client.get(f"{catalogo.ruta}/{creado[catalogo.campo_id]}")
    assert res.status_code == 200
    assert res.json() == creado


@pytest.mark.parametrize("catalogo", CATALOGOS, ids=IDS)
async def test_consulta_inexistente_devuelve_404_con_su_mensaje(
    auth_client: AsyncClient, catalogo: Catalogo
):
    res = await auth_client.get(f"{catalogo.ruta}/{uuid.uuid4()}")
    assert res.status_code == 404
    assert res.json()["detail"] == catalogo.detalle_404


# ── Actualizacion ────────────────────────────────────────────────────────────


@pytest.mark.parametrize("catalogo", CATALOGOS, ids=IDS)
async def test_actualizacion_parcial(auth_client: AsyncClient, catalogo: Catalogo):
    creado = (await auth_client.post(catalogo.ruta, json=catalogo.payload)).json()
    res = await auth_client.put(
        f"{catalogo.ruta}/{creado[catalogo.campo_id]}", json=catalogo.payload_actualizacion
    )
    assert res.status_code == 200, res.text
    for campo, valor in catalogo.payload_actualizacion.items():
        assert res.json()[campo] == valor
    # Los campos no enviados se conservan.
    for campo, valor in catalogo.payload.items():
        if campo not in catalogo.payload_actualizacion:
            assert res.json()[campo] == valor


@pytest.mark.parametrize("catalogo", CATALOGOS, ids=IDS)
async def test_actualizacion_inexistente_devuelve_404(
    auth_client: AsyncClient, catalogo: Catalogo
):
    res = await auth_client.put(
        f"{catalogo.ruta}/{uuid.uuid4()}", json=catalogo.payload_actualizacion
    )
    assert res.status_code == 404
    assert res.json()["detail"] == catalogo.detalle_404


# ── Paginacion ───────────────────────────────────────────────────────────────


@pytest.mark.parametrize("catalogo", CATALOGOS, ids=IDS)
async def test_paginacion(auth_client: AsyncClient, catalogo: Catalogo):
    total = len((await auth_client.get(catalogo.ruta)).json())

    limitado = (await auth_client.get(f"{catalogo.ruta}?limit=2")).json()
    assert len(limitado) == min(2, total)

    desplazado = (await auth_client.get(f"{catalogo.ruta}?skip=1&limit=100")).json()
    assert len(desplazado) == max(total - 1, 0)
