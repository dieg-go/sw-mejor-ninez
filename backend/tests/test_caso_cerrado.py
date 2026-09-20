"""Matriz de la regla "caso cerrado = solo lectura".

``_assert_caso_abierto`` (``app/services/__init__.py``) rechaza con **409** toda
escritura sobre un registro que pertenece a un ``Caso`` cerrado. Se aplica a
las 10 tablas agrupadas, mas los comentarios NCFAS y las notificaciones de
despeje, que comprueban el caso de su padre. Las entidades de nivel NNA o
Familiar (consumo, discapacidad, red proteccional, vinculos, antecedentes
penales) **no** estan agrupadas y siguen siendo editables: estas pruebas fijan
ese contrato.
"""

from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import AsyncClient

from tests.factories import (
    EscenarioCasoCerrado,
    caso_activo_id,
    crear_antecedente_salud,
    crear_despeje,
    crear_documentacion,
    crear_e2p,
    crear_familiar,
    crear_nna,
    escenario_caso_cerrado,
)

DETALLE_409 = "El caso está cerrado: no se pueden modificar sus registros"


@pytest_asyncio.fixture
async def cerrado(auth_client: AsyncClient) -> EscenarioCasoCerrado:
    """Un NNA con un registro de cada tabla agrupada y el caso ya cerrado."""
    return await escenario_caso_cerrado(auth_client)


# ── La matriz: 409 en las 10 tablas agrupadas ────────────────────────────────
#
# Cada fila es (clave, ruta de escritura, ruta de lectura, payload).
# El despeje no tiene GET por id: su lectura es la cabecera por NNA + caso.

ESCRITURAS_BLOQUEADAS = [
    ("e2p", "/api/e2p/{id}", "/api/e2p/{id}", {"observacion": "intento con el caso cerrado"}),
    ("pmf", "/api/pmf/{id}", "/api/pmf/{id}", {"resultado": "intento con el caso cerrado"}),
    ("ncfas", "/api/ncfas/{id}", "/api/ncfas/{id}", {"estado": "intento con el caso cerrado"}),
    (
        "ingreso",
        "/api/antecedente-ingreso/{id}",
        "/api/antecedente-ingreso/{id}",
        {"tribunal": "intento con el caso cerrado"},
    ),
    (
        "documentacion",
        "/api/documentacion-ingreso/{id}",
        "/api/documentacion-ingreso/{id}",
        {"observacion": "intento"},
    ),
    ("salud", "/api/antecedente-salud/{id}", "/api/antecedente-salud/{id}", {"prevision": "Isapre"}),
    (
        "escolar",
        "/api/antecedente-escolar/{id}",
        "/api/antecedente-escolar/{id}",
        {"ultimo_ano_cursado": 1},
    ),
    (
        "familiar",
        "/api/antecedente-familiar/{id}",
        "/api/antecedente-familiar/{id}",
        {"con_quien_vive": "Otro"},
    ),
    ("informe", "/api/informe-tribunal/{id}", "/api/informe-tribunal/{id}", {"estado": "Enviado"}),
    (
        "despeje",
        "/api/despeje/{id}",
        "/api/nna/{id_nna}/despeje?id_caso={id_caso}",
        {"estado": "Cerrado Sin Red"},
    ),
]

IDS_MATRIZ = [c[0] for c in ESCRITURAS_BLOQUEADAS]


def _campo_id(clave: str) -> str:
    return {
        "e2p": "id_e2p",
        "pmf": "id_pmf",
        "ncfas": "id_ncfas",
        "ingreso": "id_antecedente_ingreso",
        "documentacion": "id_documentacion",
        "salud": "id_antecedente_salud",
        "escolar": "id_antecedente_escolar",
        "familiar": "id_antecedente_familiar",
        "informe": "id_informe",
        "despeje": "id_despeje",
    }[clave]


def _rutas(cerrado: EscenarioCasoCerrado, clave: str, plantilla: str) -> str:
    return plantilla.format(
        id=cerrado.registros[clave][_campo_id(clave)],
        id_nna=cerrado.id_nna,
        id_caso=cerrado.id_caso,
    )


@pytest.mark.parametrize(
    ("clave", "plantilla_put", "plantilla_get", "payload"),
    ESCRITURAS_BLOQUEADAS,
    ids=IDS_MATRIZ,
)
async def test_escritura_sobre_registro_de_caso_cerrado_devuelve_409(
    auth_client: AsyncClient,
    cerrado: EscenarioCasoCerrado,
    clave: str,
    plantilla_put: str,
    plantilla_get: str,
    payload: dict,
):
    res = await auth_client.put(_rutas(cerrado, clave, plantilla_put), json=payload)
    assert res.status_code == 409, f"{clave}: {res.status_code} {res.text}"
    assert res.json()["detail"] == DETALLE_409


@pytest.mark.parametrize(
    ("clave", "plantilla_put", "plantilla_get", "payload"),
    ESCRITURAS_BLOQUEADAS,
    ids=IDS_MATRIZ,
)
async def test_la_escritura_rechazada_no_altera_el_registro(
    auth_client: AsyncClient,
    cerrado: EscenarioCasoCerrado,
    clave: str,
    plantilla_put: str,
    plantilla_get: str,
    payload: dict,
):
    antes = cerrado.registros[clave]

    await auth_client.put(_rutas(cerrado, clave, plantilla_put), json=payload)

    despues = (await auth_client.get(_rutas(cerrado, clave, plantilla_get))).json()
    for campo, valor in payload.items():
        assert despues[campo] != valor, f"{clave}: {campo} cambio pese al 409"
    for campo, valor in antes.items():
        if campo in despues:
            assert despues[campo] == valor, f"{clave}: {campo} cambio pese al 409"


# ── El caso sigue siendo legible ─────────────────────────────────────────────


@pytest.mark.parametrize(
    ("clave", "plantilla_put", "plantilla_get", "payload"),
    ESCRITURAS_BLOQUEADAS,
    ids=IDS_MATRIZ,
)
async def test_los_registros_del_caso_cerrado_siguen_siendo_legibles(
    auth_client: AsyncClient,
    cerrado: EscenarioCasoCerrado,
    clave: str,
    plantilla_put: str,
    plantilla_get: str,
    payload: dict,
):
    res = await auth_client.get(_rutas(cerrado, clave, plantilla_get))
    assert res.status_code == 200, f"{clave}: {res.status_code} {res.text}"


async def test_el_listado_filtrado_por_el_caso_cerrado_sigue_disponible(
    auth_client: AsyncClient, cerrado: EscenarioCasoCerrado
):
    res = await auth_client.get(
        f"/api/nna/{cerrado.id_nna}/e2p?id_caso={cerrado.id_caso}"
    )
    assert res.status_code == 200
    assert len(res.json()) == 1


# ── Comentarios NCFAS y notificaciones (caso del padre) ──────────────────────


async def test_comentario_ncfas_bloqueado_en_caso_cerrado(
    auth_client: AsyncClient, cerrado: EscenarioCasoCerrado
):
    res = await auth_client.put(
        f"/api/ncfas/{cerrado.id_ncfas}/comentarios/A", json={"comentario": "texto"}
    )
    assert res.status_code == 409
    assert res.json()["detail"] == DETALLE_409


async def test_listar_comentarios_de_un_caso_cerrado_esta_permitido(
    auth_client: AsyncClient, cerrado: EscenarioCasoCerrado
):
    res = await auth_client.get(f"/api/ncfas/{cerrado.id_ncfas}/comentarios")
    assert res.status_code == 200
    assert res.json() == []


async def test_notificacion_bloqueada_en_caso_cerrado(
    auth_client: AsyncClient, cerrado: EscenarioCasoCerrado
):
    id_notificacion = cerrado.registros["notificacion"]["id_notificacion"]
    res = await auth_client.put(
        f"/api/notificacion/{id_notificacion}", json={"resultado_contacto": "No responde"}
    )
    assert res.status_code == 409
    assert res.json()["detail"] == DETALLE_409


async def test_crear_notificacion_en_un_despeje_cerrado_devuelve_409(
    auth_client: AsyncClient, cerrado: EscenarioCasoCerrado
):
    otro_familiar = await crear_familiar(auth_client)
    res = await auth_client.post(
        f"/api/despeje/{cerrado.id_despeje}/notificaciones",
        json={"id_familiar": otro_familiar["id_familiar"]},
    )
    assert res.status_code == 409
    assert res.json()["detail"] == DETALLE_409


async def test_listar_notificaciones_de_un_despeje_cerrado_esta_permitido(
    auth_client: AsyncClient, cerrado: EscenarioCasoCerrado
):
    res = await auth_client.get(f"/api/despeje/{cerrado.id_despeje}/notificaciones")
    assert res.status_code == 200
    assert len(res.json()) == 1


# ── Contrato de las entidades NO agrupadas ───────────────────────────────────


async def test_el_historial_de_consumo_del_nna_sigue_editable(
    auth_client: AsyncClient, cerrado: EscenarioCasoCerrado
):
    creado = (
        await auth_client.post(
            f"/api/nna/{cerrado.id_nna}/historial-consumo",
            json={"nombre_sustancia": "Alcohol", "estado_consumo": "Activo"},
        )
    ).json()
    res = await auth_client.put(
        f"/api/historial-consumo-nna/{creado['id_historial_consumo_nna']}",
        json={"estado_consumo": "En tratamiento"},
    )
    assert res.status_code == 200
    assert res.json()["estado_consumo"] == "En tratamiento"


async def test_la_discapacidad_del_nna_sigue_editable(
    auth_client: AsyncClient, cerrado: EscenarioCasoCerrado
):
    creado = (
        await auth_client.post(
            f"/api/nna/{cerrado.id_nna}/discapacidades",
            json={"tipo": "Auditiva", "porcentaje_grado": 35},
        )
    ).json()
    res = await auth_client.put(
        f"/api/discapacidad-nna/{creado['id_discapacidad_nna']}",
        json={"porcentaje_grado": 40},
    )
    assert res.status_code == 200
    assert res.json()["porcentaje_grado"] == 40


async def test_el_historial_red_sigue_editable(
    auth_client: AsyncClient, cerrado: EscenarioCasoCerrado
):
    creado = (
        await auth_client.post(
            f"/api/nna/{cerrado.id_nna}/historial-red",
            json={"nombre_programa": "PPE"},
        )
    ).json()
    res = await auth_client.put(
        f"/api/historial-red/{creado['id_historial_red']}",
        json={"motivo_egreso": "Egreso exitoso"},
    )
    assert res.status_code == 200
    assert res.json()["motivo_egreso"] == "Egreso exitoso"


async def test_el_vinculo_familiar_sigue_editable(
    auth_client: AsyncClient, cerrado: EscenarioCasoCerrado
):
    creado = (
        await auth_client.post(
            f"/api/nna/{cerrado.id_nna}/vinculos",
            json={"id_familiar": cerrado.id_familiar, "parentesco": "Madre"},
        )
    ).json()
    res = await auth_client.put(
        f"/api/vinculo-familiar/{creado['id_vinculo_familiar']}",
        json={"parentesco": "Madre biológica"},
    )
    assert res.status_code == 200
    assert res.json()["parentesco"] == "Madre biológica"


async def test_el_consumo_del_familiar_sigue_editable(
    auth_client: AsyncClient, cerrado: EscenarioCasoCerrado
):
    creado = (
        await auth_client.post(
            f"/api/familiares/{cerrado.id_familiar}/historial-consumo",
            json={"nombre_sustancia": "Alcohol", "estado_consumo": "Activo"},
        )
    ).json()
    res = await auth_client.put(
        f"/api/historial-consumo-adulto/{creado['id_historial_consumo_adulto']}",
        json={"en_tratamiento": True},
    )
    assert res.status_code == 200
    assert res.json()["en_tratamiento"] is True


# ── Escrituras que abren un caso nuevo ───────────────────────────────────────


@pytest.mark.characterization
async def test_un_alta_tras_cerrar_el_caso_abre_uno_nuevo(
    auth_client: AsyncClient, cerrado: EscenarioCasoCerrado
):
    """No hay guard de "caso cerrado" en las altas: se crea un caso nuevo.

    ``create_nna_child`` busca un caso activo y, si no lo encuentra, crea uno.
    Es la via por la que un NNA con el caso cerrado puede volver a tener
    registros agrupados, sin pasar por el boton "Nuevo caso".
    """
    creado = await crear_antecedente_salud(auth_client, cerrado.id_nna)

    assert creado["id_caso"] not in (None, cerrado.id_caso)

    casos = (await auth_client.get(f"/api/nna/{cerrado.id_nna}/casos")).json()
    assert len(casos) == 2
    assert sorted(c["estado"] for c in casos) == ["Cerrado", "En Progreso"]
    assert await caso_activo_id(auth_client, cerrado.id_nna)


@pytest.mark.characterization
async def test_un_despeje_tras_cerrar_el_caso_devuelve_409_por_falta_de_caso_activo(
    auth_client: AsyncClient, cerrado: EscenarioCasoCerrado
):
    """El despeje no puede auto-abrir caso: ``POST`` exige caso activo."""
    res = await auth_client.post(f"/api/nna/{cerrado.id_nna}/despeje", json={})
    assert res.status_code == 409
    assert res.json()["detail"] == "No hay un caso activo para este NNA"


@pytest.mark.characterization
async def test_un_informe_tras_cerrar_el_caso_tambien_abre_un_caso_nuevo(
    auth_client: AsyncClient, cerrado: EscenarioCasoCerrado
):
    from tests.factories import crear_informe

    creado = await crear_informe(auth_client, cerrado.id_nna)
    assert creado["id_caso"] != cerrado.id_caso


# ── Coherencia del propio escenario ──────────────────────────────────────────


async def test_todos_los_registros_del_escenario_pertenecen_al_caso_cerrado(
    auth_client: AsyncClient, cerrado: EscenarioCasoCerrado
):
    """Garantiza que la matriz de 409 prueba lo que dice probar."""
    for clave, registro in cerrado.registros.items():
        if clave == "notificacion":
            continue
        assert registro.get("id_caso") == cerrado.id_caso, clave


async def test_el_escenario_deja_exactamente_un_caso_cerrado(
    auth_client: AsyncClient, cerrado: EscenarioCasoCerrado
):
    casos = (await auth_client.get(f"/api/nna/{cerrado.id_nna}/casos")).json()
    assert len(casos) == 1
    assert casos[0]["estado"] == "Cerrado"
    assert casos[0]["fecha_termino"] is not None


async def test_un_e2p_creado_por_la_factoria_queda_en_el_caso_activo(
    auth_client: AsyncClient,
):
    nna = await crear_nna(auth_client)
    familiar = await crear_familiar(auth_client)
    e2p = await crear_e2p(auth_client, nna["id_nna"], familiar["id_familiar"])
    assert e2p["id_caso"] == await caso_activo_id(auth_client, nna["id_nna"])


async def test_la_documentacion_creada_por_la_factoria_queda_en_el_caso_activo(
    auth_client: AsyncClient,
):
    nna = await crear_nna(auth_client)
    doc = await crear_documentacion(auth_client, nna["id_nna"])
    assert doc["id_caso"] == await caso_activo_id(auth_client, nna["id_nna"])


async def test_el_despeje_creado_por_la_factoria_queda_en_el_caso_activo(
    auth_client: AsyncClient,
):
    nna = await crear_nna(auth_client)
    despeje = await crear_despeje(auth_client, nna["id_nna"])
    assert despeje["id_caso"] == await caso_activo_id(auth_client, nna["id_nna"])
