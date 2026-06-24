"use client";

import { useEffect, useState } from "react";
import { PillIcon } from "lucide-react";
import { api, type HistorialConsumoNNA } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "./section-card";

export function ConsumoSummaryCard({ idNna }: { idNna: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<HistorialConsumoNNA[]>([]);
  const [snippet, setSnippet] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.historialConsumoNNA.list(idNna);
        setItems(data);
        const last = data[data.length - 1];
        setSnippet(last ? `${last.nombre_sustancia || "—"} · ${last.estado_consumo || "—"}` : null);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [idNna]);

  return (
    <SectionCard
      href={`/nna/${idNna}/consumo`}
      icon={PillIcon}
      label="Consumo"
      loading={loading}
      error={error}
      isEmpty={!snippet}
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
