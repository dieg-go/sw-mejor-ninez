"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangleIcon, ArrowLeftIcon, CalendarIcon, ClockIcon, PencilIcon, PlusIcon } from "lucide-react";
import { api, type Familiar, type NNA, type NotificacionFamiliar, type ProcesoDespejeFamiliar } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Empty } from "@/components/ui/empty";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("es-CL");
}

function diasDesde(iso: string | null): number | null {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso + "T00:00:00").getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

type AlertaTipo = "roja" | "naranja" | "verde" | null;

function getAlerta(n: NotificacionFamiliar): AlertaTipo {
  if (n.resultado_contacto) {
    if (n.resultado_contacto === "Acepta evaluación") return "verde";
    return null;
  }
  const dias2 = diasDesde(n.fecha_envio_carta_2);
  if (n.fecha_envio_carta_2 && dias2 !== null && dias2 >= 15) return "roja";
  const dias1 = diasDesde(n.fecha_envio_carta_1);
  if (n.fecha_envio_carta_1 && !n.fecha_envio_carta_2 && dias1 !== null && dias1 >= 30) return "naranja";
  return null;
}

export type { AlertaTipo };
export { getAlerta, diasDesde };

const ESTADOS_DESPEJE = [
  "Pendiente Informe",
  "En Notificación",
  "Evaluando",
  "Cerrado Sin Red",
  "Cerrado Con Red",
] as const;

const RESULTADOS_CONTACTO = [
  "No responde",
  "Rechaza participación",
  "Acepta evaluación",
  "Fallecido",
] as const;

const DEFAULT_DESPEJE = {
  fecha_solicitud_informe: "",
  fecha_recepcion_informe: "",
  estado: "",
  url_informe_hijo: "",
};

const DEFAULT_NOTIFICACION = {
  id_familiar: "",
  fecha_envio_carta_1: "",
  codigo_seguimiento_1: "",
  estado_entrega_1: "",
  fecha_recepcion_carta_1: "",
  fecha_envio_carta_2: "",
  codigo_seguimiento_2: "",
  estado_entrega_2: "",
  fecha_recepcion_carta_2: "",
  resultado_contacto: "",
  fecha_respuesta: "",
  observacion: "",
};

export default function BusquedaFamiliarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [nna, setNna] = useState<NNA | null>(null);
  const [despeje, setDespeje] = useState<ProcesoDespejeFamiliar | null>(null);
  const [notificaciones, setNotificaciones] = useState<NotificacionFamiliar[]>([]);
  const [familiares, setFamiliares] = useState<Familiar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Despeje form
  const [editingDespeje, setEditingDespeje] = useState(false);
  const [despejeForm, setDespejeForm] = useState(DEFAULT_DESPEJE);
  const [despejeFechas, setDespejeFechas] = useState<Record<string, Date | undefined>>({});
  const [despejeSaving, setDespejeSaving] = useState(false);
  const [despejeError, setDespejeError] = useState<string | null>(null);

  // Notificacion form
  const [showNotifForm, setShowNotifForm] = useState(false);
  const [notifForm, setNotifForm] = useState({ ...DEFAULT_NOTIFICACION });
  const [notifFechas, setNotifFechas] = useState<Record<string, Date | undefined>>({});
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);

  // Notificacion edit
  const [editingNotifId, setEditingNotifId] = useState<string | null>(null);
  const [editNotifForm, setEditNotifForm] = useState({ ...DEFAULT_NOTIFICACION });
  const [editNotifFechas, setEditNotifFechas] = useState<Record<string, Date | undefined>>({});
  const [editNotifSaving, setEditNotifSaving] = useState(false);
  const [editNotifError, setEditNotifError] = useState<string | null>(null);

  // Confirm cerrar
  const [confirmCerrarId, setConfirmCerrarId] = useState<string | null>(null);
  const [cerrarSaving, setCerrarSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [nnaData, famList] = await Promise.all([
          api.nna.get(id),
          api.familiares.list(),
        ]);
        setNna(nnaData);
        setFamiliares(famList);

        try {
          const des = await api.despeje.getByNna(id);
          setDespeje(des);
          const notifs = await api.notificacion.list(des.id_despeje);
          setNotificaciones(notifs);
        } catch {
          // Despeje doesn't exist yet — expected
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const getFamiliarNombre = (idFamiliar: string) => {
    const f = familiares.find((x) => x.id_familiar === idFamiliar);
    return f?.nombre || idFamiliar;
  };

  const hoy = () => new Date().toISOString().split("T")[0];

  // ── Acciones rápidas ─────────────────────────────────────────────────────────

  const handleEnviarCarta2 = (n: NotificacionFamiliar) => {
    const today = new Date();
    startEditNotif(n, {
      fecha_envio_carta_2: today,
    });
  };

  const handleConfirmCerrar = async (n: NotificacionFamiliar) => {
    setCerrarSaving(true);
    try {
      const payload: Record<string, unknown> = {
        resultado_contacto: "No responde",
        fecha_respuesta: hoy(),
      };
      const updated = await api.notificacion.update(n.id_notificacion, payload as any);
      setNotificaciones((prev) => prev.map((x) => (x.id_notificacion === n.id_notificacion ? updated : x)));
    } catch (e: any) {
      setEditNotifError(e.message);
    } finally {
      setCerrarSaving(false);
      setConfirmCerrarId(null);
    }
  };

  // ── Despeje ──────────────────────────────────────────────────────────────────

  const startEditDespeje = () => {
    setEditingDespeje(true);
    setDespejeForm({
      fecha_solicitud_informe: despeje?.fecha_solicitud_informe || "",
      fecha_recepcion_informe: despeje?.fecha_recepcion_informe || "",
      estado: despeje?.estado || "",
      url_informe_hijo: despeje?.url_informe_hijo || "",
    });
    setDespejeFechas({
      fecha_solicitud_informe: despeje?.fecha_solicitud_informe
        ? new Date(despeje.fecha_solicitud_informe + "T00:00:00")
        : undefined,
      fecha_recepcion_informe: despeje?.fecha_recepcion_informe
        ? new Date(despeje.fecha_recepcion_informe + "T00:00:00")
        : undefined,
    });
    setDespejeError(null);
  };

  const cancelEditDespeje = () => {
    setEditingDespeje(false);
    setDespejeForm(DEFAULT_DESPEJE);
    setDespejeFechas({});
  };

  const handleDespejeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDespejeError(null);
    setDespejeSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (despejeForm.estado) payload.estado = despejeForm.estado;
      if (despejeForm.url_informe_hijo) payload.url_informe_hijo = despejeForm.url_informe_hijo;
      if (despejeFechas.fecha_solicitud_informe)
        payload.fecha_solicitud_informe = despejeFechas.fecha_solicitud_informe.toISOString().split("T")[0];
      if (despejeFechas.fecha_recepcion_informe)
        payload.fecha_recepcion_informe = despejeFechas.fecha_recepcion_informe.toISOString().split("T")[0];

      if (despeje) {
        const updated = await api.despeje.update(despeje.id_despeje, payload as any);
        setDespeje(updated);
      } else {
        const created = await api.despeje.create(id, payload as any);
        setDespeje(created);
      }
      setEditingDespeje(false);
    } catch (e: any) {
      setDespejeError(e.message);
    } finally {
      setDespejeSaving(false);
    }
  };

  // ── Notificaciones ───────────────────────────────────────────────────────────

  const handleCreateNotif = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!despeje) return;
    setNotifError(null);
    setNotifSaving(true);
    try {
      const payload: Record<string, unknown> = { id_familiar: notifForm.id_familiar };
      for (const [key, val] of Object.entries(notifForm)) {
        if (key !== "id_familiar" && val) payload[key] = val;
      }
      for (const [key, dateVal] of Object.entries(notifFechas)) {
        if (dateVal) payload[key] = dateVal.toISOString().split("T")[0];
      }
      const created = await api.notificacion.create(despeje.id_despeje, payload as any);
      setNotificaciones((prev) => [...prev, created]);
      setNotifForm({ ...DEFAULT_NOTIFICACION });
      setNotifFechas({});
      setShowNotifForm(false);
    } catch (e: any) {
      setNotifError(e.message);
    } finally {
      setNotifSaving(false);
    }
  };

  const startEditNotif = (
    n: NotificacionFamiliar,
    overrides?: { fecha_envio_carta_2?: Date },
  ) => {
    setEditingNotifId(n.id_notificacion);
    setEditNotifForm({
      id_familiar: n.id_familiar,
      fecha_envio_carta_1: n.fecha_envio_carta_1 || "",
      codigo_seguimiento_1: n.codigo_seguimiento_1 || "",
      estado_entrega_1: n.estado_entrega_1 || "",
      fecha_recepcion_carta_1: n.fecha_recepcion_carta_1 || "",
      fecha_envio_carta_2: n.fecha_envio_carta_2 || "",
      codigo_seguimiento_2: n.codigo_seguimiento_2 || "",
      estado_entrega_2: n.estado_entrega_2 || "",
      fecha_recepcion_carta_2: n.fecha_recepcion_carta_2 || "",
      resultado_contacto: n.resultado_contacto || "",
      fecha_respuesta: n.fecha_respuesta || "",
      observacion: n.observacion || "",
    });
    const dates: Record<string, Date | undefined> = {};
    const dateFields = [
      "fecha_envio_carta_1", "fecha_recepcion_carta_1",
      "fecha_envio_carta_2", "fecha_recepcion_carta_2",
      "fecha_respuesta",
    ];
    for (const f of dateFields) {
      const val = (n as any)[f] as string | null;
      if (val) dates[f] = new Date(val + "T00:00:00");
    }
    if (overrides?.fecha_envio_carta_2) {
      dates["fecha_envio_carta_2"] = overrides.fecha_envio_carta_2;
    }
    setEditNotifFechas(dates);
    setEditNotifError(null);
  };

  const cancelEditNotif = () => {
    setEditingNotifId(null);
    setEditNotifForm({ ...DEFAULT_NOTIFICACION });
    setEditNotifFechas({});
  };

  const handleUpdateNotif = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditNotifError(null);
    setEditNotifSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(editNotifForm)) {
        if (key !== "id_familiar" && val) payload[key] = val;
      }
      for (const [key, dateVal] of Object.entries(editNotifFechas)) {
        if (dateVal) payload[key] = dateVal.toISOString().split("T")[0];
      }
      const updated = await api.notificacion.update(editingNotifId!, payload);
      setNotificaciones((prev) => prev.map((x) => (x.id_notificacion === editingNotifId ? updated : x)));
      cancelEditNotif();
    } catch (e: any) {
      setEditNotifError(e.message);
    } finally {
      setEditNotifSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><Spinner className="size-6" /></div>;
  if (error || !nna) return <div className="max-w-4xl mx-auto px-4 py-8"><p className="text-destructive">{error || "NNA no encontrado"}</p></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="-ml-2 mb-4">
        <Link href={`/nna/${id}`}><ArrowLeftIcon /> Volver al resumen</Link>
      </Button>

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{nna.nombre}</CardTitle>
        </CardHeader>
      </Card>

      {/* ── Cabecera: Proceso de Despeje ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Proceso de Despeje Familiar</CardTitle>
            {despeje && !editingDespeje && (
              <Button variant="outline" size="sm" onClick={startEditDespeje}>
                <PencilIcon className="h-3.5 w-3.5 mr-1" /> Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!despeje && !editingDespeje ? (
            <div className="text-center py-6">
              <Empty>
                <p className="text-sm text-muted-foreground mb-4">Sin proceso de despeje registrado.</p>
                <Button onClick={() => setEditingDespeje(true)}>
                  <PlusIcon className="h-4 w-4 mr-1" /> Iniciar Proceso de Despeje
                </Button>
              </Empty>
            </div>
          ) : editingDespeje ? (
            <form onSubmit={handleDespejeSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Estado</Label>
                  <Select
                    value={despejeForm.estado}
                    onValueChange={(v) => setDespejeForm((p) => ({ ...p, estado: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS_DESPEJE.map((e) => (
                        <SelectItem key={e} value={e}>{e}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>URL Informe de Hijo</Label>
                  <Input
                    value={despejeForm.url_informe_hijo}
                    onChange={(e) => setDespejeForm((p) => ({ ...p, url_informe_hijo: e.target.value }))}
                    placeholder="Ruta al documento PDF"
                  />
                </div>
                <div>
                  <Label>Fecha Solicitud Informe</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !despejeFechas.fecha_solicitud_informe && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {despejeFechas.fecha_solicitud_informe
                          ? formatDate(despejeFechas.fecha_solicitud_informe.toISOString().split("T")[0])
                          : "Seleccionar fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={despejeFechas.fecha_solicitud_informe}
                        onSelect={(d) => setDespejeFechas((p) => ({ ...p, fecha_solicitud_informe: d }))}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Fecha Recepción Informe</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !despejeFechas.fecha_recepcion_informe && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {despejeFechas.fecha_recepcion_informe
                          ? formatDate(despejeFechas.fecha_recepcion_informe.toISOString().split("T")[0])
                          : "Seleccionar fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={despejeFechas.fecha_recepcion_informe}
                        onSelect={(d) => setDespejeFechas((p) => ({ ...p, fecha_recepcion_informe: d }))}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              {despejeError && <p className="text-sm text-destructive">{despejeError}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={despejeSaving}>
                  {despejeSaving ? "Guardando..." : despeje ? "Guardar Cambios" : "Crear Despeje"}
                </Button>
                <Button type="button" variant="outline" onClick={cancelEditDespeje}>
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <InfoRow label="Estado" value={despeje?.estado} />
              <InfoRow label="Fecha Solicitud Informe" value={formatDate(despeje?.fecha_solicitud_informe ?? null)} />
              <InfoRow label="Fecha Recepción Informe" value={formatDate(despeje?.fecha_recepcion_informe ?? null)} />
              <InfoRow label="URL Informe Hijo" value={despeje?.url_informe_hijo} />
            </dl>
          )}
        </CardContent>
      </Card>

      <div className="h-4" />

      {/* ── Notificaciones ────────────────────────────────────────────────── */}
      {despeje && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Notificaciones a Familiares</CardTitle>
              {!showNotifForm && (
                <Button variant="outline" size="sm" onClick={() => setShowNotifForm(true)}>
                  <PlusIcon className="h-3.5 w-3.5 mr-1" /> Nueva Notificación
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {showNotifForm && (
              <form onSubmit={handleCreateNotif} className="space-y-4 border rounded-lg p-4">
                <h3 className="text-sm font-medium">Nueva Notificación</h3>
                <div>
                  <Label>Familiar</Label>
                  <Select
                    value={notifForm.id_familiar}
                    onValueChange={(v) => setNotifForm((p) => ({ ...p, id_familiar: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar familiar" />
                    </SelectTrigger>
                    <SelectContent>
                      {familiares.map((f) => (
                        <SelectItem key={f.id_familiar} value={f.id_familiar}>
                          {f.nombre || f.id_familiar}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {notifDateField("fecha_envio_carta_1", "Fecha Envío Carta 1", notifForm, setNotifForm, notifFechas, setNotifFechas)}
                  <div>
                    <Label>Código Seguimiento 1</Label>
                    <Input value={notifForm.codigo_seguimiento_1} onChange={(e) => setNotifForm((p) => ({ ...p, codigo_seguimiento_1: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Estado Entrega 1</Label>
                    <Input value={notifForm.estado_entrega_1} onChange={(e) => setNotifForm((p) => ({ ...p, estado_entrega_1: e.target.value }))} />
                  </div>
                  {notifDateField("fecha_recepcion_carta_1", "Fecha Recepción Carta 1", notifForm, setNotifForm, notifFechas, setNotifFechas)}
                  {notifDateField("fecha_envio_carta_2", "Fecha Envío Carta 2", notifForm, setNotifForm, notifFechas, setNotifFechas)}
                  <div>
                    <Label>Código Seguimiento 2</Label>
                    <Input value={notifForm.codigo_seguimiento_2} onChange={(e) => setNotifForm((p) => ({ ...p, codigo_seguimiento_2: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Estado Entrega 2</Label>
                    <Input value={notifForm.estado_entrega_2} onChange={(e) => setNotifForm((p) => ({ ...p, estado_entrega_2: e.target.value }))} />
                  </div>
                  {notifDateField("fecha_recepcion_carta_2", "Fecha Recepción Carta 2", notifForm, setNotifForm, notifFechas, setNotifFechas)}
                  <div>
                    <Label>Resultado Contacto</Label>
                    <Select
                      value={notifForm.resultado_contacto}
                      onValueChange={(v) => setNotifForm((p) => ({ ...p, resultado_contacto: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {RESULTADOS_CONTACTO.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {notifDateField("fecha_respuesta", "Fecha Respuesta", notifForm, setNotifForm, notifFechas, setNotifFechas)}
                  <div className="sm:col-span-2">
                    <Label>Observación</Label>
                    <Input value={notifForm.observacion} onChange={(e) => setNotifForm((p) => ({ ...p, observacion: e.target.value }))} />
                  </div>
                </div>
                {notifError && <p className="text-sm text-destructive">{notifError}</p>}
                <div className="flex gap-2">
                  <Button type="submit" disabled={notifSaving || !notifForm.id_familiar}>
                    {notifSaving ? "Guardando..." : "Crear Notificación"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setShowNotifForm(false); setNotifError(null); }}>
                    Cancelar
                  </Button>
                </div>
              </form>
            )}

            {notificaciones.length === 0 ? (
              <Empty>
                <p className="text-xs text-muted-foreground">Sin notificaciones registradas.</p>
              </Empty>
            ) : (
              <div className="space-y-3">
                {notificaciones.map((n) =>
                  editingNotifId === n.id_notificacion ? (
                    <form key={n.id_notificacion} onSubmit={handleUpdateNotif} className="space-y-3 border rounded-lg p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label>Familiar</Label>
                          <p className="text-sm">{getFamiliarNombre(editNotifForm.id_familiar)}</p>
                        </div>
                        {notifDateField("fecha_envio_carta_1", "Fecha Envío Carta 1", editNotifForm, setEditNotifForm, editNotifFechas, setEditNotifFechas)}
                        <div>
                          <Label>Código Seguimiento 1</Label>
                          <Input value={editNotifForm.codigo_seguimiento_1} onChange={(e) => setEditNotifForm((p) => ({ ...p, codigo_seguimiento_1: e.target.value }))} />
                        </div>
                        <div>
                          <Label>Estado Entrega 1</Label>
                          <Input value={editNotifForm.estado_entrega_1} onChange={(e) => setEditNotifForm((p) => ({ ...p, estado_entrega_1: e.target.value }))} />
                        </div>
                        {notifDateField("fecha_recepcion_carta_1", "Fecha Recepción Carta 1", editNotifForm, setEditNotifForm, editNotifFechas, setEditNotifFechas)}
                        {notifDateField("fecha_envio_carta_2", "Fecha Envío Carta 2", editNotifForm, setEditNotifForm, editNotifFechas, setEditNotifFechas)}
                        <div>
                          <Label>Código Seguimiento 2</Label>
                          <Input value={editNotifForm.codigo_seguimiento_2} onChange={(e) => setEditNotifForm((p) => ({ ...p, codigo_seguimiento_2: e.target.value }))} />
                        </div>
                        <div>
                          <Label>Estado Entrega 2</Label>
                          <Input value={editNotifForm.estado_entrega_2} onChange={(e) => setEditNotifForm((p) => ({ ...p, estado_entrega_2: e.target.value }))} />
                        </div>
                        {notifDateField("fecha_recepcion_carta_2", "Fecha Recepción Carta 2", editNotifForm, setEditNotifForm, editNotifFechas, setEditNotifFechas)}
                        <div>
                          <Label>Resultado Contacto</Label>
                          <Select
                            value={editNotifForm.resultado_contacto}
                            onValueChange={(v) => setEditNotifForm((p) => ({ ...p, resultado_contacto: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              {RESULTADOS_CONTACTO.map((r) => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {notifDateField("fecha_respuesta", "Fecha Respuesta", editNotifForm, setEditNotifForm, editNotifFechas, setEditNotifFechas)}
                        <div className="sm:col-span-2">
                          <Label>Observación</Label>
                          <Input value={editNotifForm.observacion} onChange={(e) => setEditNotifForm((p) => ({ ...p, observacion: e.target.value }))} />
                        </div>
                      </div>
                      {editNotifError && <p className="text-sm text-destructive">{editNotifError}</p>}
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={editNotifSaving}>
                          {editNotifSaving ? "Guardando..." : "Guardar"}
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={cancelEditNotif}>
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <NotifRow
                      key={n.id_notificacion}
                      n={n}
                      idNna={id}
                      getFamiliarNombre={getFamiliarNombre}
                      onEdit={() => startEditNotif(n)}
                      onEnviarCarta2={() => handleEnviarCarta2(n)}
                      confirmCerrarId={confirmCerrarId}
                      onConfirmCerrar={(notif) => setConfirmCerrarId(notif.id_notificacion)}
                      onCancelCerrar={() => setConfirmCerrarId(null)}
                      onCerrar={handleConfirmCerrar}
                      cerrarSaving={cerrarSaving}
                    />
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── NotifRow (extraído para claridad) ──────────────────────────────────────────

function NotifRow({
  n,
  idNna,
  getFamiliarNombre,
  onEdit,
  onEnviarCarta2,
  confirmCerrarId,
  onConfirmCerrar,
  onCancelCerrar,
  onCerrar,
  cerrarSaving,
}: {
  n: NotificacionFamiliar;
  idNna: string;
  getFamiliarNombre: (id: string) => string;
  onEdit: () => void;
  onEnviarCarta2: () => void;
  confirmCerrarId: string | null;
  onConfirmCerrar: (n: NotificacionFamiliar) => void;
  onCancelCerrar: () => void;
  onCerrar: (n: NotificacionFamiliar) => void;
  cerrarSaving: boolean;
}) {
  const alerta = getAlerta(n);

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
          <div>
            <span className="text-xs text-muted-foreground">Familiar</span>
            <p className="text-sm font-medium">{getFamiliarNombre(n.id_familiar)}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Ronda 1</span>
            <p className="text-sm">
              {formatDate(n.fecha_envio_carta_1)} — {n.estado_entrega_1 || "—"}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Ronda 2</span>
            <p className="text-sm">
              {n.fecha_envio_carta_2 ? `${formatDate(n.fecha_envio_carta_2)} — ${n.estado_entrega_2 || "—"}` : "—"}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Resultado</span>
            <p className="text-sm">
              {n.resultado_contacto && (
                <Badge variant="outline" className="text-xs">{n.resultado_contacto}</Badge>
              )}
              {!n.resultado_contacto && "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {alerta === "verde" && (
            <Button variant="ghost" size="icon" asChild title="Crear E2P">
              <Link href={`/nna/${idNna}/e2p?familiar=${n.id_familiar}`}>
                <PlusIcon className="h-4 w-4 text-green-600" />
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onEdit} title="Editar">
            <PencilIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Alertas y acciones */}
      {alerta === "naranja" && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-orange-500 text-orange-600 bg-orange-50 text-xs gap-1">
            <ClockIcon className="h-3 w-3" />
            Plazo cumplido ({diasDesde(n.fecha_envio_carta_1)} días) — Enviar 2ª carta
          </Badge>
          <Button variant="outline" size="sm" onClick={onEnviarCarta2} className="h-7 text-xs">
            Enviar 2ª carta hoy
          </Button>
        </div>
      )}

      {alerta === "roja" && (
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="text-xs gap-1">
            <AlertTriangleIcon className="h-3 w-3" />
            Plazo vencido ({diasDesde(n.fecha_envio_carta_2)} días)
          </Badge>
          {confirmCerrarId === n.id_notificacion ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">¿Cerrar como No responde?</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onCerrar(n)}
                disabled={cerrarSaving}
                className="h-7 text-xs"
              >
                {cerrarSaving ? "..." : "Confirmar"}
              </Button>
              <Button variant="outline" size="sm" onClick={onCancelCerrar} className="h-7 text-xs">
                Cancelar
              </Button>
            </div>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onConfirmCerrar(n)}
              className="h-7 text-xs"
            >
              Cerrar como No responde
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || "—"}</dd>
    </div>
  );
}

function notifDateField(
  key: string,
  label: string,
  form: Record<string, string | null>,
  setForm: React.Dispatch<React.SetStateAction<any>>,
  fechas: Record<string, Date | undefined>,
  setFechas: React.Dispatch<React.SetStateAction<Record<string, Date | undefined>>>,
) {
  return (
    <div key={key}>
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("w-full justify-start text-left font-normal", !fechas[key] && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {fechas[key] ? formatDate(fechas[key]!.toISOString().split("T")[0]) : "Seleccionar fecha"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={fechas[key]}
            onSelect={(d) => setFechas((p) => ({ ...p, [key]: d }))}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
