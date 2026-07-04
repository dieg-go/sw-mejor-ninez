import {
  pgTable,
  uuid,
  text,
  date,
  integer,
  boolean,
  pgEnum,
  jsonb,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const tipoInformeEnum = pgEnum('tipo_informe', [
  'Diagnóstico',
  'Seguimiento',
])

export const estadoInformeEnum = pgEnum('estado_informe', [
  'Pendiente',
  'Enviado',
  'Vencido',
])

export const nna = pgTable('NNA', {
  id_nna: uuid().defaultRandom().primaryKey(),
  id_sis: text().unique(),
  nombre: text(),
  run: text(),
  fecha_nacimiento: date(),
  sexo: text(),
  etnia_declarada: text(),
  nacionalidad: text(),
  domicilio: text(),
  poblacion_o_villa: text(),
  comuna: text(),
  region: text(),
})

export const familiar = pgTable('Familiar', {
  id_familiar: uuid().defaultRandom().primaryKey(),
  nombre: text(),
  fecha_nacimiento: date(),
  run: text(),
  direccion: text(),
  numero_telefono: text(),
  tiene_antecedentes_penales: boolean().notNull().default(false),
})

export const antecedentesPenales = pgTable('AntecedentesPenales', {
  id_antecedente_penal: uuid().defaultRandom().primaryKey(),
  id_familiar: uuid()
    .notNull()
    .references(() => familiar.id_familiar),
  descripcion: text(),
  url_documento_adjunto: text(),
})

export const antecedenteIngreso = pgTable('AntecedenteIngreso', {
  id_antecedente_ingreso: uuid().defaultRandom().primaryKey(),
  id_nna: uuid()
    .notNull()
    .references(() => nna.id_nna),
  id_solicitante_ingreso: uuid().references(() => solicitanteIngreso.id_solicitante_ingreso),
  fecha_ingreso_residencia: date(),
  orden_tribunal: boolean().notNull().default(false),
  fecha_causa: date(),
  tribunal: text(),
  materia: text(),
  codigo_rit: text(),
  codigo_ruc: text(),
})

export const documentacionIngreso = pgTable('DocumentacionIngreso', {
  id_documentacion: uuid().defaultRandom().primaryKey(),
  id_nna: uuid()
    .notNull()
    .references(() => nna.id_nna),
  tipo_documento: text(),
  estado_recepcion: boolean().notNull().default(false),
  fecha_recepcion: date(),
  observacion: text(),
  url_documentacion_ingreso: text(),
})

export const registroCausalIngreso = pgTable('RegistroCausalIngreso', {
  id_registro_causales: uuid().defaultRandom().primaryKey(),
  id_antecedente_ingreso: uuid()
    .notNull()
    .references(() => antecedenteIngreso.id_antecedente_ingreso),
  nombre_causal: text(),
  descripcion_detallada: text(),
  estado: text(),
})

export const registroDerechoVulnerado = pgTable('RegistroDerechoVulnerado', {
  id_registro_derecho_vulnerado: uuid().defaultRandom().primaryKey(),
  id_antecedente_ingreso: uuid()
    .notNull()
    .references(() => antecedenteIngreso.id_antecedente_ingreso),
  nombre_derecho: text(),
  estado: text(),
})

export const historialConsumoNNA = pgTable('HistorialConsumoNNA', {
  id_historial_consumo_nna: uuid().defaultRandom().primaryKey(),
  id_nna: uuid()
    .notNull()
    .references(() => nna.id_nna),
  nombre_sustancia: text(),
  consumo_indirecto_gestacional: boolean().notNull().default(false),
  estado_consumo: text(),
  fecha_inicio: date(),
  fecha_termino: date(),
  en_tratamiento: boolean().notNull().default(false),
})

export const historialConsumoAdulto = pgTable('HistorialConsumoAdulto', {
  id_historial_consumo_adulto: uuid().defaultRandom().primaryKey(),
  id_familiar: uuid()
    .notNull()
    .references(() => familiar.id_familiar),
  nombre_sustancia: text(),
  estado_consumo: text(),
  fecha_inicio: date(),
  fecha_termino: date(),
  en_tratamiento: boolean().notNull().default(false),
})

export const discapacidadNNA = pgTable('DiscapacidadNNA', {
  id_discapacidad_nna: uuid().defaultRandom().primaryKey(),
  id_nna: uuid()
    .notNull()
    .references(() => nna.id_nna),
  tipo: text(),
  porcentaje_grado: integer(),
  observacion: text(),
})

export const discapacidadAdulto = pgTable('DiscapacidadAdulto', {
  id_discapacidad_adulto: uuid().defaultRandom().primaryKey(),
  id_familiar: uuid()
    .notNull()
    .references(() => familiar.id_familiar),
  tipo: text(),
  porcentaje_grado: integer(),
  observacion: text(),
})

export const historialRedProteccional = pgTable('HistorialRedProteccional', {
  id_historial_red: uuid().defaultRandom().primaryKey(),
  id_nna: uuid()
    .notNull()
    .references(() => nna.id_nna),
  nombre_programa: text(),
  fecha_ingreso: date(),
  fecha_egreso: date(),
  motivo_egreso: text(),
})

export const informeTribunal = pgTable('InformeTribunal', {
  id_informe: uuid().defaultRandom().primaryKey(),
  id_nna: uuid()
    .notNull()
    .references(() => nna.id_nna),
  tipo_informe: tipoInformeEnum(),
  fecha_vencimiento: date(),
  fecha_envio_real: date(),
  estado: estadoInformeEnum(),
})

export const procesoDespejeFamiliar = pgTable('ProcesoDespejeFamiliar', {
  id_despeje: uuid().defaultRandom().primaryKey(),
  id_nna: uuid()
    .notNull()
    .unique()
    .references(() => nna.id_nna),
  fecha_solicitud_informe: date(),
  fecha_recepcion_informe: date(),
  estado: text(),
  url_informe_hijo: text(),
})

export const notificacionFamiliar = pgTable('NotificacionFamiliar', {
  id_notificacion: uuid().defaultRandom().primaryKey(),
  id_despeje: uuid()
    .notNull()
    .references(() => procesoDespejeFamiliar.id_despeje, { onDelete: 'cascade' }),
  id_familiar: uuid()
    .notNull()
    .references(() => familiar.id_familiar),
  fecha_envio_carta_1: date(),
  codigo_seguimiento_1: text(),
  estado_entrega_1: text(),
  fecha_recepcion_carta_1: date(),
  fecha_envio_carta_2: date(),
  codigo_seguimiento_2: text(),
  estado_entrega_2: text(),
  fecha_recepcion_carta_2: date(),
  resultado_contacto: text(),
  fecha_respuesta: date(),
  observacion: text(),
})

export const centroSalud = pgTable('CentroSalud', {
  id_centro_salud: uuid().defaultRandom().primaryKey(),
  nombre: text(),
  tipo_recinto: text(),
})

export const establecimientoEducacional = pgTable('EstablecimientoEducacional', {
  id_establecimiento_educacional: uuid().defaultRandom().primaryKey(),
  nombre: text(),
  rbd: integer(),
})

export const antecedenteSalud = pgTable('AntecedenteSalud', {
  id_antecedente_salud: uuid().defaultRandom().primaryKey(),
  id_nna: uuid()
    .notNull()
    .references(() => nna.id_nna),
  id_centro_salud: uuid().references(() => centroSalud.id_centro_salud),
  fecha_antecedente_salud: date(),
  prevision: text(),
  inscrito_en_centro_salud: boolean().notNull().default(false),
})

export const antecedenteEscolar = pgTable('AntecedenteEscolar', {
  id_antecedente_escolar: uuid().defaultRandom().primaryKey(),
  id_nna: uuid()
    .notNull()
    .references(() => nna.id_nna),
  id_establecimiento_educacional: uuid().references(
    () => establecimientoEducacional.id_establecimiento_educacional,
  ),
  fecha_antecedente_escolar: date(),
  ultimo_ano_cursado: integer(),
  escolarizado: boolean().notNull().default(false),
})

export const antecedenteFamiliar = pgTable('AntecedenteFamiliar', {
  id_antecedente_familiar: uuid().defaultRandom().primaryKey(),
  id_nna: uuid()
    .notNull()
    .references(() => nna.id_nna),
  id_adulto_responsable: uuid().references(() => familiar.id_familiar),
  fecha_antecedente_familiar: date(),
  con_quien_vive: text(),
  con_quien_vive_detalle: text(),
})

export const vinculoFamiliar = pgTable('VinculoFamiliar', {
  id_vinculo_familiar: uuid().defaultRandom().primaryKey(),
  id_nna: uuid()
    .notNull()
    .references(() => nna.id_nna),
  id_familiar: uuid()
    .notNull()
    .references(() => familiar.id_familiar),
  parentesco: text(),
})

export const e2p = pgTable('E2P', {
  id_e2p: uuid().defaultRandom().primaryKey(),
  id_nna: uuid()
    .notNull()
    .references(() => nna.id_nna),
  id_familiar: uuid()
    .notNull()
    .references(() => familiar.id_familiar),
  fecha_evaluacion: date(),
  edad_meses_evaluacion: integer().notNull(),
  rango_etario: text().notNull(),
  perfil_resultado_global: text(),
  observacion: text(),
})

export const preguntaE2P = pgTable(
  'PreguntaE2P',
  {
    id_pregunta_e2p: uuid().defaultRandom().primaryKey(),
    rango_etario: text().notNull(),
    numero_item: integer().notNull(),
    texto_afirmacion: text().notNull(),
    dimension: text().notNull(),
    subdimension: text(),
  },
  (t) => ({
    rangoItemIdx: uniqueIndex('pregunta_e2p_rango_numero_idx').on(
      t.rango_etario,
      t.numero_item,
    ),
  }),
)

export const respuestaE2P = pgTable(
  'RespuestaE2P',
  {
    id_respuesta_e2p: uuid().defaultRandom().primaryKey(),
    id_e2p: uuid()
      .notNull()
      .references(() => e2p.id_e2p, { onDelete: 'cascade' }),
    id_pregunta_e2p: uuid()
      .notNull()
      .references(() => preguntaE2P.id_pregunta_e2p),
    valor_seleccionado: integer().notNull(),
    puntaje_calculado: integer().notNull(),
  },
  (t) => ({
    e2pPreguntaIdx: uniqueIndex('respuesta_e2p_e2p_pregunta_idx').on(
      t.id_e2p,
      t.id_pregunta_e2p,
    ),
  }),
)

export const baremoE2P = pgTable('BaremoE2P', {
  id_baremo_e2p: uuid().defaultRandom().primaryKey(),
  rango_etario: text().notNull(),
  dimension: text().notNull(),
  decil: integer().notNull(),
  zona: text().notNull(),
  puntaje_min: integer().notNull(),
  puntaje_max: integer().notNull(),
})

export const puntajeE2P = pgTable(
  'PuntajeE2P',
  {
    id_puntaje_e2p: uuid().defaultRandom().primaryKey(),
    id_e2p: uuid()
      .notNull()
      .references(() => e2p.id_e2p, { onDelete: 'cascade' }),
    dimension: text().notNull(),
    puntaje_bruto: integer().notNull(),
    decil: integer(),
    zona: text(),
  },
  (t) => ({
    e2pDimensionIdx: uniqueIndex('puntaje_e2p_e2p_dimension_idx').on(
      t.id_e2p,
      t.dimension,
    ),
  }),
)

export const pmf = pgTable('PMF', {
  id_pmf: uuid().defaultRandom().primaryKey(),
  id_nna: uuid()
    .notNull()
    .references(() => nna.id_nna),
  id_familiar: uuid()
    .notNull()
    .references(() => familiar.id_familiar),
  fecha_evaluacion: date(),
  fecha_proxima_evaluacion: date(),
  resultado: text(),
  observacion: text(),
})

export const preguntaPMF = pgTable('PreguntaPMF', {
  id_pregunta_pmf: uuid().defaultRandom().primaryKey(),
  numero: integer().notNull(),
  afirmacion: text().notNull(),
  escala: text(),
})

export const respuestaPMF = pgTable('RespuestaPMF', {
  id_respuesta_pmf: uuid().defaultRandom().primaryKey(),
  id_pmf: uuid()
    .notNull()
    .references(() => pmf.id_pmf, { onDelete: 'cascade' }),
  id_pregunta_pmf: uuid()
    .notNull()
    .references(() => preguntaPMF.id_pregunta_pmf),
  respuesta: boolean().notNull(),
})

export const ncfas = pgTable('NCFAS', {
  id_ncfas: uuid().defaultRandom().primaryKey(),
  id_nna: uuid()
    .notNull()
    .references(() => nna.id_nna),
  id_familiar: uuid()
    .notNull()
    .references(() => familiar.id_familiar),
  es_reunificacion: boolean().notNull().default(false),
  fecha_apertura: date(),
  fecha_cierre: date(),
  estado: text(),
  observacion_general: text(),
})

export const itemNCFAS = pgTable('ItemNCFAS', {
  id_item_ncfas: uuid().defaultRandom().primaryKey(),
  letra_dimension: text().notNull(),
  nombre_dimension: text().notNull(),
  numero_item: integer().notNull(),
  nombre_item: text().notNull(),
  definiciones: jsonb(),
  es_item_general: boolean().notNull().default(false),
})

export const respuestaNCFAS = pgTable(
  'RespuestaNCFAS',
  {
    id_respuesta_ncfas: uuid().defaultRandom().primaryKey(),
    id_ncfas: uuid()
      .notNull()
      .references(() => ncfas.id_ncfas, { onDelete: 'cascade' }),
    id_item_ncfas: uuid()
      .notNull()
      .references(() => itemNCFAS.id_item_ncfas),
    momento_evaluacion: text().notNull(),
    puntaje: text().notNull(),
  },
  (t) => ({
    ncfasItemMomentoIdx: uniqueIndex('respuesta_ncfas_item_momento_idx').on(
      t.id_ncfas,
      t.id_item_ncfas,
      t.momento_evaluacion,
    ),
    momentoChk: check(
      'chk_momento_ncfas',
      sql`${t.momento_evaluacion} in ('Ingreso', 'Intermedio', 'Cierre')`,
    ),
    puntajeChk: check(
      'chk_puntaje_ncfas',
      sql`${t.puntaje} in ('+2', '+1', '0', '-1', '-2', '-3', 'DN', 'N/A')`,
    ),
  }),
)

export const comentarioDimensionNCFAS = pgTable(
  'ComentarioDimensionNCFAS',
  {
    id_comentario_ncfas: uuid().defaultRandom().primaryKey(),
    id_ncfas: uuid()
      .notNull()
      .references(() => ncfas.id_ncfas, { onDelete: 'cascade' }),
    letra_dimension: text().notNull(),
    comentario: text(),
  },
  (t) => ({
    ncfasLetraIdx: uniqueIndex('comentario_ncfas_letra_idx').on(
      t.id_ncfas,
      t.letra_dimension,
    ),
  }),
)

export const solicitanteIngreso = pgTable('SolicitanteIngreso', {
  id_solicitante_ingreso: uuid().defaultRandom().primaryKey(),
  nombre: text(),
  categoria: text(),
  ano_proyecto: integer(),
})

export const vinculoNNA = pgTable(
  'VinculoNNA',
  {
    id_vinculo_nna: uuid().defaultRandom().primaryKey(),
    id_nna_1: uuid()
      .notNull()
      .references(() => nna.id_nna),
    id_nna_2: uuid()
      .notNull()
      .references(() => nna.id_nna),
    parentesco: text(),
  },
  (t) => ({
    vinculoNnaPairIdx: uniqueIndex('vinculo_nna_pair_idx').on(
      t.id_nna_1,
      t.id_nna_2,
    ),
    ordenChk: check('chk_vinculo_nna_orden', sql`${t.id_nna_1} < ${t.id_nna_2}`),
  }),
)

export const registroGrupoFamiliar = pgTable(
  'RegistroGrupoFamiliar',
  {
    id_registro_grupo_familiar: uuid().defaultRandom().primaryKey(),
    id_familiar: uuid()
      .notNull()
      .references(() => familiar.id_familiar),
    id_antecedente_familiar: uuid()
      .notNull()
      .references(() => antecedenteFamiliar.id_antecedente_familiar),
  },
  (t) => ({
    grupoFamiliarPairIdx: uniqueIndex('registro_grupo_familiar_pair_idx').on(
      t.id_familiar,
      t.id_antecedente_familiar,
    ),
  }),
)

export type NNAType = typeof nna.$inferSelect
export type NNAInsert = typeof nna.$inferInsert
export type FamiliarType = typeof familiar.$inferSelect
export type FamiliarInsert = typeof familiar.$inferInsert
export type InformeTribunalType = typeof informeTribunal.$inferSelect
export type InformeTribunalInsert = typeof informeTribunal.$inferInsert
export type E2PType = typeof e2p.$inferSelect
export type E2PInsert = typeof e2p.$inferInsert
