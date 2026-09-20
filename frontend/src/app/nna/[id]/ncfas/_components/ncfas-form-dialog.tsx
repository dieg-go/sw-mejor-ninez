"use client";

import { useEffect, useId, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { api, type NCFASEvaluacion, type Familiar, type DimensionNCFAS } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FamiliarSelect } from "@/components/familiar-select";
import { cn } from "@/lib/utils";
import { NcfasDimensionSection } from "./ncfas-dimension-section";
import { MOMENTOS, isDimensionVisible, buildEmptyRespuestas } from "./ncfas-utils";

interface NcfasFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  nnaId: string;
  vinculados: Familiar[];
  evaluation?: NCFASEvaluacion;
  onSaved: (saved: NCFASEvaluacion) => void;
}

function initRespuestas(evaluation?: NCFASEvaluacion): Record<string, Record<string, string>> {
  if (!evaluation?.respuestas) return buildEmptyRespuestas();
  const next: Record<string, Record<string, string>> = {};
  MOMENTOS.forEach((m) => {
    next[m] = evaluation.respuestas?.[m] ? { ...evaluation.respuestas[m] } : {};
  });
  return next;
}

export function NcfasFormDialog({
  open,
  onOpenChange,
  mode,
  nnaId,
  vinculados,
  evaluation,
  onSaved,
}: NcfasFormDialogProps) {
  const isEdit = mode === "edit" && !!evaluation;
  const familiarOptions = vinculados;
  const estadoId = useId();
  const esReunificacionId = useId();
  const observacionGeneralId = useId();

  // Header — initialised from props (key ensures remount)
  const [idFamiliar, setIdFamiliar] = useState(isEdit ? (evaluation.id_familiar || "") : "");
  const [esReunificacion, setEsReunificacion] = useState(isEdit ? evaluation.es_reunificacion : false);
  const [estado, setEstado] = useState(isEdit ? (evaluation.estado || "") : "");
  const [fechaApertura, setFechaApertura] = useState<Date | undefined>(
    isEdit && evaluation.fecha_apertura ? new Date(evaluation.fecha_apertura + "T00:00:00") : undefined
  );
  const [fechaCierre, setFechaCierre] = useState<Date | undefined>(
    isEdit && evaluation.fecha_cierre ? new Date(evaluation.fecha_cierre + "T00:00:00") : undefined
  );
  const [observacionGeneral, setObservacionGeneral] = useState(isEdit ? (evaluation.observacion_general || "") : "");

  const [respuestas, setRespuestas] = useState<Record<string, Record<string, string>>>(
    () => initRespuestas(evaluation)
  );

  const [comentarios, setComentarios] = useState<Record<string, string>>({});

  const [dimensions, setDimensions] = useState<DimensionNCFAS[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);

  const [collapsedDims, setCollapsedDims] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const visibleDimensions = dimensions.filter((d) => isDimensionVisible(d.letra, esReunificacion));

  // Async data fetch — only runs when dialog opens (key remount resets state above)
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    api.ncfas.getItems().then((dims) => {
      if (!cancelled) setDimensions(dims);
    }).catch(() => {
      if (!cancelled) setDimensions([]);
    }).finally(() => {
      if (!cancelled) setItemsLoading(false);
    });

    if (isEdit && evaluation) {
      api.ncfas.getComentarios(evaluation.id_ncfas).then((coms) => {
        if (cancelled) return;
        const comMap: Record<string, string> = {};
        coms.forEach((c) => { comMap[c.letra_dimension] = c.comentario; });
        setComentarios(comMap);
      }).catch(() => {});
    }

    return () => { cancelled = true; };
  }, [open]);

  const setPuntaje = (momento: string, key: string, value: string) => {
    setRespuestas((prev) => {
      const momentoData = { ...prev[momento] };
      if (value === "__none__") {
        delete momentoData[key];
      } else {
        momentoData[key] = value;
      }
      return { ...prev, [momento]: momentoData };
    });
  };

  const setComentario = (letra: string, value: string) => {
    setComentarios((prev) => ({ ...prev, [letra]: value }));
  };

  const toggleDimension = (letra: string) => {
    setCollapsedDims((prev) => {
      const next = new Set(prev);
      if (next.has(letra)) next.delete(letra);
      else next.add(letra);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const p: Record<string, unknown> = {};
      p.id_familiar = idFamiliar || null;
      p.es_reunificacion = esReunificacion;
      if (estado) p.estado = estado;
      if (fechaApertura) p.fecha_apertura = fechaApertura.toISOString().split("T")[0];
      if (fechaCierre) p.fecha_cierre = fechaCierre.toISOString().split("T")[0];
      if (observacionGeneral) p.observacion_general = observacionGeneral;

      const cleanRespuestas: Record<string, Record<string, string>> = {};
      MOMENTOS.forEach((m) => {
        if (Object.keys(respuestas[m]).length > 0) {
          cleanRespuestas[m] = respuestas[m];
        }
      });
      if (Object.keys(cleanRespuestas).length > 0) {
        p.respuestas = cleanRespuestas;
      } else if (mode === "edit") {
        p.respuestas = null;
      }

      let saved: NCFASEvaluacion;
      if (mode === "create") {
        saved = await api.ncfas.createByNna(nnaId, p as Record<string, unknown>);
      } else if (evaluation) {
        saved = await api.ncfas.update(evaluation.id_ncfas, p as Record<string, unknown>);
      } else {
        throw new Error("ID de edición no encontrado");
      }

      for (const [letra, comentario] of Object.entries(comentarios)) {
        if (comentario.trim()) {
          api.ncfas.saveComentario(saved.id_ncfas, letra, comentario).catch(() => {});
        }
      }

      onSaved(saved);
      onOpenChange(false);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nuevo NCFAS" : "Editar NCFAS"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Header fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
            <div>
              <FamiliarSelect
                familiares={familiarOptions}
                value={idFamiliar}
                onChange={(v) => setIdFamiliar(v === "none" ? "" : v)}
                nullable
                emptyMessage="No hay familiares vinculados al NNA"
              />
            </div>
            <div>
              <Label htmlFor={estadoId} className="text-xs">Estado</Label>
              <Input id={estadoId} className="mt-1 h-8 text-sm" value={estado} onChange={(e) => setEstado(e.target.value)} placeholder="Ej: Ingreso completado" />
            </div>
            <div className="flex items-end gap-2">
              <label htmlFor={esReunificacionId} className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                <input id={esReunificacionId} type="checkbox" checked={esReunificacion} onChange={(e) => setEsReunificacion(e.target.checked)} className="size-3.5" />
                Es reunificación
              </label>
            </div>
            <div />
            <CalendarField label="Fecha apertura" date={fechaApertura} onSelect={setFechaApertura} />
            <CalendarField label="Fecha cierre" date={fechaCierre} onSelect={setFechaCierre} />
            <div className="sm:col-span-2">
              <Label htmlFor={observacionGeneralId} className="text-xs">Observación general</Label>
              <Input id={observacionGeneralId} className="mt-1 h-8 text-sm" value={observacionGeneral} onChange={(e) => setObservacionGeneral(e.target.value)} placeholder="Observaciones" />
            </div>
          </div>

          {itemsLoading && (
            <div className="flex items-center justify-center py-4 shrink-0"><Spinner className="size-5" /></div>
          )}

          {!itemsLoading && visibleDimensions.length > 0 && (
            <Tabs defaultValue="Ingreso" className="flex-1 flex flex-col mt-3 min-h-0">
              <TabsList className="shrink-0">
                {MOMENTOS.map((m) => (
                  <TabsTrigger key={m} value={m} className="text-xs px-3 py-1">{m}</TabsTrigger>
                ))}
              </TabsList>

              {MOMENTOS.map((momento) => (
                <TabsContent key={momento} value={momento} className="flex-1 overflow-y-auto pr-1 mt-2 data-[state=inactive]:hidden">
                  <div className="space-y-2">
                    {visibleDimensions.map((dim) => (
                      <NcfasDimensionSection
                        key={dim.letra}
                        dimension={dim}
                        momento={momento}
                        respuestasMomento={respuestas[momento] || {}}
                        comentario={comentarios[dim.letra] || ""}
                        isCollapsed={collapsedDims.has(dim.letra)}
                        onToggle={() => toggleDimension(dim.letra)}
                        onSetPuntaje={setPuntaje}
                        onSetComentario={setComentario}
                      />
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}

          {!itemsLoading && visibleDimensions.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center shrink-0">No hay dimensiones disponibles.</p>
          )}

          {formError && <p className="text-destructive text-sm shrink-0 mt-2">{formError}</p>}

          <DialogFooter className="shrink-0 mt-3">
            <Button type="submit" disabled={saving || itemsLoading}>
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

function CalendarField({
  label,
  date,
  onSelect,
}: {
  label: string;
  date: Date | undefined;
  onSelect: (d: Date | undefined) => void;
}) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button id={id} variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1 h-8 text-sm", !date && "text-muted-foreground")}>
            <CalendarIcon className="size-3.5 mr-1" />{date ? date.toLocaleDateString("es-CL") : "Seleccionar"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={date} onSelect={onSelect} /></PopoverContent>
      </Popover>
    </div>
  );
}
