import json
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_db
from app.models.e2p import E2P, BaremoE2P, PreguntaE2P, RespuestaE2P, PuntajeE2P
from app.schemas.e2p import (
    E2PCreate,
    E2PRead,
    E2PUpdate,
    BaremoE2PRead,
    PreguntaE2PRead,
    PuntajeE2PRead,
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


def _load_questions_json():
    with open(_QUESTIONS_PATH, encoding="utf-8") as f:
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


def _determinar_resultado(puntajes: list[dict]) -> str | None:
    """Clasifica el resultado global del E2P a partir de las zonas por categoria."""
    bajas = sum(1 for p in puntajes if p["zona"] == "Baja")
    inter = sum(1 for p in puntajes if p["zona"] == "Intermedia")
    altas = sum(1 for p in puntajes if p["zona"] == "Alta")
    vinc_baja = any(
        p["categoria"] == "Vinculares" and p["zona"] == "Baja"
        for p in puntajes
    )

    if bajas >= 2 or vinc_baja:
        return "Riesgo"
    if (bajas == 1 and not vinc_baja) or (bajas == 0 and inter >= 2):
        return "Monitoreo"
    if bajas == 0 and altas >= 3:
        return "Optimo"
    return None


async def _calcular_puntajes(
    db: AsyncSession,
    id_instrumento: uuid.UUID,
    version: int,
):
    existing = (
        await db.execute(
            select(PuntajeE2P).where(
                PuntajeE2P.id_instrumento == id_instrumento
            )
        )
    ).scalars().all()
    for p in existing:
        await db.delete(p)

    questions_data = _load_questions_json()

    version_key = str(version)
    version_info = questions_data["versiones"].get(version_key)
    if not version_info:
        return

    puntaje_map = version_info.get("puntaje") or {}

    baremos_db = (
        await db.execute(
            select(BaremoE2P).where(BaremoE2P.version == version)
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
            select(RespuestaE2P.valor, PreguntaE2P.categoria)
            .join(PreguntaE2P, RespuestaE2P.id_pregunta_e2p == PreguntaE2P.id_pregunta_e2p)
            .where(RespuestaE2P.id_instrumento == id_instrumento)
        )
    ).all()

    if not rows:
        e2p_empty = (
            await db.execute(
                select(E2P).where(E2P.id_e2p == id_instrumento)
            )
        ).scalar_one_or_none()
        if e2p_empty and e2p_empty.resultado is not None:
            e2p_empty.resultado = None
            db.add(e2p_empty)
        await db.commit()
        return

    categorias: dict[str, dict] = {}
    for row in rows:
        valor, categoria = row
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

    for nombre, datos in categorias.items():
        zona = clasificar_baremo(nombre, datos["puntaje_bruto"])
        db.add(
            PuntajeE2P(
                id_instrumento=id_instrumento,
                categoria=nombre,
                puntaje_bruto=datos["puntaje_bruto"],
                puntaje_max=datos["puntaje_max"],
                zona=zona["zona"],
                rango_zona=f'{zona["min"]}-{zona["max"]}',
            )
        )

    puntajes_data = [
        {"categoria": nombre, "zona": clasificar_baremo(nombre, datos["puntaje_bruto"])["zona"]}
        for nombre, datos in categorias.items()
    ]
    resultado = _determinar_resultado(puntajes_data)
    if resultado is not None:
        e2p = (
            await db.execute(
                select(E2P).where(E2P.id_e2p == id_instrumento)
            )
        ).scalar_one_or_none()
        if e2p:
            e2p.resultado = resultado
            db.add(e2p)

    await db.commit()


# ── NNA routes ───────────────────────────────────────────────────────────────

e2p_router = APIRouter(prefix="/api/nna/{id_nna}/e2p", tags=["E2P"])


@e2p_router.get("", response_model=list[E2PRead])
async def list_e2p(id_nna: uuid.UUID, db: AsyncSession = Depends(get_db)):
    items = await list_nna_children(db, E2P, id_nna)
    result = []
    for e in items:
        r = E2PRead.model_validate(e)
        r.respuestas = await _build_respuestas_dict(db, e.id_e2p)
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
        await _sync_respuestas(db, obj.id_e2p, data.version, respuestas)
        await _calcular_puntajes(db, obj.id_e2p, data.version)
    result = E2PRead.model_validate(obj)
    result.respuestas = await _build_respuestas_dict(db, obj.id_e2p)
    return result


# ── Item routes ──────────────────────────────────────────────────────────────

e2p_item_router = APIRouter(prefix="/api/e2p", tags=["E2P"])


@e2p_item_router.get("/{id_e2p}", response_model=E2PRead)
async def get_e2p(id_e2p: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, E2P, E2P.id_e2p, id_e2p)
    if not obj:
        raise HTTPException(status_code=404, detail="E2P no encontrado")
    result = E2PRead.model_validate(obj)
    result.respuestas = await _build_respuestas_dict(db, id_e2p)
    return result


@e2p_item_router.put("/{id_e2p}", response_model=E2PRead)
async def update_e2p(
    id_e2p: uuid.UUID, data: E2PUpdate, db: AsyncSession = Depends(get_db)
):
    obj = await get_nna_child(db, E2P, E2P.id_e2p, id_e2p)
    if not obj:
        raise HTTPException(status_code=404, detail="E2P no encontrado")

    respuestas = data.respuestas
    payload = data.model_dump(exclude_unset=True, exclude={"respuestas"})
    updated = await update_child(db, obj, payload)

    if respuestas is not None:
        version = updated.version
        await _sync_respuestas(db, id_e2p, version, respuestas)
        await _calcular_puntajes(db, id_e2p, version)

    await db.refresh(updated)
    result = E2PRead.model_validate(updated)
    result.respuestas = await _build_respuestas_dict(db, id_e2p)
    return result


# ── Puntaje ──────────────────────────────────────────────────────────────────


@e2p_item_router.get("/{id_e2p}/puntaje")
async def get_e2p_puntaje(id_e2p: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, E2P, E2P.id_e2p, id_e2p)
    if not obj:
        raise HTTPException(status_code=404, detail="E2P no encontrado")

    puntajes_db = (
        await db.execute(
            select(PuntajeE2P).where(
                PuntajeE2P.id_instrumento == id_e2p
            )
        )
    ).scalars().all()

    respuestas_dict = await _build_respuestas_dict(db, id_e2p)

    if not puntajes_db:
        raise HTTPException(status_code=400, detail="E2P sin puntajes registrados")

    categorias = [
        {
            "categoria": p.categoria,
            "puntaje_bruto": p.puntaje_bruto,
            "puntaje_max": p.puntaje_max,
            "zona": p.zona,
            "rango_zona": p.rango_zona,
        }
        for p in puntajes_db
    ]

    questions_data = _load_questions_json()
    version_key = str(obj.version)
    version_info = questions_data["versiones"].get(version_key, {})

    return {
        "version": obj.version,
        "edad": version_info.get("edad", ""),
        "escala": questions_data.get("escala", {}),
        "categorias": categorias,
        "respuestas": respuestas_dict or {},
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
        r.respuestas = await _build_respuestas_dict(db, e.id_e2p)
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
        await _sync_respuestas(db, obj.id_e2p, data.version, respuestas)
        await _calcular_puntajes(db, obj.id_e2p, data.version)
    result = E2PRead.model_validate(obj)
    result.respuestas = await _build_respuestas_dict(db, obj.id_e2p)
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
