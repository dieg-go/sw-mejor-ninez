"""Pruebas de ``/health``, del middleware CORS y del mount estatico ``/uploads``."""

from __future__ import annotations

from pathlib import Path

import pytest
from httpx import AsyncClient

from app.core.config import settings


async def test_health_no_requiere_autenticacion(client: AsyncClient):
    res = await client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


async def test_cors_permite_el_origen_del_frontend(client: AsyncClient):
    res = await client.options(
        "/api/nna",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )
    assert res.status_code == 200
    assert res.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert res.headers["access-control-allow-credentials"] == "true"


async def test_cors_rechaza_un_origen_desconocido(client: AsyncClient):
    res = await client.options(
        "/api/nna",
        headers={
            "Origin": "http://sitio-malicioso.example",
            "Access-Control-Request-Method": "GET",
        },
    )
    # Starlette responde 400 y no emite el header de origen permitido.
    assert "access-control-allow-origin" not in res.headers


async def test_cors_expone_el_origen_en_respuestas_simples(client: AsyncClient):
    res = await client.get("/health", headers={"Origin": "http://localhost:3000"})
    assert res.status_code == 200
    assert res.headers.get("access-control-allow-origin") == "http://localhost:3000"


async def test_uploads_sirve_un_archivo_subido(auth_client: AsyncClient):
    contenido = b"%PDF-1.4 contenido de prueba"
    res = await auth_client.post(
        "/api/upload/docs", files={"file": ("informe.pdf", contenido, "application/pdf")}
    )
    assert res.status_code == 200, res.text
    url = res.json()["url"]
    assert url.startswith("/uploads/")

    servido = await auth_client.get(url)
    assert servido.status_code == 200
    assert servido.content == contenido

    # Limpieza: el archivo vive en el sistema de archivos, no en la DB.
    Path(settings.UPLOAD_DIR, Path(url).name).unlink(missing_ok=True)


async def test_uploads_devuelve_404_para_archivo_inexistente(client: AsyncClient):
    res = await client.get("/uploads/no-existe-12345.pdf")
    assert res.status_code == 404
