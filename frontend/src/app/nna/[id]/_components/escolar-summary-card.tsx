"use client";

import { useEffect, useState } from "react";
import { GraduationCapIcon } from "lucide-react";
import { api, type AntecedenteEscolar } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "./section-card";

export function EscolarSummaryCard({ idNna }: { idNna: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AntecedenteEscolar[]>([]);
  const [snippet, setSnippet] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.antecedenteEscolar.list(idNna);
        setItems(data);
        const last = data[data.length - 1];
        setSnippet(last ? (last.escolarizado ? "Escolarizado" : "No escolarizado") : null);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [idNna]);

  return (
    <SectionCard
      href={`/nna/${idNna}/escolar`}
      icon={GraduationCapIcon}
      label="Escolar"
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
