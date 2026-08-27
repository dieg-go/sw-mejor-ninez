import type { NotificacionFamiliar } from "@/lib/api";

export function diasDesde(iso: string | null): number | null {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso + "T00:00:00").getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getAlertaResumen(notifs: NotificacionFamiliar[]): "roja" | "naranja" | "verde" | null {
  let hasNaranja = false;
  for (const n of notifs) {
    if (n.resultado_contacto === "Acepta evaluación") return "verde";
  }
  for (const n of notifs) {
    if (n.resultado_contacto) continue;
    const dias2 = diasDesde(n.fecha_envio_carta_2);
    if (n.fecha_envio_carta_2 && dias2 !== null && dias2 >= 15) return "roja";
    const dias1 = diasDesde(n.fecha_envio_carta_1);
    if (n.fecha_envio_carta_1 && !n.fecha_envio_carta_2 && dias1 !== null && dias1 >= 30) hasNaranja = true;
  }
  return hasNaranja ? "naranja" : null;
}
