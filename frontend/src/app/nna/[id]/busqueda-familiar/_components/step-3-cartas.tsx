"use client";

import { MailOpenIcon, PlusIcon } from "lucide-react";
import { type NotificacionFamiliar } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FamiliarCard } from "./familiar-card";

interface Step3CartasProps {
  nnaId: string;
  notificaciones: NotificacionFamiliar[];
  getFamiliarNombre: (idFamiliar: string) => string;
  onUpdateCarta: (idNotif: string, payload: Partial<NotificacionFamiliar>) => void;
  onVolver: () => void;
  onAgregarFamiliar: () => void;
}

export function Step3Cartas({
  nnaId,
  notificaciones,
  getFamiliarNombre,
  onUpdateCarta,
  onVolver,
  onAgregarFamiliar,
}: Step3CartasProps) {
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2 text-primary">
          <MailOpenIcon className="size-5" />
          <CardTitle>Paso 3: Notificaciones y Evaluaciones Clínicas</CardTitle>
        </div>
        <CardDescription>
          Seguimiento personalizado por familiar. El sistema calcula automáticamente las alertas de plazos legales (30 y 15 días) para guiarte en el envío de la segunda carta o el cierre del proceso.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-muted-foreground">Familiares Notificados: {notificaciones.length}</span>
          <Button variant="outline" size="sm" onClick={onAgregarFamiliar} className="text-xs h-8">
            <PlusIcon className="size-3.5 mr-1" /> Agregar otro familiar al despeje
          </Button>
        </div>

        <div className="space-y-4">
          {notificaciones.map((n) => (
            <FamiliarCard
              key={n.id_notificacion}
              notif={n}
              nnaId={nnaId}
              nombreFamiliar={getFamiliarNombre(n.id_familiar)}
              onUpdate={(payload) => onUpdateCarta(n.id_notificacion, payload)}
            />
          ))}
        </div>

        <div className="flex justify-between border-t pt-4">
          <Button variant="outline" onClick={onVolver}>Volver al Paso 2</Button>
        </div>
      </CardContent>
    </Card>
  );
}
