import json
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_db
from app.models.ncfas import (
    ComentarioDimensionNCFAS,
    ItemNCFAS,
    NCFAS,
    RespuestaNCFAS,
)
from app.schemas.ncfas import (
    ComentarioDimensionNCFASCreate,
    ComentarioDimensionNCFASRead,
    DimensionNCFASRead,
    ItemNCFASRead,
    NCFASCreate,
    NCFASRead,
    NCFASUpdate,
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
_DIMENSION_FILES = sorted(_DATA_DIR.glob("ncfas_definicion_dimension_*.json"))


def _load_items_from_json() -> list[dict]:
    items = []
    for path in _DIMENSION_FILES:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        dim = data["dimension"]
        for item_data in dim["items"]:
            items.append({
                "letra_dimension": dim["letra"],
                "nombre_dimension": dim["nombre"],
                "numero_item": item_data["numero"],
                "nombre_item": item_data["nombre"],
                "definiciones": item_data.get("rubricas"),
                "es_item_general": item_data["numero"] == len(dim["items"]),
            })
    return items


def _parse_item_key(key: str) -> tuple[str, int]:
    letra, num = key.split("_")
    return letra, int(num)


def _make_item_key(letra: str, numero: int) -> str:
    return f"{letra}_{numero}"


async def _sync_respuestas(
    db: AsyncSession,
    id_ncfas: uuid.UUID,
    respuestas: dict[str, dict[str, str]],
):
    existing = (
        await db.execute(
            select(RespuestaNCFAS).where(
                RespuestaNCFAS.id_ncfas == id_ncfas
            )
        )
    ).scalars().all()
    for r in existing:
        await db.delete(r)

    if not respuestas:
        return

    items_db = (await db.execute(select(ItemNCFAS))).scalars().all()
    item_by_key: dict[str, ItemNCFAS] = {}
    for it in items_db:
        key = _make_item_key(it.letra_dimension, it.numero_item)
        item_by_key[key] = it

    for momento, scores in respuestas.items():
        if momento not in ("Ingreso", "Intermedio", "Cierre"):
            continue
        if not isinstance(scores, dict):
            continue
        for key, puntaje in scores.items():
            if puntaje not in ("+2", "+1", "0", "-1", "-2", "-3", "DN", "N/A"):
                continue
            item = item_by_key.get(key)
            if item is None:
                continue
            db.add(
                RespuestaNCFAS(
                    id_ncfas=id_ncfas,
                    id_item_ncfas=item.id_item_ncfas,
                    momento_evaluacion=momento,
                    puntaje=puntaje,
                )
            )
    await db.commit()


async def _build_respuestas_dict(
    db: AsyncSession, id_ncfas: uuid.UUID
) -> dict[str, dict[str, str]] | None:
    rows = (
        await db.execute(
            select(RespuestaNCFAS, ItemNCFAS)
            .join(ItemNCFAS, RespuestaNCFAS.id_item_ncfas == ItemNCFAS.id_item_ncfas)
            .where(RespuestaNCFAS.id_ncfas == id_ncfas)
        )
    ).all()

    if not rows:
        return None

    result: dict[str, dict[str, str]] = {}
    for resp, item in rows:
        momento = resp.momento_evaluacion
        key = _make_item_key(item.letra_dimension, item.numero_item)
        if momento not in result:
            result[momento] = {}
        result[momento][key] = resp.puntaje
    return result


# ── NNA routes ───────────────────────────────────────────────────────────────

ncfas_router = APIRouter(prefix="/api/nna/{id_nna}/ncfas", tags=["NCFAS"])


@ncfas_router.get("", response_model=list[NCFASRead])
async def list_ncfas(id_nna: uuid.UUID, db: AsyncSession = Depends(get_db)):
    items = await list_nna_children(db, NCFAS, id_nna)
    result = []
    for e in items:
        r = NCFASRead.model_validate(e)
        r.respuestas = await _build_respuestas_dict(db, e.id_ncfas)
        result.append(r)
    return result


@ncfas_router.post("", response_model=NCFASRead, status_code=201)
async def create_ncfas(
    id_nna: uuid.UUID, data: NCFASCreate, db: AsyncSession = Depends(get_db)
):
    respuestas = data.respuestas
    payload = data.model_dump(exclude={"respuestas"}, exclude_none=True)
    obj = await create_nna_child(db, NCFAS, id_nna, payload)
    if respuestas:
        await _sync_respuestas(db, obj.id_ncfas, respuestas)
    result = NCFASRead.model_validate(obj)
    result.respuestas = await _build_respuestas_dict(db, obj.id_ncfas)
    return result


# ── Item routes ──────────────────────────────────────────────────────────────

ncfas_item_router = APIRouter(prefix="/api/ncfas", tags=["NCFAS"])


@ncfas_item_router.get("/{id_ncfas}", response_model=NCFASRead)
async def get_ncfas(id_ncfas: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, NCFAS, NCFAS.id_ncfas, id_ncfas)
    if not obj:
        raise HTTPException(status_code=404, detail="NCFAS no encontrado")
    result = NCFASRead.model_validate(obj)
    result.respuestas = await _build_respuestas_dict(db, id_ncfas)
    return result


@ncfas_item_router.put("/{id_ncfas}", response_model=NCFASRead)
async def update_ncfas(
    id_ncfas: uuid.UUID, data: NCFASUpdate, db: AsyncSession = Depends(get_db)
):
    obj = await get_nna_child(db, NCFAS, NCFAS.id_ncfas, id_ncfas)
    if not obj:
        raise HTTPException(status_code=404, detail="NCFAS no encontrado")

    respuestas = data.respuestas
    payload = data.model_dump(exclude_unset=True, exclude={"respuestas"})
    updated = await update_child(db, obj, payload)

    if respuestas is not None:
        await _sync_respuestas(db, id_ncfas, respuestas)

    await db.refresh(updated)
    result = NCFASRead.model_validate(updated)
    result.respuestas = await _build_respuestas_dict(db, id_ncfas)
    return result


# ── Familiar routes ──────────────────────────────────────────────────────────

ncfas_familiar_router = APIRouter(
    prefix="/api/familiares/{id_familiar}/ncfas", tags=["NCFAS"]
)


@ncfas_familiar_router.get("", response_model=list[NCFASRead])
async def list_ncfas_familiar(
    id_familiar: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    items = await list_familiar_children(db, NCFAS, id_familiar)
    result = []
    for e in items:
        r = NCFASRead.model_validate(e)
        r.respuestas = await _build_respuestas_dict(db, e.id_ncfas)
        result.append(r)
    return result


@ncfas_familiar_router.post("", response_model=NCFASRead, status_code=201)
async def create_ncfas_familiar(
    id_familiar: uuid.UUID, data: NCFASCreate, db: AsyncSession = Depends(get_db)
):
    respuestas = data.respuestas
    payload = data.model_dump(exclude={"respuestas"}, exclude_none=True)
    obj = await create_familiar_child(db, NCFAS, id_familiar, payload)
    if respuestas:
        await _sync_respuestas(db, obj.id_ncfas, respuestas)
    result = NCFASRead.model_validate(obj)
    result.respuestas = await _build_respuestas_dict(db, obj.id_ncfas)
    return result


# ── Items / Dimensions ───────────────────────────────────────────────────────

ncfas_items_router = APIRouter(prefix="/api/ncfas/items", tags=["NCFAS"])


@ncfas_items_router.get("", response_model=list[DimensionNCFASRead])
async def get_ncfas_dimensions(db: AsyncSession = Depends(get_db)):
    items_db = (
        await db.execute(
            select(ItemNCFAS).order_by(
                ItemNCFAS.letra_dimension, ItemNCFAS.numero_item
            )
        )
    ).scalars().all()

    if items_db:
        raw_items = [ItemNCFASRead.model_validate(it) for it in items_db]
    else:
        raw_data = _load_items_from_json()
        raw_items = [
            ItemNCFASRead(
                id_item_ncfas=uuid.uuid4(),
                letra_dimension=d["letra_dimension"],
                nombre_dimension=d["nombre_dimension"],
                numero_item=d["numero_item"],
                nombre_item=d["nombre_item"],
                definiciones=d["definiciones"],
                es_item_general=d["es_item_general"],
            )
            for d in raw_data
        ]

    dims: dict[str, DimensionNCFASRead] = {}
    for item in raw_items:
        key = item.letra_dimension
        if key not in dims:
            dims[key] = DimensionNCFASRead(
                letra=item.letra_dimension,
                nombre=item.nombre_dimension,
                items=[],
            )
        dims[key].items.append(item)

    return list(dims.values())


# ── Comentarios ──────────────────────────────────────────────────────────────

ncfas_comentarios_router = APIRouter(
    prefix="/api/ncfas/{id_ncfas}/comentarios", tags=["NCFAS"]
)


@ncfas_comentarios_router.get("", response_model=list[ComentarioDimensionNCFASRead])
async def list_comentarios(
    id_ncfas: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    rows = (
        await db.execute(
            select(ComentarioDimensionNCFAS)
            .where(ComentarioDimensionNCFAS.id_ncfas == id_ncfas)
            .order_by(ComentarioDimensionNCFAS.letra_dimension)
        )
    ).scalars().all()
    return [ComentarioDimensionNCFASRead.model_validate(c) for c in rows]


class ComentarioUpsert(BaseModel):
    comentario: str


@ncfas_comentarios_router.put(
    "/{letra_dimension}", response_model=ComentarioDimensionNCFASRead
)
async def upsert_comentario(
    id_ncfas: uuid.UUID,
    letra_dimension: str,
    data: ComentarioUpsert,
    db: AsyncSession = Depends(get_db),
):
    existing = (
        await db.execute(
            select(ComentarioDimensionNCFAS).where(
                ComentarioDimensionNCFAS.id_ncfas == id_ncfas,
                ComentarioDimensionNCFAS.letra_dimension == letra_dimension.upper(),
            )
        )
    ).scalars().first()

    if existing:
        existing.comentario = data.comentario
        await db.commit()
        await db.refresh(existing)
        return existing

    nuevo = ComentarioDimensionNCFAS(
        id_ncfas=id_ncfas,
        letra_dimension=letra_dimension.upper(),
        comentario=data.comentario,
    )
    db.add(nuevo)
    await db.commit()
    await db.refresh(nuevo)
    return nuevo
