"use client";

import { ArrowLeftIcon } from "lucide-react";
import type { SolicitanteIngreso } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { FieldError } from "@/components/ui/field";
import type { WizardData } from "./types";

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function StepReview({
  data,
  onBack,
  submitting,
  onSubmit,
  error,
  solicitantes,
}: {
  data: WizardData;
  onBack: () => void;
  submitting: boolean;
  onSubmit: () => void;
  error: string | null;
  solicitantes: SolicitanteIngreso[];
}) {
  const hasExtra =
    data.ingreso.id_solicitante_ingreso ||
    data.docs.length > 0 ||
    data.historial.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revisión del caso</CardTitle>
        <CardDescription>Verifica la información antes de crear el caso.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <section>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              NNA <Badge variant="outline">Requerido</Badge>
            </h4>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              <ReviewItem label="Nombre" value={data.nna.nombre || "—"} />
              <ReviewItem label="RUN" value={data.nna.run || "—"} />
              <ReviewItem label="Fecha nac." value={data.nnaDate?.toLocaleDateString("es-CL") || "—"} />
              <ReviewItem label="Sexo" value={data.nna.sexo || "—"} />
              <ReviewItem label="Nacionalidad" value={data.nna.nacionalidad || "—"} />
              <ReviewItem label="Etnia" value={data.nna.etnia_declarada || "—"} />
              <ReviewItem label="Comuna" value={data.nna.comuna || "—"} />
              <ReviewItem label="Región" value={data.nna.region || "—"} />
            </dl>
          </section>

          {data.ingreso.id_solicitante_ingreso && (
            <section>
              <h4 className="text-sm font-medium mb-2">Ingreso</h4>
              <p className="text-sm text-muted-foreground">
                {solicitantes.find((s) => s.id_solicitante_ingreso === data.ingreso.id_solicitante_ingreso)?.nombre || data.ingreso.id_solicitante_ingreso} — {data.ingreso.tribunal || "Sin tribunal"} — {data.ingreso.causales.length} causales, {data.ingreso.derechos.length} derechos
              </p>
            </section>
          )}

          {data.docs.length > 0 && (
            <section>
              <h4 className="text-sm font-medium mb-2">Documentación ({data.docs.length})</h4>
              <div className="flex flex-wrap gap-1">
                {data.docs.map((d, i) => <Badge key={i} variant="secondary">{d.tipo_documento || "Sin tipo"}</Badge>)}
              </div>
            </section>
          )}

          {data.historial.length > 0 && (
            <section>
              <h4 className="text-sm font-medium mb-2">Historial Red Proteccional ({data.historial.length})</h4>
              <div className="flex flex-wrap gap-1">
                {data.historial.map((h, i) => (
                  <Badge key={i} variant="secondary">
                    {h.nombre_programa || "Sin nombre"}{h.fecha_ingreso ? ` (desde ${h.fecha_ingreso.toLocaleDateString("es-CL")})` : ""}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {!hasExtra && <p className="text-sm text-muted-foreground italic">Solo se creará el registro del NNA. El resto de la información podrá agregarse desde la ficha.</p>}

          {error && <FieldError>{error}</FieldError>}

          <div className="flex items-center justify-between gap-3 pt-2 border-t">
            <Button variant="outline" onClick={onBack}><ArrowLeftIcon /> Anterior</Button>
            <Button onClick={onSubmit} disabled={submitting}>
              {submitting && <Spinner data-icon="inline-start" />}
              {submitting ? "Creando caso..." : "Crear caso"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
