export function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("es-CL");
}

export function diasDesde(iso: string | null): number | null {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso + "T00:00:00").getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export const RESULTADOS_CONTACTO = [
  "No responde",
  "Rechaza participación",
  "Acepta evaluación",
  "Fallecido",
] as const;
