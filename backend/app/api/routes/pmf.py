import json
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_db
from app.models.pmf import PMF, PreguntaPMF, RespuestaPMF
from app.schemas.pmf import PMFCreate, PMFRead, PMFUpdate, PreguntaPMFRead
from app.services import (
    create_familiar_child,
    create_nna_child,
    get_nna_child,
    list_familiar_children,
    list_nna_children,
    update_child,
)

_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
_QUESTIONS_PATH = _DATA_DIR / "pmf_afirmaciones.json"


def _load_questions_json():
    with open(_QUESTIONS_PATH, encoding="utf-8") as f:
        return json.load(f)


async def _sync_respuestas(
    db: AsyncSession,
    id_instrumento: uuid.UUID,
    respuestas: dict[str, bool],
):
    existing = (
        await db.execute(
            select(RespuestaPMF).where(
                RespuestaPMF.id_pmf == id_instrumento
            )
        )
    ).scalars().all()
    for r in existing:
        await db.delete(r)

    if not respuestas:
        return

    preguntas = (
        await db.execute(
            select(PreguntaPMF).where(
                PreguntaPMF.numero.in_([int(k) for k in respuestas.keys()])
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
            RespuestaPMF(
                id_pmf=id_instrumento,
                id_pregunta_pmf=pregunta.id_pregunta_pmf,
                respuesta=val,
            )
        )
    await db.commit()


async def _build_respuestas_dict(
    db: AsyncSession, id_instrumento: uuid.UUID
) -> dict[str, bool] | None:
    rows = (
        await db.execute(
            select(RespuestaPMF, PreguntaPMF)
            .join(PreguntaPMF, RespuestaPMF.id_pregunta_pmf == PreguntaPMF.id_pregunta_pmf)
            .where(RespuestaPMF.id_pmf == id_instrumento)
        )
    ).all()

    if not rows:
        return None

    result: dict[str, bool] = {}
    for resp, preg in rows:
        result[str(preg.numero)] = resp.respuesta
    return result


# ── NNA routes ───────────────────────────────────────────────────────────────

pmf_router = APIRouter(prefix="/api/nna/{id_nna}/pmf", tags=["PMF"])


@pmf_router.get("", response_model=list[PMFRead])
async def list_pmf(id_nna: uuid.UUID, db: AsyncSession = Depends(get_db)):
    items = await list_nna_children(db, PMF, id_nna)
    result = []
    for e in items:
        r = PMFRead.model_validate(e)
        r.respuestas = await _build_respuestas_dict(db, e.id_pmf)
        result.append(r)
    return result


@pmf_router.post("", response_model=PMFRead, status_code=201)
async def create_pmf(
    id_nna: uuid.UUID, data: PMFCreate, db: AsyncSession = Depends(get_db)
):
    respuestas = data.respuestas
    payload = data.model_dump(exclude={"respuestas"}, exclude_none=True)
    obj = await create_nna_child(db, PMF, id_nna, payload)
    if respuestas:
        await _sync_respuestas(db, obj.id_pmf, respuestas)
    result = PMFRead.model_validate(obj)
    result.respuestas = await _build_respuestas_dict(db, obj.id_pmf)
    return result


# ── Item routes ──────────────────────────────────────────────────────────────

pmf_item_router = APIRouter(prefix="/api/pmf", tags=["PMF"])


@pmf_item_router.get("/{id_pmf}", response_model=PMFRead)
async def get_pmf(id_pmf: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, PMF, PMF.id_pmf, id_pmf)
    if not obj:
        raise HTTPException(status_code=404, detail="PMF no encontrado")
    result = PMFRead.model_validate(obj)
    result.respuestas = await _build_respuestas_dict(db, id_pmf)
    return result


@pmf_item_router.put("/{id_pmf}", response_model=PMFRead)
async def update_pmf(
    id_pmf: uuid.UUID, data: PMFUpdate, db: AsyncSession = Depends(get_db)
):
    obj = await get_nna_child(db, PMF, PMF.id_pmf, id_pmf)
    if not obj:
        raise HTTPException(status_code=404, detail="PMF no encontrado")

    respuestas = data.respuestas
    payload = data.model_dump(exclude_unset=True, exclude={"respuestas"})
    updated = await update_child(db, obj, payload)

    if respuestas is not None:
        await _sync_respuestas(db, id_pmf, respuestas)

    await db.refresh(updated)
    result = PMFRead.model_validate(updated)
    result.respuestas = await _build_respuestas_dict(db, id_pmf)
    return result


# ── Familiar routes ──────────────────────────────────────────────────────────

pmf_familiar_router = APIRouter(prefix="/api/familiares/{id_familiar}/pmf", tags=["PMF"])


@pmf_familiar_router.get("", response_model=list[PMFRead])
async def list_pmf_familiar(id_familiar: uuid.UUID, db: AsyncSession = Depends(get_db)):
    items = await list_familiar_children(db, PMF, id_familiar)
    result = []
    for e in items:
        r = PMFRead.model_validate(e)
        r.respuestas = await _build_respuestas_dict(db, e.id_pmf)
        result.append(r)
    return result


@pmf_familiar_router.post("", response_model=PMFRead, status_code=201)
async def create_pmf_familiar(
    id_familiar: uuid.UUID, data: PMFCreate, db: AsyncSession = Depends(get_db)
):
    respuestas = data.respuestas
    payload = data.model_dump(exclude={"respuestas"}, exclude_none=True)
    obj = await create_familiar_child(db, PMF, id_familiar, payload)
    if respuestas:
        await _sync_respuestas(db, obj.id_pmf, respuestas)
    result = PMFRead.model_validate(obj)
    result.respuestas = await _build_respuestas_dict(db, obj.id_pmf)
    return result


# ── Questions ────────────────────────────────────────────────────────────────

pmf_questions_router = APIRouter(prefix="/api/pmf/preguntas", tags=["PMF"])


@pmf_questions_router.get("", response_model=list[PreguntaPMFRead])
async def get_pmf_questions(db: AsyncSession = Depends(get_db)):
    preguntas_db = (
        await db.execute(
            select(PreguntaPMF).order_by(PreguntaPMF.numero)
        )
    ).scalars().all()

    if preguntas_db:
        return [PreguntaPMFRead.model_validate(p) for p in preguntas_db]

    questions_data = _load_questions_json()
    result = []
    for q in questions_data:
        result.append(PreguntaPMFRead(
            id_pregunta_pmf=uuid.uuid4(),
            numero=q["id"],
            afirmacion=q["afirmacion"],
            escala=None,
        ))
    return result
