CREATE TABLE "NNA" (
  "id_nna" integer PRIMARY KEY,
  "nombre" varchar,
  "run" varchar,
  "fecha_nacimiento" date,
  "sexo" varchar,
  "etnia_declarada" varchar,
  "nacionalidad" varchar,
  "domicilio" varchar,
  "poblacion_o_villa" varchar,
  "comuna" varchar,
  "region" varchar
);

CREATE TABLE "Familiar" (
  "id_familiar" uuid PRIMARY KEY,
  "nombre" varchar,
  "fecha_nacimiento" date,
  "run" varchar,
  "direccion" varchar,
  "numero_telefono" varchar,
  "tiene_antecedentes_penales" boolean DEFAULT false
);

CREATE TABLE "HistorialConsumoNNA" (
  "id_historial_consumo" integer PRIMARY KEY,
  "id_nna" integer,
  "nombre_sustancia" varchar,
  "consumo_indirecto_gestacional" boolean,
  "estado_consumo" varchar,
  "fecha_inicio" date,
  "fecha_termino" date,
  "en_tratamiento" boolean
);

CREATE TABLE "HistorialConsumoAdulto" (
  "id_historial_consumo" integer PRIMARY KEY,
  "id_familiar" integer,
  "nombre_sustancia" varchar,
  "estado_consumo" varchar,
  "fecha_inicio" date,
  "fecha_termino" date,
  "en_tratamiento" boolean
);

CREATE TABLE "DiscapacidadNNA" (
  "id_discapacidad" integer PRIMARY KEY,
  "id_nna" integer,
  "tipo" varchar,
  "porcentaje_grado" integer,
  "observacion" varchar
);

CREATE TABLE "DiscapacidadAdulto" (
  "id_discapacidad" integer PRIMARY KEY,
  "id_familiar" integer,
  "tipo" varchar,
  "porcentaje_grado" integer,
  "observacion" varchar
);

CREATE TABLE "AntecedentesPenales" (
  "id_antecedentes_penales" integer PRIMARY KEY,
  "id_familiar" integer,
  "descripcion" varchar
);

CREATE TABLE "AntecedenteIngreso" (
  "id_antecedente_ingreso" integer PRIMARY KEY,
  "id_nna" integer,
  "fecha_ingreso_residencia" date,
  "quien_solicita_ingreso" varchar,
  "orden_tribunal" boolean,
  "fecha_causa" date,
  "tribunal" varchar,
  "materia" varchar,
  "codigo_rit" varchar,
  "codigo_ruc" varchar
);

CREATE TABLE "DocumentacionIngreso" (
  "id_documentacion" integer PRIMARY KEY,
  "id_nna" integer,
  "tipo_documento" varchar,
  "estado_recepcion" boolean,
  "fecha_recepcion" date,
  "observacion" varchar
);

CREATE TABLE "RegistroCausalIngreso" (
  "id_registro_causales" integer PRIMARY KEY,
  "id_antecedente_ingreso" integer,
  "nombre_causal" varchar,
  "descripcion_detallada" text,
  "estado" varchar
);

CREATE TABLE "RegistroDerechoVulnerado" (
  "id_registro_derecho_vulnerado" integer PRIMARY KEY,
  "id_antecedente_ingreso" integer,
  "nombre_derecho" varchar,
  "estado" varchar
);

CREATE TABLE "HistorialRedProteccional" (
  "id_historial_red" integer PRIMARY KEY,
  "id_nna" integer,
  "nombre_programa" varchar,
  "fecha_ingreso" date,
  "motivo_ingreso" varchar,
  "fecha_egreso" date,
  "motivo_egreso" varchar,
  "observaciones" varchar
);

CREATE TABLE "GestionBusquedaFamiliar" (
  "id_gestion_busqueda" integer PRIMARY KEY,
  "id_nna" integer,
  "tipo_gestion" varchar,
  "fecha_solicitud_envio" date,
  "fecha_respuesta_recepcion" date,
  "resultado" varchar,
  "comprobante_adjunto" boolean
);

CREATE TABLE "InformeTribunal" (
  "id_informe" integer PRIMARY KEY,
  "id_nna" integer,
  "tipo_informe" varchar,
  "fecha_vencimiento" date,
  "fecha_envio_real" date,
  "estado" varchar
);

CREATE TABLE "ResumenE2P" (
  "id_resumen_e2p" integer PRIMARY KEY,
  "id_rango_edad_e2p" integer,
  "id_nna" integer,
  "id_familiar" integer,
  "fecha_evaluacion" date,
  "fecha_proxima_evaluacion" date,
  "puntaje_vincular" integer,
  "puntaje_formativa" integer,
  "puntaje_protectora" integer,
  "puntaje_reflexiva" integer,
  "zona_vincular" varchar,
  "zona_formativa" varchar,
  "zona_protectora" varchar,
  "zona_reflexiva" varchar,
  "estado" varchar,
  "perfil" varchar,
  "observacion" varchar
);

CREATE TABLE "RangoEdadE2P" (
  "id_rango_edad_e2p" integer PRIMARY KEY,
  "nombre_formulario" varchar,
  "edad_min_en_meses" int,
  "edad_max_en_meses" int
);

CREATE TABLE "PreguntaE2P" (
  "id_pregunta_e2p" int PRIMARY KEY,
  "id_rango_edad_e2p" int,
  "numero_pregunta" int,
  "texto_pregunta" varchar,
  "categoria_pregunta" int
);

CREATE TABLE "RespuestaE2P" (
  "id_respuesta_E2P" int PRIMARY KEY,
  "id_pregunta_e2p" int,
  "id_resumen_e2p" int,
  "valor_seleccionado" int
);

CREATE TABLE "InterpretacionE2P" (
  "id_interpretacion_e2p" integer PRIMARY KEY,
  "id_rango_edad_e2p" integer,
  "categoria" varchar,
  "puntaje_min" integer,
  "puntaje_max" integer,
  "zona_frecuencia" varchar
);

CREATE TABLE "PMF" (
  "id_instrumento" integer PRIMARY KEY,
  "id_nna" integer,
  "id_familiar" integer,
  "fecha_evaluacion" date,
  "fecha_proxima_evaluacion" date,
  "respuestas" varchar[],
  "observacion" varchar
);

CREATE TABLE "NCFAS" (
  "id_instrumento" integer PRIMARY KEY,
  "id_nna" integer,
  "id_familiar" integer,
  "fecha_evaluacion" date,
  "fecha_proxima_evaluacion" date,
  "resultado" varchar,
  "observacion" varchar
);

CREATE TABLE "AntecedenteSalud" (
  "id_antecedente_salud" integer PRIMARY KEY,
  "id_nna" integer,
  "fecha_antecedente_salud" date,
  "inscrito_en_consultorio" boolean,
  "establecimiento" varchar,
  "prevision" varchar
);

CREATE TABLE "AntecedenteEscolar" (
  "id_antecedente_escolar" integer PRIMARY KEY,
  "id_nna" integer,
  "fecha_antecedente_escolar" date,
  "escolarizado" boolean,
  "establecimiento" varchar,
  "ultimo_ano_curso" integer
);

CREATE TABLE "AntecedenteFamiliar" (
  "id_antecedente_familiar" uuid PRIMARY KEY,
  "id_nna" uuid,
  "fecha_antecedente_familiar" date
);

CREATE TABLE "VinculoFamiliar" (
  "id_entorno_familiar" uuid PRIMARY KEY,
  "id_antecedente_familiar" uuid,
  "id_familiar" uuid,
  "parentesco" varchar,
  "es_adulto_responsable" boolean DEFAULT false
);

ALTER TABLE "HistorialConsumoNNA" ADD FOREIGN KEY ("id_nna") REFERENCES "NNA" ("id_nna") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "HistorialConsumoAdulto" ADD FOREIGN KEY ("id_familiar") REFERENCES "Familiar" ("id_familiar") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "DiscapacidadNNA" ADD FOREIGN KEY ("id_nna") REFERENCES "NNA" ("id_nna") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "DiscapacidadAdulto" ADD FOREIGN KEY ("id_familiar") REFERENCES "Familiar" ("id_familiar") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "AntecedenteIngreso" ADD FOREIGN KEY ("id_nna") REFERENCES "NNA" ("id_nna") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "RegistroCausalIngreso" ADD FOREIGN KEY ("id_antecedente_ingreso") REFERENCES "AntecedenteIngreso" ("id_antecedente_ingreso") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "RegistroDerechoVulnerado" ADD FOREIGN KEY ("id_antecedente_ingreso") REFERENCES "AntecedenteIngreso" ("id_antecedente_ingreso") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "HistorialRedProteccional" ADD FOREIGN KEY ("id_nna") REFERENCES "NNA" ("id_nna") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "GestionBusquedaFamiliar" ADD FOREIGN KEY ("id_nna") REFERENCES "NNA" ("id_nna") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "InformeTribunal" ADD FOREIGN KEY ("id_nna") REFERENCES "NNA" ("id_nna") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "ResumenE2P" ADD FOREIGN KEY ("id_nna") REFERENCES "NNA" ("id_nna") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "ResumenE2P" ADD FOREIGN KEY ("id_familiar") REFERENCES "Familiar" ("id_familiar") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "PMF" ADD FOREIGN KEY ("id_nna") REFERENCES "NNA" ("id_nna") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "PMF" ADD FOREIGN KEY ("id_familiar") REFERENCES "Familiar" ("id_familiar") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "NCFAS" ADD FOREIGN KEY ("id_nna") REFERENCES "NNA" ("id_nna") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "NCFAS" ADD FOREIGN KEY ("id_familiar") REFERENCES "Familiar" ("id_familiar") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "AntecedenteSalud" ADD FOREIGN KEY ("id_nna") REFERENCES "NNA" ("id_nna") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "AntecedenteEscolar" ADD FOREIGN KEY ("id_nna") REFERENCES "NNA" ("id_nna") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "AntecedenteFamiliar" ADD FOREIGN KEY ("id_nna") REFERENCES "NNA" ("id_nna") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "DocumentacionIngreso" ADD FOREIGN KEY ("id_nna") REFERENCES "NNA" ("id_nna") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "AntecedentesPenales" ADD FOREIGN KEY ("id_familiar") REFERENCES "Familiar" ("id_familiar") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "ResumenE2P" ADD FOREIGN KEY ("id_rango_edad_e2p") REFERENCES "RangoEdadE2P" ("id_rango_edad_e2p") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "PreguntaE2P" ADD FOREIGN KEY ("id_rango_edad_e2p") REFERENCES "RangoEdadE2P" ("id_rango_edad_e2p") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "RespuestaE2P" ADD FOREIGN KEY ("id_resumen_e2p") REFERENCES "ResumenE2P" ("id_resumen_e2p") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "RespuestaE2P" ADD FOREIGN KEY ("id_pregunta_e2p") REFERENCES "PreguntaE2P" ("id_pregunta_e2p") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "InterpretacionE2P" ADD FOREIGN KEY ("id_rango_edad_e2p") REFERENCES "RangoEdadE2P" ("id_rango_edad_e2p") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "VinculoFamiliar" ADD FOREIGN KEY ("id_familiar") REFERENCES "Familiar" ("id_familiar") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "VinculoFamiliar" ADD FOREIGN KEY ("id_antecedente_familiar") REFERENCES "AntecedenteFamiliar" ("id_antecedente_familiar") DEFERRABLE INITIALLY IMMEDIATE;
