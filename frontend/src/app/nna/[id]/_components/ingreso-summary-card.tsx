"use client";

import { useEffect, useState } from "react";
import { DoorOpenIcon } from "lucide-react";
import { api, type AntecedenteIngreso, type SolicitanteIngreso } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "./section-card";

export function IngresoSummaryCard({ idNna, idCaso }: { idNna: string; idCaso?: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AntecedenteIngreso[]>([]);
  const [snippet, setSnippet] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [ingresos, sols] = await Promise.all([
          api.antecedenteIngreso.list(idNna, idCaso),
          api.solicitanteIngreso.list().catch(() => [] as SolicitanteIngreso[]),
        ]);
        setItems(ingresos);

        const ing = ingresos[ingresos.length - 1];
        if (!ing) {
          setSnippet(null);
          setLoading(false);
          return;
        }

        const solNombre = ing.id_solicitante_ingreso
          ? sols.find((s) => s.id_solicitante_ingreso === ing.id_solicitante_ingreso)?.nombre || ing.id_solicitante_ingreso
          : "—";

        let causaPrincipal: string | null = null;
        let derechoPrincipal: string | null = null;
        try {
          const [causales, derechos] = await Promise.all([
            api.causalIngreso.list(ing.id_antecedente_ingreso),
            api.derechoVulnerado.list(ing.id_antecedente_ingreso),
          ]);
          causaPrincipal = causales[0]?.nombre_causal || null;
          derechoPrincipal = derechos[0]?.nombre_derecho || null;
        } catch {}

        const parts = [
          solNombre,
          ing.tribunal || "—",
          ing.fecha_ingreso_residencia || "—",
        ];
        if (causaPrincipal) parts.push(`Causal: ${causaPrincipal}`);
        else if (derechoPrincipal) parts.push(`Derecho: ${derechoPrincipal}`);

        setSnippet(parts.join(" · "));
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [idNna, idCaso]);

  return (
    <SectionCard
      href={`/nna/${idNna}/ingreso${idCaso ? `?id_caso=${idCaso}` : ""}`}
      icon={DoorOpenIcon}
      label="Ingreso"
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
