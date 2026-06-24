import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_db
from app.models import HistorialRedProteccional, InformeTribunal, NNA
from app.models.enums import EstadoInforme
from app.schemas.historial import (
    HistorialRedProteccionalCreate,
    HistorialRedProteccionalRead,
    HistorialRedProteccionalUpdate,
    InformeAlertaRead,
    InformeTribunalCreate,
    InformeTribunalRead,
    InformeTribunalUpdate,
)
from app.services import (
    chain_next_informe,
    create_nna_child,
    get_nna_child,
    list_nna_children,
    update_child,
)

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

    was_enviado = obj.estado == EstadoInforme.ENVIADO
    updated = await update_child(db, obj, data.model_dump(exclude_unset=True))

    if not was_enviado and updated.estado == EstadoInforme.ENVIADO:
        await chain_next_informe(db, updated.id_nna, updated)

    return updated


alerta_router = APIRouter(prefix="/api/informes", tags=["Alertas"])


@alerta_router.get("/atrasados", response_model=list[InformeAlertaRead])
async def informes_atrasados(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            InformeTribunal.id_informe,
            InformeTribunal.id_nna,
            InformeTribunal.tipo_informe,
            InformeTribunal.fecha_vencimiento,
            InformeTribunal.estado,
            NNA.nombre.label("nombre_nna"),
            (InformeTribunal.fecha_vencimiento - func.current_date()).label("dias_restantes"),
        )
        .join(NNA, InformeTribunal.id_nna == NNA.id_nna)
        .where(
            InformeTribunal.estado == EstadoInforme.PENDIENTE,
            InformeTribunal.fecha_vencimiento < func.current_date(),
        )
        .order_by(InformeTribunal.fecha_vencimiento.asc())
    )
    return [
        InformeAlertaRead(
            id_informe=row.id_informe,
            id_nna=row.id_nna,
            tipo_informe=row.tipo_informe,
            fecha_vencimiento=row.fecha_vencimiento,
            estado=row.estado,
            nombre_nna=row.nombre_nna,
            dias_restantes=row.dias_restantes,
        )
        for row in result
    ]


@alerta_router.get("/proximos-a-vencer", response_model=list[InformeAlertaRead])
async def informes_proximos(
    dias: int = Query(10, ge=1, le=365), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(
            InformeTribunal.id_informe,
            InformeTribunal.id_nna,
            InformeTribunal.tipo_informe,
            InformeTribunal.fecha_vencimiento,
            InformeTribunal.estado,
            NNA.nombre.label("nombre_nna"),
            (InformeTribunal.fecha_vencimiento - func.current_date()).label("dias_restantes"),
        )
        .join(NNA, InformeTribunal.id_nna == NNA.id_nna)
        .where(
            InformeTribunal.estado == EstadoInforme.PENDIENTE,
            InformeTribunal.fecha_vencimiento >= func.current_date(),
            InformeTribunal.fecha_vencimiento - func.current_date() <= dias,
        )
        .order_by(InformeTribunal.fecha_vencimiento.asc())
    )
    return [
        InformeAlertaRead(
            id_informe=row.id_informe,
            id_nna=row.id_nna,
            tipo_informe=row.tipo_informe,
            fecha_vencimiento=row.fecha_vencimiento,
            estado=row.estado,
            nombre_nna=row.nombre_nna,
            dias_restantes=row.dias_restantes,
        )
        for row in result
    ]
