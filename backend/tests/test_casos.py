"""Pruebas del ciclo de vida de ``Caso``: la agrupacion por caso de un NNA."""

from __future__ import annotations

import uuid
from datetime import date

import pytest
from httpx import AsyncClient

from tests.factories import caso_activo_id, crear_caso, crear_nna


# ── Listado ──────────────────────────────────────────────────────────────────


async def test_un_nna_recien_creado_tiene_exactamente_un_caso_activo(
    auth_client: AsyncClient,
):
    nna = await crear_nna(auth_client)
    res = await auth_client.get(f"/api/nna/{nna['id_nna']}/casos")
    assert res.status_code == 200
    casos = res.json()
    assert len(casos) == 1
    assert casos[0]["estado"] == "En Progreso"
    assert casos[0]["fecha_inicio"] == date.today().isoformat()
    assert casos[0]["fecha_termino"] is None


async def test_listado_de_casos_ordena_del_mas_reciente_al_mas_antiguo(
    auth_client: AsyncClient,
):
    nna = await crear_nna(auth_client)
    id_nna = nna["id_nna"]
    primero = await caso_activo_id(auth_client, id_nna)
    await auth_client.put(f"/api/casos/{primero}", json={"estado": "Cerrado"})

    segundo = (await crear_caso(auth_client, id_nna, fecha_inicio="2030-01-01"))["id_caso"]

    casos = (await auth_client.get(f"/api/nna/{id_nna}/casos")).json()
    assert [c["id_caso"] for c in casos] == [segundo, primero]


async def test_listado_de_casos_de_un_nna_inexistente_es_vacio(auth_client: AsyncClient):
    res = await auth_client.get(f"/api/nna/{uuid.uuid4()}/casos")
    assert res.status_code == 200
    assert res.json() == []


# ── Alta ─────────────────────────────────────────────────────────────────────


async def test_no_se_puede_crear_un_segundo_caso_activo(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    res = await auth_client.post(f"/api/nna/{nna['id_nna']}/casos", json={})
    assert res.status_code == 409
    assert res.json()["detail"] == "NNA ya tiene un caso activo"


async def test_se_puede_crear_un_caso_nuevo_despues_de_cerrar_el_anterior(
    auth_client: AsyncClient,
):
    nna = await crear_nna(auth_client)
    id_nna = nna["id_nna"]
    anterior = await caso_activo_id(auth_client, id_nna)
    await auth_client.put(f"/api/casos/{anterior}", json={"estado": "Cerrado"})

    res = await auth_client.post(f"/api/nna/{id_nna}/casos", json={})
    assert res.status_code == 201, res.text
    assert res.json()["estado"] == "En Progreso"
    assert res.json()["id_caso"] != anterior


async def test_alta_de_caso_acepta_fechas_explicitas(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    id_nna = nna["id_nna"]
    await auth_client.put(
        f"/api/casos/{await caso_activo_id(auth_client, id_nna)}",
        json={"estado": "Cerrado"},
    )

    res = await auth_client.post(
        f"/api/nna/{id_nna}/casos",
        json={"fecha_inicio": "2024-05-01", "fecha_termino": "2024-11-30"},
    )
    assert res.status_code == 201
    assert res.json()["fecha_inicio"] == "2024-05-01"


async def test_alta_de_caso_para_un_nna_inexistente_propaga_el_error_de_integridad(
    auth_client: AsyncClient,
):
    """No hay validacion de existencia del NNA padre."""
    from sqlalchemy.exc import IntegrityError

    with pytest.raises(IntegrityError):
        await auth_client.post(f"/api/nna/{uuid.uuid4()}/casos", json={})


# ── Consulta ─────────────────────────────────────────────────────────────────


async def test_consulta_de_un_caso_por_su_id(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    id_caso = await caso_activo_id(auth_client, nna["id_nna"])

    res = await auth_client.get(f"/api/casos/{id_caso}")
    assert res.status_code == 200
    assert res.json()["id_caso"] == id_caso
    assert res.json()["id_nna"] == nna["id_nna"]


async def test_consulta_de_un_caso_inexistente_devuelve_404(auth_client: AsyncClient):
    res = await auth_client.get(f"/api/casos/{uuid.uuid4()}")
    assert res.status_code == 404
    assert res.json()["detail"] == "Caso no encontrado"


# ── Cierre ───────────────────────────────────────────────────────────────────


async def test_cerrar_un_caso_sella_la_fecha_de_termino_con_hoy(
    auth_client: AsyncClient,
):
    nna = await crear_nna(auth_client)
    id_caso = await caso_activo_id(auth_client, nna["id_nna"])

    res = await auth_client.put(f"/api/casos/{id_caso}", json={"estado": "Cerrado"})
    assert res.status_code == 200, res.text
    assert res.json()["estado"] == "Cerrado"
    assert res.json()["fecha_termino"] == date.today().isoformat()


async def test_cerrar_un_caso_respeta_la_fecha_de_termino_explicita(
    auth_client: AsyncClient,
):
    nna = await crear_nna(auth_client)
    id_caso = await caso_activo_id(auth_client, nna["id_nna"])

    res = await auth_client.put(
        f"/api/casos/{id_caso}",
        json={"estado": "Cerrado", "fecha_termino": "2020-12-31"},
    )
    assert res.status_code == 200
    assert res.json()["fecha_termino"] == "2020-12-31"


async def test_cerrar_un_caso_libera_el_cupo_de_caso_activo(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    id_nna = nna["id_nna"]
    await auth_client.put(
        f"/api/casos/{await caso_activo_id(auth_client, id_nna)}",
        json={"estado": "Cerrado"},
    )
    res = await auth_client.post(f"/api/nna/{id_nna}/casos", json={})
    assert res.status_code == 201


async def test_reabrir_un_caso_cuando_ya_hay_otro_activo_devuelve_409(
    auth_client: AsyncClient,
):
    nna = await crear_nna(auth_client)
    id_nna = nna["id_nna"]
    viejo = await caso_activo_id(auth_client, id_nna)
    await auth_client.put(f"/api/casos/{viejo}", json={"estado": "Cerrado"})
    nuevo = (await crear_caso(auth_client, id_nna))["id_caso"]

    res = await auth_client.put(f"/api/casos/{viejo}", json={"estado": "En Progreso"})
    assert res.status_code == 409
    assert res.json()["detail"] == "NNA ya tiene un caso activo"
    # El caso nuevo sigue siendo el activo.
    assert (await auth_client.get(f"/api/casos/{nuevo}")).json()["estado"] == "En Progreso"


async def test_reabrir_el_mismo_caso_activo_no_es_un_conflicto(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    id_caso = await caso_activo_id(auth_client, nna["id_nna"])

    res = await auth_client.put(f"/api/casos/{id_caso}", json={"estado": "En Progreso"})
    assert res.status_code == 200
    assert res.json()["estado"] == "En Progreso"


async def test_actualizar_solo_la_fecha_de_inicio(auth_client: AsyncClient):
    nna = await crear_nna(auth_client)
    id_caso = await caso_activo_id(auth_client, nna["id_nna"])

    res = await auth_client.put(f"/api/casos/{id_caso}", json={"fecha_inicio": "2019-01-02"})
    assert res.status_code == 200
    assert res.json()["fecha_inicio"] == "2019-01-02"
    assert res.json()["estado"] == "En Progreso"


async def test_actualizar_un_caso_inexistente_devuelve_404(auth_client: AsyncClient):
    res = await auth_client.put(f"/api/casos/{uuid.uuid4()}", json={"estado": "Cerrado"})
    assert res.status_code == 404
    assert res.json()["detail"] == "Caso no encontrado"


@pytest.mark.characterization
async def test_estado_fuera_del_dominio_falla_en_la_base(auth_client: AsyncClient):
    """El schema no valida ``estado``; el rechazo depende de la CheckConstraint."""
    from sqlalchemy.exc import IntegrityError

    nna = await crear_nna(auth_client)
    id_caso = await caso_activo_id(auth_client, nna["id_nna"])

    with pytest.raises(IntegrityError):
        await auth_client.put(f"/api/casos/{id_caso}", json={"estado": "Suspendido"})


async def test_no_se_puede_cerrar_un_caso_dos_veces_cambiando_la_fecha(
    auth_client: AsyncClient,
):
    """Cerrar de nuevo actualiza la fecha; no hay guard de idempotencia."""
    nna = await crear_nna(auth_client)
    id_caso = await caso_activo_id(auth_client, nna["id_nna"])
    await auth_client.put(f"/api/casos/{id_caso}", json={"estado": "Cerrado"})

    res = await auth_client.put(f"/api/casos/{id_caso}", json={"estado": "Cerrado"})
    assert res.status_code == 200
    assert res.json()["fecha_termino"] == date.today().isoformat()


async def test_el_cierre_de_un_caso_no_afecta_a_los_demas_nna(auth_client: AsyncClient):
    uno = await crear_nna(auth_client)
    dos = await crear_nna(auth_client)

    await auth_client.put(
        f"/api/casos/{await caso_activo_id(auth_client, uno['id_nna'])}",
        json={"estado": "Cerrado"},
    )

    assert (await auth_client.get(f"/api/nna/{uno['id_nna']}/casos")).json()[0]["estado"] == "Cerrado"
    assert (await auth_client.get(f"/api/nna/{dos['id_nna']}/casos")).json()[0]["estado"] == "En Progreso"
