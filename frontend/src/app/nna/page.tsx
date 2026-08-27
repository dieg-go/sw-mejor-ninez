"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { api, NNA } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { calcularEdad, iniciales } from "@/lib/utils";

function EstadoBadge({ estado }: { estado?: string | null }) {
  if (estado === "En Progreso") {
    return (
      <Badge variant="outline" className="gap-1 border-primary/40 bg-primary/10 text-primary font-normal">
        <span className="size-1.5 rounded-full bg-primary" /> Caso activo
      </Badge>
    );
  }
  if (estado === "Cerrado") {
    return (
      <Badge variant="secondary" className="font-normal">
        Cerrado
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="font-normal text-muted-foreground">
      Sin caso
    </Badge>
  );
}

export default function NNAListPage() {
  const [nnas, setNnas] = useState<NNA[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.nna
      .list(0, 100)
      .then(setNnas)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? nnas.filter(
        (n) =>
          n.nombre?.toLowerCase().includes(search.toLowerCase()) ||
          n.run?.toLowerCase().includes(search.toLowerCase()) ||
          n.comuna?.toLowerCase().includes(search.toLowerCase())
      )
    : nnas;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-destructive">Error al cargar los datos</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 font-heading text-3xl font-semibold tracking-tight">
            <span className="h-6 w-1.5 rounded-full bg-primary" aria-hidden />
            NNA
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {nnas.length === 0
              ? "Aún no hay niños, niñas o adolescentes registrados"
              : `${filtered.length} de ${nnas.length} ${nnas.length === 1 ? "registro" : "registros"}`}
          </p>
        </div>
        <Button asChild>
          <Link href="/nuevo-caso">+ Nuevo caso</Link>
        </Button>
      </div>

      <div className="fade-up mt-6">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, RUN o comuna..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="fade-up mt-4 overflow-hidden rounded-xl border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nombre</TableHead>
              <TableHead>Edad</TableHead>
              <TableHead>Sexo</TableHead>
              <TableHead>Comuna</TableHead>
              <TableHead>Región</TableHead>
              <TableHead>Estado caso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((nna, i) => (
              <TableRow
                key={nna.id_nna}
                className="fade-up transition-colors hover:bg-primary/5"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <TableCell className="px-4 py-3">
                  <Link href={`/nna/${nna.id_nna}`} className="flex items-center gap-3 group">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {iniciales(nna.nombre)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium group-hover:underline">
                        {nna.nombre || "Sin nombre"}
                      </p>
                      <p className="text-xs text-muted-foreground">{nna.run || "—"}</p>
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="px-4 py-3 text-muted-foreground">
                  {(() => {
                    const edad = calcularEdad(nna.fecha_nacimiento);
                    return edad !== null ? `${edad} ${edad === 1 ? "año" : "años"}` : "—";
                  })()}
                </TableCell>
                <TableCell className="px-4 py-3 text-muted-foreground">{nna.sexo || "—"}</TableCell>
                <TableCell className="px-4 py-3 text-muted-foreground">{nna.comuna || "—"}</TableCell>
                <TableCell className="px-4 py-3 text-muted-foreground">{nna.region || "—"}</TableCell>
                <TableCell className="px-4 py-3">
                  <EstadoBadge estado={nna.estado_caso} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <div className="border-t px-4 py-12 text-center">
            <p className="font-heading text-lg font-semibold">
              {nnas.length === 0 ? "Sin registros" : "Sin resultados"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {nnas.length === 0
                ? "Registra un nuevo caso para comenzar."
                : "Prueba con otro término de búsqueda."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}