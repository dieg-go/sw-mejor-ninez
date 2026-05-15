import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import GestionBusquedaFamiliar, HistorialRedProteccional, InformeTribunal
from app.schemas.historial import (
    GestionBusquedaFamiliarCreate,
    GestionBusquedaFamiliarRead,
    GestionBusquedaFamiliarUpdate,
    HistorialRedProteccionalCreate,
    HistorialRedProteccionalRead,
    HistorialRedProteccionalUpdate,
    InformeTribunalCreate,
    InformeTribunalRead,
    InformeTribunalUpdate,
)
from app.services import create_nna_child, get_nna_child, list_nna_children, update_child

# ── Historial Red Proteccional ───────────────────────────────────────────────

red_router = APIRouter(prefix="/api/nna/{id_nna}/historial-red", tags=["HistorialRedProteccional"])


@red_router.get("", response_model=list[HistorialRedProteccionalRead])
async def list_red(id_nna: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await list_nna_children(db, HistorialRedProteccional, id_nna)


@red_router.post("", response_model=HistorialRedProteccionalRead, status_code=201)
async def create_red(
    id_nna: uuid.UUID, data: HistorialRedProteccionalCreate, db: AsyncSession = Depends(get_db)
):
    return await create_nna_child(db, HistorialRedProteccional, id_nna, data.model_dump())


red_item_router = APIRouter(prefix="/api/historial-red", tags=["HistorialRedProteccional"])


@red_item_router.get("/{id_red}", response_model=HistorialRedProteccionalRead)
async def get_red(id_red: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, HistorialRedProteccional, HistorialRedProteccional.id_historial_red, id_red)
    if not obj:
        raise HTTPException(status_code=404, detail="Historial red no encontrado")
    return obj


@red_item_router.put("/{id_red}", response_model=HistorialRedProteccionalRead)
async def update_red(
    id_red: uuid.UUID, data: HistorialRedProteccionalUpdate, db: AsyncSession = Depends(get_db)
):
    obj = await get_nna_child(db, HistorialRedProteccional, HistorialRedProteccional.id_historial_red, id_red)
    if not obj:
        raise HTTPException(status_code=404, detail="Historial red no encontrado")
    return await update_child(db, obj, data.model_dump(exclude_unset=True))


# ── Gestión Búsqueda Familiar ────────────────────────────────────────────────

busqueda_router = APIRouter(prefix="/api/nna/{id_nna}/gestiones-busqueda", tags=["GestionBusquedaFamiliar"])


@busqueda_router.get("", response_model=list[GestionBusquedaFamiliarRead])
async def list_busquedas(id_nna: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await list_nna_children(db, GestionBusquedaFamiliar, id_nna)


@busqueda_router.post("", response_model=GestionBusquedaFamiliarRead, status_code=201)
async def create_busqueda(
    id_nna: uuid.UUID, data: GestionBusquedaFamiliarCreate, db: AsyncSession = Depends(get_db)
):
    return await create_nna_child(db, GestionBusquedaFamiliar, id_nna, data.model_dump())


busqueda_item_router = APIRouter(prefix="/api/gestion-busqueda", tags=["GestionBusquedaFamiliar"])


@busqueda_item_router.get("/{id_busqueda}", response_model=GestionBusquedaFamiliarRead)
async def get_busqueda(id_busqueda: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(
        db, GestionBusquedaFamiliar, GestionBusquedaFamiliar.id_gestion_busqueda, id_busqueda
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Gestión de búsqueda no encontrada")
    return obj


@busqueda_item_router.put("/{id_busqueda}", response_model=GestionBusquedaFamiliarRead)
async def update_busqueda(
    id_busqueda: uuid.UUID, data: GestionBusquedaFamiliarUpdate, db: AsyncSession = Depends(get_db)
):
    obj = await get_nna_child(
        db, GestionBusquedaFamiliar, GestionBusquedaFamiliar.id_gestion_busqueda, id_busqueda
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Gestión de búsqueda no encontrada")
    return await update_child(db, obj, data.model_dump(exclude_unset=True))


# ── Informe Tribunal ─────────────────────────────────────────────────────────

informe_router = APIRouter(prefix="/api/nna/{id_nna}/informes-tribunal", tags=["InformeTribunal"])


@informe_router.get("", response_model=list[InformeTribunalRead])
async def list_informes(id_nna: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await list_nna_children(db, InformeTribunal, id_nna)


@informe_router.post("", response_model=InformeTribunalRead, status_code=201)
async def create_informe(
    id_nna: uuid.UUID, data: InformeTribunalCreate, db: AsyncSession = Depends(get_db)
):
    return await create_nna_child(db, InformeTribunal, id_nna, data.model_dump())


informe_item_router = APIRouter(prefix="/api/informe-tribunal", tags=["InformeTribunal"])


@informe_item_router.get("/{id_informe}", response_model=InformeTribunalRead)
async def get_informe(id_informe: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, InformeTribunal, InformeTribunal.id_informe, id_informe)
    if not obj:
        raise HTTPException(status_code=404, detail="Informe no encontrado")
    return obj


@informe_item_router.put("/{id_informe}", response_model=InformeTribunalRead)
async def update_informe(
    id_informe: uuid.UUID, data: InformeTribunalUpdate, db: AsyncSession = Depends(get_db)
):
    obj = await get_nna_child(db, InformeTribunal, InformeTribunal.id_informe, id_informe)
    if not obj:
        raise HTTPException(status_code=404, detail="Informe no encontrado")
    return await update_child(db, obj, data.model_dump(exclude_unset=True))
