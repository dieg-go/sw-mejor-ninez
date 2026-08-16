import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_db
from app.models.busqueda_familiar import NotificacionFamiliar, ProcesoDespejeFamiliar
from app.services import get_active_caso
from app.schemas.busqueda_familiar import (
    NotificacionFamiliarCreate,
    NotificacionFamiliarRead,
    NotificacionFamiliarUpdate,
    ProcesoDespejeFamiliarCreate,
    ProcesoDespejeFamiliarRead,
    ProcesoDespejeFamiliarUpdate,
)


# ── Despeje (cabecera por NNA) ──────────────────────────────────────────────

despeje_router = APIRouter(prefix="/api/nna/{id_nna}/despeje", tags=["ProcesoDespejeFamiliar"])


@despeje_router.get("", response_model=ProcesoDespejeFamiliarRead)
async def get_despeje(id_nna: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ProcesoDespejeFamiliar).where(ProcesoDespejeFamiliar.id_nna == id_nna)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Despeje no encontrado para este NNA")
    return obj


@despeje_router.post("", response_model=ProcesoDespejeFamiliarRead, status_code=201)
async def create_despeje(
    id_nna: uuid.UUID, data: ProcesoDespejeFamiliarCreate, db: AsyncSession = Depends(get_db)
):
    existing = await db.execute(
        select(ProcesoDespejeFamiliar).where(ProcesoDespejeFamiliar.id_nna == id_nna)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Ya existe un despeje para este NNA")
    caso = await get_active_caso(db, id_nna)
    obj = ProcesoDespejeFamiliar(
        id_nna=id_nna, id_caso=caso.id_caso if caso else None, **data.model_dump()
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


despeje_item_router = APIRouter(prefix="/api/despeje", tags=["ProcesoDespejeFamiliar"])


@despeje_item_router.put("/{id_despeje}", response_model=ProcesoDespejeFamiliarRead)
async def update_despeje(
    id_despeje: uuid.UUID, data: ProcesoDespejeFamiliarUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ProcesoDespejeFamiliar).where(ProcesoDespejeFamiliar.id_despeje == id_despeje)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Despeje no encontrado")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, val)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ── Notificaciones (detalle por familiar) ───────────────────────────────────

notificacion_router = APIRouter(
    prefix="/api/despeje/{id_despeje}/notificaciones", tags=["NotificacionFamiliar"]
)


@notificacion_router.get("", response_model=list[NotificacionFamiliarRead])
async def list_notificaciones(id_despeje: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(NotificacionFamiliar).where(NotificacionFamiliar.id_despeje == id_despeje)
    )
    return list(result.scalars().all())


@notificacion_router.post("", response_model=NotificacionFamiliarRead, status_code=201)
async def create_notificacion(
    id_despeje: uuid.UUID, data: NotificacionFamiliarCreate, db: AsyncSession = Depends(get_db)
):
    obj = NotificacionFamiliar(id_despeje=id_despeje, **data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


notificacion_item_router = APIRouter(prefix="/api/notificacion", tags=["NotificacionFamiliar"])


@notificacion_item_router.get("/{id_notificacion}", response_model=NotificacionFamiliarRead)
async def get_notificacion(id_notificacion: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(NotificacionFamiliar).where(NotificacionFamiliar.id_notificacion == id_notificacion)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    return obj


@notificacion_item_router.put("/{id_notificacion}", response_model=NotificacionFamiliarRead)
async def update_notificacion(
    id_notificacion: uuid.UUID,
    data: NotificacionFamiliarUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(NotificacionFamiliar).where(NotificacionFamiliar.id_notificacion == id_notificacion)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, val)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj
