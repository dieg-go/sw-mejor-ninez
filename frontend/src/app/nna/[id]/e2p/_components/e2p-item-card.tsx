"use client";

import { PencilIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { E2PEvaluacion, Familiar, E2PPuntaje } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatRangoEtario, ZONE_COLORS, RESULTADO_STYLES } from "./e2p-utils";

interface E2PItemCardProps {
  item: E2PEvaluacion;
  puntaje: E2PPuntaje | null;
  familiares: Familiar[];
  onEdit: () => void;
  readOnly?: boolean;
}

function getFamiliarName(idFamiliar: string | null, familiares: Familiar[]) {
  if (!idFamiliar) return "—";
  const f = familiares.find((x) => x.id_familiar === idFamiliar);
  return f?.nombre || idFamiliar.slice(0, 8);
}

export function E2PItemCard({ item, puntaje, familiares, onEdit, readOnly }: E2PItemCardProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div><span className="text-xs text-muted-foreground">Familiar: </span>{getFamiliarName(item.id_familiar, familiares)}</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Resultado: </span>
              {item.perfil_resultado_global ? (
                <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold", RESULTADO_STYLES[item.perfil_resultado_global] || "bg-muted border-muted-foreground/20")}>
                  {item.perfil_resultado_global}
                </span>
              ) : (
                <span className="text-sm">—</span>
              )}
            </div>
            <div><span className="text-xs text-muted-foreground">Evaluación: </span>{formatDate(item.fecha_evaluacion)}</div>
            <div><span className="text-xs text-muted-foreground">Edad: </span>{item.edad_meses_evaluacion != null ? (item.edad_meses_evaluacion >= 12 ? `${Math.round(item.edad_meses_evaluacion / 12)} años` : `${item.edad_meses_evaluacion} meses`) : "—"}</div>
            {item.rango_etario != null && (
              <div><span className="text-xs text-muted-foreground">Rango: </span>{formatRangoEtario(item.rango_etario)}</div>
            )}
            {item.respuestas && (
              <div><span className="text-xs text-muted-foreground">Respuestas: </span>{Object.keys(item.respuestas).length} preguntas</div>
            )}
            {item.observacion && <div className="col-span-2"><span className="text-xs text-muted-foreground">Obs: </span>{item.observacion}</div>}
            {item.respuestas && puntaje && (
              <div className="col-span-2 mt-2 flex flex-wrap gap-1.5">
                {puntaje.categorias.map((c) => (
                  <span key={c.dimension} className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium", ZONE_COLORS[c.zona ?? ""] || "bg-muted")}>
                    {c.dimension} <span className="opacity-70">{c.puntaje_bruto}/{c.puntaje_max}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
          {!readOnly && <Button variant="ghost" size="icon" onClick={onEdit}><PencilIcon className="size-4" /></Button>}
        </div>
      </CardContent>
    </Card>
  );
}
