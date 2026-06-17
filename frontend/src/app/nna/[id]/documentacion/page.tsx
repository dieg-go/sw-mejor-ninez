"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CalendarIcon, PencilIcon, PlusIcon } from "lucide-react";
import { api, type NNA, type DocumentacionIngreso } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CATALOGO_DOCUMENTACION_INGRESO } from "@/lib/catalogos";
import { Spinner } from "@/components/ui/spinner";
import { Empty } from "@/components/ui/empty";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { FileUpload } from "@/components/ui/file-upload";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("es-CL");
}

const DEFAULT = {
  tipo_documento: "",
  estado_recepcion: false,
  fecha_recepcion: "",
  observacion: "",
  url_documentacion_ingreso: "",
};

export default function DocumentacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [nna, setNna] = useState<NNA | null>(null);
  const [items, setItems] = useState<DocumentacionIngreso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(DEFAULT);
  const [fecha, setFecha] = useState<Date | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(DEFAULT);
  const [editFecha, setEditFecha] = useState<Date | undefined>(undefined);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [nnaData, list] = await Promise.all([api.nna.get(id), api.documentacionIngreso.list(id)]);
        setNna(nnaData);
        setItems(list);
      } catch (e: any) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null); setSaving(true);
    try {
      const payload: any = {};
      if (form.tipo_documento) payload.tipo_documento = form.tipo_documento;
      payload.estado_recepcion = form.estado_recepcion;
      if (form.observacion) payload.observacion = form.observacion;
      if (form.url_documentacion_ingreso) payload.url_documentacion_ingreso = form.url_documentacion_ingreso;
      if (fecha) payload.fecha_recepcion = fecha.toISOString().split("T")[0];
      const created = await api.documentacionIngreso.create(id, payload);
      setItems((prev) => [...prev, created]);
      setForm(DEFAULT); setFecha(undefined); setShowForm(false);
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  };

  const startEdit = (item: DocumentacionIngreso) => {
    setEditingId(item.id_documentacion);
    setEditForm({
      tipo_documento: item.tipo_documento || "",
      estado_recepcion: item.estado_recepcion,
      fecha_recepcion: item.fecha_recepcion || "",
      observacion: item.observacion || "",
      url_documentacion_ingreso: item.url_documentacion_ingreso || "",
    });
    setEditFecha(item.fecha_recepcion ? new Date(item.fecha_recepcion + "T00:00:00") : undefined);
    setEditError(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setEditError(null); setEditSaving(true);
    try {
      const payload: any = {};
      if (editForm.tipo_documento) payload.tipo_documento = editForm.tipo_documento;
      payload.estado_recepcion = editForm.estado_recepcion;
      if (editForm.observacion) payload.observacion = editForm.observacion;
      if (editForm.url_documentacion_ingreso) payload.url_documentacion_ingreso = editForm.url_documentacion_ingreso;
      if (editFecha) payload.fecha_recepcion = editFecha.toISOString().split("T")[0];
      else payload.fecha_recepcion = null;
      const updated = await api.documentacionIngreso.update(editingId, payload);
      setItems((prev) => prev.map((i) => (i.id_documentacion === editingId ? updated : i)));
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
        <h2 className="text-lg font-semibold">Documentación de Ingreso</h2>
        {!showForm && <Button size="sm" onClick={() => setShowForm(true)}><PlusIcon /> Nuevo documento</Button>}
      </div>

      {showForm && (
        <Card className="mb-6 border-primary/30">
          <CardHeader className="pb-2"><CardTitle className="text-base">Nuevo documento</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Tipo documento</Label>
                  <Select value={form.tipo_documento || "none"} onValueChange={(v) => setForm((p) => ({ ...p, tipo_documento: v === "none" ? "" : v }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ninguno</SelectItem>
                      {CATALOGO_DOCUMENTACION_INGRESO.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Fecha recepción</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !fecha && "text-muted-foreground")}><CalendarIcon />{fecha ? fecha.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={fecha} onSelect={setFecha} /></PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox id="estado-recepcion" checked={form.estado_recepcion} onCheckedChange={(v) => setForm((p) => ({ ...p, estado_recepcion: !!v }))} />
                  <Label htmlFor="estado-recepcion" className="text-xs cursor-pointer">Recibido</Label>
                </div>
                <div>
                  <Label className="text-xs">Observación</Label>
                  <Input className="mt-1" value={form.observacion} onChange={(e) => setForm((p) => ({ ...p, observacion: e.target.value }))} placeholder="Observaciones" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Documento</Label>
                  <FileUpload
                    value={form.url_documentacion_ingreso || null}
                    onUploadSuccess={(url) => setForm((p) => ({ ...p, url_documentacion_ingreso: url }))}
                    onClear={() => setForm((p) => ({ ...p, url_documentacion_ingreso: "" }))}
                  />
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
        <Empty><p className="text-sm text-muted-foreground">Sin documentos registrados.</p></Empty>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id_documentacion}>
              <CardContent className="pt-4">
                {editingId === item.id_documentacion ? (
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Tipo documento</Label>
                        <Select value={editForm.tipo_documento || "none"} onValueChange={(v) => setEditForm((p) => ({ ...p, tipo_documento: v === "none" ? "" : v }))}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Ninguno</SelectItem>
                            {CATALOGO_DOCUMENTACION_INGRESO.map((tipo) => (
                              <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Fecha recepción</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !editFecha && "text-muted-foreground")}><CalendarIcon />{editFecha ? editFecha.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={editFecha} onSelect={setEditFecha} /></PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <Checkbox id={`edit-rec-${item.id_documentacion}`} checked={editForm.estado_recepcion} onCheckedChange={(v) => setEditForm((p) => ({ ...p, estado_recepcion: !!v }))} />
                        <Label htmlFor={`edit-rec-${item.id_documentacion}`} className="text-xs cursor-pointer">Recibido</Label>
                      </div>
                      <div>
                        <Label className="text-xs">Observación</Label>
                        <Input className="mt-1" value={editForm.observacion} onChange={(e) => setEditForm((p) => ({ ...p, observacion: e.target.value }))} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs">Documento</Label>
                        <FileUpload
                          value={editForm.url_documentacion_ingreso || null}
                          onUploadSuccess={(url) => setEditForm((p) => ({ ...p, url_documentacion_ingreso: url }))}
                          onClear={() => setEditForm((p) => ({ ...p, url_documentacion_ingreso: "" }))}
                        />
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
                      <div><span className="text-xs text-muted-foreground">Tipo: </span>{item.tipo_documento || "—"}</div>
                      <div><span className="text-xs text-muted-foreground">Fecha: </span>{formatDate(item.fecha_recepcion)}</div>
                      <div><span className="text-xs text-muted-foreground">Estado: </span>{item.estado_recepcion ? <Badge variant="secondary">Recibido</Badge> : <Badge variant="outline">Pendiente</Badge>}</div>
                      {item.observacion && <div className="col-span-2"><span className="text-xs text-muted-foreground">Obs: </span>{item.observacion}</div>}
                      {item.url_documentacion_ingreso && <div className="col-span-3"><span className="text-xs text-muted-foreground">URL: </span><a href={item.url_documentacion_ingreso} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs">{item.url_documentacion_ingreso}</a></div>}
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
