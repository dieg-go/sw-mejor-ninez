import json
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_db
from app.models.e2p import E2P, BaremoE2P, PreguntaE2P, RespuestaE2P
from app.schemas.e2p import (
    E2PCreate,
    E2PRead,
    E2PUpdate,
    BaremoE2PRead,
    PreguntaE2PRead,
)
from app.services import (
    create_familiar_child,
    create_nna_child,
    get_nna_child,
    list_familiar_children,
    list_nna_children,
    update_child,
)

_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
_QUESTIONS_PATH = _DATA_DIR / "e2p_questions.json"
_ESCALA_PATH = _DATA_DIR / "e2p_escala.json"


def _load_questions_json():
    with open(_QUESTIONS_PATH, encoding="utf-8") as f:
        return json.load(f)


def _load_escala_json():
    with open(_ESCALA_PATH, encoding="utf-8") as f:
        return json.load(f)


async def _sync_respuestas(
    db: AsyncSession,
    id_instrumento: uuid.UUID,
    version: int,
    respuestas: dict[str, int],
):
    existing = (
        await db.execute(
            select(RespuestaE2P).where(
                RespuestaE2P.id_instrumento == id_instrumento
            )
        )
    ).scalars().all()
    for r in existing:
        await db.delete(r)

    if not respuestas:
        return

    preguntas = (
        await db.execute(
            select(PreguntaE2P).where(
                PreguntaE2P.version == version,
                PreguntaE2P.numero.in_([int(k) for k in respuestas.keys()]),
            )
        )
    ).scalars().all()
    pregunta_by_num = {p.numero: p for p in preguntas}

    for key, val in respuestas.items():
        num = int(key)
        pregunta = pregunta_by_num.get(num)
        if pregunta is None:
            continue
        db.add(
            RespuestaE2P(
                id_instrumento=id_instrumento,
                id_pregunta_e2p=pregunta.id_pregunta_e2p,
                valor=val,
            )
        )
    await db.commit()


async def _build_respuestas_dict(
    db: AsyncSession, id_instrumento: uuid.UUID
) -> dict[str, int] | None:
    rows = (
        await db.execute(
            select(RespuestaE2P, PreguntaE2P)
            .join(PreguntaE2P, RespuestaE2P.id_pregunta_e2p == PreguntaE2P.id_pregunta_e2p)
            .where(RespuestaE2P.id_instrumento == id_instrumento)
        )
    ).all()

    if not rows:
        return None

    result: dict[str, int] = {}
    for resp, preg in rows:
        result[str(preg.numero)] = resp.valor
    return result


# ── NNA routes ───────────────────────────────────────────────────────────────

e2p_router = APIRouter(prefix="/api/nna/{id_nna}/e2p", tags=["E2P"])


@e2p_router.get("", response_model=list[E2PRead])
async def list_e2p(id_nna: uuid.UUID, db: AsyncSession = Depends(get_db)):
    items = await list_nna_children(db, E2P, id_nna)
    result = []
    for e in items:
        r = E2PRead.model_validate(e)
        r.respuestas = await _build_respuestas_dict(db, e.id_instrumento)
        result.append(r)
    return result


@e2p_router.post("", response_model=E2PRead, status_code=201)
async def create_e2p(
    id_nna: uuid.UUID, data: E2PCreate, db: AsyncSession = Depends(get_db)
):
    respuestas = data.respuestas
    payload = data.model_dump(exclude={"respuestas"})
    obj = await create_nna_child(db, E2P, id_nna, payload)
    if respuestas and data.version:
        await _sync_respuestas(db, obj.id_instrumento, data.version, respuestas)
    result = E2PRead.model_validate(obj)
    result.respuestas = await _build_respuestas_dict(db, obj.id_instrumento)
    return result


# ── Item routes ──────────────────────────────────────────────────────────────

e2p_item_router = APIRouter(prefix="/api/e2p", tags=["E2P"])


@e2p_item_router.get("/{id_e2p}", response_model=E2PRead)
async def get_e2p(id_e2p: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, E2P, E2P.id_instrumento, id_e2p)
    if not obj:
        raise HTTPException(status_code=404, detail="E2P no encontrado")
    result = E2PRead.model_validate(obj)
    result.respuestas = await _build_respuestas_dict(db, id_e2p)
    return result


@e2p_item_router.put("/{id_e2p}", response_model=E2PRead)
async def update_e2p(
    id_e2p: uuid.UUID, data: E2PUpdate, db: AsyncSession = Depends(get_db)
):
    obj = await get_nna_child(db, E2P, E2P.id_instrumento, id_e2p)
    if not obj:
        raise HTTPException(status_code=404, detail="E2P no encontrado")

    respuestas = data.respuestas
    payload = data.model_dump(exclude_unset=True, exclude={"respuestas"})
    updated = await update_child(db, obj, payload)

    if respuestas is not None:
        version = updated.version
        await _sync_respuestas(db, id_e2p, version, respuestas)

    await db.refresh(updated)
    result = E2PRead.model_validate(updated)
    result.respuestas = await _build_respuestas_dict(db, id_e2p)
    return result


# ── Puntaje ──────────────────────────────────────────────────────────────────

_VERSION_TO_ESCALA = {
    1: "v_0_3_meses",
    2: "v_4_10_meses",
    3: "v_11_18_meses",
    4: "v_19_36_meses",
    5: "v_3_5_anos",
    6: "v_6_7_anos",
    7: "v_8_12_anos",
    8: "v_13_17_anos",
}


@e2p_item_router.get("/{id_e2p}/puntaje")
async def get_e2p_puntaje(id_e2p: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, E2P, E2P.id_instrumento, id_e2p)
    if not obj:
        raise HTTPException(status_code=404, detail="E2P no encontrado")

    escala_key = _VERSION_TO_ESCALA.get(obj.version)
    if not escala_key:
        raise HTTPException(
            status_code=400, detail=f"Versión {obj.version} sin baremos definidos"
        )

    questions_data = _load_questions_json()

    version_key = str(obj.version)
    version_info = questions_data["versiones"].get(version_key)
    if not version_info:
        raise HTTPException(status_code=404, detail=f"Versión {obj.version} no encontrada en datos")

    puntaje_map = version_info.get("puntaje") or {}

    baremos_db = (
        await db.execute(
            select(BaremoE2P).where(BaremoE2P.version == obj.version)
        )
    ).scalars().all()

    baremo_by_cat: dict[str, list[dict]] = {}
    for b in baremos_db:
        baremo_by_cat.setdefault(b.categoria, []).append({
            "zona": b.zona,
            "min": b.puntaje_min,
            "max": b.puntaje_max,
        })

    rows = (
        await db.execute(
            select(RespuestaE2P.valor, PreguntaE2P.categoria, PreguntaE2P.numero)
            .join(PreguntaE2P, RespuestaE2P.id_pregunta_e2p == PreguntaE2P.id_pregunta_e2p)
            .where(RespuestaE2P.id_instrumento == id_e2p)
        )
    ).all()

    if not rows:
        raise HTTPException(status_code=400, detail="E2P sin respuestas registradas")

    categorias: dict[str, dict] = {}

    for row in rows:
        valor, categoria, _ = row
        if categoria not in categorias:
            categorias[categoria] = {"puntaje_bruto": 0, "puntaje_max": 0, "cantidad": 0}
        categorias[categoria]["cantidad"] += 1
        categorias[categoria]["puntaje_max"] += max(puntaje_map.values()) if puntaje_map else 4
        if puntaje_map:
            categorias[categoria]["puntaje_bruto"] += puntaje_map.get(str(valor), 0)
        elif 0 <= valor <= 4:
            categorias[categoria]["puntaje_bruto"] += valor

    def clasificar_baremo(categoria: str, puntaje_bruto: int) -> dict:
        zonas = baremo_by_cat.get(categoria, [])
        for zona in zonas:
            if zona["min"] <= puntaje_bruto <= zona["max"]:
                return zona
        return {"zona": "Sin clasificación", "min": 0, "max": 0}

    resultados = []
    for nombre, datos in categorias.items():
        zona = clasificar_baremo(nombre, datos["puntaje_bruto"])
        resultados.append({
            "categoria": nombre,
            "puntaje_bruto": datos["puntaje_bruto"],
            "puntaje_max": datos["puntaje_max"],
            "zona": zona["zona"],
            "rango_zona": f'{zona["min"]}-{zona["max"]}',
        })

    respuestas_dict = {}
    for row in rows:
        respuestas_dict[str(row[2])] = row[0]

    return {
        "version": obj.version,
        "edad": version_info["edad"],
        "escala": questions_data.get("escala", {}),
        "categorias": resultados,
        "respuestas": respuestas_dict,
    }


# ── Familiar routes ──────────────────────────────────────────────────────────

e2p_familiar_router = APIRouter(
    prefix="/api/familiares/{id_familiar}/e2p", tags=["E2P"]
)


@e2p_familiar_router.get("", response_model=list[E2PRead])
async def list_e2p_familiar(
    id_familiar: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    items = await list_familiar_children(db, E2P, id_familiar)
    result = []
    for e in items:
        r = E2PRead.model_validate(e)
        r.respuestas = await _build_respuestas_dict(db, e.id_instrumento)
        result.append(r)
    return result


@e2p_familiar_router.post("", response_model=E2PRead, status_code=201)
async def create_e2p_familiar(
    id_familiar: uuid.UUID, data: E2PCreate, db: AsyncSession = Depends(get_db)
):
    respuestas = data.respuestas
    payload = data.model_dump(exclude={"respuestas"})
    obj = await create_familiar_child(db, E2P, id_familiar, payload)
    if respuestas and data.version:
        await _sync_respuestas(db, obj.id_instrumento, data.version, respuestas)
    result = E2PRead.model_validate(obj)
    result.respuestas = await _build_respuestas_dict(db, obj.id_instrumento)
    return result


# ── Questions ────────────────────────────────────────────────────────────────

e2p_questions_router = APIRouter(prefix="/api/e2p/versions", tags=["E2P"])


@e2p_questions_router.get("/{version_num}")
async def get_e2p_questions(version_num: int, db: AsyncSession = Depends(get_db)):
    if version_num < 1 or version_num > 8:
        raise HTTPException(
            status_code=404, detail=f"Versión {version_num} no existe (1-8)"
        )

    preguntas_db = (
        await db.execute(
            select(PreguntaE2P)
            .where(PreguntaE2P.version == version_num)
            .order_by(PreguntaE2P.numero)
        )
    ).scalars().all()

    if not preguntas_db:
        questions_data = _load_questions_json()
        version_key = str(version_num)
        version_info = questions_data["versiones"].get(version_key)
        if not version_info:
            raise HTTPException(
                status_code=404,
                detail=f"Versión {version_num} no encontrada",
            )
        preguntas_raw = version_info["preguntas"]
        return {
            "escala": questions_data.get("escala", {}),
            "edad": version_info["edad"],
            "puntaje": version_info.get("puntaje"),
            "preguntas": preguntas_raw,
        }

    questions_data = _load_questions_json()
    version_key = str(version_num)
    version_info = questions_data["versiones"].get(version_key, {})

    preguntas_raw = [
        {"id": p.numero, "texto": p.texto, "categoria": p.categoria}
        for p in preguntas_db
    ]

    return {
        "escala": questions_data.get("escala", {}),
        "edad": version_info.get("edad", ""),
        "puntaje": version_info.get("puntaje"),
        "preguntas": preguntas_raw,
    }
