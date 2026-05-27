import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.ncfas import NCFAS
from app.schemas.ncfas import NCFASCreate, NCFASRead, NCFASUpdate
from app.services import create_nna_child, get_nna_child, list_nna_children, update_child

# ── NNA routes ───────────────────────────────────────────────────────────────

ncfas_router = APIRouter(prefix="/api/nna/{id_nna}/ncfas", tags=["NCFAS"])


@ncfas_router.get("", response_model=list[NCFASRead])
async def list_ncfas(id_nna: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await list_nna_children(db, NCFAS, id_nna)


@ncfas_router.post("", response_model=NCFASRead, status_code=201)
async def create_ncfas(id_nna: uuid.UUID, data: NCFASCreate, db: AsyncSession = Depends(get_db)):
    return await create_nna_child(db, NCFAS, id_nna, data.model_dump())


# ── Item routes ──────────────────────────────────────────────────────────────

ncfas_item_router = APIRouter(prefix="/api/ncfas", tags=["NCFAS"])


@ncfas_item_router.get("/{id_ncfas}", response_model=NCFASRead)
async def get_ncfas(id_ncfas: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, NCFAS, NCFAS.id_instrumento, id_ncfas)
    if not obj:
        raise HTTPException(status_code=404, detail="NCFAS no encontrado")
    return obj


@ncfas_item_router.put("/{id_ncfas}", response_model=NCFASRead)
async def update_ncfas(id_ncfas: uuid.UUID, data: NCFASUpdate, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, NCFAS, NCFAS.id_instrumento, id_ncfas)
    if not obj:
        raise HTTPException(status_code=404, detail="NCFAS no encontrado")
    return await update_child(db, obj, data.model_dump(exclude_unset=True))


# ── Familiar routes ──────────────────────────────────────────────────────────

ncfas_familiar_router = APIRouter(prefix="/api/familiares/{id_familiar}/ncfas", tags=["NCFAS"])


@ncfas_familiar_router.get("", response_model=list[NCFASRead])
async def list_ncfas_familiar(id_familiar: uuid.UUID, db: AsyncSession = Depends(get_db)):
    from app.services import list_familiar_children
    return await list_familiar_children(db, NCFAS, id_familiar)


@ncfas_familiar_router.post("", response_model=NCFASRead, status_code=201)
async def create_ncfas_familiar(id_familiar: uuid.UUID, data: NCFASCreate, db: AsyncSession = Depends(get_db)):
    from app.services import create_familiar_child
    return await create_familiar_child(db, NCFAS, id_familiar, data.model_dump())
