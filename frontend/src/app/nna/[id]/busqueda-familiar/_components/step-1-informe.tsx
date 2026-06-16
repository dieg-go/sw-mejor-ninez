"use client";

import { useState } from "react";
import { FileTextIcon, ClockIcon, CheckCircle2Icon, ChevronRightIcon } from "lucide-react";
import { type ProcesoDespejeFamiliar } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "./utils";
import { DatePicker } from "./date-picker";

interface Step1InformeProps {
  despeje: ProcesoDespejeFamiliar | null;
  saving: boolean;
  error: string | null;
  onRegistrarSolicitud: (fecha: string) => void;
  onRegistrarRecepcion: (fecha: string, url: string) => void;
  onIrPaso2: () => void;
}

export function Step1Informe({
  despeje,
  saving,
  error,
  onRegistrarSolicitud,
  onRegistrarRecepcion,
  onIrPaso2,
}: Step1InformeProps) {
  const [solicitudFecha, setSolicitudFecha] = useState<Date | undefined>(undefined);
  const [recepcionFecha, setRecepcionFecha] = useState<Date | undefined>(undefined);
  const [informeUrl, setInformeUrl] = useState("");

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2 text-primary">
          <FileTextIcon className="size-5" />
          <CardTitle>Paso 1: Solicitud e Informe del Registro Civil</CardTitle>
        </div>
        <CardDescription>
          Para iniciar los plazos de búsqueda, el tribunal debe ordenar al Registro Civil la emisión del informe de filiación de 3 generaciones.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!despeje ? (
          <div className="bg-muted/50 rounded-lg p-6 space-y-4 max-w-md mx-auto border">
            <div className="space-y-2 text-center">
              <h3 className="font-semibold text-sm">Registrar Solicitud en el Tribunal</h3>
              <p className="text-xs text-muted-foreground">Indica la fecha en que el juez ordenó emitir el árbol genealógico.</p>
            </div>
            <div className="space-y-3">
              <DatePicker value={solicitudFecha} onChange={setSolicitudFecha} label="Fecha de Orden de Tribunal" />
              <Button
                className="w-full"
                disabled={!solicitudFecha || saving}
                onClick={() => solicitudFecha && onRegistrarSolicitud(solicitudFecha.toISOString().split("T")[0])}
              >
                {saving ? "Procesando..." : "Confirmar Solicitud de Informe"}
              </Button>
            </div>
          </div>
        ) : !despeje.fecha_recepcion_informe ? (
          <div className="space-y-6">
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
              <ClockIcon className="size-4 shrink-0" />
              <span>Solicitud registrada el <strong>{formatDate(despeje.fecha_solicitud_informe)}</strong>. Esperando la llegada del documento del Registro Civil.</span>
            </div>
            <div className="bg-muted/50 rounded-lg p-6 space-y-4 max-w-md mx-auto border">
              <div className="space-y-2 text-center">
                <h3 className="font-semibold text-sm">Registrar Recepción de Informe</h3>
                <p className="text-xs text-muted-foreground">Completa estos datos una vez que el documento del Registro Civil esté en tu poder.</p>
              </div>
              <div className="space-y-4">
                <DatePicker value={recepcionFecha} onChange={setRecepcionFecha} label="Fecha de Recepción del Documento" />
                <div className="space-y-1.5">
                  <Label className="text-xs">Ruta / URL del documento PDF</Label>
                  <Input value={informeUrl} onChange={(e) => setInformeUrl(e.target.value)} placeholder="Ej: /documentos/informe-hijo-123.pdf" />
                </div>
                <Button
                  className="w-full"
                  disabled={!recepcionFecha || saving}
                  onClick={() => recepcionFecha && onRegistrarRecepcion(recepcionFecha.toISOString().split("T")[0], informeUrl)}
                >
                  {saving ? "Guardando..." : "Confirmar Recepción e Informe de Hijo"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              <CheckCircle2Icon className="size-4 shrink-0" />
              <span>Árbol genealógico recibido e ingresado correctamente.</span>
            </div>
            <div className="grid grid-cols-2 gap-4 border rounded-lg p-4 bg-muted/10">
              <div>
                <span className="text-xs text-muted-foreground block">Fecha Solicitud:</span>
                <strong className="text-sm">{formatDate(despeje.fecha_solicitud_informe)}</strong>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Fecha Recepción:</span>
                <strong className="text-sm">{formatDate(despeje.fecha_recepcion_informe)}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-muted-foreground block">Enlace al Documento:</span>
                <span className="text-sm font-mono text-primary break-all">{despeje.url_informe_hijo || "—"}</span>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={onIrPaso2} className="gap-2">
                Ir al Paso 2: Identificar Familia <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          </div>
        )}
        {error && <p className="text-sm text-destructive text-center">{error}</p>}
      </CardContent>
    </Card>
  );
}
