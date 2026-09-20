"use client";

import { useId } from "react";
import { ChevronDownIcon } from "lucide-react";
import { type DimensionNCFAS, type ItemNCFAS } from "@/lib/api";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { makeItemKey, PUNTAJE_OPCIONES } from "./ncfas-utils";

interface NcfasDimensionSectionProps {
  dimension: DimensionNCFAS;
  momento: string;
  respuestasMomento: Record<string, string>;
  comentario: string;
  isCollapsed: boolean;
  onToggle: () => void;
  onSetPuntaje: (momento: string, key: string, value: string) => void;
  onSetComentario: (letra: string, value: string) => void;
}

function PuntajeSelect({
  item,
  momento,
  currentValue,
  onSetPuntaje,
}: {
  item: ItemNCFAS;
  momento: string;
  currentValue: string;
  onSetPuntaje: (momento: string, key: string, value: string) => void;
}) {
  const key = makeItemKey(item.letra_dimension, item.numero_item);

  return (
    <Select value={currentValue} onValueChange={(v) => onSetPuntaje(momento, key, v)}>
      {/* Sin esto, el trigger solo se anuncia por su valor elegido ("—" al
          empezar), asi que un lector de pantalla no distingue entre los ~100
          selectores de puntaje del instrumento. Se incluye el momento porque el
          mismo item se responde en Ingreso, Intermedio y Cierre. */}
      <SelectTrigger
        aria-label={`Puntaje ${momento} — ${item.numero_item}. ${item.nombre_item}`}
        className="w-[120px] h-7 text-xs"
      >
        <SelectValue placeholder="—" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__" className="text-xs">— Sin puntuar —</SelectItem>
        {PUNTAJE_OPCIONES.map((opt) => {
          const rubric = item.definiciones?.[opt.value];
          return (
            <SelectItem
              key={opt.value}
              value={opt.value}
              className="text-xs"
              title={rubric || undefined}
            >
              {opt.label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export function NcfasDimensionSection({
  dimension,
  momento,
  respuestasMomento,
  comentario,
  isCollapsed,
  onToggle,
  onSetPuntaje,
  onSetComentario,
}: NcfasDimensionSectionProps) {
  const comentarioId = useId();
  const scoredCount = Object.keys(respuestasMomento).filter((k) =>
    k.startsWith(dimension.letra + "_")
  ).length;

  return (
    <div className="border rounded-lg">
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 rounded-t-lg"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{dimension.letra}</span>
          {dimension.nombre}
          {scoredCount > 0 && (
            <span className="text-xs text-muted-foreground">({scoredCount} puntuados)</span>
          )}
        </div>
        <ChevronDownIcon className={cn("size-4 transition-transform", isCollapsed ? "" : "rotate-180")} />
      </button>
      {!isCollapsed && (
        <div className="px-3 pb-3 space-y-1.5">
          {dimension.items.map((item) => {
            const key = makeItemKey(dimension.letra, item.numero_item);
            const currentValue = respuestasMomento[key] || "__none__";
            return (
              <div key={item.id_item_ncfas} className="flex items-center gap-3 py-1.5 border-t border-border/50">
                <div className="flex-1 min-w-0">
                  <span className="text-sm">
                    {item.numero_item}. {item.nombre_item}
                    {item.es_item_general && (
                      <span className="text-xs text-muted-foreground italic ml-1">(general)</span>
                    )}
                  </span>
                </div>
                <div className="shrink-0">
                  <PuntajeSelect
                    item={item}
                    momento={momento}
                    currentValue={currentValue}
                    onSetPuntaje={onSetPuntaje}
                  />
                </div>
              </div>
            );
          })}
          <div className="pt-2 border-t border-border/50">
            <Label htmlFor={comentarioId} className="text-xs text-muted-foreground">Comentario {dimension.letra}</Label>
            <Textarea
              id={comentarioId}
              className="mt-1 h-16 text-xs"
              value={comentario}
              onChange={(e) => onSetComentario(dimension.letra, e.target.value)}
              placeholder={`Observaciones para ${dimension.nombre}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
