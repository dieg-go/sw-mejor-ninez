"""Pruebas del proceso de despeje familiar y sus notificaciones.

Un despeje es unico por ``(NNA, Caso)`` y solo puede existir si hay un caso
activo. Las notificaciones cuelgan del despeje y heredan su guarda de caso
cerrado.
"""

import uuid

import pytest
from httpx import AsyncClient

from tests.factories import (
    caso_activo_id,
    crear_despeje,
    crear_familiar,
    crear_nna,
    crear_notificacion,
)


# ── Despeje: consulta ────────────────────────────────────────────────────────


async def test_consulta_sin_despeje_devuelve_404(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    res = await auth_client.get(f"/api/nna/{nna['id_nna']}/despeje")
    assert res.status_code == 404
    assert res.json()["detail"] == "Despeje no encontrado para este NNA"


async def test_alta_y_consulta_del_despeje(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    creado = await crear_despeje(auth_client, nna["id_nna"])

    res = await auth_client.get(f"/api/nna/{nna['id_nna']}/despeje")
    assert res.status_code == 200
    assert res.json() == creado
    assert creado["estado"] == "Evaluando"
    assert creado["id_caso"] == await caso_activo_id(auth_client, nna["id_nna"])


async def test_consulta_con_id_caso_explicito(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    id_nna = nna["id_nna"]
    activo = await caso_activo_id(auth_client, id_nna)
    await crear_despeje(auth_client, id_nna, estado="Evaluando")

    res = await auth_client.get(f"/api/nna/{id_nna}/despeje?id_caso={activo}")
    assert res.status_code == 200
    assert res.json()["id_caso"] == activo


async def test_consulta_con_un_id_caso_sin_despeje_devuelve_404(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    await crear_despeje(auth_client, nna["id_nna"])

    res = await auth_client.get(f"/api/nna/{nna['id_nna']}/despeje?id_caso={uuid.uuid4()}")
    assert res.status_code == 404


async def test_consulta_de_un_nna_inexistente_devuelve_404(auth_client: AsyncClient):
    res = await auth_client.get(f"/api/nna/{uuid.uuid4()}/despeje")
    assert res.status_code == 404


@pytest.mark.characterization
async def test_sin_caso_activo_el_despeje_se_resuelve_sin_filtrar_por_caso(
    auth_client: AsyncClient,
):
    """Sin caso activo el GET no aplica filtro y devuelve el despeje de cualquier caso.

    El codigo solo agrega ``WHERE id_caso = ...`` cuando encuentra un caso en
    progreso. Si el unico caso esta cerrado, la consulta queda sin filtrar y
    devuelve el primer despeje del NNA: la vista por defecto mostraria el
    despeje de un caso cerrado.
    """
    nna = await crear_nna(auth_client)
    id_nna = nna["id_nna"]
    activo = await caso_activo_id(auth_client, id_nna)
    despeje = await crear_despeje(auth_client, id_nna, estado="Evaluando")

    await auth_client.put(f"/api/casos/{activo}", json={"estado": "Cerrado"})

    res = await auth_client.get(f"/api/nna/{id_nna}/despeje")
    assert res.status_code == 200
    assert res.json()["id_despeje"] == despeje["id_despeje"]
    assert res.json()["id_caso"] == activo


async def test_un_despeje_cerrado_se_encuentra_por_su_id_caso(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    id_nna = nna["id_nna"]
    activo = await caso_activo_id(auth_client, id_nna)
    await crear_despeje(auth_client, id_nna, estado="Evaluando")

    await auth_client.put(f"/api/casos/{activo}", json={"estado": "Cerrado"})

    res = await auth_client.get(f"/api/nna/{id_nna}/despeje?id_caso={activo}")
    assert res.status_code == 200
    assert res.json()["id_caso"] == activo


# ── Despeje: alta ────────────────────────────────────────────────────────────


async def test_alta_sin_caso_activo_devuelve_409(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    id_nna = nna["id_nna"]
    await auth_client.put(
        f"/api/casos/{await caso_activo_id(auth_client, id_nna)}", json={"estado": "Cerrado"}
    )

    res = await auth_client.post(f"/api/nna/{id_nna}/despeje", json={})
    assert res.status_code == 409
    assert res.json()["detail"] == "No hay un caso activo para este NNA"


async def test_no_se_puede_crear_un_segundo_despeje_en_el_mismo_caso(
    auth_client: AsyncClient,
):
    nna = await crear_nna(auth_client)
    await crear_despeje(auth_client, nna["id_nna"])

    res = await auth_client.post(f"/api/nna/{nna['id_nna']}/despeje", json={})
    assert res.status_code == 409
    assert res.json()["detail"] == "Ya existe un despeje para este caso"


async def test_se_puede_crear_un_despeje_en_un_caso_nuevo(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    id_nna = nna["id_nna"]
    primero = await crear_despeje(auth_client, id_nna)

    await auth_client.put(
        f"/api/casos/{await caso_activo_id(auth_client, id_nna)}", json={"estado": "Cerrado"}
    )
    await auth_client.post(f"/api/nna/{id_nna}/casos", json={})

    segundo = await crear_despeje(auth_client, id_nna, estado="En Notificación")
    assert segundo["id_despeje"] != primero["id_despeje"]
    assert segundo["id_caso"] != primero["id_caso"]


async def test_alta_de_despeje_con_todos_los_campos(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    creado = (
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/despeje",
            json={
                "fecha_solicitud_informe": "2024-02-01",
                "fecha_recepcion_informe": "2024-02-20",
                "estado": "En Notificación",
                "url_informe_hijo": "/uploads/informe_hijo.pdf",
            },
        )
    ).json()
    assert creado["url_informe_hijo"] == "/uploads/informe_hijo.pdf"
    assert creado["fecha_recepcion_informe"] == "2024-02-20"


# ── Despeje: actualizacion ───────────────────────────────────────────────────


async def test_actualizacion_del_despeje(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    creado = await crear_despeje(auth_client, nna["id_nna"])

    res = await auth_client.put(
        f"/api/despeje/{creado['id_despeje']}",
        json={"estado": "Cerrado Sin Red", "url_informe_hijo": "/uploads/final.pdf"},
    )
    assert res.status_code == 200, res.text
    assert res.json()["estado"] == "Cerrado Sin Red"
    assert res.json()["url_informe_hijo"] == "/uploads/final.pdf"
    assert res.json()["fecha_solicitud_informe"] == creado["fecha_solicitud_informe"]


async def test_actualizacion_de_un_despeje_inexistente_devuelve_404(
    auth_client: AsyncClient,
):
    res = await auth_client.put(f"/api/despeje/{uuid.uuid4()}", json={"estado": "Evaluando"})
    assert res.status_code == 404
    assert res.json()["detail"] == "Despeje no encontrado"


# ── Notificaciones ───────────────────────────────────────────────────────────


async def test_notificaciones_empiezan_vacias(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    despeje = await crear_despeje(auth_client, nna["id_nna"])

    res = await auth_client.get(f"/api/despeje/{despeje['id_despeje']}/notificaciones")
    assert res.status_code == 200
    assert res.json() == []


async def test_alta_de_notificacion(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    despeje = await crear_despeje(auth_client, nna["id_nna"])

    creado = await crear_notificacion(auth_client, despeje["id_despeje"], familiar["id_familiar"])
    assert creado["id_despeje"] == despeje["id_despeje"]
    assert creado["id_familiar"] == familiar["id_familiar"]
    assert creado["codigo_seguimiento_1"] == "RC00123456CL"
    assert creado["fecha_envio_carta_2"] is None


async def test_alta_de_notificacion_con_todos_los_campos(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    despeje = await crear_despeje(auth_client, nna["id_nna"])

    creado = (
        await auth_client.post(
            f"/api/despeje/{despeje['id_despeje']}/notificaciones",
            json={
                "id_familiar": familiar["id_familiar"],
                "fecha_envio_carta_1": "2024-01-10",
                "codigo_seguimiento_1": "RC00111111CL",
                "estado_entrega_1": "Entregada",
                "fecha_recepcion_carta_1": "2024-01-14",
                "fecha_envio_carta_2": "2024-02-10",
                "codigo_seguimiento_2": "RC00222222CL",
                "estado_entrega_2": "Devuelta — Dirección incorrecta",
                "fecha_recepcion_carta_2": None,
                "resultado_contacto": "No responde",
                "fecha_respuesta": "2024-02-20",
                "observacion": "Sin respuesta a las dos cartas.",
            },
        )
    ).json()
    assert creado["estado_entrega_2"] == "Devuelta — Dirección incorrecta"
    assert creado["resultado_contacto"] == "No responde"


async def test_alta_de_notificacion_sin_familiar_devuelve_422(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    despeje = await crear_despeje(auth_client, nna["id_nna"])

    res = await auth_client.post(
        f"/api/despeje/{despeje['id_despeje']}/notificaciones", json={}
    )
    assert res.status_code == 422


async def test_alta_de_notificacion_en_un_despeje_inexistente_devuelve_404(
    auth_client: AsyncClient,
):
    familiar = await crear_familiar(auth_client)
    res = await auth_client.post(
        f"/api/despeje/{uuid.uuid4()}/notificaciones",
        json={"id_familiar": familiar["id_familiar"]},
    )
    assert res.status_code == 404
    assert res.json()["detail"] == "Despeje no encontrado"


async def test_varias_notificaciones_para_el_mismo_despeje(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    despeje = await crear_despeje(auth_client, nna["id_nna"])
    for _ in range(3):
        familiar = await crear_familiar(auth_client)
        await crear_notificacion(auth_client, despeje["id_despeje"], familiar["id_familiar"])

    listado = (
        await auth_client.get(f"/api/despeje/{despeje['id_despeje']}/notificaciones")
    ).json()
    assert len(listado) == 3


async def test_consulta_de_una_notificacion(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    despeje = await crear_despeje(auth_client, nna["id_nna"])
    creado = await crear_notificacion(auth_client, despeje["id_despeje"], familiar["id_familiar"])

    res = await auth_client.get(f"/api/notificacion/{creado['id_notificacion']}")
    assert res.status_code == 200
    assert res.json() == creado


async def test_notificacion_inexistente_devuelve_404(auth_client: AsyncClient):
    res = await auth_client.get(f"/api/notificacion/{uuid.uuid4()}")
    assert res.status_code == 404
    assert res.json()["detail"] == "Notificación no encontrada"


async def test_actualizacion_de_una_notificacion(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    despeje = await crear_despeje(auth_client, nna["id_nna"])
    creado = await crear_notificacion(auth_client, despeje["id_despeje"], familiar["id_familiar"])

    res = await auth_client.put(
        f"/api/notificacion/{creado['id_notificacion']}",
        json={
            "fecha_envio_carta_2": "2024-03-01",
            "codigo_seguimiento_2": "RC00999999CL",
            "resultado_contacto": "Rechaza participación",
        },
    )
    assert res.status_code == 200, res.text
    assert res.json()["resultado_contacto"] == "Rechaza participación"
    assert res.json()["codigo_seguimiento_1"] == "RC00123456CL"


async def test_actualizacion_de_una_notificacion_inexistente_devuelve_404(
    auth_client: AsyncClient,
):
    res = await auth_client.put(
        f"/api/notificacion/{uuid.uuid4()}", json={"resultado_contacto": "No responde"}
    )
    assert res.status_code == 404
    assert res.json()["detail"] == "Notificación no encontrada"


async def test_actualizacion_de_notificacion_cuyo_despeje_fue_borrado_no_aplica(
    auth_client: AsyncClient,
):
    """No hay borrado en la API, asi que el 404 del despeje es inalcanzable.

    La ruta lee el despeje para comprobar el caso; sin endpoint de borrado el
    unico modo de llegar a ese 404 es un dato huerfano en la base.
    """
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    despeje = await crear_despeje(auth_client, nna["id_nna"])
    creado = await crear_notificacion(auth_client, despeje["id_despeje"], familiar["id_familiar"])

    res = await auth_client.put(
        f"/api/notificacion/{creado['id_notificacion']}", json={"observacion": "ok"}
    )
    assert res.status_code == 200
