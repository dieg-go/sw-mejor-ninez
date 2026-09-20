"""Pruebas de autenticacion: ``POST /api/auth/login`` y ``GET /api/auth/me``."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password
from app.models.usuario import Usuario
from tests.conftest import ADMIN_EMAIL, ADMIN_PASSWORD


def _token_expirado(sub: str) -> str:
    payload = {
        "sub": sub,
        "email": "expirado@mejorninez.cl",
        "exp": datetime.now(timezone.utc) - timedelta(minutes=5),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def _token_firmado_con_otro_secreto(sub: str) -> str:
    payload = {
        "sub": sub,
        "email": "falso@mejorninez.cl",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    return jwt.encode(payload, "secreto-incorrecto", algorithm=settings.JWT_ALGORITHM)


# ── Login ────────────────────────────────────────────────────────────────────


async def test_login_exitoso_devuelve_token_bearer(client: AsyncClient):
    res = await client.post(
        "/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert res.status_code == 200, res.text
    cuerpo = res.json()
    assert cuerpo["token_type"] == "bearer"
    assert cuerpo["access_token"]


async def test_login_no_expone_el_hash_de_la_password(client: AsyncClient):
    res = await client.post(
        "/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert "hashed_password" not in res.text
    assert "password" not in res.json()


async def test_el_token_contiene_sub_email_y_una_expiracion_de_ocho_horas(
    client: AsyncClient,
):
    res = await client.post(
        "/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    claims = jwt.decode(
        res.json()["access_token"], settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
    )

    assert claims["email"] == ADMIN_EMAIL
    uuid.UUID(claims["sub"])  # el sub debe ser un UUID valido

    exp = datetime.fromtimestamp(claims["exp"], tz=timezone.utc)
    delta = exp - datetime.now(timezone.utc)
    esperado = timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    assert timedelta(hours=7, minutes=50) < delta <= esperado
    assert settings.JWT_EXPIRE_MINUTES == 480


async def test_login_con_password_incorrecta_devuelve_401(client: AsyncClient):
    res = await client.post(
        "/api/auth/login", json={"email": ADMIN_EMAIL, "password": "no-es-la-password"}
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "Email o contraseña incorrectos"


async def test_login_con_email_inexistente_devuelve_401(client: AsyncClient):
    res = await client.post(
        "/api/auth/login", json={"email": "nadie@mejorninez.cl", "password": "x"}
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "Email o contraseña incorrectos"


async def test_login_sin_campos_requeridos_devuelve_422(client: AsyncClient):
    res = await client.post("/api/auth/login", json={"email": ADMIN_EMAIL})
    assert res.status_code == 422


async def test_login_de_usuario_inactivo_devuelve_403(
    client: AsyncClient, db_session: AsyncSession
):
    inactivo = Usuario(
        email=f"inactivo-{uuid.uuid4().hex[:8]}@mejorninez.cl",
        hashed_password=hash_password("secreta123"),
        nombre="Usuario Inactivo",
        is_active=False,
    )
    db_session.add(inactivo)
    await db_session.commit()

    res = await client.post(
        "/api/auth/login", json={"email": inactivo.email, "password": "secreta123"}
    )
    assert res.status_code == 403
    assert res.json()["detail"] == "Usuario inactivo"


async def test_login_no_distingue_entre_email_y_password_incorrectos(client: AsyncClient):
    """No debe filtrarse si el email existe (enumeracion de usuarios)."""
    inexistente = await client.post(
        "/api/auth/login", json={"email": "nadie@mejorninez.cl", "password": "x"}
    )
    mala_password = await client.post(
        "/api/auth/login", json={"email": ADMIN_EMAIL, "password": "mala"}
    )
    assert inexistente.status_code == mala_password.status_code == 401
    assert inexistente.json() == mala_password.json()


# ── /me ──────────────────────────────────────────────────────────────────────


async def test_me_devuelve_el_usuario_autenticado(
    client: AsyncClient, auth_headers: dict[str, str]
):
    res = await client.get("/api/auth/me", headers=auth_headers)
    assert res.status_code == 200
    cuerpo = res.json()
    assert cuerpo["email"] == ADMIN_EMAIL
    assert cuerpo["is_active"] is True
    assert "hashed_password" not in cuerpo


async def test_me_sin_header_devuelve_403(client: AsyncClient):
    res = await client.get("/api/auth/me")
    assert res.status_code == 403


async def test_me_con_token_basura_devuelve_401(
    client: AsyncClient, token: str
):
    res = await client.get("/api/auth/me", headers={"Authorization": "Bearer no-es-un-jwt"})
    assert res.status_code == 401
    assert res.json()["detail"] == "Token inválido o expirado"


async def test_me_con_token_expirado_devuelve_401(
    client: AsyncClient, db_session: AsyncSession
):
    usuario = Usuario(
        email=f"expira-{uuid.uuid4().hex[:8]}@mejorninez.cl",
        hashed_password=hash_password("secreta123"),
    )
    db_session.add(usuario)
    await db_session.commit()

    res = await client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {_token_expirado(str(usuario.id_usuario))}"}
    )
    assert res.status_code == 401


async def test_me_con_token_firmado_con_otro_secreto_devuelve_401(
    client: AsyncClient, db_session: AsyncSession
):
    usuario = Usuario(
        email=f"firma-{uuid.uuid4().hex[:8]}@mejorninez.cl",
        hashed_password=hash_password("secreta123"),
    )
    db_session.add(usuario)
    await db_session.commit()

    res = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {_token_firmado_con_otro_secreto(str(usuario.id_usuario))}"},
    )
    assert res.status_code == 401


async def test_me_con_usuario_inexistente_devuelve_401(client: AsyncClient):
    """Token bien firmado pero cuyo usuario ya no existe."""
    from app.core.security import create_access_token

    token_huerfano = create_access_token(uuid.uuid4(), "fantasma@mejorninez.cl")
    res = await client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {token_huerfano}"}
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "Usuario no encontrado o inactivo"


async def test_me_con_usuario_desactivado_devuelve_401(
    client: AsyncClient, db_session: AsyncSession
):
    """El usuario existe pero fue desactivado despues de emitir el token."""
    from app.core.security import create_access_token

    usuario = Usuario(
        email=f"baja-{uuid.uuid4().hex[:8]}@mejorninez.cl",
        hashed_password=hash_password("secreta123"),
        is_active=True,
    )
    db_session.add(usuario)
    await db_session.commit()

    token_previo = create_access_token(usuario.id_usuario, usuario.email)

    usuario.is_active = False
    db_session.add(usuario)
    await db_session.commit()

    res = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_previo}"})
    assert res.status_code == 401
    assert res.json()["detail"] == "Usuario no encontrado o inactivo"


async def test_me_con_token_sin_sub_devuelve_401(client: AsyncClient):
    sin_sub = jwt.encode(
        {"email": ADMIN_EMAIL, "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )
    res = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {sin_sub}"})
    assert res.status_code == 401
    assert res.json()["detail"] == "Token inválido"
