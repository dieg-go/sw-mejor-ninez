"""Pruebas unitarias de los helpers de ``app/services``.

Fijan el comportamiento de los puntos que no se pueden observar bien desde el
HTTP: el calendario de informes, el auto-sellado de ``id_caso`` y la guarda de
caso cerrado.
"""

from __future__ import annotations

import uuid
from datetime import date, timedelta
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models import (
    AntecedenteIngreso,
    AntecedentesPenales,
    Caso,
    DocumentacionIngreso,
    Familiar,
    HistorialConsumoNNA,
    InformeTribunal,
    NNA,
    RegistroCausalIngreso,
    SolicitanteIngreso,
    VinculoFamiliar,
    VinculoNNA,
)
from app.models.enums import EstadoInforme, TipoInforme
from app.services import (
    FamiliarService,
    NNAService,
    _add_months,
    _assert_caso_abierto,
    chain_next_informe,
    create_diagnostico_informe,
    create_familiar_child,
    create_ingreso_child,
    create_nna_child,
    create_vinculo,
    create_vinculo_nna,
    get_active_caso,
    get_latest_fecha_ingreso,
    get_nna_child,
    list_familiar_children,
    list_ingreso_children,
    list_nna_children,
    list_vinculo,
    list_vinculo_nna,
)
from app.services import update_child


async def _nna_con_caso(
    db_session: AsyncSession, *, estado: str = "En Progreso"
) -> tuple[NNA, Caso]:
    nna = NNA(nombre=f"NNA {uuid.uuid4().hex[:8]}", run=f"RUN-{uuid.uuid4().hex[:10]}")
    db_session.add(nna)
    await db_session.flush()
    caso = Caso(id_nna=nna.id_nna, estado=estado)
    db_session.add(caso)
    await db_session.commit()
    return nna, caso


async def _solicitante(db_session: AsyncSession) -> SolicitanteIngreso:
    return (await db_session.execute(select(SolicitanteIngreso).limit(1))).scalar_one()


# ── _add_months ──────────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    ("entrada", "meses", "esperado"),
    [
        (date(2024, 1, 15), 0, date(2024, 1, 15)),
        (date(2024, 1, 15), 1, date(2024, 2, 15)),
        (date(2024, 1, 15), 3, date(2024, 4, 15)),
        (date(2024, 11, 15), 3, date(2025, 2, 15)),
        (date(2024, 12, 31), 3, date(2025, 3, 31)),
        (date(2024, 1, 31), 1, date(2024, 2, 29)),
        (date(2023, 1, 31), 1, date(2023, 2, 28)),
        (date(2024, 3, 31), 1, date(2024, 4, 30)),
        (date(2024, 8, 31), 1, date(2024, 9, 30)),
        (date(2024, 5, 31), 1, date(2024, 6, 30)),
        (date(2024, 1, 31), 12, date(2025, 1, 31)),
        (date(2024, 2, 29), 12, date(2025, 2, 28)),
        (date(2024, 3, 31), -1, date(2024, 2, 29)),
        (date(2024, 1, 1), -13, date(2022, 12, 1)),
    ],
)
def test_add_months(entrada: date, meses: int, esperado: date):
    assert _add_months(entrada, meses) == esperado


# ── Caso activo y auto-sellado ───────────────────────────────────────────────


async def test_get_active_caso_devuelve_el_caso_en_progreso(db_session: AsyncSession):
    nna, caso = await _nna_con_caso(db_session)
    activo = await get_active_caso(db_session, nna.id_nna)
    assert activo is not None
    assert activo.id_caso == caso.id_caso


async def test_get_active_caso_es_none_si_todo_esta_cerrado(db_session: AsyncSession):
    nna, _ = await _nna_con_caso(db_session, estado="Cerrado")
    assert await get_active_caso(db_session, nna.id_nna) is None


async def test_get_active_caso_es_none_para_un_nna_inexistente(db_session: AsyncSession):
    assert await get_active_caso(db_session, uuid.uuid4()) is None


async def test_create_nna_child_sella_el_caso_activo(db_session: AsyncSession):
    nna, caso = await _nna_con_caso(db_session)

    creado = await create_nna_child(
        db_session, DocumentacionIngreso, nna.id_nna, {"tipo_documento": "Certificado"}
    )
    assert creado.id_caso == caso.id_caso
    assert creado.id_nna == nna.id_nna


async def test_create_nna_child_crea_un_caso_si_no_hay_activo(db_session: AsyncSession):
    nna, _ = await _nna_con_caso(db_session, estado="Cerrado")

    creado = await create_nna_child(
        db_session, DocumentacionIngreso, nna.id_nna, {"tipo_documento": "Certificado"}
    )

    casos = (
        await db_session.execute(select(Caso).where(Caso.id_nna == nna.id_nna))
    ).scalars().all()
    assert len(casos) == 2
    assert creado.id_caso == next(c.id_caso for c in casos if c.estado == "En Progreso")


async def test_create_nna_child_respeta_un_id_caso_explicito(db_session: AsyncSession):
    nna, caso = await _nna_con_caso(db_session)

    creado = await create_nna_child(
        db_session,
        DocumentacionIngreso,
        nna.id_nna,
        {"id_caso": caso.id_caso, "tipo_documento": "Otro"},
    )
    assert creado.id_caso == caso.id_caso


async def test_create_nna_child_ignora_el_id_caso_si_el_modelo_no_lo_tiene(
    db_session: AsyncSession,
):
    """``HistorialConsumoNNA`` no esta agrupado: no debe recibir ``id_caso``."""
    nna, _ = await _nna_con_caso(db_session)
    creado = await create_nna_child(
        db_session, HistorialConsumoNNA, nna.id_nna, {"nombre_sustancia": "Alcohol"}
    )
    assert not hasattr(creado, "id_caso")


# ── Filtrado por caso ────────────────────────────────────────────────────────


async def test_list_nna_children_sin_filtro_devuelve_todos_los_casos(
    db_session: AsyncSession,
):
    nna, caso_activo = await _nna_con_caso(db_session)
    cerrado = Caso(id_nna=nna.id_nna, estado="Cerrado")
    db_session.add(cerrado)
    await db_session.commit()

    db_session.add(
        DocumentacionIngreso(id_nna=nna.id_nna, id_caso=caso_activo.id_caso, tipo_documento="A")
    )
    db_session.add(
        DocumentacionIngreso(id_nna=nna.id_nna, id_caso=cerrado.id_caso, tipo_documento="B")
    )
    await db_session.commit()

    todos = await list_nna_children(db_session, DocumentacionIngreso, nna.id_nna)
    assert {d.tipo_documento for d in todos} == {"A", "B"}


async def test_list_nna_children_filtra_por_caso(db_session: AsyncSession):
    nna, caso_activo = await _nna_con_caso(db_session)
    cerrado = Caso(id_nna=nna.id_nna, estado="Cerrado")
    db_session.add(cerrado)
    await db_session.commit()

    db_session.add(
        DocumentacionIngreso(id_nna=nna.id_nna, id_caso=caso_activo.id_caso, tipo_documento="A")
    )
    db_session.add(
        DocumentacionIngreso(id_nna=nna.id_nna, id_caso=cerrado.id_caso, tipo_documento="B")
    )
    await db_session.commit()

    solo_cerrado = await list_nna_children(
        db_session, DocumentacionIngreso, nna.id_nna, cerrado.id_caso
    )
    assert [d.tipo_documento for d in solo_cerrado] == ["B"]


async def test_el_filtro_por_caso_se_ignora_en_modelos_sin_id_caso(
    db_session: AsyncSession,
):
    nna, _ = await _nna_con_caso(db_session)
    await create_nna_child(
        db_session, HistorialConsumoNNA, nna.id_nna, {"nombre_sustancia": "Alcohol"}
    )

    resultado = await list_nna_children(
        db_session, HistorialConsumoNNA, nna.id_nna, uuid.uuid4()
    )
    assert len(resultado) == 1


# ── Guarda de caso cerrado ───────────────────────────────────────────────────


async def test_assert_caso_abierto_no_hace_nada_si_el_objeto_no_tiene_caso(
    db_session: AsyncSession,
):
    await _assert_caso_abierto(db_session, SimpleNamespace())  # no debe lanzar


async def test_assert_caso_abierto_permite_el_caso_en_progreso(db_session: AsyncSession):
    nna, caso = await _nna_con_caso(db_session)
    await _assert_caso_abierto(db_session, SimpleNamespace(id_caso=caso.id_caso))


async def test_assert_caso_abierto_bloquea_el_caso_cerrado(db_session: AsyncSession):
    nna, caso = await _nna_con_caso(db_session, estado="Cerrado")
    with pytest.raises(HTTPException) as exc:
        await _assert_caso_abierto(db_session, SimpleNamespace(id_caso=caso.id_caso))
    assert exc.value.status_code == 409


async def test_update_child_bloquea_la_escritura_en_caso_cerrado(db_session: AsyncSession):
    nna, caso = await _nna_con_caso(db_session, estado="Cerrado")
    registro = DocumentacionIngreso(
        id_nna=nna.id_nna, id_caso=caso.id_caso, tipo_documento="Certificado"
    )
    db_session.add(registro)
    await db_session.commit()

    with pytest.raises(HTTPException) as exc:
        await update_child(db_session, registro, {"tipo_documento": "Otro"})
    assert exc.value.status_code == 409


async def test_update_child_escribe_cuando_el_caso_esta_abierto(db_session: AsyncSession):
    nna, caso = await _nna_con_caso(db_session)
    registro = DocumentacionIngreso(
        id_nna=nna.id_nna, id_caso=caso.id_caso, tipo_documento="Certificado"
    )
    db_session.add(registro)
    await db_session.commit()

    actualizado = await update_child(db_session, registro, {"tipo_documento": "Otro"})
    assert actualizado.tipo_documento == "Otro"


# ── Informes: diagnostico y encadenamiento ───────────────────────────────────


async def test_create_diagnostico_informe_crea_el_informe_a_30_dias(
    db_session: AsyncSession,
):
    nna, caso = await _nna_con_caso(db_session)
    ingreso = date(2024, 3, 10)

    informe = await create_diagnostico_informe(db_session, nna.id_nna, ingreso, caso.id_caso)

    assert informe is not None
    assert informe.tipo_informe == TipoInforme.DIAGNOSTICO
    assert informe.estado == EstadoInforme.PENDIENTE
    assert informe.fecha_vencimiento == ingreso + timedelta(days=30)
    assert informe.id_caso == caso.id_caso


async def test_create_diagnostico_informe_es_idempotente(db_session: AsyncSession):
    nna, caso = await _nna_con_caso(db_session)
    ingreso = date(2024, 3, 10)

    primero = await create_diagnostico_informe(db_session, nna.id_nna, ingreso, caso.id_caso)
    segundo = await create_diagnostico_informe(db_session, nna.id_nna, ingreso, caso.id_caso)

    assert primero is not None
    assert segundo is None
    total = (await db_session.execute(select(InformeTribunal))).scalars().all()
    assert len(total) == 1


async def test_create_diagnostico_informe_no_choca_con_otro_caso(db_session: AsyncSession):
    nna, caso_activo = await _nna_con_caso(db_session)
    cerrado = Caso(id_nna=nna.id_nna, estado="Cerrado")
    db_session.add(cerrado)
    await db_session.commit()

    primero = await create_diagnostico_informe(
        db_session, nna.id_nna, date(2024, 1, 1), caso_activo.id_caso
    )
    segundo = await create_diagnostico_informe(
        db_session, nna.id_nna, date(2023, 1, 1), cerrado.id_caso
    )
    assert primero is not None and segundo is not None


async def test_create_diagnostico_informe_ignora_los_ya_enviados(db_session: AsyncSession):
    nna, caso = await _nna_con_caso(db_session)
    db_session.add(
        InformeTribunal(
            id_nna=nna.id_nna,
            id_caso=caso.id_caso,
            tipo_informe=TipoInforme.DIAGNOSTICO,
            estado=EstadoInforme.ENVIADO,
            fecha_vencimiento=date(2024, 1, 1),
        )
    )
    await db_session.commit()

    # Ya enviado no bloquea: solo bloquea el pendiente.
    creado = await create_diagnostico_informe(
        db_session, nna.id_nna, date(2024, 3, 10), caso.id_caso
    )
    assert creado is not None


async def test_chain_next_informe_desde_diagnostico_usa_el_ingreso_mas_90_dias(
    db_session: AsyncSession,
):
    nna, caso = await _nna_con_caso(db_session)
    solicitante = await _solicitante(db_session)
    fecha_ingreso = date(2024, 2, 1)
    db_session.add(
        AntecedenteIngreso(
            id_nna=nna.id_nna,
            id_caso=caso.id_caso,
            id_solicitante_ingreso=solicitante.id_solicitante_ingreso,
            fecha_ingreso_residencia=fecha_ingreso,
        )
    )
    diagnostico = InformeTribunal(
        id_nna=nna.id_nna,
        id_caso=caso.id_caso,
        tipo_informe=TipoInforme.DIAGNOSTICO,
        estado=EstadoInforme.ENVIADO,
        fecha_vencimiento=date(2024, 3, 1),
    )
    db_session.add(diagnostico)
    await db_session.commit()

    siguiente = await chain_next_informe(db_session, nna.id_nna, diagnostico)

    assert siguiente is not None
    assert siguiente.tipo_informe == TipoInforme.AVANCE
    assert siguiente.estado == EstadoInforme.PENDIENTE
    assert siguiente.fecha_vencimiento == fecha_ingreso + timedelta(days=90)
    assert siguiente.id_caso == caso.id_caso


async def test_chain_next_informe_desde_diagnostico_sin_ingreso_no_encadena(
    db_session: AsyncSession,
):
    nna, caso = await _nna_con_caso(db_session)
    diagnostico = InformeTribunal(
        id_nna=nna.id_nna,
        id_caso=caso.id_caso,
        tipo_informe=TipoInforme.DIAGNOSTICO,
        fecha_vencimiento=date(2024, 3, 1),
    )
    db_session.add(diagnostico)
    await db_session.commit()

    assert await chain_next_informe(db_session, nna.id_nna, diagnostico) is None


async def test_chain_next_informe_desde_avance_suma_tres_meses(
    db_session: AsyncSession,
):
    nna, caso = await _nna_con_caso(db_session)
    avance = InformeTribunal(
        id_nna=nna.id_nna,
        id_caso=caso.id_caso,
        tipo_informe=TipoInforme.AVANCE,
        fecha_vencimiento=date(2024, 1, 31),
    )
    db_session.add(avance)
    await db_session.commit()

    siguiente = await chain_next_informe(db_session, nna.id_nna, avance)

    assert siguiente is not None
    assert siguiente.tipo_informe == TipoInforme.AVANCE
    assert siguiente.fecha_vencimiento == date(2024, 4, 30)


async def test_chain_next_informe_desde_avance_sin_vencimiento_no_encadena(
    db_session: AsyncSession,
):
    nna, caso = await _nna_con_caso(db_session)
    avance = InformeTribunal(
        id_nna=nna.id_nna,
        id_caso=caso.id_caso,
        tipo_informe=TipoInforme.AVANCE,
        fecha_vencimiento=None,
    )
    db_session.add(avance)
    await db_session.commit()

    assert await chain_next_informe(db_session, nna.id_nna, avance) is None


async def test_chain_next_informe_ignora_los_tipos_desconocidos(db_session: AsyncSession):
    nna, caso = await _nna_con_caso(db_session)
    raro = InformeTribunal(
        id_nna=nna.id_nna,
        id_caso=caso.id_caso,
        tipo_informe=None,
        fecha_vencimiento=date(2024, 1, 1),
    )
    db_session.add(raro)
    await db_session.commit()

    assert await chain_next_informe(db_session, nna.id_nna, raro) is None


async def test_los_informes_encadenados_no_se_duplican_en_la_base(
    db_session: AsyncSession,
):
    """El encadenamiento no tiene guard: encadenar dos veces crea dos informes."""
    nna, caso = await _nna_con_caso(db_session)
    avance = InformeTribunal(
        id_nna=nna.id_nna,
        id_caso=caso.id_caso,
        tipo_informe=TipoInforme.AVANCE,
        fecha_vencimiento=date(2024, 1, 31),
    )
    db_session.add(avance)
    await db_session.commit()

    await chain_next_informe(db_session, nna.id_nna, avance)
    await chain_next_informe(db_session, nna.id_nna, avance)

    informes = (await db_session.execute(select(InformeTribunal))).scalars().all()
    assert len(informes) == 3  # el avance original + dos encadenados


# ── get_latest_fecha_ingreso ─────────────────────────────────────────────────


async def test_get_latest_fecha_ingreso_devuelve_la_mas_reciente(
    db_session: AsyncSession,
):
    nna, caso = await _nna_con_caso(db_session)
    solicitante = await _solicitante(db_session)
    for fecha in (date(2024, 1, 1), date(2024, 6, 1), date(2024, 3, 1)):
        db_session.add(
            AntecedenteIngreso(
                id_nna=nna.id_nna,
                id_caso=caso.id_caso,
                id_solicitante_ingreso=solicitante.id_solicitante_ingreso,
                fecha_ingreso_residencia=fecha,
            )
        )
    await db_session.commit()

    assert await get_latest_fecha_ingreso(db_session, nna.id_nna) == date(2024, 6, 1)


async def test_get_latest_fecha_ingreso_ignora_los_nulos(db_session: AsyncSession):
    nna, caso = await _nna_con_caso(db_session)
    solicitante = await _solicitante(db_session)
    db_session.add(
        AntecedenteIngreso(
            id_nna=nna.id_nna,
            id_caso=caso.id_caso,
            id_solicitante_ingreso=solicitante.id_solicitante_ingreso,
            fecha_ingreso_residencia=None,
        )
    )
    await db_session.commit()

    assert await get_latest_fecha_ingreso(db_session, nna.id_nna) is None


async def test_get_latest_fecha_ingreso_filtra_por_caso(db_session: AsyncSession):
    nna, caso_activo = await _nna_con_caso(db_session)
    cerrado = Caso(id_nna=nna.id_nna, estado="Cerrado")
    db_session.add(cerrado)
    await db_session.flush()
    solicitante = await _solicitante(db_session)

    db_session.add(
        AntecedenteIngreso(
            id_nna=nna.id_nna,
            id_caso=caso_activo.id_caso,
            id_solicitante_ingreso=solicitante.id_solicitante_ingreso,
            fecha_ingreso_residencia=date(2024, 1, 1),
        )
    )
    db_session.add(
        AntecedenteIngreso(
            id_nna=nna.id_nna,
            id_caso=cerrado.id_caso,
            id_solicitante_ingreso=solicitante.id_solicitante_ingreso,
            fecha_ingreso_residencia=date(2024, 9, 9),
        )
    )
    await db_session.commit()

    assert await get_latest_fecha_ingreso(db_session, nna.id_nna) == date(2024, 9, 9)
    assert await get_latest_fecha_ingreso(
        db_session, nna.id_nna, caso_activo.id_caso
    ) == date(2024, 1, 1)


# ── Helpers de familiar, ingreso y vinculo ───────────────────────────────────


async def test_create_y_listar_hijos_de_familiar(db_session: AsyncSession):
    familiar = Familiar(nombre="Marta Muñoz")
    db_session.add(familiar)
    await db_session.commit()

    creado = await create_familiar_child(
        db_session, AntecedentesPenales, familiar.id_familiar, {"descripcion": "Robo"}
    )
    assert creado.id_familiar == familiar.id_familiar

    listado = await list_familiar_children(db_session, AntecedentesPenales, familiar.id_familiar)
    assert [a.descripcion for a in listado] == ["Robo"]


async def test_create_y_listar_causales_de_ingreso(db_session: AsyncSession):
    nna, caso = await _nna_con_caso(db_session)
    solicitante = await _solicitante(db_session)
    ingreso = AntecedenteIngreso(
        id_nna=nna.id_nna,
        id_caso=caso.id_caso,
        id_solicitante_ingreso=solicitante.id_solicitante_ingreso,
    )
    db_session.add(ingreso)
    await db_session.commit()

    await create_ingreso_child(
        db_session,
        RegistroCausalIngreso,
        ingreso.id_antecedente_ingreso,
        {"nombre_causal": "Negligencia parental"},
    )
    listado = await list_ingreso_children(
        db_session, RegistroCausalIngreso, ingreso.id_antecedente_ingreso
    )
    assert [c.nombre_causal for c in listado] == ["Negligencia parental"]


async def test_create_y_listar_vinculos_familiares(db_session: AsyncSession):
    nna, _ = await _nna_con_caso(db_session)
    familiar = Familiar(nombre="Marta Muñoz")
    db_session.add(familiar)
    await db_session.commit()

    await create_vinculo(
        db_session, nna.id_nna, {"id_familiar": familiar.id_familiar, "parentesco": "Madre"}
    )
    listado = await list_vinculo(db_session, nna.id_nna)
    assert [(v.id_familiar, v.parentesco) for v in listado] == [
        (familiar.id_familiar, "Madre")
    ]


async def test_create_vinculo_nna_normaliza_el_orden(db_session: AsyncSession):
    nna_a, _ = await _nna_con_caso(db_session)
    nna_b, _ = await _nna_con_caso(db_session)
    menor, mayor = sorted([nna_a.id_nna, nna_b.id_nna])

    creado = await create_vinculo_nna(
        db_session, mayor, {"id_nna_2": menor, "parentesco": "Hermano"}
    )
    assert creado.id_nna_1 == menor
    assert creado.id_nna_2 == mayor


async def test_list_vinculo_nna_es_bidireccional(db_session: AsyncSession):
    nna_a, _ = await _nna_con_caso(db_session)
    nna_b, _ = await _nna_con_caso(db_session)
    await create_vinculo_nna(db_session, nna_a.id_nna, {"id_nna_2": nna_b.id_nna})

    assert len(await list_vinculo_nna(db_session, nna_a.id_nna)) == 1
    assert len(await list_vinculo_nna(db_session, nna_b.id_nna)) == 1


async def test_list_vinculo_nna_de_un_tercero_esta_vacio(db_session: AsyncSession):
    nna_a, _ = await _nna_con_caso(db_session)
    nna_b, _ = await _nna_con_caso(db_session)
    nna_c, _ = await _nna_con_caso(db_session)
    await create_vinculo_nna(db_session, nna_a.id_nna, {"id_nna_2": nna_b.id_nna})

    assert await list_vinculo_nna(db_session, nna_c.id_nna) == []


async def test_el_par_de_vinculo_nna_es_unico(db_session: AsyncSession):
    nna_a, _ = await _nna_con_caso(db_session)
    nna_b, _ = await _nna_con_caso(db_session)
    await create_vinculo_nna(db_session, nna_a.id_nna, {"id_nna_2": nna_b.id_nna})

    with pytest.raises(IntegrityError):
        await create_vinculo_nna(db_session, nna_b.id_nna, {"id_nna_2": nna_a.id_nna})


async def test_get_nna_child_devuelve_none_si_no_existe(db_session: AsyncSession):
    assert (
        await get_nna_child(
            db_session, VinculoNNA, VinculoNNA.id_vinculo_nna, uuid.uuid4()
        )
        is None
    )


# ── Servicios de clase ───────────────────────────────────────────────────────


async def test_nna_service_create_crea_el_caso_activo(db_session: AsyncSession):
    servicio = NNAService(db_session)
    creado = await servicio.create({"nombre": "Ana Muñoz"})

    activo = await get_active_caso(db_session, creado.id_nna)
    assert activo is not None


async def test_nna_service_get_y_update(db_session: AsyncSession):
    servicio = NNAService(db_session)
    creado = await servicio.create({"nombre": "Ana Muñoz"})

    assert (await servicio.get(creado.id_nna)).nombre == "Ana Muñoz"

    actualizado = await servicio.update(creado, {"nombre": "Ana Muñoz Rojas"})
    assert actualizado.nombre == "Ana Muñoz Rojas"


async def test_nna_service_get_inexistente_es_none(db_session: AsyncSession):
    assert await NNAService(db_session).get(uuid.uuid4()) is None


async def test_nna_service_list_devuelve_el_estado_del_caso(db_session: AsyncSession):
    servicio = NNAService(db_session)
    nna = await servicio.create({"nombre": "Ana Muñoz"})

    filas = await servicio.list()
    assert len(filas) == 1
    assert filas[0][0].id_nna == nna.id_nna
    assert filas[0][1] == "En Progreso"


async def test_nna_service_list_prioriza_el_caso_activo(db_session: AsyncSession):
    servicio = NNAService(db_session)
    nna = await servicio.create({"nombre": "Ana Muñoz"})
    caso_activo = await get_active_caso(db_session, nna.id_nna)
    caso_activo.estado = "Cerrado"
    db_session.add(caso_activo)
    db_session.add(Caso(id_nna=nna.id_nna, estado="En Progreso"))
    await db_session.commit()

    filas = await servicio.list()
    assert filas[0][1] == "En Progreso"


async def test_nna_service_list_respeta_skip_y_limit(db_session: AsyncSession):
    servicio = NNAService(db_session)
    for i in range(3):
        await servicio.create({"nombre": f"NNA {i}"})

    assert len(await servicio.list(skip=0, limit=2)) == 2
    assert len(await servicio.list(skip=2, limit=10)) == 1


async def test_familiar_service_crear_consultar_y_actualizar(db_session: AsyncSession):
    servicio = FamiliarService(db_session)
    creado = await servicio.create({"nombre": "Marta Muñoz"})

    assert (await servicio.get(creado.id_familiar)).nombre == "Marta Muñoz"
    actualizado = await servicio.update(creado, {"numero_telefono": "+56912345678"})
    assert actualizado.numero_telefono == "+56912345678"


async def test_familiar_service_get_inexistente_es_none(db_session: AsyncSession):
    assert await FamiliarService(db_session).get(uuid.uuid4()) is None


async def test_familiar_service_list_pagina(db_session: AsyncSession):
    servicio = FamiliarService(db_session)
    for i in range(3):
        await servicio.create({"nombre": f"Familiar {i}"})

    assert len(await servicio.list()) == 3
    assert len(await servicio.list(skip=1, limit=1)) == 1


# ── Borrado y cascadas del ORM ───────────────────────────────────────────────


@pytest.mark.characterization
async def test_borrar_un_nna_por_el_orm_falla_porque_nulea_las_fk_de_sus_hijos(
    db_session: AsyncSession,
):
    """Ninguna relacion define ``cascade="delete"`` ni ``passive_deletes``.

    Al borrar un ``NNA`` el ORM intenta "desvincular" a sus hijos poniendo sus
    columnas FK en NULL, lo que choca con el ``NOT NULL`` de ``id_nna`` (y con
    la FK compuesta contra ``Caso``). Se ve al construir la base de prueba con
    ``seed.py`` sobre una base vacia.

    Importa porque no existe ``DELETE /api/nna/{id}``: si algun dia se agrega,
    hay que borrar los hijos explicitamente o anadir ``ON DELETE CASCADE``.
    """
    nna, caso = await _nna_con_caso(db_session)
    db_session.add(
        DocumentacionIngreso(id_nna=nna.id_nna, id_caso=caso.id_caso, tipo_documento="Certificado")
    )
    await db_session.commit()

    with pytest.raises(IntegrityError):
        await db_session.delete(nna)
        await db_session.commit()


async def test_borrar_un_ncfas_por_el_orm_arrastra_sus_respuestas_y_comentarios(
    db_session: AsyncSession,
):
    """``NCFAS.respuestas_list`` y ``.comentarios`` si declaran delete-orphan."""
    from app.models import ComentarioDimensionNCFAS, ItemNCFAS, NCFAS, RespuestaNCFAS

    nna, caso = await _nna_con_caso(db_session)
    familiar = Familiar(nombre="Marta Muñoz")
    db_session.add(familiar)
    await db_session.flush()
    ncfas = NCFAS(id_nna=nna.id_nna, id_caso=caso.id_caso, id_familiar=familiar.id_familiar)
    db_session.add(ncfas)
    await db_session.flush()

    item = (await db_session.execute(select(ItemNCFAS).limit(1))).scalar_one()
    db_session.add(
        RespuestaNCFAS(
            id_ncfas=ncfas.id_ncfas,
            id_item_ncfas=item.id_item_ncfas,
            momento_evaluacion="Ingreso",
            puntaje="+1",
        )
    )
    db_session.add(
        ComentarioDimensionNCFAS(
            id_ncfas=ncfas.id_ncfas, letra_dimension="A", comentario="Nota"
        )
    )
    await db_session.commit()

    await db_session.delete(ncfas)
    await db_session.commit()

    assert (await db_session.execute(select(RespuestaNCFAS))).scalars().all() == []
    assert (await db_session.execute(select(ComentarioDimensionNCFAS))).scalars().all() == []
