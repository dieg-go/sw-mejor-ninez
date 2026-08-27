import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.nna import NNARead, NNACreate, NNAUpdate
from app.services import NNAService

router = APIRouter(prefix="/api/nna", tags=["NNA"])


@router.get("", response_model=list[NNARead])
async def list_nna(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    service = NNAService(db)
    rows = await service.list(skip=skip, limit=limit)
    return [
        NNARead.model_validate(nna).model_copy(update={"estado_caso": estado})
        for nna, estado in rows
    ]


@router.post("", response_model=NNARead, status_code=201)
async def create_nna(data: NNACreate, db: AsyncSession = Depends(get_db)):
    service = NNAService(db)
    return await service.create(data.model_dump())


@router.get("/{id_nna}", response_model=NNARead)
async def get_nna(id_nna: uuid.UUID, db: AsyncSession = Depends(get_db)):
    service = NNAService(db)
    nna = await service.get(id_nna)
    if not nna:
        raise HTTPException(status_code=404, detail="NNA no encontrado")
    return nna


@router.put("/{id_nna}", response_model=NNARead)
async def update_nna(id_nna: uuid.UUID, data: NNAUpdate, db: AsyncSession = Depends(get_db)):
    service = NNAService(db)
    nna = await service.get(id_nna)
    if not nna:
        raise HTTPException(status_code=404, detail="NNA no encontrado")
    return await service.update(nna, data.model_dump(exclude_unset=True))
