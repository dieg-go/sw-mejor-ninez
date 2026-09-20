export const LIKERT_OPTIONS = [
  { value: 0, label: "Nunca" },
  { value: 1, label: "Casi Nunca" },
  { value: 2, label: "A veces" },
  { value: 3, label: "Casi Siempre" },
  { value: 4, label: "Siempre" },
];

export const RANGOS_ETARIOS: { rango: string; minMeses: number; maxMeses: number }[] = [
  { rango: "0-3_meses",   minMeses: 0,   maxMeses: 3 },
  { rango: "4-10_meses",  minMeses: 4,   maxMeses: 10 },
  { rango: "11-18_meses", minMeses: 11,  maxMeses: 18 },
  { rango: "19-36_meses", minMeses: 19,  maxMeses: 36 },
  { rango: "3-5_anos",    minMeses: 37,  maxMeses: 60 },
  { rango: "6-7_anos",    minMeses: 61,  maxMeses: 84 },
  { rango: "8-12_anos",   minMeses: 85,  maxMeses: 144 },
  { rango: "13-17_anos",  minMeses: 145, maxMeses: 204 },
];

export const CATEGORY_COLORS: Record<string, string> = {
  Vinculares: "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
  Formativas: "border-l-green-500 bg-green-50/50 dark:bg-green-950/20",
  Protectoras: "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20",
  Reflexivas: "border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/20",
};

export const ZONE_COLORS: Record<string, string> = {
  "Baja frecuencia": "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  "Frecuencia intermedia": "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "Alta frecuencia": "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
};

export const RESULTADO_STYLES: Record<string, string> = {
  Riesgo: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  Monitoreo: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  Optimo: "bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
};

/**
 * Meses cumplidos entre el nacimiento y la evaluacion, o `null` si alguna de
 * las dos fechas no es valida.
 *
 * La guarda `isNaN` es el punto entero de esta funcion: sin ella una fecha mal
 * ingresada produce `NaN`, que no entra en ningun rango y tampoco es `< 0`, asi
 * que se colaba hasta el fallback y entregaba el instrumento equivocado en
 * silencio (defecto F2). Sigue el mismo patron que `calcularEdad` en
 * `src/lib/utils.ts`.
 */
export function edadEnMeses(
  fechaNacimiento: string | null,
  evalDate: Date,
): number | null {
  if (!fechaNacimiento) return null;
  const birth = new Date(fechaNacimiento + "T00:00:00");
  if (isNaN(birth.getTime())) return null;
  if (isNaN(evalDate.getTime())) return null;
  return (
    (evalDate.getFullYear() - birth.getFullYear()) * 12 +
    (evalDate.getMonth() - birth.getMonth())
  );
}

export function ageToRangoEtario(fechaNacimiento: string | null, evalDate: Date): string | null {
  const months = edadEnMeses(fechaNacimiento, evalDate);
  // Sin edad fiable no se elige instrumento: quien llama debe avisar al usuario
  // en vez de aplicar el cuestionario de otro tramo etario.
  if (months === null) return null;
  for (const r of RANGOS_ETARIOS) {
    if (months >= r.minMeses && months <= r.maxMeses) return r.rango;
  }
  if (months < 0) return RANGOS_ETARIOS[0].rango;
  return RANGOS_ETARIOS[RANGOS_ETARIOS.length - 1].rango;
}

export function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("es-CL");
}

const RANGO_LABELS: Record<string, string> = {
  "0-3_meses": "0 a 3 meses",
  "4-10_meses": "4 a 10 meses",
  "11-18_meses": "11 a 18 meses",
  "19-36_meses": "19 a 36 meses",
  "3-5_anos": "3 a 5 años",
  "6-7_anos": "6 a 7 años",
  "8-12_anos": "8 a 12 años",
  "13-17_anos": "13 a 17 años",
};

export function formatRangoEtario(rango: string) {
  return RANGO_LABELS[rango] ?? rango;
}

export function getLikertLabel(value: number) {
  const opt = LIKERT_OPTIONS.find((o) => o.value === value);
  return opt?.label ?? "—";
}
