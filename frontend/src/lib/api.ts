const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json();
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface NNA {
  id_nna: string;
  nombre: string | null;
  run: string | null;
  fecha_nacimiento: string | null;
  sexo: string | null;
  etnia_declarada: string | null;
  nacionalidad: string | null;
  domicilio: string | null;
  poblacion_o_villa: string | null;
  comuna: string | null;
  region: string | null;
}

export interface NNACreate {
  nombre?: string | null;
  run?: string | null;
  fecha_nacimiento?: string | null;
  sexo?: string | null;
  etnia_declarada?: string | null;
  nacionalidad?: string | null;
  domicilio?: string | null;
  poblacion_o_villa?: string | null;
  comuna?: string | null;
  region?: string | null;
}

export type NNAUpdate = Partial<NNACreate>;

export interface AdultoSignificativo {
  id_adulto_significativo: string;
  nombre: string | null;
  fecha_nacimiento: string | null;
  run: string | null;
  direccion: string | null;
  numero_telefono: string | null;
  tiene_antecedentes_penales: boolean;
}

export interface AdultoSignificativoCreate {
  nombre?: string | null;
  fecha_nacimiento?: string | null;
  run?: string | null;
  direccion?: string | null;
  numero_telefono?: string | null;
  tiene_antecedentes_penales?: boolean;
}

export type AdultoSignificativoUpdate = Partial<AdultoSignificativoCreate>;

export interface HistorialConsumoNNA {
  id_historial_consumo: string;
  id_nna: string;
  nombre_sustancia: string | null;
  consumo_indirecto_gestacional: boolean;
  estado_consumo: string | null;
  fecha_inicio: string | null;
  fecha_termino: string | null;
  en_tratamiento: boolean;
}

export type HistorialConsumoNNAUpdate = Partial<Omit<HistorialConsumoNNA, "id_historial_consumo" | "id_nna">>;

export interface HistorialConsumoAdulto {
  id_historial_consumo: string;
  id_adulto_significativo: string;
  nombre_sustancia: string | null;
  estado_consumo: string | null;
  fecha_inicio: string | null;
  fecha_termino: string | null;
  en_tratamiento: boolean;
}

export type HistorialConsumoAdultoUpdate = Partial<Omit<HistorialConsumoAdulto, "id_historial_consumo" | "id_adulto_significativo">>;

export interface DiscapacidadNNA {
  id_discapacidad: string;
  id_nna: string;
  tipo: string | null;
  porcentaje_grado: number | null;
  observacion: string | null;
}

export type DiscapacidadNNAUpdate = Partial<Omit<DiscapacidadNNA, "id_discapacidad" | "id_nna">>;

export interface DiscapacidadAdulto {
  id_discapacidad: string;
  id_adulto_significativo: string;
  tipo: string | null;
  porcentaje_grado: number | null;
  observacion: string | null;
}

export type DiscapacidadAdultoUpdate = Partial<Omit<DiscapacidadAdulto, "id_discapacidad" | "id_adulto_significativo">>;

export interface AntecedentesPenales {
  id_antecedentes_penales: string;
  id_adulto_significativo: string;
  descripcion: string | null;
}

export type AntecedentesPenalesUpdate = Partial<Omit<AntecedentesPenales, "id_antecedentes_penales" | "id_adulto_significativo">>;

export interface AntecedenteIngreso {
  id_antecedente_ingreso: string;
  id_nna: string;
  fecha_ingreso_residencia: string | null;
  quien_solicita_ingreso: string | null;
  orden_tribunal: boolean;
  fecha_causa: string | null;
  tribunal: string | null;
  materia: string | null;
  codigo_rit: string | null;
  codigo_ruc: string | null;
}

export type AntecedenteIngresoUpdate = Partial<Omit<AntecedenteIngreso, "id_antecedente_ingreso" | "id_nna">>;

export interface DocumentacionIngreso {
  id_documentacion: string;
  id_nna: string;
  tipo_documento: string | null;
  estado_recepcion: boolean;
  fecha_recepcion: string | null;
  observacion: string | null;
}

export type DocumentacionIngresoUpdate = Partial<Omit<DocumentacionIngreso, "id_documentacion" | "id_nna">>;

export interface CausalIngreso {
  id_registro_causales: string;
  id_antecedente_ingreso: string;
  nombre_causal: string | null;
  descripcion_detallada: string | null;
  estado: string | null;
}

export type CausalIngresoUpdate = Partial<Omit<CausalIngreso, "id_registro_causales" | "id_antecedente_ingreso">>;

export interface DerechoVulnerado {
  id_registro_derecho_vulnerado: string;
  id_antecedente_ingreso: string;
  nombre_derecho: string | null;
  estado: string | null;
}

export type DerechoVulneradoUpdate = Partial<Omit<DerechoVulnerado, "id_registro_derecho_vulnerado" | "id_antecedente_ingreso">>;

export interface HistorialRedProteccional {
  id_historial_red: string;
  id_nna: string;
  nombre_programa: string | null;
  fecha_ingreso: string | null;
  fecha_egreso: string | null;
  motivo_egreso: string | null;
}

export type HistorialRedProteccionalUpdate = Partial<Omit<HistorialRedProteccional, "id_historial_red" | "id_nna">>;

export interface GestionBusquedaFamiliar {
  id_gestion_busqueda: string;
  id_nna: string;
  tipo_gestion: string | null;
  fecha_solicitud_envio: string | null;
  fecha_respuesta_recepcion: string | null;
  resultado: string | null;
  comprobante_adjunto: boolean;
}

export type GestionBusquedaFamiliarUpdate = Partial<Omit<GestionBusquedaFamiliar, "id_gestion_busqueda" | "id_nna">>;

export interface InformeTribunal {
  id_informe: string;
  id_nna: string;
  tipo_informe: string | null;
  fecha_vencimiento: string | null;
  fecha_envio_real: string | null;
  estado: string | null;
}

export type InformeTribunalUpdate = Partial<Omit<InformeTribunal, "id_informe" | "id_nna">>;

export interface Instrumento {
  id_instrumento: string;
  id_nna: string;
  id_adulto_significativo: string | null;
  fecha_evaluacion: string | null;
  fecha_proxima_evaluacion: string | null;
  version: number | null;
  respuestas: Record<string, number> | null;
  resultado: string | null;
  observacion: string | null;
}

export type InstrumentoUpdate = Partial<Omit<Instrumento, "id_instrumento" | "id_nna">>;

export interface AntecedenteSalud {
  id_antecedente_salud: string;
  id_nna: string;
  fecha_antecedente_salud: string | null;
  inscrito_en_consultorio: boolean;
  establecimiento: string | null;
  prevision: string | null;
}

export type AntecedenteSaludUpdate = Partial<Omit<AntecedenteSalud, "id_antecedente_salud" | "id_nna">>;

export interface AntecedenteEscolar {
  id_antecedente_escolar: string;
  id_nna: string;
  fecha_antecedente_escolar: string | null;
  escolarizado: boolean;
  establecimiento: string | null;
  ultimo_ano_curso: number | null;
}

export type AntecedenteEscolarUpdate = Partial<Omit<AntecedenteEscolar, "id_antecedente_escolar" | "id_nna">>;

export interface AntecedenteFamiliar {
  id_antecedente_familiar: string;
  id_nna: string;
  fecha_antecedente_familiar: string | null;
}

export type AntecedenteFamiliarUpdate = Partial<Omit<AntecedenteFamiliar, "id_antecedente_familiar" | "id_nna">>;

export interface EntornoFamiliar {
  id_entorno_familiar: string;
  id_antecedente_familiar: string;
  id_adulto_significativo: string | null;
  parentesco: string | null;
  es_adulto_responsable: boolean;
}

export type EntornoFamiliarUpdate = Partial<Omit<EntornoFamiliar, "id_entorno_familiar" | "id_antecedente_familiar">>;

// ── E2P Questions ────────────────────────────────────────────────────────────

export interface E2PQuestions {
  edad: string;
  escala: Record<string, string>;
  preguntas: { id: number; texto: string }[];
}

// ── NNA ──────────────────────────────────────────────────────────────────────

export const api = {
  nna: {
    list: (skip = 0, limit = 100) =>
      request<NNA[]>(`/nna?skip=${skip}&limit=${limit}`),
    get: (id: string) => request<NNA>(`/nna/${id}`),
    create: (data: NNACreate) =>
      request<NNA>("/nna", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: NNAUpdate) =>
      request<NNA>(`/nna/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  // ── Adulto ─────────────────────────────────────────────────────────────────

  adultos: {
    list: (skip = 0, limit = 100) =>
      request<AdultoSignificativo[]>(`/adultos?skip=${skip}&limit=${limit}`),
    get: (id: string) => request<AdultoSignificativo>(`/adultos/${id}`),
    create: (data: AdultoSignificativoCreate) =>
      request<AdultoSignificativo>("/adultos", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: AdultoSignificativoUpdate) =>
      request<AdultoSignificativo>(`/adultos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  // ── NNA children ───────────────────────────────────────────────────────────

  historialConsumoNNA: {
    list: (idNna: string) => request<HistorialConsumoNNA[]>(`/nna/${idNna}/historial-consumo`),
    create: (idNna: string, data: Omit<HistorialConsumoNNA, "id_historial_consumo" | "id_nna">) =>
      request<HistorialConsumoNNA>(`/nna/${idNna}/historial-consumo`, { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<HistorialConsumoNNA>(`/historial-consumo-nna/${id}`),
    update: (id: string, data: HistorialConsumoNNAUpdate) =>
      request<HistorialConsumoNNA>(`/historial-consumo-nna/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  historialConsumoAdulto: {
    list: (idAdulto: string) => request<HistorialConsumoAdulto[]>(`/adultos/${idAdulto}/historial-consumo`),
    create: (idAdulto: string, data: Omit<HistorialConsumoAdulto, "id_historial_consumo" | "id_adulto_significativo">) =>
      request<HistorialConsumoAdulto>(`/adultos/${idAdulto}/historial-consumo`, { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<HistorialConsumoAdulto>(`/historial-consumo-adulto/${id}`),
    update: (id: string, data: HistorialConsumoAdultoUpdate) =>
      request<HistorialConsumoAdulto>(`/historial-consumo-adulto/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  discapacidadNNA: {
    list: (idNna: string) => request<DiscapacidadNNA[]>(`/nna/${idNna}/discapacidades`),
    create: (idNna: string, data: Omit<DiscapacidadNNA, "id_discapacidad" | "id_nna">) =>
      request<DiscapacidadNNA>(`/nna/${idNna}/discapacidades`, { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<DiscapacidadNNA>(`/discapacidad-nna/${id}`),
    update: (id: string, data: DiscapacidadNNAUpdate) =>
      request<DiscapacidadNNA>(`/discapacidad-nna/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  discapacidadAdulto: {
    list: (idAdulto: string) => request<DiscapacidadAdulto[]>(`/adultos/${idAdulto}/discapacidades`),
    create: (idAdulto: string, data: Omit<DiscapacidadAdulto, "id_discapacidad" | "id_adulto_significativo">) =>
      request<DiscapacidadAdulto>(`/adultos/${idAdulto}/discapacidades`, { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<DiscapacidadAdulto>(`/discapacidad-adulto/${id}`),
    update: (id: string, data: DiscapacidadAdultoUpdate) =>
      request<DiscapacidadAdulto>(`/discapacidad-adulto/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  antecedentesPenales: {
    list: (idAdulto: string) => request<AntecedentesPenales[]>(`/adultos/${idAdulto}/antecedentes-penales`),
    create: (idAdulto: string, data: Omit<AntecedentesPenales, "id_antecedentes_penales" | "id_adulto_significativo">) =>
      request<AntecedentesPenales>(`/adultos/${idAdulto}/antecedentes-penales`, { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<AntecedentesPenales>(`/antecedente-penal/${id}`),
    update: (id: string, data: AntecedentesPenalesUpdate) =>
      request<AntecedentesPenales>(`/antecedente-penal/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  // ── Ingreso ────────────────────────────────────────────────────────────────

  antecedenteIngreso: {
    list: (idNna: string) => request<AntecedenteIngreso[]>(`/nna/${idNna}/antecedentes-ingreso`),
    create: (idNna: string, data: Omit<AntecedenteIngreso, "id_antecedente_ingreso" | "id_nna">) =>
      request<AntecedenteIngreso>(`/nna/${idNna}/antecedentes-ingreso`, { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<AntecedenteIngreso>(`/antecedente-ingreso/${id}`),
    update: (id: string, data: AntecedenteIngresoUpdate) =>
      request<AntecedenteIngreso>(`/antecedente-ingreso/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  documentacionIngreso: {
    list: (idNna: string) => request<DocumentacionIngreso[]>(`/nna/${idNna}/documentacion-ingreso`),
    create: (idNna: string, data: Omit<DocumentacionIngreso, "id_documentacion" | "id_nna">) =>
      request<DocumentacionIngreso>(`/nna/${idNna}/documentacion-ingreso`, { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<DocumentacionIngreso>(`/documentacion-ingreso/${id}`),
    update: (id: string, data: DocumentacionIngresoUpdate) =>
      request<DocumentacionIngreso>(`/documentacion-ingreso/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  causalIngreso: {
    list: (idIngreso: string) => request<CausalIngreso[]>(`/antecedente-ingreso/${idIngreso}/causales`),
    create: (idIngreso: string, data: Omit<CausalIngreso, "id_registro_causales" | "id_antecedente_ingreso">) =>
      request<CausalIngreso>(`/antecedente-ingreso/${idIngreso}/causales`, { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<CausalIngreso>(`/causal-ingreso/${id}`),
    update: (id: string, data: CausalIngresoUpdate) =>
      request<CausalIngreso>(`/causal-ingreso/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  derechoVulnerado: {
    list: (idIngreso: string) => request<DerechoVulnerado[]>(`/antecedente-ingreso/${idIngreso}/derechos-vulnerados`),
    create: (idIngreso: string, data: Omit<DerechoVulnerado, "id_registro_derecho_vulnerado" | "id_antecedente_ingreso">) =>
      request<DerechoVulnerado>(`/antecedente-ingreso/${idIngreso}/derechos-vulnerados`, { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<DerechoVulnerado>(`/derecho-vulnerado/${id}`),
    update: (id: string, data: DerechoVulneradoUpdate) =>
      request<DerechoVulnerado>(`/derecho-vulnerado/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  // ── Historial / Reports ────────────────────────────────────────────────────

  historialRed: {
    list: (idNna: string) => request<HistorialRedProteccional[]>(`/nna/${idNna}/historial-red`),
    create: (idNna: string, data: Omit<HistorialRedProteccional, "id_historial_red" | "id_nna">) =>
      request<HistorialRedProteccional>(`/nna/${idNna}/historial-red`, { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<HistorialRedProteccional>(`/historial-red/${id}`),
    update: (id: string, data: HistorialRedProteccionalUpdate) =>
      request<HistorialRedProteccional>(`/historial-red/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  gestionBusqueda: {
    list: (idNna: string) => request<GestionBusquedaFamiliar[]>(`/nna/${idNna}/gestiones-busqueda`),
    create: (idNna: string, data: Omit<GestionBusquedaFamiliar, "id_gestion_busqueda" | "id_nna">) =>
      request<GestionBusquedaFamiliar>(`/nna/${idNna}/gestiones-busqueda`, { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<GestionBusquedaFamiliar>(`/gestion-busqueda/${id}`),
    update: (id: string, data: GestionBusquedaFamiliarUpdate) =>
      request<GestionBusquedaFamiliar>(`/gestion-busqueda/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  informeTribunal: {
    list: (idNna: string) => request<InformeTribunal[]>(`/nna/${idNna}/informes-tribunal`),
    create: (idNna: string, data: Omit<InformeTribunal, "id_informe" | "id_nna">) =>
      request<InformeTribunal>(`/nna/${idNna}/informes-tribunal`, { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<InformeTribunal>(`/informe-tribunal/${id}`),
    update: (id: string, data: InformeTribunalUpdate) =>
      request<InformeTribunal>(`/informe-tribunal/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  // ── Instrumentos ───────────────────────────────────────────────────────────

  e2p: {
    getQuestions: (version: number) => request<E2PQuestions>(`/e2p/versions/${version}`),
    listByNna: (idNna: string) => request<Instrumento[]>(`/nna/${idNna}/e2p`),
    listByAdulto: (idAdulto: string) => request<Instrumento[]>(`/adultos/${idAdulto}/e2p`),
    createByNna: (idNna: string, data: Omit<Instrumento, "id_instrumento" | "id_nna">) =>
      request<Instrumento>(`/nna/${idNna}/e2p`, { method: "POST", body: JSON.stringify(data) }),
    createByAdulto: (idAdulto: string, data: Omit<Instrumento, "id_instrumento" | "id_nna">) =>
      request<Instrumento>(`/adultos/${idAdulto}/e2p`, { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<Instrumento>(`/e2p/${id}`),
    update: (id: string, data: InstrumentoUpdate) =>
      request<Instrumento>(`/e2p/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  pmf: {
    listByNna: (idNna: string) => request<Instrumento[]>(`/nna/${idNna}/pmf`),
    listByAdulto: (idAdulto: string) => request<Instrumento[]>(`/adultos/${idAdulto}/pmf`),
    createByNna: (idNna: string, data: Omit<Instrumento, "id_instrumento" | "id_nna">) =>
      request<Instrumento>(`/nna/${idNna}/pmf`, { method: "POST", body: JSON.stringify(data) }),
    createByAdulto: (idAdulto: string, data: Omit<Instrumento, "id_instrumento" | "id_nna">) =>
      request<Instrumento>(`/adultos/${idAdulto}/pmf`, { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<Instrumento>(`/pmf/${id}`),
    update: (id: string, data: InstrumentoUpdate) =>
      request<Instrumento>(`/pmf/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  ncfas: {
    listByNna: (idNna: string) => request<Instrumento[]>(`/nna/${idNna}/ncfas`),
    listByAdulto: (idAdulto: string) => request<Instrumento[]>(`/adultos/${idAdulto}/ncfas`),
    createByNna: (idNna: string, data: Omit<Instrumento, "id_instrumento" | "id_nna">) =>
      request<Instrumento>(`/nna/${idNna}/ncfas`, { method: "POST", body: JSON.stringify(data) }),
    createByAdulto: (idAdulto: string, data: Omit<Instrumento, "id_instrumento" | "id_nna">) =>
      request<Instrumento>(`/adultos/${idAdulto}/ncfas`, { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<Instrumento>(`/ncfas/${id}`),
    update: (id: string, data: InstrumentoUpdate) =>
      request<Instrumento>(`/ncfas/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  // ── Antecedentes ───────────────────────────────────────────────────────────

  antecedenteSalud: {
    list: (idNna: string) => request<AntecedenteSalud[]>(`/nna/${idNna}/antecedentes-salud`),
    create: (idNna: string, data: Omit<AntecedenteSalud, "id_antecedente_salud" | "id_nna">) =>
      request<AntecedenteSalud>(`/nna/${idNna}/antecedentes-salud`, { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<AntecedenteSalud>(`/antecedente-salud/${id}`),
    update: (id: string, data: AntecedenteSaludUpdate) =>
      request<AntecedenteSalud>(`/antecedente-salud/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  antecedenteEscolar: {
    list: (idNna: string) => request<AntecedenteEscolar[]>(`/nna/${idNna}/antecedentes-escolares`),
    create: (idNna: string, data: Omit<AntecedenteEscolar, "id_antecedente_escolar" | "id_nna">) =>
      request<AntecedenteEscolar>(`/nna/${idNna}/antecedentes-escolares`, { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<AntecedenteEscolar>(`/antecedente-escolar/${id}`),
    update: (id: string, data: AntecedenteEscolarUpdate) =>
      request<AntecedenteEscolar>(`/antecedente-escolar/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  antecedenteFamiliar: {
    list: (idNna: string) => request<AntecedenteFamiliar[]>(`/nna/${idNna}/antecedentes-familiares`),
    create: (idNna: string, data: Omit<AntecedenteFamiliar, "id_antecedente_familiar" | "id_nna">) =>
      request<AntecedenteFamiliar>(`/nna/${idNna}/antecedentes-familiares`, { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<AntecedenteFamiliar>(`/antecedente-familiar/${id}`),
    update: (id: string, data: AntecedenteFamiliarUpdate) =>
      request<AntecedenteFamiliar>(`/antecedente-familiar/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  entornoFamiliar: {
    list: (idFamiliar: string) => request<EntornoFamiliar[]>(`/antecedente-familiar/${idFamiliar}/entorno`),
    create: (idFamiliar: string, data: Omit<EntornoFamiliar, "id_entorno_familiar" | "id_antecedente_familiar">) =>
      request<EntornoFamiliar>(`/antecedente-familiar/${idFamiliar}/entorno`, { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<EntornoFamiliar>(`/entorno-familiar/${id}`),
    update: (id: string, data: EntornoFamiliarUpdate) =>
      request<EntornoFamiliar>(`/entorno-familiar/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },
};
