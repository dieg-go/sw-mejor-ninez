"use client";

import { use, useEffect, useState } from "react";
import { Link } from "@/lib/navigation";
import { ArrowLeftIcon, CalendarIcon, PencilIcon } from "lucide-react";
import { api, type Familiar, type NCFASEvaluacion } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Empty } from "@/components/ui/empty";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

function formatDate(iso: string | null) {
  if (!iso) return "\u2014";
  return new Date(iso + "T00:00:00").toLocaleDateString("es-CL");
}

export default function NCFASPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [familiar, setFamiliar] = useState<Familiar | null>(null);
  const [items, setItems] = useState<NCFASEvaluacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NCFASEvaluacion | undefined>(undefined);
  const [editEstado, setEditEstado] = useState("");
  const [editEsReunificacion, setEditEsReunificacion] = useState(false);
  const [editObservacion, setEditObservacion] = useState("");
  const [editFechaApertura, setEditFechaApertura] = useState<Date | undefined>(undefined);
  const [editFechaCierre, setEditFechaCierre] = useState<Date | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [familiarData, list] = await Promise.all([
          api.familiares.get(id),
          api.ncfas.listByFamiliar(id),
        ]);
        if (!cancelled) {
          setFamiliar(familiarData);
          setItems(list);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error inesperado");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const openEdit = (item: NCFASEvaluacion) => {
    setEditingItem(item);
    setEditEstado(item.estado || "");
    setEditEsReunificacion(item.es_reunificacion);
    setEditObservacion(item.observacion_general || "");
    setEditFechaApertura(item.fecha_apertura ? new Date(item.fecha_apertura + "T00:00:00") : undefined);
    setEditFechaCierre(item.fecha_cierre ? new Date(item.fecha_cierre + "T00:00:00") : undefined);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setFormError(null); setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (editEstado) payload.estado = editEstado;
      else payload.estado = null;
      payload.es_reunificacion = editEsReunificacion;
      if (editObservacion) payload.observacion_general = editObservacion;
      else payload.observacion_general = null;
      if (editFechaApertura) payload.fecha_apertura = editFechaApertura.toISOString().split("T")[0];
      else payload.fecha_apertura = null;
      if (editFechaCierre) payload.fecha_cierre = editFechaCierre.toISOString().split("T")[0];
      else payload.fecha_cierre = null;
      const updated = await api.ncfas.update(editingItem.id_ncfas, payload);
      setItems((prev) => prev.map((i) => (i.id_ncfas === editingItem.id_ncfas ? updated : i)));
      setDialogOpen(false);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><Spinner className="size-6" /></div>;
  if (error || !familiar) return <div className="max-w-5xl mx-auto px-4 py-8"><p className="text-destructive">{error || "Familiar no encontrado"}</p></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="-ml-2 mb-4"><Link href={`/familiar/${id}`}><ArrowLeftIcon /> Volver al resumen</Link></Button>
      <Card className="mb-4"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{familiar.nombre}</CardTitle></CardHeader></Card>

      <h2 className="text-lg font-semibold mb-3">NCFAS</h2>

      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground">{items.length} registro{items.length !== 1 ? "s" : ""}</span>
      </div>

      {items.length === 0 ? (
        <Empty><p className="text-sm text-muted-foreground">Sin registros de NCFAS.</p></Empty>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id_ncfas}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    <div><span className="text-xs text-muted-foreground">Estado: </span><Badge variant="outline">{item.estado || "Pendiente"}</Badge></div>
                    <div><span className="text-xs text-muted-foreground">Reunificación: </span>{item.es_reunificacion ? "Sí" : "No"}</div>
                    <div><span className="text-xs text-muted-foreground">Apertura: </span>{formatDate(item.fecha_apertura)}</div>
                    <div><span className="text-xs text-muted-foreground">Cierre: </span>{formatDate(item.fecha_cierre)}</div>
                    {item.observacion_general && <div className="col-span-2"><span className="text-xs text-muted-foreground">Obs: </span>{item.observacion_general}</div>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><PencilIcon className="size-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar NCFAS</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label className="text-xs">Estado</Label>
              <Select value={editEstado} onValueChange={setEditEstado}>
                <SelectTrigger className="mt-1 w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                    <SelectItem value="En proceso">En proceso</SelectItem>
                    <SelectItem value="Completado">Completado</SelectItem>
                    <SelectItem value="Cerrado">Cerrado</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="es-reunif" checked={editEsReunificacion} onCheckedChange={(v) => setEditEsReunificacion(!!v)} />
              <Label htmlFor="es-reunif" className="text-xs cursor-pointer">Es reunificación</Label>
            </div>
            <div>
              <Label className="text-xs">Fecha apertura</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !editFechaApertura && "text-muted-foreground")}><CalendarIcon />{editFechaApertura ? editFechaApertura.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={editFechaApertura} onSelect={setEditFechaApertura} /></PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-xs">Fecha cierre</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !editFechaCierre && "text-muted-foreground")}><CalendarIcon />{editFechaCierre ? editFechaCierre.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={editFechaCierre} onSelect={setEditFechaCierre} /></PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-xs">Observación general</Label>
              <Input className="mt-1" value={editObservacion} onChange={(e) => setEditObservacion(e.target.value)} placeholder="Observaciones" />
            </div>
            {formError && <p className="text-destructive text-sm">{formError}</p>}
            <DialogFooter>
              <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
