"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CalendarIcon, PlusIcon, PencilIcon } from "lucide-react";
import { type AntecedenteIngreso } from "@/lib/api";
import {
  useNNA,
  useAntecedenteIngresoList,
  useAntecedenteIngresoCreate,
  useAntecedenteIngresoUpdate,
  useCausalIngresoList,
  useCausalIngresoCreate,
  useDerechoVulneradoList,
  useDerechoVulneradoCreate,
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

const DEFAULT_INGRESO = { fecha_ingreso_residencia: "", quien_solicita_ingreso: "", orden_tribunal: false, fecha_causa: "", tribunal: "", materia: "", codigo_rit: "", codigo_ruc: "" };

export default function IngresoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: nna, isLoading, error } = useNNA(id);
  const { data: ingresos = [] } = useAntecedenteIngresoList(id);
  const createMut = useAntecedenteIngresoCreate(id);
  const updateMut = useAntecedenteIngresoUpdate();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(DEFAULT_INGRESO);
  const [fechaIngreso, setFechaIngreso] = useState<Date | undefined>(undefined);
  const [fechaCausa, setFechaCausa] = useState<Date | undefined>(undefined);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(DEFAULT_INGRESO);
  const [editFechaIngreso, setEditFechaIngreso] = useState<Date | undefined>(undefined);
  const [editFechaCausa, setEditFechaCausa] = useState<Date | undefined>(undefined);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: causales = [] } = useCausalIngresoList(expandedId || "");
  const { data: derechos = [] } = useDerechoVulneradoList(expandedId || "");
  const causalMut = useCausalIngresoCreate(expandedId || "");
  const derechoMut = useDerechoVulneradoCreate(expandedId || "");

  const [causalForm, setCausalForm] = useState({ nombre_causal: "", descripcion_detallada: "", estado: "Activo" });
  const [derechoForm, setDerechoForm] = useState({ nombre_derecho: "", estado: "Activo" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {};
    for (const [k, v] of Object.entries(form)) { if (k === "orden_tribunal") { payload[k] = v; continue; } if (v) payload[k] = v; }
    if (fechaIngreso) payload.fecha_ingreso_residencia = fechaIngreso.toISOString().split("T")[0];
    if (fechaCausa) payload.fecha_causa = fechaCausa.toISOString().split("T")[0];
    await createMut.mutateAsync(payload);
    setForm(DEFAULT_INGRESO); setFechaIngreso(undefined); setFechaCausa(undefined); setShowForm(false);
  };

  const startEdit = (ingreso: AntecedenteIngreso) => {
    setEditingId(ingreso.id_antecedente_ingreso);
    setEditForm({ fecha_ingreso_residencia: ingreso.fecha_ingreso_residencia || "", quien_solicita_ingreso: ingreso.quien_solicita_ingreso || "", orden_tribunal: ingreso.orden_tribunal, fecha_causa: ingreso.fecha_causa || "", tribunal: ingreso.tribunal || "", materia: ingreso.materia || "", codigo_rit: ingreso.codigo_rit || "", codigo_ruc: ingreso.codigo_ruc || "" });
    setEditFechaIngreso(ingreso.fecha_ingreso_residencia ? new Date(ingreso.fecha_ingreso_residencia + "T00:00:00") : undefined);
    setEditFechaCausa(ingreso.fecha_causa ? new Date(ingreso.fecha_causa + "T00:00:00") : undefined);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const payload: any = {};
    for (const [k, v] of Object.entries(editForm)) { if (k === "orden_tribunal") { payload[k] = v; continue; } if (v) payload[k] = v; }
    if (editFechaIngreso) payload.fecha_ingreso_residencia = editFechaIngreso.toISOString().split("T")[0];
    else payload.fecha_ingreso_residencia = null;
    if (editFechaCausa) payload.fecha_causa = editFechaCausa.toISOString().split("T")[0];
    else payload.fecha_causa = null;
    await updateMut.mutateAsync({ id: editingId, data: payload });
    setEditingId(null);
  };

  const createCausal = async () => {
    if (!expandedId) return;
    const payload: any = {};
    if (causalForm.nombre_causal) payload.nombre_causal = causalForm.nombre_causal;
    if (causalForm.descripcion_detallada) payload.descripcion_detallada = causalForm.descripcion_detallada;
    if (causalForm.estado) payload.estado = causalForm.estado;
    await causalMut.mutateAsync(payload);
    setCausalForm({ nombre_causal: "", descripcion_detallada: "", estado: "Activo" });
  };

  const createDerecho = async () => {
    if (!expandedId) return;
    const payload: any = {};
    if (derechoForm.nombre_derecho) payload.nombre_derecho = derechoForm.nombre_derecho;
    if (derechoForm.estado) payload.estado = derechoForm.estado;
    await derechoMut.mutateAsync(payload);
    setDerechoForm({ nombre_derecho: "", estado: "Activo" });
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-[50vh]"><Spinner className="size-6" /></div>;
  if (error || !nna) return <div className="max-w-5xl mx-auto px-4 py-8"><p className="text-destructive">{error?.message || "NNA no encontrado"}</p></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="-ml-2 mb-4"><Link href={`/nna/${id}`}><ArrowLeftIcon /> Volver al resumen</Link></Button>
      <Card className="mb-4"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{nna.nombre}</CardTitle></CardHeader></Card>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Antecedentes de Ingreso</h2>
        {!showForm && <Button size="sm" onClick={() => setShowForm(true)}><PlusIcon /> Nuevo ingreso</Button>}
      </div>

      {showForm && (
        <Card className="mb-6 border-primary/30">
          <CardHeader className="pb-2"><CardTitle className="text-base">Nuevo antecedente de ingreso</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label className="text-xs">Fecha ingreso residencia</Label><Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !fechaIngreso && "text-muted-foreground")}><CalendarIcon />{fechaIngreso ? fechaIngreso.toLocaleDateString("es-CL") : "Seleccionar"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={fechaIngreso} onSelect={setFechaIngreso} /></PopoverContent></Popover></div>
                <div><Label className="text-xs">Quién solicita ingreso</Label><Input className="mt-1" value={form.quien_solicita_ingreso} onChange={(e) => setForm((p) => ({ ...p, quien_solicita_ingreso: e.target.value }))} placeholder="Nombre / institución" /></div>
                <div className="flex items-center gap-2 pt-2"><Checkbox id="orden-tribunal" checked={form.orden_tribunal} onCheckedChange={(v) => setForm((p) => ({ ...p, orden_tribunal: !!v }))} /><Label htmlFor="orden-tribunal" className="text-xs cursor-pointer">Orden de tribunal</Label></div>
                <div><Label className="text-xs">Tribunal</Label><Input className="mt-1" value={form.tribunal} onChange={(e) => setForm((p) => ({ ...p, tribunal: e.target.value }))} placeholder="Tribunal" /></div>
                <div><Label className="text-xs">Fecha causa</Label><Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !fechaCausa && "text-muted-foreground")}><CalendarIcon />{fechaCausa ? fechaCausa.toLocaleDateString("es-CL") : "Seleccionar"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={fechaCausa} onSelect={setFechaCausa} /></PopoverContent></Popover></div>
                <div><Label className="text-xs">Materia</Label><Input className="mt-1" value={form.materia} onChange={(e) => setForm((p) => ({ ...p, materia: e.target.value }))} placeholder="Materia" /></div>
                <div><Label className="text-xs">Código RIT</Label><Input className="mt-1" value={form.codigo_rit} onChange={(e) => setForm((p) => ({ ...p, codigo_rit: e.target.value }))} placeholder="RIT" /></div>
                <div><Label className="text-xs">Código RUC</Label><Input className="mt-1" value={form.codigo_ruc} onChange={(e) => setForm((p) => ({ ...p, codigo_ruc: e.target.value }))} placeholder="RUC" /></div>
              </div>
              {createMut.isError && <p className="text-destructive text-sm">{createMut.error.message}</p>}
              <div className="flex gap-2"><Button type="submit" size="sm" disabled={createMut.isPending}>{createMut.isPending ? "Guardando..." : "Guardar"}</Button><Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      {ingresos.length === 0 ? (
        <Empty><p className="text-sm text-muted-foreground">Sin antecedentes de ingreso.</p></Empty>
      ) : (
        <div className="space-y-4">
          {ingresos.map((ingreso) => (
            <Card key={ingreso.id_antecedente_ingreso}>
              <CardContent className="pt-4">
                {editingId === ingreso.id_antecedente_ingreso ? (
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><Label className="text-xs">Fecha ingreso residencia</Label><Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !editFechaIngreso && "text-muted-foreground")}><CalendarIcon />{editFechaIngreso ? editFechaIngreso.toLocaleDateString("es-CL") : "Seleccionar"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={editFechaIngreso} onSelect={setEditFechaIngreso} /></PopoverContent></Popover></div>
                      <div><Label className="text-xs">Quién solicita</Label><Input className="mt-1" value={editForm.quien_solicita_ingreso} onChange={(e) => setEditForm((p) => ({ ...p, quien_solicita_ingreso: e.target.value }))} /></div>
                      <div className="flex items-center gap-2 pt-2"><Checkbox id={`edit-orden-${ingreso.id_antecedente_ingreso}`} checked={editForm.orden_tribunal} onCheckedChange={(v) => setEditForm((p) => ({ ...p, orden_tribunal: !!v }))} /><Label htmlFor={`edit-orden-${ingreso.id_antecedente_ingreso}`} className="text-xs cursor-pointer">Orden tribunal</Label></div>
                      <div><Label className="text-xs">Tribunal</Label><Input className="mt-1" value={editForm.tribunal} onChange={(e) => setEditForm((p) => ({ ...p, tribunal: e.target.value }))} /></div>
                      <div><Label className="text-xs">Fecha causa</Label><Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !editFechaCausa && "text-muted-foreground")}><CalendarIcon />{editFechaCausa ? editFechaCausa.toLocaleDateString("es-CL") : "Seleccionar"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={editFechaCausa} onSelect={setEditFechaCausa} /></PopoverContent></Popover></div>
                      <div><Label className="text-xs">Materia</Label><Input className="mt-1" value={editForm.materia} onChange={(e) => setEditForm((p) => ({ ...p, materia: e.target.value }))} /></div>
                      <div><Label className="text-xs">RIT</Label><Input className="mt-1" value={editForm.codigo_rit} onChange={(e) => setEditForm((p) => ({ ...p, codigo_rit: e.target.value }))} /></div>
                      <div><Label className="text-xs">RUC</Label><Input className="mt-1" value={editForm.codigo_ruc} onChange={(e) => setEditForm((p) => ({ ...p, codigo_ruc: e.target.value }))} /></div>
                    </div>
                    {updateMut.isError && <p className="text-destructive text-sm">{updateMut.error.message}</p>}
                    <div className="flex gap-2"><Button type="submit" size="sm" disabled={updateMut.isPending}>{updateMut.isPending ? "Guardando..." : "Guardar"}</Button><Button type="button" variant="outline" size="sm" onClick={() => setEditingId(null)}>Cancelar</Button></div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-sm">
                        <div><span className="text-xs text-muted-foreground">Fecha ingreso: </span>{formatDate(ingreso.fecha_ingreso_residencia)}</div>
                        <div><span className="text-xs text-muted-foreground">Solicitante: </span>{ingreso.quien_solicita_ingreso || "—"}</div>
                        <div><span className="text-xs text-muted-foreground">Orden tribunal: </span>{ingreso.orden_tribunal ? <Badge variant="secondary">Sí</Badge> : "No"}</div>
                        <div><span className="text-xs text-muted-foreground">Tribunal: </span>{ingreso.tribunal || "—"}</div>
                        <div><span className="text-xs text-muted-foreground">Materia: </span>{ingreso.materia || "—"}</div>
                        <div><span className="text-xs text-muted-foreground">Fecha causa: </span>{formatDate(ingreso.fecha_causa)}</div>
                        <div><span className="text-xs text-muted-foreground">RIT: </span>{ingreso.codigo_rit || "—"}</div>
                        <div><span className="text-xs text-muted-foreground">RUC: </span>{ingreso.codigo_ruc || "—"}</div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => startEdit(ingreso)}><PencilIcon className="size-4" /></Button>
                    </div>

                    <div className="mt-3 border-t pt-3">
                      {expandedId === ingreso.id_antecedente_ingreso ? (
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground mb-2">Causales de Ingreso</h4>
                            {causales.length === 0 ? <p className="text-xs text-muted-foreground">Sin causales registradas.</p> : (
                              <ul className="space-y-1 mb-2">{causales.map((c) => (<li key={c.id_registro_causales} className="text-sm flex items-center gap-2"><span>{c.nombre_causal || "—"}</span><Badge variant="outline" className="text-xs">{c.estado || "—"}</Badge></li>))}</ul>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Input className="h-7 text-xs" value={causalForm.nombre_causal} onChange={(e) => setCausalForm((p) => ({ ...p, nombre_causal: e.target.value }))} placeholder="Nombre causal" />
                              <Select value={causalForm.estado} onValueChange={(v) => setCausalForm((p) => ({ ...p, estado: v }))}><SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Activo">Activo</SelectItem><SelectItem value="Inactivo">Inactivo</SelectItem></SelectContent></Select>
                              <Button size="sm" className="h-7 text-xs" onClick={createCausal} disabled={causalMut.isPending}>+</Button>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground mb-2">Derechos Vulnerados</h4>
                            {derechos.length === 0 ? <p className="text-xs text-muted-foreground">Sin derechos registrados.</p> : (
                              <ul className="space-y-1 mb-2">{derechos.map((d) => (<li key={d.id_registro_derecho_vulnerado} className="text-sm flex items-center gap-2"><span>{d.nombre_derecho || "—"}</span><Badge variant="outline" className="text-xs">{d.estado || "—"}</Badge></li>))}</ul>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Input className="h-7 text-xs" value={derechoForm.nombre_derecho} onChange={(e) => setDerechoForm((p) => ({ ...p, nombre_derecho: e.target.value }))} placeholder="Nombre derecho" />
                              <Select value={derechoForm.estado} onValueChange={(v) => setDerechoForm((p) => ({ ...p, estado: v }))}><SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Activo">Activo</SelectItem><SelectItem value="Inactivo">Inactivo</SelectItem></SelectContent></Select>
                              <Button size="sm" className="h-7 text-xs" onClick={createDerecho} disabled={derechoMut.isPending}>+</Button>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => setExpandedId(null)}>Ocultar</Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => setExpandedId(ingreso.id_antecedente_ingreso)}>Causales & Derechos</Button>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
