import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.vinculo_nna import VinculoNNA
from app.schemas.vinculo_nna import VinculoNNACreate, VinculoNNARead, VinculoNNAUpdate
from app.services import (
    create_vinculo_nna,
    get_nna_child,
    list_vinculo_nna,
    update_child,
)

vinculo_nna_router = APIRouter(prefix="/api/nna/{id_nna}/vinculos-nna", tags=["VinculoNNA"])


@vinculo_nna_router.get("", response_model=list[VinculoNNARead])
async def list_vinculos_nna(id_nna: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await list_vinculo_nna(db, id_nna)


@vinculo_nna_router.post("", response_model=VinculoNNARead, status_code=201)
async def create_vinculo_nna_route(
    id_nna: uuid.UUID, data: VinculoNNACreate, db: AsyncSession = Depends(get_db)
):
    return await create_vinculo_nna(db, id_nna, data.model_dump())


vinculo_nna_item_router = APIRouter(prefix="/api/vinculo-nna", tags=["VinculoNNA"])


@vinculo_nna_item_router.get("/{id_vinculo}", response_model=VinculoNNARead)
async def get_vinculo_nna(id_vinculo: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, VinculoNNA, VinculoNNA.id_vinculo_nna, id_vinculo)
    if not obj:
        raise HTTPException(status_code=404, detail="Vínculo NNA no encontrado")
    return obj


@vinculo_nna_item_router.put("/{id_vinculo}", response_model=VinculoNNARead)
async def update_vinculo_nna(
    id_vinculo: uuid.UUID, data: VinculoNNAUpdate, db: AsyncSession = Depends(get_db)
):
    obj = await get_nna_child(db, VinculoNNA, VinculoNNA.id_vinculo_nna, id_vinculo)
    if not obj:
        raise HTTPException(status_code=404, detail="Vínculo NNA no encontrado")
    return await update_child(db, obj, data.model_dump(exclude_unset=True))
