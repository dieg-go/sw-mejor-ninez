import json
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.e2p import E2P
from app.schemas.e2p import E2PCreate, E2PRead, E2PUpdate
from app.services import create_nna_child, get_nna_child, list_nna_children, update_child

# ── NNA routes ───────────────────────────────────────────────────────────────

e2p_router = APIRouter(prefix="/api/nna/{id_nna}/e2p", tags=["E2P"])


@e2p_router.get("", response_model=list[E2PRead])
async def list_e2p(id_nna: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await list_nna_children(db, E2P, id_nna)


@e2p_router.post("", response_model=E2PRead, status_code=201)
async def create_e2p(id_nna: uuid.UUID, data: E2PCreate, db: AsyncSession = Depends(get_db)):
    return await create_nna_child(db, E2P, id_nna, data.model_dump())


# ── Item routes ──────────────────────────────────────────────────────────────

e2p_item_router = APIRouter(prefix="/api/e2p", tags=["E2P"])


@e2p_item_router.get("/{id_e2p}", response_model=E2PRead)
async def get_e2p(id_e2p: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, E2P, E2P.id_instrumento, id_e2p)
    if not obj:
        raise HTTPException(status_code=404, detail="E2P no encontrado")
    return obj


@e2p_item_router.put("/{id_e2p}", response_model=E2PRead)
async def update_e2p(id_e2p: uuid.UUID, data: E2PUpdate, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, E2P, E2P.id_instrumento, id_e2p)
    if not obj:
        raise HTTPException(status_code=404, detail="E2P no encontrado")
    return await update_child(db, obj, data.model_dump(exclude_unset=True))


# ── Puntaje ──────────────────────────────────────────────────────────────────

_VERSION_TO_ESCALA = {
    1: "v_0_3_meses",
    2: "v_4_10_meses",
    3: "v_11_18_meses",
    4: "v_19_36_meses",
    5: "v_3_5_anos",
    6: "v_6_7_anos",
    7: "v_8_12_anos",
    8: "v_13_17_anos",
}

_E2P_ESCALA_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "e2p_escala.json"


@e2p_item_router.get("/{id_e2p}/puntaje")
async def get_e2p_puntaje(id_e2p: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, E2P, E2P.id_instrumento, id_e2p)
    if not obj:
        raise HTTPException(status_code=404, detail="E2P no encontrado")
    if not obj.respuestas:
        raise HTTPException(status_code=400, detail="E2P sin respuestas registradas")

    version_key = str(obj.version)
    escala_key = _VERSION_TO_ESCALA.get(obj.version)
    if not escala_key:
        raise HTTPException(status_code=400, detail=f"Versión {obj.version} sin baremos definidos")

    try:
        with open(_E2P_QUESTIONS_PATH, encoding="utf-8") as f:
            questions_data = json.load(f)
        with open(_E2P_ESCALA_PATH, encoding="utf-8") as f:
            escala_data = json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Archivo de datos E2P no encontrado")

    preguntas = questions_data["versiones"][version_key]["preguntas"]
    puntaje_map = questions_data["versiones"][version_key].get("puntaje") or {}
    baremos = escala_data["escalas_e2p"][escala_key]

    categorias: dict[str, dict] = {}
    for q in preguntas:
        cat = q["categoria"]
        if cat not in categorias:
            categorias[cat] = {"puntaje_bruto": 0, "puntaje_max": 0, "cantidad": 0}
        categorias[cat]["cantidad"] += 1
        categorias[cat]["puntaje_max"] += max(puntaje_map.values()) if puntaje_map else 4
        respuesta = obj.respuestas.get(str(q["id"]))
        if respuesta is not None:
            if puntaje_map:
                categorias[cat]["puntaje_bruto"] += puntaje_map.get(str(respuesta), 0)
            elif 0 <= respuesta <= 4:
                categorias[cat]["puntaje_bruto"] += respuesta

    def clasificar_baremo(categoria: str, puntaje_bruto: int) -> dict:
        cat_lower = categoria.lower()
        zonas = baremos.get(cat_lower, [])
        for zona in zonas:
            if zona["min"] <= puntaje_bruto <= zona["max"]:
                return zona
        return {"zona": "Sin clasificación", "min": 0, "max": 0}

    resultados = []
    for nombre, datos in categorias.items():
        zona = clasificar_baremo(nombre, datos["puntaje_bruto"])
        resultados.append({
            "categoria": nombre,
            "puntaje_bruto": datos["puntaje_bruto"],
            "puntaje_max": datos["puntaje_max"],
            "zona": zona["zona"],
            "rango_zona": f'{zona["min"]}-{zona["max"]}',
        })

    return {
        "version": obj.version,
        "edad": questions_data["versiones"][version_key]["edad"],
        "escala": questions_data.get("escala", {}),
        "categorias": resultados,
        "respuestas": obj.respuestas,
    }


# ── Adulto routes ────────────────────────────────────────────────────────────

e2p_adulto_router = APIRouter(prefix="/api/adultos/{id_adulto}/e2p", tags=["E2P"])


@e2p_adulto_router.get("", response_model=list[E2PRead])
async def list_e2p_adulto(id_adulto: uuid.UUID, db: AsyncSession = Depends(get_db)):
    from app.services import list_adulto_children
    return await list_adulto_children(db, E2P, id_adulto)


@e2p_adulto_router.post("", response_model=E2PRead, status_code=201)
async def create_e2p_adulto(id_adulto: uuid.UUID, data: E2PCreate, db: AsyncSession = Depends(get_db)):
    from app.services import create_adulto_child
    return await create_adulto_child(db, E2P, id_adulto, data.model_dump())


# ── Questions ────────────────────────────────────────────────────────────────

_E2P_QUESTIONS_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "e2p_questions.json"

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
