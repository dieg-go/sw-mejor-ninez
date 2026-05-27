import uuid
from typing import Any, Optional

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
    GestionBusquedaFamiliar,
    HistorialConsumoAdulto,
    HistorialConsumoNNA,
    HistorialRedProteccional,
    InformeTribunal,
    NCFAS,
    PMF,
    RegistroCausalIngreso,
    RegistroDerechoVulnerado,
    VinculoFamiliar,
)


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
    session: AsyncSession, id_antecedente_familiar: uuid.UUID
) -> list[VinculoFamiliar]:
    result = await session.execute(
        select(VinculoFamiliar).where(
            VinculoFamiliar.id_antecedente_familiar == id_antecedente_familiar
        )
    )
    return list(result.scalars().all())


async def create_vinculo(
    session: AsyncSession, id_antecedente_familiar: uuid.UUID, data: dict[str, Any]
) -> VinculoFamiliar:
    obj = VinculoFamiliar(id_antecedente_familiar=id_antecedente_familiar, **data)
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj
