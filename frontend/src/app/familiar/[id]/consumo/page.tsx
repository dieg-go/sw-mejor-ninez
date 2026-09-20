"use client";

import { use, useEffect, useId, useState } from "react";
import { Link } from "@/lib/navigation";
import { ArrowLeftIcon, PlusIcon, PencilIcon } from "lucide-react";
import { api, type Familiar, type HistorialConsumoAdulto } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Empty } from "@/components/ui/empty";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateField, TextField } from "@/components/ui/form-field";

function formatDate(iso: string | null) {
  if (!iso) return "\u2014";
  return new Date(iso + "T00:00:00").toLocaleDateString("es-CL");
}

const DEFAULT = {
  nombre_sustancia: "",
  estado_consumo: "",
  fecha_inicio: "",
  fecha_termino: "",
  en_tratamiento: false,
};

export default function ConsumoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const estadoSelectId = useId();
  const editEstadoSelectId = useId();
  const [familiar, setFamiliar] = useState<Familiar | null>(null);
  const [items, setItems] = useState<HistorialConsumoAdulto[]>([]);
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
    let cancelled = false;
    (async () => {
      try {
        const [familiarData, list] = await Promise.all([
          api.familiares.get(id),
          api.historialConsumoAdulto.list(id),
        ]);
        if (!cancelled) {
          setFamiliar(familiarData);
          setItems(list);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error inesperado");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null); setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (form.nombre_sustancia) payload.nombre_sustancia = form.nombre_sustancia;
      if (form.estado_consumo) payload.estado_consumo = form.estado_consumo;
      payload.en_tratamiento = form.en_tratamiento;
      if (fechaInicio) payload.fecha_inicio = fechaInicio.toISOString().split("T")[0];
      if (fechaTermino) payload.fecha_termino = fechaTermino.toISOString().split("T")[0];
      const created = await api.historialConsumoAdulto.create(id, payload as Omit<HistorialConsumoAdulto, "id_historial_consumo_adulto" | "id_familiar">);
      setItems((prev) => [...prev, created]);
      setForm(DEFAULT); setFechaInicio(undefined); setFechaTermino(undefined); setShowForm(false);
    } catch (e: unknown) { setFormError(e instanceof Error ? e.message : "Error inesperado"); }
    finally { setSaving(false); }
  };

  const startEdit = (item: HistorialConsumoAdulto) => {
    setEditingId(item.id_historial_consumo_adulto);
    setEditForm({
      nombre_sustancia: item.nombre_sustancia || "",
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
      const payload: Record<string, unknown> = {};
      if (editForm.nombre_sustancia) payload.nombre_sustancia = editForm.nombre_sustancia;
      if (editForm.estado_consumo) payload.estado_consumo = editForm.estado_consumo;
      payload.en_tratamiento = editForm.en_tratamiento;
      if (editFechaInicio) payload.fecha_inicio = editFechaInicio.toISOString().split("T")[0];
      else payload.fecha_inicio = null;
      if (editFechaTermino) payload.fecha_termino = editFechaTermino.toISOString().split("T")[0];
      else payload.fecha_termino = null;
      const updated = await api.historialConsumoAdulto.update(editingId, payload);
      setItems((prev) => prev.map((i) => (i.id_historial_consumo_adulto === editingId ? updated : i)));
      setEditingId(null);
    } catch (e: unknown) { setEditError(e instanceof Error ? e.message : "Error inesperado"); }
    finally { setEditSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><Spinner className="size-6" /></div>;
  if (error || !familiar) return <div className="max-w-5xl mx-auto px-4 py-8"><p className="text-destructive">{error || "Familiar no encontrado"}</p></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="-ml-2 mb-4"><Link href={`/familiar/${id}`}><ArrowLeftIcon /> Volver al resumen</Link></Button>
      <Card className="mb-4"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{familiar.nombre}</CardTitle></CardHeader></Card>

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
                <TextField label="Sustancia" value={form.nombre_sustancia} onChange={(e) => setForm((p) => ({ ...p, nombre_sustancia: e.target.value }))} placeholder="Nombre sustancia" />
                <div>
                  <Label htmlFor={estadoSelectId} className="text-xs">Estado consumo</Label>
                  <Select value={form.estado_consumo} onValueChange={(v) => setForm((p) => ({ ...p, estado_consumo: v }))}>
                    <SelectTrigger id={estadoSelectId} className="mt-1 w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
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
                <DateField label="Fecha inicio" value={fechaInicio} onChange={setFechaInicio} />
                <DateField label="Fecha término" value={fechaTermino} onChange={setFechaTermino} />
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
            <Card key={item.id_historial_consumo_adulto}>
              <CardContent className="pt-4">
                {editingId === item.id_historial_consumo_adulto ? (
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <TextField label="Sustancia" value={editForm.nombre_sustancia} onChange={(e) => setEditForm((p) => ({ ...p, nombre_sustancia: e.target.value }))} />
                      <div>
                        <Label htmlFor={editEstadoSelectId} className="text-xs">Estado consumo</Label>
                        <Select value={editForm.estado_consumo} onValueChange={(v) => setEditForm((p) => ({ ...p, estado_consumo: v }))}>
                          <SelectTrigger id={editEstadoSelectId} className="mt-1 w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Activo">Activo</SelectItem>
                            <SelectItem value="Inactivo">Inactivo</SelectItem>
                            <SelectItem value="Abandonado">Abandonado</SelectItem>
                            <SelectItem value="En tratamiento">En tratamiento</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <DateField label="Fecha inicio" value={editFechaInicio} onChange={setEditFechaInicio} />
                      <DateField label="Fecha término" value={editFechaTermino} onChange={setEditFechaTermino} />
                      <div className="flex items-center gap-2 pt-2">
                        <Checkbox id={`edit-trat-${item.id_historial_consumo_adulto}`} checked={editForm.en_tratamiento} onCheckedChange={(v) => setEditForm((p) => ({ ...p, en_tratamiento: !!v }))} />
                        <Label htmlFor={`edit-trat-${item.id_historial_consumo_adulto}`} className="text-xs cursor-pointer">En tratamiento</Label>
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
                      <div><span className="text-xs text-muted-foreground">Sustancia: </span>{item.nombre_sustancia || "\u2014"}</div>
                      <div><span className="text-xs text-muted-foreground">Estado: </span><Badge variant="outline">{item.estado_consumo || "\u2014"}</Badge></div>
                      <div><span className="text-xs text-muted-foreground">Inicio: </span>{formatDate(item.fecha_inicio)}</div>
                      <div><span className="text-xs text-muted-foreground">Término: </span>{formatDate(item.fecha_termino)}</div>
                      <div><span className="text-xs text-muted-foreground">Tratamiento: </span>{item.en_tratamiento ? <Badge variant="secondary">Sí</Badge> : "No"}</div>
                    </div>
                    <Button variant="ghost" size="icon" aria-label={`Editar consumo${item.nombre_sustancia ? `: ${item.nombre_sustancia}` : ""}`} onClick={() => startEdit(item)}><PencilIcon className="size-4" /></Button>
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
