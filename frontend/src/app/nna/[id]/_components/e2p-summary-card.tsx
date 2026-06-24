"use client";

import { useEffect, useState } from "react";
import { ClipboardCheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { api, type E2PEvaluacion, type Familiar } from "@/lib/api";
import { SectionCard } from "./section-card";

const RESULTADO_STYLES: Record<string, string> = {
  Riesgo: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  Monitoreo: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  Optimo: "bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
};

function getFamiliarName(
  idFamiliar: string | null,
  names: Record<string, string>,
  pendientes: boolean
) {
  if (!idFamiliar) return "Sin asignar";
  if (pendientes && !names[idFamiliar]) return "…";
  return names[idFamiliar] || idFamiliar.slice(0, 8);
}

export function E2PSummaryCard({ idNna }: { idNna: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<E2PEvaluacion[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [namesLoading, setNamesLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.e2p.listByNna(idNna);
        setItems(data);

        const ids = [...new Set(data.map((e) => e.id_familiar).filter(Boolean) as string[])];
        if (ids.length > 0) {
          setNamesLoading(true);
          const results = await Promise.all(
            ids.map((id) => api.familiares.get(id).catch((): Familiar | null => null))
          );
          const nameMap: Record<string, string> = {};
          ids.forEach((id, i) => {
            nameMap[id] = results[i]?.nombre || id.slice(0, 8);
          });
          setNames(nameMap);
          setNamesLoading(false);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [idNna]);

  return (
    <SectionCard
      href={`/nna/${idNna}/e2p`}
      icon={ClipboardCheckIcon}
      label="E2P"
      loading={loading}
      error={error}
      isEmpty={items.length === 0}
    >
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id_e2p} className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground truncate">
              {getFamiliarName(item.id_familiar, names, namesLoading)}
            </span>
            {item.perfil_resultado_global ? (
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold shrink-0",
                  RESULTADO_STYLES[item.perfil_resultado_global] || "bg-muted border-muted-foreground/20"
                )}
              >
                {item.perfil_resultado_global}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground/70 shrink-0">Sin resultado</span>
            )}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
