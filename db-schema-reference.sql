CREATE TABLE IF NOT EXISTS "NNA" (
	"id_nna" UUID DEFAULT gen_random_uuid(),
	-- ID asignado por la plataforma externa SIS
	"id_sis" TEXT UNIQUE,
	"run" TEXT UNIQUE,
	-- nombre del niño
	"nombre" TEXT,
	"fecha_nacimiento" DATE,
	"sexo" TEXT,
	"etnia_declarada" TEXT,
	"nacionalidad" TEXT,
	"domicilio" TEXT,
	"comuna" TEXT,
	"region" TEXT,
	PRIMARY KEY("id_nna")
);


COMMENT ON COLUMN "NNA"."id_sis" IS 'ID asignado por la plataforma externa SIS';
COMMENT ON COLUMN "NNA"."nombre" IS 'nombre del niño';


CREATE TABLE IF NOT EXISTS "Familiar" (
	"id_familiar" UUID DEFAULT gen_random_uuid(),
	"nombre" TEXT,
	"fecha_nacimiento" DATE,
	"run" TEXT,
	"direccion" TEXT,
	"numero_telefono" TEXT,
	PRIMARY KEY("id_familiar")
);




CREATE TABLE IF NOT EXISTS "HistorialConsumoNNA" (
	"id_historial_consumo_nna" UUID DEFAULT gen_random_uuid(),
	"id_nna" UUID NOT NULL,
	"nombre_sustancia" TEXT,
	"consumo_indirecto_gestacional" BOOLEAN NOT NULL DEFAULT false,
	"estado_consumo" TEXT,
	"fecha_inicio" DATE,
	"fecha_termino" DATE,
	"en_tratamiento" BOOLEAN NOT NULL DEFAULT false,
	PRIMARY KEY("id_historial_consumo_nna")
);




CREATE TABLE IF NOT EXISTS "DiscapacidadNNA" (
	"id_discapacidad_nna" UUID DEFAULT gen_random_uuid(),
	"id_nna" UUID NOT NULL,
	"tipo" TEXT,
	"porcentaje_grado" INTEGER,
	"observacion" TEXT,
	PRIMARY KEY("id_discapacidad_nna")
);




CREATE TABLE IF NOT EXISTS "AntecedenteIngreso" (
	"id_antecedente_ingreso" UUID DEFAULT gen_random_uuid(),
	"id_nna" UUID NOT NULL,
	"id_solicitante_ingreso" UUID NOT NULL,
	"fecha_ingreso_residencia" DATE,
	"orden_tribunal" BOOLEAN NOT NULL DEFAULT false,
	"fecha_causa" DATE,
	"tribunal" TEXT,
	"materia" TEXT,
	"codigo_rit" TEXT,
	"codigo_ruc" TEXT,
	PRIMARY KEY("id_antecedente_ingreso")
);




CREATE TABLE IF NOT EXISTS "DocumentacionIngreso" (
	"id_documentacion" UUID DEFAULT gen_random_uuid(),
	"id_nna" UUID NOT NULL,
	"tipo_documento" TEXT,
	"estado_recepcion" BOOLEAN NOT NULL DEFAULT false,
	"fecha_recepcion" DATE,
	"observacion" TEXT,
	PRIMARY KEY("id_documentacion")
);




CREATE TABLE IF NOT EXISTS "HistorialRedProteccional" (
	"id_historial_red" UUID DEFAULT gen_random_uuid(),
	"id_nna" UUID NOT NULL,
	"nombre_programa" TEXT,
	"fecha_ingreso" DATE,
	"fecha_egreso" DATE,
	"motivo_egreso" TEXT,
	PRIMARY KEY("id_historial_red")
);




CREATE TABLE IF NOT EXISTS "GestionBusquedaFamiliar" (
	"id_gestion_busqueda" UUID DEFAULT gen_random_uuid(),
	"id_nna" UUID NOT NULL,
	"tipo_gestion" TEXT,
	"fecha_solicitud_envio" DATE,
	"fecha_respuesta_recepcion" DATE,
	"resultado" TEXT,
	"comprobante_adjunto" BOOLEAN NOT NULL DEFAULT false,
	PRIMARY KEY("id_gestion_busqueda")
);




CREATE TABLE IF NOT EXISTS "InformeTribunal" (
	"id_informe" UUID DEFAULT gen_random_uuid(),
	"id_nna" UUID NOT NULL,
	"tipo_informe" TEXT,
	"fecha_vencimiento" DATE,
	"fecha_envio_real" DATE,
	"estado" TEXT,
	PRIMARY KEY("id_informe")
);




CREATE TABLE IF NOT EXISTS "AntecedenteSalud" (
	"id_antecedente_salud" UUID DEFAULT gen_random_uuid(),
	"id_nna" UUID NOT NULL,
	"id_centro_salud" UUID,
	"fecha_antecedente_salud" DATE,
	-- Debe ser lista: FONASA, ISAPRE, Particular, Ninguna
	"prevision" TEXT,
	"inscrito_en_centro_salud" BOOLEAN NOT NULL DEFAULT false,
	PRIMARY KEY("id_antecedente_salud")
);


COMMENT ON COLUMN "AntecedenteSalud"."prevision" IS 'Debe ser lista: FONASA, ISAPRE, Particular, Ninguna';


CREATE TABLE IF NOT EXISTS "AntecedenteEscolar" (
	"id_antecedente_escolar" UUID DEFAULT gen_random_uuid(),
	"id_nna" UUID NOT NULL,
	"id_establecimiento_educacional" UUID,
	"fecha_antecedente_escolar" DATE,
	"ultimo_ano_cursado" INTEGER,
	"escolarizado" BOOLEAN NOT NULL DEFAULT false,
	PRIMARY KEY("id_antecedente_escolar")
);




CREATE TABLE IF NOT EXISTS "AntecedenteFamiliar" (
	"id_antecedente_familiar" UUID DEFAULT gen_random_uuid(),
	"id_nna" UUID NOT NULL,
	"id_adulto_responsable" UUID,
	"fecha_antecedente_familiar" DATE,
	-- Ej: Ambos padres, madre con pareja nueva, no parientes con vinculo afectivo, ... ,  otro.
	"con_quien_vive" TEXT,
	-- si con_quien_vive == ''Otro'', guardar detalle aca.
	"con_quien_vive_detalle" TEXT,
	PRIMARY KEY("id_antecedente_familiar")
);


COMMENT ON COLUMN "AntecedenteFamiliar"."con_quien_vive" IS 'Ej: Ambos padres, madre con pareja nueva, no parientes con vinculo afectivo, ... ,  otro.';
COMMENT ON COLUMN "AntecedenteFamiliar"."con_quien_vive_detalle" IS 'si con_quien_vive == ''''Otro'''', guardar detalle aca.';


CREATE TABLE IF NOT EXISTS "RegistroCausalIngreso" (
	"id_registro_causales" UUID DEFAULT gen_random_uuid(),
	"id_antecedente_ingreso" UUID NOT NULL,
	"nombre_causal" TEXT,
	"descripcion_detallada" TEXT,
	"estado" TEXT,
	PRIMARY KEY("id_registro_causales")
);




CREATE TABLE IF NOT EXISTS "RegistroDerechoVulnerado" (
	"id_registro_derecho_vulnerado" UUID DEFAULT gen_random_uuid(),
	"id_antecedente_ingreso" UUID NOT NULL,
	"nombre_derecho" TEXT,
	"estado" TEXT,
	PRIMARY KEY("id_registro_derecho_vulnerado")
);




CREATE TABLE IF NOT EXISTS "VinculoFamiliar" (
	"id_vinculo_familiar" UUID DEFAULT gen_random_uuid(),
	"id_nna" UUID NOT NULL,
	"id_familiar" UUID NOT NULL,
	"parentesco" TEXT,
	PRIMARY KEY("id_vinculo_familiar")
);




CREATE TABLE IF NOT EXISTS "AntecedentePenal" (
	"id_antecedente_penal" UUID DEFAULT gen_random_uuid(),
	"id_familiar" UUID NOT NULL,
	"descripcion" TEXT,
	-- Ruta al PDF del extracto de filiación del tribunal
	"url_documento_adjunto" TEXT,
	PRIMARY KEY("id_antecedente_penal")
);


COMMENT ON COLUMN "AntecedentePenal"."url_documento_adjunto" IS 'Ruta al PDF del extracto de filiación del tribunal';


CREATE TABLE IF NOT EXISTS "HistorialConsumoAdulto" (
	"id_historial_consumo_adulto" UUID DEFAULT gen_random_uuid(),
	"id_familiar" UUID NOT NULL,
	"nombre_sustancia" TEXT,
	"estado_consumo" TEXT,
	"fecha_inicio" DATE,
	"fecha_termino" DATE,
	"en_tratamiento" BOOLEAN NOT NULL DEFAULT false,
	PRIMARY KEY("id_historial_consumo_adulto")
);




CREATE TABLE IF NOT EXISTS "DiscapacidadAdulto" (
	"id_discapacidad_adulto" UUID DEFAULT gen_random_uuid(),
	"id_familiar" UUID NOT NULL,
	"tipo" TEXT,
	"porcentaje_grado" INTEGER,
	"observacion" TEXT,
	PRIMARY KEY("id_discapacidad_adulto")
);




CREATE TABLE IF NOT EXISTS "PMF" (
	"id_pmf" UUID DEFAULT gen_random_uuid(),
	"id_nna" UUID NOT NULL,
	"id_familiar" UUID NOT NULL,
	"fecha_evaluacion" DATE,
	"fecha_proxima_evaluacion" DATE,
	"resultado" TEXT,
	"observacion" TEXT,
	PRIMARY KEY("id_pmf")
);




CREATE TABLE IF NOT EXISTS "NCFAS" (
	"id_ncfas" UUID DEFAULT gen_random_uuid(),
	"id_nna" UUID NOT NULL,
	"id_familiar" UUID NOT NULL,
	"fecha_evaluacion" DATE,
	"fecha_proxima_evaluacion" DATE,
	"resultado" TEXT,
	"observacion" TEXT,
	PRIMARY KEY("id_ncfas")
);




CREATE TABLE IF NOT EXISTS "E2P" (
	"id_e2p" UUID DEFAULT gen_random_uuid(),
	"id_nna" UUID NOT NULL,
	"id_familiar" UUID NOT NULL,
	"fecha_evaluacion" DATE,
	"fecha_proxima_evaluacion" DATE,
	"version" INTEGER NOT NULL,
	"resultado" TEXT,
	"observacion" TEXT,
	PRIMARY KEY("id_e2p")
);




CREATE TABLE IF NOT EXISTS "PreguntaE2P" (
	"id_pregunta_e2p" UUID DEFAULT gen_random_uuid(),
	"version" INTEGER NOT NULL,
	"numero" INTEGER NOT NULL,
	"texto" TEXT NOT NULL,
	"categoria" TEXT NOT NULL,
	PRIMARY KEY("id_pregunta_e2p")
);




CREATE TABLE IF NOT EXISTS "RespuestaE2P" (
	"id_respuesta_e2p" UUID DEFAULT gen_random_uuid(),
	"id_instrumento" UUID NOT NULL,
	"id_pregunta_e2p" UUID NOT NULL,
	"valor" INTEGER NOT NULL,
	PRIMARY KEY("id_respuesta_e2p")
);




CREATE TABLE IF NOT EXISTS "BaremoE2P" (
	"id_baremo_e2p" UUID DEFAULT gen_random_uuid(),
	"version" INTEGER NOT NULL,
	"categoria" TEXT NOT NULL,
	"zona" TEXT NOT NULL,
	"puntaje_min" INTEGER NOT NULL,
	"puntaje_max" INTEGER NOT NULL,
	PRIMARY KEY("id_baremo_e2p")
);




CREATE TABLE IF NOT EXISTS "PuntajeE2P" (
	"id_puntaje_e2p" UUID DEFAULT gen_random_uuid(),
	"id_instrumento" UUID NOT NULL,
	"categoria" TEXT NOT NULL,
	"puntaje_bruto" INTEGER NOT NULL,
	"puntaje_max" INTEGER NOT NULL,
	"zona" TEXT NOT NULL,
	"rango_zona" TEXT NOT NULL,
	PRIMARY KEY("id_puntaje_e2p")
);




CREATE TABLE IF NOT EXISTS "SolicitanteIngreso" (
	"id_solicitante_ingreso" UUID DEFAULT gen_random_uuid(),
	"nombre" TEXT,
	-- Ej: PRM, PRK, PRF, Hospital, etc.
	"categoria" TEXT,
	-- Año de adjudicación o vigencia del proyecto
	"ano_proyecto" INTEGER,
	PRIMARY KEY("id_solicitante_ingreso")
);


COMMENT ON COLUMN "SolicitanteIngreso"."categoria" IS 'Ej: PRM, PRK, PRF, Hospital, etc.';
COMMENT ON COLUMN "SolicitanteIngreso"."ano_proyecto" IS 'Año de adjudicación o vigencia del proyecto';


CREATE TABLE IF NOT EXISTS "EstablecimientoEducacional" (
	"id_establecimiento_educacional" UUID DEFAULT gen_random_uuid(),
	"nombre" TEXT,
	-- Rol Base de Datos del establecimiento
	"rbd" INTEGER,
	PRIMARY KEY("id_establecimiento_educacional")
);


COMMENT ON COLUMN "EstablecimientoEducacional"."rbd" IS 'Rol Base de Datos del establecimiento';


CREATE TABLE IF NOT EXISTS "CentroSalud" (
	"id_centro_salud" UUID DEFAULT gen_random_uuid(),
	"nombre" TEXT,
	-- Ej: CESFAM, Hospital, Clínica Privada, CECOSF
	"tipo_recinto" TEXT,
	PRIMARY KEY("id_centro_salud")
);


COMMENT ON COLUMN "CentroSalud"."tipo_recinto" IS 'Ej: CESFAM, Hospital, Clínica Privada, CECOSF';


CREATE TABLE IF NOT EXISTS "RegistroGrupoFamiliar" (
	"id_familiar" UUID NOT NULL,
	"id_antecedente_familiar" UUID NOT NULL,
	PRIMARY KEY("id_familiar", "id_antecedente_familiar")
);




CREATE TABLE IF NOT EXISTS "VinculoNNA" (
	"id_nna_1" UUID NOT NULL,
	"id_nna_2" UUID NOT NULL,
	"parentesco" TEXT,
	PRIMARY KEY("id_nna_1", "id_nna_2")
);



ALTER TABLE "HistorialConsumoNNA"
ADD FOREIGN KEY("id_nna") REFERENCES "NNA"("id_nna")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "DiscapacidadNNA"
ADD FOREIGN KEY("id_nna") REFERENCES "NNA"("id_nna")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "AntecedenteIngreso"
ADD FOREIGN KEY("id_nna") REFERENCES "NNA"("id_nna")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "DocumentacionIngreso"
ADD FOREIGN KEY("id_nna") REFERENCES "NNA"("id_nna")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "HistorialRedProteccional"
ADD FOREIGN KEY("id_nna") REFERENCES "NNA"("id_nna")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "GestionBusquedaFamiliar"
ADD FOREIGN KEY("id_nna") REFERENCES "NNA"("id_nna")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "InformeTribunal"
ADD FOREIGN KEY("id_nna") REFERENCES "NNA"("id_nna")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "AntecedenteSalud"
ADD FOREIGN KEY("id_nna") REFERENCES "NNA"("id_nna")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "AntecedenteEscolar"
ADD FOREIGN KEY("id_nna") REFERENCES "NNA"("id_nna")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "AntecedenteFamiliar"
ADD FOREIGN KEY("id_nna") REFERENCES "NNA"("id_nna")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "RegistroCausalIngreso"
ADD FOREIGN KEY("id_antecedente_ingreso") REFERENCES "AntecedenteIngreso"("id_antecedente_ingreso")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "RegistroDerechoVulnerado"
ADD FOREIGN KEY("id_antecedente_ingreso") REFERENCES "AntecedenteIngreso"("id_antecedente_ingreso")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "VinculoFamiliar"
ADD FOREIGN KEY("id_nna") REFERENCES "NNA"("id_nna")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "VinculoFamiliar"
ADD FOREIGN KEY("id_familiar") REFERENCES "Familiar"("id_familiar")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "AntecedentePenal"
ADD FOREIGN KEY("id_familiar") REFERENCES "Familiar"("id_familiar")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "HistorialConsumoAdulto"
ADD FOREIGN KEY("id_familiar") REFERENCES "Familiar"("id_familiar")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "DiscapacidadAdulto"
ADD FOREIGN KEY("id_familiar") REFERENCES "Familiar"("id_familiar")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "E2P"
ADD FOREIGN KEY("id_nna") REFERENCES "NNA"("id_nna")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "E2P"
ADD FOREIGN KEY("id_familiar") REFERENCES "Familiar"("id_familiar")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "PMF"
ADD FOREIGN KEY("id_nna") REFERENCES "NNA"("id_nna")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "PMF"
ADD FOREIGN KEY("id_familiar") REFERENCES "Familiar"("id_familiar")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "NCFAS"
ADD FOREIGN KEY("id_nna") REFERENCES "NNA"("id_nna")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "NCFAS"
ADD FOREIGN KEY("id_familiar") REFERENCES "Familiar"("id_familiar")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "RespuestaE2P"
ADD FOREIGN KEY("id_instrumento") REFERENCES "E2P"("id_e2p")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "RespuestaE2P"
ADD FOREIGN KEY("id_pregunta_e2p") REFERENCES "PreguntaE2P"("id_pregunta_e2p")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "PuntajeE2P"
ADD FOREIGN KEY("id_instrumento") REFERENCES "E2P"("id_e2p")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "AntecedenteIngreso"
ADD FOREIGN KEY("id_solicitante_ingreso") REFERENCES "SolicitanteIngreso"("id_solicitante_ingreso")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "AntecedenteEscolar"
ADD FOREIGN KEY("id_establecimiento_educacional") REFERENCES "EstablecimientoEducacional"("id_establecimiento_educacional")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "AntecedenteSalud"
ADD FOREIGN KEY("id_centro_salud") REFERENCES "CentroSalud"("id_centro_salud")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "AntecedenteFamiliar"
ADD FOREIGN KEY("id_adulto_responsable") REFERENCES "Familiar"("id_familiar")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "RegistroGrupoFamiliar"
ADD FOREIGN KEY("id_antecedente_familiar") REFERENCES "AntecedenteFamiliar"("id_antecedente_familiar")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "RegistroGrupoFamiliar"
ADD FOREIGN KEY("id_familiar") REFERENCES "Familiar"("id_familiar")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "VinculoNNA"
ADD FOREIGN KEY("id_nna_1") REFERENCES "NNA"("id_nna")
ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE "VinculoNNA"
ADD FOREIGN KEY("id_nna_2") REFERENCES "NNA"("id_nna")
ON UPDATE NO ACTION ON DELETE NO ACTION;