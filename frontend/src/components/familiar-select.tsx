"use client";

import { useId } from "react";
import { type Familiar } from "@/lib/api";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FamiliarSelectProps {
  familiares: Familiar[];
  value: string;
  onChange: (value: string) => void;
  nullable?: boolean;
  emptyMessage?: string;
}

export function FamiliarSelect({ familiares, value, onChange, nullable, emptyMessage }: FamiliarSelectProps) {
  const id = useId();

  if (familiares.length === 0) {
    return (
      <div>
        {/* No hay control al que asociar la etiqueta: es un titulo, no un <Label>.
            Se conservan las clases base de Label (mas `text-xs`) para no mover nada. */}
        <p className="flex items-center gap-2 text-xs leading-none font-medium select-none">Familiar</p>
        <p className="text-sm text-muted-foreground mt-1.5">{emptyMessage || "No hay familiares disponibles"}</p>
      </div>
    );
  }

  return (
    <div>
      <Label htmlFor={id} className="text-xs">Familiar</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="mt-1 w-full">
          <SelectValue placeholder="Seleccionar" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {nullable && <SelectItem value="none">— Sin familiar —</SelectItem>}
            {familiares.map((f) => (
              <SelectItem key={f.id_familiar} value={f.id_familiar}>
                {f.nombre || f.id_familiar.slice(0, 8)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
