"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, PlusIcon, PencilIcon } from "lucide-react";
import { api, type NNA, type DiscapacidadNNA } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Empty } from "@/components/ui/empty";

const DEFAULT = { tipo: "", porcentaje_grado: "" as string | number, observacion: "" };

export default function DiscapacidadesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [nna, setNna] = useState<NNA | null>(null);
  const [items, setItems] = useState<DiscapacidadNNA[]>([]);
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
    (async () => {
      try {
        const [nnaData, list] = await Promise.all([api.nna.get(id), api.discapacidadNNA.list(id)]);
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
      if (form.tipo) payload.tipo = form.tipo;
      if (form.observacion) payload.observacion = form.observacion;
      if (form.porcentaje_grado !== "") payload.porcentaje_grado = Number(form.porcentaje_grado);
      const created = await api.discapacidadNNA.create(id, payload);
      setItems((prev) => [...prev, created]);
      setForm(DEFAULT); setShowForm(false);
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  };

  const startEdit = (item: DiscapacidadNNA) => {
    setEditingId(item.id_discapacidad_nna);
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
      const payload: any = {};
      if (editForm.tipo) payload.tipo = editForm.tipo;
      if (editForm.observacion) payload.observacion = editForm.observacion;
      if (editForm.porcentaje_grado !== "") payload.porcentaje_grado = Number(editForm.porcentaje_grado);
      else payload.porcentaje_grado = null;
      const updated = await api.discapacidadNNA.update(editingId, payload);
      setItems((prev) => prev.map((i) => (i.id_discapacidad_nna === editingId ? updated : i)));
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
        <h2 className="text-lg font-semibold">Discapacidades</h2>
        {!showForm && <Button size="sm" onClick={() => setShowForm(true)}><PlusIcon /> Nueva discapacidad</Button>}
      </div>

      {showForm && (
        <Card className="mb-6 border-primary/30">
          <CardHeader className="pb-2"><CardTitle className="text-base">Nueva discapacidad</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Input className="mt-1" value={form.tipo} onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))} placeholder="Ej: Física, intelectual" />
                </div>
                <div>
                  <Label className="text-xs">Porcentaje / Grado</Label>
                  <Input className="mt-1" type="number" value={form.porcentaje_grado} onChange={(e) => setForm((p) => ({ ...p, porcentaje_grado: e.target.value }))} placeholder="Ej: 50" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Observación</Label>
                  <Input className="mt-1" value={form.observacion} onChange={(e) => setForm((p) => ({ ...p, observacion: e.target.value }))} placeholder="Observaciones" />
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
        <Empty><p className="text-sm text-muted-foreground">Sin discapacidades registradas.</p></Empty>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id_discapacidad_nna}>
              <CardContent className="pt-4">
                {editingId === item.id_discapacidad_nna ? (
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Tipo</Label>
                        <Input className="mt-1" value={editForm.tipo} onChange={(e) => setEditForm((p) => ({ ...p, tipo: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-xs">Porcentaje / Grado</Label>
                        <Input className="mt-1" type="number" value={editForm.porcentaje_grado} onChange={(e) => setEditForm((p) => ({ ...p, porcentaje_grado: e.target.value }))} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs">Observación</Label>
                        <Input className="mt-1" value={editForm.observacion} onChange={(e) => setEditForm((p) => ({ ...p, observacion: e.target.value }))} />
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
                      <div><span className="text-xs text-muted-foreground">Tipo: </span>{item.tipo || "—"}</div>
                      <div><span className="text-xs text-muted-foreground">Grado: </span>{item.porcentaje_grado ?? "—"}{item.porcentaje_grado != null ? "%" : ""}</div>
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
