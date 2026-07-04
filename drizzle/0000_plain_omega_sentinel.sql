CREATE TYPE "public"."estado_informe" AS ENUM('Pendiente', 'Enviado', 'Vencido');--> statement-breakpoint
CREATE TYPE "public"."tipo_informe" AS ENUM('Diagnóstico', 'Seguimiento');--> statement-breakpoint
CREATE TABLE "AntecedenteEscolar" (
	"id_antecedente_escolar" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_nna" uuid NOT NULL,
	"id_establecimiento_educacional" uuid,
	"fecha_antecedente_escolar" date,
	"ultimo_ano_cursado" integer,
	"escolarizado" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AntecedenteFamiliar" (
	"id_antecedente_familiar" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_nna" uuid NOT NULL,
	"id_adulto_responsable" uuid,
	"fecha_antecedente_familiar" date,
	"con_quien_vive" text,
	"con_quien_vive_detalle" text
);
--> statement-breakpoint
CREATE TABLE "AntecedenteIngreso" (
	"id_antecedente_ingreso" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_nna" uuid NOT NULL,
	"id_solicitante_ingreso" uuid,
	"fecha_ingreso_residencia" date,
	"orden_tribunal" boolean DEFAULT false NOT NULL,
	"fecha_causa" date,
	"tribunal" text,
	"materia" text,
	"codigo_rit" text,
	"codigo_ruc" text
);
--> statement-breakpoint
CREATE TABLE "AntecedenteSalud" (
	"id_antecedente_salud" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_nna" uuid NOT NULL,
	"id_centro_salud" uuid,
	"fecha_antecedente_salud" date,
	"prevision" text,
	"inscrito_en_centro_salud" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AntecedentesPenales" (
	"id_antecedente_penal" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_familiar" uuid NOT NULL,
	"descripcion" text,
	"url_documento_adjunto" text
);
--> statement-breakpoint
CREATE TABLE "BaremoE2P" (
	"id_baremo_e2p" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rango_etario" text NOT NULL,
	"dimension" text NOT NULL,
	"decil" integer NOT NULL,
	"zona" text NOT NULL,
	"puntaje_min" integer NOT NULL,
	"puntaje_max" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CentroSalud" (
	"id_centro_salud" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text,
	"tipo_recinto" text
);
--> statement-breakpoint
CREATE TABLE "ComentarioDimensionNCFAS" (
	"id_comentario_ncfas" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_ncfas" uuid NOT NULL,
	"letra_dimension" text NOT NULL,
	"comentario" text
);
--> statement-breakpoint
CREATE TABLE "DiscapacidadAdulto" (
	"id_discapacidad_adulto" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_familiar" uuid NOT NULL,
	"tipo" text,
	"porcentaje_grado" integer,
	"observacion" text
);
--> statement-breakpoint
CREATE TABLE "DiscapacidadNNA" (
	"id_discapacidad_nna" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_nna" uuid NOT NULL,
	"tipo" text,
	"porcentaje_grado" integer,
	"observacion" text
);
--> statement-breakpoint
CREATE TABLE "DocumentacionIngreso" (
	"id_documentacion" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_nna" uuid NOT NULL,
	"tipo_documento" text,
	"estado_recepcion" boolean DEFAULT false NOT NULL,
	"fecha_recepcion" date,
	"observacion" text,
	"url_documentacion_ingreso" text
);
--> statement-breakpoint
CREATE TABLE "E2P" (
	"id_e2p" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_nna" uuid NOT NULL,
	"id_familiar" uuid NOT NULL,
	"fecha_evaluacion" date,
	"edad_meses_evaluacion" integer NOT NULL,
	"rango_etario" text NOT NULL,
	"perfil_resultado_global" text,
	"observacion" text
);
--> statement-breakpoint
CREATE TABLE "EstablecimientoEducacional" (
	"id_establecimiento_educacional" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text,
	"rbd" integer
);
--> statement-breakpoint
CREATE TABLE "Familiar" (
	"id_familiar" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text,
	"fecha_nacimiento" date,
	"run" text,
	"direccion" text,
	"numero_telefono" text,
	"tiene_antecedentes_penales" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "HistorialConsumoAdulto" (
	"id_historial_consumo_adulto" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_familiar" uuid NOT NULL,
	"nombre_sustancia" text,
	"estado_consumo" text,
	"fecha_inicio" date,
	"fecha_termino" date,
	"en_tratamiento" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "HistorialConsumoNNA" (
	"id_historial_consumo_nna" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_nna" uuid NOT NULL,
	"nombre_sustancia" text,
	"consumo_indirecto_gestacional" boolean DEFAULT false NOT NULL,
	"estado_consumo" text,
	"fecha_inicio" date,
	"fecha_termino" date,
	"en_tratamiento" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "HistorialRedProteccional" (
	"id_historial_red" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_nna" uuid NOT NULL,
	"nombre_programa" text,
	"fecha_ingreso" date,
	"fecha_egreso" date,
	"motivo_egreso" text
);
--> statement-breakpoint
CREATE TABLE "InformeTribunal" (
	"id_informe" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_nna" uuid NOT NULL,
	"tipo_informe" "tipo_informe",
	"fecha_vencimiento" date,
	"fecha_envio_real" date,
	"estado" "estado_informe"
);
--> statement-breakpoint
CREATE TABLE "ItemNCFAS" (
	"id_item_ncfas" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"letra_dimension" text NOT NULL,
	"nombre_dimension" text NOT NULL,
	"numero_item" integer NOT NULL,
	"nombre_item" text NOT NULL,
	"definiciones" jsonb,
	"es_item_general" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "NCFAS" (
	"id_ncfas" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_nna" uuid NOT NULL,
	"id_familiar" uuid NOT NULL,
	"es_reunificacion" boolean DEFAULT false NOT NULL,
	"fecha_apertura" date,
	"fecha_cierre" date,
	"estado" text,
	"observacion_general" text
);
--> statement-breakpoint
CREATE TABLE "NNA" (
	"id_nna" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_sis" text,
	"nombre" text,
	"run" text,
	"fecha_nacimiento" date,
	"sexo" text,
	"etnia_declarada" text,
	"nacionalidad" text,
	"domicilio" text,
	"poblacion_o_villa" text,
	"comuna" text,
	"region" text,
	CONSTRAINT "NNA_id_sis_unique" UNIQUE("id_sis")
);
--> statement-breakpoint
CREATE TABLE "NotificacionFamiliar" (
	"id_notificacion" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_despeje" uuid NOT NULL,
	"id_familiar" uuid NOT NULL,
	"fecha_envio_carta_1" date,
	"codigo_seguimiento_1" text,
	"estado_entrega_1" text,
	"fecha_recepcion_carta_1" date,
	"fecha_envio_carta_2" date,
	"codigo_seguimiento_2" text,
	"estado_entrega_2" text,
	"fecha_recepcion_carta_2" date,
	"resultado_contacto" text,
	"fecha_respuesta" date,
	"observacion" text
);
--> statement-breakpoint
CREATE TABLE "PMF" (
	"id_pmf" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_nna" uuid NOT NULL,
	"id_familiar" uuid NOT NULL,
	"fecha_evaluacion" date,
	"fecha_proxima_evaluacion" date,
	"resultado" text,
	"observacion" text
);
--> statement-breakpoint
CREATE TABLE "PreguntaE2P" (
	"id_pregunta_e2p" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rango_etario" text NOT NULL,
	"numero_item" integer NOT NULL,
	"texto_afirmacion" text NOT NULL,
	"dimension" text NOT NULL,
	"subdimension" text
);
--> statement-breakpoint
CREATE TABLE "PreguntaPMF" (
	"id_pregunta_pmf" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" integer NOT NULL,
	"afirmacion" text NOT NULL,
	"escala" text
);
--> statement-breakpoint
CREATE TABLE "ProcesoDespejeFamiliar" (
	"id_despeje" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_nna" uuid NOT NULL,
	"fecha_solicitud_informe" date,
	"fecha_recepcion_informe" date,
	"estado" text,
	"url_informe_hijo" text,
	CONSTRAINT "ProcesoDespejeFamiliar_id_nna_unique" UNIQUE("id_nna")
);
--> statement-breakpoint
CREATE TABLE "PuntajeE2P" (
	"id_puntaje_e2p" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_e2p" uuid NOT NULL,
	"dimension" text NOT NULL,
	"puntaje_bruto" integer NOT NULL,
	"decil" integer,
	"zona" text
);
--> statement-breakpoint
CREATE TABLE "RegistroCausalIngreso" (
	"id_registro_causales" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_antecedente_ingreso" uuid NOT NULL,
	"nombre_causal" text,
	"descripcion_detallada" text,
	"estado" text
);
--> statement-breakpoint
CREATE TABLE "RegistroDerechoVulnerado" (
	"id_registro_derecho_vulnerado" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_antecedente_ingreso" uuid NOT NULL,
	"nombre_derecho" text,
	"estado" text
);
--> statement-breakpoint
CREATE TABLE "RegistroGrupoFamiliar" (
	"id_registro_grupo_familiar" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_familiar" uuid NOT NULL,
	"id_antecedente_familiar" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "RespuestaE2P" (
	"id_respuesta_e2p" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_e2p" uuid NOT NULL,
	"id_pregunta_e2p" uuid NOT NULL,
	"valor_seleccionado" integer NOT NULL,
	"puntaje_calculado" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "RespuestaNCFAS" (
	"id_respuesta_ncfas" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_ncfas" uuid NOT NULL,
	"id_item_ncfas" uuid NOT NULL,
	"momento_evaluacion" text NOT NULL,
	"puntaje" text NOT NULL,
	CONSTRAINT "chk_momento_ncfas" CHECK ("RespuestaNCFAS"."momento_evaluacion" in ('Ingreso', 'Intermedio', 'Cierre')),
	CONSTRAINT "chk_puntaje_ncfas" CHECK ("RespuestaNCFAS"."puntaje" in ('+2', '+1', '0', '-1', '-2', '-3', 'DN', 'N/A'))
);
--> statement-breakpoint
CREATE TABLE "RespuestaPMF" (
	"id_respuesta_pmf" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_pmf" uuid NOT NULL,
	"id_pregunta_pmf" uuid NOT NULL,
	"respuesta" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SolicitanteIngreso" (
	"id_solicitante_ingreso" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text,
	"categoria" text,
	"ano_proyecto" integer
);
--> statement-breakpoint
CREATE TABLE "VinculoFamiliar" (
	"id_vinculo_familiar" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_nna" uuid NOT NULL,
	"id_familiar" uuid NOT NULL,
	"parentesco" text
);
--> statement-breakpoint
CREATE TABLE "VinculoNNA" (
	"id_vinculo_nna" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_nna_1" uuid NOT NULL,
	"id_nna_2" uuid NOT NULL,
	"parentesco" text,
	CONSTRAINT "chk_vinculo_nna_orden" CHECK ("VinculoNNA"."id_nna_1" < "VinculoNNA"."id_nna_2")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "AntecedenteEscolar" ADD CONSTRAINT "AntecedenteEscolar_id_nna_NNA_id_nna_fk" FOREIGN KEY ("id_nna") REFERENCES "public"."NNA"("id_nna") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AntecedenteEscolar" ADD CONSTRAINT "AntecedenteEscolar_id_establecimiento_educacional_EstablecimientoEducacional_id_establecimiento_educacional_fk" FOREIGN KEY ("id_establecimiento_educacional") REFERENCES "public"."EstablecimientoEducacional"("id_establecimiento_educacional") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AntecedenteFamiliar" ADD CONSTRAINT "AntecedenteFamiliar_id_nna_NNA_id_nna_fk" FOREIGN KEY ("id_nna") REFERENCES "public"."NNA"("id_nna") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AntecedenteFamiliar" ADD CONSTRAINT "AntecedenteFamiliar_id_adulto_responsable_Familiar_id_familiar_fk" FOREIGN KEY ("id_adulto_responsable") REFERENCES "public"."Familiar"("id_familiar") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AntecedenteIngreso" ADD CONSTRAINT "AntecedenteIngreso_id_nna_NNA_id_nna_fk" FOREIGN KEY ("id_nna") REFERENCES "public"."NNA"("id_nna") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AntecedenteIngreso" ADD CONSTRAINT "AntecedenteIngreso_id_solicitante_ingreso_SolicitanteIngreso_id_solicitante_ingreso_fk" FOREIGN KEY ("id_solicitante_ingreso") REFERENCES "public"."SolicitanteIngreso"("id_solicitante_ingreso") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AntecedenteSalud" ADD CONSTRAINT "AntecedenteSalud_id_nna_NNA_id_nna_fk" FOREIGN KEY ("id_nna") REFERENCES "public"."NNA"("id_nna") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AntecedenteSalud" ADD CONSTRAINT "AntecedenteSalud_id_centro_salud_CentroSalud_id_centro_salud_fk" FOREIGN KEY ("id_centro_salud") REFERENCES "public"."CentroSalud"("id_centro_salud") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AntecedentesPenales" ADD CONSTRAINT "AntecedentesPenales_id_familiar_Familiar_id_familiar_fk" FOREIGN KEY ("id_familiar") REFERENCES "public"."Familiar"("id_familiar") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ComentarioDimensionNCFAS" ADD CONSTRAINT "ComentarioDimensionNCFAS_id_ncfas_NCFAS_id_ncfas_fk" FOREIGN KEY ("id_ncfas") REFERENCES "public"."NCFAS"("id_ncfas") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DiscapacidadAdulto" ADD CONSTRAINT "DiscapacidadAdulto_id_familiar_Familiar_id_familiar_fk" FOREIGN KEY ("id_familiar") REFERENCES "public"."Familiar"("id_familiar") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DiscapacidadNNA" ADD CONSTRAINT "DiscapacidadNNA_id_nna_NNA_id_nna_fk" FOREIGN KEY ("id_nna") REFERENCES "public"."NNA"("id_nna") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DocumentacionIngreso" ADD CONSTRAINT "DocumentacionIngreso_id_nna_NNA_id_nna_fk" FOREIGN KEY ("id_nna") REFERENCES "public"."NNA"("id_nna") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "E2P" ADD CONSTRAINT "E2P_id_nna_NNA_id_nna_fk" FOREIGN KEY ("id_nna") REFERENCES "public"."NNA"("id_nna") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "E2P" ADD CONSTRAINT "E2P_id_familiar_Familiar_id_familiar_fk" FOREIGN KEY ("id_familiar") REFERENCES "public"."Familiar"("id_familiar") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "HistorialConsumoAdulto" ADD CONSTRAINT "HistorialConsumoAdulto_id_familiar_Familiar_id_familiar_fk" FOREIGN KEY ("id_familiar") REFERENCES "public"."Familiar"("id_familiar") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "HistorialConsumoNNA" ADD CONSTRAINT "HistorialConsumoNNA_id_nna_NNA_id_nna_fk" FOREIGN KEY ("id_nna") REFERENCES "public"."NNA"("id_nna") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "HistorialRedProteccional" ADD CONSTRAINT "HistorialRedProteccional_id_nna_NNA_id_nna_fk" FOREIGN KEY ("id_nna") REFERENCES "public"."NNA"("id_nna") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "InformeTribunal" ADD CONSTRAINT "InformeTribunal_id_nna_NNA_id_nna_fk" FOREIGN KEY ("id_nna") REFERENCES "public"."NNA"("id_nna") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "NCFAS" ADD CONSTRAINT "NCFAS_id_nna_NNA_id_nna_fk" FOREIGN KEY ("id_nna") REFERENCES "public"."NNA"("id_nna") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "NCFAS" ADD CONSTRAINT "NCFAS_id_familiar_Familiar_id_familiar_fk" FOREIGN KEY ("id_familiar") REFERENCES "public"."Familiar"("id_familiar") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "NotificacionFamiliar" ADD CONSTRAINT "NotificacionFamiliar_id_despeje_ProcesoDespejeFamiliar_id_despeje_fk" FOREIGN KEY ("id_despeje") REFERENCES "public"."ProcesoDespejeFamiliar"("id_despeje") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "NotificacionFamiliar" ADD CONSTRAINT "NotificacionFamiliar_id_familiar_Familiar_id_familiar_fk" FOREIGN KEY ("id_familiar") REFERENCES "public"."Familiar"("id_familiar") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PMF" ADD CONSTRAINT "PMF_id_nna_NNA_id_nna_fk" FOREIGN KEY ("id_nna") REFERENCES "public"."NNA"("id_nna") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PMF" ADD CONSTRAINT "PMF_id_familiar_Familiar_id_familiar_fk" FOREIGN KEY ("id_familiar") REFERENCES "public"."Familiar"("id_familiar") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ProcesoDespejeFamiliar" ADD CONSTRAINT "ProcesoDespejeFamiliar_id_nna_NNA_id_nna_fk" FOREIGN KEY ("id_nna") REFERENCES "public"."NNA"("id_nna") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PuntajeE2P" ADD CONSTRAINT "PuntajeE2P_id_e2p_E2P_id_e2p_fk" FOREIGN KEY ("id_e2p") REFERENCES "public"."E2P"("id_e2p") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RegistroCausalIngreso" ADD CONSTRAINT "RegistroCausalIngreso_id_antecedente_ingreso_AntecedenteIngreso_id_antecedente_ingreso_fk" FOREIGN KEY ("id_antecedente_ingreso") REFERENCES "public"."AntecedenteIngreso"("id_antecedente_ingreso") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RegistroDerechoVulnerado" ADD CONSTRAINT "RegistroDerechoVulnerado_id_antecedente_ingreso_AntecedenteIngreso_id_antecedente_ingreso_fk" FOREIGN KEY ("id_antecedente_ingreso") REFERENCES "public"."AntecedenteIngreso"("id_antecedente_ingreso") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RegistroGrupoFamiliar" ADD CONSTRAINT "RegistroGrupoFamiliar_id_familiar_Familiar_id_familiar_fk" FOREIGN KEY ("id_familiar") REFERENCES "public"."Familiar"("id_familiar") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RegistroGrupoFamiliar" ADD CONSTRAINT "RegistroGrupoFamiliar_id_antecedente_familiar_AntecedenteFamiliar_id_antecedente_familiar_fk" FOREIGN KEY ("id_antecedente_familiar") REFERENCES "public"."AntecedenteFamiliar"("id_antecedente_familiar") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RespuestaE2P" ADD CONSTRAINT "RespuestaE2P_id_e2p_E2P_id_e2p_fk" FOREIGN KEY ("id_e2p") REFERENCES "public"."E2P"("id_e2p") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RespuestaE2P" ADD CONSTRAINT "RespuestaE2P_id_pregunta_e2p_PreguntaE2P_id_pregunta_e2p_fk" FOREIGN KEY ("id_pregunta_e2p") REFERENCES "public"."PreguntaE2P"("id_pregunta_e2p") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RespuestaNCFAS" ADD CONSTRAINT "RespuestaNCFAS_id_ncfas_NCFAS_id_ncfas_fk" FOREIGN KEY ("id_ncfas") REFERENCES "public"."NCFAS"("id_ncfas") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RespuestaNCFAS" ADD CONSTRAINT "RespuestaNCFAS_id_item_ncfas_ItemNCFAS_id_item_ncfas_fk" FOREIGN KEY ("id_item_ncfas") REFERENCES "public"."ItemNCFAS"("id_item_ncfas") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RespuestaPMF" ADD CONSTRAINT "RespuestaPMF_id_pmf_PMF_id_pmf_fk" FOREIGN KEY ("id_pmf") REFERENCES "public"."PMF"("id_pmf") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RespuestaPMF" ADD CONSTRAINT "RespuestaPMF_id_pregunta_pmf_PreguntaPMF_id_pregunta_pmf_fk" FOREIGN KEY ("id_pregunta_pmf") REFERENCES "public"."PreguntaPMF"("id_pregunta_pmf") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "VinculoFamiliar" ADD CONSTRAINT "VinculoFamiliar_id_nna_NNA_id_nna_fk" FOREIGN KEY ("id_nna") REFERENCES "public"."NNA"("id_nna") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "VinculoFamiliar" ADD CONSTRAINT "VinculoFamiliar_id_familiar_Familiar_id_familiar_fk" FOREIGN KEY ("id_familiar") REFERENCES "public"."Familiar"("id_familiar") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "VinculoNNA" ADD CONSTRAINT "VinculoNNA_id_nna_1_NNA_id_nna_fk" FOREIGN KEY ("id_nna_1") REFERENCES "public"."NNA"("id_nna") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "VinculoNNA" ADD CONSTRAINT "VinculoNNA_id_nna_2_NNA_id_nna_fk" FOREIGN KEY ("id_nna_2") REFERENCES "public"."NNA"("id_nna") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "comentario_ncfas_letra_idx" ON "ComentarioDimensionNCFAS" USING btree ("id_ncfas","letra_dimension");--> statement-breakpoint
CREATE UNIQUE INDEX "pregunta_e2p_rango_numero_idx" ON "PreguntaE2P" USING btree ("rango_etario","numero_item");--> statement-breakpoint
CREATE UNIQUE INDEX "puntaje_e2p_e2p_dimension_idx" ON "PuntajeE2P" USING btree ("id_e2p","dimension");--> statement-breakpoint
CREATE UNIQUE INDEX "registro_grupo_familiar_pair_idx" ON "RegistroGrupoFamiliar" USING btree ("id_familiar","id_antecedente_familiar");--> statement-breakpoint
CREATE UNIQUE INDEX "respuesta_e2p_e2p_pregunta_idx" ON "RespuestaE2P" USING btree ("id_e2p","id_pregunta_e2p");--> statement-breakpoint
CREATE UNIQUE INDEX "respuesta_ncfas_item_momento_idx" ON "RespuestaNCFAS" USING btree ("id_ncfas","id_item_ncfas","momento_evaluacion");--> statement-breakpoint
CREATE UNIQUE INDEX "vinculo_nna_pair_idx" ON "VinculoNNA" USING btree ("id_nna_1","id_nna_2");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");