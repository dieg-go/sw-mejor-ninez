"use client";

import { use, useEffect, useState } from "react";
import { PlusIcon } from "lucide-react";
import { api, type NNA, type AntecedenteIngreso, type SolicitanteIngreso } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Empty } from "@/components/ui/empty";
import { IngresoHeader } from "./_components/ingreso-header";
import { IngresoFormFields, type IngresoFormData } from "./_components/ingreso-form-fields";
import { IngresoCard } from "./_components/ingreso-card";

const DEFAULT_INGRESO: IngresoFormData = {
  fecha_ingreso_residencia: "",
  id_solicitante_ingreso: "",
  orden_tribunal: false,
  fecha_causa: "",
  tribunal: "",
  materia: "",
  codigo_rit: "",
  codigo_ruc: "",
};

export default function IngresoPage({
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
  const [ingresos, setIngresos] = useState<AntecedenteIngreso[]>([]);
  const [solicitantes, setSolicitantes] = useState<SolicitanteIngreso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClosed, setIsClosed] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<IngresoFormData>(DEFAULT_INGRESO);
  const [fechaIngreso, setFechaIngreso] = useState<Date | undefined>(undefined);
  const [fechaCausa, setFechaCausa] = useState<Date | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [nnaData, list, sols] = await Promise.all([
          api.nna.get(id),
          api.antecedenteIngreso.list(id, idCaso),
          api.solicitanteIngreso.list().catch(() => [] as SolicitanteIngreso[]),
        ]);
        setNna(nnaData);
        setIngresos(list);
        setSolicitantes(sols);
        if (idCaso) setIsClosed((await api.casos.get(idCaso)).estado === "Cerrado");
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, idCaso]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setSaving(true);
    try {
      const payload: any = {};
      for (const [k, v] of Object.entries(form)) {
        if (k === "orden_tribunal") { payload[k] = v; continue; }
        if (v) payload[k] = v;
      }
      if (fechaIngreso) payload.fecha_ingreso_residencia = fechaIngreso.toISOString().split("T")[0];
      if (fechaCausa) payload.fecha_causa = fechaCausa.toISOString().split("T")[0];
      const created = await api.antecedenteIngreso.create(id, payload);
      setIngresos((prev) => [...prev, created]);
      setForm(DEFAULT_INGRESO);
      setFechaIngreso(undefined);
      setFechaCausa(undefined);
      setCreateOpen(false);
    } catch (e: any) {
      setCreateError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = (updated: AntecedenteIngreso) => {
    setIngresos((prev) =>
      prev.map((i) => (i.id_antecedente_ingreso === updated.id_antecedente_ingreso ? updated : i))
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (error || !nna) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-destructive">{error || "NNA no encontrado"}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <IngresoHeader nnaId={id} nnaName={nna.nombre} idCaso={idCaso} />

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Antecedentes de Ingreso</h2>
        {!createOpen && !isClosed && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <PlusIcon /> Nuevo ingreso
          </Button>
        )}
      </div>

      {createOpen && (
        <Card className="mb-6 border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Nuevo antecedente de ingreso</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <IngresoFormFields
                form={form}
                setForm={setForm}
                fechaIngreso={fechaIngreso}
                setFechaIngreso={setFechaIngreso}
                fechaCausa={fechaCausa}
                setFechaCausa={setFechaCausa}
                solicitantes={solicitantes}
                idPrefix="create"
              />
              {createError && <p className="text-destructive text-sm">{createError}</p>}
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? "Guardando..." : "Guardar"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {ingresos.length === 0 ? (
        <Empty>
          <p className="text-sm text-muted-foreground">Sin antecedentes de ingreso.</p>
        </Empty>
      ) : (
        <div className="space-y-4">
          {ingresos.map((ingreso) => (
            <IngresoCard
              key={ingreso.id_antecedente_ingreso}
              ingreso={ingreso}
              solicitantes={solicitantes}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
