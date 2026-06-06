"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CalendarIcon, PlusIcon, PencilIcon } from "lucide-react";
import { api, type NNA, type HistorialConsumoNNA } from "@/lib/api";
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

const DEFAULT = {
  nombre_sustancia: "",
  consumo_indirecto_gestacional: false,
  estado_consumo: "",
  fecha_inicio: "",
  fecha_termino: "",
  en_tratamiento: false,
};

export default function ConsumoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [nna, setNna] = useState<NNA | null>(null);
  const [items, setItems] = useState<HistorialConsumoNNA[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(DEFAULT);
  const [fechaInicio, setFechaInicio] = useState<Date | undefined>(undefined);
  const [fechaTermino, setFechaTermino] = useState<Date | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(DEFAULT);
  const [editFechaInicio, setEditFechaInicio] = useState<Date | undefined>(undefined);
  const [editFechaTermino, setEditFechaTermino] = useState<Date | undefined>(undefined);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [nnaData, list] = await Promise.all([api.nna.get(id), api.historialConsumoNNA.list(id)]);
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
      if (form.nombre_sustancia) payload.nombre_sustancia = form.nombre_sustancia;
      payload.consumo_indirecto_gestacional = form.consumo_indirecto_gestacional;
      if (form.estado_consumo) payload.estado_consumo = form.estado_consumo;
      payload.en_tratamiento = form.en_tratamiento;
      if (fechaInicio) payload.fecha_inicio = fechaInicio.toISOString().split("T")[0];
      if (fechaTermino) payload.fecha_termino = fechaTermino.toISOString().split("T")[0];
      const created = await api.historialConsumoNNA.create(id, payload);
      setItems((prev) => [...prev, created]);
      setForm(DEFAULT); setFechaInicio(undefined); setFechaTermino(undefined); setShowForm(false);
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  };

  const startEdit = (item: HistorialConsumoNNA) => {
    setEditingId(item.id_historial_consumo_nna);
    setEditForm({
      nombre_sustancia: item.nombre_sustancia || "",
      consumo_indirecto_gestacional: item.consumo_indirecto_gestacional,
      estado_consumo: item.estado_consumo || "",
      fecha_inicio: item.fecha_inicio || "",
      fecha_termino: item.fecha_termino || "",
      en_tratamiento: item.en_tratamiento,
    });
    setEditFechaInicio(item.fecha_inicio ? new Date(item.fecha_inicio + "T00:00:00") : undefined);
    setEditFechaTermino(item.fecha_termino ? new Date(item.fecha_termino + "T00:00:00") : undefined);
    setEditError(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setEditError(null); setEditSaving(true);
    try {
      const payload: any = {};
      if (editForm.nombre_sustancia) payload.nombre_sustancia = editForm.nombre_sustancia;
      payload.consumo_indirecto_gestacional = editForm.consumo_indirecto_gestacional;
      if (editForm.estado_consumo) payload.estado_consumo = editForm.estado_consumo;
      payload.en_tratamiento = editForm.en_tratamiento;
      if (editFechaInicio) payload.fecha_inicio = editFechaInicio.toISOString().split("T")[0];
      else payload.fecha_inicio = null;
      if (editFechaTermino) payload.fecha_termino = editFechaTermino.toISOString().split("T")[0];
      else payload.fecha_termino = null;
      const updated = await api.historialConsumoNNA.update(editingId, payload);
      setItems((prev) => prev.map((i) => (i.id_historial_consumo_nna === editingId ? updated : i)));
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
        <h2 className="text-lg font-semibold">Historial de Consumo</h2>
        {!showForm && <Button size="sm" onClick={() => setShowForm(true)}><PlusIcon /> Nuevo registro</Button>}
      </div>

      {showForm && (
        <Card className="mb-6 border-primary/30">
          <CardHeader className="pb-2"><CardTitle className="text-base">Nuevo registro de consumo</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Sustancia</Label>
                  <Input className="mt-1" value={form.nombre_sustancia} onChange={(e) => setForm((p) => ({ ...p, nombre_sustancia: e.target.value }))} placeholder="Nombre sustancia" />
                </div>
                <div>
                  <Label className="text-xs">Estado consumo</Label>
                  <Select value={form.estado_consumo} onValueChange={(v) => setForm((p) => ({ ...p, estado_consumo: v }))}>
                    <SelectTrigger className="mt-1 w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="Activo">Activo</SelectItem>
                        <SelectItem value="Inactivo">Inactivo</SelectItem>
                        <SelectItem value="Abandonado">Abandonado</SelectItem>
                        <SelectItem value="En tratamiento">En tratamiento</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Fecha inicio</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !fechaInicio && "text-muted-foreground")}><CalendarIcon />{fechaInicio ? fechaInicio.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={fechaInicio} onSelect={setFechaInicio} /></PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-xs">Fecha término</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !fechaTermino && "text-muted-foreground")}><CalendarIcon />{fechaTermino ? fechaTermino.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={fechaTermino} onSelect={setFechaTermino} /></PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox id="cons-indirecto" checked={form.consumo_indirecto_gestacional} onCheckedChange={(v) => setForm((p) => ({ ...p, consumo_indirecto_gestacional: !!v }))} />
                  <Label htmlFor="cons-indirecto" className="text-xs cursor-pointer">Consumo gestacional</Label>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox id="en-trat" checked={form.en_tratamiento} onCheckedChange={(v) => setForm((p) => ({ ...p, en_tratamiento: !!v }))} />
                  <Label htmlFor="en-trat" className="text-xs cursor-pointer">En tratamiento</Label>
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
        <Empty><p className="text-sm text-muted-foreground">Sin registros de consumo.</p></Empty>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id_historial_consumo_nna}>
              <CardContent className="pt-4">
                {editingId === item.id_historial_consumo_nna ? (
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Sustancia</Label>
                        <Input className="mt-1" value={editForm.nombre_sustancia} onChange={(e) => setEditForm((p) => ({ ...p, nombre_sustancia: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-xs">Estado consumo</Label>
                        <Select value={editForm.estado_consumo} onValueChange={(v) => setEditForm((p) => ({ ...p, estado_consumo: v }))}>
                          <SelectTrigger className="mt-1 w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Activo">Activo</SelectItem>
                            <SelectItem value="Inactivo">Inactivo</SelectItem>
                            <SelectItem value="Abandonado">Abandonado</SelectItem>
                            <SelectItem value="En tratamiento">En tratamiento</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Fecha inicio</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !editFechaInicio && "text-muted-foreground")}><CalendarIcon />{editFechaInicio ? editFechaInicio.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={editFechaInicio} onSelect={setEditFechaInicio} /></PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label className="text-xs">Fecha término</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !editFechaTermino && "text-muted-foreground")}><CalendarIcon />{editFechaTermino ? editFechaTermino.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={editFechaTermino} onSelect={setEditFechaTermino} /></PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <Checkbox id={`edit-ges-${item.id_historial_consumo_nna}`} checked={editForm.consumo_indirecto_gestacional} onCheckedChange={(v) => setEditForm((p) => ({ ...p, consumo_indirecto_gestacional: !!v }))} />
                        <Label htmlFor={`edit-ges-${item.id_historial_consumo_nna}`} className="text-xs cursor-pointer">Consumo gestacional</Label>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <Checkbox id={`edit-trat-${item.id_historial_consumo_nna}`} checked={editForm.en_tratamiento} onCheckedChange={(v) => setEditForm((p) => ({ ...p, en_tratamiento: !!v }))} />
                        <Label htmlFor={`edit-trat-${item.id_historial_consumo_nna}`} className="text-xs cursor-pointer">En tratamiento</Label>
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
                      <div><span className="text-xs text-muted-foreground">Sustancia: </span>{item.nombre_sustancia || "—"}</div>
                      <div><span className="text-xs text-muted-foreground">Estado: </span><Badge variant="outline">{item.estado_consumo || "—"}</Badge></div>
                      <div><span className="text-xs text-muted-foreground">Inicio: </span>{formatDate(item.fecha_inicio)}</div>
                      <div><span className="text-xs text-muted-foreground">Término: </span>{formatDate(item.fecha_termino)}</div>
                      <div><span className="text-xs text-muted-foreground">Gestacional: </span>{item.consumo_indirecto_gestacional ? <Badge variant="secondary">Sí</Badge> : "No"}</div>
                      <div><span className="text-xs text-muted-foreground">Tratamiento: </span>{item.en_tratamiento ? <Badge variant="secondary">Sí</Badge> : "No"}</div>
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
