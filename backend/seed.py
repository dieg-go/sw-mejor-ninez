import asyncio
import json
import uuid
from datetime import date, timedelta
from pathlib import Path

from sqlmodel import select

from app.core.database import async_session
from app.models import (
    Familiar,
    AntecedenteEscolar,
    AntecedenteFamiliar,
    AntecedenteIngreso,
    AntecedenteSalud,
    AntecedentesPenales,
    BaremoE2P,
    CentroSalud,
    DiscapacidadNNA,
    DocumentacionIngreso,
    E2P,
    EstablecimientoEducacional,
    PreguntaE2P,
    PreguntaPMF,
    VinculoFamiliar,
    HistorialConsumoAdulto,
    HistorialConsumoNNA,
    HistorialRedProteccional,
    InformeTribunal,
    NCFAS,
    ItemNCFAS,
    NNA,
    NotificacionFamiliar,
    PMF,
    ProcesoDespejeFamiliar,
    RegistroCausalIngreso,
    RegistroDerechoVulnerado,
    SolicitanteIngreso,
    Usuario,
)
from app.core.security import hash_password


def fecha_hace(dias: int) -> date:
    return date.today() - timedelta(days=dias)


_DATA_DIR = Path(__file__).resolve().parent / "app" / "data"


async def seed_e2p_static(session):
    count_preguntas = (
        await session.execute(select(PreguntaE2P))
    ).scalars().first()
    if count_preguntas:
        print("PreguntaE2P ya tiene datos — skipping static seed.")
        return

    with open(_DATA_DIR / "e2p_questions.json", encoding="utf-8") as f:
        questions_data = json.load(f)
    with open(_DATA_DIR / "e2p_escala.json", encoding="utf-8") as f:
        escala_data = json.load(f)

    preguntas_rows = []
    for rango_etario, rango_info in questions_data["rangos_etarios"].items():
        for q in rango_info["preguntas"]:
            preguntas_rows.append(
                PreguntaE2P(
                    rango_etario=rango_etario,
                    numero_item=q["numero_item"],
                    texto_afirmacion=q["texto_afirmacion"],
                    dimension=q["dimension"],
                    subdimension=q.get("subdimension"),
                )
            )

    session.add_all(preguntas_rows)

    baremo_rows = []
    for rango_etario, dimensiones in escala_data["escalas_e2p"].items():
        for dimension, baremos in dimensiones.items():
            for b in baremos:
                baremo_rows.append(
                    BaremoE2P(
                        rango_etario=rango_etario,
                        dimension=dimension,
                        decil=b["decil"],
                        zona=b["zona"],
                        puntaje_min=b["puntaje_min"],
                        puntaje_max=b["puntaje_max"],
                    )
                )

    session.add_all(baremo_rows)
    await session.commit()
    print(f"Static E2P data seeded: {len(preguntas_rows)} preguntas, {len(baremo_rows)} baremos.")


async def seed_pmf_static(session):
    count_preguntas = (
        await session.execute(select(PreguntaPMF))
    ).scalars().first()
    if count_preguntas:
        print("PreguntaPMF ya tiene datos — skipping static seed.")
        return

    with open(_DATA_DIR / "pmf_afirmaciones.json", encoding="utf-8") as f:
        afirmaciones_data = json.load(f)

    preguntas_rows = []
    for q in afirmaciones_data:
        preguntas_rows.append(
            PreguntaPMF(
                numero=q["id"],
                afirmacion=q["afirmacion"],
            )
        )

    session.add_all(preguntas_rows)
    await session.commit()
    print(f"Static PMF data seeded: {len(preguntas_rows)} preguntas.")


async def seed_ncfas_items(session):
    count_items = (
        await session.execute(select(ItemNCFAS))
    ).scalars().first()
    if count_items:
        print("ItemNCFAS ya tiene datos — skipping static seed.")
        return

    dimension_files = sorted(_DATA_DIR.glob("ncfas_definicion_dimension_*.json"))
    rows = []
    for path in dimension_files:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        dim = data["dimension"]
        total_items = len(dim["items"])
        for item_data in dim["items"]:
            rows.append(
                ItemNCFAS(
                    letra_dimension=dim["letra"],
                    nombre_dimension=dim["nombre"],
                    numero_item=item_data["numero"],
                    nombre_item=item_data["nombre"],
                    definiciones=item_data.get("rubricas"),
                    es_item_general=item_data["numero"] == total_items,
                )
            )

    session.add_all(rows)
    await session.commit()
    print(f"Static NCFAS items seeded: {len(rows)} items across {len(dimension_files)} dimensions.")



async def seed_admin_user(session):
    result = await session.execute(select(Usuario))
    existing = result.scalars().first()
    if existing:
        print("Admin user already exists — skipping.")
        return

    admin = Usuario(
        email="admin@mejorninez.cl",
        hashed_password=hash_password("admin123"),
        nombre="Administrador",
    )
    session.add(admin)
    await session.commit()
    print("Admin user created: admin@mejorninez.cl / admin123")


async def seed_catalogs(session):
    result = await session.execute(select(SolicitanteIngreso))
    if result.scalars().first():
        print("Catalogs already seeded — skipping.")
        return

    session.add_all([
        SolicitanteIngreso(nombre="Tribunal de Familia de Santiago", categoria="Tribunal", ano_proyecto=None),
        SolicitanteIngreso(nombre="Programa de Intervención Breve (PIB)", categoria="PIB", ano_proyecto=2025),
        SolicitanteIngreso(nombre="OPD Temuco", categoria="OPD", ano_proyecto=2024),
        SolicitanteIngreso(nombre="PRM Santiago Centro", categoria="PRM", ano_proyecto=2025),
        SolicitanteIngreso(nombre="PRK Valparaíso", categoria="PRK", ano_proyecto=2024),
    ])

    session.add_all([
        EstablecimientoEducacional(nombre="Liceo Comercial Manuel de Salas", rbd=8593),
        EstablecimientoEducacional(nombre="Escuela Básica Las Palmas", rbd=10456),
        EstablecimientoEducacional(nombre="Colegio San Ignacio", rbd=7234),
    ])

    session.add_all([
        CentroSalud(nombre="CESFAM N°5 Santiago", tipo_recinto="CESFAM"),
        CentroSalud(nombre="Hospital Regional de Temuco", tipo_recinto="Hospital"),
        CentroSalud(nombre="Clínica Alemana de Santiago", tipo_recinto="Clínica Privada"),
    ])

    await session.commit()
    print("Catalogs seeded: 5 solicitantes, 3 establecimientos, 3 centros de salud.")


async def seed():
    async with async_session() as session:
        await seed_admin_user(session)
        await seed_e2p_static(session)
        await seed_pmf_static(session)
        await seed_ncfas_items(session)
        await seed_catalogs(session)

        count_nna = (await session.execute(select(NNA))).scalars().all()
        if len(count_nna) >= 2:
            print(f"Seed data already exists ({len(count_nna)} NNA) — skipping.")
            return

        # Load catalog references
        sols = (await session.execute(select(SolicitanteIngreso))).scalars().all()
        sol_by_name = {s.nombre: s for s in sols}
        ests = (await session.execute(select(EstablecimientoEducacional))).scalars().all()
        est_by_name = {e.nombre: e for e in ests}
        centros = (await session.execute(select(CentroSalud))).scalars().all()
        centro_by_name = {c.nombre: c for c in centros}

        # ═══ NNA #1: Ana Muñoz ═══════════════════════════════════════════════
        ana = NNA(
            nombre="Ana Muñoz",
            run="23.456.789-1",
            fecha_nacimiento=fecha_hace(14 * 365),
            sexo="Femenino",
            etnia_declarada="No pertenece",
            nacionalidad="Chilena",
            domicilio="Av. Matta 1234",
            poblacion_o_villa="Villa Frei",
            comuna="Santiago",
            region="Metropolitana",
        )
        session.add(ana)

        madre_ana = Familiar(
            nombre="Marta Muñoz",
            run="12.345.678-9",
            fecha_nacimiento=fecha_hace(38 * 365),
            direccion="Av. Matta 1234",
            numero_telefono="+56912345678",
            tiene_antecedentes_penales=False,
        )
        tio_ana = Familiar(
            nombre="Pedro Muñoz",
            run="10.987.654-2",
            fecha_nacimiento=fecha_hace(40 * 365),
            direccion="Calle Falsa 456",
            numero_telefono="+56987654321",
            tiene_antecedentes_penales=True,
        )
        session.add_all([madre_ana, tio_ana])
        await session.flush()

        session.add(
            AntecedentesPenales(
                id_familiar=tio_ana.id_familiar,
                descripcion="Violencia intrafamiliar — condena 2019",
            )
        )

        # VinculoFamiliar direct (new structure: id_nna + id_familiar)
        session.add_all([
            VinculoFamiliar(
                id_nna=ana.id_nna,
                id_familiar=madre_ana.id_familiar,
                parentesco="Madre",
            ),
            VinculoFamiliar(
                id_nna=ana.id_nna,
                id_familiar=tio_ana.id_familiar,
                parentesco="Tío",
            ),
        ])

        # AntecedenteFamiliar
        af_ana = AntecedenteFamiliar(
            id_nna=ana.id_nna,
            id_adulto_responsable=madre_ana.id_familiar,
            fecha_antecedente_familiar=fecha_hace(90),
            con_quien_vive="Madre",
            con_quien_vive_detalle=None,
        )
        session.add(af_ana)

        # Ingreso
        ing_ana = AntecedenteIngreso(
            id_nna=ana.id_nna,
            id_solicitante_ingreso=sol_by_name["Tribunal de Familia de Santiago"].id_solicitante_ingreso,
            fecha_ingreso_residencia=fecha_hace(180),
            orden_tribunal=True,
            fecha_causa=fecha_hace(200),
            tribunal="1° Juzgado de Familia de Santiago",
            materia="Proteccional",
            codigo_rit="C-1234-2025",
            codigo_ruc="2510012345-6",
        )
        session.add(ing_ana)
        await session.flush()
        session.add_all([
            RegistroCausalIngreso(
                id_antecedente_ingreso=ing_ana.id_antecedente_ingreso,
                nombre_causal="Negligencia parental",
                descripcion_detallada="Madre con consumo problemático de alcohol durante la gestación. Padre ausente.",
                estado="Activo",
            ),
            RegistroCausalIngreso(
                id_antecedente_ingreso=ing_ana.id_antecedente_ingreso,
                nombre_causal="Violencia intrafamiliar",
                descripcion_detallada="Exposición a VIF entre progenitores.",
                estado="Activo",
            ),
            RegistroDerechoVulnerado(
                id_antecedente_ingreso=ing_ana.id_antecedente_ingreso,
                nombre_derecho="Derecho a vivir en un entorno familiar adecuado",
                estado="Vulnerado",
            ),
        ])

        session.add(
            DocumentacionIngreso(
                id_nna=ana.id_nna,
                tipo_documento="Certificado de nacimiento",
                estado_recepcion=True,
                fecha_recepcion=fecha_hace(175),
            )
        )

        # Consumo
        session.add(
            HistorialConsumoNNA(
                id_nna=ana.id_nna,
                nombre_sustancia="Alcohol",
                consumo_indirecto_gestacional=True,
                estado_consumo="Inactivo",
                fecha_inicio=fecha_hace(5000),
                en_tratamiento=False,
            )
        )

        # Instrumentos
        session.add_all([
            E2P(
                id_nna=ana.id_nna,
                id_familiar=madre_ana.id_familiar,
                fecha_evaluacion=fecha_hace(30),
                edad_meses_evaluacion=30,
                rango_etario="19-36_meses",
                perfil_resultado_global="Monitoreo",
                observacion="Se observa mejora en vínculo materno-filial.",
            ),
            PMF(
                id_nna=ana.id_nna,
                id_familiar=madre_ana.id_familiar,
                fecha_evaluacion=fecha_hace(30),
                fecha_proxima_evaluacion=fecha_hace(-30),
                resultado="En proceso",
                observacion="La madre asiste regularmente a visitas.",
            ),
        ])

        # Salud + Escolar
        session.add_all([
            AntecedenteSalud(
                id_nna=ana.id_nna,
                id_centro_salud=centro_by_name["CESFAM N°5 Santiago"].id_centro_salud,
                fecha_antecedente_salud=fecha_hace(90),
                inscrito_en_centro_salud=True,
                prevision="Fonasa",
            ),
            AntecedenteEscolar(
                id_nna=ana.id_nna,
                id_establecimiento_educacional=est_by_name["Liceo Comercial Manuel de Salas"].id_establecimiento_educacional,
                fecha_antecedente_escolar=fecha_hace(90),
                escolarizado=True,
                ultimo_ano_cursado=8,
            ),
        ])

        session.add(InformeTribunal(
            id_nna=ana.id_nna,
            tipo_informe="Avance",
            fecha_vencimiento=fecha_hace(-15),
            fecha_envio_real=fecha_hace(20),
            estado="Enviado",
        ))

        # ═══ NNA #2: Carlos Rojas ═══════════════════════════════════════════
        carlos = NNA(
            nombre="Carlos Rojas",
            run="34.567.890-2",
            fecha_nacimiento=fecha_hace(9 * 365),
            sexo="Masculino",
            etnia_declarada="No pertenece",
            nacionalidad="Chilena",
            domicilio="Pasaje Los Olmos 89",
            poblacion_o_villa=None,
            comuna="Valparaíso",
            region="Valparaíso",
        )
        session.add(carlos)

        padre_carlos = Familiar(
            nombre="Héctor Rojas",
            run="21.345.678-3",
            fecha_nacimiento=fecha_hace(45 * 365),
            direccion="Pasaje Los Olmos 89",
            numero_telefono="+56911223344",
            tiene_antecedentes_penales=False,
        )
        session.add(padre_carlos)
        await session.flush()

        session.add(HistorialConsumoAdulto(
            id_familiar=padre_carlos.id_familiar,
            nombre_sustancia="Pasta base de cocaína",
            estado_consumo="Activo",
            fecha_inicio=fecha_hace(1500),
            en_tratamiento=False,
        ))

        session.add(VinculoFamiliar(
            id_nna=carlos.id_nna,
            id_familiar=padre_carlos.id_familiar,
            parentesco="Padre",
        ))

        af_carlos = AntecedenteFamiliar(
            id_nna=carlos.id_nna,
            id_adulto_responsable=padre_carlos.id_familiar,
            fecha_antecedente_familiar=fecha_hace(80),
            con_quien_vive="Padre",
            con_quien_vive_detalle=None,
        )
        session.add(af_carlos)

        ing_carlos = AntecedenteIngreso(
            id_nna=carlos.id_nna,
            id_solicitante_ingreso=sol_by_name["Programa de Intervención Breve (PIB)"].id_solicitante_ingreso,
            fecha_ingreso_residencia=fecha_hace(90),
            orden_tribunal=False,
            codigo_rit="P-5678-2025",
        )
        session.add(ing_carlos)
        await session.flush()
        session.add(RegistroCausalIngreso(
            id_antecedente_ingreso=ing_carlos.id_antecedente_ingreso,
            nombre_causal="Consumo problemático del adulto responsable",
            descripcion_detallada="Padre con consumo activo de pasta base. Entorno inseguro para el NNA.",
            estado="Activo",
        ))

        session.add(HistorialConsumoNNA(
            id_nna=carlos.id_nna,
            nombre_sustancia="Alcohol",
            consumo_indirecto_gestacional=True,
            estado_consumo="Inactivo",
            fecha_inicio=fecha_hace(3300),
            en_tratamiento=False,
        ))

        session.add(AntecedenteEscolar(
            id_nna=carlos.id_nna,
            id_establecimiento_educacional=est_by_name["Escuela Básica Las Palmas"].id_establecimiento_educacional,
            fecha_antecedente_escolar=fecha_hace(60),
            escolarizado=True,
            ultimo_ano_cursado=3,
        ))

        session.add(NCFAS(
            id_nna=carlos.id_nna,
            id_familiar=padre_carlos.id_familiar,
            es_reunificacion=False,
            fecha_apertura=fecha_hace(15),
            fecha_cierre=None,
            estado="Ingreso completado",
            observacion_general="Padre no se presentó a la última sesión.",
        ))

        # ═══ NNA #3: María Huenchul ═══════════════════════════════════════════
        maria = NNA(
            nombre="María Huenchul",
            run="45.678.901-K",
            fecha_nacimiento=fecha_hace(6 * 365),
            sexo="Femenino",
            etnia_declarada="Mapuche",
            nacionalidad="Chilena",
            domicilio="Camino Lonquimay Km 5",
            poblacion_o_villa="Comunidad Nicolás Ailio",
            comuna="Temuco",
            region="Araucanía",
        )
        session.add(maria)

        abuela_maria = Familiar(
            nombre="Rosa Huenchul",
            run="08.765.432-1",
            fecha_nacimiento=fecha_hace(62 * 365),
            direccion="Camino Lonquimay Km 5",
            numero_telefono="+56944332211",
            tiene_antecedentes_penales=False,
        )
        madre_maria = Familiar(
            nombre="Elisa Huenchul",
            run="33.222.111-0",
            fecha_nacimiento=fecha_hace(28 * 365),
            direccion="Calle Principal 100, Padre Las Casas",
            numero_telefono="+56955443322",
            tiene_antecedentes_penales=False,
        )
        session.add_all([abuela_maria, madre_maria])
        await session.flush()

        session.add(HistorialConsumoAdulto(
            id_familiar=madre_maria.id_familiar,
            nombre_sustancia="Alcohol",
            estado_consumo="En tratamiento",
            fecha_inicio=fecha_hace(2500),
            en_tratamiento=True,
        ))

        session.add_all([
            VinculoFamiliar(
                id_nna=maria.id_nna,
                id_familiar=abuela_maria.id_familiar,
                parentesco="Abuela materna",
            ),
            VinculoFamiliar(
                id_nna=maria.id_nna,
                id_familiar=madre_maria.id_familiar,
                parentesco="Madre",
            ),
        ])

        af_maria = AntecedenteFamiliar(
            id_nna=maria.id_nna,
            id_adulto_responsable=abuela_maria.id_familiar,
            fecha_antecedente_familiar=fecha_hace(100),
            con_quien_vive="Abuela materna",
            con_quien_vive_detalle="Madre con régimen de visitas supervisadas",
        )
        session.add(af_maria)

        ing_maria = AntecedenteIngreso(
            id_nna=maria.id_nna,
            id_solicitante_ingreso=sol_by_name["OPD Temuco"].id_solicitante_ingreso,
            fecha_ingreso_residencia=fecha_hace(120),
            orden_tribunal=False,
            codigo_rit="A-9012-2025",
        )
        session.add(ing_maria)
        await session.flush()
        session.add(RegistroCausalIngreso(
            id_antecedente_ingreso=ing_maria.id_antecedente_ingreso,
            nombre_causal="Inhabilidad materna por consumo",
            descripcion_detallada="Madre en tratamiento por alcoholismo. Abuela asume cuidados.",
            estado="Activo",
        ))

        session.add(DiscapacidadNNA(
            id_nna=maria.id_nna,
            tipo="Auditiva",
            porcentaje_grado=35,
            observacion="Hipoacusia unilateral moderada. En seguimiento con otorrino.",
        ))

        session.add(E2P(
            id_nna=maria.id_nna,
            id_familiar=abuela_maria.id_familiar,
            fecha_evaluacion=fecha_hace(45),
            edad_meses_evaluacion=2,
            rango_etario="0-3_meses",
            perfil_resultado_global="Optimo",
            observacion="Abuela muestra buen manejo de la discapacidad de la NNA.",
        ))

        session.add(AntecedenteEscolar(
            id_nna=maria.id_nna,
            id_establecimiento_educacional=None,
            fecha_antecedente_escolar=fecha_hace(100),
            escolarizado=False,
            ultimo_ano_cursado=None,
        ))

        # ═══ Shared / cross-cutting ═══════════════════════════════════════════
        for nna_id in [ana.id_nna, carlos.id_nna, maria.id_nna]:
            session.add(HistorialRedProteccional(
                id_nna=nna_id,
                nombre_programa="Programa de Protección Especializada (PPE)",
                fecha_ingreso=fecha_hace(180),
                fecha_egreso=None,
                motivo_egreso=None,
            ))

        # ═══ Proceso de Despeje Familiar ════════════════════════════════════════
        #
        # Ana Muñoz — Búsqueda finalizada: 2 cartas a 2 familiares, sin red familiar
        despeje_ana = ProcesoDespejeFamiliar(
            id_nna=ana.id_nna,
            fecha_solicitud_informe=fecha_hace(160),
            fecha_recepcion_informe=fecha_hace(135),
            estado="Cerrado Sin Red",
            url_informe_hijo="/uploads/informe_hijo_ana.pdf",
        )
        session.add(despeje_ana)

        # Carlos Rojas — En proceso: alerta naranja activa (≥30 días de 1ª carta sin enviar 2ª)
        despeje_carlos = ProcesoDespejeFamiliar(
            id_nna=carlos.id_nna,
            fecha_solicitud_informe=fecha_hace(65),
            fecha_recepcion_informe=fecha_hace(42),
            estado="En Notificación",
            url_informe_hijo="/uploads/informe_hijo_carlos.pdf",
        )
        session.add(despeje_carlos)

        # María Huenchul — Evaluando: abuela aceptó, madre en plazo
        despeje_maria = ProcesoDespejeFamiliar(
            id_nna=maria.id_nna,
            fecha_solicitud_informe=fecha_hace(90),
            fecha_recepcion_informe=fecha_hace(65),
            estado="Evaluando",
            url_informe_hijo="/uploads/informe_hijo_maria.pdf",
        )
        session.add(despeje_maria)

        await session.flush()  # get PKs for notifications

        session.add_all([
            # ── Ana: madre — 2 cartas, sin respuesta → cerrado ──────────────
            NotificacionFamiliar(
                id_despeje=despeje_ana.id_despeje,
                id_familiar=madre_ana.id_familiar,
                fecha_envio_carta_1=fecha_hace(130),
                codigo_seguimiento_1="RC00123456CL",
                estado_entrega_1="Entregada",
                fecha_recepcion_carta_1=fecha_hace(125),
                fecha_envio_carta_2=fecha_hace(95),
                codigo_seguimiento_2="RC00123457CL",
                estado_entrega_2="Entregada",
                fecha_recepcion_carta_2=fecha_hace(90),
                resultado_contacto="No responde",
                fecha_respuesta=fecha_hace(75),
                observacion="Madre no respondió a ninguna de las 2 cartas certificadas. Proceso cerrado por plazo vencido.",
            ),
            # ── Ana: tío — 2 cartas, rechazó participación ──────────────────
            NotificacionFamiliar(
                id_despeje=despeje_ana.id_despeje,
                id_familiar=tio_ana.id_familiar,
                fecha_envio_carta_1=fecha_hace(130),
                codigo_seguimiento_1="RC00123458CL",
                estado_entrega_1="Entregada",
                fecha_recepcion_carta_1=fecha_hace(127),
                fecha_envio_carta_2=fecha_hace(95),
                codigo_seguimiento_2="RC00123459CL",
                estado_entrega_2="Devuelta — Dirección incorrecta",
                fecha_recepcion_carta_2=None,
                resultado_contacto="Rechaza participación",
                fecha_respuesta=fecha_hace(88),
                observacion="Tío contactó telefónicamente tras recibir 2ª carta. Manifiesta no tener condiciones para asumir cuidado.",
            ),

            # ── Carlos: padre — 1ª carta enviada hace 35 días, sin respuesta ─
            #     → Debería disparar alerta naranja en el frontend
            NotificacionFamiliar(
                id_despeje=despeje_carlos.id_despeje,
                id_familiar=padre_carlos.id_familiar,
                fecha_envio_carta_1=fecha_hace(35),
                codigo_seguimiento_1="RC00987654CL",
                estado_entrega_1="Entregada",
                fecha_recepcion_carta_1=fecha_hace(32),
                fecha_envio_carta_2=None,
                resultado_contacto=None,
                observacion="Padre con consumo activo de pasta base. Prioridad alta de ubicación. Se requiere gestionar 2ª carta certificada.",
            ),

            # ── María: abuela — respondió rápido, acepta evaluación ─────────
            NotificacionFamiliar(
                id_despeje=despeje_maria.id_despeje,
                id_familiar=abuela_maria.id_familiar,
                fecha_envio_carta_1=fecha_hace(60),
                codigo_seguimiento_1="RC00555111CL",
                estado_entrega_1="Entregada",
                fecha_recepcion_carta_1=fecha_hace(55),
                resultado_contacto="Acepta evaluación",
                fecha_respuesta=fecha_hace(45),
                observacion="Abuela materna mostró disposición inmediata. Vive en comunidad mapuche rural. Se agenda evaluación E2P.",
            ),
            # ── María: madre — 1ª carta reciente, dentro del plazo ───────────
            NotificacionFamiliar(
                id_despeje=despeje_maria.id_despeje,
                id_familiar=madre_maria.id_familiar,
                fecha_envio_carta_1=fecha_hace(20),
                codigo_seguimiento_1="RC00555112CL",
                estado_entrega_1="En tránsito",
                fecha_recepcion_carta_1=None,
                observacion="Madre biológica reside en Padre Las Casas. Carta en proceso de entrega por Correos de Chile.",
            ),
        ])

        session.add(AntecedenteSalud(
            id_nna=maria.id_nna,
            id_centro_salud=centro_by_name["Hospital Regional de Temuco"].id_centro_salud,
            fecha_antecedente_salud=fecha_hace(100),
            inscrito_en_centro_salud=True,
            prevision="Fonasa",
        ))

        await session.commit()
        print("Seed data created: 3 NNA, 5 familiares, 3 despejes, 6 notificaciones, ~40 child records, catalogs.")


if __name__ == "__main__":
    asyncio.run(seed())
