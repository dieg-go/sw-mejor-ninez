import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_db
from app.models.establecimiento import EstablecimientoEducacional
from app.schemas.establecimiento import (
    EstablecimientoEducacionalCreate,
    EstablecimientoEducacionalRead,
    EstablecimientoEducacionalUpdate,
)

router = APIRouter(prefix="/api/establecimientos", tags=["EstablecimientoEducacional"])


@router.get("", response_model=list[EstablecimientoEducacionalRead])
async def list_establecimientos(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(EstablecimientoEducacional).offset(skip).limit(limit))
    return list(result.scalars().all())


@router.post("", response_model=EstablecimientoEducacionalRead, status_code=201)
async def create_establecimiento(data: EstablecimientoEducacionalCreate, db: AsyncSession = Depends(get_db)):
    obj = EstablecimientoEducacional(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/{id_establecimiento_educacional}", response_model=EstablecimientoEducacionalRead)
async def get_establecimiento(id_establecimiento_educacional: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EstablecimientoEducacional).where(
            EstablecimientoEducacional.id_establecimiento_educacional == id_establecimiento_educacional
        )
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Establecimiento educacional no encontrado")
    return obj


@router.put("/{id_establecimiento_educacional}", response_model=EstablecimientoEducacionalRead)
async def update_establecimiento(
    id_establecimiento_educacional: uuid.UUID,
    data: EstablecimientoEducacionalUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EstablecimientoEducacional).where(
            EstablecimientoEducacional.id_establecimiento_educacional == id_establecimiento_educacional
        )
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Establecimiento educacional no encontrado")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, val)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj
