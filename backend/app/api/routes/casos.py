import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_db
from app.models import Caso
from app.schemas.caso import CasoCreate, CasoRead, CasoUpdate
from app.services import get_active_caso

nna_casos_router = APIRouter(prefix="/api/nna/{id_nna}/casos", tags=["Caso"])
casos_router = APIRouter(prefix="/api/casos", tags=["Caso"])


@nna_casos_router.get("", response_model=list[CasoRead])
async def list_casos(id_nna: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Caso)
        .where(Caso.id_nna == id_nna)
        .order_by(Caso.fecha_inicio.desc().nulls_last())
    )
    return list(result.scalars().all())


@nna_casos_router.post("", response_model=CasoRead, status_code=201)
async def create_caso(
    id_nna: uuid.UUID, data: CasoCreate, db: AsyncSession = Depends(get_db)
):
    active = await get_active_caso(db, id_nna)
    if active:
        raise HTTPException(status_code=409, detail="NNA ya tiene un caso activo")
    caso = Caso(id_nna=id_nna, **data.model_dump())
    db.add(caso)
    await db.commit()
    await db.refresh(caso)
    return caso


@casos_router.get("/{id_caso}", response_model=CasoRead)
async def get_caso(id_caso: uuid.UUID, db: AsyncSession = Depends(get_db)):
    caso = await db.get(Caso, id_caso)
    if not caso:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    return caso


@casos_router.put("/{id_caso}", response_model=CasoRead)
async def update_caso(
    id_caso: uuid.UUID, data: CasoUpdate, db: AsyncSession = Depends(get_db)
):
    caso = await db.get(Caso, id_caso)
    if not caso:
        raise HTTPException(status_code=404, detail="Caso no encontrado")

    payload = data.model_dump(exclude_unset=True)
    if payload.get("estado") == "En Progreso":
        active = await get_active_caso(db, caso.id_nna)
        if active and active.id_caso != caso.id_caso:
            raise HTTPException(status_code=409, detail="NNA ya tiene un caso activo")
    if payload.get("estado") == "Cerrado" and "fecha_termino" not in payload:
        payload["fecha_termino"] = date.today()

    for key, val in payload.items():
        setattr(caso, key, val)
    db.add(caso)
    await db.commit()
    await db.refresh(caso)
    return caso