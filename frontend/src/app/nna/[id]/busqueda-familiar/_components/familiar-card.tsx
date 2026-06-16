"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangleIcon,
  ClockIcon,
  UserCheckIcon,
} from "lucide-react";
import { type NotificacionFamiliar } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatDate, diasDesde, RESULTADOS_CONTACTO } from "./utils";
import { DatePicker } from "./date-picker";

function RespuestaForm({
  resultado,
  setResultado,
  observacion,
  setObservacion,
  onCancel,
  onSave,
  loading,
}: {
  resultado: string;
  setResultado: (v: string) => void;
  observacion: string;
  setObservacion: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
  loading: boolean;
}) {
  return (
    <div className="bg-muted/10 p-4 rounded-lg border space-y-3">
      <h5 className="font-semibold text-xs text-primary">Registrar Respuesta del Familiar</h5>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Resultado del Contacto</Label>
          <Select value={resultado} onValueChange={setResultado}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el resultado" />
            </SelectTrigger>
            <SelectContent>
              {RESULTADOS_CONTACTO.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Observación / Detalle</Label>
          <Input value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Ej: Indicar si asiste el lunes" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" onClick={onSave} disabled={!resultado || loading}>
          {loading ? "..." : "Guardar Respuesta"}
        </Button>
      </div>
    </div>
  );
}

export function FamiliarCard({
  notif,
  nnaId,
  nombreFamiliar,
  onUpdate,
}: {
  notif: NotificacionFamiliar;
  nnaId: string;
  nombreFamiliar: string;
  onUpdate: (payload: Partial<NotificacionFamiliar>) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState<"carta1" | "carta2" | "respuesta" | null>(null);

  const [fechaCarta, setFechaCarta] = useState<Date | undefined>(new Date());
  const [codigo, setCodigo] = useState("");
  const [resultado, setResultado] = useState<string>("");
  const [observacion, setObservacion] = useState("");

  const dias1 = diasDesde(notif.fecha_envio_carta_1);
  const dias2 = diasDesde(notif.fecha_envio_carta_2);

  let etapa: "carta1" | "espera1" | "espera2" | "finalizado" = "carta1";
  if (notif.resultado_contacto) {
    etapa = "finalizado";
  } else if (notif.fecha_envio_carta_2) {
    etapa = "espera2";
  } else if (notif.fecha_envio_carta_1) {
    etapa = "espera1";
  }

  const handleSaveCarta1 = async () => {
    if (!fechaCarta) return;
    setLoading(true);
    await onUpdate({
      fecha_envio_carta_1: fechaCarta.toISOString().split("T")[0],
      codigo_seguimiento_1: codigo,
      estado_entrega_1: "En tránsito",
    });
    setLoading(false);
    setEditMode(null);
  };

  const handleSaveCarta2 = async () => {
    if (!fechaCarta) return;
    setLoading(true);
    await onUpdate({
      fecha_envio_carta_2: fechaCarta.toISOString().split("T")[0],
      codigo_seguimiento_2: codigo,
      estado_entrega_2: "En tránsito",
    });
    setLoading(false);
    setEditMode(null);
  };

  const handleSaveRespuesta = async () => {
    if (!resultado) return;
    setLoading(true);
    await onUpdate({
      resultado_contacto: resultado,
      fecha_respuesta: new Date().toISOString().split("T")[0],
      observacion: observacion,
    });
    setLoading(false);
    setEditMode(null);
  };

  const handleCerrarNoResponde = async () => {
    setLoading(true);
    await onUpdate({
      resultado_contacto: "No responde",
      fecha_respuesta: new Date().toISOString().split("T")[0],
    });
    setLoading(false);
  };

  return (
    <div className="border rounded-xl p-4 bg-background shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b pb-2">
        <div>
          <h4 className="font-semibold text-base">{nombreFamiliar}</h4>
          <span className="text-xs text-muted-foreground">Seguimiento de Despeje Familiar</span>
        </div>
        <div>
          {etapa === "carta1" && <Badge variant="secondary">Pendiente Carta 1</Badge>}
          {etapa === "espera1" && dias1 !== null && dias1 < 30 && <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50/50">Espera Carta 1 (Día {dias1}/30)</Badge>}
          {etapa === "espera1" && dias1 !== null && dias1 >= 30 && <Badge variant="outline" className="border-orange-400 text-orange-700 bg-orange-50 animate-pulse">⚠️ Plazo Carta 1 Cumplido ({dias1} días)</Badge>}
          {etapa === "espera2" && dias2 !== null && dias2 < 15 && <Badge variant="outline" className="border-blue-400 text-blue-700 bg-blue-50">Espera Carta 2 (Día {dias2}/15)</Badge>}
          {etapa === "espera2" && dias2 !== null && dias2 >= 15 && <Badge variant="destructive" className="animate-pulse">🚨 Plazo Carta 2 Vencido ({dias2} días)</Badge>}
          {etapa === "finalizado" && <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700">{notif.resultado_contacto}</Badge>}
        </div>
      </div>

      <div className="text-sm">
        {etapa === "carta1" && (
          <div className="space-y-3">
            {editMode !== "carta1" ? (
              <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg border border-dashed">
                <span className="text-xs text-muted-foreground">La primera carta de notificación formal aún no ha sido registrada.</span>
                <Button size="sm" onClick={() => { setEditMode("carta1"); setFechaCarta(new Date()); setCodigo(""); }}>
                  Registrar Envío Carta 1
                </Button>
              </div>
            ) : (
              <div className="bg-muted/10 p-4 rounded-lg border space-y-3">
                <h5 className="font-semibold text-xs text-primary">Registrar Envío de Carta Ronda 1</h5>
                <div className="grid grid-cols-2 gap-3">
                  <DatePicker value={fechaCarta} onChange={setFechaCarta} label="Fecha de Envío" />
                  <div className="space-y-1.5">
                    <Label className="text-xs">Código de Seguimiento (Correos)</Label>
                    <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ej: CP-1234567-CL" />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => setEditMode(null)}>Cancelar</Button>
                  <Button size="sm" onClick={handleSaveCarta1} disabled={!fechaCarta || loading}>
                    {loading ? "..." : "Guardar Carta 1"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {etapa === "espera1" && dias1 !== null && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 bg-muted/10 p-3 rounded-lg text-xs">
              <div>
                <span className="text-muted-foreground block">Fecha Envío Carta 1:</span>
                <strong>{formatDate(notif.fecha_envio_carta_1)}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block">Código Seguimiento:</span>
                <span className="font-mono">{notif.codigo_seguimiento_1 || "Sin código"}</span>
              </div>
            </div>

            {editMode === null ? (
              <div className="space-y-3">
                {dias1 < 30 ? (
                  <p className="text-xs text-muted-foreground">
                    Esperando transcurso legal de 30 días o respuesta del familiar. Llevamos <strong>{dias1} días</strong> de espera.
                  </p>
                ) : (
                  <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded-lg text-xs">
                    <ClockIcon className="size-4 shrink-0" />
                    <span>Se cumplió el plazo legal de 30 días sin respuesta. Es necesario registrar el envío de la segunda carta certificada.</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditMode("carta2"); setFechaCarta(new Date()); setCodigo(""); }}>
                    Registrar Envío Carta 2
                  </Button>
                  <Button size="sm" onClick={() => { setEditMode("respuesta"); setResultado(""); }}>
                    Familiar Respondió / Asistió
                  </Button>
                </div>
              </div>
            ) : editMode === "carta2" ? (
              <div className="bg-muted/10 p-4 rounded-lg border space-y-3">
                <h5 className="font-semibold text-xs text-primary">Registrar Envío de Carta Ronda 2 (30 días cumplidos)</h5>
                <div className="grid grid-cols-2 gap-3">
                  <DatePicker value={fechaCarta} onChange={setFechaCarta} label="Fecha de Envío" />
                  <div className="space-y-1.5">
                    <Label className="text-xs">Código de Seguimiento (Correos)</Label>
                    <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ej: CP-9876543-CL" />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => setEditMode(null)}>Cancelar</Button>
                  <Button size="sm" onClick={handleSaveCarta2} disabled={!fechaCarta || loading}>
                    {loading ? "..." : "Guardar Carta 2"}
                  </Button>
                </div>
              </div>
            ) : (
              <RespuestaForm
                resultado={resultado}
                setResultado={setResultado}
                observacion={observacion}
                setObservacion={setObservacion}
                onCancel={() => setEditMode(null)}
                onSave={handleSaveRespuesta}
                loading={loading}
              />
            )}
          </div>
        )}

        {etapa === "espera2" && dias2 !== null && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-muted/10 p-3 rounded-lg text-xs">
              <div>
                <span className="text-muted-foreground block">Carta 1:</span>
                <strong>{formatDate(notif.fecha_envio_carta_1)}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block">Carta 2:</span>
                <strong>{formatDate(notif.fecha_envio_carta_2)}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground block">Seguimiento Carta 2:</span>
                <span className="font-mono">{notif.codigo_seguimiento_2 || "Sin código"}</span>
              </div>
            </div>

            {editMode === null ? (
              <div className="space-y-3">
                {dias2 < 15 ? (
                  <p className="text-xs text-muted-foreground">
                    Esperando transcurso legal de 15 días o respuesta de la segunda carta. Llevamos <strong>{dias2} días</strong> de espera.
                  </p>
                ) : (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-xs">
                    <AlertTriangleIcon className="size-4 shrink-0 text-red-600" />
                    <span>Se cumplió el plazo legal de 15 días tras el envío de la segunda carta sin obtener respuesta. El proceso ya puede cerrarse formalmente.</span>
                  </div>
                )}

                <div className="flex gap-2">
                  {dias2 >= 15 && (
                    <Button size="sm" variant="destructive" onClick={handleCerrarNoResponde} disabled={loading}>
                      {loading ? "..." : "Cerrar como 'No responde'"}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => { setEditMode("respuesta"); setResultado(""); }}>
                    Familiar Respondió / Asistió
                  </Button>
                </div>
              </div>
            ) : (
              <RespuestaForm
                resultado={resultado}
                setResultado={setResultado}
                observacion={observacion}
                setObservacion={setObservacion}
                onCancel={() => setEditMode(null)}
                onSave={handleSaveRespuesta}
                loading={loading}
              />
            )}
          </div>
        )}

        {etapa === "finalizado" && (
          <div className="space-y-3">
            <div className="bg-muted/30 p-3 rounded-lg border flex items-center justify-between text-xs">
              <div>
                <span className="text-muted-foreground block">Fecha de resolución:</span>
                <strong>{formatDate(notif.fecha_respuesta)}</strong>
                {notif.observacion && <p className="mt-1 text-muted-foreground italic">&ldquo;{notif.observacion}&rdquo;</p>}
              </div>
              <Badge variant="outline" className={cn(
                notif.resultado_contacto === "Acepta evaluación" && "border-green-400 bg-green-50 text-green-700 font-semibold"
              )}>
                {notif.resultado_contacto}
              </Badge>
            </div>

            {notif.resultado_contacto === "Acepta evaluación" && (
              <div className="bg-green-50/50 border border-green-200 p-4 rounded-lg space-y-3">
                <div className="flex items-center gap-1.5 text-xs text-green-800 font-semibold">
                  <UserCheckIcon className="size-4 text-green-700" />
                  <span>El familiar aceptó evaluarse. Selecciona el test clínico para comenzar en el sistema:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" asChild className="h-8 text-xs border-green-300 text-green-800 hover:bg-green-50">
                    <Link href={`/nna/${nnaId}/e2p?familiar=${notif.id_familiar}`}>
                      Test de Crianza (E2P)
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild className="h-8 text-xs border-blue-300 text-blue-800 hover:bg-blue-50">
                    <Link href={`/nna/${nnaId}/pmf?familiar=${notif.id_familiar}`}>
                      Mapa Competencias (PMF)
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild className="h-8 text-xs border-purple-300 text-purple-800 hover:bg-purple-50">
                    <Link href={`/nna/${nnaId}/ncfas?familiar=${notif.id_familiar}`}>
                      Test Familiar (NCFAS)
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
