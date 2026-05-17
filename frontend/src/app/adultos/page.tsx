"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type AdultoSignificativo } from "@/lib/api";
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
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

export default function AdultoListPage() {
  const [adultos, setAdultos] = useState<AdultoSignificativo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.adultos
      .list(0, 500)
      .then(setAdultos)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? adultos.filter(
        (a) =>
          a.nombre?.toLowerCase().includes(search.toLowerCase()) ||
          a.run?.toLowerCase().includes(search.toLowerCase()) ||
          a.direccion?.toLowerCase().includes(search.toLowerCase())
      )
    : adultos;

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
        <h1 className="text-2xl font-semibold">Adultos Significativos</h1>
        <Button asChild>
          <Link href="/adultos/nuevo">+ Nuevo Adulto</Link>
        </Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Buscar por nombre, RUN o dirección..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          {adultos.length === 0
            ? "No hay adultos registrados."
            : "Sin resultados para esta búsqueda."}
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Nombre</TableHead>
                <TableHead>RUN</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Antec. Penales</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((adulto) => (
                <TableRow key={adulto.id_adulto_significativo}>
                  <TableCell className="px-4 py-3">
                    <Link
                      href={`/adultos/${adulto.id_adulto_significativo}`}
                      className="font-medium hover:underline"
                    >
                      {adulto.nombre || "Sin nombre"}
                    </Link>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">
                    {adulto.run || "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">
                    {adulto.direccion || "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">
                    {adulto.numero_telefono || "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {adulto.tiene_antecedentes_penales ? (
                      <Badge variant="destructive">Sí</Badge>
                    ) : (
                      <Badge variant="outline">No</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableCaption>
              {filtered.length} de {adultos.length} registros
            </TableCaption>
          </Table>
        </div>
      )}
    </div>
  );
}
