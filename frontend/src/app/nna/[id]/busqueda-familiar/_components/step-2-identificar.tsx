"use client";

import { useId, useState } from "react";
import { UserPlusIcon, ChevronRightIcon } from "lucide-react";
import { type Familiar, type NotificacionFamiliar } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CrearFamiliarDialog } from "./crear-familiar-dialog";

interface Step2IdentificarProps {
  nnaId: string;
  notificaciones: NotificacionFamiliar[];
  familiaresDisponibles: Familiar[];
  getFamiliarNombre: (idFamiliar: string) => string;
  saving: boolean;
  onAsociarExistente: (familiarId: string) => void;
  onCrearYAsociar: (familiar: Familiar, parentesco: string) => void;
  onFinalizar: () => void;
  onVolver: () => void;
}

export function Step2Identificar({
  nnaId,
  notificaciones,
  familiaresDisponibles,
  getFamiliarNombre,
  saving,
  onAsociarExistente,
  onCrearYAsociar,
  onFinalizar,
  onVolver,
}: Step2IdentificarProps) {
  const [selectedFamiliarId, setSelectedFamiliarId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  // El disparador del select es el control etiquetable; el `id` va ahi.
  const selectId = useId();

  return (
    <>
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2 text-primary">
          <UserPlusIcon className="size-5" />
          <CardTitle>Paso 2: Identificar Familiares del Árbol Genealógico</CardTitle>
        </div>
        <CardDescription>
          Mapea e ingresa al sistema los tíos, abuelos o primos identificados en el árbol genealógico que califiquen para ser notificados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border rounded-lg p-4 bg-muted/20 space-y-4">
            <h3 className="font-semibold text-sm">Asociar o Registrar Familiar</h3>
            <Tabs defaultValue="existente" className="w-full">
              <TabsList className="grid grid-cols-2 w-full mb-4">
                <TabsTrigger value="existente">Maestro Existente</TabsTrigger>
                <TabsTrigger value="crear">Crear Nuevo</TabsTrigger>
              </TabsList>

              <TabsContent value="existente" className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor={selectId} className="text-xs">Selecciona el Familiar</Label>
                  <Select value={selectedFamiliarId} onValueChange={setSelectedFamiliarId}>
                    <SelectTrigger id={selectId}>
                      <SelectValue placeholder="Buscar en el sistema..." />
                    </SelectTrigger>
                    <SelectContent>
                      {familiaresDisponibles.map((f) => (
                        <SelectItem key={f.id_familiar} value={f.id_familiar}>
                          {f.nombre} {f.run ? `(${f.run})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" disabled={!selectedFamiliarId || saving} onClick={() => onAsociarExistente(selectedFamiliarId)}>
                  Asociar Familiar Seleccionado
                </Button>
              </TabsContent>

              <TabsContent value="crear" className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Crea un nuevo familiar con todos sus datos y asócialo a esta búsqueda familiar.
                </p>
                <Button className="w-full" variant="outline" onClick={() => setDialogOpen(true)}>
                  Abrir formulario de creación
                </Button>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Familiares en este proceso ({notificaciones.length})</h3>
            {notificaciones.length === 0 ? (
              <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground text-xs">
                Ningún familiar asociado aún. Agrega al menos uno para iniciar las cartas certificadas.
              </div>
            ) : (
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {notificaciones.map((n) => (
                  <div key={n.id_notificacion} className="flex items-center justify-between border p-3 rounded-lg bg-background text-sm">
                    <div>
                      <p className="font-medium">{getFamiliarNombre(n.id_familiar)}</p>
                      <span className="text-xs text-muted-foreground">{n.observacion || "Familiar del árbol"}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">Pendiente Carta 1</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between border-t pt-4">
          <Button variant="outline" onClick={onVolver}>Volver al Paso 1</Button>
          <Button disabled={notificaciones.length === 0} onClick={onFinalizar} className="gap-2">
            Comenzar Ronda de Notificaciones <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>

    <CrearFamiliarDialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      nnaId={nnaId}
      onCreated={onCrearYAsociar}
    />
    </>
  );
}
