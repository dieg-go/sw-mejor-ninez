import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import AntecedentesPenales, DiscapacidadAdulto, DiscapacidadNNA, HistorialConsumoAdulto, HistorialConsumoNNA
from app.schemas.adulto import AntecedentePenalRead, AntecedentePenalUpdate
from app.schemas.consumo import (
    HistorialConsumoAdultoCreate,
    HistorialConsumoAdultoRead,
    HistorialConsumoAdultoUpdate,
    HistorialConsumoNNACreate,
    HistorialConsumoNNARead,
    HistorialConsumoNNAUpdate,
)
from app.schemas.discapacidad import (
    DiscapacidadAdultoCreate,
    DiscapacidadAdultoRead,
    DiscapacidadAdultoUpdate,
    DiscapacidadNNACreate,
    DiscapacidadNNARead,
    DiscapacidadNNAUpdate,
)
from app.services import (
    create_adulto_child,
    create_nna_child,
    get_nna_child,
    list_adulto_children,
    list_nna_children,
    update_child,
)

# ── Historial Consumo NNA ────────────────────────────────────────────────────

consumo_nna_router = APIRouter(prefix="/api/nna/{id_nna}/historial-consumo", tags=["HistorialConsumoNNA"])


@consumo_nna_router.get("", response_model=list[HistorialConsumoNNARead])
async def list_consumo_nna(id_nna: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await list_nna_children(db, HistorialConsumoNNA, id_nna)


@consumo_nna_router.post("", response_model=HistorialConsumoNNARead, status_code=201)
async def create_consumo_nna(
    id_nna: uuid.UUID, data: HistorialConsumoNNACreate, db: AsyncSession = Depends(get_db)
):
    return await create_nna_child(db, HistorialConsumoNNA, id_nna, data.model_dump())


consumo_nna_item_router = APIRouter(prefix="/api/historial-consumo-nna", tags=["HistorialConsumoNNA"])


@consumo_nna_item_router.get("/{id_consumo}", response_model=HistorialConsumoNNARead)
async def get_consumo_nna(id_consumo: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, HistorialConsumoNNA, HistorialConsumoNNA.id_historial_consumo, id_consumo)
    if not obj:
        raise HTTPException(status_code=404, detail="Historial de consumo no encontrado")
    return obj


@consumo_nna_item_router.put("/{id_consumo}", response_model=HistorialConsumoNNARead)
async def update_consumo_nna(
    id_consumo: uuid.UUID, data: HistorialConsumoNNAUpdate, db: AsyncSession = Depends(get_db)
):
    obj = await get_nna_child(db, HistorialConsumoNNA, HistorialConsumoNNA.id_historial_consumo, id_consumo)
    if not obj:
        raise HTTPException(status_code=404, detail="Historial de consumo no encontrado")
    return await update_child(db, obj, data.model_dump(exclude_unset=True))


# ── Historial Consumo Adulto ─────────────────────────────────────────────────

consumo_adulto_router = APIRouter(prefix="/api/adultos/{id_adulto}/historial-consumo", tags=["HistorialConsumoAdulto"])


@consumo_adulto_router.get("", response_model=list[HistorialConsumoAdultoRead])
async def list_consumo_adulto(id_adulto: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await list_adulto_children(db, HistorialConsumoAdulto, id_adulto)


@consumo_adulto_router.post("", response_model=HistorialConsumoAdultoRead, status_code=201)
async def create_consumo_adulto(
    id_adulto: uuid.UUID, data: HistorialConsumoAdultoCreate, db: AsyncSession = Depends(get_db)
):
    return await create_adulto_child(db, HistorialConsumoAdulto, id_adulto, data.model_dump())


consumo_adulto_item_router = APIRouter(prefix="/api/historial-consumo-adulto", tags=["HistorialConsumoAdulto"])


@consumo_adulto_item_router.get("/{id_consumo}", response_model=HistorialConsumoAdultoRead)
async def get_consumo_adulto(id_consumo: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, HistorialConsumoAdulto, HistorialConsumoAdulto.id_historial_consumo, id_consumo)
    if not obj:
        raise HTTPException(status_code=404, detail="Historial de consumo no encontrado")
    return obj


@consumo_adulto_item_router.put("/{id_consumo}", response_model=HistorialConsumoAdultoRead)
async def update_consumo_adulto(
    id_consumo: uuid.UUID, data: HistorialConsumoAdultoUpdate, db: AsyncSession = Depends(get_db)
):
    obj = await get_nna_child(db, HistorialConsumoAdulto, HistorialConsumoAdulto.id_historial_consumo, id_consumo)
    if not obj:
        raise HTTPException(status_code=404, detail="Historial de consumo no encontrado")
    return await update_child(db, obj, data.model_dump(exclude_unset=True))


# ── Discapacidad NNA ─────────────────────────────────────────────────────────

disc_nna_router = APIRouter(prefix="/api/nna/{id_nna}/discapacidades", tags=["DiscapacidadNNA"])


@disc_nna_router.get("", response_model=list[DiscapacidadNNARead])
async def list_disc_nna(id_nna: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await list_nna_children(db, DiscapacidadNNA, id_nna)


@disc_nna_router.post("", response_model=DiscapacidadNNARead, status_code=201)
async def create_disc_nna(
    id_nna: uuid.UUID, data: DiscapacidadNNACreate, db: AsyncSession = Depends(get_db)
):
    return await create_nna_child(db, DiscapacidadNNA, id_nna, data.model_dump())


disc_nna_item_router = APIRouter(prefix="/api/discapacidad-nna", tags=["DiscapacidadNNA"])


@disc_nna_item_router.get("/{id_disc}", response_model=DiscapacidadNNARead)
async def get_disc_nna(id_disc: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, DiscapacidadNNA, DiscapacidadNNA.id_discapacidad, id_disc)
    if not obj:
        raise HTTPException(status_code=404, detail="Discapacidad no encontrada")
    return obj


@disc_nna_item_router.put("/{id_disc}", response_model=DiscapacidadNNARead)
async def update_disc_nna(
    id_disc: uuid.UUID, data: DiscapacidadNNAUpdate, db: AsyncSession = Depends(get_db)
):
    obj = await get_nna_child(db, DiscapacidadNNA, DiscapacidadNNA.id_discapacidad, id_disc)
    if not obj:
        raise HTTPException(status_code=404, detail="Discapacidad no encontrada")
    return await update_child(db, obj, data.model_dump(exclude_unset=True))


# ── Discapacidad Adulto ──────────────────────────────────────────────────────

disc_adulto_router = APIRouter(prefix="/api/adultos/{id_adulto}/discapacidades", tags=["DiscapacidadAdulto"])


@disc_adulto_router.get("", response_model=list[DiscapacidadAdultoRead])
async def list_disc_adulto(id_adulto: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await list_adulto_children(db, DiscapacidadAdulto, id_adulto)


@disc_adulto_router.post("", response_model=DiscapacidadAdultoRead, status_code=201)
async def create_disc_adulto(
    id_adulto: uuid.UUID, data: DiscapacidadAdultoCreate, db: AsyncSession = Depends(get_db)
):
    return await create_adulto_child(db, DiscapacidadAdulto, id_adulto, data.model_dump())


disc_adulto_item_router = APIRouter(prefix="/api/discapacidad-adulto", tags=["DiscapacidadAdulto"])


@disc_adulto_item_router.get("/{id_disc}", response_model=DiscapacidadAdultoRead)
async def get_disc_adulto(id_disc: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, DiscapacidadAdulto, DiscapacidadAdulto.id_discapacidad, id_disc)
    if not obj:
        raise HTTPException(status_code=404, detail="Discapacidad no encontrada")
    return obj


@disc_adulto_item_router.put("/{id_disc}", response_model=DiscapacidadAdultoRead)
async def update_disc_adulto(
    id_disc: uuid.UUID, data: DiscapacidadAdultoUpdate, db: AsyncSession = Depends(get_db)
):
    obj = await get_nna_child(db, DiscapacidadAdulto, DiscapacidadAdulto.id_discapacidad, id_disc)
    if not obj:
        raise HTTPException(status_code=404, detail="Discapacidad no encontrada")
    return await update_child(db, obj, data.model_dump(exclude_unset=True))


# ── Antecedente Penal item routes ────────────────────────────────────────────

penal_item_router = APIRouter(prefix="/api/antecedente-penal", tags=["AntecedentesPenales"])


@penal_item_router.get("/{id_penal}", response_model=AntecedentePenalRead)
async def get_penal(id_penal: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, AntecedentesPenales, AntecedentesPenales.id_antecedentes_penales, id_penal)
    if not obj:
        raise HTTPException(status_code=404, detail="Antecedente penal no encontrado")
    return obj


@penal_item_router.put("/{id_penal}", response_model=AntecedentePenalRead)
async def update_penal(
    id_penal: uuid.UUID, data: AntecedentePenalUpdate, db: AsyncSession = Depends(get_db)
):
    obj = await get_nna_child(db, AntecedentesPenales, AntecedentesPenales.id_antecedentes_penales, id_penal)
    if not obj:
        raise HTTPException(status_code=404, detail="Antecedente penal no encontrado")
    return await update_child(db, obj, data.model_dump(exclude_unset=True))
