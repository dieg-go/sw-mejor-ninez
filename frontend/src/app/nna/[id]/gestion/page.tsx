"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CalendarIcon, PlusIcon, PencilIcon } from "lucide-react";
import { api, type NNA, type GestionBusquedaFamiliar } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Empty } from "@/components/ui/empty";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("es-CL");
}

const DEFAULT = { tipo_gestion: "", fecha_solicitud_envio: "", fecha_respuesta_recepcion: "", resultado: "", comprobante_adjunto: false };

export default function GestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [nna, setNna] = useState<NNA | null>(null);
  const [items, setItems] = useState<GestionBusquedaFamiliar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(DEFAULT);
  const [fechaSolicitud, setFechaSolicitud] = useState<Date | undefined>(undefined);
  const [fechaRespuesta, setFechaRespuesta] = useState<Date | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(DEFAULT);
  const [editFechaSolicitud, setEditFechaSolicitud] = useState<Date | undefined>(undefined);
  const [editFechaRespuesta, setEditFechaRespuesta] = useState<Date | undefined>(undefined);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [nnaData, list] = await Promise.all([api.nna.get(id), api.gestionBusqueda.list(id)]);
        setNna(nnaData); setItems(list);
      } catch (e: any) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null); setSaving(true);
    try {
      const payload: any = {};
      if (form.tipo_gestion) payload.tipo_gestion = form.tipo_gestion;
      if (form.resultado) payload.resultado = form.resultado;
      payload.comprobante_adjunto = form.comprobante_adjunto;
      if (fechaSolicitud) payload.fecha_solicitud_envio = fechaSolicitud.toISOString().split("T")[0];
      if (fechaRespuesta) payload.fecha_respuesta_recepcion = fechaRespuesta.toISOString().split("T")[0];
      const created = await api.gestionBusqueda.create(id, payload);
      setItems((prev) => [...prev, created]);
      setForm(DEFAULT); setFechaSolicitud(undefined); setFechaRespuesta(undefined); setShowForm(false);
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  };

  const startEdit = (item: GestionBusquedaFamiliar) => {
    setEditingId(item.id_gestion_busqueda);
    setEditForm({
      tipo_gestion: item.tipo_gestion || "",
      fecha_solicitud_envio: item.fecha_solicitud_envio || "",
      fecha_respuesta_recepcion: item.fecha_respuesta_recepcion || "",
      resultado: item.resultado || "",
      comprobante_adjunto: item.comprobante_adjunto,
    });
    setEditFechaSolicitud(item.fecha_solicitud_envio ? new Date(item.fecha_solicitud_envio + "T00:00:00") : undefined);
    setEditFechaRespuesta(item.fecha_respuesta_recepcion ? new Date(item.fecha_respuesta_recepcion + "T00:00:00") : undefined);
    setEditError(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setEditError(null); setEditSaving(true);
    try {
      const payload: any = {};
      if (editForm.tipo_gestion) payload.tipo_gestion = editForm.tipo_gestion;
      if (editForm.resultado) payload.resultado = editForm.resultado;
      payload.comprobante_adjunto = editForm.comprobante_adjunto;
      if (editFechaSolicitud) payload.fecha_solicitud_envio = editFechaSolicitud.toISOString().split("T")[0];
      else payload.fecha_solicitud_envio = null;
      if (editFechaRespuesta) payload.fecha_respuesta_recepcion = editFechaRespuesta.toISOString().split("T")[0];
      else payload.fecha_respuesta_recepcion = null;
      const updated = await api.gestionBusqueda.update(editingId, payload);
      setItems((prev) => prev.map((i) => (i.id_gestion_busqueda === editingId ? updated : i)));
      setEditingId(null);
    } catch (e: any) { setEditError(e.message); }
    finally { setEditSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><Spinner className="size-6" /></div>;
  if (error || !nna) return <div className="max-w-5xl mx-auto px-4 py-8"><p className="text-destructive">{error || "NNA no encontrado"}</p></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="-ml-2 mb-4"><Link href={`/nna/${id}`}><ArrowLeftIcon /> Volver al resumen</Link></Button>
      <Card className="mb-4"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{nna.nombre}</CardTitle></CardHeader></Card>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Gestión Búsqueda Familiar</h2>
        {!showForm && <Button size="sm" onClick={() => setShowForm(true)}><PlusIcon /> Nuevo registro</Button>}
      </div>

      {showForm && (
        <Card className="mb-6 border-primary/30">
          <CardHeader className="pb-2"><CardTitle className="text-base">Nueva gestión</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Tipo gestión</Label>
                  <Input className="mt-1" value={form.tipo_gestion} onChange={(e) => setForm((p) => ({ ...p, tipo_gestion: e.target.value }))} placeholder="Tipo de gestión" />
                </div>
                <div>
                  <Label className="text-xs">Resultado</Label>
                  <Input className="mt-1" value={form.resultado} onChange={(e) => setForm((p) => ({ ...p, resultado: e.target.value }))} placeholder="Resultado" />
                </div>
                <div>
                  <Label className="text-xs">Fecha solicitud</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !fechaSolicitud && "text-muted-foreground")}><CalendarIcon />{fechaSolicitud ? fechaSolicitud.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={fechaSolicitud} onSelect={setFechaSolicitud} /></PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-xs">Fecha respuesta</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !fechaRespuesta && "text-muted-foreground")}><CalendarIcon />{fechaRespuesta ? fechaRespuesta.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={fechaRespuesta} onSelect={setFechaRespuesta} /></PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox id="comprobante" checked={form.comprobante_adjunto} onCheckedChange={(v) => setForm((p) => ({ ...p, comprobante_adjunto: !!v }))} />
                  <Label htmlFor="comprobante" className="text-xs cursor-pointer">Comprobante adjunto</Label>
                </div>
              </div>
              {formError && <p className="text-destructive text-sm">{formError}</p>}
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {items.length === 0 ? (
        <Empty><p className="text-sm text-muted-foreground">Sin gestiones registradas.</p></Empty>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id_gestion_busqueda}>
              <CardContent className="pt-4">
                {editingId === item.id_gestion_busqueda ? (
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Tipo gestión</Label>
                        <Input className="mt-1" value={editForm.tipo_gestion} onChange={(e) => setEditForm((p) => ({ ...p, tipo_gestion: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-xs">Resultado</Label>
                        <Input className="mt-1" value={editForm.resultado} onChange={(e) => setEditForm((p) => ({ ...p, resultado: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-xs">Fecha solicitud</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !editFechaSolicitud && "text-muted-foreground")}><CalendarIcon />{editFechaSolicitud ? editFechaSolicitud.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={editFechaSolicitud} onSelect={setEditFechaSolicitud} /></PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label className="text-xs">Fecha respuesta</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !editFechaRespuesta && "text-muted-foreground")}><CalendarIcon />{editFechaRespuesta ? editFechaRespuesta.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={editFechaRespuesta} onSelect={setEditFechaRespuesta} /></PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <Checkbox id={`edit-comp-${item.id_gestion_busqueda}`} checked={editForm.comprobante_adjunto} onCheckedChange={(v) => setEditForm((p) => ({ ...p, comprobante_adjunto: !!v }))} />
                        <Label htmlFor={`edit-comp-${item.id_gestion_busqueda}`} className="text-xs cursor-pointer">Comprobante</Label>
                      </div>
                    </div>
                    {editError && <p className="text-destructive text-sm">{editError}</p>}
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={editSaving}>{editSaving ? "Guardando..." : "Guardar"}</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setEditingId(null)}>Cancelar</Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-sm">
                      <div><span className="text-xs text-muted-foreground">Tipo: </span>{item.tipo_gestion || "—"}</div>
                      <div><span className="text-xs text-muted-foreground">Resultado: </span>{item.resultado || "—"}</div>
                      <div><span className="text-xs text-muted-foreground">Solicitud: </span>{formatDate(item.fecha_solicitud_envio)}</div>
                      <div><span className="text-xs text-muted-foreground">Respuesta: </span>{formatDate(item.fecha_respuesta_recepcion)}</div>
                      <div><span className="text-xs text-muted-foreground">Comprobante: </span>{item.comprobante_adjunto ? <Badge variant="secondary">Sí</Badge> : "No"}</div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => startEdit(item)}><PencilIcon className="size-4" /></Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
