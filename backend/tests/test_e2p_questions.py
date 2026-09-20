"""Pruebas de ``GET /api/e2p/versions/{rango_etario}``.

El parametro es la **cadena** del rango etario (p. ej. ``3-5_anos``), no un
numero de version: ``/versions/1`` devuelve 404. Las preguntas se leen de la
tabla ``PreguntaE2P`` sembrada desde ``app/data/e2p_questions.json``.
"""

import pytest
from httpx import AsyncClient

RANGOS_VALIDOS = [
    "0-3_meses",
    "4-10_meses",
    "11-18_meses",
    "19-36_meses",
    "3-5_anos",
    "6-7_anos",
    "8-12_anos",
    "13-17_anos",
]

ETIQUETAS = {
    "0-3_meses": "0 a 3 meses",
    "4-10_meses": "4 a 10 meses",
    "11-18_meses": "11 a 18 meses",
    "19-36_meses": "19 a 36 meses",
    "3-5_anos": "3 a 5 años",
    "6-7_anos": "6 a 7 años",
    "8-12_anos": "8 a 12 años",
    "13-17_anos": "13 a 17 años",
}

DIMENSIONES = {"Vinculares", "Formativas", "Protectoras", "Reflexivas"}

ESCALA_LIKERT = {
    "0": "Nunca",
    "1": "Casi Nunca",
    "2": "A veces",
    "3": "Casi Siempre",
    "4": "Siempre",
}


@pytest.mark.parametrize("rango", RANGOS_VALIDOS)
async def test_cada_rango_valido_devuelve_sus_preguntas(auth_client: AsyncClient, rango: str):
    res = await auth_client.get(f"/api/e2p/versions/{rango}")
    assert res.status_code == 200, f"{rango}: {res.text}"

    cuerpo = res.json()
    assert cuerpo["edad"] == ETIQUETAS[rango]
    assert cuerpo["preguntas"], f"{rango} no tiene preguntas"
    for pregunta in cuerpo["preguntas"]:
        assert isinstance(pregunta["id"], int)
        assert pregunta["texto"]
        assert pregunta["dimension"] in DIMENSIONES


@pytest.mark.parametrize("rango", RANGOS_VALIDOS)
async def test_cada_rango_cubre_las_cuatro_dimensiones(
    auth_client: AsyncClient, rango: str
):
    preguntas = (await auth_client.get(f"/api/e2p/versions/{rango}")).json()["preguntas"]
    assert {p["dimension"] for p in preguntas} == DIMENSIONES


@pytest.mark.parametrize("rango", RANGOS_VALIDOS)
async def test_los_items_de_cada_rango_no_se_repiten(auth_client: AsyncClient, rango: str):
    preguntas = (await auth_client.get(f"/api/e2p/versions/{rango}")).json()["preguntas"]
    numeros = [p["id"] for p in preguntas]
    assert len(numeros) == len(set(numeros))


@pytest.mark.parametrize("rango", RANGOS_VALIDOS)
async def test_las_preguntas_vienen_ordenadas_por_numero_de_item(
    auth_client: AsyncClient, rango: str
):
    preguntas = (await auth_client.get(f"/api/e2p/versions/{rango}")).json()["preguntas"]
    numeros = [p["id"] for p in preguntas]
    assert numeros == sorted(numeros)


async def test_la_escala_likert_es_la_misma_en_todos_los_rangos(auth_client: AsyncClient):
    for rango in RANGOS_VALIDOS:
        cuerpo = (await auth_client.get(f"/api/e2p/versions/{rango}")).json()
        assert cuerpo["escala"] == ESCALA_LIKERT


async def test_las_preguntas_incluyen_subdimension_cuando_existe(
    auth_client: AsyncClient,
):
    preguntas = (await auth_client.get("/api/e2p/versions/19-36_meses")).json()["preguntas"]
    # Todas las preguntas exponen la clave, aunque el valor sea nulo.
    assert all("subdimension" in p for p in preguntas)


async def test_el_rango_19_36_meses_reparte_15_items_por_dimension(
    auth_client: AsyncClient,
):
    preguntas = (await auth_client.get("/api/e2p/versions/19-36_meses")).json()["preguntas"]
    por_dimension: dict[str, list[int]] = {}
    for p in preguntas:
        por_dimension.setdefault(p["dimension"], []).append(p["id"])

    assert {d: len(v) for d, v in por_dimension.items()} == {
        "Vinculares": 15,
        "Formativas": 15,
        "Protectoras": 15,
        "Reflexivas": 15,
    }
    assert por_dimension["Vinculares"] == list(range(1, 16))
    assert por_dimension["Formativas"] == list(range(16, 31))
    assert por_dimension["Protectoras"] == list(range(31, 46))
    assert por_dimension["Reflexivas"] == list(range(46, 61))


async def test_un_rango_numerico_como_version_devuelve_404(auth_client: AsyncClient):
    """El parametro es el rango etario, no un indice de version."""
    res = await auth_client.get("/api/e2p/versions/1")
    assert res.status_code == 404
    assert "1" in res.json()["detail"]


async def test_un_rango_inexistente_devuelve_404(auth_client: AsyncClient):
    res = await auth_client.get("/api/e2p/versions/99-100_anos")
    assert res.status_code == 404
    assert res.json()["detail"] == "Rango etario '99-100_anos' no existe"


async def test_un_rango_con_guion_bajo_incorrecto_devuelve_404(auth_client: AsyncClient):
    res = await auth_client.get("/api/e2p/versions/3-5-anos")
    assert res.status_code == 404


async def test_la_lista_de_preguntas_es_estable_entre_llamadas(auth_client: AsyncClient):
    primera = (await auth_client.get("/api/e2p/versions/19-36_meses")).json()
    segunda = (await auth_client.get("/api/e2p/versions/19-36_meses")).json()
    assert primera == segunda
