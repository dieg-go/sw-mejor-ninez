import json
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import E2P, NCFAS, PMF
from app.schemas.instrumentos import InstrumentoCreate, InstrumentoRead, InstrumentoUpdate
from app.services import create_nna_child, get_nna_child, list_nna_children, update_child

# ── E2P ──────────────────────────────────────────────────────────────────────

e2p_router = APIRouter(prefix="/api/nna/{id_nna}/e2p", tags=["E2P"])


@e2p_router.get("", response_model=list[InstrumentoRead])
async def list_e2p(id_nna: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await list_nna_children(db, E2P, id_nna)


@e2p_router.post("", response_model=InstrumentoRead, status_code=201)
async def create_e2p(id_nna: uuid.UUID, data: InstrumentoCreate, db: AsyncSession = Depends(get_db)):
    return await create_nna_child(db, E2P, id_nna, data.model_dump())


e2p_item_router = APIRouter(prefix="/api/e2p", tags=["E2P"])


@e2p_item_router.get("/{id_e2p}", response_model=InstrumentoRead)
async def get_e2p(id_e2p: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, E2P, E2P.id_instrumento, id_e2p)
    if not obj:
        raise HTTPException(status_code=404, detail="E2P no encontrado")
    return obj


@e2p_item_router.put("/{id_e2p}", response_model=InstrumentoRead)
async def update_e2p(id_e2p: uuid.UUID, data: InstrumentoUpdate, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, E2P, E2P.id_instrumento, id_e2p)
    if not obj:
        raise HTTPException(status_code=404, detail="E2P no encontrado")
    return await update_child(db, obj, data.model_dump(exclude_unset=True))


# ── PMF ──────────────────────────────────────────────────────────────────────

pmf_router = APIRouter(prefix="/api/nna/{id_nna}/pmf", tags=["PMF"])


@pmf_router.get("", response_model=list[InstrumentoRead])
async def list_pmf(id_nna: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await list_nna_children(db, PMF, id_nna)


@pmf_router.post("", response_model=InstrumentoRead, status_code=201)
async def create_pmf(id_nna: uuid.UUID, data: InstrumentoCreate, db: AsyncSession = Depends(get_db)):
    return await create_nna_child(db, PMF, id_nna, data.model_dump())


pmf_item_router = APIRouter(prefix="/api/pmf", tags=["PMF"])


@pmf_item_router.get("/{id_pmf}", response_model=InstrumentoRead)
async def get_pmf(id_pmf: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, PMF, PMF.id_instrumento, id_pmf)
    if not obj:
        raise HTTPException(status_code=404, detail="PMF no encontrado")
    return obj


@pmf_item_router.put("/{id_pmf}", response_model=InstrumentoRead)
async def update_pmf(id_pmf: uuid.UUID, data: InstrumentoUpdate, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, PMF, PMF.id_instrumento, id_pmf)
    if not obj:
        raise HTTPException(status_code=404, detail="PMF no encontrado")
    return await update_child(db, obj, data.model_dump(exclude_unset=True))


# ── NCFAS ────────────────────────────────────────────────────────────────────

ncfas_router = APIRouter(prefix="/api/nna/{id_nna}/ncfas", tags=["NCFAS"])


@ncfas_router.get("", response_model=list[InstrumentoRead])
async def list_ncfas(id_nna: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await list_nna_children(db, NCFAS, id_nna)


@ncfas_router.post("", response_model=InstrumentoRead, status_code=201)
async def create_ncfas(id_nna: uuid.UUID, data: InstrumentoCreate, db: AsyncSession = Depends(get_db)):
    return await create_nna_child(db, NCFAS, id_nna, data.model_dump())


ncfas_item_router = APIRouter(prefix="/api/ncfas", tags=["NCFAS"])


@ncfas_item_router.get("/{id_ncfas}", response_model=InstrumentoRead)
async def get_ncfas(id_ncfas: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, NCFAS, NCFAS.id_instrumento, id_ncfas)
    if not obj:
        raise HTTPException(status_code=404, detail="NCFAS no encontrado")
    return obj


@ncfas_item_router.put("/{id_ncfas}", response_model=InstrumentoRead)
async def update_ncfas(id_ncfas: uuid.UUID, data: InstrumentoUpdate, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, NCFAS, NCFAS.id_instrumento, id_ncfas)
    if not obj:
        raise HTTPException(status_code=404, detail="NCFAS no encontrado")
    return await update_child(db, obj, data.model_dump(exclude_unset=True))


# ── Instrumentos from Adulto side ────────────────────────────────────────────

e2p_adulto_router = APIRouter(prefix="/api/adultos/{id_adulto}/e2p", tags=["E2P"])


@e2p_adulto_router.get("", response_model=list[InstrumentoRead])
async def list_e2p_adulto(id_adulto: uuid.UUID, db: AsyncSession = Depends(get_db)):
    from app.services import list_adulto_children, create_adulto_child
    return await list_adulto_children(db, E2P, id_adulto)


@e2p_adulto_router.post("", response_model=InstrumentoRead, status_code=201)
async def create_e2p_adulto(id_adulto: uuid.UUID, data: InstrumentoCreate, db: AsyncSession = Depends(get_db)):
    from app.services import create_adulto_child
    return await create_adulto_child(db, E2P, id_adulto, data.model_dump())


pmf_adulto_router = APIRouter(prefix="/api/adultos/{id_adulto}/pmf", tags=["PMF"])


@pmf_adulto_router.get("", response_model=list[InstrumentoRead])
async def list_pmf_adulto(id_adulto: uuid.UUID, db: AsyncSession = Depends(get_db)):
    from app.services import list_adulto_children
    return await list_adulto_children(db, PMF, id_adulto)


@pmf_adulto_router.post("", response_model=InstrumentoRead, status_code=201)
async def create_pmf_adulto(id_adulto: uuid.UUID, data: InstrumentoCreate, db: AsyncSession = Depends(get_db)):
    from app.services import create_adulto_child
    return await create_adulto_child(db, PMF, id_adulto, data.model_dump())


ncfas_adulto_router = APIRouter(prefix="/api/adultos/{id_adulto}/ncfas", tags=["NCFAS"])


@ncfas_adulto_router.get("", response_model=list[InstrumentoRead])
async def list_ncfas_adulto(id_adulto: uuid.UUID, db: AsyncSession = Depends(get_db)):
    from app.services import list_adulto_children
    return await list_adulto_children(db, NCFAS, id_adulto)


@ncfas_adulto_router.post("", response_model=InstrumentoRead, status_code=201)
async def create_ncfas_adulto(id_adulto: uuid.UUID, data: InstrumentoCreate, db: AsyncSession = Depends(get_db)):
    from app.services import create_adulto_child
    return await create_adulto_child(db, NCFAS, id_adulto, data.model_dump())


# ── E2P Questions ────────────────────────────────────────────────────────────

_E2P_QUESTIONS_PATH = Path(__file__).resolve().parent.parent.parent.parent.parent / "shared" / "e2p_questions.json"

e2p_questions_router = APIRouter(prefix="/api/e2p/versions", tags=["E2P"])


@e2p_questions_router.get("/{version_num}")
async def get_e2p_questions(version_num: int):
    if version_num < 1 or version_num > 8:
        raise HTTPException(status_code=404, detail=f"Versión {version_num} no existe (1-8)")
    try:
        with open(_E2P_QUESTIONS_PATH, encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Archivo de preguntas E2P no encontrado")
    version_key = str(version_num)
    if version_key not in data.get("versiones", {}):
        raise HTTPException(status_code=404, detail=f"Versión {version_num} no encontrada")
    return {
        "escala": data.get("escala", {}),
        **data["versiones"][version_key],
    }
