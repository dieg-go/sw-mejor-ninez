"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CalendarIcon, PlusIcon, PencilIcon } from "lucide-react";
import {
  api,
  type NNA,
  type Familiar,
  type AntecedenteFamiliar,
  type VinculoFamiliar,
} from "@/lib/api";
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

export default function FamiliarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = use(params);
  const sp = use(searchParams);
  const idCaso = typeof sp.id_caso === "string" ? sp.id_caso : undefined;
  const [nna, setNna] = useState<NNA | null>(null);
  const [items, setItems] = useState<AntecedenteFamiliar[]>([]);
  const [familiares, setFamiliares] = useState<Familiar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClosed, setIsClosed] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [fecha, setFecha] = useState<Date | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFecha, setEditFecha] = useState<Date | undefined>(undefined);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Vínculo sub-list state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [vinculos, setVinculos] = useState<VinculoFamiliar[]>([]);
  const [subLoading, setSubLoading] = useState(false);

  const [vinculoForm, setVinculoForm] = useState({ id_familiar: "", parentesco: "" });  const [vinculoSaving, setVinculoSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [nnaData, list, famList] = await Promise.all([
          api.nna.get(id),
          api.antecedenteFamiliar.list(id, idCaso),
          api.familiares.list(),
        ]);
        setNna(nnaData); setItems(list); setFamiliares(famList);
        if (idCaso) setIsClosed((await api.casos.get(idCaso)).estado === "Cerrado");
      } catch (e: any) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [id, idCaso]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null); setSaving(true);
    try {
      const payload: any = {};
      if (fecha) payload.fecha_antecedente_familiar = fecha.toISOString().split("T")[0];
      const created = await api.antecedenteFamiliar.create(id, payload);
      setItems((prev) => [...prev, created]);
      setFecha(undefined); setShowForm(false);
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  };

  const startEdit = (item: AntecedenteFamiliar) => {
    setEditingId(item.id_antecedente_familiar);
    setEditFecha(item.fecha_antecedente_familiar ? new Date(item.fecha_antecedente_familiar + "T00:00:00") : undefined);
    setEditError(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setEditError(null); setEditSaving(true);
    try {
      const payload: any = {};
      if (editFecha) payload.fecha_antecedente_familiar = editFecha.toISOString().split("T")[0];
      else payload.fecha_antecedente_familiar = null;
      const updated = await api.antecedenteFamiliar.update(editingId, payload);
      setItems((prev) => prev.map((i) => (i.id_antecedente_familiar === editingId ? updated : i)));
      setEditingId(null);
    } catch (e: any) { setEditError(e.message); }
    finally { setEditSaving(false); }
  };

  const loadVinculos = async (idFamiliar: string) => {
    setExpandedId(idFamiliar);
    setSubLoading(true);
    try {
      const list = await api.vinculoFamiliar.list(idFamiliar);
      setVinculos(list);
    } catch { setVinculos([]); }
    finally { setSubLoading(false); }
  };

  const createVinculo = async () => {
    if (!expandedId) return;
    setVinculoSaving(true);
    try {
      const payload: any = {};
      if (vinculoForm.id_familiar) payload.id_familiar = vinculoForm.id_familiar;
      if (vinculoForm.parentesco) payload.parentesco = vinculoForm.parentesco;
      const created = await api.vinculoFamiliar.create(expandedId, payload);
      setVinculos((prev) => [...prev, created]);
      setVinculoForm({ id_familiar: "", parentesco: "" });
    } catch {}
    finally { setVinculoSaving(false); }
  };

  const getFamiliarName = (idFamiliar: string | null) => {
    if (!idFamiliar) return "—";
    const f = familiares.find((x) => x.id_familiar === idFamiliar);
    return f?.nombre || idFamiliar.slice(0, 8);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><Spinner className="size-6" /></div>;
  if (error || !nna) return <div className="max-w-5xl mx-auto px-4 py-8"><p className="text-destructive">{error || "NNA no encontrado"}</p></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="-ml-2 mb-4"><Link href={`/nna/${id}${idCaso ? `?id_caso=${idCaso}` : ""}`}><ArrowLeftIcon /> Volver al resumen</Link></Button>
      <Card className="mb-4"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{nna.nombre}</CardTitle></CardHeader></Card>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Antecedentes Familiares</h2>
        {!showForm && !isClosed && <Button size="sm" onClick={() => setShowForm(true)}><PlusIcon /> Nuevo antecedente</Button>}
      </div>

      {showForm && (
        <Card className="mb-6 border-primary/30">
          <CardHeader className="pb-2"><CardTitle className="text-base">Nuevo antecedente familiar</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label className="text-xs">Fecha</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !fecha && "text-muted-foreground")}><CalendarIcon />{fecha ? fecha.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={fecha} onSelect={setFecha} /></PopoverContent>
                </Popover>
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
        <Empty><p className="text-sm text-muted-foreground">Sin antecedentes familiares.</p></Empty>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id_antecedente_familiar}>
              <CardContent className="pt-4">
                {editingId === item.id_antecedente_familiar ? (
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <div>
                      <Label className="text-xs">Fecha</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !editFecha && "text-muted-foreground")}><CalendarIcon />{editFecha ? editFecha.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={editFecha} onSelect={setEditFecha} /></PopoverContent>
                      </Popover>
                    </div>
                    {editError && <p className="text-destructive text-sm">{editError}</p>}
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={editSaving}>{editSaving ? "Guardando..." : "Guardar"}</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setEditingId(null)}>Cancelar</Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="text-sm">
                      <span className="text-xs text-muted-foreground">Fecha: </span>{formatDate(item.fecha_antecedente_familiar)}
                    </div>
                    {!isClosed && <Button variant="ghost" size="icon" onClick={() => startEdit(item)}><PencilIcon className="size-4" /></Button>}
                  </div>
                )}

                {/* Entorno Familiar sub-list */}
                <div className="mt-3 border-t pt-3">
                  {expandedId === item.id_antecedente_familiar ? (
                    subLoading ? (
                      <Spinner className="size-4" />
                    ) : (
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-muted-foreground">Vínculo Familiar ({vinculos.length})</h4>
                        {vinculos.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Sin vínculos registrados.</p>
                        ) : (
                          <ul className="space-y-1 mb-3">
                            {vinculos.map((e) => (
                              <li key={e.id_vinculo_familiar} className="text-sm flex items-center gap-2 flex-wrap">
                                <span>{getFamiliarName(e.id_familiar)}</span>
                                <span className="text-muted-foreground">· {e.parentesco || "—"}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Select value={vinculoForm.id_familiar} onValueChange={(v) => setVinculoForm((p) => ({ ...p, id_familiar: v }))}>
                            <SelectTrigger className="h-7 text-xs w-40"><SelectValue placeholder="Familiar" /></SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {familiares.map((f) => (
                                  <SelectItem key={f.id_familiar} value={f.id_familiar}>{f.nombre || f.id_familiar.slice(0, 8)}</SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                          <Input
                            className="h-7 text-xs w-28"
                            value={vinculoForm.parentesco}
                            onChange={(e) => setVinculoForm((p) => ({ ...p, parentesco: e.target.value }))}
                            placeholder="Parentesco"
                          />
                          <Button size="sm" className="h-7 text-xs" onClick={createVinculo} disabled={vinculoSaving}>+</Button>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setExpandedId(null)}>Ocultar</Button>
                      </div>
                    )
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => loadVinculos(item.id_antecedente_familiar)}>
                      Vínculo Familiar
                    </Button>
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
