import { useState } from "react";
import type { CausalIngreso } from "@/lib/api";
import { CATALOGO_CAUSALES } from "@/lib/catalogos";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CausalesSectionProps {
  causales: CausalIngreso[];
  onAdd: (nombre: string, estado: string) => Promise<void>;
  saving: boolean;
}

export function CausalesSection({ causales, onAdd, saving }: CausalesSectionProps) {
  const [nombre, setNombre] = useState("");
  const [estado, setEstado] = useState("Activo");

  const handleAdd = async () => {
    await onAdd(nombre, estado);
    setNombre("");
    setEstado("Activo");
  };

  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground mb-2">Causales de Ingreso</h4>
      {causales.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin causales registradas.</p>
      ) : (
        <ul className="space-y-1 mb-2">
          {causales.map((c) => (
            <li key={c.id_registro_causales} className="text-sm flex items-center gap-2">
              <span>{c.nombre_causal || "—"}</span>
              <Badge variant="outline" className="text-xs">{c.estado || "—"}</Badge>
            </li>
          ))}
        </ul>
      )}
      {/* <div className="flex items-center gap-2 mt-2">
        <Select
          value={nombre || "none"}
          onValueChange={(v) => setNombre(v === "none" ? "" : v)}
        >
          <SelectTrigger className="h-7 text-xs w-44">
            <SelectValue placeholder="Nombre causal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Ninguna</SelectItem>
            {CATALOGO_CAUSALES.map((causal) => (
              <SelectItem key={causal} value={causal}>{causal}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={estado} onValueChange={setEstado}>
          <SelectTrigger className="h-7 text-xs w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Activo">Activo</SelectItem>
            <SelectItem value="Inactivo">Inactivo</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={saving}>+</Button>
      </div> */}
    </div>
  );
}
