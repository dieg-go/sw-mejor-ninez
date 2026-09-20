"use client";

import { use, useEffect, useState } from "react";
import { Link } from "@/lib/navigation";
import { ArrowLeftIcon, PlusIcon, PencilIcon } from "lucide-react";
import { api, type Familiar, type DiscapacidadAdulto } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TextField } from "@/components/ui/form-field";
import { Spinner } from "@/components/ui/spinner";
import { Empty } from "@/components/ui/empty";

const DEFAULT = { tipo: "", porcentaje_grado: "" as string | number, observacion: "" };

export default function DiscapacidadesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [familiar, setFamiliar] = useState<Familiar | null>(null);
  const [items, setItems] = useState<DiscapacidadAdulto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(DEFAULT);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [familiarData, list] = await Promise.all([
          api.familiares.get(id),
          api.discapacidadAdulto.list(id),
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
      if (form.tipo) payload.tipo = form.tipo;
      if (form.observacion) payload.observacion = form.observacion;
      if (form.porcentaje_grado !== "") payload.porcentaje_grado = Number(form.porcentaje_grado);
      const created = await api.discapacidadAdulto.create(id, payload as Omit<DiscapacidadAdulto, "id_discapacidad_adulto" | "id_familiar">);
      setItems((prev) => [...prev, created]);
      setForm(DEFAULT); setShowForm(false);
    } catch (e: unknown) { setFormError(e instanceof Error ? e.message : "Error inesperado"); }
    finally { setSaving(false); }
  };

  const startEdit = (item: DiscapacidadAdulto) => {
    setEditingId(item.id_discapacidad_adulto);
    setEditForm({
      tipo: item.tipo || "",
      porcentaje_grado: item.porcentaje_grado ?? "",
      observacion: item.observacion || "",
    });
    setEditError(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setEditError(null); setEditSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (editForm.tipo) payload.tipo = editForm.tipo;
      if (editForm.observacion) payload.observacion = editForm.observacion;
      if (editForm.porcentaje_grado !== "") payload.porcentaje_grado = Number(editForm.porcentaje_grado);
      else payload.porcentaje_grado = null;
      const updated = await api.discapacidadAdulto.update(editingId, payload);
      setItems((prev) => prev.map((i) => (i.id_discapacidad_adulto === editingId ? updated : i)));
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
        <h2 className="text-lg font-semibold">Discapacidades</h2>
        {!showForm && <Button size="sm" onClick={() => setShowForm(true)}><PlusIcon /> Nueva discapacidad</Button>}
      </div>

      {showForm && (
        <Card className="mb-6 border-primary/30">
          <CardHeader className="pb-2"><CardTitle className="text-base">Nueva discapacidad</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField label="Tipo" value={form.tipo} onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))} placeholder="Ej: Física, intelectual" />
                <TextField label="Porcentaje / Grado" type="number" value={form.porcentaje_grado} onChange={(e) => setForm((p) => ({ ...p, porcentaje_grado: e.target.value }))} placeholder="Ej: 50" />
                <TextField label="Observación" className="sm:col-span-2" value={form.observacion} onChange={(e) => setForm((p) => ({ ...p, observacion: e.target.value }))} placeholder="Observaciones" />
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
        <Empty><p className="text-sm text-muted-foreground">Sin discapacidades registradas.</p></Empty>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id_discapacidad_adulto}>
              <CardContent className="pt-4">
                {editingId === item.id_discapacidad_adulto ? (
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <TextField label="Tipo" value={editForm.tipo} onChange={(e) => setEditForm((p) => ({ ...p, tipo: e.target.value }))} />
                      <TextField label="Porcentaje / Grado" type="number" value={editForm.porcentaje_grado} onChange={(e) => setEditForm((p) => ({ ...p, porcentaje_grado: e.target.value }))} />
                      <TextField label="Observación" className="sm:col-span-2" value={editForm.observacion} onChange={(e) => setEditForm((p) => ({ ...p, observacion: e.target.value }))} />
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
                      <div><span className="text-xs text-muted-foreground">Tipo: </span>{item.tipo || "\u2014"}</div>
                      <div><span className="text-xs text-muted-foreground">Grado: </span>{item.porcentaje_grado ?? "\u2014"}{item.porcentaje_grado != null ? "%" : ""}</div>
                      {item.observacion && <div className="col-span-2"><span className="text-xs text-muted-foreground">Obs: </span>{item.observacion}</div>}
                    </div>
                    <Button variant="ghost" size="icon" aria-label={`Editar discapacidad${item.tipo ? `: ${item.tipo}` : ""}`} onClick={() => startEdit(item)}><PencilIcon className="size-4" /></Button>
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
