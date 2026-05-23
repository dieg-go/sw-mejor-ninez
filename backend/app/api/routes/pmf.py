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


# ── Adulto routes ────────────────────────────────────────────────────────────

pmf_adulto_router = APIRouter(prefix="/api/adultos/{id_adulto}/pmf", tags=["PMF"])


@pmf_adulto_router.get("", response_model=list[PMFRead])
async def list_pmf_adulto(id_adulto: uuid.UUID, db: AsyncSession = Depends(get_db)):
    from app.services import list_adulto_children
    return await list_adulto_children(db, PMF, id_adulto)


@pmf_adulto_router.post("", response_model=PMFRead, status_code=201)
async def create_pmf_adulto(id_adulto: uuid.UUID, data: PMFCreate, db: AsyncSession = Depends(get_db)):
    from app.services import create_adulto_child
    return await create_adulto_child(db, PMF, id_adulto, data.model_dump())
