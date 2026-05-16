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
        <p className="text-zinc-500 dark:text-zinc-400">Cargando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-red-600 dark:text-red-400">Error al cargar los datos</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          NNA
        </h1>
        <Link
          href="/nna/nuevo"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
        >
          + Nuevo NNA
        </Link>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre, RUN o comuna..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-zinc-500 dark:text-zinc-400 py-12">
          {nnas.length === 0
            ? "No hay NNA registrados."
            : "Sin resultados para esta búsqueda."}
        </p>
      ) : (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50 dark:bg-zinc-800/50">
                <TableHead className="text-zinc-600 dark:text-zinc-400">
                  Nombre
                </TableHead>
                <TableHead className="text-zinc-600 dark:text-zinc-400">
                  RUN
                </TableHead>
                <TableHead className="text-zinc-600 dark:text-zinc-400">
                  Comuna
                </TableHead>
                <TableHead className="text-zinc-600 dark:text-zinc-400">
                  Sexo
                </TableHead>
                <TableHead className="text-zinc-600 dark:text-zinc-400">
                  Región
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((nna) => (
                <TableRow key={nna.id_nna}>
                  <TableCell className="px-4 py-3">
                    <Link
                      href={`/nna/${nna.id_nna}`}
                      className="font-medium text-zinc-900 hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300"
                    >
                      {nna.nombre || "Sin nombre"}
                    </Link>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {nna.run || "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {nna.comuna || "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {nna.sexo || "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
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
