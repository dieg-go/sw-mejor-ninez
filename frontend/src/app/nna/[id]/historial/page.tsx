"use client";

import { use, useEffect, useState } from "react";
import { Link } from "@/lib/navigation";
import { ArrowLeftIcon, PlusIcon, PencilIcon } from "lucide-react";
import { api, type NNA, type HistorialRedProteccional } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Empty } from "@/components/ui/empty";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATALOGO_PROGRAMAS_PREVIOS, CATALOGO_MOTIVO_EGRESO } from "@/lib/catalogos";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("es-CL");
}

const DEFAULT = { nombre_programa: "", fecha_ingreso: "", fecha_egreso: "", motivo_egreso: "" };

export default function HistorialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [nna, setNna] = useState<NNA | null>(null);
  const [items, setItems] = useState<HistorialRedProteccional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(DEFAULT);
  const [fechaIngreso, setFechaIngreso] = useState<Date | undefined>(undefined);
  const [fechaEgreso, setFechaEgreso] = useState<Date | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [programaSelect, setProgramaSelect] = useState("");
  const [motivoSelect, setMotivoSelect] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(DEFAULT);
  const [editFechaIngreso, setEditFechaIngreso] = useState<Date | undefined>(undefined);
  const [editFechaEgreso, setEditFechaEgreso] = useState<Date | undefined>(undefined);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editProgramaSelect, setEditProgramaSelect] = useState("");
  const [editMotivoSelect, setEditMotivoSelect] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [nnaData, list] = await Promise.all([api.nna.get(id), api.historialRed.list(id)]);
        const sorted = [...list].sort((a, b) => {
          if (!a.fecha_ingreso) return 1;
          if (!b.fecha_ingreso) return -1;
          return b.fecha_ingreso.localeCompare(a.fecha_ingreso);
        });
        setNna(nnaData); setItems(sorted);
      } catch (e: any) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null); setSaving(true);
    try {
      const payload: any = {};
      if (form.nombre_programa) payload.nombre_programa = form.nombre_programa;
      if (form.motivo_egreso) payload.motivo_egreso = form.motivo_egreso;
      if (fechaIngreso) payload.fecha_ingreso = fechaIngreso.toISOString().split("T")[0];
      if (fechaEgreso) payload.fecha_egreso = fechaEgreso.toISOString().split("T")[0];
      const created = await api.historialRed.create(id, payload);
      setItems((prev) => [...prev, created]);
      setForm(DEFAULT); setFechaIngreso(undefined); setFechaEgreso(undefined); setShowForm(false); setProgramaSelect(""); setMotivoSelect("");
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  };

  const startEdit = (item: HistorialRedProteccional) => {
    setEditingId(item.id_historial_red);
    const progRaw = item.nombre_programa || "";
    const motRaw = item.motivo_egreso || "";
    const isCustomProg = progRaw !== "" && !CATALOGO_PROGRAMAS_PREVIOS.includes(progRaw);
    const isCustomMot = motRaw !== "" && !CATALOGO_MOTIVO_EGRESO.includes(motRaw);
    setEditForm({
      nombre_programa: progRaw,
      fecha_ingreso: item.fecha_ingreso || "",
      fecha_egreso: item.fecha_egreso || "",
      motivo_egreso: motRaw,
    });
    setEditProgramaSelect(isCustomProg ? "Otro" : progRaw);
    setEditMotivoSelect(isCustomMot ? "Otro" : motRaw);
    setEditFechaIngreso(item.fecha_ingreso ? new Date(item.fecha_ingreso + "T00:00:00") : undefined);
    setEditFechaEgreso(item.fecha_egreso ? new Date(item.fecha_egreso + "T00:00:00") : undefined);
    setEditError(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setEditError(null); setEditSaving(true);
    try {
      const payload: any = {};
      if (editForm.nombre_programa) payload.nombre_programa = editForm.nombre_programa;
      if (editForm.motivo_egreso) payload.motivo_egreso = editForm.motivo_egreso;
      if (editFechaIngreso) payload.fecha_ingreso = editFechaIngreso.toISOString().split("T")[0];
      else payload.fecha_ingreso = null;
      if (editFechaEgreso) payload.fecha_egreso = editFechaEgreso.toISOString().split("T")[0];
      else payload.fecha_egreso = null;
      const updated = await api.historialRed.update(editingId, payload);
      setItems((prev) => prev.map((i) => (i.id_historial_red === editingId ? updated : i)));
      setEditingId(null);
    } catch (e: any) { setEditError(e.message); }
    finally { setEditSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><Spinner className="size-6" /></div>;
  if (error || !nna) return <div className="max-w-5xl mx-auto px-4 py-8"><p className="text-destructive">{error || "NNA no encontrado"}</p></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="-ml-2 mb-4"><Link href={`/nna/${id}`}><ArrowLeftIcon /> Volver al resumen</Link></Button>
      <Card className="mb-4"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{nna.nombre}</CardTitle></CardHeader></Card>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Historial Red Proteccional</h2>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <PlusIcon /> Nuevo registro
          </Button>
        )}
      </div>

      {items.length === 0 && !showForm ? (
        <Empty><p className="text-sm text-muted-foreground">Sin historial registrado.</p></Empty>
      ) : (
        <div className="relative">
          <div className="absolute left-[15px] top-1 bottom-1 w-px bg-border" />

          <div className="space-y-0">
            {showForm && (
              <div className="relative pl-10 pb-8">
                <div className="absolute left-[11px] top-[26px] w-[9px] h-[9px] rounded-full border-2 border-primary bg-background z-10" />
                <Card className="border-primary/30">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Nuevo registro</CardTitle></CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreate} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">Nombre programa</Label>
                          <Select value={programaSelect} onValueChange={(v) => { setProgramaSelect(v); if (v === "Otro") { setForm((p) => ({ ...p, nombre_programa: "" })); } else { setForm((p) => ({ ...p, nombre_programa: v })); } }}>
                            <SelectTrigger size="sm" className="mt-1 w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                            <SelectContent>
                              {CATALOGO_PROGRAMAS_PREVIOS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          {programaSelect === "Otro" && <Input className="mt-1" value={form.nombre_programa} onChange={(e) => setForm((p) => ({ ...p, nombre_programa: e.target.value }))} placeholder="Especificar" />}
                        </div>
                        <div>
                          <Label className="text-xs">Motivo egreso</Label>
                          <Select value={motivoSelect} onValueChange={(v) => { setMotivoSelect(v); if (v === "Otro") { setForm((p) => ({ ...p, motivo_egreso: "" })); } else { setForm((p) => ({ ...p, motivo_egreso: v })); } }}>
                            <SelectTrigger size="sm" className="mt-1 w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                            <SelectContent>
                              {CATALOGO_MOTIVO_EGRESO.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          {motivoSelect === "Otro" && <Input className="mt-1" value={form.motivo_egreso} onChange={(e) => setForm((p) => ({ ...p, motivo_egreso: e.target.value }))} placeholder="Especificar" />}
                        </div>
                        <div>
                          <Label className="text-xs">Fecha ingreso</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !fechaIngreso && "text-muted-foreground")}><CalendarIcon />{fechaIngreso ? fechaIngreso.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={fechaIngreso} onSelect={setFechaIngreso} /></PopoverContent>
                          </Popover>
                        </div>
                        <div>
                          <Label className="text-xs">Fecha egreso</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !fechaEgreso && "text-muted-foreground")}><CalendarIcon />{fechaEgreso ? fechaEgreso.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={fechaEgreso} onSelect={setFechaEgreso} /></PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      {formError && <p className="text-destructive text-sm">{formError}</p>}
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => { setShowForm(false); setForm(DEFAULT); setFechaIngreso(undefined); setFechaEgreso(undefined); setFormError(null); setProgramaSelect(""); setMotivoSelect(""); }}>Cancelar</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}

            {items.map((item, i) => {
              const isFirst = i === 0 && !showForm;
              return (
                <div key={item.id_historial_red} className="relative pl-10 pb-8 last:pb-0">
                  <div className={cn(
                    "absolute left-[11px] top-[22px] w-[9px] h-[9px] rounded-full border-2 z-10",
                    isFirst ? "border-primary bg-primary" : "border-muted-foreground/30 bg-background"
                  )} />
                  <Card>
                    <CardContent className="pt-4">
                      {editingId === item.id_historial_red ? (
                        <form onSubmit={handleUpdate} className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs">Nombre programa</Label>
                              <Select value={editProgramaSelect} onValueChange={(v) => { setEditProgramaSelect(v); if (v === "Otro") { setEditForm((p) => ({ ...p, nombre_programa: "" })); } else { setEditForm((p) => ({ ...p, nombre_programa: v })); } }}>
                                <SelectTrigger size="sm" className="mt-1 w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                <SelectContent>
                                  {CATALOGO_PROGRAMAS_PREVIOS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              {editProgramaSelect === "Otro" && <Input className="mt-1" value={editForm.nombre_programa} onChange={(e) => setEditForm((p) => ({ ...p, nombre_programa: e.target.value }))} placeholder="Especificar" />}
                            </div>
                            <div>
                              <Label className="text-xs">Motivo egreso</Label>
                              <Select value={editMotivoSelect} onValueChange={(v) => { setEditMotivoSelect(v); if (v === "Otro") { setEditForm((p) => ({ ...p, motivo_egreso: "" })); } else { setEditForm((p) => ({ ...p, motivo_egreso: v })); } }}>
                                <SelectTrigger size="sm" className="mt-1 w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                <SelectContent>
                                  {CATALOGO_MOTIVO_EGRESO.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              {editMotivoSelect === "Otro" && <Input className="mt-1" value={editForm.motivo_egreso} onChange={(e) => setEditForm((p) => ({ ...p, motivo_egreso: e.target.value }))} placeholder="Especificar" />}
                            </div>
                            <div>
                              <Label className="text-xs">Fecha ingreso</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !editFechaIngreso && "text-muted-foreground")}><CalendarIcon />{editFechaIngreso ? editFechaIngreso.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={editFechaIngreso} onSelect={setEditFechaIngreso} /></PopoverContent>
                              </Popover>
                            </div>
                            <div>
                              <Label className="text-xs">Fecha egreso</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !editFechaEgreso && "text-muted-foreground")}><CalendarIcon />{editFechaEgreso ? editFechaEgreso.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={editFechaEgreso} onSelect={setEditFechaEgreso} /></PopoverContent>
                              </Popover>
                            </div>
                          </div>
                          {editError && <p className="text-destructive text-sm">{editError}</p>}
                          <div className="flex gap-2">
                            <Button type="submit" size="sm" disabled={editSaving}>{editSaving ? "Guardando..." : "Guardar"}</Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => setEditingId(null)}>Cancelar</Button>
                          </div>
                        </form>
                      ) : (
                        <div>
                          <div className="flex items-start justify-between mb-1.5">
                            <h3 className="font-medium text-sm">{item.nombre_programa || "Sin nombre"}</h3>
                            <Button variant="ghost" size="icon" className="-mr-2 -mt-1" onClick={() => startEdit(item)}><PencilIcon className="size-4" /></Button>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs mb-1.5">
                            <span className="text-muted-foreground">{item.fecha_ingreso ? formatDate(item.fecha_ingreso) : "—"}</span>
                            <span className="text-muted-foreground/40">→</span>
                            {item.fecha_egreso ? (
                              <span className="text-muted-foreground">{formatDate(item.fecha_egreso)}</span>
                            ) : (
                              <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">Presente</span>
                            )}
                          </div>
                          {item.motivo_egreso && (
                            <p className="text-xs text-muted-foreground">Motivo de egreso: {item.motivo_egreso}</p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
