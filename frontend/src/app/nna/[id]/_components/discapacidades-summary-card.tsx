"use client";

import { useEffect, useState } from "react";
import { AccessibilityIcon } from "lucide-react";
import { api, type DiscapacidadNNA } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "./section-card";

export function DiscapacidadesSummaryCard({ idNna }: { idNna: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<DiscapacidadNNA[]>([]);
  const [snippet, setSnippet] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.discapacidadNNA.list(idNna);
        setItems(data);
        const last = data[data.length - 1];
        setSnippet(last ? `${last.tipo || "—"} · ${last.porcentaje_grado ?? "—"}%` : null);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [idNna]);

  return (
    <SectionCard
      href={`/nna/${idNna}/discapacidades`}
      icon={AccessibilityIcon}
      label="Discapacidades"
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
