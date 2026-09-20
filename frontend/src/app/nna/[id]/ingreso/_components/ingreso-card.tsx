import { useEffect, useState } from "react";
import { PencilIcon } from "lucide-react";
import {
  api,
  type AntecedenteIngreso,
  type CausalIngreso,
  type DerechoVulnerado,
  type SolicitanteIngreso,
} from "@/lib/api";
import { detectTipoCausa } from "@/lib/catalogos";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { IngresoFormFields, type IngresoFormData } from "./ingreso-form-fields";
import { CausalesSection } from "./causales-section";
import { DerechosSection } from "./derechos-section";

interface IngresoCardProps {
  ingreso: AntecedenteIngreso;
  solicitantes: SolicitanteIngreso[];
  onUpdate: (updated: AntecedenteIngreso) => void;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-CL");
}

function getSolicitanteNombre(solicitantes: SolicitanteIngreso[], id: string | null): string {
  if (!id) return "—";
  const s = solicitantes.find((sol) => sol.id_solicitante_ingreso === id);
  return s?.nombre || id;
}

const DEFAULT_EDIT_FORM: IngresoFormData = {
  fecha_ingreso_residencia: "",
  id_solicitante_ingreso: "",
  orden_tribunal: false,
  fecha_causa: "",
  tribunal: "",
  materia: "",
  codigo_rit: "",
  codigo_ruc: "",
};

export function IngresoCard({ ingreso, solicitantes, onUpdate }: IngresoCardProps) {
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<IngresoFormData>(DEFAULT_EDIT_FORM);
  const [editFechaIngreso, setEditFechaIngreso] = useState<Date | undefined>(undefined);
  const [editFechaCausa, setEditFechaCausa] = useState<Date | undefined>(undefined);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [causales, setCausales] = useState<CausalIngreso[] | null>(null);
  const [derechos, setDerechos] = useState<DerechoVulnerado[] | null>(null);

  const [causalSaving, setCausalSaving] = useState(false);
  const [derechoSaving, setDerechoSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [c, d] = await Promise.all([
        api.causalIngreso.list(ingreso.id_antecedente_ingreso).catch(() => [] as CausalIngreso[]),
        api.derechoVulnerado.list(ingreso.id_antecedente_ingreso).catch(() => [] as DerechoVulnerado[]),
      ]);
      setCausales(c);
      setDerechos(d);
    })();
  }, [ingreso.id_antecedente_ingreso]);

  const startEdit = () => {
    setEditForm({
      fecha_ingreso_residencia: ingreso.fecha_ingreso_residencia || "",
      id_solicitante_ingreso: ingreso.id_solicitante_ingreso || "",
      orden_tribunal: ingreso.orden_tribunal,
      fecha_causa: ingreso.fecha_causa || "",
      tribunal: ingreso.tribunal || "",
      materia: ingreso.materia || "",
      codigo_rit: ingreso.codigo_rit || "",
      codigo_ruc: ingreso.codigo_ruc || "",
    });
    setEditFechaIngreso(
      ingreso.fecha_ingreso_residencia
        ? new Date(ingreso.fecha_ingreso_residencia + "T00:00:00")
        : undefined
    );
    setEditFechaCausa(
      ingreso.fecha_causa ? new Date(ingreso.fecha_causa + "T00:00:00") : undefined
    );
    setEditError(null);
    setEditing(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    setEditSaving(true);
    try {
      const payload: any = {};
      for (const [k, v] of Object.entries(editForm)) {
        if (k === "orden_tribunal") { payload[k] = v; continue; }
        if (v) payload[k] = v;
      }
      if (editFechaIngreso) payload.fecha_ingreso_residencia = editFechaIngreso.toISOString().split("T")[0];
      else payload.fecha_ingreso_residencia = null;
      if (editFechaCausa) payload.fecha_causa = editFechaCausa.toISOString().split("T")[0];
      else payload.fecha_causa = null;
      const updated = await api.antecedenteIngreso.update(ingreso.id_antecedente_ingreso, payload);
      onUpdate(updated);
      setEditing(false);
    } catch (e: any) {
      setEditError(e.message);
    } finally {
      setEditSaving(false);
    }
  };

  const handleCreateCausal = async (nombre: string, estado: string) => {
    setCausalSaving(true);
    try {
      const payload: any = {};
      if (nombre) payload.nombre_causal = nombre;
      if (estado) payload.estado = estado;
      const created = await api.causalIngreso.create(ingreso.id_antecedente_ingreso, payload);
      setCausales((prev) => [...(prev || []), created]);
    } catch {
    } finally {
      setCausalSaving(false);
    }
  };

  const handleCreateDerecho = async (nombre: string, estado: string) => {
    setDerechoSaving(true);
    try {
      const payload: any = {};
      if (nombre) payload.nombre_derecho = nombre;
      if (estado) payload.estado = estado;
      const created = await api.derechoVulnerado.create(ingreso.id_antecedente_ingreso, payload);
      setDerechos((prev) => [...(prev || []), created]);
    } catch {
    } finally {
      setDerechoSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-4">
        {editing ? (
          <form onSubmit={handleUpdate} className="space-y-4">
            <IngresoFormFields
              form={editForm}
              setForm={setEditForm}
              fechaIngreso={editFechaIngreso}
              setFechaIngreso={setEditFechaIngreso}
              fechaCausa={editFechaCausa}
              setFechaCausa={setEditFechaCausa}
              solicitantes={solicitantes}
              idPrefix={`edit-${ingreso.id_antecedente_ingreso}`}
            />
            {editError && <p className="text-destructive text-sm">{editError}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={editSaving}>
                {editSaving ? "Guardando..." : "Guardar"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Fecha ingreso: </span>
                  {formatDate(ingreso.fecha_ingreso_residencia)}
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Solicitante: </span>
                  {getSolicitanteNombre(solicitantes, ingreso.id_solicitante_ingreso)}
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Orden tribunal: </span>
                  {ingreso.orden_tribunal ? <Badge variant="secondary">Sí</Badge> : "No"}
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Tribunal: </span>
                  {ingreso.tribunal || "—"}
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Materia: </span>
                  {ingreso.materia || "—"}
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Fecha causa: </span>
                  {formatDate(ingreso.fecha_causa)}
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">RIT: </span>
                  {ingreso.codigo_rit || "—"}
                  {ingreso.codigo_rit && detectTipoCausa(ingreso.codigo_rit) && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {detectTipoCausa(ingreso.codigo_rit)}
                    </Badge>
                  )}
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">RUC: </span>
                  {ingreso.codigo_ruc || "—"}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Editar antecedente de ingreso${ingreso.fecha_ingreso_residencia ? `: ${formatDate(ingreso.fecha_ingreso_residencia)}` : ""}`}
                onClick={startEdit}
              >
                <PencilIcon className="size-4" />
              </Button>
            </div>

            {causales === null || derechos === null ? (
              <div className="mt-3 py-2">
                <Spinner className="size-4" />
              </div>
            ) : (
              <div className="mt-3 border-t pt-3 space-y-4">
                <CausalesSection causales={causales} onAdd={handleCreateCausal} saving={causalSaving} />
                <DerechosSection derechos={derechos} onAdd={handleCreateDerecho} saving={derechoSaving} />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
