import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.familiar import (
    FamiliarCreate,
    FamiliarRead,
    FamiliarUpdate,
    AntecedentePenalCreate,
    AntecedentePenalRead,
    AntecedentePenalUpdate,
)
from app.models import AntecedentesPenales
from app.services import (
    FamiliarService,
    create_familiar_child,
    get_nna_child,
    list_familiar_children,
    update_child,
)

router = APIRouter(prefix="/api/familiares", tags=["Familiar"])


@router.get("", response_model=list[FamiliarRead])
async def list_familiares(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    service = FamiliarService(db)
    return await service.list(skip=skip, limit=limit)


@router.post("", response_model=FamiliarRead, status_code=201)
async def create_familiar(data: FamiliarCreate, db: AsyncSession = Depends(get_db)):
    service = FamiliarService(db)
    return await service.create(data.model_dump())


@router.get("/{id_familiar}", response_model=FamiliarRead)
async def get_familiar(id_familiar: uuid.UUID, db: AsyncSession = Depends(get_db)):
    service = FamiliarService(db)
    familiar = await service.get(id_familiar)
    if not familiar:
        raise HTTPException(status_code=404, detail="Familiar no encontrado")
    return familiar


@router.put("/{id_familiar}", response_model=FamiliarRead)
async def update_familiar(
    id_familiar: uuid.UUID,
    data: FamiliarUpdate,
    db: AsyncSession = Depends(get_db),
):
    service = FamiliarService(db)
    familiar = await service.get(id_familiar)
    if not familiar:
        raise HTTPException(status_code=404, detail="Familiar no encontrado")
    return await service.update(familiar, data.model_dump(exclude_unset=True))


# ── Antecedentes Penales (child of Familiar) ─────────────────────────────────

familiar_penal_router = APIRouter(prefix="/api/familiares/{id_familiar}/antecedentes-penales", tags=["Familiar"])


@familiar_penal_router.get("", response_model=list[AntecedentePenalRead])
async def list_antecedentes_penales(id_familiar: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await list_familiar_children(db, AntecedentesPenales, id_familiar)


@familiar_penal_router.post("", response_model=AntecedentePenalRead, status_code=201)
async def create_antecedente_penal(
    id_familiar: uuid.UUID, data: AntecedentePenalCreate, db: AsyncSession = Depends(get_db)
):
    return await create_familiar_child(db, AntecedentesPenales, id_familiar, data.model_dump())
