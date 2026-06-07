export const LIKERT_OPTIONS = [
  { value: 0, label: "Nunca" },
  { value: 1, label: "Casi Nunca" },
  { value: 2, label: "A veces" },
  { value: 3, label: "Casi Siempre" },
  { value: 4, label: "Siempre" },
];

export const VERSION_MONTHS: [number, number][] = [
  [0, 3],
  [4, 10],
  [11, 18],
  [19, 36],
  [37, 60],
  [61, 84],
  [85, 144],
  [145, 204],
];

export const CATEGORY_COLORS: Record<string, string> = {
  Vinculares: "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
  Formativas: "border-l-green-500 bg-green-50/50 dark:bg-green-950/20",
  Protectoras: "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20",
  Reflexivas: "border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/20",
};

export const ZONE_COLORS: Record<string, string> = {
  Baja: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  Intermedia: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Alta: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
};

export const RESULTADO_STYLES: Record<string, string> = {
  Riesgo: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  Monitoreo: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  Optimo: "bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
};

export function ageToVersion(fechaNacimiento: string | null, evalDate: Date): number | null {
  if (!fechaNacimiento) return null;
  const birth = new Date(fechaNacimiento + "T00:00:00");
  const months = (evalDate.getFullYear() - birth.getFullYear()) * 12 + (evalDate.getMonth() - birth.getMonth());
  for (let v = 0; v < VERSION_MONTHS.length; v++) {
    const [lo, hi] = VERSION_MONTHS[v];
    if (months >= lo && months <= hi) return v + 1;
  }
  if (months < 0) return 1;
  return 8;
}

export function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("es-CL");
}

export function getLikertLabel(value: number) {
  const opt = LIKERT_OPTIONS.find((o) => o.value === value);
  return opt?.label ?? "—";
}
