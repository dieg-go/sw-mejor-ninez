"use client";

import { use, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CalendarIcon, PlusIcon, PencilIcon } from "lucide-react";
import { api, type NNA, type GestionBusquedaFamiliar } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Empty } from "@/components/ui/empty";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("es-CL");
}

const DEFAULT = { tipo_gestion: "", fecha_solicitud_envio: "", fecha_respuesta_recepcion: "", resultado: "", comprobante_adjunto: false };

const TIPO_GESTION_OPTIONS = [
  "Solicitud Informe Registro Civil",
  "Envío Carta Certificada 1",
  "Envío Carta Certificada 2",
  "Visita a Terreno",
  "Contacto Telefónico",
];

const RESULTADO_OPTIONS = [
  "Dirección incorrecta",
  "Familiar asiste a entrevista",
  "Devuelta por correo",
  "Sin respuesta",
  "Contacto exitoso",
];

const GESTION_RESULTADO_MAP: Record<string, string[]> = {
  "Solicitud Informe Registro Civil": ["Familiar asiste a entrevista", "Dirección incorrecta", "Sin respuesta", "Contacto exitoso"],
  "Envío Carta Certificada 1":        ["Devuelta por correo", "Sin respuesta", "Contacto exitoso", "Dirección incorrecta"],
  "Envío Carta Certificada 2":        ["Devuelta por correo", "Sin respuesta", "Contacto exitoso", "Dirección incorrecta"],
  "Visita a Terreno":                 ["Familiar asiste a entrevista", "Dirección incorrecta", "Sin respuesta", "Contacto exitoso"],
  "Contacto Telefónico":              ["Contacto exitoso", "Sin respuesta", "Familiar asiste a entrevista"],
};

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

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aDate = a.fecha_solicitud_envio;
      const bDate = b.fecha_solicitud_envio;
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return aDate.localeCompare(bDate);
    });
  }, [items]);

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
                  <Select value={form.tipo_gestion} onValueChange={(v) => setForm((p) => {
                    const validResults = GESTION_RESULTADO_MAP[v] || [];
                    return { ...p, tipo_gestion: v, resultado: validResults.includes(p.resultado) ? p.resultado : "" };
                  })}>
                    <SelectTrigger className="mt-1 w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {TIPO_GESTION_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Resultado</Label>
                  <Select value={form.resultado} onValueChange={(v) => setForm((p) => ({ ...p, resultado: v }))}>
                    <SelectTrigger className="mt-1 w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {(GESTION_RESULTADO_MAP[form.tipo_gestion] || RESULTADO_OPTIONS).map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
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
        <div className="relative">
          <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border" />
          <div className="flex flex-col gap-2">
            {sortedItems.map((item) => {
              const pendiente = !item.fecha_respuesta_recepcion;
              return (
                <div key={item.id_gestion_busqueda} className="flex gap-4">
                  <div className="relative flex-shrink-0 w-6 flex justify-center">
                    <div className={cn(
                      "z-10 mt-2.5 w-3 h-3 rounded-full border-2 border-background",
                      pendiente ? "bg-amber-400" : "bg-blue-500",
                    )} />
                  </div>
                  <Card className={cn("flex-1", pendiente && "border-l-amber-400 border-l-4")}>
                    <CardContent className="pt-3 pb-3">
                      {editingId === item.id_gestion_busqueda ? (
                        <form onSubmit={handleUpdate} className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs">Tipo gestión</Label>
                              <Select value={editForm.tipo_gestion} onValueChange={(v) => setEditForm((p) => {
                                const validResults = GESTION_RESULTADO_MAP[v] || [];
                                return { ...p, tipo_gestion: v, resultado: validResults.includes(p.resultado) ? p.resultado : "" };
                              })}>
                                <SelectTrigger className="mt-1 w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    {TIPO_GESTION_OPTIONS.map((opt) => (
                                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                  </SelectGroup>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Resultado</Label>
                              <Select value={editForm.resultado} onValueChange={(v) => setEditForm((p) => ({ ...p, resultado: v }))}>
                                <SelectTrigger className="mt-1 w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    {(GESTION_RESULTADO_MAP[editForm.tipo_gestion] || RESULTADO_OPTIONS).map((opt) => (
                                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                  </SelectGroup>
                                </SelectContent>
                              </Select>
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
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={cn(
                                "text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap",
                                pendiente ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800",
                              )}>
                                {formatDate(item.fecha_solicitud_envio)}
                              </span>
                              <span className="text-sm font-medium truncate">{item.tipo_gestion || "—"}</span>
                            </div>
                            <Button
                              variant={pendiente ? "outline" : "ghost"}
                              size="sm"
                              onClick={() => startEdit(item)}
                              className={cn("h-7 shrink-0", pendiente && "border-amber-300 text-amber-700 hover:bg-amber-50")}
                            >
                              <PencilIcon className="size-3.5" />
                              {pendiente && <span className="ml-1 text-xs">Editar</span>}
                            </Button>
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm">
                            {item.resultado && (
                              <span>
                                <span className="text-xs text-muted-foreground">Resultado: </span>
                                {item.resultado}
                              </span>
                            )}
                            {pendiente ? (
                              <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700 border-amber-200">Pendiente de respuesta</Badge>
                            ) : (
                              <span>
                                <span className="text-xs text-muted-foreground">Respuesta: </span>
                                {formatDate(item.fecha_respuesta_recepcion)}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              Comprobante: {item.comprobante_adjunto ? "Sí" : "No"}
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
