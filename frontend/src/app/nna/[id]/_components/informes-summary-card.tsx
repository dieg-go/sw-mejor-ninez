"use client";

import { useEffect, useState } from "react";
import { ScaleIcon } from "lucide-react";
import { api, type InformeTribunal } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "./section-card";

export function InformesSummaryCard({ idNna, idCaso }: { idNna: string; idCaso?: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<InformeTribunal[]>([]);
  const [snippet, setSnippet] = useState<string | null>(null);
  const [vencido, setVencido] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.informeTribunal.list(idNna, idCaso);
        setItems(data);
        setVencido(
          data.some(
            (i) =>
              i.estado !== "Enviado" &&
              i.fecha_vencimiento &&
              new Date(i.fecha_vencimiento + "T00:00:00").getTime() < Date.now()
          )
        );
        const last = data[data.length - 1];
        setSnippet(last ? `${last.tipo_informe || "—"} · ${last.estado || "—"} · Vence: ${last.fecha_vencimiento || "—"}` : null);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [idNna, idCaso]);

  return (
    <SectionCard
      href={`/nna/${idNna}/informes${idCaso ? `?id_caso=${idCaso}` : ""}`}
      icon={ScaleIcon}
      label="Informes Tribunal"
      loading={loading}
      error={error}
      isEmpty={!snippet}
      tone={vencido ? "danger" : "neutral"}
    >
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground line-clamp-2">{snippet}</p>
        {items.length > 1 && (
          <Badge variant="secondary" className="text-xs">
            {items.length} registros
          </Badge>
        )}
      </div>
    </SectionCard>
  );
}
