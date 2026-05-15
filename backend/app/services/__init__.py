import uuid
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models import (
    NNA,
    AdultoSignificativo,
    AntecedenteEscolar,
    AntecedenteFamiliar,
    AntecedenteIngreso,
    AntecedenteSalud,
    AntecedentesPenales,
    DiscapacidadAdulto,
    DiscapacidadNNA,
    DocumentacionIngreso,
    E2P,
    EntornoFamiliar,
    GestionBusquedaFamiliar,
    HistorialConsumoAdulto,
    HistorialConsumoNNA,
    HistorialRedProteccional,
    InformeTribunal,
    NCFAS,
    PMF,
    RegistroCausalIngreso,
    RegistroDerechoVulnerado,
)


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


class AdultoService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list(self, skip: int = 0, limit: int = 100) -> list[AdultoSignificativo]:
        result = await self.session.execute(
            select(AdultoSignificativo).offset(skip).limit(limit)
        )
        return list(result.scalars().all())

    async def get(self, id_adulto: uuid.UUID) -> Optional[AdultoSignificativo]:
        result = await self.session.execute(
            select(AdultoSignificativo).where(
                AdultoSignificativo.id_adulto_significativo == id_adulto
            )
        )
        return result.scalar_one_or_none()

    async def create(self, data: dict[str, Any]) -> AdultoSignificativo:
        adulto = AdultoSignificativo(**data)
        self.session.add(adulto)
        await self.session.commit()
        await self.session.refresh(adulto)
        return adulto

    async def update(self, adulto: AdultoSignificativo, data: dict[str, Any]) -> AdultoSignificativo:
        for key, val in data.items():
            setattr(adulto, key, val)
        self.session.add(adulto)
        await self.session.commit()
        await self.session.refresh(adulto)
        return adulto


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


# ── Adulto children ──────────────────────────────────────────────────────────

async def list_adulto_children(
    session: AsyncSession, model: Any, id_adulto: uuid.UUID
) -> list[Any]:
    result = await session.execute(
        select(model).where(model.id_adulto_significativo == id_adulto)
    )
    return list(result.scalars().all())


async def create_adulto_child(
    session: AsyncSession, model: Any, id_adulto: uuid.UUID, data: dict[str, Any]
) -> Any:
    obj = model(id_adulto_significativo=id_adulto, **data)
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


# ── Familiar children (entorno) ──────────────────────────────────────────────

async def list_entorno(
    session: AsyncSession, id_antecedente_familiar: uuid.UUID
) -> list[EntornoFamiliar]:
    result = await session.execute(
        select(EntornoFamiliar).where(
            EntornoFamiliar.id_antecedente_familiar == id_antecedente_familiar
        )
    )
    return list(result.scalars().all())


async def create_entorno(
    session: AsyncSession, id_antecedente_familiar: uuid.UUID, data: dict[str, Any]
) -> EntornoFamiliar:
    obj = EntornoFamiliar(id_antecedente_familiar=id_antecedente_familiar, **data)
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj
