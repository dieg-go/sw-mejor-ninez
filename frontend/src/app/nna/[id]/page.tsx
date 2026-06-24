"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { api, type NNA } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { NNAHeader } from "./_components/nna-header";
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

export default function NNADetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [nna, setNna] = useState<NNA | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const nnaData = await api.nna.get(id);
        setNna(nnaData);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <IngresoSummaryCard idNna={id} />
        <DocumentacionSummaryCard idNna={id} />
        <ConsumoSummaryCard idNna={id} />
        <DiscapacidadesSummaryCard idNna={id} />
        <E2PSummaryCard idNna={id} />
        <PMFSummaryCard idNna={id} />
        <NCFASSummaryCard idNna={id} />
        <HistorialSummaryCard idNna={id} />
        <BusquedaFamiliarSummaryCard idNna={id} />
        <InformesSummaryCard idNna={id} />
        <SaludSummaryCard idNna={id} />
        <EscolarSummaryCard idNna={id} />
        <FamiliarSummaryCard idNna={id} />
      </div>
    </div>
  );
}
