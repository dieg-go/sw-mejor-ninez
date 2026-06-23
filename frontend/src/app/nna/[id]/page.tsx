"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ClockIcon,
  UserRoundIcon,
  IdCardIcon,
  CakeIcon,
  CalendarIcon,
  MapPinIcon,
  GlobeIcon,
  FlagIcon,
  Building2Icon,
  HomeIcon,
  DoorOpenIcon,
  FileTextIcon,
  PillIcon,
  AccessibilityIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  BarChart3Icon,
  HistoryIcon,
  UsersIcon,
  ScaleIcon,
  HeartPulseIcon,
  GraduationCapIcon,
  type LucideIcon,
} from "lucide-react";
import { api, type NNA, type NotificacionFamiliar, type SolicitanteIngreso } from "@/lib/api";
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
        <dd className="text-sm font-medium">{value || "—"}</dd>
      </div>
    </div>
  );
}

function diasDesde(iso: string | null): number | null {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso + "T00:00:00").getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function calcularEdad(fechaNacimiento: string | null): number | null {
  if (!fechaNacimiento) return null;
  const nacimiento = new Date(fechaNacimiento + "T00:00:00");
  if (isNaN(nacimiento.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const aunNoCumple =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
  if (aunNoCumple) edad--;
  return edad;
}

function getAlertaResumen(notifs: NotificacionFamiliar[]): "roja" | "naranja" | "verde" | null {
  let hasNaranja = false;
  for (const n of notifs) {
    if (n.resultado_contacto === "Acepta evaluación") return "verde";
  }
  for (const n of notifs) {
    if (n.resultado_contacto) continue;
    const dias2 = diasDesde(n.fecha_envio_carta_2);
    if (n.fecha_envio_carta_2 && dias2 !== null && dias2 >= 15) return "roja";
    const dias1 = diasDesde(n.fecha_envio_carta_1);
    if (n.fecha_envio_carta_1 && !n.fecha_envio_carta_2 && dias1 !== null && dias1 >= 30) hasNaranja = true;
  }
  return hasNaranja ? "naranja" : null;
}

function AlertaBadge({ tipo }: { tipo: "roja" | "naranja" | "verde" }) {
  if (tipo === "roja") {
    return (
      <Badge variant="destructive" className="self-start text-xs gap-1">
        <AlertTriangleIcon className="h-3 w-3" />
        Plazos vencidos
      </Badge>
    );
  }
  if (tipo === "naranja") {
    return (
      <Badge variant="outline" className="self-start text-xs gap-1 border-orange-500 text-orange-600 bg-orange-50">
        <ClockIcon className="h-3 w-3" />
        Pendiente 2ª carta
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="self-start text-xs gap-1 bg-green-100 text-green-700">
      En evaluación
    </Badge>
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
  | "busqueda-familiar"
  | "informes"
  | "salud"
  | "escolar"
  | "familiar";

const SECTIONS: { key: SectionKey; label: string; icon: LucideIcon }[] = [
  { key: "ingreso", label: "Ingreso", icon: DoorOpenIcon },
  { key: "documentacion", label: "Documentación", icon: FileTextIcon },
  { key: "consumo", label: "Consumo", icon: PillIcon },
  { key: "discapacidades", label: "Discapacidades", icon: AccessibilityIcon },
  { key: "e2p", label: "E2P", icon: ClipboardCheckIcon },
  { key: "pmf", label: "PMF", icon: ClipboardListIcon },
  { key: "ncfas", label: "NCFAS", icon: BarChart3Icon },
  { key: "historial", label: "Historial Red", icon: HistoryIcon },
  { key: "busqueda-familiar", label: "Búsqueda Familiar", icon: UsersIcon },
  { key: "informes", label: "Informes Tribunal", icon: ScaleIcon },
  { key: "salud", label: "Salud", icon: HeartPulseIcon },
  { key: "escolar", label: "Escolar", icon: GraduationCapIcon },
  { key: "familiar", label: "Familiar", icon: HomeIcon },
];

export default function NNADetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [nna, setNna] = useState<NNA | null>(null);
  const [summaries, setSummaries] = useState<Record<SectionKey, { count: number; snippet: string } | null>>({} as any);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busquedaAlerta, setBusquedaAlerta] = useState<"roja" | "naranja" | "verde" | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const nnaData = await api.nna.get(id);

        // Fetch all sections in parallel
        const [
          sols, ingresos, docs, consumo, disc, e2p, pmf, ncfas,
          historial, despeje, informes, salud, escolar, familiar,
        ] = await Promise.all([
          api.solicitanteIngreso.list().catch(() => [] as SolicitanteIngreso[]),
          api.antecedenteIngreso.list(id).catch(() => []),
          api.documentacionIngreso.list(id).catch(() => []),
          api.historialConsumoNNA.list(id).catch(() => []),
          api.discapacidadNNA.list(id).catch(() => []),
          api.e2p.listByNna(id).catch(() => []),
          api.pmf.listByNna(id).catch(() => []),
          api.ncfas.listByNna(id).catch(() => []),
          api.historialRed.list(id).catch(() => []),
          api.despeje.getByNna(id).catch(() => null),
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
        const des = despeje;

        // Fetch notificaciones for alert badge
        if (des) {
          try {
            const notifs = await api.notificacion.list(des.id_despeje);
            const alerta = getAlertaResumen(notifs);
            setBusquedaAlerta(alerta);
          } catch {}
        }

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
            const solNombre = ing.id_solicitante_ingreso
              ? sols.find((s) => s.id_solicitante_ingreso === ing.id_solicitante_ingreso)?.nombre || ing.id_solicitante_ingreso
              : "—";
            const parts = [
              solNombre,
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
          "busqueda-familiar": des ? { count: 1, snippet: `${des.estado || "—"}` } : null,
          informes: inf ? { count: informes.length, snippet: `${inf.tipo_informe || "—"} · ${inf.estado || "—"} · Vence: ${inf.fecha_vencimiento || "—"}` } : null,
          salud: sal ? { count: salud.length, snippet: `${sal.prevision || "—"}` } : null,
          escolar: esc ? { count: escolar.length, snippet: `${esc.escolarizado ? "Escolarizado" : "No escolarizado"}` } : null,
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

  const edad = calcularEdad(nna.fecha_nacimiento);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="-ml-2 mb-4">
        <Link href="/nna"><ArrowLeftIcon /> Volver al listado</Link>
      </Button>

      {/* NNA Header */}
      <Card className="mb-8 overflow-hidden">
        {/* <div className="h-1.5 bg-gradient-to-r from-primary via-primary/60 to-primary/20" /> */}
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserRoundIcon className="size-7" />
              </div>
              <div>
                <CardTitle className="text-2xl leading-tight">{nna.nombre}</CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-3 mt-1.5">
                  <span className="inline-flex items-center gap-1">
                    <IdCardIcon className="size-3.5" />
                    RUN: {nna.run || "—"}
                  </span>
                  {edad !== null && (
                    <span className="inline-flex items-center gap-1">
                      <CakeIcon className="size-3.5" />
                      {edad} {edad === 1 ? "año" : "años"}
                    </span>
                  )}
                  {nna.sexo && (
                    <Badge variant="outline" className="text-xs font-normal">
                      {nna.sexo}
                    </Badge>
                  )}
                </CardDescription>
              </div>
            </div>
            {busquedaAlerta === "roja" && (
              <Badge variant="destructive" className="gap-1 self-start">
                <AlertTriangleIcon className="size-3.5" />
                Plazos de búsqueda familiar vencidos
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
            <InfoRow label="Fecha nacimiento" value={nna.fecha_nacimiento} icon={CalendarIcon} />
            <InfoRow label="Nacionalidad" value={nna.nacionalidad} icon={GlobeIcon} />
            <InfoRow label="Etnia" value={nna.etnia_declarada} icon={FlagIcon} />
            <InfoRow label="Región" value={nna.region} icon={MapPinIcon} />
            <InfoRow label="Comuna" value={nna.comuna} icon={Building2Icon} />
            <InfoRow label="Domicilio" value={nna.domicilio} icon={HomeIcon} />
            <InfoRow label="Población / Villa" value={nna.poblacion_o_villa} icon={MapPinIcon} />
          </dl>
        </CardContent>
      </Card>

      {/* Section cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map(({ key, label, icon: Icon }) => {
          const s = summaries[key];
          return (
            <Link key={key} href={`/nna/${id}/${key}`} className="block group h-full">
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
                      {(s.count > 1 || (key === "busqueda-familiar" && busquedaAlerta)) && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {key === "busqueda-familiar" && busquedaAlerta && (
                            <AlertaBadge tipo={busquedaAlerta} />
                          )}
                          {s.count > 1 && (
                            <Badge variant="secondary" className="text-xs">
                              {s.count} registros
                            </Badge>
                          )}
                        </div>
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