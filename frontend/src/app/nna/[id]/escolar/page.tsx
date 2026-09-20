"use client";

import { use, useEffect, useState } from "react";
import { Link } from "@/lib/navigation";
import { ArrowLeftIcon, PlusIcon, PencilIcon } from "lucide-react";
import { api, type NNA, type AntecedenteEscolar } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Empty } from "@/components/ui/empty";
import { Checkbox } from "@/components/ui/checkbox";
import { DateField, TextField } from "@/components/ui/form-field";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("es-CL");
}

const DEFAULT = { fecha_antecedente_escolar: "", escolarizado: false, id_establecimiento_educacional: "", ultimo_ano_cursado: "" as string | number };

export default function EscolarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = use(params);
  const sp = use(searchParams);
  const idCaso = typeof sp.id_caso === "string" ? sp.id_caso : undefined;
  const [nna, setNna] = useState<NNA | null>(null);
  const [items, setItems] = useState<AntecedenteEscolar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClosed, setIsClosed] = useState(false);

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
        const [nnaData, list] = await Promise.all([api.nna.get(id), api.antecedenteEscolar.list(id, idCaso)]);
        setNna(nnaData); setItems(list);
        if (idCaso) setIsClosed((await api.casos.get(idCaso)).estado === "Cerrado");
      } catch (e: any) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [id, idCaso]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null); setSaving(true);
    try {
      const payload: any = {};
      payload.escolarizado = form.escolarizado;
      if (form.id_establecimiento_educacional) payload.id_establecimiento_educacional = form.id_establecimiento_educacional;
      if (form.ultimo_ano_cursado !== "") payload.ultimo_ano_cursado = Number(form.ultimo_ano_cursado);
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
      id_establecimiento_educacional: item.id_establecimiento_educacional || "",
      ultimo_ano_cursado: item.ultimo_ano_cursado ?? "",
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
      if (editForm.id_establecimiento_educacional) payload.id_establecimiento_educacional = editForm.id_establecimiento_educacional;
      if (editForm.ultimo_ano_cursado !== "") payload.ultimo_ano_cursado = Number(editForm.ultimo_ano_cursado);
      else payload.ultimo_ano_cursado = null;
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
      <Button variant="ghost" asChild className="-ml-2 mb-4"><Link href={`/nna/${id}${idCaso ? `?id_caso=${idCaso}` : ""}`}><ArrowLeftIcon /> Volver al resumen</Link></Button>
      <Card className="mb-4"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{nna.nombre}</CardTitle></CardHeader></Card>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Antecedentes Escolares</h2>
        {!showForm && !isClosed && <Button size="sm" onClick={() => setShowForm(true)}><PlusIcon /> Nuevo antecedente</Button>}
      </div>

      {showForm && (
        <Card className="mb-6 border-primary/30">
          <CardHeader className="pb-2"><CardTitle className="text-base">Nuevo antecedente</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DateField label="Fecha" value={fecha} onChange={setFecha} />
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox id="escolarizado" checked={form.escolarizado} onCheckedChange={(v) => setForm((p) => ({ ...p, escolarizado: !!v }))} />
                  <Label htmlFor="escolarizado" className="text-xs cursor-pointer">Escolarizado</Label>
                </div>
                <TextField label="Establecimiento educacional" value={form.id_establecimiento_educacional} onChange={(e) => setForm((p) => ({ ...p, id_establecimiento_educacional: e.target.value }))} placeholder="ID establecimiento" />
                <TextField label="Último año cursado" type="number" value={form.ultimo_ano_cursado} onChange={(e) => setForm((p) => ({ ...p, ultimo_ano_cursado: e.target.value }))} placeholder="Ej: 5" />
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
                      <DateField label="Fecha" value={editFecha} onChange={setEditFecha} />
                      <div className="flex items-center gap-2 pt-2">
                        <Checkbox id={`edit-esc-${item.id_antecedente_escolar}`} checked={editForm.escolarizado} onCheckedChange={(v) => setEditForm((p) => ({ ...p, escolarizado: !!v }))} />
                        <Label htmlFor={`edit-esc-${item.id_antecedente_escolar}`} className="text-xs cursor-pointer">Escolarizado</Label>
                      </div>
                      <TextField label="Establecimiento educacional" value={editForm.id_establecimiento_educacional} onChange={(e) => setEditForm((p) => ({ ...p, id_establecimiento_educacional: e.target.value }))} />
                      <TextField label="Último año cursado" type="number" value={editForm.ultimo_ano_cursado} onChange={(e) => setEditForm((p) => ({ ...p, ultimo_ano_cursado: e.target.value }))} />
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
                      <div><span className="text-xs text-muted-foreground">Último año: </span>{item.ultimo_ano_cursado ?? "—"}</div>
                    </div>
                    {!isClosed && <Button variant="ghost" size="icon" aria-label={`Editar antecedente escolar${item.id_establecimiento_educacional ? `: ${item.id_establecimiento_educacional}` : ""}`} onClick={() => startEdit(item)}><PencilIcon className="size-4" /></Button>}
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
