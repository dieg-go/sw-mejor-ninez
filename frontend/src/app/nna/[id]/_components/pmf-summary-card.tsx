"use client";

import { useEffect, useState } from "react";
import { ClipboardListIcon } from "lucide-react";
import { api, type PMFEvaluacion } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "./section-card";

export function PMFSummaryCard({ idNna }: { idNna: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<PMFEvaluacion[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.pmf.listByNna(idNna);
        setItems(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [idNna]);

  return (
    <SectionCard
      href={`/nna/${idNna}/pmf`}
      icon={ClipboardListIcon}
      label="PMF"
      loading={loading}
      error={error}
      isEmpty={items.length === 0}
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
