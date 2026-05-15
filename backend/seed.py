import asyncio
import uuid
from datetime import date, timedelta

from sqlmodel import select

from app.core.database import async_session
from app.models import (
    AdultoSignificativo,
    AntecedenteEscolar,
    AntecedenteFamiliar,
    AntecedenteIngreso,
    AntecedenteSalud,
    AntecedentesPenales,
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
    NNA,
    PMF,
    RegistroCausalIngreso,
    RegistroDerechoVulnerado,
)


def fecha_hace(dias: int) -> date:
    return date.today() - timedelta(days=dias)


async def seed():
    async with async_session() as session:
        count_nna = (await session.execute(select(NNA))).scalars().all()
        if len(count_nna) >= 2:
            print(f"Seed data already exists ({len(count_nna)} NNA) — skipping.")
            return

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

        madre_ana = AdultoSignificativo(
            nombre="Marta Muñoz",
            run="12.345.678-9",
            fecha_nacimiento=fecha_hace(38 * 365),
            direccion="Av. Matta 1234",
            numero_telefono="+56912345678",
            tiene_antecedentes_penales=False,
        )
        tio_ana = AdultoSignificativo(
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
                id_adulto_significativo=tio_ana.id_adulto_significativo,
                descripcion="Violencia intrafamiliar — condena 2019",
            )
        )

        # Familiares
        af_ana = AntecedenteFamiliar(id_nna=ana.id_nna, fecha_antecedente_familiar=fecha_hace(90))
        session.add(af_ana)
        await session.flush()
        session.add_all([
            EntornoFamiliar(
                id_antecedente_familiar=af_ana.id_antecedente_familiar,
                id_adulto_significativo=madre_ana.id_adulto_significativo,
                parentesco="Madre",
                es_adulto_responsable=True,
            ),
            EntornoFamiliar(
                id_antecedente_familiar=af_ana.id_antecedente_familiar,
                id_adulto_significativo=tio_ana.id_adulto_significativo,
                parentesco="Tío",
                es_adulto_responsable=False,
            ),
        ])

        # Ingreso
        ing_ana = AntecedenteIngreso(
            id_nna=ana.id_nna,
            fecha_ingreso_residencia=fecha_hace(180),
            quien_solicita_ingreso="Tribunal de Familia de Santiago",
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
                id_adulto_significativo=madre_ana.id_adulto_significativo,
                fecha_evaluacion=fecha_hace(30),
                fecha_proxima_evaluacion=fecha_hace(-30),
                resultado="Fortalecimiento en curso",
                observacion="Se observa mejora en vínculo materno-filial.",
            ),
            PMF(
                id_nna=ana.id_nna,
                id_adulto_significativo=madre_ana.id_adulto_significativo,
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
                fecha_antecedente_salud=fecha_hace(90),
                inscrito_en_consultorio=True,
                establecimiento="CESFAM N°5 Santiago",
                prevision="Fonasa",
            ),
            AntecedenteEscolar(
                id_nna=ana.id_nna,
                fecha_antecedente_escolar=fecha_hace(90),
                escolarizado=True,
                establecimiento="Liceo Comercial Manuel de Salas",
                ultimo_ano_curso=8,
            ),
        ])

        session.add(InformeTribunal(
            id_nna=ana.id_nna,
            tipo_informe="Informe de avance",
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

        padre_carlos = AdultoSignificativo(
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
            id_adulto_significativo=padre_carlos.id_adulto_significativo,
            nombre_sustancia="Pasta base de cocaína",
            estado_consumo="Activo",
            fecha_inicio=fecha_hace(1500),
            en_tratamiento=False,
        ))

        af_carlos = AntecedenteFamiliar(id_nna=carlos.id_nna, fecha_antecedente_familiar=fecha_hace(80))
        session.add(af_carlos)
        await session.flush()
        session.add(EntornoFamiliar(
            id_antecedente_familiar=af_carlos.id_antecedente_familiar,
            id_adulto_significativo=padre_carlos.id_adulto_significativo,
            parentesco="Padre",
            es_adulto_responsable=True,
        ))

        ing_carlos = AntecedenteIngreso(
            id_nna=carlos.id_nna,
            fecha_ingreso_residencia=fecha_hace(90),
            quien_solicita_ingreso="Programa de Intervención Breve (PIB)",
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
            fecha_antecedente_escolar=fecha_hace(60),
            escolarizado=True,
            establecimiento="Escuela Básica Las Palmas",
            ultimo_ano_curso=3,
        ))

        session.add(NCFAS(
            id_nna=carlos.id_nna,
            id_adulto_significativo=padre_carlos.id_adulto_significativo,
            fecha_evaluacion=fecha_hace(15),
            fecha_proxima_evaluacion=fecha_hace(-60),
            resultado="Pendiente",
            observacion="Padre no se presentó a la última sesión.",
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

        abuela_maria = AdultoSignificativo(
            nombre="Rosa Huenchul",
            run="08.765.432-1",
            fecha_nacimiento=fecha_hace(62 * 365),
            direccion="Camino Lonquimay Km 5",
            numero_telefono="+56944332211",
            tiene_antecedentes_penales=False,
        )
        madre_maria = AdultoSignificativo(
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
            id_adulto_significativo=madre_maria.id_adulto_significativo,
            nombre_sustancia="Alcohol",
            estado_consumo="En tratamiento",
            fecha_inicio=fecha_hace(2500),
            en_tratamiento=True,
        ))

        af_maria = AntecedenteFamiliar(id_nna=maria.id_nna, fecha_antecedente_familiar=fecha_hace(100))
        session.add(af_maria)
        await session.flush()
        session.add_all([
            EntornoFamiliar(
                id_antecedente_familiar=af_maria.id_antecedente_familiar,
                id_adulto_significativo=abuela_maria.id_adulto_significativo,
                parentesco="Abuela materna",
                es_adulto_responsable=True,
            ),
            EntornoFamiliar(
                id_antecedente_familiar=af_maria.id_antecedente_familiar,
                id_adulto_significativo=madre_maria.id_adulto_significativo,
                parentesco="Madre",
                es_adulto_responsable=False,
            ),
        ])

        ing_maria = AntecedenteIngreso(
            id_nna=maria.id_nna,
            fecha_ingreso_residencia=fecha_hace(120),
            quien_solicita_ingreso="OPD Temuco",
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
            id_adulto_significativo=abuela_maria.id_adulto_significativo,
            fecha_evaluacion=fecha_hace(45),
            fecha_proxima_evaluacion=fecha_hace(-30),
            resultado="Positivo",
            observacion="Abuela muestra buen manejo de la discapacidad de la NNA.",
        ))

        session.add(AntecedenteEscolar(
            id_nna=maria.id_nna,
            fecha_antecedente_escolar=fecha_hace(100),
            escolarizado=False,
            establecimiento=None,
            ultimo_ano_curso=None,
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

        session.add_all([
            GestionBusquedaFamiliar(
                id_nna=ana.id_nna,
                tipo_gestion="Búsqueda de padre biológico",
                fecha_solicitud_envio=fecha_hace(160),
                fecha_respuesta_recepcion=fecha_hace(90),
                resultado="No ubicado",
                comprobante_adjunto=True,
            ),
            GestionBusquedaFamiliar(
                id_nna=carlos.id_nna,
                tipo_gestion="Contacto con familia extensa materna",
                fecha_solicitud_envio=fecha_hace(60),
                fecha_respuesta_recepcion=None,
                resultado="En proceso",
                comprobante_adjunto=False,
            ),
        ])

        session.add(AntecedenteSalud(
            id_nna=maria.id_nna,
            fecha_antecedente_salud=fecha_hace(100),
            inscrito_en_consultorio=True,
            establecimiento="Hospital Regional de Temuco",
            prevision="Fonasa",
        ))

        await session.commit()
        print("Seed data created: 3 NNA, 5 adultos, ~40 child records.")


if __name__ == "__main__":
    asyncio.run(seed())
