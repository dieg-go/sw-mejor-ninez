"""Helpers para crear entidades a traves del cliente HTTP real.

Todas las factorias pegan contra la API (no contra la base directamente) para
que el auto-sellado de ``id_caso``, la creacion del caso activo y la
normalizacion de instrumentos ocurran exactamente como en produccion.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any

from httpx import AsyncClient

__all__ = [
    "EscenarioCasoCerrado",
    "caso_activo_id",
    "crear_antecedente_escolar",
    "crear_antecedente_familiar",
    "crear_antecedente_ingreso",
    "crear_antecedente_salud",
    "crear_caso",
    "crear_despeje",
    "crear_documentacion",
    "crear_e2p",
    "crear_familiar",
    "crear_informe",
    "crear_ncfas",
    "crear_nna",
    "crear_notificacion",
    "crear_pmf",
    "crear_vinculo_familiar",
    "escenario_caso_cerrado",
    "hoy",
    "iso",
]


def hoy(dias: int = 0) -> date:
    return date.today() + timedelta(days=dias)


def iso(dias: int = 0) -> str:
    return hoy(dias).isoformat()


def _ok(res, esperado: int = 201) -> dict:
    assert res.status_code == esperado, f"{res.request.method} {res.request.url} -> {res.status_code}: {res.text}"
    return res.json()


# ── Raices ───────────────────────────────────────────────────────────────────


async def crear_nna(client: AsyncClient, **overrides: Any) -> dict:
    payload: dict[str, Any] = {
        "nombre": f"NNA {uuid.uuid4().hex[:8]}",
        "run": f"RUN-{uuid.uuid4().hex[:12]}",
        "fecha_nacimiento": "2016-04-11",
        "sexo": "Femenino",
        "nacionalidad": "Chilena",
        "comuna": "Santiago",
        "region": "Metropolitana",
    }
    payload.update(overrides)
    payload = {k: v for k, v in payload.items() if v is not None}
    return _ok(await client.post("/api/nna", json=payload))


async def crear_familiar(client: AsyncClient, **overrides: Any) -> dict:
    payload: dict[str, Any] = {"nombre": f"Familiar {uuid.uuid4().hex[:8]}"}
    payload.update(overrides)
    return _ok(await client.post("/api/familiares", json=payload))


async def caso_activo_id(client: AsyncClient, id_nna: str) -> str:
    res = await client.get(f"/api/nna/{id_nna}/casos")
    assert res.status_code == 200, res.text
    activos = [c for c in res.json() if c["estado"] == "En Progreso"]
    assert activos, f"el NNA {id_nna} no tiene caso activo"
    return activos[0]["id_caso"]


async def crear_caso(client: AsyncClient, id_nna: str, **overrides: Any) -> dict:
    return _ok(await client.post(f"/api/nna/{id_nna}/casos", json=overrides))


# ── Registros agrupados por Caso ─────────────────────────────────────────────


async def crear_e2p(
    client: AsyncClient, id_nna: str, id_familiar: str, **overrides: Any
) -> dict:
    payload: dict[str, Any] = {
        "id_familiar": id_familiar,
        "fecha_evaluacion": iso(-10),
        "edad_meses_evaluacion": 24,
        "rango_etario": "19-36_meses",
        "observacion": "evaluacion de prueba",
    }
    payload.update(overrides)
    return _ok(await client.post(f"/api/nna/{id_nna}/e2p", json=payload))


async def crear_pmf(
    client: AsyncClient, id_nna: str, id_familiar: str, **overrides: Any
) -> dict:
    payload: dict[str, Any] = {
        "id_familiar": id_familiar,
        "fecha_evaluacion": iso(-10),
        "resultado": "En proceso",
    }
    payload.update(overrides)
    return _ok(await client.post(f"/api/nna/{id_nna}/pmf", json=payload))


async def crear_ncfas(
    client: AsyncClient, id_nna: str, id_familiar: str, **overrides: Any
) -> dict:
    payload: dict[str, Any] = {
        "id_familiar": id_familiar,
        "fecha_apertura": iso(-10),
        "estado": "Ingreso completado",
    }
    payload.update(overrides)
    return _ok(await client.post(f"/api/nna/{id_nna}/ncfas", json=payload))


async def crear_antecedente_ingreso(
    client: AsyncClient, id_nna: str, id_solicitante: str, **overrides: Any
) -> dict:
    payload: dict[str, Any] = {
        "id_solicitante_ingreso": id_solicitante,
        "fecha_ingreso_residencia": iso(-90),
        "orden_tribunal": True,
        "codigo_rit": "C-1234-2025",
    }
    payload.update(overrides)
    return _ok(await client.post(f"/api/nna/{id_nna}/antecedentes-ingreso", json=payload))


async def crear_documentacion(client: AsyncClient, id_nna: str, **overrides: Any) -> dict:
    payload: dict[str, Any] = {
        "tipo_documento": "Certificado de nacimiento",
        "estado_recepcion": True,
        "fecha_recepcion": iso(-80),
    }
    payload.update(overrides)
    return _ok(await client.post(f"/api/nna/{id_nna}/documentacion-ingreso", json=payload))


async def crear_antecedente_salud(client: AsyncClient, id_nna: str, **overrides: Any) -> dict:
    payload: dict[str, Any] = {
        "fecha_antecedente_salud": iso(-60),
        "inscrito_en_centro_salud": True,
        "prevision": "Fonasa",
    }
    payload.update(overrides)
    return _ok(await client.post(f"/api/nna/{id_nna}/antecedentes-salud", json=payload))


async def crear_antecedente_escolar(client: AsyncClient, id_nna: str, **overrides: Any) -> dict:
    payload: dict[str, Any] = {
        "fecha_antecedente_escolar": iso(-60),
        "escolarizado": True,
        "ultimo_ano_cursado": 5,
    }
    payload.update(overrides)
    return _ok(await client.post(f"/api/nna/{id_nna}/antecedentes-escolares", json=payload))


async def crear_antecedente_familiar(client: AsyncClient, id_nna: str, **overrides: Any) -> dict:
    payload: dict[str, Any] = {
        "fecha_antecedente_familiar": iso(-60),
        "con_quien_vive": "Madre",
    }
    payload.update(overrides)
    return _ok(await client.post(f"/api/nna/{id_nna}/antecedentes-familiares", json=payload))


async def crear_informe(client: AsyncClient, id_nna: str, **overrides: Any) -> dict:
    payload: dict[str, Any] = {
        "tipo_informe": "Diagnóstico",
        "fecha_vencimiento": iso(10),
        "estado": "Pendiente",
    }
    payload.update(overrides)
    return _ok(await client.post(f"/api/nna/{id_nna}/informes-tribunal", json=payload))


async def crear_despeje(client: AsyncClient, id_nna: str, **overrides: Any) -> dict:
    payload: dict[str, Any] = {
        "fecha_solicitud_informe": iso(-60),
        "fecha_recepcion_informe": iso(-40),
        "estado": "Evaluando",
    }
    payload.update(overrides)
    return _ok(await client.post(f"/api/nna/{id_nna}/despeje", json=payload))


async def crear_notificacion(
    client: AsyncClient, id_despeje: str, id_familiar: str, **overrides: Any
) -> dict:
    payload: dict[str, Any] = {
        "id_familiar": id_familiar,
        "fecha_envio_carta_1": iso(-30),
        "codigo_seguimiento_1": "RC00123456CL",
        "estado_entrega_1": "Entregada",
    }
    payload.update(overrides)
    return _ok(await client.post(f"/api/despeje/{id_despeje}/notificaciones", json=payload))


async def crear_vinculo_familiar(
    client: AsyncClient, id_nna: str, id_familiar: str, **overrides: Any
) -> dict:
    payload: dict[str, Any] = {"id_familiar": id_familiar, "parentesco": "Madre"}
    payload.update(overrides)
    return _ok(await client.post(f"/api/nna/{id_nna}/vinculos", json=payload))


# ── Escenario de caso cerrado ────────────────────────────────────────────────


@dataclass
class EscenarioCasoCerrado:
    """Un NNA con un registro de cada tabla agrupada y su caso ya cerrado."""

    id_nna: str
    id_caso: str
    id_familiar: str
    registros: dict[str, dict] = field(default_factory=dict)

    def __getitem__(self, modelo: str) -> dict:
        return self.registros[modelo]

    @property
    def id_despeje(self) -> str:
        return self.registros["despeje"]["id_despeje"]

    @property
    def id_ncfas(self) -> str:
        return self.registros["ncfas"]["id_ncfas"]


async def escenario_caso_cerrado(client: AsyncClient) -> EscenarioCasoCerrado:
    """Crea un NNA con un registro de cada tabla agrupada y cierra su caso.

    Sirve para la matriz de ``409``: todo ``PUT`` sobre estos registros debe
    ser rechazado mientras el caso este cerrado.
    """
    solicitudes = (await client.get("/api/solicitantes")).json()
    id_solicitante = solicitudes[0]["id_solicitante_ingreso"]

    nna = await crear_nna(client)
    id_nna = nna["id_nna"]
    familiar = await crear_familiar(client)
    id_familiar = familiar["id_familiar"]
    id_caso = await caso_activo_id(client, id_nna)

    registros = {
        "e2p": await crear_e2p(client, id_nna, id_familiar),
        "pmf": await crear_pmf(client, id_nna, id_familiar),
        "ncfas": await crear_ncfas(client, id_nna, id_familiar),
        "ingreso": await crear_antecedente_ingreso(client, id_nna, id_solicitante),
        "documentacion": await crear_documentacion(client, id_nna),
        "salud": await crear_antecedente_salud(client, id_nna),
        "escolar": await crear_antecedente_escolar(client, id_nna),
        "familiar": await crear_antecedente_familiar(client, id_nna),
        "informe": await crear_informe(client, id_nna),
        "despeje": await crear_despeje(client, id_nna),
    }
    registros["notificacion"] = await crear_notificacion(
        client, registros["despeje"]["id_despeje"], id_familiar
    )

    res = await client.put(f"/api/casos/{id_caso}", json={"estado": "Cerrado"})
    assert res.status_code == 200, res.text
    assert res.json()["estado"] == "Cerrado"

    return EscenarioCasoCerrado(
        id_nna=id_nna,
        id_caso=id_caso,
        id_familiar=id_familiar,
        registros=registros,
    )
