"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CalendarIcon, PlusIcon, PencilIcon } from "lucide-react";
import { api, type NNA, type AntecedenteEscolar } from "@/lib/api";
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

const DEFAULT = { fecha_antecedente_escolar: "", escolarizado: false, establecimiento: "", ultimo_ano_curso: "" as string | number };

export default function EscolarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [nna, setNna] = useState<NNA | null>(null);
  const [items, setItems] = useState<AntecedenteEscolar[]>([]);
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
        const [nnaData, list] = await Promise.all([api.nna.get(id), api.antecedenteEscolar.list(id)]);
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
      payload.escolarizado = form.escolarizado;
      if (form.establecimiento) payload.establecimiento = form.establecimiento;
      if (form.ultimo_ano_curso !== "") payload.ultimo_ano_curso = Number(form.ultimo_ano_curso);
      if (fecha) payload.fecha_antecedente_escolar = fecha.toISOString().split("T")[0];
      const created = await api.antecedenteEscolar.create(id, payload);
      setItems((prev) => [...prev, created]);
      setForm(DEFAULT); setFecha(undefined); setShowForm(false);
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  };

  const startEdit = (item: AntecedenteEscolar) => {
    setEditingId(item.id_antecedente_escolar);
    setEditForm({
      fecha_antecedente_escolar: item.fecha_antecedente_escolar || "",
      escolarizado: item.escolarizado,
      establecimiento: item.establecimiento || "",
      ultimo_ano_curso: item.ultimo_ano_curso ?? "",
    });
    setEditFecha(item.fecha_antecedente_escolar ? new Date(item.fecha_antecedente_escolar + "T00:00:00") : undefined);
    setEditError(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setEditError(null); setEditSaving(true);
    try {
      const payload: any = {};
      payload.escolarizado = editForm.escolarizado;
      if (editForm.establecimiento) payload.establecimiento = editForm.establecimiento;
      if (editForm.ultimo_ano_curso !== "") payload.ultimo_ano_curso = Number(editForm.ultimo_ano_curso);
      else payload.ultimo_ano_curso = null;
      if (editFecha) payload.fecha_antecedente_escolar = editFecha.toISOString().split("T")[0];
      else payload.fecha_antecedente_escolar = null;
      const updated = await api.antecedenteEscolar.update(editingId, payload);
      setItems((prev) => prev.map((i) => (i.id_antecedente_escolar === editingId ? updated : i)));
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
        <h2 className="text-lg font-semibold">Antecedentes Escolares</h2>
        {!showForm && <Button size="sm" onClick={() => setShowForm(true)}><PlusIcon /> Nuevo antecedente</Button>}
      </div>

      {showForm && (
        <Card className="mb-6 border-primary/30">
          <CardHeader className="pb-2"><CardTitle className="text-base">Nuevo antecedente</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Fecha</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !fecha && "text-muted-foreground")}><CalendarIcon />{fecha ? fecha.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={fecha} onSelect={setFecha} /></PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox id="escolarizado" checked={form.escolarizado} onCheckedChange={(v) => setForm((p) => ({ ...p, escolarizado: !!v }))} />
                  <Label htmlFor="escolarizado" className="text-xs cursor-pointer">Escolarizado</Label>
                </div>
                <div>
                  <Label className="text-xs">Establecimiento</Label>
                  <Input className="mt-1" value={form.establecimiento} onChange={(e) => setForm((p) => ({ ...p, establecimiento: e.target.value }))} placeholder="Establecimiento" />
                </div>
                <div>
                  <Label className="text-xs">Último año cursado</Label>
                  <Input className="mt-1" type="number" value={form.ultimo_ano_curso} onChange={(e) => setForm((p) => ({ ...p, ultimo_ano_curso: e.target.value }))} placeholder="Ej: 5" />
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
        <Empty><p className="text-sm text-muted-foreground">Sin antecedentes escolares.</p></Empty>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id_antecedente_escolar}>
              <CardContent className="pt-4">
                {editingId === item.id_antecedente_escolar ? (
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Fecha</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !editFecha && "text-muted-foreground")}><CalendarIcon />{editFecha ? editFecha.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={editFecha} onSelect={setEditFecha} /></PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <Checkbox id={`edit-esc-${item.id_antecedente_escolar}`} checked={editForm.escolarizado} onCheckedChange={(v) => setEditForm((p) => ({ ...p, escolarizado: !!v }))} />
                        <Label htmlFor={`edit-esc-${item.id_antecedente_escolar}`} className="text-xs cursor-pointer">Escolarizado</Label>
                      </div>
                      <div>
                        <Label className="text-xs">Establecimiento</Label>
                        <Input className="mt-1" value={editForm.establecimiento} onChange={(e) => setEditForm((p) => ({ ...p, establecimiento: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-xs">Último año</Label>
                        <Input className="mt-1" type="number" value={editForm.ultimo_ano_curso} onChange={(e) => setEditForm((p) => ({ ...p, ultimo_ano_curso: e.target.value }))} />
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
                      <div><span className="text-xs text-muted-foreground">Fecha: </span>{formatDate(item.fecha_antecedente_escolar)}</div>
                      <div><span className="text-xs text-muted-foreground">Estado: </span>{item.escolarizado ? <Badge variant="secondary">Escolarizado</Badge> : "No escolarizado"}</div>
                      <div><span className="text-xs text-muted-foreground">Establecimiento: </span>{item.establecimiento || "—"}</div>
                      <div><span className="text-xs text-muted-foreground">Último año: </span>{item.ultimo_ano_curso ?? "—"}</div>
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
