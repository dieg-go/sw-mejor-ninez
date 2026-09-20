"use client";

import { use, useEffect, useState } from "react";
import { Link } from "@/lib/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  UserRoundIcon,
  IdCardIcon,
  CakeIcon,
  MapPinIcon,
  PhoneIcon,
  PillIcon,
  AccessibilityIcon,
  ScaleIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  BarChart3Icon,
  AlertTriangleIcon,
  type LucideIcon,
} from "lucide-react";
import {
  api,
  type Familiar,
  type HistorialConsumoAdulto,
  type DiscapacidadAdulto,
  type AntecedentesPenales,
  type E2PEvaluacion,
  type PMFEvaluacion,
  type NCFASEvaluacion,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | null;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex items-start gap-2">
      {Icon && (
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="size-3.5" />
        </div>
      )}
      <div>
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="text-sm font-medium">{value || "\u2014"}</dd>
      </div>
    </div>
  );
}

type SectionKey = "consumo" | "discapacidades" | "penales" | "e2p" | "pmf" | "ncfas";

const SECTIONS: { key: SectionKey; label: string; icon: LucideIcon }[] = [
  { key: "consumo", label: "Consumo", icon: PillIcon },
  { key: "discapacidades", label: "Discapacidades", icon: AccessibilityIcon },
  { key: "penales", label: "Antec. Penales", icon: ScaleIcon },
  { key: "e2p", label: "E2P", icon: ClipboardCheckIcon },
  { key: "pmf", label: "PMF", icon: ClipboardListIcon },
  { key: "ncfas", label: "NCFAS", icon: BarChart3Icon },
];

export default function FamiliarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [familiar, setFamiliar] = useState<Familiar | null>(null);
  const [summaries, setSummaries] = useState<Record<SectionKey, { count: number; snippet: string } | null>>({
    consumo: null,
    discapacidades: null,
    penales: null,
    e2p: null,
    pmf: null,
    ncfas: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const familiarData = await api.familiares.get(id);

        const [consumo, discapacidades, penales, e2p, pmf, ncfas] = await Promise.all([
          api.historialConsumoAdulto.list(id).catch(() => [] as HistorialConsumoAdulto[]),
          api.discapacidadAdulto.list(id).catch(() => [] as DiscapacidadAdulto[]),
          api.antecedentesPenales.list(id).catch(() => [] as AntecedentesPenales[]),
          api.e2p.listByFamiliar(id).catch(() => [] as E2PEvaluacion[]),
          api.pmf.listByFamiliar(id).catch(() => [] as PMFEvaluacion[]),
          api.ncfas.listByFamiliar(id).catch(() => [] as NCFASEvaluacion[]),
        ]);

        const last = <T,>(arr: T[]): T | undefined => arr[arr.length - 1];

        const con = last(consumo);
        const disc = last(discapacidades);
        const pen = last(penales);

        setFamiliar(familiarData);
        setSummaries({
          consumo: con ? { count: consumo.length, snippet: `${con.nombre_sustancia || "\u2014"} \u00b7 ${con.estado_consumo || "\u2014"}` } : null,
          discapacidades: disc ? { count: discapacidades.length, snippet: `${disc.tipo || "\u2014"} \u00b7 ${disc.porcentaje_grado ?? "\u2014"}%` } : null,
          penales: pen ? { count: penales.length, snippet: pen.descripcion || "\u2014" } : null,
          e2p: e2p.length > 0 ? { count: e2p.length, snippet: `Evaluaciones: ${e2p.length}` } : null,
          pmf: pmf.length > 0 ? { count: pmf.length, snippet: `Evaluaciones: ${pmf.length}` } : null,
          ncfas: ncfas.length > 0 ? { count: ncfas.length, snippet: `Evaluaciones: ${ncfas.length}` } : null,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 min-h-[50vh]">
        <Spinner className="size-6" />
        <p className="text-sm text-muted-foreground">Cargando información del familiar…</p>
      </div>
    );
  }

  if (error || !familiar) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-destructive">{error || "Familiar no encontrado"}</p>
        <Button variant="outline" asChild className="mt-4">
          <Link href="/familiar"><ArrowLeftIcon /> Volver</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="-ml-2 mb-4">
        <Link href="/familiar"><ArrowLeftIcon /> Volver al listado</Link>
      </Button>

      {/* Familiar Header */}
      <Card className="mb-8 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary via-primary/60 to-primary/20" />
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserRoundIcon className="size-7" />
              </div>
              <div>
                <CardTitle className="text-2xl leading-tight">{familiar.nombre}</CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-3 mt-1.5">
                  <span className="inline-flex items-center gap-1">
                    <IdCardIcon className="size-3.5" />
                    RUN: {familiar.run || "\u2014"}
                  </span>
                </CardDescription>
              </div>
            </div>
            {familiar.tiene_antecedentes_penales && (
              <Badge variant="destructive" className="gap-1 self-start">
                <AlertTriangleIcon className="size-3.5" />
                Antecedentes penales
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
            <InfoRow label="Fecha nacimiento" value={familiar.fecha_nacimiento} icon={CakeIcon} />
            <InfoRow label="Dirección" value={familiar.direccion} icon={MapPinIcon} />
            <InfoRow label="Teléfono" value={familiar.numero_telefono} icon={PhoneIcon} />
          </dl>
        </CardContent>
      </Card>

      {/* Section cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map(({ key, label, icon: Icon }) => {
          const s = summaries[key];
          return (
            <Link key={key} href={`/familiar/${id}/${key}`} className="block group h-full">
              <Card className="h-full transition-all hover:border-primary/50 hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                        <Icon className="size-4" />
                      </div>
                      <CardTitle className="text-sm font-medium">{label}</CardTitle>
                    </div>
                    <ArrowRightIcon className="size-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  {!s ? (
                    <p className="text-xs text-muted-foreground/70 italic">Sin registros</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-muted-foreground line-clamp-2">{s.snippet}</p>
                      {s.count > 1 && (
                        <Badge variant="secondary" className="text-xs">
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
