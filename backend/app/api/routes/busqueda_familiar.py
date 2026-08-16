import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_db
from app.models.busqueda_familiar import NotificacionFamiliar, ProcesoDespejeFamiliar
from app.services import _assert_caso_abierto, get_active_caso
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
async def get_despeje(
    id_nna: uuid.UUID,
    id_caso: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(ProcesoDespejeFamiliar).where(ProcesoDespejeFamiliar.id_nna == id_nna)
    if id_caso:
        stmt = stmt.where(ProcesoDespejeFamiliar.id_caso == id_caso)
    else:
        caso = await get_active_caso(db, id_nna)
        if caso:
            stmt = stmt.where(ProcesoDespejeFamiliar.id_caso == caso.id_caso)
    result = await db.execute(stmt)
    obj = result.scalars().first()
    if not obj:
        raise HTTPException(status_code=404, detail="Despeje no encontrado para este NNA")
    return obj


@despeje_router.post("", response_model=ProcesoDespejeFamiliarRead, status_code=201)
async def create_despeje(
    id_nna: uuid.UUID, data: ProcesoDespejeFamiliarCreate, db: AsyncSession = Depends(get_db)
):
    caso = await get_active_caso(db, id_nna)
    if not caso:
        raise HTTPException(status_code=409, detail="No hay un caso activo para este NNA")
    existing = await db.execute(
        select(ProcesoDespejeFamiliar).where(
            ProcesoDespejeFamiliar.id_nna == id_nna,
            ProcesoDespejeFamiliar.id_caso == caso.id_caso,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Ya existe un despeje para este caso")
    obj = ProcesoDespejeFamiliar(id_nna=id_nna, id_caso=caso.id_caso, **data.model_dump())
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
    await _assert_caso_abierto(db, obj)
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, val)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# ── Notificaciones (detalle por familiar) ───────────────────────────────────

async def _get_despeje_or_404(db: AsyncSession, id_despeje: uuid.UUID) -> ProcesoDespejeFamiliar:
    result = await db.execute(
        select(ProcesoDespejeFamiliar).where(ProcesoDespejeFamiliar.id_despeje == id_despeje)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Despeje no encontrado")
    return obj


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
    despeje = await _get_despeje_or_404(db, id_despeje)
    await _assert_caso_abierto(db, despeje)
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
    despeje = await _get_despeje_or_404(db, obj.id_despeje)
    await _assert_caso_abierto(db, despeje)
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, val)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj
