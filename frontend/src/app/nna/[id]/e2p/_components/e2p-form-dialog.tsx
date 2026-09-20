"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { api, type NNA, type Familiar, type E2PEvaluacion, type E2PUpdate, type E2PQuestions, type E2PPuntaje } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FamiliarSelect } from "@/components/familiar-select";
import { ageToRangoEtario, edadEnMeses, ZONE_COLORS } from "./e2p-utils";
import { E2PQuestionnaire } from "./e2p-questionnaire";

interface E2PFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  nnaId: string;
  nna: NNA;
  vinculados: Familiar[];
  idAdultoResponsable: string | null;
  initialData?: E2PEvaluacion;
  existingPuntaje?: E2PPuntaje | null;
  onCreated: (item: E2PEvaluacion) => void;
  onUpdated: (item: E2PEvaluacion) => void;
}

export function E2PFormDialog({
  open, onOpenChange, mode, nnaId, nna, vinculados, idAdultoResponsable,
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialRango = mode === "create"
    ? ageToRangoEtario(nna.fecha_nacimiento, new Date())
    : (initialData?.rango_etario ?? null);

  const rangoEtario = initialRango;
  const [questions, setQuestions] = useState<E2PQuestions | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>(initialData?.respuestas || {});
  const [questionsLoading, setQuestionsLoading] = useState(true);

  const handleAnswerChange = useCallback((qId: number, val: number) => {
    setAnswers((prev) => ({ ...prev, [String(qId)]: val }));
  }, []);

  useEffect(() => {
    if (!initialRango) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuestionsLoading(false);
      return;
    }
    api.e2p.getQuestions(initialRango)
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
    if (rangoEtario) p.rango_etario = rangoEtario;
    if (fechaEval) {
      // `edadEnMeses` devuelve null si la fecha de nacimiento no es valida. Sin
      // esa guarda el calculo daba NaN, que JSON serializa como `null`, y el
      // backend responde 422 porque `edad_meses_evaluacion` es un `int`
      // obligatorio: el usuario veia un error de validacion incomprensible.
      const meses = edadEnMeses(nna.fecha_nacimiento, fechaEval);
      if (meses !== null) p.edad_meses_evaluacion = meses;
    }
    if (mode === "edit") {
      p.respuestas = Object.keys(answers).length > 0 ? answers : null;
    } else {
      if (Object.keys(answers).length > 0) p.respuestas = answers;
    }
    return p;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rangoEtario) { setError("No se pudo determinar el rango etario"); return; }
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
    if (questions && Object.keys(answers).length > 0) {
      const dims: Record<string, { bruto: number; max: number }> = {};
      for (const q of questions.preguntas) {
        const entry = dims[q.dimension] ?? (dims[q.dimension] = { bruto: 0, max: 0 });
        entry.max += 4;
        const val = answers[String(q.id)];
        if (val !== undefined) entry.bruto += val;
      }
      return Object.entries(dims).map(([dimension, { bruto, max }]) => ({
        dimension,
        puntaje_bruto: bruto,
        puntaje_max: max,
        decil: null as number | null,
        zona: "—" as const,
      })).filter((c) => c.puntaje_bruto > 0);
    }
    if (existingPuntaje) return existingPuntaje.categorias;
    return null;
  }, [existingPuntaje, questions, answers]);

  const familiarOptions = vinculados;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nuevo E2P" : "Editar E2P"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FamiliarSelect
              familiares={familiarOptions}
              value={idFamiliar}
              onChange={handleFamiliarChange}
              nullable={mode === "edit"}
              emptyMessage="No hay familiares vinculados al NNA"
            />
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
          </div>

          {puntajeResumen && (
            <div className="flex flex-wrap gap-1.5">
              {puntajeResumen.map((c) => (
                <span key={c.dimension} className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium", ZONE_COLORS[c.zona ?? ""] || "bg-muted")}>
                  {c.dimension} <span className="opacity-70">{c.puntaje_bruto}/{c.puntaje_max}</span>
                </span>
              ))}
            </div>
          )}

          {questionsLoading && (
            <div className="flex items-center justify-center py-4"><Spinner className="size-5" /></div>
          )}

          {mode === "create" && !initialRango && (
            // Sin rango etario fiable no se carga ningun cuestionario. Antes
            // este caso aplicaba el instrumento de 13-17 en silencio (defecto
            // F2); ahora se explica el motivo y la consecuencia.
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              No se pudo determinar el rango etario a partir de la fecha de nacimiento del NNA
              {nna.fecha_nacimiento ? ` (${nna.fecha_nacimiento})` : " (sin fecha registrada)"}.
              El instrumento depende del tramo etario, así que hay que corregir esa fecha en la
              ficha del NNA antes de continuar: aplicarlo con el tramo equivocado invalidaría
              la evaluación.
            </p>
          )}

          {questions && (
            <E2PQuestionnaire
              questions={questions}
              answers={answers}
              onChange={handleAnswerChange}
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
