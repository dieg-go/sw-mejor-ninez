"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { api, type NNA, type Familiar, type E2PEvaluacion, type E2PUpdate, type E2PQuestions, type E2PPuntaje } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ageToVersion, ZONE_COLORS } from "./e2p-utils";
import { E2PQuestionnaire } from "./e2p-questionnaire";

interface E2PFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  nnaId: string;
  nna: NNA;
  familiares: Familiar[];
  vinculados: Familiar[];
  idAdultoResponsable: string | null;
  initialData?: E2PEvaluacion;
  existingPuntaje?: E2PPuntaje | null;
  onCreated: (item: E2PEvaluacion) => void;
  onUpdated: (item: E2PEvaluacion) => void;
}

export function E2PFormDialog({
  open, onOpenChange, mode, nnaId, nna, familiares, vinculados, idAdultoResponsable,
  initialData, existingPuntaje,
  onCreated, onUpdated,
}: E2PFormDialogProps) {
  const [idFamiliar, setIdFamiliar] = useState(
    initialData?.id_familiar
    || (mode === "create" && idAdultoResponsable ? idAdultoResponsable : "")
  );
  const [observacion, setObservacion] = useState(initialData?.observacion || "");
  const [fechaEval, setFechaEval] = useState<Date | undefined>(
    initialData?.fecha_evaluacion ? new Date(initialData.fecha_evaluacion + "T00:00:00") : undefined
  );
  const [fechaProx, setFechaProx] = useState<Date | undefined>(
    initialData?.fecha_proxima_evaluacion ? new Date(initialData.fecha_proxima_evaluacion + "T00:00:00") : undefined
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialVersion = mode === "create"
    ? ageToVersion(nna.fecha_nacimiento, new Date())
    : (initialData?.version ?? null);

  const [version, setVersion] = useState<number | null>(initialVersion);
  const [questions, setQuestions] = useState<E2PQuestions | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>(initialData?.respuestas || {});
  const [questionsLoading, setQuestionsLoading] = useState(true);

  useEffect(() => {
    const ver = mode === "create"
      ? ageToVersion(nna.fecha_nacimiento, new Date())
      : (initialData?.version ?? null);
    if (!ver) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuestionsLoading(false);
      return;
    }
    api.e2p.getQuestions(ver)
      .then(setQuestions)
      .catch(() => { setQuestions(null); setError("Error al cargar preguntas"); })
      .finally(() => setQuestionsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFamiliarChange = (val: string) => {
    setIdFamiliar(val === "none" ? "" : val);
  };

  const buildPayload = () => {
    const p: Record<string, unknown> = {};
    if (idFamiliar) p.id_familiar = idFamiliar;
    if (observacion) p.observacion = observacion;
    if (fechaEval) p.fecha_evaluacion = fechaEval.toISOString().split("T")[0];
    else if (mode === "edit") p.fecha_evaluacion = null;
    if (fechaProx) p.fecha_proxima_evaluacion = fechaProx.toISOString().split("T")[0];
    else if (mode === "edit") p.fecha_proxima_evaluacion = null;
    if (version) p.version = version;
    if (mode === "edit") {
      p.respuestas = Object.keys(answers).length > 0 ? answers : null;
    } else {
      if (Object.keys(answers).length > 0) p.respuestas = answers;
    }
    return p;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!version) { setError("No se pudo determinar la versión"); return; }
    setError(null);
    setSaving(true);
    try {
      const p = buildPayload();
      if (mode === "create") {
        const created = await api.e2p.createByNna(nnaId, p as E2PUpdate);
        onCreated(created);
      } else if (initialData) {
        const updated = await api.e2p.update(initialData.id_e2p, p as E2PUpdate);
        onUpdated(updated);
      }
      onOpenChange(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  };

  const puntajeResumen = useMemo(() => {
    if (existingPuntaje) return existingPuntaje.categorias;
    if (!questions || Object.keys(answers).length === 0) return null;
    const cats: Record<string, { total: number; count: number }> = {};
    for (const q of questions.preguntas) {
      const val = answers[String(q.id)];
      if (val === undefined) continue;
      const entry = cats[q.categoria] ?? (cats[q.categoria] = { total: 0, count: 0 });
      entry.total += val;
      entry.count += 1;
    }
    return Object.entries(cats).map(([categoria, { total, count }]) => ({
      categoria,
      puntaje_bruto: total,
      puntaje_max: count * 4,
      zona: "—" as const,
      rango_zona: "",
    }));
  }, [existingPuntaje, questions, answers]);

  const familiarOptions = mode === "create" ? vinculados : familiares;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nuevo E2P" : "Editar E2P"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Familiar</Label>
              {familiarOptions.length === 0 && mode === "create" ? (
                <p className="text-sm text-muted-foreground mt-1.5">No hay familiares vinculados al NNA</p>
              ) : (
                <Select value={idFamiliar} onValueChange={handleFamiliarChange}>
                  <SelectTrigger className="mt-1 w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {mode === "edit" && <SelectItem value="none">— Sin familiar —</SelectItem>}
                      {familiarOptions.map((f) => (
                        <SelectItem key={f.id_familiar} value={f.id_familiar}>{f.nombre || f.id_familiar.slice(0, 8)}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label className="text-xs">Fecha evaluación</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !fechaEval && "text-muted-foreground")}>
                    <CalendarIcon />{fechaEval ? fechaEval.toLocaleDateString("es-CL") : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={fechaEval} onSelect={setFechaEval} />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-xs">Próxima evaluación</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !fechaProx && "text-muted-foreground")}>
                    <CalendarIcon />{fechaProx ? fechaProx.toLocaleDateString("es-CL") : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={fechaProx} onSelect={setFechaProx} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {puntajeResumen && (
            <div className="flex flex-wrap gap-1.5">
              {puntajeResumen.map((c) => (
                <span key={c.categoria} className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium", ZONE_COLORS[c.zona] || "bg-muted")}>
                  {c.categoria} <span className="opacity-70">{c.puntaje_bruto}/{c.puntaje_max}</span>
                </span>
              ))}
            </div>
          )}

          {questionsLoading && (
            <div className="flex items-center justify-center py-4"><Spinner className="size-5" /></div>
          )}

          {questions && (
            <E2PQuestionnaire
              questions={questions}
              answers={answers}
              onChange={(qId, val) => setAnswers((prev) => ({ ...prev, [String(qId)]: val }))}
              disabled={saving}
            />
          )}

          <div>
            <Label className="text-xs">Observación</Label>
            <Textarea className="mt-1" value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Observaciones" rows={3} />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

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
  );
}
