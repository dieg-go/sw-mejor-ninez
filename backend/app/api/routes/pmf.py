import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.pmf import PMF
from app.schemas.pmf import PMFCreate, PMFRead, PMFUpdate
from app.services import create_nna_child, get_nna_child, list_nna_children, update_child

# ── NNA routes ───────────────────────────────────────────────────────────────

pmf_router = APIRouter(prefix="/api/nna/{id_nna}/pmf", tags=["PMF"])


@pmf_router.get("", response_model=list[PMFRead])
async def list_pmf(id_nna: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await list_nna_children(db, PMF, id_nna)


@pmf_router.post("", response_model=PMFRead, status_code=201)
async def create_pmf(id_nna: uuid.UUID, data: PMFCreate, db: AsyncSession = Depends(get_db)):
    return await create_nna_child(db, PMF, id_nna, data.model_dump())


# ── Item routes ──────────────────────────────────────────────────────────────

pmf_item_router = APIRouter(prefix="/api/pmf", tags=["PMF"])


@pmf_item_router.get("/{id_pmf}", response_model=PMFRead)
async def get_pmf(id_pmf: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, PMF, PMF.id_instrumento, id_pmf)
    if not obj:
        raise HTTPException(status_code=404, detail="PMF no encontrado")
    return obj


@pmf_item_router.put("/{id_pmf}", response_model=PMFRead)
async def update_pmf(id_pmf: uuid.UUID, data: PMFUpdate, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, PMF, PMF.id_instrumento, id_pmf)
    if not obj:
        raise HTTPException(status_code=404, detail="PMF no encontrado")
    return await update_child(db, obj, data.model_dump(exclude_unset=True))


# ── Familiar routes ──────────────────────────────────────────────────────────

pmf_familiar_router = APIRouter(prefix="/api/familiares/{id_familiar}/pmf", tags=["PMF"])


@pmf_familiar_router.get("", response_model=list[PMFRead])
async def list_pmf_familiar(id_familiar: uuid.UUID, db: AsyncSession = Depends(get_db)):
    from app.services import list_familiar_children
    return await list_familiar_children(db, PMF, id_familiar)


@pmf_familiar_router.post("", response_model=PMFRead, status_code=201)
async def create_pmf_familiar(id_familiar: uuid.UUID, data: PMFCreate, db: AsyncSession = Depends(get_db)):
    from app.services import create_familiar_child
    return await create_familiar_child(db, PMF, id_familiar, data.model_dump())
