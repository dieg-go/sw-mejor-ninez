"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { api, type NNA } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Empty } from "@/components/ui/empty";

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || "—"}</dd>
    </div>
  );
}

type SectionKey =
  | "ingreso"
  | "documentacion"
  | "consumo"
  | "discapacidades"
  | "e2p"
  | "pmf"
  | "ncfas"
  | "historial"
  | "gestion"
  | "informes"
  | "salud"
  | "escolar"
  | "familiar";

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "ingreso", label: "Ingreso" },
  { key: "documentacion", label: "Documentación" },
  { key: "consumo", label: "Consumo" },
  { key: "discapacidades", label: "Discapacidades" },
  { key: "e2p", label: "E2P" },
  { key: "pmf", label: "PMF" },
  { key: "ncfas", label: "NCFAS" },
  { key: "historial", label: "Historial Red" },
  { key: "gestion", label: "Gestión de Búsqueda" },
  { key: "informes", label: "Informes Tribunal" },
  { key: "salud", label: "Salud" },
  { key: "escolar", label: "Escolar" },
  { key: "familiar", label: "Familiar" },
];

export default function NNADetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [nna, setNna] = useState<NNA | null>(null);
  const [summaries, setSummaries] = useState<Record<SectionKey, { count: number; snippet: string } | null>>({} as any);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const nnaData = await api.nna.get(id);

        // Fetch all sections in parallel
        const [
          ingresos, docs, consumo, disc, e2p, pmf, ncfas,
          historial, gestiones, informes, salud, escolar, familiar,
        ] = await Promise.all([
          api.antecedenteIngreso.list(id).catch(() => []),
          api.documentacionIngreso.list(id).catch(() => []),
          api.historialConsumoNNA.list(id).catch(() => []),
          api.discapacidadNNA.list(id).catch(() => []),
          api.e2p.listByNna(id).catch(() => []),
          api.pmf.listByNna(id).catch(() => []),
          api.ncfas.listByNna(id).catch(() => []),
          api.historialRed.list(id).catch(() => []),
          api.gestionBusqueda.list(id).catch(() => []),
          api.informeTribunal.list(id).catch(() => []),
          api.antecedenteSalud.list(id).catch(() => []),
          api.antecedenteEscolar.list(id).catch(() => []),
          api.antecedenteFamiliar.list(id).catch(() => []),
        ]);

        const last = <T,>(arr: T[]): T | undefined => arr[arr.length - 1];

        const ing = last(ingresos);
        const doc = last(docs);
        const con = last(consumo);
        const dsc = last(disc);
        const his = last(historial);
        const ges = last(gestiones);
        const inf = last(informes);
        const sal = last(salud);
        const esc = last(escolar);
        const fam = last(familiar);

        let causaPrincipal: string | null = null;
        let derechoPrincipal: string | null = null;
        if (ing) {
          try {
            const [causales, derechos] = await Promise.all([
              api.causalIngreso.list(ing.id_antecedente_ingreso),
              api.derechoVulnerado.list(ing.id_antecedente_ingreso),
            ]);
            causaPrincipal = causales[0]?.nombre_causal || null;
            derechoPrincipal = derechos[0]?.nombre_derecho || null;
          } catch {}
        }

        setNna(nnaData);
        setSummaries({
          ingreso: ing ? (() => {
            const parts = [
              ing.quien_solicita_ingreso || "—",
              ing.tribunal || "—",
              ing.fecha_ingreso_residencia || "—",
            ];
            if (causaPrincipal) parts.push(`Causal: ${causaPrincipal}`);
            else if (derechoPrincipal) parts.push(`Derecho: ${derechoPrincipal}`);
            return { count: ingresos.length, snippet: parts.join(" · ") };
          })() : null,
          documentacion: doc ? { count: docs.length, snippet: `${doc.tipo_documento || "—"} · ${doc.estado_recepcion ? "Recibido" : "Pendiente"}` } : null,
          consumo: con ? { count: consumo.length, snippet: `${con.nombre_sustancia || "—"} · ${con.estado_consumo || "—"}` } : null,
          discapacidades: dsc ? { count: disc.length, snippet: `${dsc.tipo || "—"} · ${dsc.porcentaje_grado ?? "—"}%` } : null,
          e2p: e2p.length > 0 ? { count: e2p.length, snippet: `Evaluaciones: ${e2p.length}` } : null,
          pmf: pmf.length > 0 ? { count: pmf.length, snippet: `Evaluaciones: ${pmf.length}` } : null,
          ncfas: ncfas.length > 0 ? { count: ncfas.length, snippet: `Evaluaciones: ${ncfas.length}` } : null,
          historial: his ? { count: historial.length, snippet: `${his.nombre_programa || "—"} · Ingreso: ${his.fecha_ingreso || "—"}` } : null,
          gestion: ges ? { count: gestiones.length, snippet: `${ges.tipo_gestion || "—"} · ${ges.resultado || "—"}` } : null,
          informes: inf ? { count: informes.length, snippet: `${inf.tipo_informe || "—"} · ${inf.estado || "—"} · Vence: ${inf.fecha_vencimiento || "—"}` } : null,
          salud: sal ? { count: salud.length, snippet: `${sal.establecimiento || "—"} · ${sal.prevision || "—"}` } : null,
          escolar: esc ? { count: escolar.length, snippet: `${esc.establecimiento || "—"} · ${esc.escolarizado ? "Escolarizado" : "No escolarizado"}` } : null,
          familiar: fam ? { count: familiar.length, snippet: `Registrado: ${fam.fecha_antecedente_familiar || "—"}` } : null,
        });
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner className="size-6" />
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

      {/* NNA Header */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{nna.nombre}</CardTitle>
          <CardDescription>RUN: {nna.run || "—"}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <InfoRow label="Sexo" value={nna.sexo} />
            <InfoRow label="Fecha nacimiento" value={nna.fecha_nacimiento} />
            <InfoRow label="Nacionalidad" value={nna.nacionalidad} />
            <InfoRow label="Etnia" value={nna.etnia_declarada} />
            <InfoRow label="Región" value={nna.region} />
            <InfoRow label="Comuna" value={nna.comuna} />
            <InfoRow label="Domicilio" value={nna.domicilio} />
            <InfoRow label="Población / Villa" value={nna.poblacion_o_villa} />
          </dl>
        </CardContent>
      </Card>

      {/* Section cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map(({ key, label }) => {
          const s = summaries[key];
          return (
            <Link key={key} href={`/nna/${id}/${key}`} className="block group">
              <Card className="h-full transition-colors hover:border-primary/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{label}</CardTitle>
                    <ArrowRightIcon className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardHeader>
                <CardContent>
                  {!s ? (
                    <Empty>
                      <p className="text-xs text-muted-foreground">Sin registros.</p>
                    </Empty>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-muted-foreground line-clamp-2">{s.snippet}</p>
                      {s.count > 1 && (
                        <Badge variant="secondary" className="self-start text-xs">
                          {s.count} registros
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
