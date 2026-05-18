"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, PlusIcon, PencilIcon } from "lucide-react";
import { api, type NNA, type HistorialRedProteccional } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Empty } from "@/components/ui/empty";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("es-CL");
}

const DEFAULT = { nombre_programa: "", fecha_ingreso: "", fecha_egreso: "", motivo_egreso: "" };

export default function HistorialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [nna, setNna] = useState<NNA | null>(null);
  const [items, setItems] = useState<HistorialRedProteccional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(DEFAULT);
  const [fechaIngreso, setFechaIngreso] = useState<Date | undefined>(undefined);
  const [fechaEgreso, setFechaEgreso] = useState<Date | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(DEFAULT);
  const [editFechaIngreso, setEditFechaIngreso] = useState<Date | undefined>(undefined);
  const [editFechaEgreso, setEditFechaEgreso] = useState<Date | undefined>(undefined);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [nnaData, list] = await Promise.all([api.nna.get(id), api.historialRed.list(id)]);
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
      if (form.nombre_programa) payload.nombre_programa = form.nombre_programa;
      if (form.motivo_egreso) payload.motivo_egreso = form.motivo_egreso;
      if (fechaIngreso) payload.fecha_ingreso = fechaIngreso.toISOString().split("T")[0];
      if (fechaEgreso) payload.fecha_egreso = fechaEgreso.toISOString().split("T")[0];
      const created = await api.historialRed.create(id, payload);
      setItems((prev) => [...prev, created]);
      setForm(DEFAULT); setFechaIngreso(undefined); setFechaEgreso(undefined); setShowForm(false);
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  };

  const startEdit = (item: HistorialRedProteccional) => {
    setEditingId(item.id_historial_red);
    setEditForm({
      nombre_programa: item.nombre_programa || "",
      fecha_ingreso: item.fecha_ingreso || "",
      fecha_egreso: item.fecha_egreso || "",
      motivo_egreso: item.motivo_egreso || "",
    });
    setEditFechaIngreso(item.fecha_ingreso ? new Date(item.fecha_ingreso + "T00:00:00") : undefined);
    setEditFechaEgreso(item.fecha_egreso ? new Date(item.fecha_egreso + "T00:00:00") : undefined);
    setEditError(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setEditError(null); setEditSaving(true);
    try {
      const payload: any = {};
      if (editForm.nombre_programa) payload.nombre_programa = editForm.nombre_programa;
      if (editForm.motivo_egreso) payload.motivo_egreso = editForm.motivo_egreso;
      if (editFechaIngreso) payload.fecha_ingreso = editFechaIngreso.toISOString().split("T")[0];
      else payload.fecha_ingreso = null;
      if (editFechaEgreso) payload.fecha_egreso = editFechaEgreso.toISOString().split("T")[0];
      else payload.fecha_egreso = null;
      const updated = await api.historialRed.update(editingId, payload);
      setItems((prev) => prev.map((i) => (i.id_historial_red === editingId ? updated : i)));
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
        <h2 className="text-lg font-semibold">Historial Red Proteccional</h2>
        {!showForm && <Button size="sm" onClick={() => setShowForm(true)}><PlusIcon /> Nuevo registro</Button>}
      </div>

      {showForm && (
        <Card className="mb-6 border-primary/30">
          <CardHeader className="pb-2"><CardTitle className="text-base">Nuevo registro</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Nombre programa</Label>
                  <Input className="mt-1" value={form.nombre_programa} onChange={(e) => setForm((p) => ({ ...p, nombre_programa: e.target.value }))} placeholder="Programa" />
                </div>
                <div>
                  <Label className="text-xs">Motivo egreso</Label>
                  <Input className="mt-1" value={form.motivo_egreso} onChange={(e) => setForm((p) => ({ ...p, motivo_egreso: e.target.value }))} placeholder="Motivo" />
                </div>
                <div>
                  <Label className="text-xs">Fecha ingreso</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !fechaIngreso && "text-muted-foreground")}><CalendarIcon />{fechaIngreso ? fechaIngreso.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={fechaIngreso} onSelect={setFechaIngreso} /></PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-xs">Fecha egreso</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !fechaEgreso && "text-muted-foreground")}><CalendarIcon />{fechaEgreso ? fechaEgreso.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={fechaEgreso} onSelect={setFechaEgreso} /></PopoverContent>
                  </Popover>
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
        <Empty><p className="text-sm text-muted-foreground">Sin historial registrado.</p></Empty>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id_historial_red}>
              <CardContent className="pt-4">
                {editingId === item.id_historial_red ? (
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Nombre programa</Label>
                        <Input className="mt-1" value={editForm.nombre_programa} onChange={(e) => setEditForm((p) => ({ ...p, nombre_programa: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-xs">Motivo egreso</Label>
                        <Input className="mt-1" value={editForm.motivo_egreso} onChange={(e) => setEditForm((p) => ({ ...p, motivo_egreso: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-xs">Fecha ingreso</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !editFechaIngreso && "text-muted-foreground")}><CalendarIcon />{editFechaIngreso ? editFechaIngreso.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={editFechaIngreso} onSelect={setEditFechaIngreso} /></PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label className="text-xs">Fecha egreso</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !editFechaEgreso && "text-muted-foreground")}><CalendarIcon />{editFechaEgreso ? editFechaEgreso.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={editFechaEgreso} onSelect={setEditFechaEgreso} /></PopoverContent>
                        </Popover>
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
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      <div><span className="text-xs text-muted-foreground">Programa: </span>{item.nombre_programa || "—"}</div>
                      <div><span className="text-xs text-muted-foreground">Motivo egreso: </span>{item.motivo_egreso || "—"}</div>
                      <div><span className="text-xs text-muted-foreground">Ingreso: </span>{formatDate(item.fecha_ingreso)}</div>
                      <div><span className="text-xs text-muted-foreground">Egreso: </span>{formatDate(item.fecha_egreso)}</div>
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
