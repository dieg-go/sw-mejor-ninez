"""initial

Revision ID: 0b733fafb9a6
Revises:
Create Date: 2026-05-15 09:47:43.860386

Esquema base anterior a la agrupacion por caso, congelado como DDL explicito.

**Por que no usa `SQLModel.metadata.create_all`.** Lo hacia hasta el arreglo del
defecto B1, y eso rompia la cadena: `create_all` construye el esquema *actual*
-el de los modelos de hoy, no el de 2026-05-, asi que ya creaba la tabla `Caso`,
las columnas `id_caso` y las FK compuestas. Despues `3f2e134a5977` fallaba al
intentar crear la tabla otra vez (`DuplicateTable`) y un despliegue nuevo no
podia migrar. El problema era estructural y no puntual: cualquier columna
agregada a los modelos en el futuro habria vuelto a romper un despliegue limpio,
porque esta migracion la crearia por adelantado y la migracion que la introduce
chocaria con ella.

**Que representa.** El esquema de los modelos actuales *menos* todo lo que
introduce la agrupacion por caso, mas el unique `ProcesoDespejeFamiliar_id_nna_key`
que `bbf68836b0d8` reemplaza por `uq_despeje_nna_caso`.

**De donde salio.** El DDL historico real de 2026-05 no existe en el repo: nunca
se escribio, lo generaba `create_all`. Se reconstruyo de forma determinista
construyendo el esquema de los modelos en una base desechable, quitandole la
tabla `Caso` y las columnas `id_caso` con SQL (`DROP ... CASCADE` para que
PostgreSQL resolviera las dependencias) y volcando el resultado con `pg_dump
--schema-only`. Los statements de abajo son ese volcado, con `public.` quitado.

A partir de aqui la cadena es reproducible desde una base vacia y no depende de
los modelos. No editar a mano: para cambiar el esquema, agregar una migracion
nueva.
"""


from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0b733fafb9a6"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Orden de dependencias valido (lo garantiza pg_dump): primero las tablas,
# despues las restricciones y los indices.
_BASELINE_SQL: tuple[str, ...] = (
    "CREATE TABLE \"AntecedenteEscolar\" (\n    id_antecedente_escolar uuid NOT NULL,\n    id_nna uuid NOT NULL,\n    id_establecimiento_educacional uuid,\n    fecha_antecedente_escolar date,\n    ultimo_ano_cursado integer,\n    escolarizado boolean NOT NULL\n);",
    "CREATE TABLE \"AntecedenteFamiliar\" (\n    id_antecedente_familiar uuid NOT NULL,\n    id_nna uuid NOT NULL,\n    id_adulto_responsable uuid,\n    fecha_antecedente_familiar date,\n    con_quien_vive character varying,\n    con_quien_vive_detalle character varying\n);",
    "CREATE TABLE \"AntecedenteIngreso\" (\n    id_antecedente_ingreso uuid NOT NULL,\n    id_nna uuid NOT NULL,\n    id_solicitante_ingreso uuid NOT NULL,\n    fecha_ingreso_residencia date,\n    orden_tribunal boolean NOT NULL,\n    fecha_causa date,\n    tribunal character varying,\n    materia character varying,\n    codigo_rit character varying,\n    codigo_ruc character varying\n);",
    "CREATE TABLE \"AntecedenteSalud\" (\n    id_antecedente_salud uuid NOT NULL,\n    id_nna uuid NOT NULL,\n    id_centro_salud uuid,\n    fecha_antecedente_salud date,\n    prevision character varying,\n    inscrito_en_centro_salud boolean NOT NULL\n);",
    "CREATE TABLE \"AntecedentesPenales\" (\n    id_antecedente_penal uuid NOT NULL,\n    id_familiar uuid NOT NULL,\n    descripcion character varying,\n    url_documento_adjunto character varying\n);",
    "CREATE TABLE \"BaremoE2P\" (\n    id_baremo_e2p uuid NOT NULL,\n    rango_etario character varying NOT NULL,\n    dimension character varying NOT NULL,\n    decil integer NOT NULL,\n    zona character varying NOT NULL,\n    puntaje_min integer NOT NULL,\n    puntaje_max integer NOT NULL,\n    CONSTRAINT \"BaremoE2P_decil_check\" CHECK (((decil >= 1) AND (decil <= 10))),\n    CONSTRAINT \"BaremoE2P_dimension_check\" CHECK (((dimension)::text = ANY ((ARRAY['Vinculares'::character varying, 'Formativas'::character varying, 'Protectoras'::character varying, 'Reflexivas'::character varying, 'Total'::character varying])::text[]))),\n    CONSTRAINT \"BaremoE2P_rango_etario_check\" CHECK (((rango_etario)::text = ANY ((ARRAY['0-3_meses'::character varying, '4-10_meses'::character varying, '11-18_meses'::character varying, '19-36_meses'::character varying, '3-5_anos'::character varying, '6-7_anos'::character varying, '8-12_anos'::character varying, '13-17_anos'::character varying])::text[]))),\n    CONSTRAINT \"BaremoE2P_zona_check\" CHECK (((zona)::text = ANY ((ARRAY['Baja frecuencia'::character varying, 'Frecuencia intermedia'::character varying, 'Alta frecuencia'::character varying])::text[])))\n);",
    "CREATE TABLE \"CentroSalud\" (\n    id_centro_salud uuid NOT NULL,\n    nombre character varying,\n    tipo_recinto character varying\n);",
    "CREATE TABLE \"ComentarioDimensionNCFAS\" (\n    id_comentario_ncfas uuid NOT NULL,\n    id_ncfas uuid NOT NULL,\n    letra_dimension character varying NOT NULL,\n    comentario character varying NOT NULL\n);",
    "CREATE TABLE \"DiscapacidadAdulto\" (\n    id_discapacidad_adulto uuid NOT NULL,\n    id_familiar uuid NOT NULL,\n    tipo character varying,\n    porcentaje_grado integer,\n    observacion character varying\n);",
    "CREATE TABLE \"DiscapacidadNNA\" (\n    id_discapacidad_nna uuid NOT NULL,\n    id_nna uuid NOT NULL,\n    tipo character varying,\n    porcentaje_grado integer,\n    observacion character varying\n);",
    "CREATE TABLE \"DocumentacionIngreso\" (\n    id_documentacion uuid NOT NULL,\n    id_nna uuid NOT NULL,\n    tipo_documento character varying,\n    estado_recepcion boolean NOT NULL,\n    fecha_recepcion date,\n    observacion character varying,\n    url_documentacion_ingreso character varying\n);",
    "CREATE TABLE \"E2P\" (\n    id_e2p uuid NOT NULL,\n    id_nna uuid NOT NULL,\n    id_familiar uuid NOT NULL,\n    fecha_evaluacion date NOT NULL,\n    edad_meses_evaluacion integer NOT NULL,\n    rango_etario character varying NOT NULL,\n    perfil_resultado_global character varying,\n    observacion character varying,\n    CONSTRAINT chk_edad_dentro_de_rango CHECK (((rango_etario)::text = ANY ((ARRAY['0-3_meses'::character varying, '4-10_meses'::character varying, '11-18_meses'::character varying, '19-36_meses'::character varying, '3-5_anos'::character varying, '6-7_anos'::character varying, '8-12_anos'::character varying, '13-17_anos'::character varying])::text[]))),\n    CONSTRAINT chk_perfil_resultado CHECK (((perfil_resultado_global)::text = ANY ((ARRAY['Riesgo'::character varying, 'Monitoreo'::character varying, 'Optimo'::character varying])::text[])))\n);",
    "CREATE TABLE \"EstablecimientoEducacional\" (\n    id_establecimiento_educacional uuid NOT NULL,\n    nombre character varying,\n    rbd integer\n);",
    "CREATE TABLE \"Familiar\" (\n    id_familiar uuid NOT NULL,\n    nombre character varying,\n    fecha_nacimiento date,\n    run character varying,\n    direccion character varying,\n    numero_telefono character varying,\n    tiene_antecedentes_penales boolean NOT NULL\n);",
    "CREATE TABLE \"HistorialConsumoAdulto\" (\n    id_historial_consumo_adulto uuid NOT NULL,\n    id_familiar uuid NOT NULL,\n    nombre_sustancia character varying,\n    estado_consumo character varying,\n    fecha_inicio date,\n    fecha_termino date,\n    en_tratamiento boolean NOT NULL\n);",
    "CREATE TABLE \"HistorialConsumoNNA\" (\n    id_historial_consumo_nna uuid NOT NULL,\n    id_nna uuid NOT NULL,\n    nombre_sustancia character varying,\n    consumo_indirecto_gestacional boolean NOT NULL,\n    estado_consumo character varying,\n    fecha_inicio date,\n    fecha_termino date,\n    en_tratamiento boolean NOT NULL\n);",
    "CREATE TABLE \"HistorialRedProteccional\" (\n    id_historial_red uuid NOT NULL,\n    id_nna uuid NOT NULL,\n    nombre_programa character varying,\n    fecha_ingreso date,\n    fecha_egreso date,\n    motivo_egreso character varying\n);",
    "CREATE TABLE \"InformeTribunal\" (\n    id_informe uuid NOT NULL,\n    id_nna uuid NOT NULL,\n    tipo_informe character varying,\n    fecha_vencimiento date,\n    fecha_envio_real date,\n    estado character varying,\n    url_documento character varying\n);",
    "CREATE TABLE \"ItemNCFAS\" (\n    id_item_ncfas uuid NOT NULL,\n    letra_dimension character varying NOT NULL,\n    nombre_dimension character varying NOT NULL,\n    numero_item integer NOT NULL,\n    nombre_item character varying NOT NULL,\n    definiciones json,\n    es_item_general boolean NOT NULL\n);",
    "CREATE TABLE \"NCFAS\" (\n    id_ncfas uuid NOT NULL,\n    id_nna uuid NOT NULL,\n    id_familiar uuid NOT NULL,\n    es_reunificacion boolean NOT NULL,\n    fecha_apertura date,\n    fecha_cierre date,\n    estado character varying,\n    observacion_general character varying\n);",
    "CREATE TABLE \"NNA\" (\n    id_nna uuid NOT NULL,\n    id_sis character varying,\n    nombre character varying,\n    run character varying,\n    fecha_nacimiento date,\n    sexo character varying,\n    etnia_declarada character varying,\n    nacionalidad character varying,\n    domicilio character varying,\n    poblacion_o_villa character varying,\n    comuna character varying,\n    region character varying\n);",
    "CREATE TABLE \"NotificacionFamiliar\" (\n    id_notificacion uuid NOT NULL,\n    id_despeje uuid NOT NULL,\n    id_familiar uuid NOT NULL,\n    fecha_envio_carta_1 date,\n    codigo_seguimiento_1 character varying,\n    estado_entrega_1 character varying,\n    fecha_recepcion_carta_1 date,\n    fecha_envio_carta_2 date,\n    codigo_seguimiento_2 character varying,\n    estado_entrega_2 character varying,\n    fecha_recepcion_carta_2 date,\n    resultado_contacto character varying,\n    fecha_respuesta date,\n    observacion character varying\n);",
    "CREATE TABLE \"PMF\" (\n    id_pmf uuid NOT NULL,\n    id_nna uuid NOT NULL,\n    id_familiar uuid NOT NULL,\n    fecha_evaluacion date,\n    fecha_proxima_evaluacion date,\n    resultado character varying,\n    observacion character varying\n);",
    "CREATE TABLE \"PreguntaE2P\" (\n    id_pregunta_e2p uuid NOT NULL,\n    rango_etario character varying NOT NULL,\n    numero_item integer NOT NULL,\n    texto_afirmacion character varying NOT NULL,\n    dimension character varying NOT NULL,\n    subdimension character varying,\n    CONSTRAINT chk_dimension CHECK (((dimension)::text = ANY ((ARRAY['Vinculares'::character varying, 'Formativas'::character varying, 'Protectoras'::character varying, 'Reflexivas'::character varying])::text[]))),\n    CONSTRAINT chk_edad_dentro_de_rango CHECK (((rango_etario)::text = ANY ((ARRAY['0-3_meses'::character varying, '4-10_meses'::character varying, '11-18_meses'::character varying, '19-36_meses'::character varying, '3-5_anos'::character varying, '6-7_anos'::character varying, '8-12_anos'::character varying, '13-17_anos'::character varying])::text[])))\n);",
    "CREATE TABLE \"PreguntaPMF\" (\n    id_pregunta_pmf uuid NOT NULL,\n    numero integer NOT NULL,\n    afirmacion character varying NOT NULL,\n    escala character varying\n);",
    "CREATE TABLE \"ProcesoDespejeFamiliar\" (\n    id_despeje uuid NOT NULL,\n    id_nna uuid NOT NULL,\n    fecha_solicitud_informe date,\n    fecha_recepcion_informe date,\n    estado character varying,\n    url_informe_hijo character varying\n);",
    "CREATE TABLE \"PuntajeE2P\" (\n    id_puntaje_e2p uuid NOT NULL,\n    id_e2p uuid NOT NULL,\n    dimension character varying NOT NULL,\n    puntaje_bruto integer NOT NULL,\n    decil integer,\n    zona character varying,\n    CONSTRAINT \"PuntajeE2P_dimension_check\" CHECK (((dimension)::text = ANY ((ARRAY['Vinculares'::character varying, 'Formativas'::character varying, 'Protectoras'::character varying, 'Reflexivas'::character varying, 'Total'::character varying])::text[]))),\n    CONSTRAINT \"PuntajeE2P_zona_check\" CHECK (((zona)::text = ANY ((ARRAY['Baja frecuencia'::character varying, 'Frecuencia intermedia'::character varying, 'Alta frecuencia'::character varying])::text[])))\n);",
    "CREATE TABLE \"RegistroCausalIngreso\" (\n    id_registro_causales uuid NOT NULL,\n    id_antecedente_ingreso uuid NOT NULL,\n    nombre_causal character varying,\n    descripcion_detallada character varying,\n    estado character varying\n);",
    "CREATE TABLE \"RegistroDerechoVulnerado\" (\n    id_registro_derecho_vulnerado uuid NOT NULL,\n    id_antecedente_ingreso uuid NOT NULL,\n    nombre_derecho character varying,\n    estado character varying\n);",
    "CREATE TABLE \"RegistroGrupoFamiliar\" (\n    id_registro_grupo_familiar uuid DEFAULT gen_random_uuid() NOT NULL,\n    id_familiar uuid NOT NULL,\n    id_antecedente_familiar uuid NOT NULL\n);",
    "CREATE TABLE \"RespuestaE2P\" (\n    id_respuesta_e2p uuid NOT NULL,\n    id_e2p uuid NOT NULL,\n    id_pregunta_e2p uuid NOT NULL,\n    valor_seleccionado integer NOT NULL,\n    puntaje_calculado integer NOT NULL,\n    CONSTRAINT \"RespuestaE2P_puntaje_calculado_check\" CHECK (((puntaje_calculado >= 0) AND (puntaje_calculado <= 4))),\n    CONSTRAINT \"RespuestaE2P_valor_seleccionado_check\" CHECK (((valor_seleccionado >= 0) AND (valor_seleccionado <= 4)))\n);",
    "CREATE TABLE \"RespuestaNCFAS\" (\n    id_respuesta_ncfas uuid NOT NULL,\n    id_ncfas uuid NOT NULL,\n    id_item_ncfas uuid NOT NULL,\n    momento_evaluacion character varying NOT NULL,\n    puntaje character varying NOT NULL,\n    CONSTRAINT chk_momento_ncfas CHECK (((momento_evaluacion)::text = ANY ((ARRAY['Ingreso'::character varying, 'Intermedio'::character varying, 'Cierre'::character varying])::text[]))),\n    CONSTRAINT chk_puntaje_ncfas CHECK (((puntaje)::text = ANY ((ARRAY['+2'::character varying, '+1'::character varying, '0'::character varying, '-1'::character varying, '-2'::character varying, '-3'::character varying, 'DN'::character varying, 'N/A'::character varying])::text[])))\n);",
    "CREATE TABLE \"RespuestaPMF\" (\n    id_respuesta_pmf uuid NOT NULL,\n    id_pmf uuid NOT NULL,\n    id_pregunta_pmf uuid NOT NULL,\n    respuesta boolean NOT NULL\n);",
    "CREATE TABLE \"SolicitanteIngreso\" (\n    id_solicitante_ingreso uuid NOT NULL,\n    nombre character varying,\n    categoria character varying,\n    ano_proyecto integer\n);",
    "CREATE TABLE \"Usuario\" (\n    id_usuario uuid NOT NULL,\n    email character varying NOT NULL,\n    hashed_password character varying NOT NULL,\n    nombre character varying,\n    is_active boolean NOT NULL,\n    created_at timestamp with time zone DEFAULT now() NOT NULL,\n    updated_at timestamp with time zone\n);",
    "CREATE TABLE \"VinculoFamiliar\" (\n    id_vinculo_familiar uuid NOT NULL,\n    id_nna uuid NOT NULL,\n    id_familiar uuid NOT NULL,\n    parentesco character varying\n);",
    "CREATE TABLE \"VinculoNNA\" (\n    id_vinculo_nna uuid DEFAULT gen_random_uuid() NOT NULL,\n    id_nna_1 uuid NOT NULL,\n    id_nna_2 uuid NOT NULL,\n    parentesco character varying,\n    CONSTRAINT chk_vinculo_nna_orden CHECK ((id_nna_1 < id_nna_2))\n);",
    "ALTER TABLE ONLY \"AntecedenteEscolar\"\n    ADD CONSTRAINT \"AntecedenteEscolar_pkey\" PRIMARY KEY (id_antecedente_escolar);",
    "ALTER TABLE ONLY \"AntecedenteFamiliar\"\n    ADD CONSTRAINT \"AntecedenteFamiliar_pkey\" PRIMARY KEY (id_antecedente_familiar);",
    "ALTER TABLE ONLY \"AntecedenteIngreso\"\n    ADD CONSTRAINT \"AntecedenteIngreso_pkey\" PRIMARY KEY (id_antecedente_ingreso);",
    "ALTER TABLE ONLY \"AntecedenteSalud\"\n    ADD CONSTRAINT \"AntecedenteSalud_pkey\" PRIMARY KEY (id_antecedente_salud);",
    "ALTER TABLE ONLY \"AntecedentesPenales\"\n    ADD CONSTRAINT \"AntecedentesPenales_pkey\" PRIMARY KEY (id_antecedente_penal);",
    "ALTER TABLE ONLY \"BaremoE2P\"\n    ADD CONSTRAINT \"BaremoE2P_pkey\" PRIMARY KEY (id_baremo_e2p);",
    "ALTER TABLE ONLY \"CentroSalud\"\n    ADD CONSTRAINT \"CentroSalud_pkey\" PRIMARY KEY (id_centro_salud);",
    "ALTER TABLE ONLY \"ComentarioDimensionNCFAS\"\n    ADD CONSTRAINT \"ComentarioDimensionNCFAS_pkey\" PRIMARY KEY (id_comentario_ncfas);",
    "ALTER TABLE ONLY \"DiscapacidadAdulto\"\n    ADD CONSTRAINT \"DiscapacidadAdulto_pkey\" PRIMARY KEY (id_discapacidad_adulto);",
    "ALTER TABLE ONLY \"DiscapacidadNNA\"\n    ADD CONSTRAINT \"DiscapacidadNNA_pkey\" PRIMARY KEY (id_discapacidad_nna);",
    "ALTER TABLE ONLY \"DocumentacionIngreso\"\n    ADD CONSTRAINT \"DocumentacionIngreso_pkey\" PRIMARY KEY (id_documentacion);",
    "ALTER TABLE ONLY \"E2P\"\n    ADD CONSTRAINT \"E2P_pkey\" PRIMARY KEY (id_e2p);",
    "ALTER TABLE ONLY \"EstablecimientoEducacional\"\n    ADD CONSTRAINT \"EstablecimientoEducacional_pkey\" PRIMARY KEY (id_establecimiento_educacional);",
    "ALTER TABLE ONLY \"Familiar\"\n    ADD CONSTRAINT \"Familiar_pkey\" PRIMARY KEY (id_familiar);",
    "ALTER TABLE ONLY \"HistorialConsumoAdulto\"\n    ADD CONSTRAINT \"HistorialConsumoAdulto_pkey\" PRIMARY KEY (id_historial_consumo_adulto);",
    "ALTER TABLE ONLY \"HistorialConsumoNNA\"\n    ADD CONSTRAINT \"HistorialConsumoNNA_pkey\" PRIMARY KEY (id_historial_consumo_nna);",
    "ALTER TABLE ONLY \"HistorialRedProteccional\"\n    ADD CONSTRAINT \"HistorialRedProteccional_pkey\" PRIMARY KEY (id_historial_red);",
    "ALTER TABLE ONLY \"InformeTribunal\"\n    ADD CONSTRAINT \"InformeTribunal_pkey\" PRIMARY KEY (id_informe);",
    "ALTER TABLE ONLY \"ItemNCFAS\"\n    ADD CONSTRAINT \"ItemNCFAS_pkey\" PRIMARY KEY (id_item_ncfas);",
    "ALTER TABLE ONLY \"NCFAS\"\n    ADD CONSTRAINT \"NCFAS_pkey\" PRIMARY KEY (id_ncfas);",
    "ALTER TABLE ONLY \"NNA\"\n    ADD CONSTRAINT \"NNA_id_sis_key\" UNIQUE (id_sis);",
    "ALTER TABLE ONLY \"NNA\"\n    ADD CONSTRAINT \"NNA_pkey\" PRIMARY KEY (id_nna);",
    "ALTER TABLE ONLY \"NNA\"\n    ADD CONSTRAINT \"NNA_run_key\" UNIQUE (run);",
    "ALTER TABLE ONLY \"NotificacionFamiliar\"\n    ADD CONSTRAINT \"NotificacionFamiliar_pkey\" PRIMARY KEY (id_notificacion);",
    "ALTER TABLE ONLY \"PMF\"\n    ADD CONSTRAINT \"PMF_pkey\" PRIMARY KEY (id_pmf);",
    "ALTER TABLE ONLY \"PreguntaE2P\"\n    ADD CONSTRAINT \"PreguntaE2P_pkey\" PRIMARY KEY (id_pregunta_e2p);",
    "ALTER TABLE ONLY \"PreguntaE2P\"\n    ADD CONSTRAINT \"PreguntaE2P_rango_etario_numero_item_key\" UNIQUE (rango_etario, numero_item);",
    "ALTER TABLE ONLY \"PreguntaPMF\"\n    ADD CONSTRAINT \"PreguntaPMF_pkey\" PRIMARY KEY (id_pregunta_pmf);",
    "ALTER TABLE ONLY \"ProcesoDespejeFamiliar\"\n    ADD CONSTRAINT \"ProcesoDespejeFamiliar_id_nna_key\" UNIQUE (id_nna);",
    "ALTER TABLE ONLY \"ProcesoDespejeFamiliar\"\n    ADD CONSTRAINT \"ProcesoDespejeFamiliar_pkey\" PRIMARY KEY (id_despeje);",
    "ALTER TABLE ONLY \"PuntajeE2P\"\n    ADD CONSTRAINT \"PuntajeE2P_id_e2p_dimension_key\" UNIQUE (id_e2p, dimension);",
    "ALTER TABLE ONLY \"PuntajeE2P\"\n    ADD CONSTRAINT \"PuntajeE2P_pkey\" PRIMARY KEY (id_puntaje_e2p);",
    "ALTER TABLE ONLY \"RegistroCausalIngreso\"\n    ADD CONSTRAINT \"RegistroCausalIngreso_pkey\" PRIMARY KEY (id_registro_causales);",
    "ALTER TABLE ONLY \"RegistroDerechoVulnerado\"\n    ADD CONSTRAINT \"RegistroDerechoVulnerado_pkey\" PRIMARY KEY (id_registro_derecho_vulnerado);",
    "ALTER TABLE ONLY \"RegistroGrupoFamiliar\"\n    ADD CONSTRAINT \"RegistroGrupoFamiliar_id_familiar_id_antecedente_familiar_key\" UNIQUE (id_familiar, id_antecedente_familiar);",
    "ALTER TABLE ONLY \"RegistroGrupoFamiliar\"\n    ADD CONSTRAINT \"RegistroGrupoFamiliar_pkey\" PRIMARY KEY (id_registro_grupo_familiar);",
    "ALTER TABLE ONLY \"RespuestaE2P\"\n    ADD CONSTRAINT \"RespuestaE2P_id_e2p_id_pregunta_e2p_key\" UNIQUE (id_e2p, id_pregunta_e2p);",
    "ALTER TABLE ONLY \"RespuestaE2P\"\n    ADD CONSTRAINT \"RespuestaE2P_pkey\" PRIMARY KEY (id_respuesta_e2p);",
    "ALTER TABLE ONLY \"RespuestaNCFAS\"\n    ADD CONSTRAINT \"RespuestaNCFAS_pkey\" PRIMARY KEY (id_respuesta_ncfas);",
    "ALTER TABLE ONLY \"RespuestaPMF\"\n    ADD CONSTRAINT \"RespuestaPMF_pkey\" PRIMARY KEY (id_respuesta_pmf);",
    "ALTER TABLE ONLY \"SolicitanteIngreso\"\n    ADD CONSTRAINT \"SolicitanteIngreso_pkey\" PRIMARY KEY (id_solicitante_ingreso);",
    "ALTER TABLE ONLY \"Usuario\"\n    ADD CONSTRAINT \"Usuario_pkey\" PRIMARY KEY (id_usuario);",
    "ALTER TABLE ONLY \"VinculoFamiliar\"\n    ADD CONSTRAINT \"VinculoFamiliar_pkey\" PRIMARY KEY (id_vinculo_familiar);",
    "ALTER TABLE ONLY \"VinculoNNA\"\n    ADD CONSTRAINT \"VinculoNNA_id_nna_1_id_nna_2_key\" UNIQUE (id_nna_1, id_nna_2);",
    "ALTER TABLE ONLY \"VinculoNNA\"\n    ADD CONSTRAINT \"VinculoNNA_pkey\" PRIMARY KEY (id_vinculo_nna);",
    "ALTER TABLE ONLY \"ComentarioDimensionNCFAS\"\n    ADD CONSTRAINT uq_comentario_ncfas_dimension UNIQUE (id_ncfas, letra_dimension);",
    "ALTER TABLE ONLY \"RespuestaNCFAS\"\n    ADD CONSTRAINT uq_respuesta_ncfas_item_momento UNIQUE (id_ncfas, id_item_ncfas, momento_evaluacion);",
    "CREATE UNIQUE INDEX \"ix_Usuario_email\" ON \"Usuario\" USING btree (email);",
    "ALTER TABLE ONLY \"AntecedenteEscolar\"\n    ADD CONSTRAINT \"AntecedenteEscolar_id_establecimiento_educacional_fkey\" FOREIGN KEY (id_establecimiento_educacional) REFERENCES \"EstablecimientoEducacional\"(id_establecimiento_educacional);",
    "ALTER TABLE ONLY \"AntecedenteEscolar\"\n    ADD CONSTRAINT \"AntecedenteEscolar_id_nna_fkey\" FOREIGN KEY (id_nna) REFERENCES \"NNA\"(id_nna);",
    "ALTER TABLE ONLY \"AntecedenteFamiliar\"\n    ADD CONSTRAINT \"AntecedenteFamiliar_id_adulto_responsable_fkey\" FOREIGN KEY (id_adulto_responsable) REFERENCES \"Familiar\"(id_familiar);",
    "ALTER TABLE ONLY \"AntecedenteFamiliar\"\n    ADD CONSTRAINT \"AntecedenteFamiliar_id_nna_fkey\" FOREIGN KEY (id_nna) REFERENCES \"NNA\"(id_nna);",
    "ALTER TABLE ONLY \"AntecedenteIngreso\"\n    ADD CONSTRAINT \"AntecedenteIngreso_id_nna_fkey\" FOREIGN KEY (id_nna) REFERENCES \"NNA\"(id_nna);",
    "ALTER TABLE ONLY \"AntecedenteIngreso\"\n    ADD CONSTRAINT \"AntecedenteIngreso_id_solicitante_ingreso_fkey\" FOREIGN KEY (id_solicitante_ingreso) REFERENCES \"SolicitanteIngreso\"(id_solicitante_ingreso);",
    "ALTER TABLE ONLY \"AntecedenteSalud\"\n    ADD CONSTRAINT \"AntecedenteSalud_id_centro_salud_fkey\" FOREIGN KEY (id_centro_salud) REFERENCES \"CentroSalud\"(id_centro_salud);",
    "ALTER TABLE ONLY \"AntecedenteSalud\"\n    ADD CONSTRAINT \"AntecedenteSalud_id_nna_fkey\" FOREIGN KEY (id_nna) REFERENCES \"NNA\"(id_nna);",
    "ALTER TABLE ONLY \"AntecedentesPenales\"\n    ADD CONSTRAINT \"AntecedentesPenales_id_familiar_fkey\" FOREIGN KEY (id_familiar) REFERENCES \"Familiar\"(id_familiar);",
    "ALTER TABLE ONLY \"ComentarioDimensionNCFAS\"\n    ADD CONSTRAINT \"ComentarioDimensionNCFAS_id_ncfas_fkey\" FOREIGN KEY (id_ncfas) REFERENCES \"NCFAS\"(id_ncfas) ON DELETE CASCADE;",
    "ALTER TABLE ONLY \"DiscapacidadAdulto\"\n    ADD CONSTRAINT \"DiscapacidadAdulto_id_familiar_fkey\" FOREIGN KEY (id_familiar) REFERENCES \"Familiar\"(id_familiar);",
    "ALTER TABLE ONLY \"DiscapacidadNNA\"\n    ADD CONSTRAINT \"DiscapacidadNNA_id_nna_fkey\" FOREIGN KEY (id_nna) REFERENCES \"NNA\"(id_nna);",
    "ALTER TABLE ONLY \"DocumentacionIngreso\"\n    ADD CONSTRAINT \"DocumentacionIngreso_id_nna_fkey\" FOREIGN KEY (id_nna) REFERENCES \"NNA\"(id_nna);",
    "ALTER TABLE ONLY \"E2P\"\n    ADD CONSTRAINT \"E2P_id_familiar_fkey\" FOREIGN KEY (id_familiar) REFERENCES \"Familiar\"(id_familiar);",
    "ALTER TABLE ONLY \"E2P\"\n    ADD CONSTRAINT \"E2P_id_nna_fkey\" FOREIGN KEY (id_nna) REFERENCES \"NNA\"(id_nna);",
    "ALTER TABLE ONLY \"HistorialConsumoAdulto\"\n    ADD CONSTRAINT \"HistorialConsumoAdulto_id_familiar_fkey\" FOREIGN KEY (id_familiar) REFERENCES \"Familiar\"(id_familiar);",
    "ALTER TABLE ONLY \"HistorialConsumoNNA\"\n    ADD CONSTRAINT \"HistorialConsumoNNA_id_nna_fkey\" FOREIGN KEY (id_nna) REFERENCES \"NNA\"(id_nna);",
    "ALTER TABLE ONLY \"HistorialRedProteccional\"\n    ADD CONSTRAINT \"HistorialRedProteccional_id_nna_fkey\" FOREIGN KEY (id_nna) REFERENCES \"NNA\"(id_nna);",
    "ALTER TABLE ONLY \"InformeTribunal\"\n    ADD CONSTRAINT \"InformeTribunal_id_nna_fkey\" FOREIGN KEY (id_nna) REFERENCES \"NNA\"(id_nna);",
    "ALTER TABLE ONLY \"NCFAS\"\n    ADD CONSTRAINT \"NCFAS_id_familiar_fkey\" FOREIGN KEY (id_familiar) REFERENCES \"Familiar\"(id_familiar);",
    "ALTER TABLE ONLY \"NCFAS\"\n    ADD CONSTRAINT \"NCFAS_id_nna_fkey\" FOREIGN KEY (id_nna) REFERENCES \"NNA\"(id_nna);",
    "ALTER TABLE ONLY \"NotificacionFamiliar\"\n    ADD CONSTRAINT \"NotificacionFamiliar_id_despeje_fkey\" FOREIGN KEY (id_despeje) REFERENCES \"ProcesoDespejeFamiliar\"(id_despeje);",
    "ALTER TABLE ONLY \"NotificacionFamiliar\"\n    ADD CONSTRAINT \"NotificacionFamiliar_id_familiar_fkey\" FOREIGN KEY (id_familiar) REFERENCES \"Familiar\"(id_familiar);",
    "ALTER TABLE ONLY \"PMF\"\n    ADD CONSTRAINT \"PMF_id_familiar_fkey\" FOREIGN KEY (id_familiar) REFERENCES \"Familiar\"(id_familiar);",
    "ALTER TABLE ONLY \"PMF\"\n    ADD CONSTRAINT \"PMF_id_nna_fkey\" FOREIGN KEY (id_nna) REFERENCES \"NNA\"(id_nna);",
    "ALTER TABLE ONLY \"ProcesoDespejeFamiliar\"\n    ADD CONSTRAINT \"ProcesoDespejeFamiliar_id_nna_fkey\" FOREIGN KEY (id_nna) REFERENCES \"NNA\"(id_nna);",
    "ALTER TABLE ONLY \"PuntajeE2P\"\n    ADD CONSTRAINT \"PuntajeE2P_id_e2p_fkey\" FOREIGN KEY (id_e2p) REFERENCES \"E2P\"(id_e2p);",
    "ALTER TABLE ONLY \"RegistroCausalIngreso\"\n    ADD CONSTRAINT \"RegistroCausalIngreso_id_antecedente_ingreso_fkey\" FOREIGN KEY (id_antecedente_ingreso) REFERENCES \"AntecedenteIngreso\"(id_antecedente_ingreso);",
    "ALTER TABLE ONLY \"RegistroDerechoVulnerado\"\n    ADD CONSTRAINT \"RegistroDerechoVulnerado_id_antecedente_ingreso_fkey\" FOREIGN KEY (id_antecedente_ingreso) REFERENCES \"AntecedenteIngreso\"(id_antecedente_ingreso);",
    "ALTER TABLE ONLY \"RegistroGrupoFamiliar\"\n    ADD CONSTRAINT \"RegistroGrupoFamiliar_id_antecedente_familiar_fkey\" FOREIGN KEY (id_antecedente_familiar) REFERENCES \"AntecedenteFamiliar\"(id_antecedente_familiar);",
    "ALTER TABLE ONLY \"RegistroGrupoFamiliar\"\n    ADD CONSTRAINT \"RegistroGrupoFamiliar_id_familiar_fkey\" FOREIGN KEY (id_familiar) REFERENCES \"Familiar\"(id_familiar);",
    "ALTER TABLE ONLY \"RespuestaE2P\"\n    ADD CONSTRAINT \"RespuestaE2P_id_e2p_fkey\" FOREIGN KEY (id_e2p) REFERENCES \"E2P\"(id_e2p);",
    "ALTER TABLE ONLY \"RespuestaE2P\"\n    ADD CONSTRAINT \"RespuestaE2P_id_pregunta_e2p_fkey\" FOREIGN KEY (id_pregunta_e2p) REFERENCES \"PreguntaE2P\"(id_pregunta_e2p);",
    "ALTER TABLE ONLY \"RespuestaNCFAS\"\n    ADD CONSTRAINT \"RespuestaNCFAS_id_item_ncfas_fkey\" FOREIGN KEY (id_item_ncfas) REFERENCES \"ItemNCFAS\"(id_item_ncfas);",
    "ALTER TABLE ONLY \"RespuestaNCFAS\"\n    ADD CONSTRAINT \"RespuestaNCFAS_id_ncfas_fkey\" FOREIGN KEY (id_ncfas) REFERENCES \"NCFAS\"(id_ncfas) ON DELETE CASCADE;",
    "ALTER TABLE ONLY \"RespuestaPMF\"\n    ADD CONSTRAINT \"RespuestaPMF_id_pmf_fkey\" FOREIGN KEY (id_pmf) REFERENCES \"PMF\"(id_pmf) ON DELETE CASCADE;",
    "ALTER TABLE ONLY \"RespuestaPMF\"\n    ADD CONSTRAINT \"RespuestaPMF_id_pregunta_pmf_fkey\" FOREIGN KEY (id_pregunta_pmf) REFERENCES \"PreguntaPMF\"(id_pregunta_pmf);",
    "ALTER TABLE ONLY \"VinculoFamiliar\"\n    ADD CONSTRAINT \"VinculoFamiliar_id_familiar_fkey\" FOREIGN KEY (id_familiar) REFERENCES \"Familiar\"(id_familiar);",
    "ALTER TABLE ONLY \"VinculoFamiliar\"\n    ADD CONSTRAINT \"VinculoFamiliar_id_nna_fkey\" FOREIGN KEY (id_nna) REFERENCES \"NNA\"(id_nna);",
    "ALTER TABLE ONLY \"VinculoNNA\"\n    ADD CONSTRAINT \"VinculoNNA_id_nna_1_fkey\" FOREIGN KEY (id_nna_1) REFERENCES \"NNA\"(id_nna);",
    "ALTER TABLE ONLY \"VinculoNNA\"\n    ADD CONSTRAINT \"VinculoNNA_id_nna_2_fkey\" FOREIGN KEY (id_nna_2) REFERENCES \"NNA\"(id_nna);",
)

# Orden inverso al de creacion.
_DROP_SQL: tuple[str, ...] = (
    "DROP TABLE IF EXISTS \"VinculoNNA\" CASCADE;",
    "DROP TABLE IF EXISTS \"VinculoFamiliar\" CASCADE;",
    "DROP TABLE IF EXISTS \"Usuario\" CASCADE;",
    "DROP TABLE IF EXISTS \"SolicitanteIngreso\" CASCADE;",
    "DROP TABLE IF EXISTS \"RespuestaPMF\" CASCADE;",
    "DROP TABLE IF EXISTS \"RespuestaNCFAS\" CASCADE;",
    "DROP TABLE IF EXISTS \"RespuestaE2P\" CASCADE;",
    "DROP TABLE IF EXISTS \"RegistroGrupoFamiliar\" CASCADE;",
    "DROP TABLE IF EXISTS \"RegistroDerechoVulnerado\" CASCADE;",
    "DROP TABLE IF EXISTS \"RegistroCausalIngreso\" CASCADE;",
    "DROP TABLE IF EXISTS \"PuntajeE2P\" CASCADE;",
    "DROP TABLE IF EXISTS \"ProcesoDespejeFamiliar\" CASCADE;",
    "DROP TABLE IF EXISTS \"PreguntaPMF\" CASCADE;",
    "DROP TABLE IF EXISTS \"PreguntaE2P\" CASCADE;",
    "DROP TABLE IF EXISTS \"PMF\" CASCADE;",
    "DROP TABLE IF EXISTS \"NotificacionFamiliar\" CASCADE;",
    "DROP TABLE IF EXISTS \"NNA\" CASCADE;",
    "DROP TABLE IF EXISTS \"NCFAS\" CASCADE;",
    "DROP TABLE IF EXISTS \"ItemNCFAS\" CASCADE;",
    "DROP TABLE IF EXISTS \"InformeTribunal\" CASCADE;",
    "DROP TABLE IF EXISTS \"HistorialRedProteccional\" CASCADE;",
    "DROP TABLE IF EXISTS \"HistorialConsumoNNA\" CASCADE;",
    "DROP TABLE IF EXISTS \"HistorialConsumoAdulto\" CASCADE;",
    "DROP TABLE IF EXISTS \"Familiar\" CASCADE;",
    "DROP TABLE IF EXISTS \"EstablecimientoEducacional\" CASCADE;",
    "DROP TABLE IF EXISTS \"E2P\" CASCADE;",
    "DROP TABLE IF EXISTS \"DocumentacionIngreso\" CASCADE;",
    "DROP TABLE IF EXISTS \"DiscapacidadNNA\" CASCADE;",
    "DROP TABLE IF EXISTS \"DiscapacidadAdulto\" CASCADE;",
    "DROP TABLE IF EXISTS \"ComentarioDimensionNCFAS\" CASCADE;",
    "DROP TABLE IF EXISTS \"CentroSalud\" CASCADE;",
    "DROP TABLE IF EXISTS \"BaremoE2P\" CASCADE;",
    "DROP TABLE IF EXISTS \"AntecedentesPenales\" CASCADE;",
    "DROP TABLE IF EXISTS \"AntecedenteSalud\" CASCADE;",
    "DROP TABLE IF EXISTS \"AntecedenteIngreso\" CASCADE;",
    "DROP TABLE IF EXISTS \"AntecedenteFamiliar\" CASCADE;",
    "DROP TABLE IF EXISTS \"AntecedenteEscolar\" CASCADE;",
)


def upgrade() -> None:
    for statement in _BASELINE_SQL:
        op.execute(statement)


def downgrade() -> None:
    for statement in _DROP_SQL:
        op.execute(statement)
