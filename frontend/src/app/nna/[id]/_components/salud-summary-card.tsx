"use client";

import { useEffect, useState } from "react";
import { HeartPulseIcon } from "lucide-react";
import { api, type AntecedenteSalud } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "./section-card";

export function SaludSummaryCard({ idNna, idCaso }: { idNna: string; idCaso?: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AntecedenteSalud[]>([]);
  const [snippet, setSnippet] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.antecedenteSalud.list(idNna, idCaso);
        setItems(data);
        const last = data[data.length - 1];
        setSnippet(last ? last.prevision || "—" : null);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [idNna, idCaso]);

  return (
    <SectionCard
      href={`/nna/${idNna}/salud${idCaso ? `?id_caso=${idCaso}` : ""}`}
      icon={HeartPulseIcon}
      label="Salud"
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
