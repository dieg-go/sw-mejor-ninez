import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_db
from app.models.centro_salud import CentroSalud
from app.schemas.centro_salud import (
    CentroSaludCreate,
    CentroSaludRead,
    CentroSaludUpdate,
)

router = APIRouter(prefix="/api/centros-salud", tags=["CentroSalud"])


@router.get("", response_model=list[CentroSaludRead])
async def list_centros_salud(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CentroSalud).offset(skip).limit(limit))
    return list(result.scalars().all())


@router.post("", response_model=CentroSaludRead, status_code=201)
async def create_centro_salud(data: CentroSaludCreate, db: AsyncSession = Depends(get_db)):
    obj = CentroSalud(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/{id_centro_salud}", response_model=CentroSaludRead)
async def get_centro_salud(id_centro_salud: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CentroSalud).where(CentroSalud.id_centro_salud == id_centro_salud)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Centro de salud no encontrado")
    return obj


@router.put("/{id_centro_salud}", response_model=CentroSaludRead)
async def update_centro_salud(
    id_centro_salud: uuid.UUID,
    data: CentroSaludUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CentroSalud).where(CentroSalud.id_centro_salud == id_centro_salud)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Centro de salud no encontrado")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, val)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj
