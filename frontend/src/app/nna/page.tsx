"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, NNA } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export default function NNAListPage() {
  const [nnas, setNnas] = useState<NNA[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.nna
      .list(0, 500)
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">NNA</h1>
        <Button asChild>
          <Link href="/nuevo-caso">+ Nuevo caso</Link>
        </Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Buscar por nombre, RUN o comuna..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          {nnas.length === 0
            ? "No hay NNA registrados."
            : "Sin resultados para esta búsqueda."}
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Nombre</TableHead>
                <TableHead>RUN</TableHead>
                <TableHead>Comuna</TableHead>
                <TableHead>Sexo</TableHead>
                <TableHead>Región</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((nna) => (
                <TableRow key={nna.id_nna}>
                  <TableCell className="px-4 py-3">
                    <Link
                      href={`/nna/${nna.id_nna}`}
                      className="font-medium hover:underline"
                    >
                      {nna.nombre || "Sin nombre"}
                    </Link>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">
                    {nna.run || "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">
                    {nna.comuna || "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">
                    {nna.sexo || "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">
                    {nna.region || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableCaption>
              {filtered.length} de {nnas.length} registros
            </TableCaption>
          </Table>
        </div>
      )}
    </div>
  );
}
