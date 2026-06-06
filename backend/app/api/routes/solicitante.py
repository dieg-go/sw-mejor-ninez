import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_db
from app.models.solicitante import SolicitanteIngreso
from app.schemas.solicitante import (
    SolicitanteIngresoCreate,
    SolicitanteIngresoRead,
    SolicitanteIngresoUpdate,
)

router = APIRouter(prefix="/api/solicitantes", tags=["SolicitanteIngreso"])


@router.get("", response_model=list[SolicitanteIngresoRead])
async def list_solicitantes(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SolicitanteIngreso).offset(skip).limit(limit))
    return list(result.scalars().all())


@router.post("", response_model=SolicitanteIngresoRead, status_code=201)
async def create_solicitante(data: SolicitanteIngresoCreate, db: AsyncSession = Depends(get_db)):
    obj = SolicitanteIngreso(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/{id_solicitante_ingreso}", response_model=SolicitanteIngresoRead)
async def get_solicitante(id_solicitante_ingreso: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SolicitanteIngreso).where(
            SolicitanteIngreso.id_solicitante_ingreso == id_solicitante_ingreso
        )
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Solicitante de ingreso no encontrado")
    return obj


@router.put("/{id_solicitante_ingreso}", response_model=SolicitanteIngresoRead)
async def update_solicitante(
    id_solicitante_ingreso: uuid.UUID,
    data: SolicitanteIngresoUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SolicitanteIngreso).where(
            SolicitanteIngreso.id_solicitante_ingreso == id_solicitante_ingreso
        )
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Solicitante de ingreso no encontrado")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, val)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj
