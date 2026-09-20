"use client";

import { useState, useEffect } from "react";
import { Link, useRouter } from "@/lib/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { api, type NNACreate, type SolicitanteIngreso } from "@/lib/api";
import { StepIndicator } from "./_components/step-indicator";
import { StepNNA } from "./_components/step-nna";
import { StepIngreso } from "./_components/step-ingreso";
import { StepDocs } from "./_components/step-docs";
import { StepHistorial } from "./_components/step-historial";
import { StepReview } from "./_components/step-review";
import { type WizardData, type StepIndex, emptyWizard, fmt } from "./_components/types";

export default function NuevoCasoPage() {
  const router = useRouter();
  const [step, setStep] = useState<StepIndex>(0);
  const [data, setData] = useState<WizardData>(emptyWizard);
  const [solicitantes, setSolicitantes] = useState<SolicitanteIngreso[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.solicitanteIngreso.list().then(setSolicitantes).catch(() => {});
  }, []);

  const goNext = () => setStep((s) => Math.min(s + 1, 4) as StepIndex);
  const goBack = () => setStep((s) => Math.max(s - 1, 0) as StepIndex);
  const goStep = (s: StepIndex) => setStep(s);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);

    try {
      // 1. Create NNA
      const nnaPayload: NNACreate = {};
      for (const [k, v] of Object.entries(data.nna)) {
        if (v) (nnaPayload as Record<string, string>)[k] = v;
      }
      if (data.nnaDate) nnaPayload.fecha_nacimiento = fmt(data.nnaDate);

      const nna = await api.nna.create(nnaPayload);
      const idNna = nna.id_nna;

      // 2. Create Ingreso (if any field filled)
      const ing = data.ingreso;
      if (ing.id_solicitante_ingreso || ing.fecha_ingreso_residencia || ing.causales.length > 0 || ing.derechos.length > 0) {
        const ingreso = await api.antecedenteIngreso.create(idNna, {
          fecha_ingreso_residencia: fmt(ing.fecha_ingreso_residencia),
          id_solicitante_ingreso: ing.id_solicitante_ingreso || null,
          orden_tribunal: ing.orden_tribunal,
          fecha_causa: fmt(ing.fecha_causa),
          tribunal: ing.tribunal || null,
          materia: ing.materia || null,
          codigo_rit: ing.codigo_rit || null,
          codigo_ruc: ing.codigo_ruc || null,
        });
        const idIngreso = ingreso.id_antecedente_ingreso;

        for (const c of ing.causales) {
          await api.causalIngreso.create(idIngreso, {
            nombre_causal: c.nombre_causal || null,
            descripcion_detallada: c.descripcion_detallada || null,
            estado: c.estado || null,
          });
        }
        for (const d of ing.derechos) {
          await api.derechoVulnerado.create(idIngreso, {
            nombre_derecho: d.nombre_derecho || null,
            estado: d.estado || null,
          });
        }
      }

      // 3. Create Documentación
      for (const doc of data.docs) {
        await api.documentacionIngreso.create(idNna, {
          tipo_documento: doc.tipo_documento || null,
          estado_recepcion: doc.estado_recepcion,
          fecha_recepcion: fmt(doc.fecha_recepcion),
          observacion: doc.observacion || null,
          url_documentacion_ingreso: doc.url_documentacion_ingreso || null,
        });
      }

      // 4. Create Historial Red Proteccional (mochila)
      for (const h of data.historial) {
        await api.historialRed.create(idNna, {
          nombre_programa: h.nombre_programa || null,
          fecha_ingreso: fmt(h.fecha_ingreso),
          fecha_egreso: fmt(h.fecha_egreso),
          motivo_egreso: h.motivo_egreso || null,
        });
      }

      router.push(`/nna/${idNna}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el caso");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-4">
        <Link href="/nna" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeftIcon /> Volver al listado
        </Link>
      </div>

      <h1 className="text-2xl font-semibold mb-6">Nuevo caso</h1>

      <StepIndicator current={step} onStep={goStep} />

      {step === 0 && <StepNNA data={data} onData={setData} onNext={goNext} />}
      {step === 1 && <StepIngreso data={data} onData={setData} onBack={goBack} onNext={goNext} solicitantes={solicitantes} />}
      {step === 2 && <StepDocs data={data} onData={setData} onBack={goBack} onNext={goNext} />}
      {step === 3 && <StepHistorial data={data} onData={setData} onBack={goBack} onNext={goNext} />}
      {step === 4 && <StepReview data={data} onBack={goBack} submitting={submitting} onSubmit={handleSubmit} error={error} solicitantes={solicitantes} />}
    </div>
  );
}
