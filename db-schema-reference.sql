-- =============================================================================
-- SW Mejor Niñez — Esquema de Base de Datos
-- Todas las tablas, columnas, tipos, llaves foráneas y relaciones
-- PostgreSQL 17
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLAS PRINCIPALES (entidades raíz)
-- ═══════════════════════════════════════════════════════════════════════════════

-- NNA: Niños, Niñas y Adolescentes — entidad central del sistema.
-- Casi todas las demás tablas le pertenecen vía FK id_nna.
CREATE TABLE "NNA" (
    id_nna               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre               TEXT,
    run                  TEXT,
    fecha_nacimiento     DATE,
    sexo                 TEXT,
    etnia_declarada      TEXT,
    nacionalidad         TEXT,
    domicilio            TEXT,
    poblacion_o_villa    TEXT,
    comuna               TEXT,
    region               TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ
);

-- Familiar: Adulto significativo / familiar del NNA.
-- Reemplazó a "AdultoSignificativo" (migración 20260526_2116).
CREATE TABLE "Familiar" (
    id_familiar                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre                      TEXT,
    fecha_nacimiento            DATE,
    run                         TEXT,
    direccion                   TEXT,
    numero_telefono             TEXT,
    tiene_antecedentes_penales  BOOLEAN NOT NULL DEFAULT FALSE,  -- Denormalizado: actualizar al insertar/borrar AntecedentesPenales
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- HIJOS DIRECTOS DE NNA (FK id_nna → NNA.id_nna)
-- ═══════════════════════════════════════════════════════════════════════════════

-- HistorialConsumoNNA: historial de consumo de sustancias del NNA.
CREATE TABLE "HistorialConsumoNNA" (
    id_historial_consumo         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_nna                       UUID NOT NULL REFERENCES "NNA"(id_nna),
    nombre_sustancia             TEXT,
    consumo_indirecto_gestacional BOOLEAN NOT NULL DEFAULT FALSE,
    estado_consumo               TEXT,
    fecha_inicio                 DATE,
    fecha_termino                DATE,
    en_tratamiento               BOOLEAN NOT NULL DEFAULT FALSE,
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ
);

-- DiscapacidadNNA: discapacidades registradas del NNA.
CREATE TABLE "DiscapacidadNNA" (
    id_discapacidad  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_nna           UUID NOT NULL REFERENCES "NNA"(id_nna),
    tipo             TEXT,
    porcentaje_grado INTEGER,
    observacion      TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ
);

-- AntecedenteIngreso: datos del ingreso del NNA a residencia.
-- Padre de RegistroCausalIngreso y RegistroDerechoVulnerado.
CREATE TABLE "AntecedenteIngreso" (
    id_antecedente_ingreso   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_nna                   UUID NOT NULL REFERENCES "NNA"(id_nna),
    fecha_ingreso_residencia DATE,
    quien_solicita_ingreso   TEXT,
    orden_tribunal           BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_causa              DATE,
    tribunal                 TEXT,
    materia                  TEXT,
    codigo_rit               TEXT,
    codigo_ruc               TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ
);

-- DocumentacionIngreso: documentos asociados al ingreso.
CREATE TABLE "DocumentacionIngreso" (
    id_documentacion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_nna           UUID NOT NULL REFERENCES "NNA"(id_nna),
    tipo_documento   TEXT,
    estado_recepcion BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_recepcion  DATE,
    observacion      TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ
);

-- HistorialRedProteccional: paso del NNA por programas de la red proteccional.
CREATE TABLE "HistorialRedProteccional" (
    id_historial_red UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_nna           UUID NOT NULL REFERENCES "NNA"(id_nna),
    nombre_programa  TEXT,
    fecha_ingreso    DATE,
    fecha_egreso     DATE,
    motivo_egreso    TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ
);

-- GestionBusquedaFamiliar: gestiones de búsqueda de familiares del NNA.
CREATE TABLE "GestionBusquedaFamiliar" (
    id_gestion_busqueda       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_nna                    UUID NOT NULL REFERENCES "NNA"(id_nna),
    tipo_gestion              TEXT,
    fecha_solicitud_envio     DATE,
    fecha_respuesta_recepcion DATE,
    resultado                 TEXT,
    comprobante_adjunto       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ
);

-- InformeTribunal: informes enviados a tribunales sobre el NNA.
CREATE TABLE "InformeTribunal" (
    id_informe         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_nna             UUID NOT NULL REFERENCES "NNA"(id_nna),
    tipo_informe       TEXT,
    fecha_vencimiento  DATE,
    fecha_envio_real   DATE,
    estado             TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ
);

-- AntecedenteSalud: antecedentes de salud del NNA.
CREATE TABLE "AntecedenteSalud" (
    id_antecedente_salud    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_nna                  UUID NOT NULL REFERENCES "NNA"(id_nna),
    fecha_antecedente_salud DATE,
    inscrito_en_consultorio BOOLEAN NOT NULL DEFAULT FALSE,
    establecimiento         TEXT,
    prevision               TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ
);

-- AntecedenteEscolar: antecedentes escolares del NNA.
CREATE TABLE "AntecedenteEscolar" (
    id_antecedente_escolar    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_nna                    UUID NOT NULL REFERENCES "NNA"(id_nna),
    fecha_antecedente_escolar DATE,
    escolarizado              BOOLEAN NOT NULL DEFAULT FALSE,
    establecimiento           TEXT,
    ultimo_ano_curso          INTEGER,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ
);

-- AntecedenteFamiliar: antecedentes familiares del NNA.
-- Padre de VinculoFamiliar (un NNA puede tener varios vínculos familiares).
CREATE TABLE "AntecedenteFamiliar" (
    id_antecedente_familiar    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_nna                     UUID NOT NULL REFERENCES "NNA"(id_nna),
    fecha_antecedente_familiar DATE,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                 TIMESTAMPTZ
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- HIJOS DE AntecedenteIngreso (nietos de NNA)
-- ═══════════════════════════════════════════════════════════════════════════════

-- RegistroCausalIngreso: causales asociadas a un ingreso.
-- FK id_antecedente_ingreso → AntecedenteIngreso.id_antecedente_ingreso
CREATE TABLE "RegistroCausalIngreso" (
    id_registro_causales      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_antecedente_ingreso    UUID NOT NULL REFERENCES "AntecedenteIngreso"(id_antecedente_ingreso),
    nombre_causal             TEXT,
    descripcion_detallada     TEXT,
    estado                    TEXT,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ
);

-- RegistroDerechoVulnerado: derechos vulnerados asociados a un ingreso.
-- FK id_antecedente_ingreso → AntecedenteIngreso.id_antecedente_ingreso
CREATE TABLE "RegistroDerechoVulnerado" (
    id_registro_derecho_vulnerado UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_antecedente_ingreso        UUID NOT NULL REFERENCES "AntecedenteIngreso"(id_antecedente_ingreso),
    nombre_derecho                TEXT,
    estado                        TEXT,
    created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                    TIMESTAMPTZ
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- HIJOS DE AntecedenteFamiliar + Familiar (tabla puente)
-- ═══════════════════════════════════════════════════════════════════════════════

-- VinculoFamiliar: relaciona un AntecedenteFamiliar con un Familiar concreto.
-- Es hijo de AntecedenteFamiliar y también referencia a Familiar.
-- Reemplazó a "EntornoFamiliar" (migración 20260526_2116).
CREATE TABLE "VinculoFamiliar" (
    id_vinculo_familiar       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_antecedente_familiar   UUID NOT NULL REFERENCES "AntecedenteFamiliar"(id_antecedente_familiar),
    id_familiar               UUID REFERENCES "Familiar"(id_familiar),
    parentesco                TEXT,
    es_adulto_responsable     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- HIJOS DIRECTOS DE Familiar (FK id_familiar → Familiar.id_familiar)
-- ═══════════════════════════════════════════════════════════════════════════════

-- AntecedentesPenales: registros penales del Familiar.
-- Al insertar/borrar, actualizar Familiar.tiene_antecedentes_penales.
CREATE TABLE "AntecedentesPenales" (
    id_antecedentes_penales UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_familiar             UUID NOT NULL REFERENCES "Familiar"(id_familiar),
    descripcion             TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ
);

-- HistorialConsumoAdulto: historial de consumo de sustancias del Familiar.
CREATE TABLE "HistorialConsumoAdulto" (
    id_historial_consumo UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_familiar          UUID NOT NULL REFERENCES "Familiar"(id_familiar),
    nombre_sustancia     TEXT,
    estado_consumo       TEXT,
    fecha_inicio         DATE,
    fecha_termino        DATE,
    en_tratamiento       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ
);

-- DiscapacidadAdulto: discapacidades registradas del Familiar.
CREATE TABLE "DiscapacidadAdulto" (
    id_discapacidad  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_familiar      UUID NOT NULL REFERENCES "Familiar"(id_familiar),
    tipo             TEXT,
    porcentaje_grado INTEGER,
    observacion      TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INSTRUMENTOS (evalúan a NNA + Familiar simultáneamente)
-- Dual FK: id_nna → NNA + id_familiar → Familiar
-- ═══════════════════════════════════════════════════════════════════════════════

-- E2P: Escala de Evaluación Parental (versión 1-8 según edad del NNA).
-- Padre de RespuestaE2P y PuntajeE2P.
CREATE TABLE "E2P" (
    id_instrumento            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_nna                    UUID NOT NULL REFERENCES "NNA"(id_nna),
    id_familiar               UUID NOT NULL REFERENCES "Familiar"(id_familiar),
    fecha_evaluacion          DATE,
    fecha_proxima_evaluacion  DATE,
    version                   INTEGER NOT NULL,           -- 1 a 8, requerido a nivel DB
    resultado                 TEXT,                       -- "Riesgo" | "Monitoreo" | "Optimo" | NULL
    observacion               TEXT,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ
);

-- PMF: Perfil de Madurez Familiar.
CREATE TABLE "PMF" (
    id_instrumento            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_nna                    UUID NOT NULL REFERENCES "NNA"(id_nna),
    id_familiar               UUID NOT NULL REFERENCES "Familiar"(id_familiar),
    fecha_evaluacion          DATE,
    fecha_proxima_evaluacion  DATE,
    resultado                 TEXT,
    observacion               TEXT,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ
);

-- NCFAS: North Carolina Family Assessment Scale.
CREATE TABLE "NCFAS" (
    id_instrumento            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_nna                    UUID NOT NULL REFERENCES "NNA"(id_nna),
    id_familiar               UUID NOT NULL REFERENCES "Familiar"(id_familiar),
    fecha_evaluacion          DATE,
    fecha_proxima_evaluacion  DATE,
    resultado                 TEXT,
    observacion               TEXT,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SUBSISTEMA E2P NORMALIZADO
-- (migración ae12f00b467b — respuestas ya no son JSON en E2P)
-- ═══════════════════════════════════════════════════════════════════════════════

-- PreguntaE2P: catálogo de preguntas por versión.
-- Se siembra desde e2p_questions.json; en runtime se consulta primero la tabla,
-- con fallback al JSON si no hay datos.
-- SIN timestamps: catálogo de referencia, datos estáticos.
CREATE TABLE "PreguntaE2P" (
    id_pregunta_e2p UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version         INTEGER NOT NULL,
    numero          INTEGER NOT NULL,   -- número de pregunta dentro de la versión
    texto           TEXT    NOT NULL,
    categoria       TEXT    NOT NULL    -- "Vinculares", "Autonomía", "Contextuales", etc.
);

-- RespuestaE2P: tabla de intersección — materializa las respuestas de una
-- evaluación E2P. Una fila por cada pregunta respondida.
-- Relación muchos-a-muchos entre E2P y PreguntaE2P.
CREATE TABLE "RespuestaE2P" (
    id_respuesta_e2p  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_instrumento    UUID NOT NULL REFERENCES "E2P"(id_instrumento),
    id_pregunta_e2p   UUID NOT NULL REFERENCES "PreguntaE2P"(id_pregunta_e2p),
    valor             INTEGER NOT NULL,   -- Likert 0-4
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    -- sin updated_at: las respuestas se borran y re-crean en cada POST/PUT
);

-- BaremoE2P: tabla de referencia con rangos de puntaje para clasificar zonas.
-- Se siembra desde e2p_escala.json (solo en seed.py; no se consulta el JSON en runtime).
-- SIN timestamps: catálogo de referencia, datos estáticos.
-- Sin FK: se cruza lógicamente por (version, categoria) contra los puntajes calculados.
CREATE TABLE "BaremoE2P" (
    id_baremo_e2p UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version       INTEGER NOT NULL,
    categoria     TEXT    NOT NULL,
    zona          TEXT    NOT NULL,      -- "Baja" | "Intermedia" | "Alta"
    puntaje_min   INTEGER NOT NULL,
    puntaje_max   INTEGER NOT NULL
);

-- PuntajeE2P: puntajes calculados por categoría para una evaluación E2P.
-- Se calculan y persisten al crear/actualizar respuestas.
CREATE TABLE "PuntajeE2P" (
    id_puntaje_e2p   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_instrumento   UUID NOT NULL REFERENCES "E2P"(id_instrumento),
    categoria        TEXT    NOT NULL,
    puntaje_bruto    INTEGER NOT NULL,
    puntaje_max      INTEGER NOT NULL,
    zona             TEXT    NOT NULL,
    rango_zona       TEXT    NOT NULL,      -- ej: "0-15"
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    -- sin updated_at: los puntajes se borran y re-calculan en cada POST/PUT
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- RESUMEN DE RELACIONES (DIAGRAMA)
-- ═══════════════════════════════════════════════════════════════════════════════
--
--   NNA (1) ──── (N) HistorialConsumoNNA
--   NNA (1) ──── (N) DiscapacidadNNA
--   NNA (1) ──── (N) AntecedenteIngreso (1) ──── (N) RegistroCausalIngreso
--   NNA (1) ──── (N) AntecedenteIngreso (1) ──── (N) RegistroDerechoVulnerado
--   NNA (1) ──── (N) DocumentacionIngreso
--   NNA (1) ──── (N) HistorialRedProteccional
--   NNA (1) ──── (N) GestionBusquedaFamiliar
--   NNA (1) ──── (N) InformeTribunal
--   NNA (1) ──── (N) AntecedenteSalud
--   NNA (1) ──── (N) AntecedenteEscolar
--   NNA (1) ──── (N) AntecedenteFamiliar (1) ──── (N) VinculoFamiliar (N) ──── (1) Familiar
--
--   Familiar (1) ──── (N) AntecedentesPenales
--   Familiar (1) ──── (N) HistorialConsumoAdulto
--   Familiar (1) ──── (N) DiscapacidadAdulto
--   Familiar (1) ──── (N) VinculoFamiliar
--
--   NNA (1) ──── (N) E2P (1) ──── (N) RespuestaE2P (N) ──── (1) PreguntaE2P
--   NNA (1) ──── (N) E2P (1) ──── (N) PuntajeE2P
--   Familiar (1) ──── (N) E2P
--
--   NNA (1) ──── (N) PMF
--   Familiar (1) ──── (N) PMF
--
--   NNA (1) ──── (N) NCFAS
--   Familiar (1) ──── (N) NCFAS
--
--   BaremoE2P: tabla independiente (sin FK). Referencia por (version, categoria).
--   PreguntaE2P: tabla independiente (sin FK). Referencia por (version, numero).
--
-- ═══════════════════════════════════════════════════════════════════════════════
-- RESUMEN DE LLAVES FORÁNEAS
-- ═══════════════════════════════════════════════════════════════════════════════
--
--   Tabla                     FK                              Referencia
--   ────────────────────────  ──────────────────────────────  ──────────────────────────────────
--   HistorialConsumoNNA       id_nna                          NNA.id_nna
--   DiscapacidadNNA           id_nna                          NNA.id_nna
--   AntecedenteIngreso        id_nna                          NNA.id_nna
--   DocumentacionIngreso      id_nna                          NNA.id_nna
--   HistorialRedProteccional  id_nna                          NNA.id_nna
--   GestionBusquedaFamiliar   id_nna                          NNA.id_nna
--   InformeTribunal           id_nna                          NNA.id_nna
--   AntecedenteSalud          id_nna                          NNA.id_nna
--   AntecedenteEscolar        id_nna                          NNA.id_nna
--   AntecedenteFamiliar       id_nna                          NNA.id_nna
--   E2P                       id_nna                          NNA.id_nna
--   E2P                       id_familiar                     Familiar.id_familiar
--   PMF                       id_nna                          NNA.id_nna
--   PMF                       id_familiar                     Familiar.id_familiar
--   NCFAS                     id_nna                          NNA.id_nna
--   NCFAS                     id_familiar                     Familiar.id_familiar
--   AntecedentesPenales       id_familiar                     Familiar.id_familiar
--   HistorialConsumoAdulto    id_familiar                     Familiar.id_familiar
--   DiscapacidadAdulto        id_familiar                     Familiar.id_familiar
--   RegistroCausalIngreso     id_antecedente_ingreso           AntecedenteIngreso.id_antecedente_ingreso
--   RegistroDerechoVulnerado  id_antecedente_ingreso           AntecedenteIngreso.id_antecedente_ingreso
--   VinculoFamiliar           id_antecedente_familiar          AntecedenteFamiliar.id_antecedente_familiar
--   VinculoFamiliar           id_familiar                     Familiar.id_familiar
--   RespuestaE2P              id_instrumento                  E2P.id_instrumento
--   RespuestaE2P              id_pregunta_e2p                 PreguntaE2P.id_pregunta_e2p
--   PuntajeE2P                id_instrumento                  E2P.id_instrumento
--
-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLAS SIN LLAVES FORÁNEAS (catálogos / referencia)
-- ═══════════════════════════════════════════════════════════════════════════════
--
--   PreguntaE2P    — catálogo de preguntas. Se vincula lógicamente a RespuestaE2P.
--   BaremoE2P      — rangos de puntuación. Se cruza lógicamente por (version, categoria).
--
-- ═══════════════════════════════════════════════════════════════════════════════
-- TRAZABILIDAD (created_at / updated_at)
-- ═══════════════════════════════════════════════════════════════════════════════
--
--  Todas las tablas de datos tienen:
--    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
--    updated_at  TIMESTAMPTZ  -- NULL hasta la primera modificación
--
--  Excepciones:
--    PreguntaE2P, BaremoE2P — catálogos estáticos, sin timestamps.
--    RespuestaE2P, PuntajeE2P — solo created_at (se borran y re-crean en cada
--      POST/PUT de E2P; updated_at no tendría sentido).
--
--  Convención en backend:
--    - created_at se asigna automáticamente por DEFAULT now() del servidor.
--    - updated_at debe setearse explícitamente a now() en cada UPDATE desde
--      los servicios (update_child, FamiliarService.update, NNAService.update).
--    - No se exponen en las respuestas de la API a menos que se agreguen
--      explícitamente a los schemas Read.
--
-- ═══════════════════════════════════════════════════════════════════════════════
-- NOTAS IMPORTANTES
-- ═══════════════════════════════════════════════════════════════════════════════
--
--  1. Todos los PK son UUID generados con gen_random_uuid().
--  2. Familiar.tiene_antecedentes_penales está DENORMALIZADO: el backend debe
--     mantenerlo en true/false al insertar o eliminar filas de AntecedentesPenales.
--  3. E2P.version es NOT NULL en la DB pero Optional[int] en el schema Pydantic.
--     La API exige que el frontend envíe la versión.
--  4. E2P.respuestas NO existe como columna JSON. Las respuestas se almacenan
--     normalizadas en RespuestaE2P. La API acepta un dict "respuestas" en
--     create/update y lo sincroniza a filas de RespuestaE2P internamente.
--  5. BaremoE2P se puebla desde e2p_escala.json exclusivamente por seed.py.
--     En runtime se consulta la tabla BaremoE2P, nunca el JSON.
--  6. PreguntaE2P se consulta desde la tabla; si no hay datos se usa
--     e2p_questions.json como fallback en el endpoint GET /versions/{n}.
--  7. La migración de renombre (20260526_2116) es idempotente: AdultoSignificativo
--     → Familiar, EntornoFamiliar → VinculoFamiliar.
--  8. Cadena de migraciones:
--     0b733fafb9a6 (initial)
--       → ef7302f55ef1 (e2p_version+respuestas)
--         → 20260526_2116 (rename Adulto→Familiar, Entorno→Vinculo)
--           → 65efebdbb730 (rename FK column)
--             → ae12f00b467b (normalize_e2p)
--               → f4285c627ed7 (puntaje_e2p_table)
-- =============================================================================
