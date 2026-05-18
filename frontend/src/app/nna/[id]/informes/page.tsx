"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CalendarIcon, PlusIcon, PencilIcon } from "lucide-react";
import { api, type NNA, type InformeTribunal } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Empty } from "@/components/ui/empty";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("es-CL");
}

const DEFAULT = { tipo_informe: "", fecha_vencimiento: "", fecha_envio_real: "", estado: "" };

export default function InformesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [nna, setNna] = useState<NNA | null>(null);
  const [items, setItems] = useState<InformeTribunal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(DEFAULT);
  const [fechaVence, setFechaVence] = useState<Date | undefined>(undefined);
  const [fechaEnvio, setFechaEnvio] = useState<Date | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(DEFAULT);
  const [editFechaVence, setEditFechaVence] = useState<Date | undefined>(undefined);
  const [editFechaEnvio, setEditFechaEnvio] = useState<Date | undefined>(undefined);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [nnaData, list] = await Promise.all([api.nna.get(id), api.informeTribunal.list(id)]);
        setNna(nnaData); setItems(list);
      } catch (e: any) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null); setSaving(true);
    try {
      const payload: any = {};
      if (form.tipo_informe) payload.tipo_informe = form.tipo_informe;
      if (form.estado) payload.estado = form.estado;
      if (fechaVence) payload.fecha_vencimiento = fechaVence.toISOString().split("T")[0];
      if (fechaEnvio) payload.fecha_envio_real = fechaEnvio.toISOString().split("T")[0];
      const created = await api.informeTribunal.create(id, payload);
      setItems((prev) => [...prev, created]);
      setForm(DEFAULT); setFechaVence(undefined); setFechaEnvio(undefined); setShowForm(false);
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  };

  const startEdit = (item: InformeTribunal) => {
    setEditingId(item.id_informe);
    setEditForm({
      tipo_informe: item.tipo_informe || "",
      fecha_vencimiento: item.fecha_vencimiento || "",
      fecha_envio_real: item.fecha_envio_real || "",
      estado: item.estado || "",
    });
    setEditFechaVence(item.fecha_vencimiento ? new Date(item.fecha_vencimiento + "T00:00:00") : undefined);
    setEditFechaEnvio(item.fecha_envio_real ? new Date(item.fecha_envio_real + "T00:00:00") : undefined);
    setEditError(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setEditError(null); setEditSaving(true);
    try {
      const payload: any = {};
      if (editForm.tipo_informe) payload.tipo_informe = editForm.tipo_informe;
      if (editForm.estado) payload.estado = editForm.estado;
      if (editFechaVence) payload.fecha_vencimiento = editFechaVence.toISOString().split("T")[0];
      else payload.fecha_vencimiento = null;
      if (editFechaEnvio) payload.fecha_envio_real = editFechaEnvio.toISOString().split("T")[0];
      else payload.fecha_envio_real = null;
      const updated = await api.informeTribunal.update(editingId, payload);
      setItems((prev) => prev.map((i) => (i.id_informe === editingId ? updated : i)));
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

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Informes Tribunal</h2>
        {!showForm && <Button size="sm" onClick={() => setShowForm(true)}><PlusIcon /> Nuevo informe</Button>}
      </div>

      {showForm && (
        <Card className="mb-6 border-primary/30">
          <CardHeader className="pb-2"><CardTitle className="text-base">Nuevo informe</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Tipo informe</Label>
                  <Input className="mt-1" value={form.tipo_informe} onChange={(e) => setForm((p) => ({ ...p, tipo_informe: e.target.value }))} placeholder="Tipo de informe" />
                </div>
                <div>
                  <Label className="text-xs">Estado</Label>
                  <Select value={form.estado} onValueChange={(v) => setForm((p) => ({ ...p, estado: v }))}>
                    <SelectTrigger className="mt-1 w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="Pendiente">Pendiente</SelectItem>
                        <SelectItem value="Enviado">Enviado</SelectItem>
                        <SelectItem value="Vencido">Vencido</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Fecha vencimiento</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !fechaVence && "text-muted-foreground")}><CalendarIcon />{fechaVence ? fechaVence.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={fechaVence} onSelect={setFechaVence} /></PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-xs">Fecha envío real</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !fechaEnvio && "text-muted-foreground")}><CalendarIcon />{fechaEnvio ? fechaEnvio.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={fechaEnvio} onSelect={setFechaEnvio} /></PopoverContent>
                  </Popover>
                </div>
              </div>
              {formError && <p className="text-destructive text-sm">{formError}</p>}
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {items.length === 0 ? (
        <Empty><p className="text-sm text-muted-foreground">Sin informes registrados.</p></Empty>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id_informe}>
              <CardContent className="pt-4">
                {editingId === item.id_informe ? (
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Tipo informe</Label>
                        <Input className="mt-1" value={editForm.tipo_informe} onChange={(e) => setEditForm((p) => ({ ...p, tipo_informe: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-xs">Estado</Label>
                        <Select value={editForm.estado} onValueChange={(v) => setEditForm((p) => ({ ...p, estado: v }))}>
                          <SelectTrigger className="mt-1 w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pendiente">Pendiente</SelectItem>
                            <SelectItem value="Enviado">Enviado</SelectItem>
                            <SelectItem value="Vencido">Vencido</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Fecha vencimiento</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !editFechaVence && "text-muted-foreground")}><CalendarIcon />{editFechaVence ? editFechaVence.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={editFechaVence} onSelect={setEditFechaVence} /></PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label className="text-xs">Fecha envío real</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !editFechaEnvio && "text-muted-foreground")}><CalendarIcon />{editFechaEnvio ? editFechaEnvio.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={editFechaEnvio} onSelect={setEditFechaEnvio} /></PopoverContent>
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
                  <div className="flex items-start justify-between">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-sm">
                      <div><span className="text-xs text-muted-foreground">Tipo: </span>{item.tipo_informe || "—"}</div>
                      <div><span className="text-xs text-muted-foreground">Estado: </span><Badge variant={item.estado === "Vencido" ? "destructive" : "outline"}>{item.estado || "—"}</Badge></div>
                      <div><span className="text-xs text-muted-foreground">Vence: </span>{formatDate(item.fecha_vencimiento)}</div>
                      <div><span className="text-xs text-muted-foreground">Envío: </span>{formatDate(item.fecha_envio_real)}</div>
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
