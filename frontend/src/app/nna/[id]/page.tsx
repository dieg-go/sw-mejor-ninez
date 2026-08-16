"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { api, type Caso, type NNA } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { NNAHeader } from "./_components/nna-header";
import { CasoSwitcher } from "./_components/caso-switcher";
import { IngresoSummaryCard } from "./_components/ingreso-summary-card";
import { DocumentacionSummaryCard } from "./_components/documentacion-summary-card";
import { ConsumoSummaryCard } from "./_components/consumo-summary-card";
import { DiscapacidadesSummaryCard } from "./_components/discapacidades-summary-card";
import { E2PSummaryCard } from "./_components/e2p-summary-card";
import { PMFSummaryCard } from "./_components/pmf-summary-card";
import { NCFASSummaryCard } from "./_components/ncfas-summary-card";
import { HistorialSummaryCard } from "./_components/historial-summary-card";
import { BusquedaFamiliarSummaryCard } from "./_components/busqueda-familiar-summary-card";
import { InformesSummaryCard } from "./_components/informes-summary-card";
import { SaludSummaryCard } from "./_components/salud-summary-card";
import { EscolarSummaryCard } from "./_components/escolar-summary-card";
import { FamiliarSummaryCard } from "./_components/familiar-summary-card";

export default function NNADetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = use(params);
  const sp = use(searchParams);
  const router = useRouter();
  const [nna, setNna] = useState<NNA | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [casos, setCasos] = useState<Caso[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const nnaData = await api.nna.get(id);
        setNna(nnaData);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error inesperado");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        const list = await api.casos.list(id);
        setCasos(list);
        const activeId = list.find((c) => c.estado === "En Progreso")?.id_caso;
        const param = typeof sp.id_caso === "string" ? sp.id_caso : null;
        setSelected(param && list.some((c) => c.id_caso === param) ? param : activeId ?? null);
      } catch {
        setCasos([]);
      }
    })();
  }, [id, sp.id_caso]);

  const activeCaso = casos.find((c) => c.estado === "En Progreso");
  const effectiveCaso = selected ?? activeCaso?.id_caso ?? "";

  const handleSelect = (idCaso: string) => {
    setSelected(idCaso);
    router.replace(`/nna/${id}?id_caso=${idCaso}`);
  };

  const handleClose = async () => {
    if (!activeCaso) return;
    setClosing(true);
    try {
      await api.casos.update(activeCaso.id_caso, { estado: "Cerrado" });
      const list = await api.casos.list(id);
      setCasos(list);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setClosing(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const nuevo = await api.casos.create(id);
      const list = await api.casos.list(id);
      setCasos(list);
      setSelected(nuevo.id_caso);
      router.replace(`/nna/${id}?id_caso=${nuevo.id_caso}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 min-h-[50vh]">
        <Spinner className="size-6" />
        <p className="text-sm text-muted-foreground">Cargando información del NNA…</p>
      </div>
    );
  }

  if (error || !nna) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-destructive">{error || "NNA no encontrado"}</p>
        <Button variant="outline" asChild className="mt-4">
          <Link href="/nna"><ArrowLeftIcon /> Volver</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="-ml-2 mb-4">
        <Link href="/nna"><ArrowLeftIcon /> Volver al listado</Link>
      </Button>

      <NNAHeader nna={nna} />

      <div className="mb-4">
        <CasoSwitcher
          casos={casos}
          selected={effectiveCaso || "no-case"}
          onSelect={handleSelect}
          onClose={handleClose}
          onCreate={handleCreate}
          closing={closing}
          creating={creating}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <IngresoSummaryCard idNna={id} idCaso={effectiveCaso || undefined} />
        <DocumentacionSummaryCard idNna={id} idCaso={effectiveCaso || undefined} />
        <ConsumoSummaryCard idNna={id} />
        <DiscapacidadesSummaryCard idNna={id} />
        <E2PSummaryCard idNna={id} idCaso={effectiveCaso || undefined} />
        <PMFSummaryCard idNna={id} idCaso={effectiveCaso || undefined} />
        <NCFASSummaryCard idNna={id} idCaso={effectiveCaso || undefined} />
        <HistorialSummaryCard idNna={id} />
        <BusquedaFamiliarSummaryCard idNna={id} idCaso={effectiveCaso || undefined} />
        <InformesSummaryCard idNna={id} idCaso={effectiveCaso || undefined} />
        <SaludSummaryCard idNna={id} idCaso={effectiveCaso || undefined} />
        <EscolarSummaryCard idNna={id} idCaso={effectiveCaso || undefined} />
        <FamiliarSummaryCard idNna={id} idCaso={effectiveCaso || undefined} />
      </div>
    </div>
  );
}