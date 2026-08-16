import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_db
from app.models.e2p import E2P, BaremoE2P, PreguntaE2P, RespuestaE2P, PuntajeE2P
from app.schemas.e2p import (
    E2PCreate,
    E2PRead,
    E2PUpdate,
    BaremoE2PRead,
    PreguntaE2PRead,
    PuntajeE2PRead,
)
from app.services import (
    create_nna_child,
    get_nna_child,
    list_familiar_children,
    list_nna_children,
    update_child,
)

RANGOS_VALIDOS = {
    "0-3_meses", "4-10_meses", "11-18_meses", "19-36_meses",
    "3-5_anos", "6-7_anos", "8-12_anos", "13-17_anos",
}

RANGO_ETARIO_LABELS = {
    "0-3_meses": "0 a 3 meses",
    "4-10_meses": "4 a 10 meses",
    "11-18_meses": "11 a 18 meses",
    "19-36_meses": "19 a 36 meses",
    "3-5_anos": "3 a 5 años",
    "6-7_anos": "6 a 7 años",
    "8-12_anos": "8 a 12 años",
    "13-17_anos": "13 a 17 años",
}

ESCALA_LIKERT = {
    "0": "Nunca",
    "1": "Casi Nunca",
    "2": "A veces",
    "3": "Casi Siempre",
    "4": "Siempre",
}

RANGO_ESPECIAL_E2P = "0-3_meses"


async def _sync_respuestas(
    db: AsyncSession,
    id_e2p: uuid.UUID,
    rango_etario: str,
    respuestas: dict[str, int],
):
    existing = (
        await db.execute(
            select(RespuestaE2P).where(RespuestaE2P.id_e2p == id_e2p)
        )
    ).scalars().all()
    for r in existing:
        await db.delete(r)

    if not respuestas:
        return

    preguntas = (
        await db.execute(
            select(PreguntaE2P).where(
                PreguntaE2P.rango_etario == rango_etario,
                PreguntaE2P.numero_item.in_([int(k) for k in respuestas.keys()]),
            )
        )
    ).scalars().all()
    pregunta_by_num = {p.numero_item: p for p in preguntas}

    es_version_0_3 = (rango_etario == RANGO_ESPECIAL_E2P)

    for key, val in respuestas.items():
        num = int(key)
        pregunta = pregunta_by_num.get(num)
        if pregunta is None:
            continue

        if es_version_0_3:
            if val in (0, 1, 2):
                puntaje = 2
            elif val == 3:
                puntaje = 3
            elif val == 4:
                puntaje = 4
            else:
                puntaje = val
        else:
            puntaje = val

        db.add(
            RespuestaE2P(
                id_e2p=id_e2p,
                id_pregunta_e2p=pregunta.id_pregunta_e2p,
                valor_seleccionado=val,
                puntaje_calculado=puntaje,
            )
        )
    await db.commit()


async def _build_respuestas_dict(
    db: AsyncSession, id_e2p: uuid.UUID
) -> dict[str, int] | None:
    rows = (
        await db.execute(
            select(RespuestaE2P, PreguntaE2P)
            .join(PreguntaE2P, RespuestaE2P.id_pregunta_e2p == PreguntaE2P.id_pregunta_e2p)
            .where(RespuestaE2P.id_e2p == id_e2p)
        )
    ).all()

    if not rows:
        return None

    result: dict[str, int] = {}
    for resp, preg in rows:
        result[str(preg.numero_item)] = resp.valor_seleccionado
    return result


def _determinar_resultado(puntajes: list[dict]) -> str | None:
    bajas = sum(1 for p in puntajes if p["zona"] == "Baja frecuencia")
    inter = sum(1 for p in puntajes if p["zona"] == "Frecuencia intermedia")
    altas = sum(1 for p in puntajes if p["zona"] == "Alta frecuencia")
    vinc_baja = any(
        p["dimension"] == "Vinculares" and p["zona"] == "Baja frecuencia"
        for p in puntajes
    )

    if bajas >= 2 or vinc_baja:
        return "Riesgo"
    if (bajas == 1 and not vinc_baja) or (bajas == 0 and inter >= 2):
        return "Monitoreo"
    if bajas == 0 and altas >= 3:
        return "Optimo"
    return None


async def _calcular_puntajes(
    db: AsyncSession,
    id_e2p: uuid.UUID,
    rango_etario: str,
):
    existing = (
        await db.execute(
            select(PuntajeE2P).where(PuntajeE2P.id_e2p == id_e2p)
        )
    ).scalars().all()
    for p in existing:
        await db.delete(p)

    baremos_db = (
        await db.execute(
            select(BaremoE2P).where(
                BaremoE2P.rango_etario == rango_etario,
                BaremoE2P.dimension != "Total",
            )
        )
    ).scalars().all()

    baremo_by_dim: dict[str, list[BaremoE2P]] = {}
    for b in baremos_db:
        baremo_by_dim.setdefault(b.dimension, []).append(b)

    for dim_list in baremo_by_dim.values():
        dim_list.sort(key=lambda b: (b.puntaje_min, b.puntaje_max))

    rows = (
        await db.execute(
            select(RespuestaE2P.puntaje_calculado, PreguntaE2P.dimension)
            .join(PreguntaE2P, RespuestaE2P.id_pregunta_e2p == PreguntaE2P.id_pregunta_e2p)
            .where(RespuestaE2P.id_e2p == id_e2p)
        )
    ).all()

    if not rows:
        e2p_empty = (
            await db.execute(
                select(E2P).where(E2P.id_e2p == id_e2p)
            )
        ).scalar_one_or_none()
        if e2p_empty and e2p_empty.perfil_resultado_global is not None:
            e2p_empty.perfil_resultado_global = None
            db.add(e2p_empty)
        await db.commit()
        return

    dimensiones: dict[str, dict] = {}
    for row in rows:
        puntaje, dim = row
        if dim not in dimensiones:
            dimensiones[dim] = {"puntaje_bruto": 0}
        dimensiones[dim]["puntaje_bruto"] += puntaje

    def clasificar_baremo(dim: str, puntaje_bruto: int) -> tuple[int | None, str | None]:
        baremos = baremo_by_dim.get(dim, [])
        for b in baremos:
            if b.puntaje_min <= puntaje_bruto <= b.puntaje_max:
                return b.decil, b.zona
        return None, None

    puntajes_data = []
    for dim, datos in dimensiones.items():
        decil_val, zona_val = clasificar_baremo(dim, datos["puntaje_bruto"])
        db.add(
            PuntajeE2P(
                id_e2p=id_e2p,
                dimension=dim,
                puntaje_bruto=datos["puntaje_bruto"],
                decil=decil_val,
                zona=zona_val,
            )
        )
        puntajes_data.append({"dimension": dim, "zona": zona_val or ""})

    resultado = _determinar_resultado(puntajes_data)
    if resultado is not None:
        e2p = (
            await db.execute(
                select(E2P).where(E2P.id_e2p == id_e2p)
            )
        ).scalar_one_or_none()
        if e2p:
            e2p.perfil_resultado_global = resultado
            db.add(e2p)

    await db.commit()


# ── NNA routes ───────────────────────────────────────────────────────────────

e2p_router = APIRouter(prefix="/api/nna/{id_nna}/e2p", tags=["E2P"])


@e2p_router.get("", response_model=list[E2PRead])
async def list_e2p(
    id_nna: uuid.UUID,
    id_caso: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
):
    items = await list_nna_children(db, E2P, id_nna, id_caso)
    result = []
    for e in items:
        r = E2PRead.model_validate(e)
        r.respuestas = await _build_respuestas_dict(db, e.id_e2p)
        result.append(r)
    return result


@e2p_router.post("", response_model=E2PRead, status_code=201)
async def create_e2p(
    id_nna: uuid.UUID, data: E2PCreate, db: AsyncSession = Depends(get_db)
):
    respuestas = data.respuestas
    payload = data.model_dump(exclude={"respuestas"})
    obj = await create_nna_child(db, E2P, id_nna, payload)
    if respuestas and data.rango_etario:
        await _sync_respuestas(db, obj.id_e2p, data.rango_etario, respuestas)
        await _calcular_puntajes(db, obj.id_e2p, data.rango_etario)
    result = E2PRead.model_validate(obj)
    result.respuestas = await _build_respuestas_dict(db, obj.id_e2p)
    return result


# ── Item routes ──────────────────────────────────────────────────────────────

e2p_item_router = APIRouter(prefix="/api/e2p", tags=["E2P"])


@e2p_item_router.get("/{id_e2p}", response_model=E2PRead)
async def get_e2p(id_e2p: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, E2P, E2P.id_e2p, id_e2p)
    if not obj:
        raise HTTPException(status_code=404, detail="E2P no encontrado")
    result = E2PRead.model_validate(obj)
    result.respuestas = await _build_respuestas_dict(db, id_e2p)
    return result


@e2p_item_router.put("/{id_e2p}", response_model=E2PRead)
async def update_e2p(
    id_e2p: uuid.UUID, data: E2PUpdate, db: AsyncSession = Depends(get_db)
):
    obj = await get_nna_child(db, E2P, E2P.id_e2p, id_e2p)
    if not obj:
        raise HTTPException(status_code=404, detail="E2P no encontrado")

    respuestas = data.respuestas
    payload = data.model_dump(exclude_unset=True, exclude={"respuestas"})
    updated = await update_child(db, obj, payload)

    if respuestas is not None:
        rango_etario = updated.rango_etario or data.rango_etario
        if rango_etario:
            await _sync_respuestas(db, id_e2p, rango_etario, respuestas)
            await _calcular_puntajes(db, id_e2p, rango_etario)

    await db.refresh(updated)
    result = E2PRead.model_validate(updated)
    result.respuestas = await _build_respuestas_dict(db, id_e2p)
    return result


# ── Puntaje ──────────────────────────────────────────────────────────────────


@e2p_item_router.get("/{id_e2p}/puntaje")
async def get_e2p_puntaje(id_e2p: uuid.UUID, db: AsyncSession = Depends(get_db)):
    obj = await get_nna_child(db, E2P, E2P.id_e2p, id_e2p)
    if not obj:
        raise HTTPException(status_code=404, detail="E2P no encontrado")

    puntajes_db = (
        await db.execute(
            select(PuntajeE2P).where(PuntajeE2P.id_e2p == id_e2p)
        )
    ).scalars().all()

    respuestas_dict = await _build_respuestas_dict(db, id_e2p)

    if not puntajes_db:
        raise HTTPException(status_code=400, detail="E2P sin puntajes registrados")

    count_rows = (
        await db.execute(
            select(PreguntaE2P.dimension, func.count())
            .where(PreguntaE2P.rango_etario == obj.rango_etario)
            .group_by(PreguntaE2P.dimension)
        )
    ).all()

    max_por_dimension: dict[str, int] = {}
    for dim, cnt in count_rows:
        max_por_dimension[dim] = cnt * 4

    categorias = [
        {
            "dimension": p.dimension,
            "puntaje_bruto": p.puntaje_bruto,
            "puntaje_max": max_por_dimension.get(p.dimension, 0),
            "decil": p.decil,
            "zona": p.zona,
        }
        for p in puntajes_db
    ]

    return {
        "rango_etario": obj.rango_etario,
        "edad": RANGO_ETARIO_LABELS.get(obj.rango_etario, ""),
        "escala": ESCALA_LIKERT,
        "categorias": categorias,
        "respuestas": respuestas_dict or {},
    }


# ── Familiar routes ──────────────────────────────────────────────────────────

e2p_familiar_router = APIRouter(
    prefix="/api/familiares/{id_familiar}/e2p", tags=["E2P"]
)


@e2p_familiar_router.get("", response_model=list[E2PRead])
async def list_e2p_familiar(
    id_familiar: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    items = await list_familiar_children(db, E2P, id_familiar)
    result = []
    for e in items:
        r = E2PRead.model_validate(e)
        r.respuestas = await _build_respuestas_dict(db, e.id_e2p)
        result.append(r)
    return result


# ── Questions ────────────────────────────────────────────────────────────────

e2p_questions_router = APIRouter(prefix="/api/e2p/versions", tags=["E2P"])


@e2p_questions_router.get("/{rango_etario}")
async def get_e2p_questions(rango_etario: str, db: AsyncSession = Depends(get_db)):
    if rango_etario not in RANGOS_VALIDOS:
        raise HTTPException(
            status_code=404, detail=f"Rango etario '{rango_etario}' no existe"
        )

    preguntas_db = (
        await db.execute(
            select(PreguntaE2P)
            .where(PreguntaE2P.rango_etario == rango_etario)
            .order_by(PreguntaE2P.numero_item)
        )
    ).scalars().all()

    if not preguntas_db:
        raise HTTPException(
            status_code=404,
            detail=f"Sin preguntas para rango etario '{rango_etario}'",
        )

    return {
        "escala": ESCALA_LIKERT,
        "edad": RANGO_ETARIO_LABELS.get(rango_etario, ""),
        "preguntas": [
            {
                "id": p.numero_item,
                "texto": p.texto_afirmacion,
                "dimension": p.dimension,
                "subdimension": p.subdimension,
            }
            for p in preguntas_db
        ],
    }
