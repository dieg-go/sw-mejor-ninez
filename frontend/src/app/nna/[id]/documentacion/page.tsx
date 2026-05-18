"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CalendarIcon, PlusIcon, PencilIcon } from "lucide-react";
import { type DocumentacionIngreso } from "@/lib/api";
import {
  useNNA,
  useDocumentacionIngresoList,
  useDocumentacionIngresoCreate,
  useDocumentacionIngresoUpdate,
} from "@/lib/queries";
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

const DEFAULT = { tipo_documento: "", estado_recepcion: false, fecha_recepcion: "", observacion: "" };

export default function DocumentacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: nna, isLoading, error } = useNNA(id);
  const { data: items = [] } = useDocumentacionIngresoList(id);
  const createMut = useDocumentacionIngresoCreate(id);
  const updateMut = useDocumentacionIngresoUpdate();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(DEFAULT);
  const [fecha, setFecha] = useState<Date | undefined>(undefined);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(DEFAULT);
  const [editFecha, setEditFecha] = useState<Date | undefined>(undefined);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {};
    if (form.tipo_documento) payload.tipo_documento = form.tipo_documento;
    payload.estado_recepcion = form.estado_recepcion;
    if (form.observacion) payload.observacion = form.observacion;
    if (fecha) payload.fecha_recepcion = fecha.toISOString().split("T")[0];
    await createMut.mutateAsync(payload);
    setForm(DEFAULT); setFecha(undefined); setShowForm(false);
  };

  const startEdit = (item: DocumentacionIngreso) => {
    setEditingId(item.id_documentacion);
    setEditForm({
      tipo_documento: item.tipo_documento || "",
      estado_recepcion: item.estado_recepcion,
      fecha_recepcion: item.fecha_recepcion || "",
      observacion: item.observacion || "",
    });
    setEditFecha(item.fecha_recepcion ? new Date(item.fecha_recepcion + "T00:00:00") : undefined);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const payload: any = {};
    if (editForm.tipo_documento) payload.tipo_documento = editForm.tipo_documento;
    payload.estado_recepcion = editForm.estado_recepcion;
    if (editForm.observacion) payload.observacion = editForm.observacion;
    if (editFecha) payload.fecha_recepcion = editFecha.toISOString().split("T")[0];
    else payload.fecha_recepcion = null;
    await updateMut.mutateAsync({ id: editingId, data: payload });
    setEditingId(null);
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-[50vh]"><Spinner className="size-6" /></div>;
  if (error || !nna) return <div className="max-w-5xl mx-auto px-4 py-8"><p className="text-destructive">{error?.message || "NNA no encontrado"}</p></div>;

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
                  <Input className="mt-1" value={form.tipo_documento} onChange={(e) => setForm((p) => ({ ...p, tipo_documento: e.target.value }))} placeholder="Ej: Certificado de nacimiento" />
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
              </div>
              {createMut.isError && <p className="text-destructive text-sm">{createMut.error.message}</p>}
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={createMut.isPending}>{createMut.isPending ? "Guardando..." : "Guardar"}</Button>
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
                        <Input className="mt-1" value={editForm.tipo_documento} onChange={(e) => setEditForm((p) => ({ ...p, tipo_documento: e.target.value }))} />
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
                    </div>
                    {updateMut.isError && <p className="text-destructive text-sm">{updateMut.error.message}</p>}
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={updateMut.isPending}>{updateMut.isPending ? "Guardando..." : "Guardar"}</Button>
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
