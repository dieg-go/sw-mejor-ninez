import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import (
    AntecedenteIngreso,
    DocumentacionIngreso,
    RegistroCausalIngreso,
    RegistroDerechoVulnerado,
)
from app.schemas.ingreso import (
    AntecedenteIngresoCreate,
    AntecedenteIngresoRead,
    AntecedenteIngresoUpdate,
    CausalIngresoCreate,
    CausalIngresoRead,
    CausalIngresoUpdate,
    DerechoVulneradoCreate,
    DerechoVulneradoRead,
    DerechoVulneradoUpdate,
    DocumentacionIngresoCreate,
    DocumentacionIngresoRead,
    DocumentacionIngresoUpdate,
)
from app.services import (
    create_diagnostico_informe,
    create_ingreso_child,
    create_nna_child,
    get_nna_child,
    list_ingreso_children,
    list_nna_children,
    update_child,
)

# ── Antecedentes Ingreso (child of NNA, parent of causales/derechos) ─────────

ingresos_router = APIRouter(prefix="/api/nna/{id_nna}/antecedentes-ingreso", tags=["AntecedenteIngreso"])


@ingresos_router.get("", response_model=list[AntecedenteIngresoRead])
async def list_ingresos(
    id_nna: uuid.UUID,
    id_caso: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
):
    return await list_nna_children(db, AntecedenteIngreso, id_nna, id_caso)


@ingresos_router.post("", response_model=AntecedenteIngresoRead, status_code=201)
async def create_ingreso(
    id_nna: uuid.UUID, data: AntecedenteIngresoCreate, db: AsyncSession = Depends(get_db)
):
    ingreso = await create_nna_child(db, AntecedenteIngreso, id_nna, data.model_dump())
    if ingreso.fecha_ingreso_residencia:
        await create_diagnostico_informe(db, id_nna, ingreso.fecha_ingreso_residencia, ingreso.id_caso)
    return ingreso


ingreso_item_router = APIRouter(prefix="/api/antecedente-ingreso", tags=["AntecedenteIngreso"])


@ingreso_item_router.get("/{id_ingreso}", response_model=AntecedenteIngresoRead)
async def get_ingreso(id_ingreso: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, AntecedenteIngreso, AntecedenteIngreso.id_antecedente_ingreso, id_ingreso)
    if not obj:
        raise HTTPException(status_code=404, detail="Antecedente de ingreso no encontrado")
    return obj


@ingreso_item_router.put("/{id_ingreso}", response_model=AntecedenteIngresoRead)
async def update_ingreso(
    id_ingreso: uuid.UUID, data: AntecedenteIngresoUpdate, db: AsyncSession = Depends(get_db)
):
    obj = await get_nna_child(db, AntecedenteIngreso, AntecedenteIngreso.id_antecedente_ingreso, id_ingreso)
    if not obj:
        raise HTTPException(status_code=404, detail="Antecedente de ingreso no encontrado")
    return await update_child(db, obj, data.model_dump(exclude_unset=True))


# ── Causal Ingreso (child of AntecedenteIngreso) ─────────────────────────────

causal_router = APIRouter(prefix="/api/antecedente-ingreso/{id_ingreso}/causales", tags=["CausalIngreso"])


@causal_router.get("", response_model=list[CausalIngresoRead])
async def list_causales(id_ingreso: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await list_ingreso_children(db, RegistroCausalIngreso, id_ingreso)


@causal_router.post("", response_model=CausalIngresoRead, status_code=201)
async def create_causal(
    id_ingreso: uuid.UUID, data: CausalIngresoCreate, db: AsyncSession = Depends(get_db)
):
    return await create_ingreso_child(db, RegistroCausalIngreso, id_ingreso, data.model_dump())


causal_item_router = APIRouter(prefix="/api/causal-ingreso", tags=["CausalIngreso"])


@causal_item_router.get("/{id_causal}", response_model=CausalIngresoRead)
async def get_causal(id_causal: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, RegistroCausalIngreso, RegistroCausalIngreso.id_registro_causales, id_causal)
    if not obj:
        raise HTTPException(status_code=404, detail="Causal no encontrada")
    return obj


@causal_item_router.put("/{id_causal}", response_model=CausalIngresoRead)
async def update_causal(
    id_causal: uuid.UUID, data: CausalIngresoUpdate, db: AsyncSession = Depends(get_db)
):
    obj = await get_nna_child(db, RegistroCausalIngreso, RegistroCausalIngreso.id_registro_causales, id_causal)
    if not obj:
        raise HTTPException(status_code=404, detail="Causal no encontrada")
    return await update_child(db, obj, data.model_dump(exclude_unset=True))


# ── Derecho Vulnerado (child of AntecedenteIngreso) ──────────────────────────

derecho_router = APIRouter(prefix="/api/antecedente-ingreso/{id_ingreso}/derechos-vulnerados", tags=["DerechoVulnerado"])


@derecho_router.get("", response_model=list[DerechoVulneradoRead])
async def list_derechos(id_ingreso: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await list_ingreso_children(db, RegistroDerechoVulnerado, id_ingreso)


@derecho_router.post("", response_model=DerechoVulneradoRead, status_code=201)
async def create_derecho(
    id_ingreso: uuid.UUID, data: DerechoVulneradoCreate, db: AsyncSession = Depends(get_db)
):
    return await create_ingreso_child(db, RegistroDerechoVulnerado, id_ingreso, data.model_dump())


derecho_item_router = APIRouter(prefix="/api/derecho-vulnerado", tags=["DerechoVulnerado"])


@derecho_item_router.get("/{id_derecho}", response_model=DerechoVulneradoRead)
async def get_derecho(id_derecho: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(
        db, RegistroDerechoVulnerado, RegistroDerechoVulnerado.id_registro_derecho_vulnerado, id_derecho
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Derecho vulnerado no encontrado")
    return obj


@derecho_item_router.put("/{id_derecho}", response_model=DerechoVulneradoRead)
async def update_derecho(
    id_derecho: uuid.UUID, data: DerechoVulneradoUpdate, db: AsyncSession = Depends(get_db)
):
    obj = await get_nna_child(
        db, RegistroDerechoVulnerado, RegistroDerechoVulnerado.id_registro_derecho_vulnerado, id_derecho
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Derecho vulnerado no encontrado")
    return await update_child(db, obj, data.model_dump(exclude_unset=True))


# ── Documentacion Ingreso (child of NNA) ─────────────────────────────────────

doc_ingreso_router = APIRouter(prefix="/api/nna/{id_nna}/documentacion-ingreso", tags=["DocumentacionIngreso"])


@doc_ingreso_router.get("", response_model=list[DocumentacionIngresoRead])
async def list_documentacion(
    id_nna: uuid.UUID,
    id_caso: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
):
    return await list_nna_children(db, DocumentacionIngreso, id_nna, id_caso)


@doc_ingreso_router.post("", response_model=DocumentacionIngresoRead, status_code=201)
async def create_documentacion(
    id_nna: uuid.UUID, data: DocumentacionIngresoCreate, db: AsyncSession = Depends(get_db)
):
    return await create_nna_child(db, DocumentacionIngreso, id_nna, data.model_dump())


doc_ingreso_item_router = APIRouter(prefix="/api/documentacion-ingreso", tags=["DocumentacionIngreso"])


@doc_ingreso_item_router.get("/{id_doc}", response_model=DocumentacionIngresoRead)
async def get_documentacion(id_doc: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, DocumentacionIngreso, DocumentacionIngreso.id_documentacion, id_doc)
    if not obj:
        raise HTTPException(status_code=404, detail="Documentación no encontrada")
    return obj


@doc_ingreso_item_router.put("/{id_doc}", response_model=DocumentacionIngresoRead)
async def update_documentacion(
    id_doc: uuid.UUID, data: DocumentacionIngresoUpdate, db: AsyncSession = Depends(get_db)
):
    obj = await get_nna_child(db, DocumentacionIngreso, DocumentacionIngreso.id_documentacion, id_doc)
    if not obj:
        raise HTTPException(status_code=404, detail="Documentación no encontrada")
    return await update_child(db, obj, data.model_dump(exclude_unset=True))
