"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CalendarIcon, PlusIcon, PencilIcon } from "lucide-react";
import { type AntecedenteFamiliar } from "@/lib/api";
import {
  useNNA,
  useAdultoList,
  useAntecedenteFamiliarList,
  useAntecedenteFamiliarCreate,
  useAntecedenteFamiliarUpdate,
  useEntornoFamiliarList,
  useEntornoFamiliarCreate,
} from "@/lib/queries";
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("es-CL");
}

export default function FamiliarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: nna, isLoading, error } = useNNA(id);
  const { data: items = [] } = useAntecedenteFamiliarList(id);
  const { data: adultos = [] } = useAdultoList();
  const createMut = useAntecedenteFamiliarCreate(id);
  const updateMut = useAntecedenteFamiliarUpdate();

  const [showForm, setShowForm] = useState(false);
  const [fecha, setFecha] = useState<Date | undefined>(undefined);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFecha, setEditFecha] = useState<Date | undefined>(undefined);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: entornos = [] } = useEntornoFamiliarList(expandedId || "");
  const entornoSave = useEntornoFamiliarCreate(expandedId || "");

  const [entornoForm, setEntornoForm] = useState({ id_adulto_significativo: "", parentesco: "", es_adulto_responsable: false });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {};
    if (fecha) payload.fecha_antecedente_familiar = fecha.toISOString().split("T")[0];
    await createMut.mutateAsync(payload);
    setFecha(undefined); setShowForm(false);
  };

  const startEdit = (item: AntecedenteFamiliar) => {
    setEditingId(item.id_antecedente_familiar);
    setEditFecha(item.fecha_antecedente_familiar ? new Date(item.fecha_antecedente_familiar + "T00:00:00") : undefined);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const payload: any = {};
    if (editFecha) payload.fecha_antecedente_familiar = editFecha.toISOString().split("T")[0];
    else payload.fecha_antecedente_familiar = null;
    await updateMut.mutateAsync({ id: editingId, data: payload });
    setEditingId(null);
  };

  const createEntorno = async () => {
    if (!expandedId) return;
    const payload: any = {};
    if (entornoForm.id_adulto_significativo) payload.id_adulto_significativo = entornoForm.id_adulto_significativo;
    if (entornoForm.parentesco) payload.parentesco = entornoForm.parentesco;
    payload.es_adulto_responsable = entornoForm.es_adulto_responsable;
    await entornoSave.mutateAsync(payload);
    setEntornoForm({ id_adulto_significativo: "", parentesco: "", es_adulto_responsable: false });
  };

  const getAdultoName = (idAdulto: string | null) => {
    if (!idAdulto) return "—";
    const a = adultos.find((x) => x.id_adulto_significativo === idAdulto);
    return a?.nombre || idAdulto.slice(0, 8);
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-[50vh]"><Spinner className="size-6" /></div>;
  if (error || !nna) return <div className="max-w-5xl mx-auto px-4 py-8"><p className="text-destructive">{error?.message || "NNA no encontrado"}</p></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="-ml-2 mb-4"><Link href={`/nna/${id}`}><ArrowLeftIcon /> Volver al resumen</Link></Button>
      <Card className="mb-4"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{nna.nombre}</CardTitle></CardHeader></Card>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Antecedentes Familiares</h2>
        {!showForm && <Button size="sm" onClick={() => setShowForm(true)}><PlusIcon /> Nuevo antecedente</Button>}
      </div>

      {showForm && (
        <Card className="mb-6 border-primary/30">
          <CardHeader className="pb-2"><CardTitle className="text-base">Nuevo antecedente familiar</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><Label className="text-xs">Fecha</Label><Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !fecha && "text-muted-foreground")}><CalendarIcon />{fecha ? fecha.toLocaleDateString("es-CL") : "Seleccionar"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={fecha} onSelect={setFecha} /></PopoverContent></Popover></div>
              {createMut.isError && <p className="text-destructive text-sm">{createMut.error.message}</p>}
              <div className="flex gap-2"><Button type="submit" size="sm" disabled={createMut.isPending}>{createMut.isPending ? "Guardando..." : "Guardar"}</Button><Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      {items.length === 0 ? (
        <Empty><p className="text-sm text-muted-foreground">Sin antecedentes familiares.</p></Empty>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id_antecedente_familiar}>
              <CardContent className="pt-4">
                {editingId === item.id_antecedente_familiar ? (
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <div><Label className="text-xs">Fecha</Label><Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !editFecha && "text-muted-foreground")}><CalendarIcon />{editFecha ? editFecha.toLocaleDateString("es-CL") : "Seleccionar"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={editFecha} onSelect={setEditFecha} /></PopoverContent></Popover></div>
                    {updateMut.isError && <p className="text-destructive text-sm">{updateMut.error.message}</p>}
                    <div className="flex gap-2"><Button type="submit" size="sm" disabled={updateMut.isPending}>{updateMut.isPending ? "Guardando..." : "Guardar"}</Button><Button type="button" variant="outline" size="sm" onClick={() => setEditingId(null)}>Cancelar</Button></div>
                  </form>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="text-sm"><span className="text-xs text-muted-foreground">Fecha: </span>{formatDate(item.fecha_antecedente_familiar)}</div>
                    <Button variant="ghost" size="icon" onClick={() => startEdit(item)}><PencilIcon className="size-4" /></Button>
                  </div>
                )}

                <div className="mt-3 border-t pt-3">
                  {expandedId === item.id_antecedente_familiar ? (
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-muted-foreground">Entorno Familiar ({entornos.length})</h4>
                      {entornos.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Sin vínculos registrados.</p>
                      ) : (
                        <ul className="space-y-1 mb-3">
                          {entornos.map((e) => (
                            <li key={e.id_entorno_familiar} className="text-sm flex items-center gap-2 flex-wrap">
                              <span>{getAdultoName(e.id_adulto_significativo)}</span>
                              <span className="text-muted-foreground">· {e.parentesco || "—"}</span>
                              {e.es_adulto_responsable && <Badge variant="secondary" className="text-xs">Responsable</Badge>}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Select value={entornoForm.id_adulto_significativo} onValueChange={(v) => setEntornoForm((p) => ({ ...p, id_adulto_significativo: v }))}><SelectTrigger className="h-7 text-xs w-40"><SelectValue placeholder="Adulto" /></SelectTrigger><SelectContent><SelectGroup>{adultos.map((a) => (<SelectItem key={a.id_adulto_significativo} value={a.id_adulto_significativo}>{a.nombre || a.id_adulto_significativo.slice(0, 8)}</SelectItem>))}</SelectGroup></SelectContent></Select>
                        <Input className="h-7 text-xs w-28" value={entornoForm.parentesco} onChange={(e) => setEntornoForm((p) => ({ ...p, parentesco: e.target.value }))} placeholder="Parentesco" />
                        <div className="flex items-center gap-1"><Checkbox id={`resp-${item.id_antecedente_familiar}`} checked={entornoForm.es_adulto_responsable} onCheckedChange={(v) => setEntornoForm((p) => ({ ...p, es_adulto_responsable: !!v }))} /><Label htmlFor={`resp-${item.id_antecedente_familiar}`} className="text-xs">Resp.</Label></div>
                        <Button size="sm" className="h-7 text-xs" onClick={createEntorno} disabled={entornoSave.isPending}>+</Button>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setExpandedId(null)}>Ocultar</Button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setExpandedId(item.id_antecedente_familiar)}>Entorno Familiar</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
