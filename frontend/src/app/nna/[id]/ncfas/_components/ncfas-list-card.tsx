"use client";

import { PencilIcon } from "lucide-react";
import { type NCFASEvaluacion, type Familiar } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MOMENTOS, formatDate } from "./ncfas-utils";

interface NcfasListCardProps {
  item: NCFASEvaluacion;
  familiares: Familiar[];
  onEdit: (item: NCFASEvaluacion) => void;
  readOnly?: boolean;
}

function getFamiliarName(idFamiliar: string | null, familiares: Familiar[]) {
  if (!idFamiliar) return "—";
  const f = familiares.find((x) => x.id_familiar === idFamiliar);
  return f?.nombre || idFamiliar.slice(0, 8);
}

export function NcfasListCard({ item, familiares, onEdit, readOnly }: NcfasListCardProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div className="flex items-center gap-2 col-span-2 mb-1">
              <span className="text-xs text-muted-foreground">Estado: </span>
              <Badge variant="outline">{item.estado || "—"}</Badge>
              {item.es_reunificacion && (
                <Badge variant="secondary" className="text-xs">Reunificación</Badge>
              )}
            </div>
            <div><span className="text-xs text-muted-foreground">Familiar: </span>{getFamiliarName(item.id_familiar, familiares)}</div>
            <div><span className="text-xs text-muted-foreground">Apertura: </span>{formatDate(item.fecha_apertura)}</div>
            <div><span className="text-xs text-muted-foreground">Cierre: </span>{formatDate(item.fecha_cierre)}</div>
            {item.respuestas && (
              <div>
                <span className="text-xs text-muted-foreground">Respuestas: </span>
                {MOMENTOS.filter((m) => item.respuestas?.[m] && Object.keys(item.respuestas[m]).length > 0).map((m) => (
                  <span key={m} className="text-xs mr-2">{m} ({Object.keys(item.respuestas![m]).length})</span>
                ))}
              </div>
            )}
            {item.observacion_general && (
              <div className="col-span-2">
                <span className="text-xs text-muted-foreground">Obs: </span>{item.observacion_general}
              </div>
            )}
          </div>
          {!readOnly && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Editar evaluación NCFAS${item.estado ? `: ${item.estado}` : ""}`}
              onClick={() => onEdit(item)}
            >
              <PencilIcon className="size-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
