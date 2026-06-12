"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CalendarIcon, PlusIcon, PencilIcon } from "lucide-react";
import { api, type NNA, type PMFEvaluacion, type Familiar, type PMFQuestions } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Empty } from "@/components/ui/empty";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useVinculados } from "@/hooks/use-vinculados";
import { FamiliarSelect } from "@/components/familiar-select";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("es-CL");
}

export default function PMFPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [nna, setNna] = useState<NNA | null>(null);
  const [familiares, setFamiliares] = useState<Familiar[]>([]);
  const [items, setItems] = useState<PMFEvaluacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingItem, setEditingItem] = useState<PMFEvaluacion | undefined>(undefined);

  const [idFamiliar, setIdFamiliar] = useState("");
  const [resultado, setResultado] = useState("");
  const [observacion, setObservacion] = useState("");
  const [fechaEval, setFechaEval] = useState<Date | undefined>(undefined);
  const [fechaProx, setFechaProx] = useState<Date | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [questions, setQuestions] = useState<PMFQuestions[]>([]);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [questionsLoading, setQuestionsLoading] = useState(false);

  const { vinculados } = useVinculados(id, familiares);
  const familiarOptions = vinculados;

  const loadItems = async () => {
    setLoading(true);
    try { setItems(await api.pmf.listByNna(id)); }
    catch { setItems([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [nnaData, famList] = await Promise.all([api.nna.get(id), api.familiares.list()]);
        if (cancelled) return;
        setNna(nnaData);
        setFamiliares(famList);
        await loadItems();
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error inesperado");
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const openDialog = (mode: "create" | "edit", item?: PMFEvaluacion) => {
    setFormError(null);
    setDialogMode(mode);
    setEditingItem(item);
    if (mode === "create") {
      setIdFamiliar("");
      setResultado("");
      setObservacion("");
      setFechaEval(undefined);
      setFechaProx(undefined);
      setAnswers({});
    } else if (item) {
      setIdFamiliar(item.id_familiar || "");
      setResultado(item.resultado || "");
      setObservacion(item.observacion || "");
      setFechaEval(item.fecha_evaluacion ? new Date(item.fecha_evaluacion + "T00:00:00") : undefined);
      setFechaProx(item.fecha_proxima_evaluacion ? new Date(item.fecha_proxima_evaluacion + "T00:00:00") : undefined);
      setAnswers(item.respuestas || {});
    }
    setQuestions([]);
    setQuestionsLoading(true);
    api.pmf.getQuestions()
      .then((qs) => setQuestions(qs.sort((a, b) => a.numero - b.numero)))
      .catch(() => setError("Error al cargar preguntas"))
      .finally(() => setQuestionsLoading(false));
    setDialogOpen(true);
  };

  const handleFamiliarChange = (val: string) => {
    setIdFamiliar(val === "none" ? "" : val);
  };

  const setAnswer = (num: number, val: boolean) => {
    setAnswers((prev) => {
      if (prev[String(num)] === val) {
        const next = { ...prev };
        delete next[String(num)];
        return next;
      }
      return { ...prev, [String(num)]: val };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const p: Record<string, unknown> = {};
      if (idFamiliar) p.id_familiar = idFamiliar;
      if (resultado) p.resultado = resultado;
      if (observacion) p.observacion = observacion;
      if (fechaEval) p.fecha_evaluacion = fechaEval.toISOString().split("T")[0];
      if (fechaProx) p.fecha_proxima_evaluacion = fechaProx.toISOString().split("T")[0];
      if (Object.keys(answers).length > 0) p.respuestas = answers;
      else if (dialogMode === "edit") p.respuestas = null;

      if (dialogMode === "create") {
        const created = await api.pmf.createByNna(id, p as Record<string, unknown>);
        setItems((prev) => [...prev, created]);
      } else if (editingItem) {
        const updated = await api.pmf.update(editingItem.id_pmf, p as Record<string, unknown>);
        setItems((prev) => prev.map((i) => (i.id_pmf === editingItem.id_pmf ? updated : i)));
      }
      setDialogOpen(false);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  };

  const getFamiliarName = (idFamiliar: string | null) => {
    if (!idFamiliar) return "—";
    const f = familiares.find((x) => x.id_familiar === idFamiliar);
    return f?.nombre || idFamiliar.slice(0, 8);
  };

  if (error || !nna) return <div className="max-w-5xl mx-auto px-4 py-8"><p className="text-destructive">{error || "NNA no encontrado"}</p></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="-ml-2 mb-4"><Link href={`/nna/${id}`}><ArrowLeftIcon /> Volver al resumen</Link></Button>
      <Card className="mb-4"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{nna.nombre}</CardTitle></CardHeader></Card>

      <h2 className="text-lg font-semibold mb-3">PMF</h2>

      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground">{items.length} registro{items.length !== 1 ? "s" : ""}</span>
        {vinculados.length > 0 ? (
          <Button size="sm" onClick={() => openDialog("create")}><PlusIcon /> Nuevo PMF</Button>
        ) : (
          <Button size="sm" asChild>
            <Link href="/familiar/nuevo">Vincular Familiar</Link>
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8"><Spinner className="size-5" /></div>
      ) : items.length === 0 ? (
        <Empty><p className="text-sm text-muted-foreground">Sin registros de PMF.</p></Empty>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id_pmf}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    <div><span className="text-xs text-muted-foreground">Familiar: </span>{getFamiliarName(item.id_familiar)}</div>
                    <div><span className="text-xs text-muted-foreground">Resultado: </span>{item.resultado || "—"}</div>
                    <div><span className="text-xs text-muted-foreground">Evaluación: </span>{formatDate(item.fecha_evaluacion)}</div>
                    <div><span className="text-xs text-muted-foreground">Próxima: </span>{formatDate(item.fecha_proxima_evaluacion)}</div>
                    {item.respuestas && (
                      <div><span className="text-xs text-muted-foreground">Respuestas: </span>{Object.keys(item.respuestas).length} preguntas</div>
                    )}
                    {item.observacion && <div className="col-span-2"><span className="text-xs text-muted-foreground">Obs: </span>{item.observacion}</div>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => openDialog("edit", item)}><PencilIcon className="size-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "Nuevo PMF" : "Editar PMF"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FamiliarSelect
                  familiares={familiarOptions}
                  value={idFamiliar}
                  onChange={handleFamiliarChange}
                  nullable
                />
              </div>
              <div>
                <Label className="text-xs">Resultado</Label>
                <Input className="mt-1" value={resultado} onChange={(e) => setResultado(e.target.value)} placeholder="Resultado" />
              </div>
              <div>
                <Label className="text-xs">Fecha evaluación</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !fechaEval && "text-muted-foreground")}><CalendarIcon />{fechaEval ? fechaEval.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={fechaEval} onSelect={setFechaEval} /></PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-xs">Próxima evaluación</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !fechaProx && "text-muted-foreground")}><CalendarIcon />{fechaProx ? fechaProx.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={fechaProx} onSelect={setFechaProx} /></PopoverContent>
                </Popover>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Observación</Label>
                <Input className="mt-1" value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Observaciones" />
              </div>
            </div>

            {questionsLoading && (
              <div className="flex items-center justify-center py-4"><Spinner className="size-5" /></div>
            )}

            {!questionsLoading && questions.length > 0 && (
              <div className="max-h-[40vh] overflow-y-auto pr-2 space-y-1">
                {questions.map((q) => (
                  <div
                    key={q.id_pregunta_pmf}
                    className={cn(
                      "flex items-center justify-between gap-4 px-3 py-2 rounded-md border border-transparent hover:bg-muted/50",
                      answers[String(q.numero)] !== undefined && "border-primary/20 bg-muted/30"
                    )}
                  >
                    <span className="text-sm flex-1">
                      <span className="text-muted-foreground text-xs mr-1">{q.numero}.</span>
                      {q.afirmacion}
                    </span>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant={answers[String(q.numero)] === true ? "default" : "outline"}
                        className="h-7 px-3 text-xs"
                        onClick={() => setAnswer(q.numero, true)}
                        disabled={saving}
                      >
                        Sí
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={answers[String(q.numero)] === false ? "default" : "outline"}
                        className={cn("h-7 px-3 text-xs", answers[String(q.numero)] === false && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
                        onClick={() => setAnswer(q.numero, false)}
                        disabled={saving}
                      >
                        No
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {formError && <p className="text-destructive text-sm">{formError}</p>}

            <DialogFooter>
              <Button type="submit" disabled={saving || questionsLoading}>
                {saving ? "Guardando..." : "Guardar"}
              </Button>
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
