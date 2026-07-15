import calendar
import uuid
from datetime import date, timedelta
from typing import Any, Optional

from sqlalchemy import and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models import (
    NNA,
    Familiar,
    AntecedenteEscolar,
    AntecedenteFamiliar,
    AntecedenteIngreso,
    AntecedenteSalud,
    AntecedentesPenales,
    DiscapacidadAdulto,
    DiscapacidadNNA,
    DocumentacionIngreso,
    E2P,
    HistorialConsumoAdulto,
    HistorialConsumoNNA,
    HistorialRedProteccional,
    InformeTribunal,
    NCFAS,
    NotificacionFamiliar,
    PMF,
    ProcesoDespejeFamiliar,
    RegistroCausalIngreso,
    RegistroDerechoVulnerado,
    VinculoFamiliar,
    VinculoNNA,
)
from app.models.enums import EstadoInforme, TipoInforme


class FamiliarService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list(self, skip: int = 0, limit: int = 100) -> list[Familiar]:
        result = await self.session.execute(select(Familiar).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def get(self, id_familiar: uuid.UUID) -> Optional[Familiar]:
        result = await self.session.execute(
            select(Familiar).where(Familiar.id_familiar == id_familiar)
        )
        return result.scalar_one_or_none()

    async def create(self, data: dict[str, Any]) -> Familiar:
        familiar = Familiar(**data)
        self.session.add(familiar)
        await self.session.commit()
        await self.session.refresh(familiar)
        return familiar

    async def update(self, familiar: Familiar, data: dict[str, Any]) -> Familiar:
        for key, val in data.items():
            setattr(familiar, key, val)
        self.session.add(familiar)
        await self.session.commit()
        await self.session.refresh(familiar)
        return familiar


class NNAService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list(self, skip: int = 0, limit: int = 100) -> list[NNA]:
        result = await self.session.execute(select(NNA).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def get(self, id_nna: uuid.UUID) -> Optional[NNA]:
        result = await self.session.execute(select(NNA).where(NNA.id_nna == id_nna))
        return result.scalar_one_or_none()

    async def create(self, data: dict[str, Any]) -> NNA:
        nna = NNA(**data)
        self.session.add(nna)
        await self.session.commit()
        await self.session.refresh(nna)
        return nna

    async def update(self, nna: NNA, data: dict[str, Any]) -> NNA:
        for key, val in data.items():
            setattr(nna, key, val)
        self.session.add(nna)
        await self.session.commit()
        await self.session.refresh(nna)
        return nna


# ── NNA children ─────────────────────────────────────────────────────────────

async def list_nna_children(
    session: AsyncSession, model: Any, id_nna: uuid.UUID
) -> list[Any]:
    result = await session.execute(
        select(model).where(model.id_nna == id_nna)
    )
    return list(result.scalars().all())


async def create_nna_child(session: AsyncSession, model: Any, id_nna: uuid.UUID, data: dict[str, Any]) -> Any:
    obj = model(id_nna=id_nna, **data)
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj


async def get_nna_child(session: AsyncSession, model: Any, pk_col: Any, pk_val: uuid.UUID) -> Any:
    result = await session.execute(select(model).where(pk_col == pk_val))
    return result.scalar_one_or_none()


async def update_child(session: AsyncSession, obj: Any, data: dict[str, Any]) -> Any:
    for key, val in data.items():
        setattr(obj, key, val)
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj


# ── Familiar children ────────────────────────────────────────────────────────

async def list_familiar_children(
    session: AsyncSession, model: Any, id_familiar: uuid.UUID
) -> list[Any]:
    result = await session.execute(
        select(model).where(model.id_familiar == id_familiar)
    )
    return list(result.scalars().all())


async def create_familiar_child(
    session: AsyncSession, model: Any, id_familiar: uuid.UUID, data: dict[str, Any]
) -> Any:
    obj = model(id_familiar=id_familiar, **data)
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj


# ── Ingreso children (causales, derechos) ────────────────────────────────────

async def list_ingreso_children(
    session: AsyncSession, model: Any, id_antecedente: uuid.UUID
) -> list[Any]:
    result = await session.execute(
        select(model).where(model.id_antecedente_ingreso == id_antecedente)
    )
    return list(result.scalars().all())


async def create_ingreso_child(
    session: AsyncSession, model: Any, id_antecedente: uuid.UUID, data: dict[str, Any]
) -> Any:
    obj = model(id_antecedente_ingreso=id_antecedente, **data)
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj


# ── Familiar children (vinculo) ──────────────────────────────────────────────

async def list_vinculo(
    session: AsyncSession, id_nna: uuid.UUID
) -> list[VinculoFamiliar]:
    result = await session.execute(
        select(VinculoFamiliar).where(
            VinculoFamiliar.id_nna == id_nna
        )
    )
    return list(result.scalars().all())


async def create_vinculo(
    session: AsyncSession, id_nna: uuid.UUID, data: dict[str, Any]
) -> VinculoFamiliar:
    obj = VinculoFamiliar(id_nna=id_nna, **data)
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj


# ── VinculoNNA helpers ───────────────────────────────────────────────────────

async def list_vinculo_nna(
    session: AsyncSession, id_nna: uuid.UUID
) -> list[VinculoNNA]:
    result = await session.execute(
        select(VinculoNNA).where(
            (VinculoNNA.id_nna_1 == id_nna) | (VinculoNNA.id_nna_2 == id_nna)
        )
    )
    return list(result.scalars().all())


async def create_vinculo_nna(
    session: AsyncSession, id_nna: uuid.UUID, data: dict[str, Any]
) -> VinculoNNA:
    target_id = data.pop("id_nna_2")
    if id_nna < target_id:
        obj = VinculoNNA(id_nna_1=id_nna, id_nna_2=target_id, **data)
    else:
        obj = VinculoNNA(id_nna_1=target_id, id_nna_2=id_nna, **data)
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj


def _add_months(d: date, months: int) -> date:
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return d.replace(year=year, month=month, day=day)


async def get_latest_fecha_ingreso(
    session: AsyncSession, id_nna: uuid.UUID
) -> Optional[date]:
    result = await session.execute(
        select(AntecedenteIngreso.fecha_ingreso_residencia)
        .where(
            AntecedenteIngreso.id_nna == id_nna,
            AntecedenteIngreso.fecha_ingreso_residencia.isnot(None),
        )
        .order_by(AntecedenteIngreso.fecha_ingreso_residencia.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def create_diagnostico_informe(
    session: AsyncSession, id_nna: uuid.UUID, fecha_ingreso: date
) -> Optional[InformeTribunal]:
    exists = await session.execute(
        select(InformeTribunal).where(
            InformeTribunal.id_nna == id_nna,
            InformeTribunal.tipo_informe == TipoInforme.DIAGNOSTICO,
            InformeTribunal.estado == EstadoInforme.PENDIENTE,
        )
    )
    if exists.scalar_one_or_none():
        return None

    obj = InformeTribunal(
        id_nna=id_nna,
        tipo_informe=TipoInforme.DIAGNOSTICO,
        fecha_vencimiento=fecha_ingreso + timedelta(days=30),
        estado=EstadoInforme.PENDIENTE,
    )
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj


async def chain_next_informe(
    session: AsyncSession, id_nna: uuid.UUID, current: InformeTribunal
) -> Optional[InformeTribunal]:
    if current.tipo_informe == TipoInforme.DIAGNOSTICO:
        fecha_ingreso = await get_latest_fecha_ingreso(session, id_nna)
        if not fecha_ingreso:
            return None
        next_vencimiento = fecha_ingreso + timedelta(days=90)
    elif current.tipo_informe == TipoInforme.AVANCE:
        if not current.fecha_vencimiento:
            return None
        next_vencimiento = _add_months(current.fecha_vencimiento, 3)
    else:
        return None

    obj = InformeTribunal(
        id_nna=id_nna,
        tipo_informe=TipoInforme.AVANCE,
        fecha_vencimiento=next_vencimiento,
        estado=EstadoInforme.PENDIENTE,
    )
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj
