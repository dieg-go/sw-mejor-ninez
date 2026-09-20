"""Pruebas de ``HistorialRedProteccional``, ``InformeTribunal`` y las alertas.

Puntos de negocio cubiertos:
- encadenamiento automatico del siguiente informe al marcar uno como
  ``Enviado`` (Diagnostico -> Avance a 90 dias del ingreso; Avance -> Avance a
  3 meses del vencimiento);
- el encadenamiento no se repite si el informe ya estaba enviado;
- los endpoints globales de alertas (/informes/atrasados y
  /informes/proximos-a-vencer) filtran por estado y por fecha.
"""

import uuid
from datetime import date, timedelta

from httpx import AsyncClient

from tests.factories import (
    caso_activo_id,
    crear_antecedente_ingreso,
    crear_informe,
    crear_nna,
)

DIA = timedelta(days=1)


async def _nna_con_ingreso(auth_client: AsyncClient, fecha_ingreso: date) -> dict:
    nna = await crear_nna(auth_client)
    solicitante = (await auth_client.get("/api/solicitantes")).json()[0][
        "id_solicitante_ingreso"
    ]
    await crear_antecedente_ingreso(
        auth_client,
        nna["id_nna"],
        solicitante,
        fecha_ingreso_residencia=fecha_ingreso.isoformat(),
    )
    return nna


# ── Historial red proteccional ───────────────────────────────────────────────


async def test_historial_red_empieza_vacio(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    res = await auth_client.get(f"/api/nna/{nna['id_nna']}/historial-red")
    assert res.status_code == 200
    assert res.json() == []


async def test_alta_de_historial_red(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    res = await auth_client.post(
        f"/api/nna/{nna['id_nna']}/historial-red",
        json={
            "nombre_programa": "Programa de Protección Especializada (PPE)",
            "fecha_ingreso": "2024-01-15",
            "fecha_egreso": None,
        },
    )
    assert res.status_code == 201, res.text
    assert res.json()["nombre_programa"] == "Programa de Protección Especializada (PPE)"
    assert res.json()["fecha_ingreso"] == "2024-01-15"
    assert res.json()["fecha_egreso"] is None


async def test_historial_red_no_tiene_id_caso(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    creado = (
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/historial-red", json={"nombre_programa": "PPE"}
        )
    ).json()
    assert "id_caso" not in creado


async def test_consulta_y_actualizacion_de_historial_red(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    creado = (
        await auth_client.post(
            f"/api/nna/{nna['id_nna']}/historial-red", json={"nombre_programa": "PPE"}
        )
    ).json()
    id_red = creado["id_historial_red"]

    assert (await auth_client.get(f"/api/historial-red/{id_red}")).json() == creado

    res = await auth_client.put(
        f"/api/historial-red/{id_red}",
        json={"fecha_egreso": "2024-12-31", "motivo_egreso": "Egreso exitoso"},
    )
    assert res.status_code == 200
    assert res.json()["motivo_egreso"] == "Egreso exitoso"
    assert res.json()["nombre_programa"] == "PPE"


async def test_historial_red_inexistente_devuelve_404(auth_client: AsyncClient):
    res = await auth_client.get(f"/api/historial-red/{uuid.uuid4()}")
    assert res.status_code == 404
    assert res.json()["detail"] == "Historial red no encontrado"
    assert (
        await auth_client.put(f"/api/historial-red/{uuid.uuid4()}", json={"nombre_programa": "X"})
    ).status_code == 404


# ── InformeTribunal CRUD ─────────────────────────────────────────────────────


async def test_informes_empiezan_vacios(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    res = await auth_client.get(f"/api/nna/{nna['id_nna']}/informes-tribunal")
    assert res.status_code == 200
    assert res.json() == []


async def test_alta_de_informe(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    res = await auth_client.post(
        f"/api/nna/{nna['id_nna']}/informes-tribunal",
        json={
            "tipo_informe": "Diagnóstico",
            "fecha_vencimiento": "2024-06-01",
            "estado": "Pendiente",
        },
    )
    assert res.status_code == 201, res.text
    assert res.json()["tipo_informe"] == "Diagnóstico"
    assert res.json()["estado"] == "Pendiente"
    assert res.json()["id_caso"] == await caso_activo_id(auth_client, nna["id_nna"])


async def test_alta_de_informe_con_tipo_invalido_devuelve_422(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    res = await auth_client.post(
        f"/api/nna/{nna['id_nna']}/informes-tribunal", json={"tipo_informe": "Otro"}
    )
    assert res.status_code == 422


async def test_consulta_y_actualizacion_simple_de_informe(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    creado = await crear_informe(auth_client, nna["id_nna"])
    id_informe = creado["id_informe"]

    assert (await auth_client.get(f"/api/informe-tribunal/{id_informe}")).json() == creado

    res = await auth_client.put(
        f"/api/informe-tribunal/{id_informe}", json={"url_documento": "/uploads/informe.pdf"}
    )
    assert res.status_code == 200
    assert res.json()["url_documento"] == "/uploads/informe.pdf"
    assert res.json()["estado"] == "Pendiente"


async def test_informe_inexistente_devuelve_404(auth_client: AsyncClient):
    res = await auth_client.get(f"/api/informe-tribunal/{uuid.uuid4()}")
    assert res.status_code == 404
    assert res.json()["detail"] == "Informe no encontrado"


# ── Encadenamiento ───────────────────────────────────────────────────────────


async def test_marcar_diagnostico_como_enviado_encadena_un_avance_a_90_dias(
    auth_client: AsyncClient,
):
    fecha_ingreso = date(2024, 3, 1)
    nna = await _nna_con_ingreso(auth_client, fecha_ingreso)
    id_nna = nna["id_nna"]

    informes = (await auth_client.get(f"/api/nna/{id_nna}/informes-tribunal")).json()
    diagnostico = next(i for i in informes if i["tipo_informe"] == "Diagnóstico")

    res = await auth_client.put(
        f"/api/informe-tribunal/{diagnostico['id_informe']}",
        json={"estado": "Enviado", "fecha_envio_real": "2024-03-20"},
    )
    assert res.status_code == 200, res.text

    informes = (await auth_client.get(f"/api/nna/{id_nna}/informes-tribunal")).json()
    assert len(informes) == 2
    avance = next(i for i in informes if i["tipo_informe"] == "Avance")
    assert avance["estado"] == "Pendiente"
    assert avance["fecha_vencimiento"] == (fecha_ingreso + timedelta(days=90)).isoformat()


async def test_marcar_avance_como_enviado_encadena_tres_meses_despues(
    auth_client: AsyncClient,
):
    nna = await crear_nna(auth_client)
    id_nna = nna["id_nna"]
    avance = await crear_informe(
        auth_client,
        id_nna,
        tipo_informe="Avance",
        fecha_vencimiento="2024-01-31",
        estado="Pendiente",
    )

    await auth_client.put(
        f"/api/informe-tribunal/{avance['id_informe']}", json={"estado": "Enviado"}
    )

    informes = (await auth_client.get(f"/api/nna/{id_nna}/informes-tribunal")).json()
    assert len(informes) == 2
    siguiente = next(i for i in informes if i["id_informe"] != avance["id_informe"])
    assert siguiente["tipo_informe"] == "Avance"
    assert siguiente["fecha_vencimiento"] == "2024-04-30"


async def test_un_informe_ya_enviado_no_encadena_de_nuevo(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    id_nna = nna["id_nna"]
    avance = await crear_informe(
        auth_client, id_nna, tipo_informe="Avance", fecha_vencimiento="2024-01-31"
    )

    await auth_client.put(
        f"/api/informe-tribunal/{avance['id_informe']}", json={"estado": "Enviado"}
    )
    await auth_client.put(
        f"/api/informe-tribunal/{avance['id_informe']}", json={"observacion": "otra edicion"}
    )
    await auth_client.put(
        f"/api/informe-tribunal/{avance['id_informe']}", json={"estado": "Enviado"}
    )

    informes = (await auth_client.get(f"/api/nna/{id_nna}/informes-tribunal")).json()
    assert len(informes) == 2


async def test_un_avance_pendiente_no_encadena_al_editarlo(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    id_nna = nna["id_nna"]
    avance = await crear_informe(auth_client, id_nna, tipo_informe="Avance")

    await auth_client.put(
        f"/api/informe-tribunal/{avance['id_informe']}", json={"fecha_vencimiento": "2024-07-01"}
    )

    informes = (await auth_client.get(f"/api/nna/{id_nna}/informes-tribunal")).json()
    assert len(informes) == 1


async def test_un_diagnostico_sin_fecha_de_ingreso_no_encadena(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    id_nna = nna["id_nna"]
    diagnostico = await crear_informe(auth_client, id_nna, tipo_informe="Diagnóstico")

    await auth_client.put(
        f"/api/informe-tribunal/{diagnostico['id_informe']}", json={"estado": "Enviado"}
    )

    informes = (await auth_client.get(f"/api/nna/{id_nna}/informes-tribunal")).json()
    assert len(informes) == 1
    assert informes[0]["estado"] == "Enviado"


async def test_un_informe_sin_tipo_no_encadena(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    id_nna = nna["id_nna"]
    creado = await crear_informe(
        auth_client, id_nna, tipo_informe=None, fecha_vencimiento="2024-01-31"
    )

    res = await auth_client.put(
        f"/api/informe-tribunal/{creado['id_informe']}", json={"estado": "Enviado"}
    )
    assert res.status_code == 200

    informes = (await auth_client.get(f"/api/nna/{id_nna}/informes-tribunal")).json()
    assert len(informes) == 1


async def test_el_encadenado_queda_en_el_mismo_caso(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    id_nna = nna["id_nna"]
    avance = await crear_informe(
        auth_client, id_nna, tipo_informe="Avance", fecha_vencimiento="2024-01-31"
    )

    await auth_client.put(
        f"/api/informe-tribunal/{avance['id_informe']}", json={"estado": "Enviado"}
    )

    informes = (await auth_client.get(f"/api/nna/{id_nna}/informes-tribunal")).json()
    assert {i["id_caso"] for i in informes} == {await caso_activo_id(auth_client, id_nna)}


async def test_listado_de_informes_filtra_por_caso(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    id_nna = nna["id_nna"]
    activo = await caso_activo_id(auth_client, id_nna)
    await crear_informe(auth_client, id_nna)

    await auth_client.put(f"/api/casos/{activo}", json={"estado": "Cerrado"})
    await auth_client.post(f"/api/nna/{id_nna}/casos", json={})
    await crear_informe(auth_client, id_nna, tipo_informe="Avance")

    assert len((await auth_client.get(f"/api/nna/{id_nna}/informes-tribunal")).json()) == 2
    solo_activo = (
        await auth_client.get(f"/api/nna/{id_nna}/informes-tribunal?id_caso={activo}")
    ).json()
    assert len(solo_activo) == 1
    assert solo_activo[0]["tipo_informe"] == "Diagnóstico"


# ── Alertas ──────────────────────────────────────────────────────────────────


async def test_sin_informes_no_hay_alertas(auth_client: AsyncClient):
    assert (await auth_client.get("/api/informes/atrasados")).json() == []
    assert (await auth_client.get("/api/informes/proximos-a-vencer")).json() == []


async def test_atrasados_solo_lista_pendientes_vencidos(auth_client: AsyncClient):
    hoy = date.today()
    nna = await crear_nna(auth_client)
    id_nna = nna["id_nna"]

    vencido = await crear_informe(
        auth_client, id_nna, fecha_vencimiento=(hoy - timedelta(days=5)).isoformat()
    )
    await crear_informe(
        auth_client, id_nna, fecha_vencimiento=(hoy + timedelta(days=5)).isoformat()
    )
    await crear_informe(
        auth_client,
        id_nna,
        fecha_vencimiento=(hoy - timedelta(days=5)).isoformat(),
        estado="Enviado",
    )

    res = await auth_client.get("/api/informes/atrasados")
    assert res.status_code == 200
    alertas = res.json()
    assert [a["id_informe"] for a in alertas] == [vencido["id_informe"]]
    assert alertas[0]["dias_restantes"] == -5
    assert alertas[0]["nombre_nna"] == nna["nombre"]
    assert alertas[0]["estado"] == "Pendiente"


async def test_atrasados_ordena_por_vencimiento_mas_antiguo(auth_client: AsyncClient):
    hoy = date.today()
    nna = await crear_nna(auth_client)
    id_nna = nna["id_nna"]
    await crear_informe(
        auth_client, id_nna, fecha_vencimiento=(hoy - timedelta(days=2)).isoformat()
    )
    await crear_informe(
        auth_client, id_nna, fecha_vencimiento=(hoy - timedelta(days=20)).isoformat()
    )

    alertas = (await auth_client.get("/api/informes/atrasados")).json()
    assert [a["dias_restantes"] for a in alertas] == [-20, -2]


async def test_proximos_a_vencer_usa_la_ventana_de_diez_dias_por_defecto(
    auth_client: AsyncClient,
):
    hoy = date.today()
    nna = await crear_nna(auth_client)
    id_nna = nna["id_nna"]

    dentro = await crear_informe(
        auth_client, id_nna, fecha_vencimiento=(hoy + timedelta(days=9)).isoformat()
    )
    await crear_informe(
        auth_client, id_nna, fecha_vencimiento=(hoy + timedelta(days=11)).isoformat()
    )
    await crear_informe(
        auth_client, id_nna, fecha_vencimiento=(hoy - timedelta(days=1)).isoformat()
    )

    alertas = (await auth_client.get("/api/informes/proximos-a-vencer")).json()
    assert [a["id_informe"] for a in alertas] == [dentro["id_informe"]]
    assert alertas[0]["dias_restantes"] == 9


async def test_proximos_a_vencer_respeta_el_parametro_dias(auth_client: AsyncClient):
    hoy = date.today()
    nna = await crear_nna(auth_client)
    id_nna = nna["id_nna"]
    await crear_informe(
        auth_client, id_nna, fecha_vencimiento=(hoy + timedelta(days=30)).isoformat()
    )

    assert (await auth_client.get("/api/informes/proximos-a-vencer?dias=10")).json() == []
    assert len((await auth_client.get("/api/informes/proximos-a-vencer?dias=31")).json()) == 1


async def test_proximos_a_vencer_incluye_el_vencimiento_de_hoy(
    auth_client: AsyncClient,
):
    nna = await crear_nna(auth_client)
    await crear_informe(
        auth_client, nna["id_nna"], fecha_vencimiento=date.today().isoformat()
    )

    alertas = (await auth_client.get("/api/informes/proximos-a-vencer?dias=1")).json()
    assert len(alertas) == 1
    assert alertas[0]["dias_restantes"] == 0


async def test_proximos_a_vencer_valida_el_rango_de_dias(auth_client: AsyncClient):
    assert (await auth_client.get("/api/informes/proximos-a-vencer?dias=0")).status_code == 422
    assert (await auth_client.get("/api/informes/proximos-a-vencer?dias=366")).status_code == 422
    assert (await auth_client.get("/api/informes/proximos-a-vencer?dias=1")).status_code == 200
    assert (await auth_client.get("/api/informes/proximos-a-vencer?dias=365")).status_code == 200


async def test_las_alertas_de_un_caso_cerrado_siguen_apareciendo(
    auth_client: AsyncClient,
):
    """Las alertas son globales: no filtran por caso ni por NNA."""
    hoy = date.today()
    nna = await crear_nna(auth_client)
    id_nna = nna["id_nna"]
    await crear_informe(
        auth_client, id_nna, fecha_vencimiento=(hoy - timedelta(days=3)).isoformat()
    )

    await auth_client.put(
        f"/api/casos/{await caso_activo_id(auth_client, id_nna)}", json={"estado": "Cerrado"}
    )

    alertas = (await auth_client.get("/api/informes/atrasados")).json()
    assert len(alertas) == 1
