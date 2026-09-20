"""Pruebas de la dependencia global ``get_current_user``.

Todos los routers salvo ``auth`` se registran con
``dependencies=[Depends(get_current_user)]``. La convencion de FastAPI para
``HTTPBearer`` sin header es **403** (no 401), y el proyecto no la modifica;
estas pruebas fijan esa convencion ruta por ruta.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient

ID = "00000000-0000-0000-0000-000000000000"

# Una ruta representativa por cada router protegido.
RUTAS_PROTEGIDAS = [
    ("GET", "/api/nna"),
    ("POST", "/api/nna"),
    ("GET", f"/api/nna/{ID}"),
    ("PUT", f"/api/nna/{ID}"),
    ("GET", f"/api/nna/{ID}/casos"),
    ("POST", f"/api/nna/{ID}/casos"),
    ("GET", f"/api/casos/{ID}"),
    ("PUT", f"/api/casos/{ID}"),
    ("GET", "/api/familiares"),
    ("POST", "/api/familiares"),
    ("GET", f"/api/familiares/{ID}"),
    ("PUT", f"/api/familiares/{ID}"),
    ("GET", f"/api/familiares/{ID}/antecedentes-penales"),
    ("POST", f"/api/familiares/{ID}/antecedentes-penales"),
    ("GET", "/api/antecedente-penal/" + ID),
    ("PUT", "/api/antecedente-penal/" + ID),
    ("GET", f"/api/nna/{ID}/historial-consumo"),
    ("POST", f"/api/nna/{ID}/historial-consumo"),
    ("GET", "/api/historial-consumo-nna/" + ID),
    ("PUT", "/api/historial-consumo-nna/" + ID),
    ("GET", f"/api/familiares/{ID}/historial-consumo"),
    ("POST", f"/api/familiares/{ID}/historial-consumo"),
    ("GET", "/api/historial-consumo-adulto/" + ID),
    ("PUT", "/api/historial-consumo-adulto/" + ID),
    ("GET", f"/api/nna/{ID}/discapacidades"),
    ("POST", f"/api/nna/{ID}/discapacidades"),
    ("GET", "/api/discapacidad-nna/" + ID),
    ("PUT", "/api/discapacidad-nna/" + ID),
    ("GET", f"/api/familiares/{ID}/discapacidades"),
    ("POST", f"/api/familiares/{ID}/discapacidades"),
    ("GET", "/api/discapacidad-adulto/" + ID),
    ("PUT", "/api/discapacidad-adulto/" + ID),
    ("GET", f"/api/nna/{ID}/antecedentes-ingreso"),
    ("POST", f"/api/nna/{ID}/antecedentes-ingreso"),
    ("GET", "/api/antecedente-ingreso/" + ID),
    ("PUT", "/api/antecedente-ingreso/" + ID),
    ("GET", f"/api/antecedente-ingreso/{ID}/causales"),
    ("POST", f"/api/antecedente-ingreso/{ID}/causales"),
    ("GET", "/api/causal-ingreso/" + ID),
    ("PUT", "/api/causal-ingreso/" + ID),
    ("GET", f"/api/antecedente-ingreso/{ID}/derechos-vulnerados"),
    ("POST", f"/api/antecedente-ingreso/{ID}/derechos-vulnerados"),
    ("GET", "/api/derecho-vulnerado/" + ID),
    ("PUT", "/api/derecho-vulnerado/" + ID),
    ("GET", f"/api/nna/{ID}/documentacion-ingreso"),
    ("POST", f"/api/nna/{ID}/documentacion-ingreso"),
    ("GET", "/api/documentacion-ingreso/" + ID),
    ("PUT", "/api/documentacion-ingreso/" + ID),
    ("GET", f"/api/nna/{ID}/historial-red"),
    ("POST", f"/api/nna/{ID}/historial-red"),
    ("GET", "/api/historial-red/" + ID),
    ("PUT", "/api/historial-red/" + ID),
    ("GET", f"/api/nna/{ID}/despeje"),
    ("POST", f"/api/nna/{ID}/despeje"),
    ("PUT", "/api/despeje/" + ID),
    ("GET", f"/api/despeje/{ID}/notificaciones"),
    ("POST", f"/api/despeje/{ID}/notificaciones"),
    ("GET", "/api/notificacion/" + ID),
    ("PUT", "/api/notificacion/" + ID),
    ("GET", f"/api/nna/{ID}/informes-tribunal"),
    ("POST", f"/api/nna/{ID}/informes-tribunal"),
    ("GET", "/api/informe-tribunal/" + ID),
    ("PUT", "/api/informe-tribunal/" + ID),
    ("GET", "/api/informes/atrasados"),
    ("GET", "/api/informes/proximos-a-vencer"),
    ("GET", f"/api/nna/{ID}/e2p"),
    ("POST", f"/api/nna/{ID}/e2p"),
    ("GET", "/api/e2p/" + ID),
    ("PUT", "/api/e2p/" + ID),
    ("GET", "/api/e2p/" + ID + "/puntaje"),
    ("GET", "/api/e2p/versions/3-5_anos"),
    ("GET", f"/api/familiares/{ID}/e2p"),
    ("GET", f"/api/nna/{ID}/pmf"),
    ("POST", f"/api/nna/{ID}/pmf"),
    ("GET", "/api/pmf/" + ID),
    ("PUT", "/api/pmf/" + ID),
    ("GET", "/api/pmf/preguntas"),
    ("GET", f"/api/familiares/{ID}/pmf"),
    ("GET", f"/api/nna/{ID}/ncfas"),
    ("POST", f"/api/nna/{ID}/ncfas"),
    ("GET", "/api/ncfas/" + ID),
    ("PUT", "/api/ncfas/" + ID),
    ("GET", "/api/ncfas/items"),
    ("GET", f"/api/ncfas/{ID}/comentarios"),
    ("PUT", f"/api/ncfas/{ID}/comentarios/A"),
    ("GET", f"/api/familiares/{ID}/ncfas"),
    ("GET", f"/api/nna/{ID}/antecedentes-salud"),
    ("POST", f"/api/nna/{ID}/antecedentes-salud"),
    ("GET", "/api/antecedente-salud/" + ID),
    ("PUT", "/api/antecedente-salud/" + ID),
    ("GET", f"/api/nna/{ID}/antecedentes-escolares"),
    ("POST", f"/api/nna/{ID}/antecedentes-escolares"),
    ("GET", "/api/antecedente-escolar/" + ID),
    ("PUT", "/api/antecedente-escolar/" + ID),
    ("GET", f"/api/nna/{ID}/antecedentes-familiares"),
    ("POST", f"/api/nna/{ID}/antecedentes-familiares"),
    ("GET", "/api/antecedente-familiar/" + ID),
    ("PUT", "/api/antecedente-familiar/" + ID),
    ("GET", f"/api/nna/{ID}/vinculos"),
    ("POST", f"/api/nna/{ID}/vinculos"),
    ("GET", "/api/vinculo-familiar/" + ID),
    ("PUT", "/api/vinculo-familiar/" + ID),
    ("GET", "/api/solicitantes"),
    ("POST", "/api/solicitantes"),
    ("GET", "/api/solicitantes/" + ID),
    ("PUT", "/api/solicitantes/" + ID),
    ("GET", "/api/establecimientos"),
    ("POST", "/api/establecimientos"),
    ("GET", "/api/establecimientos/" + ID),
    ("PUT", "/api/establecimientos/" + ID),
    ("GET", "/api/centros-salud"),
    ("POST", "/api/centros-salud"),
    ("GET", "/api/centros-salud/" + ID),
    ("PUT", "/api/centros-salud/" + ID),
    ("GET", f"/api/nna/{ID}/vinculos-nna"),
    ("POST", f"/api/nna/{ID}/vinculos-nna"),
    ("GET", "/api/vinculo-nna/" + ID),
    ("PUT", "/api/vinculo-nna/" + ID),
    ("POST", "/api/upload/docs"),
]

RUTAS_PUBLICAS = [
    ("GET", "/health"),
    ("POST", "/api/auth/login"),
]


@pytest.mark.parametrize(("metodo", "ruta"), RUTAS_PROTEGIDAS)
async def test_ruta_protegida_sin_token_devuelve_403(
    client: AsyncClient, metodo: str, ruta: str
):
    res = await client.request(metodo, ruta)
    assert res.status_code == 403, f"{metodo} {ruta} -> {res.status_code}"


@pytest.mark.parametrize(("metodo", "ruta"), RUTAS_PROTEGIDAS)
async def test_ruta_protegida_con_token_invalido_devuelve_401(
    client: AsyncClient, metodo: str, ruta: str
):
    res = await client.request(metodo, ruta, headers={"Authorization": "Bearer invalido"})
    assert res.status_code == 401, f"{metodo} {ruta} -> {res.status_code}"


@pytest.mark.parametrize(("metodo", "ruta"), RUTAS_PUBLICAS)
async def test_ruta_publica_no_exige_token(client: AsyncClient, metodo: str, ruta: str):
    res = await client.request(metodo, ruta, json={} if metodo == "POST" else None)
    assert res.status_code != 403, f"{metodo} {ruta} exige token y no deberia"


async def test_esquema_bearer_esta_declarado_en_openapi(client: AsyncClient):
    """La API documenta el esquema de seguridad Bearer."""
    res = await client.get("/openapi.json")
    assert res.status_code == 200
    esquema = res.json()
    assert "HTTPBearer" in esquema["components"]["securitySchemes"]


async def test_no_existen_rutas_delete(client: AsyncClient):
    """Ningun recurso expone DELETE (pendiente conocido del proyecto)."""
    res = await client.get("/openapi.json")
    operaciones_con_delete = [
        f"{metodo.upper()} {ruta}"
        for ruta, metodos in res.json()["paths"].items()
        for metodo in metodos
        if metodo == "delete"
    ]
    assert operaciones_con_delete == []
