import { useState } from "react";
import type { DerechoVulnerado } from "@/lib/api";
import { CATALOGO_DERECHOS } from "@/lib/catalogos";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DerechosSectionProps {
  derechos: DerechoVulnerado[];
  onAdd: (nombre: string, estado: string) => Promise<void>;
  saving: boolean;
}

export function DerechosSection({ derechos, onAdd, saving }: DerechosSectionProps) {
  const [nombre, setNombre] = useState("");
  const [estado, setEstado] = useState("Activo");

  const handleAdd = async () => {
    await onAdd(nombre, estado);
    setNombre("");
    setEstado("Activo");
  };

  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground mb-2">Derechos Vulnerados</h4>
      {derechos.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin derechos registrados.</p>
      ) : (
        <ul className="space-y-1 mb-2">
          {derechos.map((d) => (
            <li key={d.id_registro_derecho_vulnerado} className="text-sm flex items-center gap-2">
              <span>{d.nombre_derecho || "—"}</span>
              <Badge variant="outline" className="text-xs">{d.estado || "—"}</Badge>
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
            <SelectValue placeholder="Nombre derecho" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Ninguna</SelectItem>
            {CATALOGO_DERECHOS.map((derecho) => (
              <SelectItem key={derecho} value={derecho}>{derecho}</SelectItem>
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
