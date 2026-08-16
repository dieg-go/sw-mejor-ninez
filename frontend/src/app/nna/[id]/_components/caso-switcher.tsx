"use client";

import { FolderIcon, LockIcon, PlusIcon, XCircleIcon } from "lucide-react";
import type { Caso } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatDate(d: string | null): string {
  if (!d) return "sin fecha";
  return new Date(d + "T00:00:00").toLocaleDateString("es-CL");
}

function casoLabel(c: Caso): string {
  if (c.estado === "En Progreso") return `Caso activo (desde ${formatDate(c.fecha_inicio)})`;
  return `Cerrado (${formatDate(c.fecha_inicio)} a ${formatDate(c.fecha_termino)})`;
}

export function CasoSwitcher({
  casos,
  selected,
  onSelect,
  onClose,
  onCreate,
  closing,
  creating,
}: {
  casos: Caso[];
  selected: string;
  onSelect: (idCaso: string) => void;
  onClose: () => void;
  onCreate: () => void;
  closing: boolean;
  creating: boolean;
}) {
  const active = casos.find((c) => c.estado === "En Progreso");
  const isClosed = selected !== active?.id_caso;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2.5">
      <FolderIcon className="size-4 text-muted-foreground shrink-0" />
      <Select value={selected} onValueChange={onSelect} disabled={casos.length === 0}>
        <SelectTrigger size="sm" className="min-w-56">
          <SelectValue placeholder="Seleccionar caso" />
        </SelectTrigger>
        <SelectContent>
          {casos.map((c) => (
            <SelectItem key={c.id_caso} value={c.id_caso}>
              {casoLabel(c)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isClosed && (
        <Badge variant="secondary" className="gap-1">
          <LockIcon className="size-3" /> Solo lectura
        </Badge>
      )}

      <div className="flex items-center gap-2 ml-auto">
        <Button
          size="sm"
          variant="outline"
          disabled={!active || closing}
          onClick={onClose}
        >
          <XCircleIcon /> Cerrar caso
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!!active || creating}
          onClick={onCreate}
        >
          <PlusIcon /> Nuevo caso
        </Button>
      </div>
    </div>
  );
}
