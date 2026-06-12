const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const AUTH_TOKEN_KEY = "auth_token";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      window.location.href = "/login";
    }
    throw new Error("Sesión expirada");
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json();
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface NNA {
  id_nna: string;
  id_sis: string | null;
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

export interface Familiar {
  id_familiar: string;
  nombre: string | null;
  fecha_nacimiento: string | null;
  run: string | null;
  direccion: string | null;
  numero_telefono: string | null;
  tiene_antecedentes_penales: boolean;
}

export interface FamiliarCreate {
  nombre?: string | null;
  fecha_nacimiento?: string | null;
  run?: string | null;
  direccion?: string | null;
  numero_telefono?: string | null;
  tiene_antecedentes_penales?: boolean;
}

export type FamiliarUpdate = Partial<FamiliarCreate>;

export interface HistorialConsumoNNA {
  id_historial_consumo_nna: string;
  id_nna: string;
  nombre_sustancia: string | null;
  consumo_indirecto_gestacional: boolean;
  estado_consumo: string | null;
  fecha_inicio: string | null;
  fecha_termino: string | null;
  en_tratamiento: boolean;
}

export type HistorialConsumoNNAUpdate = Partial<Omit<HistorialConsumoNNA, "id_historial_consumo_nna" | "id_nna">>;

export interface HistorialConsumoAdulto {
  id_historial_consumo_adulto: string;
  id_familiar: string;
  nombre_sustancia: string | null;
  estado_consumo: string | null;
  fecha_inicio: string | null;
  fecha_termino: string | null;
  en_tratamiento: boolean;
}

export type HistorialConsumoAdultoUpdate = Partial<Omit<HistorialConsumoAdulto, "id_historial_consumo_adulto" | "id_familiar">>;

export interface DiscapacidadNNA {
  id_discapacidad_nna: string;
  id_nna: string;
  tipo: string | null;
  porcentaje_grado: number | null;
  observacion: string | null;
}

export type DiscapacidadNNAUpdate = Partial<Omit<DiscapacidadNNA, "id_discapacidad_nna" | "id_nna">>;

export interface DiscapacidadAdulto {
  id_discapacidad_adulto: string;
  id_familiar: string;
  tipo: string | null;
  porcentaje_grado: number | null;
  observacion: string | null;
}

export type DiscapacidadAdultoUpdate = Partial<Omit<DiscapacidadAdulto, "id_discapacidad_adulto" | "id_familiar">>;

export interface AntecedentesPenales {
  id_antecedente_penal: string;
  id_familiar: string;
  descripcion: string | null;
  url_documento_adjunto: string | null;
}

export type AntecedentesPenalesUpdate = Partial<Omit<AntecedentesPenales, "id_antecedente_penal" | "id_familiar">>;

export interface AntecedenteIngreso {
  id_antecedente_ingreso: string;
  id_nna: string;
  fecha_ingreso_residencia: string | null;
  id_solicitante_ingreso: string | null;
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
  url_documentacion_ingreso: string | null;
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


export interface ProcesoDespejeFamiliar {
  id_despeje: string;
  id_nna: string;
  fecha_solicitud_informe: string | null;
  fecha_recepcion_informe: string | null;
  estado: string | null;
  url_informe_hijo: string | null;
}

export type ProcesoDespejeFamiliarUpdate = Partial<Omit<ProcesoDespejeFamiliar, "id_despeje" | "id_nna">>;

export interface NotificacionFamiliar {
  id_notificacion: string;
  id_despeje: string;
  id_familiar: string;
  fecha_envio_carta_1: string | null;
  codigo_seguimiento_1: string | null;
  estado_entrega_1: string | null;
  fecha_recepcion_carta_1: string | null;
  fecha_envio_carta_2: string | null;
  codigo_seguimiento_2: string | null;
  estado_entrega_2: string | null;
  fecha_recepcion_carta_2: string | null;
  resultado_contacto: string | null;
  fecha_respuesta: string | null;
  observacion: string | null;
}

export type NotificacionFamiliarUpdate = Partial<Omit<NotificacionFamiliar, "id_notificacion" | "id_despeje" | "id_familiar">>;

export interface InformeTribunal {
  id_informe: string;
  id_nna: string;
  tipo_informe: string | null;
  fecha_vencimiento: string | null;
  fecha_envio_real: string | null;
  estado: string | null;
}

export type InformeTribunalUpdate = Partial<Omit<InformeTribunal, "id_informe" | "id_nna">>;

export interface E2PEvaluacion {
  id_e2p: string;
  id_nna: string;
  id_familiar: string | null;
  fecha_evaluacion: string | null;
  edad_meses_evaluacion: number | null;
  rango_etario: string | null;
  respuestas: Record<string, number> | null;
  perfil_resultado_global: string | null;
  observacion: string | null;
}

export type E2PCreate = Partial<Omit<E2PEvaluacion, "id_e2p" | "id_nna">>;
export type E2PUpdate = Partial<Omit<E2PEvaluacion, "id_e2p" | "id_nna">>;

export interface PMFEvaluacion {
  id_pmf: string;
  id_nna: string;
  id_familiar: string | null;
  fecha_evaluacion: string | null;
  fecha_proxima_evaluacion: string | null;
  respuestas: Record<string, boolean> | null;
  resultado: string | null;
  observacion: string | null;
}

export type PMFCreate = Partial<Omit<PMFEvaluacion, "id_pmf" | "id_nna">>;
export type PMFUpdate = Partial<Omit<PMFEvaluacion, "id_pmf" | "id_nna">>;

export interface NCFASEvaluacion {
  id_ncfas: string;
  id_nna: string;
  id_familiar: string | null;
  es_reunificacion: boolean;
  fecha_apertura: string | null;
  fecha_cierre: string | null;
  estado: string | null;
  observacion_general: string | null;
  respuestas: Record<string, Record<string, string>> | null;
}

export interface ItemNCFAS {
  id_item_ncfas: string;
  letra_dimension: string;
  nombre_dimension: string;
  numero_item: number;
  nombre_item: string;
  definiciones: Record<string, string> | null;
  es_item_general: boolean;
}

export interface DimensionNCFAS {
  letra: string;
  nombre: string;
  items: ItemNCFAS[];
}

export interface ComentarioNCFAS {
  id_comentario_ncfas: string;
  id_ncfas: string;
  letra_dimension: string;
  comentario: string;
}

export type NCFASCreate = Partial<Omit<NCFASEvaluacion, "id_ncfas" | "id_nna">>;
export type NCFASUpdate = Partial<Omit<NCFASEvaluacion, "id_ncfas" | "id_nna">>;

export interface AntecedenteSalud {
  id_antecedente_salud: string;
  id_nna: string;
  fecha_antecedente_salud: string | null;
  inscrito_en_centro_salud: boolean;
  id_centro_salud: string | null;
  prevision: string | null;
}

export type AntecedenteSaludUpdate = Partial<Omit<AntecedenteSalud, "id_antecedente_salud" | "id_nna">>;

export interface AntecedenteEscolar {
  id_antecedente_escolar: string;
  id_nna: string;
  fecha_antecedente_escolar: string | null;
  escolarizado: boolean;
  id_establecimiento_educacional: string | null;
  ultimo_ano_cursado: number | null;
}

export type AntecedenteEscolarUpdate = Partial<Omit<AntecedenteEscolar, "id_antecedente_escolar" | "id_nna">>;

export interface AntecedenteFamiliar {
  id_antecedente_familiar: string;
  id_nna: string;
  fecha_antecedente_familiar: string | null;
  id_adulto_responsable: string | null;
  con_quien_vive: string | null;
  con_quien_vive_detalle: string | null;
}

export type AntecedenteFamiliarUpdate = Partial<Omit<AntecedenteFamiliar, "id_antecedente_familiar" | "id_nna">>;

export interface VinculoFamiliar {
  id_vinculo_familiar: string;
  id_nna: string;
  id_familiar: string;
  parentesco: string | null;
}

export type VinculoFamiliarUpdate = Partial<Omit<VinculoFamiliar, "id_vinculo_familiar" | "id_nna">>;

// ── E2P Questions ────────────────────────────────────────────────────────────

export interface E2PQuestions {
  edad: string;
  escala: Record<string, string>;
  preguntas: { id: number; texto: string; dimension: string; subdimension?: string | null }[];
}

export interface E2PPuntaje {
  rango_etario: string;
  edad: string;
  escala: Record<string, string>;
  categorias: {
    dimension: string;
    puntaje_bruto: number;
    puntaje_max: number;
    decil: number | null;
    zona: string | null;
  }[];
  respuestas: Record<string, number>;
}

export interface PMFQuestions {
  id_pregunta_pmf: string;
  numero: number;
  afirmacion: string;
  escala: string | null;
}

export interface SolicitanteIngreso {
  id_solicitante_ingreso: string;
  nombre: string | null;
  categoria: string | null;
  ano_proyecto: number | null;
}
export type SolicitanteIngresoUpdate = Partial<Omit<SolicitanteIngreso, "id_solicitante_ingreso">>;

export interface EstablecimientoEducacional {
  id_establecimiento_educacional: string;
  nombre: string | null;
  rbd: number | null;
}
export type EstablecimientoEducacionalUpdate = Partial<Omit<EstablecimientoEducacional, "id_establecimiento_educacional">>;

export interface CentroSalud {
  id_centro_salud: string;
  nombre: string | null;
  tipo_recinto: string | null;
}
export type CentroSaludUpdate = Partial<Omit<CentroSalud, "id_centro_salud">>;

export interface VinculoNNA {
  id_vinculo_nna: string;
  id_nna_1: string;
  id_nna_2: string;
  parentesco: string | null;
}
export type VinculoNNAUpdate = Partial<Omit<VinculoNNA, "id_nna_1" | "id_nna_2" | "id_vinculo_nna">>;

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

  // ── Familiar ────────────────────────────────────────────────────────────────

  familiares: {
    list: (skip = 0, limit = 100) =>
      request<Familiar[]>(`/familiares?skip=${skip}&limit=${limit}`),
    get: (id: string) => request<Familiar>(`/familiares/${id}`),
    create: (data: FamiliarCreate) =>
      request<Familiar>("/familiares", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: FamiliarUpdate) =>
      request<Familiar>(`/familiares/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  // ── NNA children ───────────────────────────────────────────────────────────

  historialConsumoNNA: {
    list: (idNna: string) => request<HistorialConsumoNNA[]>(`/nna/${idNna}/historial-consumo`),
    create: (idNna: string, data: Omit<HistorialConsumoNNA, "id_historial_consumo_nna" | "id_nna">) =>
      request<HistorialConsumoNNA>(`/nna/${idNna}/historial-consumo`, { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<HistorialConsumoNNA>(`/historial-consumo-nna/${id}`),
    update: (id: string, data: HistorialConsumoNNAUpdate) =>
      request<HistorialConsumoNNA>(`/historial-consumo-nna/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  historialConsumoAdulto: {
    list: (idFamiliar: string) => request<HistorialConsumoAdulto[]>(`/familiares/${idFamiliar}/historial-consumo`),
    create: (idFamiliar: string, data: Omit<HistorialConsumoAdulto, "id_historial_consumo_adulto" | "id_familiar">) =>
      request<HistorialConsumoAdulto>(`/familiares/${idFamiliar}/historial-consumo`, { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<HistorialConsumoAdulto>(`/historial-consumo-adulto/${id}`),
    update: (id: string, data: HistorialConsumoAdultoUpdate) =>
      request<HistorialConsumoAdulto>(`/historial-consumo-adulto/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  discapacidadNNA: {
    list: (idNna: string) => request<DiscapacidadNNA[]>(`/nna/${idNna}/discapacidades`),
    create: (idNna: string, data: Omit<DiscapacidadNNA, "id_discapacidad_nna" | "id_nna">) =>
      request<DiscapacidadNNA>(`/nna/${idNna}/discapacidades`, { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<DiscapacidadNNA>(`/discapacidad-nna/${id}`),
    update: (id: string, data: DiscapacidadNNAUpdate) =>
      request<DiscapacidadNNA>(`/discapacidad-nna/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  discapacidadAdulto: {
    list: (idFamiliar: string) => request<DiscapacidadAdulto[]>(`/familiares/${idFamiliar}/discapacidades`),
    create: (idFamiliar: string, data: Omit<DiscapacidadAdulto, "id_discapacidad_adulto" | "id_familiar">) =>
      request<DiscapacidadAdulto>(`/familiares/${idFamiliar}/discapacidades`, { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<DiscapacidadAdulto>(`/discapacidad-adulto/${id}`),
    update: (id: string, data: DiscapacidadAdultoUpdate) =>
      request<DiscapacidadAdulto>(`/discapacidad-adulto/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  antecedentesPenales: {
    list: (idFamiliar: string) => request<AntecedentesPenales[]>(`/familiares/${idFamiliar}/antecedentes-penales`),
    create: (idFamiliar: string, data: Omit<AntecedentesPenales, "id_antecedente_penal" | "id_familiar">) =>
      request<AntecedentesPenales>(`/familiares/${idFamiliar}/antecedentes-penales`, { method: "POST", body: JSON.stringify(data) }),
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

  despeje: {
    getByNna: (idNna: string) => request<ProcesoDespejeFamiliar>(`/nna/${idNna}/despeje`),
    create: (idNna: string, data: Omit<ProcesoDespejeFamiliar, "id_despeje" | "id_nna">) =>
      request<ProcesoDespejeFamiliar>(`/nna/${idNna}/despeje`, { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: ProcesoDespejeFamiliarUpdate) =>
      request<ProcesoDespejeFamiliar>(`/despeje/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  notificacion: {
    list: (idDespeje: string) => request<NotificacionFamiliar[]>(`/despeje/${idDespeje}/notificaciones`),
    create: (idDespeje: string, data: Omit<NotificacionFamiliar, "id_notificacion" | "id_despeje">) =>
      request<NotificacionFamiliar>(`/despeje/${idDespeje}/notificaciones`, { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<NotificacionFamiliar>(`/notificacion/${id}`),
    update: (id: string, data: NotificacionFamiliarUpdate) =>
      request<NotificacionFamiliar>(`/notificacion/${id}`, { method: "PUT", body: JSON.stringify(data) }),
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
    getQuestions: (rango: string) => request<E2PQuestions>(`/e2p/versions/${rango}`),
    listByNna: (idNna: string) => request<E2PEvaluacion[]>(`/nna/${idNna}/e2p`),
    listByFamiliar: (idFamiliar: string) => request<E2PEvaluacion[]>(`/familiares/${idFamiliar}/e2p`),
    createByNna: (idNna: string, data: E2PCreate) =>
      request<E2PEvaluacion>(`/nna/${idNna}/e2p`, { method: "POST", body: JSON.stringify(data) }),
    createByFamiliar: (idFamiliar: string, data: E2PCreate) =>
      request<E2PEvaluacion>(`/familiares/${idFamiliar}/e2p`, { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<E2PEvaluacion>(`/e2p/${id}`),
    getPuntaje: (id: string) => request<E2PPuntaje>(`/e2p/${id}/puntaje`),
    update: (id: string, data: E2PUpdate) =>
      request<E2PEvaluacion>(`/e2p/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  pmf: {
    getQuestions: () => request<PMFQuestions[]>(`/pmf/preguntas`),
    listByNna: (idNna: string) => request<PMFEvaluacion[]>(`/nna/${idNna}/pmf`),
    listByFamiliar: (idFamiliar: string) => request<PMFEvaluacion[]>(`/familiares/${idFamiliar}/pmf`),
    createByNna: (idNna: string, data: PMFCreate) =>
      request<PMFEvaluacion>(`/nna/${idNna}/pmf`, { method: "POST", body: JSON.stringify(data) }),
    createByFamiliar: (idFamiliar: string, data: PMFCreate) =>
      request<PMFEvaluacion>(`/familiares/${idFamiliar}/pmf`, { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<PMFEvaluacion>(`/pmf/${id}`),
    update: (id: string, data: PMFUpdate) =>
      request<PMFEvaluacion>(`/pmf/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  ncfas: {
    listByNna: (idNna: string) => request<NCFASEvaluacion[]>(`/nna/${idNna}/ncfas`),
    listByFamiliar: (idFamiliar: string) => request<NCFASEvaluacion[]>(`/familiares/${idFamiliar}/ncfas`),
    createByNna: (idNna: string, data: NCFASCreate) =>
      request<NCFASEvaluacion>(`/nna/${idNna}/ncfas`, { method: "POST", body: JSON.stringify(data) }),
    createByFamiliar: (idFamiliar: string, data: NCFASCreate) =>
      request<NCFASEvaluacion>(`/familiares/${idFamiliar}/ncfas`, { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<NCFASEvaluacion>(`/ncfas/${id}`),
    update: (id: string, data: NCFASUpdate) =>
      request<NCFASEvaluacion>(`/ncfas/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    getItems: () => request<DimensionNCFAS[]>(`/ncfas/items`),
    getComentarios: (idNcfas: string) => request<ComentarioNCFAS[]>(`/ncfas/${idNcfas}/comentarios`),
    saveComentario: (idNcfas: string, letra: string, comentario: string) =>
      request<ComentarioNCFAS>(`/ncfas/${idNcfas}/comentarios/${letra}`, {
        method: "PUT",
        body: JSON.stringify({ comentario }),
      }),
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

  vinculoFamiliar: {
    list: (idNna: string) => request<VinculoFamiliar[]>(`/nna/${idNna}/vinculos`),
    create: (idNna: string, data: Omit<VinculoFamiliar, "id_vinculo_familiar" | "id_nna">) =>
      request<VinculoFamiliar>(`/nna/${idNna}/vinculos`, { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<VinculoFamiliar>(`/vinculo-familiar/${id}`),
    update: (id: string, data: VinculoFamiliarUpdate) =>
      request<VinculoFamiliar>(`/vinculo-familiar/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  solicitanteIngreso: {
    list: (skip = 0, limit = 100) =>
      request<SolicitanteIngreso[]>(`/solicitantes?skip=${skip}&limit=${limit}`),
    create: (data: Omit<SolicitanteIngreso, "id_solicitante_ingreso">) =>
      request<SolicitanteIngreso>("/solicitantes", { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<SolicitanteIngreso>(`/solicitantes/${id}`),
    update: (id: string, data: SolicitanteIngresoUpdate) =>
      request<SolicitanteIngreso>(`/solicitantes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  establecimientoEducacional: {
    list: (skip = 0, limit = 100) =>
      request<EstablecimientoEducacional[]>(`/establecimientos?skip=${skip}&limit=${limit}`),
    create: (data: Omit<EstablecimientoEducacional, "id_establecimiento_educacional">) =>
      request<EstablecimientoEducacional>("/establecimientos", { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<EstablecimientoEducacional>(`/establecimientos/${id}`),
    update: (id: string, data: EstablecimientoEducacionalUpdate) =>
      request<EstablecimientoEducacional>(`/establecimientos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  centroSalud: {
    list: (skip = 0, limit = 100) =>
      request<CentroSalud[]>(`/centros-salud?skip=${skip}&limit=${limit}`),
    create: (data: Omit<CentroSalud, "id_centro_salud">) =>
      request<CentroSalud>("/centros-salud", { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<CentroSalud>(`/centros-salud/${id}`),
    update: (id: string, data: CentroSaludUpdate) =>
      request<CentroSalud>(`/centros-salud/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  vinculoNNA: {
    list: (idNna: string) => request<VinculoNNA[]>(`/nna/${idNna}/vinculos-nna`),
    create: (idNna: string, data: Omit<VinculoNNA, "id_nna_1" | "id_vinculo_nna">) =>
      request<VinculoNNA>(`/nna/${idNna}/vinculos-nna`, { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<VinculoNNA>(`/vinculo-nna/${id}`),
    update: (id: string, data: VinculoNNAUpdate) =>
      request<VinculoNNA>(`/vinculo-nna/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  upload: {
    docs: async (file: File): Promise<{ url: string; filename: string }> => {
      const formData = new FormData();
      formData.append("file", file);

      const token = typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/upload/docs`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (res.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("auth_user");
          window.location.href = "/login";
        }
        throw new Error("Sesión expirada");
      }

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`${res.status}: ${body}`);
      }

      const data = await res.json();
      const baseOrigin = API_BASE.replace(/\/api$/, "");
      return { url: `${baseOrigin}${data.url}`, filename: data.filename };
    },
  },
};
