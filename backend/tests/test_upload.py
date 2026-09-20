"""Pruebas de ``POST /api/upload/docs`` y del servido estatico.

Se comprueban las tres rejas del endpoint: extension permitida, tamano maximo
de 10 MB y autenticacion. El nombre en disco es un UUID, sin relacion con el
nombre original, y el nombre original no se sanea (solo se guarda en la
respuesta).
"""

from pathlib import Path

import pytest
from httpx import AsyncClient

from app.core.config import settings

MAX_SIZE = 10 * 1024 * 1024
EXTENSIONES_PERMITIDAS = [
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
]
EXTENSIONES_PROHIBIDAS = [".exe", ".sh", ".py", ".zip", ".svg", ".html", ".txt"]


def _limpiar(url: str) -> None:
    Path(settings.UPLOAD_DIR, Path(url).name).unlink(missing_ok=True)


async def test_subida_sin_autenticacion_devuelve_403(client: AsyncClient):
    res = await client.post(
        "/api/upload/docs", files={"file": ("informe.pdf", b"contenido", "application/pdf")}
    )
    assert res.status_code == 403


async def test_subida_de_pdf(auth_client: AsyncClient):
    res = await auth_client.post(
        "/api/upload/docs",
        files={"file": ("informe.pdf", b"%PDF-1.4 datos", "application/pdf")},
    )
    assert res.status_code == 200, res.text
    cuerpo = res.json()
    _limpiar(cuerpo["url"])

    assert cuerpo["filename"] == "informe.pdf"
    assert cuerpo["url"].startswith("/uploads/")
    assert cuerpo["url"].endswith(".pdf")


async def test_el_nombre_en_disco_no_usa_el_nombre_original(auth_client: AsyncClient):
    res = await auth_client.post(
        "/api/upload/docs",
        files={"file": ("mi informe confidencial 2024.pdf", b"x", "application/pdf")},
    )
    url = res.json()["url"]
    _limpiar(url)

    assert "confidencial" not in url
    assert Path(url).name != "mi informe confidencial 2024.pdf"


async def test_dos_subidas_del_mismo_nombre_no_se_pisan(auth_client: AsyncClient):
    primera = await auth_client.post(
        "/api/upload/docs", files={"file": ("informe.pdf", b"primero", "application/pdf")}
    )
    segunda = await auth_client.post(
        "/api/upload/docs", files={"file": ("informe.pdf", b"segundo", "application/pdf")}
    )
    url_1, url_2 = primera.json()["url"], segunda.json()["url"]
    _limpiar(url_1)
    _limpiar(url_2)

    assert url_1 != url_2
    assert url_1.endswith(".pdf") and url_2.endswith(".pdf")


async def test_la_extension_se_normaliza_a_minusculas(auth_client: AsyncClient):
    res = await auth_client.post(
        "/api/upload/docs", files={"file": ("INFORME.PDF", b"x", "application/pdf")}
    )
    assert res.status_code == 200, res.text
    url = res.json()["url"]
    _limpiar(url)
    assert url.endswith(".pdf")


@pytest.mark.parametrize("extension", EXTENSIONES_PERMITIDAS)
async def test_extensiones_permitidas(auth_client: AsyncClient, extension: str):
    res = await auth_client.post(
        "/api/upload/docs",
        files={"file": (f"archivo{extension}", b"contenido", "application/octet-stream")},
    )
    assert res.status_code == 200, f"{extension}: {res.text}"
    url = res.json()["url"]
    _limpiar(url)
    assert url.endswith(extension)


@pytest.mark.parametrize("extension", EXTENSIONES_PROHIBIDAS)
async def test_extensiones_prohibidas(auth_client: AsyncClient, extension: str):
    res = await auth_client.post(
        "/api/upload/docs",
        files={"file": (f"archivo{extension}", b"contenido", "application/octet-stream")},
    )
    assert res.status_code == 400
    assert extension in res.json()["detail"]


async def test_archivo_sin_extension_devuelve_400(auth_client: AsyncClient):
    res = await auth_client.post(
        "/api/upload/docs", files={"file": ("sin_extension", b"x", "application/octet-stream")}
    )
    assert res.status_code == 400


async def test_archivo_justo_en_el_limite_es_aceptado(auth_client: AsyncClient):
    res = await auth_client.post(
        "/api/upload/docs",
        files={"file": ("grande.pdf", b"a" * MAX_SIZE, "application/pdf")},
    )
    assert res.status_code == 200, res.text
    _limpiar(res.json()["url"])


async def test_archivo_que_excede_el_limite_devuelve_400(auth_client: AsyncClient):
    res = await auth_client.post(
        "/api/upload/docs",
        files={"file": ("enorme.pdf", b"a" * (MAX_SIZE + 1), "application/pdf")},
    )
    assert res.status_code == 400
    assert "10 MB" in res.json()["detail"]


async def test_archivo_vacio_es_aceptado(auth_client: AsyncClient):
    res = await auth_client.post(
        "/api/upload/docs", files={"file": ("vacio.pdf", b"", "application/pdf")}
    )
    assert res.status_code == 200
    url = res.json()["url"]

    try:
        servido = await auth_client.get(url)
        assert servido.status_code == 200
        assert servido.content == b""
    finally:
        _limpiar(url)


async def test_subida_sin_archivo_devuelve_422(auth_client: AsyncClient):
    res = await auth_client.post("/api/upload/docs")
    assert res.status_code == 422


async def test_el_archivo_subido_se_puede_descargar_con_su_contenido(
    auth_client: AsyncClient,
):
    contenido = b"contenido binario \x00\x01\x02 de prueba"
    subida = await auth_client.post(
        "/api/upload/docs", files={"file": ("datos.pdf", contenido, "application/pdf")}
    )
    url = subida.json()["url"]

    try:
        descarga = await auth_client.get(url)
        assert descarga.status_code == 200
        assert descarga.content == contenido
    finally:
        _limpiar(url)


async def test_el_archivo_se_escribe_en_el_directorio_de_subidas(auth_client: AsyncClient):
    subida = await auth_client.post(
        "/api/upload/docs", files={"file": ("x.pdf", b"hola", "application/pdf")}
    )
    url = subida.json()["url"]
    try:
        ruta = Path(settings.UPLOAD_DIR, Path(url).name)
        assert ruta.is_file()
        assert ruta.read_bytes() == b"hola"
    finally:
        _limpiar(url)


@pytest.mark.characterization
async def test_un_nombre_con_travesia_de_directorios_no_escapa_del_directorio(
    auth_client: AsyncClient,
):
    """El nombre original nunca se usa como ruta: el archivo se guarda como UUID.

    El endpoint no sanea el nombre (lo devuelve tal cual), pero tampoco lo usa
    para construir la ruta, asi que no hay escritura fuera de ``uploads/``.
    """
    subida = await auth_client.post(
        "/api/upload/docs",
        files={"file": ("../../fuera.pdf", b"malicioso", "application/pdf")},
    )
    assert subida.status_code == 200
    url = subida.json()["url"]

    try:
        assert ".." not in url
        ruta = Path(settings.UPLOAD_DIR, Path(url).name).resolve()
        assert ruta.parent == Path(settings.UPLOAD_DIR).resolve()
        # El nombre original se devuelve sin sanear.
        assert subida.json()["filename"] == "../../fuera.pdf"
    finally:
        _limpiar(url)


async def test_los_uploads_son_publicos_sin_token(client: AsyncClient, auth_client: AsyncClient):
    subida = await auth_client.post(
        "/api/upload/docs", files={"file": ("publico.pdf", b"dato", "application/pdf")}
    )
    url = subida.json()["url"]
    try:
        # Sin cabecera de autorizacion: el mount estatico no esta protegido.
        res = await client.get(url)
        assert res.status_code == 200
        assert res.content == b"dato"
    finally:
        _limpiar(url)
