"use client";

import { use, useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/navigation";
import {
  ArrowLeftIcon,
  CalendarIcon,
  PencilIcon,
  ClockIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  FileTextIcon,
  FileIcon,
} from "lucide-react";
import { api, type NNA, type InformeTribunal, type EstadoInforme } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileUpload } from "@/components/ui/file-upload";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("es-CL");
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso + "T00:00:00");
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  return diff;
}

function describeDays(n: number): string {
  if (n === 0) return "vence hoy";
  if (n > 0) return `en ${n} ${n === 1 ? "día" : "días"}`;
  const a = Math.abs(n);
  return `hace ${a} ${a === 1 ? "día" : "días"}`;
}

function isOverdue(item: InformeTribunal): boolean {
  if (item.estado === "Enviado" || item.estado === "Vencido") return false;
  const d = daysUntil(item.fecha_vencimiento);
  return d !== null && d < 0;
}

const ESTADOS: EstadoInforme[] = ["Pendiente", "Enviado", "Vencido"];

export default function InformesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = use(params);
  const sp = use(searchParams);
  const idCaso = typeof sp.id_caso === "string" ? sp.id_caso : undefined;
  const [nna, setNna] = useState<NNA | null>(null);
  const [items, setItems] = useState<InformeTribunal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClosed, setIsClosed] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEstado, setEditEstado] = useState<EstadoInforme | "">("");
  const [editFechaEnvio, setEditFechaEnvio] = useState<Date | undefined>(undefined);
  const [editUrlDocumento, setEditUrlDocumento] = useState<string>("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [nnaData, list] = await Promise.all([api.nna.get(id), api.informeTribunal.list(id, idCaso)]);
        setNna(nnaData);
        setItems(list);
        if (idCaso) setIsClosed((await api.casos.get(idCaso)).estado === "Cerrado");
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, idCaso]);

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        const da = a.fecha_vencimiento ? new Date(a.fecha_vencimiento + "T00:00:00").getTime() : Infinity;
        const db = b.fecha_vencimiento ? new Date(b.fecha_vencimiento + "T00:00:00").getTime() : Infinity;
        return da - db;
      }),
    [items]
  );

  const counts = useMemo(() => {
    let pendientes = 0;
    let vencidos = 0;
    let enviados = 0;
    for (const it of items) {
      if (it.estado === "Enviado") enviados++;
      else if (it.estado === "Vencido" || isOverdue(it)) vencidos++;
      else pendientes++;
    }
    return { pendientes, vencidos, enviados };
  }, [items]);

  const startEdit = (item: InformeTribunal) => {
    setEditingId(item.id_informe);
    setEditEstado(item.estado ?? "");
    setEditFechaEnvio(item.fecha_envio_real ? new Date(item.fecha_envio_real + "T00:00:00") : undefined);
    setEditUrlDocumento(item.url_documento ?? "");
    setEditError(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setEditError(null);
    setEditSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (editEstado) payload.estado = editEstado;
      if (editFechaEnvio) payload.fecha_envio_real = editFechaEnvio.toISOString().split("T")[0];
      else payload.fecha_envio_real = null;
      if (editUrlDocumento) payload.url_documento = editUrlDocumento;
      else payload.url_documento = null;
      await api.informeTribunal.update(editingId, payload);
      // Re-fetch: marcar "Enviado" puede encadenar el siguiente informe de Avance.
      const refreshed = await api.informeTribunal.list(id, idCaso);
      setItems(refreshed);
      setEditingId(null);
    } catch (e: any) {
      setEditError(e.message);
    } finally {
      setEditSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner className="size-6" />
      </div>
    );
  if (error || !nna)
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-destructive">{error || "NNA no encontrado"}</p>
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="-ml-2 mb-4">
        <Link href={`/nna/${id}${idCaso ? `?id_caso=${idCaso}` : ""}`}>
          <ArrowLeftIcon /> Volver al resumen
        </Link>
      </Button>
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{nna.nombre}</CardTitle>
        </CardHeader>
      </Card>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Informes de Tribunal</h2>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <ClockIcon className="size-5 text-muted-foreground" />
            <div>
              <div className="text-2xl font-semibold leading-none">{counts.pendientes}</div>
              <div className="text-xs text-muted-foreground mt-1">Pendientes</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <AlertTriangleIcon className="size-5 text-destructive" />
            <div>
              <div className="text-2xl font-semibold leading-none">{counts.vencidos}</div>
              <div className="text-xs text-muted-foreground mt-1">Vencidos</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <CheckCircle2Icon className="size-5 text-emerald-600" />
            <div>
              <div className="text-2xl font-semibold leading-none">{counts.enviados}</div>
              <div className="text-xs text-muted-foreground mt-1">Enviados</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileTextIcon />
            </EmptyMedia>
            <EmptyTitle>Sin informes registrados</EmptyTitle>
            <EmptyDescription>
              El informe de <strong>Diagnóstico</strong> se crea automáticamente al registrar el
              ingreso del caso (vence a 30 días). Los informes de <strong>Avance</strong> se
              generan cada 3 meses al marcar el anterior como enviado.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-3">
          {sorted.map((item) => {
            const overdue = isOverdue(item);
            const d = daysUntil(item.fecha_vencimiento);
            return (
              <Card key={item.id_informe} className={cn(overdue && "border-destructive/40")}>
                <CardContent className="pt-4">
                  {editingId === item.id_informe ? (
                    <form onSubmit={handleUpdate} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Tipo: solo lectura */}
                        <div>
                          <Label className="text-xs">Tipo informe</Label>
                          <div className="mt-1 text-sm font-medium">
                            {item.tipo_informe || "—"}
                          </div>
                        </div>
                        {/* Fecha vencimiento: solo lectura */}
                        <div>
                          <Label className="text-xs">Fecha vencimiento</Label>
                          <div className="mt-1 text-sm font-medium">
                            {formatDate(item.fecha_vencimiento)}
                          </div>
                        </div>
                        {/* Estado: editable */}
                        <div>
                          <Label className="text-xs">Estado</Label>
                          <Select
                            value={editEstado}
                            onValueChange={(v) => setEditEstado(v as EstadoInforme)}
                          >
                            <SelectTrigger className="mt-1 w-full">
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {ESTADOS.map((e) => (
                                  <SelectItem key={e} value={e}>
                                    {e}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </div>
                        {/* Fecha envío real: editable */}
                        <div>
                          <Label className="text-xs">Fecha envío real</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "w-full justify-start text-left font-normal mt-1",
                                  !editFechaEnvio && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon />
                                {editFechaEnvio
                                  ? editFechaEnvio.toLocaleDateString("es-CL")
                                  : "Seleccionar"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={editFechaEnvio}
                                onSelect={setEditFechaEnvio}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      {/* Documento del informe: editable */}
                      <div>
                        <Label className="text-xs">Documento del informe</Label>
                        <FileUpload
                          value={editUrlDocumento || null}
                          onUploadSuccess={(url) => setEditUrlDocumento(url)}
                          onClear={() => setEditUrlDocumento("")}
                          dropzoneLabel="Arrastra el informe aquí o haz clic para buscar"
                          dropzoneHint="PDF, imágenes o documentos (máx. 10 MB)"
                        />
                      </div>
                      {editError && <p className="text-destructive text-sm">{editError}</p>}
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={editSaving}>
                          {editSaving ? "Guardando..." : "Guardar"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingId(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant={item.tipo_informe === "Diagnóstico" ? "outline" : "secondary"}
                          >
                            {item.tipo_informe || "—"}
                          </Badge>
                          <Badge
                            variant={
                              overdue || item.estado === "Vencido"
                                ? "destructive"
                                : item.estado === "Enviado"
                                  ? "default"
                                  : "outline"
                            }
                          >
                            {overdue && item.estado === "Pendiente" ? "Vencido" : item.estado || "—"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                          <div>
                            <span className="text-xs text-muted-foreground">Vence: </span>
                            {formatDate(item.fecha_vencimiento)}
                            {d !== null && item.estado !== "Enviado" && (
                              <span
                                className={cn(
                                  "ml-2 text-xs",
                                  d < 0
                                    ? "text-destructive font-medium"
                                    : d <= 10
                                      ? "text-amber-600 font-medium"
                                      : "text-muted-foreground"
                                )}
                              >
                                ({describeDays(d)})
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">Envío real: </span>
                            {formatDate(item.fecha_envio_real)}
                          </div>
                        </div>
                        {item.url_documento && (
                          <a
                            href={item.url_documento}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline w-fit"
                          >
                            <FileIcon className="size-3.5" />
                            Ver documento
                          </a>
                        )}
                      </div>
                      {!isClosed && (
                        <Button variant="ghost" size="icon" onClick={() => startEdit(item)}>
                          <PencilIcon className="size-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
