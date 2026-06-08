import type { NNACreate } from "@/lib/api";

export const STEPS = [
  "NNA",
  "Ingreso",
  "Documentación",
  "Historial",
  "Revisión",
] as const;

export type StepIndex = 0 | 1 | 2 | 3 | 4;

export interface CausalEntry {
  nombre_causal: string;
  descripcion_detallada: string;
  estado: string;
}
export interface DerechoEntry {
  nombre_derecho: string;
  estado: string;
}
export interface DocEntry {
  tipo_documento: string;
  estado_recepcion: boolean;
  fecha_recepcion: Date | null;
  observacion: string;
  url_documentacion_ingreso: string;
}
export interface HistorialEntry {
  nombre_programa: string;
  fecha_ingreso: Date | null;
  fecha_egreso: Date | null;
  motivo_egreso: string;
}

export interface WizardData {
  // Step 1
  nna: NNACreate;
  nnaDate: Date | null;
  // Step 2
  ingreso: {
    fecha_ingreso_residencia: Date | null;
    id_solicitante_ingreso: string;
    orden_tribunal: boolean;
    fecha_causa: Date | null;
    tribunal: string;
    materia: string;
    codigo_rit: string;
    codigo_ruc: string;
    causales: CausalEntry[];
    derechos: DerechoEntry[];
  };
  // Step 3
  docs: DocEntry[];
  // Step 4
  historial: HistorialEntry[];
}

export function emptyWizard(): WizardData {
  return {
    nna: { nombre: "", run: "", sexo: "", etnia_declarada: "", nacionalidad: "", domicilio: "", poblacion_o_villa: "", comuna: "", region: "" },
    nnaDate: null,
    ingreso: {
      fecha_ingreso_residencia: null,
      id_solicitante_ingreso: "",
      orden_tribunal: false,
      fecha_causa: null,
      tribunal: "",
      materia: "",
      codigo_rit: "",
      codigo_ruc: "",
      causales: [],
      derechos: [],
    },
    docs: [],
    historial: [],
  };
}

export function fmt(d: Date | null): string | null {
  if (!d) return null;
  return d.toISOString().split("T")[0];
}
