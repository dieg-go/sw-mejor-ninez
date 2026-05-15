import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.adulto import (
    AdultoSignificativoCreate,
    AdultoSignificativoRead,
    AdultoSignificativoUpdate,
    AntecedentePenalCreate,
    AntecedentePenalRead,
    AntecedentePenalUpdate,
)
from app.models import AntecedentesPenales
from app.services import (
    AdultoService,
    create_adulto_child,
    get_nna_child,
    list_adulto_children,
    update_child,
)

router = APIRouter(prefix="/api/adultos", tags=["AdultoSignificativo"])


@router.get("", response_model=list[AdultoSignificativoRead])
async def list_adultos(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    service = AdultoService(db)
    return await service.list(skip=skip, limit=limit)


@router.post("", response_model=AdultoSignificativoRead, status_code=201)
async def create_adulto(data: AdultoSignificativoCreate, db: AsyncSession = Depends(get_db)):
    service = AdultoService(db)
    return await service.create(data.model_dump())


@router.get("/{id_adulto}", response_model=AdultoSignificativoRead)
async def get_adulto(id_adulto: uuid.UUID, db: AsyncSession = Depends(get_db)):
    service = AdultoService(db)
    adulto = await service.get(id_adulto)
    if not adulto:
        raise HTTPException(status_code=404, detail="Adulto no encontrado")
    return adulto


@router.put("/{id_adulto}", response_model=AdultoSignificativoRead)
async def update_adulto(
    id_adulto: uuid.UUID,
    data: AdultoSignificativoUpdate,
    db: AsyncSession = Depends(get_db),
):
    service = AdultoService(db)
    adulto = await service.get(id_adulto)
    if not adulto:
        raise HTTPException(status_code=404, detail="Adulto no encontrado")
    return await service.update(adulto, data.model_dump(exclude_unset=True))


# ── Antecedentes Penales (child of Adulto) ───────────────────────────────────

adulto_penal_router = APIRouter(prefix="/api/adultos/{id_adulto}/antecedentes-penales", tags=["AdultoSignificativo"])


@adulto_penal_router.get("", response_model=list[AntecedentePenalRead])
async def list_antecedentes_penales(id_adulto: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await list_adulto_children(db, AntecedentesPenales, id_adulto)


@adulto_penal_router.post("", response_model=AntecedentePenalRead, status_code=201)
async def create_antecedente_penal(
    id_adulto: uuid.UUID, data: AntecedentePenalCreate, db: AsyncSession = Depends(get_db)
):
    return await create_adulto_child(db, AntecedentesPenales, id_adulto, data.model_dump())
