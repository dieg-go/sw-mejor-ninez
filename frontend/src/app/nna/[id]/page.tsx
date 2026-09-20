"use client";

import { use, useEffect, useState } from "react";
import { Link, useRouter } from "@/lib/navigation";
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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 font-heading text-base font-semibold tracking-tight">
      <span className="h-4 w-1 rounded-full bg-primary" aria-hidden />
      {children}
    </h2>
  );
}

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

      <div className="fade-up">
        <NNAHeader nna={nna} />
      </div>

      <div className="fade-up mt-4">
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

      {(() => {
        let i = 0;
        const wrap = (children: React.ReactNode) => (
          <div className="fade-up h-full" style={{ animationDelay: `${i++ * 45}ms` }}>
            {children}
          </div>
        );
        const grid = "mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

        return (
          <div className="mt-8 space-y-10">
            <section>
              <SectionHeading>Proceso de ingreso</SectionHeading>
              <div className={grid}>
                {wrap(<IngresoSummaryCard idNna={id} idCaso={effectiveCaso || undefined} />)}
                {wrap(<DocumentacionSummaryCard idNna={id} idCaso={effectiveCaso || undefined} />)}
                {wrap(<BusquedaFamiliarSummaryCard idNna={id} idCaso={effectiveCaso || undefined} />)}
                {wrap(<InformesSummaryCard idNna={id} idCaso={effectiveCaso || undefined} />)}
              </div>
            </section>

            <section>
              <SectionHeading>Evaluaciones</SectionHeading>
              <div className={grid}>
                {wrap(<E2PSummaryCard idNna={id} idCaso={effectiveCaso || undefined} />)}
                {wrap(<PMFSummaryCard idNna={id} idCaso={effectiveCaso || undefined} />)}
                {wrap(<NCFASSummaryCard idNna={id} idCaso={effectiveCaso || undefined} />)}
              </div>
            </section>

            <section>
              <SectionHeading>Antecedentes</SectionHeading>
              <div className={grid}>
                {wrap(<ConsumoSummaryCard idNna={id} />)}
                {wrap(<DiscapacidadesSummaryCard idNna={id} />)}
                {wrap(<SaludSummaryCard idNna={id} idCaso={effectiveCaso || undefined} />)}
                {wrap(<EscolarSummaryCard idNna={id} idCaso={effectiveCaso || undefined} />)}
                {wrap(<FamiliarSummaryCard idNna={id} idCaso={effectiveCaso || undefined} />)}
                {wrap(<HistorialSummaryCard idNna={id} />)}
              </div>
            </section>
          </div>
        );
      })()}
    </div>
  );
}