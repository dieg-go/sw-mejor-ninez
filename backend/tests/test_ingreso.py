"""Pruebas de ``AntecedenteIngreso``, sus causales/derechos y la documentacion.

Puntos de negocio cubiertos:
- el alta de un ingreso con ``fecha_ingreso_residencia`` dispara la creacion
  automatica del ``InformeTribunal`` de Diagnostico a 30 dias;
- ese informe no se duplica mientras siga pendiente;
- causales y derechos son hijos del ingreso (no del NNA) y no tienen ``id_caso``.
"""

import uuid

from httpx import AsyncClient

from tests.factories import (
    caso_activo_id,
    crear_antecedente_ingreso,
    crear_documentacion,
    crear_nna,
)


async def _solicitante_id(client: AsyncClient) -> str:
    return (await client.get("/api/solicitantes")).json()[0]["id_solicitante_ingreso"]


# ── AntecedenteIngreso ───────────────────────────────────────────────────────


async def test_listado_empieza_vacio(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    res = await auth_client.get(f"/api/nna/{nna['id_nna']}/antecedentes-ingreso")
    assert res.status_code == 200
    assert res.json() == []


async def test_alta_con_todos_los_campos(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    solicitante = await _solicitante_id(auth_client)

    res = await auth_client.post(
        f"/api/nna/{nna['id_nna']}/antecedentes-ingreso",
        json={
            "id_solicitante_ingreso": solicitante,
            "fecha_ingreso_residencia": "2024-05-01",
            "orden_tribunal": True,
            "fecha_causa": "2024-04-20",
            "tribunal": "1° Juzgado de Familia de Santiago",
            "materia": "Proteccional",
            "codigo_rit": "C-1234-2025",
            "codigo_ruc": "2510012345-6",
        },
    )
    assert res.status_code == 201, res.text
    cuerpo = res.json()
    assert cuerpo["id_nna"] == nna["id_nna"]
    assert cuerpo["tribunal"] == "1° Juzgado de Familia de Santiago"
    assert cuerpo["codigo_rit"] == "C-1234-2025"
    assert cuerpo["orden_tribunal"] is True


async def test_alta_sin_solicitante_devuelve_422(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    res = await auth_client.post(
        f"/api/nna/{nna['id_nna']}/antecedentes-ingreso", json={"tribunal": "X"}
    )
    assert res.status_code == 422


async def test_alta_sin_fecha_de_ingreso_no_crea_informe(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    await crear_antecedente_ingreso(
        auth_client, nna["id_nna"], await _solicitante_id(auth_client),
        fecha_ingreso_residencia=None,
    )

    informes = (await auth_client.get(f"/api/nna/{nna['id_nna']}/informes-tribunal")).json()
    assert informes == []


async def test_alta_con_fecha_de_ingreso_crea_el_diagnostico_a_30_dias(
    auth_client: AsyncClient,
):
    from datetime import date, timedelta

    nna = await crear_nna(auth_client)
    fecha = date(2024, 5, 1)
    await crear_antecedente_ingreso(
        auth_client, nna["id_nna"], await _solicitante_id(auth_client),
        fecha_ingreso_residencia=fecha.isoformat(),
    )

    informes = (await auth_client.get(f"/api/nna/{nna['id_nna']}/informes-tribunal")).json()
    assert len(informes) == 1
    assert informes[0]["tipo_informe"] == "Diagnóstico"
    assert informes[0]["estado"] == "Pendiente"
    assert informes[0]["fecha_vencimiento"] == (fecha + timedelta(days=30)).isoformat()
    assert informes[0]["id_caso"] == await caso_activo_id(auth_client, nna["id_nna"])


async def test_repetir_el_alta_no_duplica_el_diagnostico_pendiente(
    auth_client: AsyncClient,
):
    nna = await crear_nna(auth_client)
    solicitante = await _solicitante_id(auth_client)
    for _ in range(3):
        await crear_antecedente_ingreso(
            auth_client, nna["id_nna"], solicitante,
            fecha_ingreso_residencia="2024-05-01",
        )

    informes = (await auth_client.get(f"/api/nna/{nna['id_nna']}/informes-tribunal")).json()
    assert len(informes) == 1


async def test_el_ingreso_queda_sellado_con_el_caso_activo(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    creado = await crear_antecedente_ingreso(
        auth_client, nna["id_nna"], await _solicitante_id(auth_client)
    )
    assert creado["id_caso"] == await caso_activo_id(auth_client, nna["id_nna"])


async def test_listado_filtra_por_caso(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    id_nna = nna["id_nna"]
    solicitante = await _solicitante_id(auth_client)
    activo = await caso_activo_id(auth_client, id_nna)
    await crear_antecedente_ingreso(auth_client, id_nna, solicitante)

    await auth_client.put(f"/api/casos/{activo}", json={"estado": "Cerrado"})
    nuevo = await auth_client.post(f"/api/nna/{id_nna}/casos", json={})
    await crear_antecedente_ingreso(auth_client, id_nna, solicitante)

    todos = (await auth_client.get(f"/api/nna/{id_nna}/antecedentes-ingreso")).json()
    assert len(todos) == 2

    solo_activo = (
        await auth_client.get(f"/api/nna/{id_nna}/antecedentes-ingreso?id_caso={activo}")
    ).json()
    assert len(solo_activo) == 1
    assert solo_activo[0]["id_caso"] == activo

    solo_nuevo = (
        await auth_client.get(
            f"/api/nna/{id_nna}/antecedentes-ingreso?id_caso={nuevo.json()['id_caso']}"
        )
    ).json()
    assert len(solo_nuevo) == 1


async def test_consulta_por_id(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    creado = await crear_antecedente_ingreso(
        auth_client, nna["id_nna"], await _solicitante_id(auth_client)
    )
    res = await auth_client.get(f"/api/antecedente-ingreso/{creado['id_antecedente_ingreso']}")
    assert res.status_code == 200
    assert res.json() == creado


async def test_consulta_inexistente_devuelve_404(auth_client: AsyncClient):
    res = await auth_client.get(f"/api/antecedente-ingreso/{uuid.uuid4()}")
    assert res.status_code == 404
    assert res.json()["detail"] == "Antecedente de ingreso no encontrado"


async def test_actualizacion_parcial(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    creado = await crear_antecedente_ingreso(
        auth_client, nna["id_nna"], await _solicitante_id(auth_client)
    )
    res = await auth_client.put(
        f"/api/antecedente-ingreso/{creado['id_antecedente_ingreso']}",
        json={"materia": "Proteccional"},
    )
    assert res.status_code == 200
    assert res.json()["materia"] == "Proteccional"
    assert res.json()["codigo_rit"] == creado["codigo_rit"]


async def test_actualizacion_inexistente_devuelve_404(auth_client: AsyncClient):
    res = await auth_client.put(f"/api/antecedente-ingreso/{uuid.uuid4()}", json={"tribunal": "X"})
    assert res.status_code == 404


async def test_actualizar_la_fecha_no_recalcula_el_informe_ya_creado(
    auth_client: AsyncClient,
):
    """El informe se crea solo en el alta; el update no lo recalcula."""
    nna = await crear_nna(auth_client)
    creado = await crear_antecedente_ingreso(
        auth_client, nna["id_nna"], await _solicitante_id(auth_client),
        fecha_ingreso_residencia="2024-05-01",
    )
    antes = (await auth_client.get(f"/api/nna/{nna['id_nna']}/informes-tribunal")).json()

    await auth_client.put(
        f"/api/antecedente-ingreso/{creado['id_antecedente_ingreso']}",
        json={"fecha_ingreso_residencia": "2025-01-01"},
    )

    despues = (await auth_client.get(f"/api/nna/{nna['id_nna']}/informes-tribunal")).json()
    assert despues == antes


# ── Causales ─────────────────────────────────────────────────────────────────


async def _ingreso(auth_client: AsyncClient) -> dict:
    nna = await crear_nna(auth_client)
    return await crear_antecedente_ingreso(
        auth_client, nna["id_nna"], await _solicitante_id(auth_client)
    )


async def test_causales_empiezan_vacias(auth_client: AsyncClient):
    ingreso = await _ingreso(auth_client)
    res = await auth_client.get(
        f"/api/antecedente-ingreso/{ingreso['id_antecedente_ingreso']}/causales"
    )
    assert res.status_code == 200
    assert res.json() == []


async def test_alta_de_causal(auth_client: AsyncClient):
    ingreso = await _ingreso(auth_client)
    res = await auth_client.post(
        f"/api/antecedente-ingreso/{ingreso['id_antecedente_ingreso']}/causales",
        json={
            "nombre_causal": "Negligencia parental o del adulto responsable",
            "descripcion_detallada": "Madre con consumo problemático.",
            "estado": "Activo",
        },
    )
    assert res.status_code == 201, res.text
    assert res.json()["id_antecedente_ingreso"] == ingreso["id_antecedente_ingreso"]
    assert res.json()["nombre_causal"] == "Negligencia parental o del adulto responsable"


async def test_la_causal_no_tiene_id_caso(auth_client: AsyncClient):
    creado = await _causal(auth_client)
    assert "id_caso" not in creado


async def _causal(auth_client: AsyncClient) -> dict:
    ingreso = await _ingreso(auth_client)
    return (
        await auth_client.post(
            f"/api/antecedente-ingreso/{ingreso['id_antecedente_ingreso']}/causales",
            json={"nombre_causal": "Maltrato"},
        )
    ).json()


async def test_varias_causales_por_ingreso(auth_client: AsyncClient):
    ingreso = await _ingreso(auth_client)
    for nombre in ("Maltrato", "Negligencia", "Trabajo infantil"):
        res = await auth_client.post(
            f"/api/antecedente-ingreso/{ingreso['id_antecedente_ingreso']}/causales",
            json={"nombre_causal": nombre},
        )
        assert res.status_code == 201

    listado = (
        await auth_client.get(
            f"/api/antecedente-ingreso/{ingreso['id_antecedente_ingreso']}/causales"
        )
    ).json()
    assert len(listado) == 3


async def test_consulta_y_actualizacion_de_causal(auth_client: AsyncClient):
    creado = await _causal(auth_client)
    id_causal = creado["id_registro_causales"]

    assert (await auth_client.get(f"/api/causal-ingreso/{id_causal}")).json() == creado

    res = await auth_client.put(
        f"/api/causal-ingreso/{id_causal}", json={"estado": "Cerrado"}
    )
    assert res.status_code == 200
    assert res.json()["estado"] == "Cerrado"
    assert res.json()["nombre_causal"] == "Maltrato"


async def test_causal_inexistente_devuelve_404(auth_client: AsyncClient):
    assert (await auth_client.get(f"/api/causal-ingreso/{uuid.uuid4()}")).status_code == 404
    assert (
        await auth_client.put(f"/api/causal-ingreso/{uuid.uuid4()}", json={"estado": "X"})
    ).status_code == 404


async def test_el_mensaje_de_causal_inexistente(auth_client: AsyncClient):
    res = await auth_client.get(f"/api/causal-ingreso/{uuid.uuid4()}")
    assert res.json()["detail"] == "Causal no encontrada"


# ── Derechos vulnerados ──────────────────────────────────────────────────────


async def test_derechos_empiezan_vacios(auth_client: AsyncClient):
    ingreso = await _ingreso(auth_client)
    res = await auth_client.get(
        f"/api/antecedente-ingreso/{ingreso['id_antecedente_ingreso']}/derechos-vulnerados"
    )
    assert res.status_code == 200
    assert res.json() == []


async def test_alta_y_edicion_de_derecho(auth_client: AsyncClient):
    ingreso = await _ingreso(auth_client)
    creado = (
        await auth_client.post(
            f"/api/antecedente-ingreso/{ingreso['id_antecedente_ingreso']}/derechos-vulnerados",
            json={"nombre_derecho": "Derecho a la educación", "estado": "Vulnerado"},
        )
    ).json()
    assert creado["id_antecedente_ingreso"] == ingreso["id_antecedente_ingreso"]

    res = await auth_client.put(
        f"/api/derecho-vulnerado/{creado['id_registro_derecho_vulnerado']}",
        json={"estado": "Restituido"},
    )
    assert res.status_code == 200
    assert res.json()["estado"] == "Restituido"


async def test_derecho_inexistente_devuelve_404(auth_client: AsyncClient):
    res = await auth_client.get(f"/api/derecho-vulnerado/{uuid.uuid4()}")
    assert res.status_code == 404
    assert res.json()["detail"] == "Derecho vulnerado no encontrado"
    assert (
        await auth_client.put(f"/api/derecho-vulnerado/{uuid.uuid4()}", json={"estado": "X"})
    ).status_code == 404


# ── Documentacion de ingreso ─────────────────────────────────────────────────


async def test_documentacion_empieza_vacia(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    res = await auth_client.get(f"/api/nna/{nna['id_nna']}/documentacion-ingreso")
    assert res.status_code == 200
    assert res.json() == []


async def test_alta_de_documentacion(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    res = await auth_client.post(
        f"/api/nna/{nna['id_nna']}/documentacion-ingreso",
        json={
            "tipo_documento": "Certificado de nacimiento",
            "estado_recepcion": True,
            "fecha_recepcion": "2024-04-01",
        },
    )
    assert res.status_code == 201, res.text
    assert res.json()["estado_recepcion"] is True
    assert res.json()["fecha_recepcion"] == "2024-04-01"


async def test_documentacion_filtra_por_caso(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    id_nna = nna["id_nna"]
    activo = await caso_activo_id(auth_client, id_nna)
    await crear_documentacion(auth_client, id_nna)

    await auth_client.put(f"/api/casos/{activo}", json={"estado": "Cerrado"})
    await auth_client.post(f"/api/nna/{id_nna}/casos", json={})
    await crear_documentacion(auth_client, id_nna, tipo_documento="Otro")

    assert len((await auth_client.get(f"/api/nna/{id_nna}/documentacion-ingreso")).json()) == 2
    solo_activo = (
        await auth_client.get(f"/api/nna/{id_nna}/documentacion-ingreso?id_caso={activo}")
    ).json()
    assert len(solo_activo) == 1
    assert solo_activo[0]["tipo_documento"] == "Certificado de nacimiento"


async def test_consulta_y_actualizacion_de_documentacion(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    creado = await crear_documentacion(auth_client, nna["id_nna"])
    id_doc = creado["id_documentacion"]

    assert (await auth_client.get(f"/api/documentacion-ingreso/{id_doc}")).json() == creado

    res = await auth_client.put(
        f"/api/documentacion-ingreso/{id_doc}",
        json={"estado_recepcion": False, "observacion": "Falta firma"},
    )
    assert res.status_code == 200
    assert res.json()["estado_recepcion"] is False
    assert res.json()["observacion"] == "Falta firma"
    assert res.json()["tipo_documento"] == "Certificado de nacimiento"


async def test_documentacion_inexistente_devuelve_404(auth_client: AsyncClient):
    res = await auth_client.get(f"/api/documentacion-ingreso/{uuid.uuid4()}")
    assert res.status_code == 404
    assert res.json()["detail"] == "Documentación no encontrada"
    assert (
        await auth_client.put(f"/api/documentacion-ingreso/{uuid.uuid4()}", json={"observacion": "X"})
    ).status_code == 404
