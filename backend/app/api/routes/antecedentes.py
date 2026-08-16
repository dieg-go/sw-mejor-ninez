import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import AntecedenteEscolar, AntecedenteFamiliar, AntecedenteSalud, VinculoFamiliar
from app.schemas.antecedentes import (
    AntecedenteEscolarCreate,
    AntecedenteEscolarRead,
    AntecedenteEscolarUpdate,
    AntecedenteFamiliarCreate,
    AntecedenteFamiliarRead,
    AntecedenteFamiliarUpdate,
    AntecedenteSaludCreate,
    AntecedenteSaludRead,
    AntecedenteSaludUpdate,
    VinculoFamiliarCreate,
    VinculoFamiliarRead,
    VinculoFamiliarUpdate,
)
from app.services import (
    create_nna_child,
    create_vinculo,
    get_nna_child,
    list_nna_children,
    list_vinculo,
    update_child,
)

# ── Antecedente Salud ────────────────────────────────────────────────────────

salud_router = APIRouter(prefix="/api/nna/{id_nna}/antecedentes-salud", tags=["AntecedenteSalud"])


@salud_router.get("", response_model=list[AntecedenteSaludRead])
async def list_salud(
    id_nna: uuid.UUID,
    id_caso: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
):
    return await list_nna_children(db, AntecedenteSalud, id_nna, id_caso)


@salud_router.post("", response_model=AntecedenteSaludRead, status_code=201)
async def create_salud(
    id_nna: uuid.UUID, data: AntecedenteSaludCreate, db: AsyncSession = Depends(get_db)
):
    return await create_nna_child(db, AntecedenteSalud, id_nna, data.model_dump())


salud_item_router = APIRouter(prefix="/api/antecedente-salud", tags=["AntecedenteSalud"])


@salud_item_router.get("/{id_salud}", response_model=AntecedenteSaludRead)
async def get_salud(id_salud: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, AntecedenteSalud, AntecedenteSalud.id_antecedente_salud, id_salud)
    if not obj:
        raise HTTPException(status_code=404, detail="Antecedente de salud no encontrado")
    return obj


@salud_item_router.put("/{id_salud}", response_model=AntecedenteSaludRead)
async def update_salud(
    id_salud: uuid.UUID, data: AntecedenteSaludUpdate, db: AsyncSession = Depends(get_db)
):
    obj = await get_nna_child(db, AntecedenteSalud, AntecedenteSalud.id_antecedente_salud, id_salud)
    if not obj:
        raise HTTPException(status_code=404, detail="Antecedente de salud no encontrado")
    return await update_child(db, obj, data.model_dump(exclude_unset=True))


# ── Antecedente Escolar ──────────────────────────────────────────────────────

escolar_router = APIRouter(prefix="/api/nna/{id_nna}/antecedentes-escolares", tags=["AntecedenteEscolar"])


@escolar_router.get("", response_model=list[AntecedenteEscolarRead])
async def list_escolar(
    id_nna: uuid.UUID,
    id_caso: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
):
    return await list_nna_children(db, AntecedenteEscolar, id_nna, id_caso)


@escolar_router.post("", response_model=AntecedenteEscolarRead, status_code=201)
async def create_escolar(
    id_nna: uuid.UUID, data: AntecedenteEscolarCreate, db: AsyncSession = Depends(get_db)
):
    return await create_nna_child(db, AntecedenteEscolar, id_nna, data.model_dump())


escolar_item_router = APIRouter(prefix="/api/antecedente-escolar", tags=["AntecedenteEscolar"])


@escolar_item_router.get("/{id_escolar}", response_model=AntecedenteEscolarRead)
async def get_escolar(id_escolar: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, AntecedenteEscolar, AntecedenteEscolar.id_antecedente_escolar, id_escolar)
    if not obj:
        raise HTTPException(status_code=404, detail="Antecedente escolar no encontrado")
    return obj


@escolar_item_router.put("/{id_escolar}", response_model=AntecedenteEscolarRead)
async def update_escolar(
    id_escolar: uuid.UUID, data: AntecedenteEscolarUpdate, db: AsyncSession = Depends(get_db)
):
    obj = await get_nna_child(db, AntecedenteEscolar, AntecedenteEscolar.id_antecedente_escolar, id_escolar)
    if not obj:
        raise HTTPException(status_code=404, detail="Antecedente escolar no encontrado")
    return await update_child(db, obj, data.model_dump(exclude_unset=True))


# ── Antecedente Familiar ─────────────────────────────────────────────────────

familiar_router = APIRouter(prefix="/api/nna/{id_nna}/antecedentes-familiares", tags=["AntecedenteFamiliar"])


@familiar_router.get("", response_model=list[AntecedenteFamiliarRead])
async def list_familiar(
    id_nna: uuid.UUID,
    id_caso: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
):
    return await list_nna_children(db, AntecedenteFamiliar, id_nna, id_caso)


@familiar_router.post("", response_model=AntecedenteFamiliarRead, status_code=201)
async def create_familiar(
    id_nna: uuid.UUID, data: AntecedenteFamiliarCreate, db: AsyncSession = Depends(get_db)
):
    return await create_nna_child(db, AntecedenteFamiliar, id_nna, data.model_dump())


familiar_item_router = APIRouter(prefix="/api/antecedente-familiar", tags=["AntecedenteFamiliar"])


@familiar_item_router.get("/{id_familiar}", response_model=AntecedenteFamiliarRead)
async def get_familiar(id_familiar: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(
        db, AntecedenteFamiliar, AntecedenteFamiliar.id_antecedente_familiar, id_familiar
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Antecedente familiar no encontrado")
    return obj


@familiar_item_router.put("/{id_familiar}", response_model=AntecedenteFamiliarRead)
async def update_familiar(
    id_familiar: uuid.UUID, data: AntecedenteFamiliarUpdate, db: AsyncSession = Depends(get_db)
):
    obj = await get_nna_child(
        db, AntecedenteFamiliar, AntecedenteFamiliar.id_antecedente_familiar, id_familiar
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Antecedente familiar no encontrado")
    return await update_child(db, obj, data.model_dump(exclude_unset=True))


# ── Vinculo Familiar (child of NNA) ──────────────────────────────────────────

vinculo_router = APIRouter(prefix="/api/nna/{id_nna}/vinculos", tags=["VinculoFamiliar"])


@vinculo_router.get("", response_model=list[VinculoFamiliarRead])
async def list_vinculo_familiar(id_nna: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await list_vinculo(db, id_nna)


@vinculo_router.post("", response_model=VinculoFamiliarRead, status_code=201)
async def create_vinculo_familiar(
    id_nna: uuid.UUID, data: VinculoFamiliarCreate, db: AsyncSession = Depends(get_db)
):
    return await create_vinculo(db, id_nna, data.model_dump())


vinculo_item_router = APIRouter(prefix="/api/vinculo-familiar", tags=["VinculoFamiliar"])


@vinculo_item_router.get("/{id_vinculo}", response_model=VinculoFamiliarRead)
async def get_vinculo(id_vinculo: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, VinculoFamiliar, VinculoFamiliar.id_vinculo_familiar, id_vinculo)
    if not obj:
        raise HTTPException(status_code=404, detail="Vínculo familiar no encontrado")
    return obj


@vinculo_item_router.put("/{id_vinculo}", response_model=VinculoFamiliarRead)
async def update_vinculo(
    id_vinculo: uuid.UUID, data: VinculoFamiliarUpdate, db: AsyncSession = Depends(get_db)
):
    obj = await get_nna_child(db, VinculoFamiliar, VinculoFamiliar.id_vinculo_familiar, id_vinculo)
    if not obj:
        raise HTTPException(status_code=404, detail="Vínculo familiar no encontrado")
    return await update_child(db, obj, data.model_dump(exclude_unset=True))
