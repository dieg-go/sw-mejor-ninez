"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CalendarIcon, PlusIcon, PencilIcon } from "lucide-react";
import { type Instrumento } from "@/lib/api";
import {
  useNNA,
  useAdultoList,
  useE2PListByNna,
  usePMFListByNna,
  useNCFASListByNna,
  useInstrumentoUpdate,
} from "@/lib/queries";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Empty } from "@/components/ui/empty";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { keys } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Tab = "E2P" | "PMF" | "NCFAS";

const TABS: { key: Tab; label: string }[] = [
  { key: "E2P", label: "E2P" },
  { key: "PMF", label: "PMF" },
  { key: "NCFAS", label: "NCFAS" },
];

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("es-CL");
}

const DEFAULT = { id_adulto_significativo: "", fecha_evaluacion: "", fecha_proxima_evaluacion: "", resultado: "", observacion: "" };

export default function InstrumentosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const { data: nna, isLoading, error } = useNNA(id);
  const { data: adultos = [] } = useAdultoList();
  const [tab, setTab] = useState<Tab>("E2P");
  const { data: e2p = [] } = useE2PListByNna(id);
  const { data: pmf = [] } = usePMFListByNna(id);
  const { data: ncfas = [] } = useNCFASListByNna(id);
  const updateMut = useInstrumentoUpdate();

  const items = tab === "E2P" ? e2p : tab === "PMF" ? pmf : ncfas;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(DEFAULT);
  const [fechaEval, setFechaEval] = useState<Date | undefined>(undefined);
  const [fechaProx, setFechaProx] = useState<Date | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(DEFAULT);
  const [editFechaEval, setEditFechaEval] = useState<Date | undefined>(undefined);
  const [editFechaProx, setEditFechaProx] = useState<Date | undefined>(undefined);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null); setSaving(true);
    try {
      const payload: any = {};
      if (form.id_adulto_significativo) payload.id_adulto_significativo = form.id_adulto_significativo;
      if (form.resultado) payload.resultado = form.resultado;
      if (form.observacion) payload.observacion = form.observacion;
      if (fechaEval) payload.fecha_evaluacion = fechaEval.toISOString().split("T")[0];
      if (fechaProx) payload.fecha_proxima_evaluacion = fechaProx.toISOString().split("T")[0];
      if (tab === "E2P") await api.e2p.createByNna(id, payload);
      else if (tab === "PMF") await api.pmf.createByNna(id, payload);
      else await api.ncfas.createByNna(id, payload);
      qc.invalidateQueries({ queryKey: tab === "E2P" ? keys.instrumentos.e2pNna(id) : tab === "PMF" ? keys.instrumentos.pmfNna(id) : keys.instrumentos.ncfasNna(id) });
      setForm(DEFAULT); setFechaEval(undefined); setFechaProx(undefined); setShowForm(false);
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  };

  const startEdit = (item: Instrumento) => {
    setEditingId(item.id_instrumento);
    setEditForm({ id_adulto_significativo: item.id_adulto_significativo || "", fecha_evaluacion: item.fecha_evaluacion || "", fecha_proxima_evaluacion: item.fecha_proxima_evaluacion || "", resultado: item.resultado || "", observacion: item.observacion || "" });
    setEditFechaEval(item.fecha_evaluacion ? new Date(item.fecha_evaluacion + "T00:00:00") : undefined);
    setEditFechaProx(item.fecha_proxima_evaluacion ? new Date(item.fecha_proxima_evaluacion + "T00:00:00") : undefined);
    setEditError(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setEditError(null); setEditSaving(true);
    try {
      const payload: any = {};
      if (editForm.id_adulto_significativo) payload.id_adulto_significativo = editForm.id_adulto_significativo;
      if (editForm.resultado) payload.resultado = editForm.resultado;
      if (editForm.observacion) payload.observacion = editForm.observacion;
      if (editFechaEval) payload.fecha_evaluacion = editFechaEval.toISOString().split("T")[0];
      else payload.fecha_evaluacion = null;
      if (editFechaProx) payload.fecha_proxima_evaluacion = editFechaProx.toISOString().split("T")[0];
      else payload.fecha_proxima_evaluacion = null;
      await updateMut.mutateAsync({ type: tab.toLowerCase() as "e2p" | "pmf" | "ncfas", id: editingId, data: payload });
      setEditingId(null);
    } catch (e: any) { setEditError(e.message); }
    finally { setEditSaving(false); }
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

      <h2 className="text-lg font-semibold mb-3">Instrumentos</h2>
      <div className="flex gap-1 border-b mb-4">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => { setTab(key); setShowForm(false); setEditingId(null); }} className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{label}</button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground">{items.length} registro{items.length !== 1 ? "s" : ""}</span>
        {!showForm && <Button size="sm" onClick={() => setShowForm(true)}><PlusIcon /> Nuevo {tab}</Button>}
      </div>

      {showForm && (
        <Card className="mb-6 border-primary/30">
          <CardHeader className="pb-2"><CardTitle className="text-base">Nuevo {tab}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label className="text-xs">Adulto Significativo</Label><Select value={form.id_adulto_significativo} onValueChange={(v) => setForm((p) => ({ ...p, id_adulto_significativo: v }))}><SelectTrigger className="mt-1 w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="">— Sin adulto —</SelectItem>{adultos.map((a) => (<SelectItem key={a.id_adulto_significativo} value={a.id_adulto_significativo}>{a.nombre || a.id_adulto_significativo.slice(0, 8)}</SelectItem>))}</SelectGroup></SelectContent></Select></div>
                <div><Label className="text-xs">Resultado</Label><Input className="mt-1" value={form.resultado} onChange={(e) => setForm((p) => ({ ...p, resultado: e.target.value }))} placeholder="Resultado" /></div>
                <div><Label className="text-xs">Fecha evaluación</Label><Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !fechaEval && "text-muted-foreground")}><CalendarIcon />{fechaEval ? fechaEval.toLocaleDateString("es-CL") : "Seleccionar"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={fechaEval} onSelect={setFechaEval} /></PopoverContent></Popover></div>
                <div><Label className="text-xs">Próxima evaluación</Label><Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !fechaProx && "text-muted-foreground")}><CalendarIcon />{fechaProx ? fechaProx.toLocaleDateString("es-CL") : "Seleccionar"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={fechaProx} onSelect={setFechaProx} /></PopoverContent></Popover></div>
                <div className="sm:col-span-2"><Label className="text-xs">Observación</Label><Input className="mt-1" value={form.observacion} onChange={(e) => setForm((p) => ({ ...p, observacion: e.target.value }))} placeholder="Observaciones" /></div>
              </div>
              {formError && <p className="text-destructive text-sm">{formError}</p>}
              <div className="flex gap-2"><Button type="submit" size="sm" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button><Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      {items.length === 0 ? (
        <Empty><p className="text-sm text-muted-foreground">Sin registros de {tab}.</p></Empty>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id_instrumento}>
              <CardContent className="pt-4">
                {editingId === item.id_instrumento ? (
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><Label className="text-xs">Adulto</Label><Select value={editForm.id_adulto_significativo} onValueChange={(v) => setEditForm((p) => ({ ...p, id_adulto_significativo: v }))}><SelectTrigger className="mt-1 w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent><SelectItem value="">— Sin adulto —</SelectItem>{adultos.map((a) => (<SelectItem key={a.id_adulto_significativo} value={a.id_adulto_significativo}>{a.nombre || a.id_adulto_significativo.slice(0, 8)}</SelectItem>))}</SelectContent></Select></div>
                      <div><Label className="text-xs">Resultado</Label><Input className="mt-1" value={editForm.resultado} onChange={(e) => setEditForm((p) => ({ ...p, resultado: e.target.value }))} /></div>
                      <div><Label className="text-xs">Fecha evaluación</Label><Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !editFechaEval && "text-muted-foreground")}><CalendarIcon />{editFechaEval ? editFechaEval.toLocaleDateString("es-CL") : "Seleccionar"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={editFechaEval} onSelect={setEditFechaEval} /></PopoverContent></Popover></div>
                      <div><Label className="text-xs">Próxima evaluación</Label><Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !editFechaProx && "text-muted-foreground")}><CalendarIcon />{editFechaProx ? editFechaProx.toLocaleDateString("es-CL") : "Seleccionar"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={editFechaProx} onSelect={setEditFechaProx} /></PopoverContent></Popover></div>
                      <div className="sm:col-span-2"><Label className="text-xs">Observación</Label><Input className="mt-1" value={editForm.observacion} onChange={(e) => setEditForm((p) => ({ ...p, observacion: e.target.value }))} /></div>
                    </div>
                    {editError && <p className="text-destructive text-sm">{editError}</p>}
                    <div className="flex gap-2"><Button type="submit" size="sm" disabled={editSaving}>{editSaving ? "Guardando..." : "Guardar"}</Button><Button type="button" variant="outline" size="sm" onClick={() => setEditingId(null)}>Cancelar</Button></div>
                  </form>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      <div><span className="text-xs text-muted-foreground">Adulto: </span>{getAdultoName(item.id_adulto_significativo)}</div>
                      <div><span className="text-xs text-muted-foreground">Resultado: </span>{item.resultado || "—"}</div>
                      <div><span className="text-xs text-muted-foreground">Evaluación: </span>{formatDate(item.fecha_evaluacion)}</div>
                      <div><span className="text-xs text-muted-foreground">Próxima: </span>{formatDate(item.fecha_proxima_evaluacion)}</div>
                      {item.observacion && <div className="col-span-2"><span className="text-xs text-muted-foreground">Obs: </span>{item.observacion}</div>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => startEdit(item)}><PencilIcon className="size-4" /></Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
