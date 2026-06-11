export const MOMENTOS = ["Ingreso", "Intermedio", "Cierre"] as const;

export const PUNTAJE_OPCIONES = [
  { value: "+2", label: "+2 — Clara Fortaleza" },
  { value: "+1", label: "+1 — Leve Fortaleza" },
  { value: "0", label: "0 — Línea Base Adecuado" },
  { value: "-1", label: "-1 — Problema Leve" },
  { value: "-2", label: "-2 — Problema Moderado" },
  { value: "-3", label: "-3 — Problema Serio" },
  { value: "N/A", label: "N/A — No Aplica" },
  { value: "DN", label: "DN — Desconocido" },
] as const;

export const DIMENSIONES_SERV_GENERALES = ["A", "B", "C", "D", "E", "F", "G", "H"];
export const DIMENSIONES_REUNIFICACION = ["I", "J"];

export function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("es-CL");
}

export function isDimensionVisible(letra: string, esReunificacion: boolean) {
  if (DIMENSIONES_SERV_GENERALES.includes(letra)) return true;
  if (esReunificacion && DIMENSIONES_REUNIFICACION.includes(letra)) return true;
  return false;
}

export function makeItemKey(letra: string, numero: number) {
  return `${letra}_${numero}`;
}

export function buildEmptyRespuestas(): Record<string, Record<string, string>> {
  const init: Record<string, Record<string, string>> = {};
  MOMENTOS.forEach((m) => { init[m] = {}; });
  return init;
}
