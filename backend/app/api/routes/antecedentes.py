import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import AntecedenteEscolar, AntecedenteFamiliar, AntecedenteSalud, EntornoFamiliar
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
    EntornoFamiliarCreate,
    EntornoFamiliarRead,
    EntornoFamiliarUpdate,
)
from app.services import (
    create_entorno,
    create_nna_child,
    get_nna_child,
    list_entorno,
    list_nna_children,
    update_child,
)

# ── Antecedente Salud ────────────────────────────────────────────────────────

salud_router = APIRouter(prefix="/api/nna/{id_nna}/antecedentes-salud", tags=["AntecedenteSalud"])


@salud_router.get("", response_model=list[AntecedenteSaludRead])
async def list_salud(id_nna: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await list_nna_children(db, AntecedenteSalud, id_nna)


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
async def list_escolar(id_nna: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await list_nna_children(db, AntecedenteEscolar, id_nna)


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
async def list_familiar(id_nna: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await list_nna_children(db, AntecedenteFamiliar, id_nna)


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


# ── Entorno Familiar (child of AntecedenteFamiliar) ──────────────────────────

entorno_router = APIRouter(
    prefix="/api/antecedente-familiar/{id_familiar}/entorno", tags=["EntornoFamiliar"]
)


@entorno_router.get("", response_model=list[EntornoFamiliarRead])
async def list_entorno_familiar(id_familiar: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await list_entorno(db, id_familiar)


@entorno_router.post("", response_model=EntornoFamiliarRead, status_code=201)
async def create_entorno_familiar(
    id_familiar: uuid.UUID, data: EntornoFamiliarCreate, db: AsyncSession = Depends(get_db)
):
    return await create_entorno(db, id_familiar, data.model_dump())


entorno_item_router = APIRouter(prefix="/api/entorno-familiar", tags=["EntornoFamiliar"])


@entorno_item_router.get("/{id_entorno}", response_model=EntornoFamiliarRead)
async def get_entorno(id_entorno: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, EntornoFamiliar, EntornoFamiliar.id_entorno_familiar, id_entorno)
    if not obj:
        raise HTTPException(status_code=404, detail="Entorno familiar no encontrado")
    return obj


@entorno_item_router.put("/{id_entorno}", response_model=EntornoFamiliarRead)
async def update_entorno(
    id_entorno: uuid.UUID, data: EntornoFamiliarUpdate, db: AsyncSession = Depends(get_db)
):
    obj = await get_nna_child(db, EntornoFamiliar, EntornoFamiliar.id_entorno_familiar, id_entorno)
    if not obj:
        raise HTTPException(status_code=404, detail="Entorno familiar no encontrado")
    return await update_child(db, obj, data.model_dump(exclude_unset=True))
