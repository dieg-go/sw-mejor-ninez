"use client";

import { useEffect, useState } from "react";
import { BarChart3Icon } from "lucide-react";
import { api, type NCFASEvaluacion } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "./section-card";

export function NCFASSummaryCard({ idNna, idCaso }: { idNna: string; idCaso?: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<NCFASEvaluacion[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.ncfas.listByNna(idNna, idCaso);
        setItems(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [idNna, idCaso]);

  return (
    <SectionCard
      href={`/nna/${idNna}/ncfas${idCaso ? `?id_caso=${idCaso}` : ""}`}
      icon={BarChart3Icon}
      label="NCFAS"
      loading={loading}
      error={error}
      isEmpty={items.length === 0}
      tone={items.length > 0 ? "accent" : "neutral"}
    >
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground line-clamp-2">Evaluaciones: {items.length}</p>
        {items.length > 1 && (
          <Badge variant="secondary" className="text-xs">
            {items.length} registros
          </Badge>
        )}
      </div>
    </SectionCard>
  );
}
