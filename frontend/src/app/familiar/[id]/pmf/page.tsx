"use client";

import { use, useEffect, useState } from "react";
import { Link } from "@/lib/navigation";
import { ArrowLeftIcon, PencilIcon } from "lucide-react";
import { api, type Familiar, type PMFEvaluacion } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Empty } from "@/components/ui/empty";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DateField, TextField } from "@/components/ui/form-field";

function formatDate(iso: string | null) {
  if (!iso) return "\u2014";
  return new Date(iso + "T00:00:00").toLocaleDateString("es-CL");
}

export default function PMFPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [familiar, setFamiliar] = useState<Familiar | null>(null);
  const [items, setItems] = useState<PMFEvaluacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PMFEvaluacion | undefined>(undefined);
  const [editResultado, setEditResultado] = useState("");
  const [editObservacion, setEditObservacion] = useState("");
  const [editFechaEval, setEditFechaEval] = useState<Date | undefined>(undefined);
  const [editFechaProx, setEditFechaProx] = useState<Date | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [familiarData, list] = await Promise.all([
          api.familiares.get(id),
          api.pmf.listByFamiliar(id),
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

  const openEdit = (item: PMFEvaluacion) => {
    setEditingItem(item);
    setEditResultado(item.resultado || "");
    setEditObservacion(item.observacion || "");
    setEditFechaEval(item.fecha_evaluacion ? new Date(item.fecha_evaluacion + "T00:00:00") : undefined);
    setEditFechaProx(item.fecha_proxima_evaluacion ? new Date(item.fecha_proxima_evaluacion + "T00:00:00") : undefined);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setFormError(null); setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (editResultado) payload.resultado = editResultado;
      else payload.resultado = null;
      if (editObservacion) payload.observacion = editObservacion;
      else payload.observacion = null;
      if (editFechaEval) payload.fecha_evaluacion = editFechaEval.toISOString().split("T")[0];
      else payload.fecha_evaluacion = null;
      if (editFechaProx) payload.fecha_proxima_evaluacion = editFechaProx.toISOString().split("T")[0];
      else payload.fecha_proxima_evaluacion = null;
      const updated = await api.pmf.update(editingItem.id_pmf, payload);
      setItems((prev) => prev.map((i) => (i.id_pmf === editingItem.id_pmf ? updated : i)));
      setDialogOpen(false);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><Spinner className="size-6" /></div>;
  if (error || !familiar) return <div className="max-w-5xl mx-auto px-4 py-8"><p className="text-destructive">{error || "Familiar no encontrado"}</p></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="-ml-2 mb-4"><Link href={`/familiar/${id}`}><ArrowLeftIcon /> Volver al resumen</Link></Button>
      <Card className="mb-4"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{familiar.nombre}</CardTitle></CardHeader></Card>

      <h2 className="text-lg font-semibold mb-3">PMF</h2>

      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground">{items.length} registro{items.length !== 1 ? "s" : ""}</span>
      </div>

      {items.length === 0 ? (
        <Empty><p className="text-sm text-muted-foreground">Sin registros de PMF.</p></Empty>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id_pmf}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    <div><span className="text-xs text-muted-foreground">Resultado: </span>{item.resultado || "\u2014"}</div>
                    <div><span className="text-xs text-muted-foreground">Evaluación: </span>{formatDate(item.fecha_evaluacion)}</div>
                    <div><span className="text-xs text-muted-foreground">Próxima: </span>{formatDate(item.fecha_proxima_evaluacion)}</div>
                    {item.respuestas && <div><span className="text-xs text-muted-foreground">Respuestas: </span>{Object.keys(item.respuestas).length} preguntas</div>}
                    {item.observacion && <div className="col-span-2"><span className="text-xs text-muted-foreground">Obs: </span>{item.observacion}</div>}
                  </div>
                  <Button variant="ghost" size="icon" aria-label={`Editar PMF${item.fecha_evaluacion ? `: ${formatDate(item.fecha_evaluacion)}` : ""}`} onClick={() => openEdit(item)}><PencilIcon className="size-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar PMF</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <TextField label="Resultado" value={editResultado} onChange={(e) => setEditResultado(e.target.value)} placeholder="Resultado" />
            <DateField label="Fecha evaluación" value={editFechaEval} onChange={setEditFechaEval} />
            <DateField label="Próxima evaluación" value={editFechaProx} onChange={setEditFechaProx} />
            <TextField label="Observación" value={editObservacion} onChange={(e) => setEditObservacion(e.target.value)} placeholder="Observaciones" />
            {formError && <p className="text-destructive text-sm">{formError}</p>}
            <DialogFooter>
              <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
