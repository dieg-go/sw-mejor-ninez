import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type {
  NNA,
  NNACreate,
  NNAUpdate,
  AdultoSignificativo,
  AdultoSignificativoCreate,
  AdultoSignificativoUpdate,
  HistorialConsumoNNA,
  HistorialConsumoNNAUpdate,
  HistorialConsumoAdulto,
  HistorialConsumoAdultoUpdate,
  DiscapacidadNNA,
  DiscapacidadNNAUpdate,
  DiscapacidadAdulto,
  DiscapacidadAdultoUpdate,
  AntecedentesPenales,
  AntecedentesPenalesUpdate,
  AntecedenteIngreso,
  AntecedenteIngresoUpdate,
  DocumentacionIngreso,
  DocumentacionIngresoUpdate,
  CausalIngreso,
  CausalIngresoUpdate,
  DerechoVulnerado,
  DerechoVulneradoUpdate,
  HistorialRedProteccional,
  HistorialRedProteccionalUpdate,
  GestionBusquedaFamiliar,
  GestionBusquedaFamiliarUpdate,
  InformeTribunal,
  InformeTribunalUpdate,
  Instrumento,
  InstrumentoUpdate,
  AntecedenteSalud,
  AntecedenteSaludUpdate,
  AntecedenteEscolar,
  AntecedenteEscolarUpdate,
  AntecedenteFamiliar,
  AntecedenteFamiliarUpdate,
  EntornoFamiliar,
  EntornoFamiliarUpdate,
} from "./api";

// ── Query key factory ─────────────────────────────────────────────────────────

export const keys = {
  nna: {
    all: ["nna"] as const,
    detail: (id: string) => ["nna", id] as const,
  },
  adultos: {
    all: ["adultos"] as const,
    detail: (id: string) => ["adultos", id] as const,
  },
  historialConsumoNNA: {
    list: (idNna: string) => ["historial-consumo-nna", idNna] as const,
    detail: (id: string) => ["historial-consumo-nna", id] as const,
  },
  discapacidadNNA: {
    list: (idNna: string) => ["discapacidad-nna", idNna] as const,
    detail: (id: string) => ["discapacidad-nna", id] as const,
  },
  antecedenteIngreso: {
    list: (idNna: string) => ["antecedente-ingreso", idNna] as const,
    detail: (id: string) => ["antecedente-ingreso", id] as const,
  },
  documentacionIngreso: {
    list: (idNna: string) => ["documentacion-ingreso", idNna] as const,
    detail: (id: string) => ["documentacion-ingreso", id] as const,
  },
  causalIngreso: {
    list: (idIngreso: string) => ["causal-ingreso", idIngreso] as const,
    detail: (id: string) => ["causal-ingreso", id] as const,
  },
  derechoVulnerado: {
    list: (idIngreso: string) => ["derecho-vulnerado", idIngreso] as const,
    detail: (id: string) => ["derecho-vulnerado", id] as const,
  },
  historialRed: {
    list: (idNna: string) => ["historial-red", idNna] as const,
    detail: (id: string) => ["historial-red", id] as const,
  },
  gestionBusqueda: {
    list: (idNna: string) => ["gestion-busqueda", idNna] as const,
    detail: (id: string) => ["gestion-busqueda", id] as const,
  },
  informeTribunal: {
    list: (idNna: string) => ["informe-tribunal", idNna] as const,
    detail: (id: string) => ["informe-tribunal", id] as const,
  },
  instrumentos: {
    e2pNna: (idNna: string) => ["e2p", "nna", idNna] as const,
    pmfNna: (idNna: string) => ["pmf", "nna", idNna] as const,
    ncfasNna: (idNna: string) => ["ncfas", "nna", idNna] as const,
    detail: (id: string) => ["instrumento", id] as const,
  },
  antecedenteSalud: {
    list: (idNna: string) => ["antecedente-salud", idNna] as const,
    detail: (id: string) => ["antecedente-salud", id] as const,
  },
  antecedenteEscolar: {
    list: (idNna: string) => ["antecedente-escolar", idNna] as const,
    detail: (id: string) => ["antecedente-escolar", id] as const,
  },
  antecedenteFamiliar: {
    list: (idNna: string) => ["antecedente-familiar", idNna] as const,
    detail: (id: string) => ["antecedente-familiar", id] as const,
  },
  entornoFamiliar: {
    list: (idFamiliar: string) => ["entorno-familiar", idFamiliar] as const,
    detail: (id: string) => ["entorno-familiar", id] as const,
  },
};

// ── NNA ───────────────────────────────────────────────────────────────────────

export function useNNA(id: string) {
  return useQuery({ queryKey: keys.nna.detail(id), queryFn: () => api.nna.get(id) });
}

export function useNNAList() {
  return useQuery({ queryKey: keys.nna.all, queryFn: () => api.nna.list() });
}

export function useNNACreate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: NNACreate) => api.nna.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.nna.all }),
  });
}

export function useNNAUpdate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: NNAUpdate) => api.nna.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.nna.detail(id) });
      qc.invalidateQueries({ queryKey: keys.nna.all });
    },
  });
}

// ── Adultos ───────────────────────────────────────────────────────────────────

export function useAdulto(id: string) {
  return useQuery({ queryKey: keys.adultos.detail(id), queryFn: () => api.adultos.get(id) });
}

export function useAdultoList() {
  return useQuery({ queryKey: keys.adultos.all, queryFn: () => api.adultos.list() });
}

export function useAdultoCreate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AdultoSignificativoCreate) => api.adultos.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.adultos.all }),
  });
}

export function useAdultoUpdate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AdultoSignificativoUpdate) => api.adultos.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.adultos.detail(id) });
      qc.invalidateQueries({ queryKey: keys.adultos.all });
    },
  });
}

// ── Historial Consumo NNA ─────────────────────────────────────────────────────

export function useHistorialConsumoNNAList(idNna: string) {
  return useQuery({ queryKey: keys.historialConsumoNNA.list(idNna), queryFn: () => api.historialConsumoNNA.list(idNna) });
}

export function useHistorialConsumoNNACreate(idNna: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<HistorialConsumoNNA, "id_historial_consumo" | "id_nna">) =>
      api.historialConsumoNNA.create(idNna, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.historialConsumoNNA.list(idNna) }),
  });
}

export function useHistorialConsumoNNAUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: HistorialConsumoNNAUpdate }) =>
      api.historialConsumoNNA.update(id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: keys.historialConsumoNNA.detail(vars.id) });
    },
  });
}

// ── Discapacidad NNA ──────────────────────────────────────────────────────────

export function useDiscapacidadNNAList(idNna: string) {
  return useQuery({ queryKey: keys.discapacidadNNA.list(idNna), queryFn: () => api.discapacidadNNA.list(idNna) });
}

export function useDiscapacidadNNACreate(idNna: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<DiscapacidadNNA, "id_discapacidad" | "id_nna">) =>
      api.discapacidadNNA.create(idNna, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.discapacidadNNA.list(idNna) }),
  });
}

export function useDiscapacidadNNAUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DiscapacidadNNAUpdate }) =>
      api.discapacidadNNA.update(id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: keys.discapacidadNNA.detail(vars.id) });
    },
  });
}

// ── Antecedente Ingreso ───────────────────────────────────────────────────────

export function useAntecedenteIngresoList(idNna: string) {
  return useQuery({ queryKey: keys.antecedenteIngreso.list(idNna), queryFn: () => api.antecedenteIngreso.list(idNna) });
}

export function useAntecedenteIngresoCreate(idNna: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<AntecedenteIngreso, "id_antecedente_ingreso" | "id_nna">) =>
      api.antecedenteIngreso.create(idNna, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.antecedenteIngreso.list(idNna) }),
  });
}

export function useAntecedenteIngresoUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AntecedenteIngresoUpdate }) =>
      api.antecedenteIngreso.update(id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: keys.antecedenteIngreso.detail(vars.id) });
    },
  });
}

// ── Documentacion Ingreso ─────────────────────────────────────────────────────

export function useDocumentacionIngresoList(idNna: string) {
  return useQuery({ queryKey: keys.documentacionIngreso.list(idNna), queryFn: () => api.documentacionIngreso.list(idNna) });
}

export function useDocumentacionIngresoCreate(idNna: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<DocumentacionIngreso, "id_documentacion" | "id_nna">) =>
      api.documentacionIngreso.create(idNna, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.documentacionIngreso.list(idNna) }),
  });
}

export function useDocumentacionIngresoUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DocumentacionIngresoUpdate }) =>
      api.documentacionIngreso.update(id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: keys.documentacionIngreso.detail(vars.id) });
    },
  });
}

// ── Causal Ingreso ────────────────────────────────────────────────────────────

export function useCausalIngresoList(idIngreso: string) {
  return useQuery({ queryKey: keys.causalIngreso.list(idIngreso), queryFn: () => api.causalIngreso.list(idIngreso), enabled: !!idIngreso });
}

export function useCausalIngresoCreate(idIngreso: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<CausalIngreso, "id_registro_causales" | "id_antecedente_ingreso">) =>
      api.causalIngreso.create(idIngreso, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.causalIngreso.list(idIngreso) }),
  });
}

// ── Derecho Vulnerado ─────────────────────────────────────────────────────────

export function useDerechoVulneradoList(idIngreso: string) {
  return useQuery({ queryKey: keys.derechoVulnerado.list(idIngreso), queryFn: () => api.derechoVulnerado.list(idIngreso), enabled: !!idIngreso });
}

export function useDerechoVulneradoCreate(idIngreso: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<DerechoVulnerado, "id_registro_derecho_vulnerado" | "id_antecedente_ingreso">) =>
      api.derechoVulnerado.create(idIngreso, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.derechoVulnerado.list(idIngreso) }),
  });
}

// ── Historial Red ─────────────────────────────────────────────────────────────

export function useHistorialRedList(idNna: string) {
  return useQuery({ queryKey: keys.historialRed.list(idNna), queryFn: () => api.historialRed.list(idNna) });
}

export function useHistorialRedCreate(idNna: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<HistorialRedProteccional, "id_historial_red" | "id_nna">) =>
      api.historialRed.create(idNna, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.historialRed.list(idNna) }),
  });
}

export function useHistorialRedUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: HistorialRedProteccionalUpdate }) =>
      api.historialRed.update(id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: keys.historialRed.detail(vars.id) });
    },
  });
}

// ── Gestión Búsqueda ──────────────────────────────────────────────────────────

export function useGestionBusquedaList(idNna: string) {
  return useQuery({ queryKey: keys.gestionBusqueda.list(idNna), queryFn: () => api.gestionBusqueda.list(idNna) });
}

export function useGestionBusquedaCreate(idNna: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<GestionBusquedaFamiliar, "id_gestion_busqueda" | "id_nna">) =>
      api.gestionBusqueda.create(idNna, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.gestionBusqueda.list(idNna) }),
  });
}

export function useGestionBusquedaUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: GestionBusquedaFamiliarUpdate }) =>
      api.gestionBusqueda.update(id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: keys.gestionBusqueda.detail(vars.id) });
    },
  });
}

// ── Informe Tribunal ──────────────────────────────────────────────────────────

export function useInformeTribunalList(idNna: string) {
  return useQuery({ queryKey: keys.informeTribunal.list(idNna), queryFn: () => api.informeTribunal.list(idNna) });
}

export function useInformeTribunalCreate(idNna: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<InformeTribunal, "id_informe" | "id_nna">) =>
      api.informeTribunal.create(idNna, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.informeTribunal.list(idNna) }),
  });
}

export function useInformeTribunalUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: InformeTribunalUpdate }) =>
      api.informeTribunal.update(id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: keys.informeTribunal.detail(vars.id) });
    },
  });
}

// ── Instrumentos ──────────────────────────────────────────────────────────────

export function useE2PListByNna(idNna: string) {
  return useQuery({ queryKey: keys.instrumentos.e2pNna(idNna), queryFn: () => api.e2p.listByNna(idNna) });
}

export function usePMFListByNna(idNna: string) {
  return useQuery({ queryKey: keys.instrumentos.pmfNna(idNna), queryFn: () => api.pmf.listByNna(idNna) });
}

export function useNCFASListByNna(idNna: string) {
  return useQuery({ queryKey: keys.instrumentos.ncfasNna(idNna), queryFn: () => api.ncfas.listByNna(idNna) });
}

export function useInstrumentoUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id, data }: { type: "e2p" | "pmf" | "ncfas"; id: string; data: InstrumentoUpdate }) => {
      if (type === "e2p") return api.e2p.update(id, data);
      if (type === "pmf") return api.pmf.update(id, data);
      return api.ncfas.update(id, data);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: keys.instrumentos.detail(vars.id) });
    },
  });
}

// ── Antecedente Salud ─────────────────────────────────────────────────────────

export function useAntecedenteSaludList(idNna: string) {
  return useQuery({ queryKey: keys.antecedenteSalud.list(idNna), queryFn: () => api.antecedenteSalud.list(idNna) });
}

export function useAntecedenteSaludCreate(idNna: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<AntecedenteSalud, "id_antecedente_salud" | "id_nna">) =>
      api.antecedenteSalud.create(idNna, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.antecedenteSalud.list(idNna) }),
  });
}

export function useAntecedenteSaludUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AntecedenteSaludUpdate }) =>
      api.antecedenteSalud.update(id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: keys.antecedenteSalud.detail(vars.id) });
    },
  });
}

// ── Antecedente Escolar ───────────────────────────────────────────────────────

export function useAntecedenteEscolarList(idNna: string) {
  return useQuery({ queryKey: keys.antecedenteEscolar.list(idNna), queryFn: () => api.antecedenteEscolar.list(idNna) });
}

export function useAntecedenteEscolarCreate(idNna: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<AntecedenteEscolar, "id_antecedente_escolar" | "id_nna">) =>
      api.antecedenteEscolar.create(idNna, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.antecedenteEscolar.list(idNna) }),
  });
}

export function useAntecedenteEscolarUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AntecedenteEscolarUpdate }) =>
      api.antecedenteEscolar.update(id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: keys.antecedenteEscolar.detail(vars.id) });
    },
  });
}

// ── Antecedente Familiar ──────────────────────────────────────────────────────

export function useAntecedenteFamiliarList(idNna: string) {
  return useQuery({ queryKey: keys.antecedenteFamiliar.list(idNna), queryFn: () => api.antecedenteFamiliar.list(idNna) });
}

export function useAntecedenteFamiliarCreate(idNna: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<AntecedenteFamiliar, "id_antecedente_familiar" | "id_nna">) =>
      api.antecedenteFamiliar.create(idNna, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.antecedenteFamiliar.list(idNna) }),
  });
}

export function useAntecedenteFamiliarUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AntecedenteFamiliarUpdate }) =>
      api.antecedenteFamiliar.update(id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: keys.antecedenteFamiliar.detail(vars.id) });
    },
  });
}

// ── Entorno Familiar ──────────────────────────────────────────────────────────

export function useEntornoFamiliarList(idFamiliar: string) {
  return useQuery({ queryKey: keys.entornoFamiliar.list(idFamiliar), queryFn: () => api.entornoFamiliar.list(idFamiliar), enabled: !!idFamiliar });
}

export function useEntornoFamiliarCreate(idFamiliar: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<EntornoFamiliar, "id_entorno_familiar" | "id_antecedente_familiar">) =>
      api.entornoFamiliar.create(idFamiliar, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.entornoFamiliar.list(idFamiliar) }),
  });
}

export function useEntornoFamiliarUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EntornoFamiliarUpdate }) =>
      api.entornoFamiliar.update(id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: keys.entornoFamiliar.detail(vars.id) });
    },
  });
}
