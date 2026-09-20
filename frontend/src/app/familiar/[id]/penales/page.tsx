"use client";

import { use, useEffect, useState } from "react";
import { Link } from "@/lib/navigation";
import { ArrowLeftIcon, PlusIcon, PencilIcon } from "lucide-react";
import { api, type Familiar, type AntecedentesPenales } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Empty } from "@/components/ui/empty";
import { TextField } from "@/components/ui/form-field";
import { FileUpload } from "@/components/ui/file-upload";

const DEFAULT = { descripcion: "", url_documento_adjunto: "" };

export default function PenalesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [familiar, setFamiliar] = useState<Familiar | null>(null);
  const [items, setItems] = useState<AntecedentesPenales[]>([]);
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
          api.antecedentesPenales.list(id),
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
      if (form.descripcion) payload.descripcion = form.descripcion;
      if (form.url_documento_adjunto) payload.url_documento_adjunto = form.url_documento_adjunto;
      const created = await api.antecedentesPenales.create(id, payload as Omit<AntecedentesPenales, "id_antecedente_penal" | "id_familiar">);
      setItems((prev) => [...prev, created]);
      setForm(DEFAULT); setShowForm(false);
    } catch (e: unknown) { setFormError(e instanceof Error ? e.message : "Error inesperado"); }
    finally { setSaving(false); }
  };

  const startEdit = (item: AntecedentesPenales) => {
    setEditingId(item.id_antecedente_penal);
    setEditForm({
      descripcion: item.descripcion || "",
      url_documento_adjunto: item.url_documento_adjunto || "",
    });
    setEditError(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setEditError(null); setEditSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (editForm.descripcion) payload.descripcion = editForm.descripcion;
      else payload.descripcion = null;
      if (editForm.url_documento_adjunto) payload.url_documento_adjunto = editForm.url_documento_adjunto;
      else payload.url_documento_adjunto = null;
      const updated = await api.antecedentesPenales.update(editingId, payload);
      setItems((prev) => prev.map((i) => (i.id_antecedente_penal === editingId ? updated : i)));
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
        <h2 className="text-lg font-semibold">Antecedentes Penales</h2>
        {!showForm && <Button size="sm" onClick={() => setShowForm(true)}><PlusIcon /> Nuevo antecedente</Button>}
      </div>

      {showForm && (
        <Card className="mb-6 border-primary/30">
          <CardHeader className="pb-2"><CardTitle className="text-base">Nuevo antecedente penal</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <TextField label="Descripción" value={form.descripcion} onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))} placeholder="Descripción del antecedente" />
                <div>
                  <FileUpload
                    label="Documento adjunto"
                    value={form.url_documento_adjunto || null}
                    onUploadSuccess={(url) => setForm((p) => ({ ...p, url_documento_adjunto: url }))}
                    onClear={() => setForm((p) => ({ ...p, url_documento_adjunto: "" }))}
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
        <Empty><p className="text-sm text-muted-foreground">Sin antecedentes penales registrados.</p></Empty>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id_antecedente_penal}>
              <CardContent className="pt-4">
                {editingId === item.id_antecedente_penal ? (
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <TextField label="Descripción" value={editForm.descripcion} onChange={(e) => setEditForm((p) => ({ ...p, descripcion: e.target.value }))} />
                      <div>
                        <FileUpload
                          label="Documento adjunto"
                          value={editForm.url_documento_adjunto || null}
                          onUploadSuccess={(url) => setEditForm((p) => ({ ...p, url_documento_adjunto: url }))}
                          onClear={() => setEditForm((p) => ({ ...p, url_documento_adjunto: "" }))}
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
                    <div className="flex-1 min-w-0">
                      <Badge variant="destructive" className="mb-2">Antecedente penal</Badge>
                      <p className="text-sm">{item.descripcion || "\u2014"}</p>
                      {item.url_documento_adjunto && (
                        <a
                          href={item.url_documento_adjunto}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline text-xs mt-1 inline-block"
                        >
                          Ver documento
                        </a>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" aria-label={`Editar antecedente penal${item.descripcion ? `: ${item.descripcion}` : ""}`} onClick={() => startEdit(item)}><PencilIcon className="size-4" /></Button>
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
