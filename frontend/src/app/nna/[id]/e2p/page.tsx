"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CalendarIcon, PlusIcon, PencilIcon } from "lucide-react";
import { api, type NNA, type Instrumento, type Familiar, type E2PQuestions, type E2PPuntaje } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Empty } from "@/components/ui/empty";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const LIKERT_OPTIONS = [
  { value: 0, label: "Nunca" },
  { value: 1, label: "Casi Nunca" },
  { value: 2, label: "A veces" },
  { value: 3, label: "Casi Siempre" },
  { value: 4, label: "Siempre" },
];

const VERSION_MONTHS: [number, number][] = [
  [0, 3],
  [4, 10],
  [11, 18],
  [19, 36],
  [37, 60],
  [61, 84],
  [85, 144],
  [145, 204],
];

const CATEGORY_COLORS: Record<string, string> = {
  Vinculares: "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
  Formativas: "border-l-green-500 bg-green-50/50 dark:bg-green-950/20",
  Protectoras: "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20",
  Reflexivas: "border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/20",
};

function ageToVersion(fechaNacimiento: string | null, evalDate: Date): number | null {
  if (!fechaNacimiento) return null;
  const birth = new Date(fechaNacimiento + "T00:00:00");
  const months = (evalDate.getFullYear() - birth.getFullYear()) * 12 + (evalDate.getMonth() - birth.getMonth());
  for (let v = 0; v < VERSION_MONTHS.length; v++) {
    const [lo, hi] = VERSION_MONTHS[v];
    if (months >= lo && months <= hi) return v + 1;
  }
  if (months < 0) return 1;
  return 8;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("es-CL");
}

function getLikertLabel(value: number) {
  const opt = LIKERT_OPTIONS.find((o) => o.value === value);
  return opt?.label ?? "—";
}

const ZONE_COLORS: Record<string, string> = {
  Baja: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  Intermedia: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Alta: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
};

const RESULTADO_STYLES: Record<string, string> = {
  Riesgo: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  Monitoreo: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  Optimo: "bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
};

function likertRadios(questionId: number, value: number | undefined, onChange: (qId: number, val: number) => void, disabled: boolean) {
  return (
    <div className="flex gap-3 flex-wrap mt-1">
      {LIKERT_OPTIONS.map((opt) => (
        <label key={opt.value} className="flex items-center gap-1 text-xs cursor-pointer">
          <input
            type="radio"
            name={`q-${questionId}`}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(questionId, opt.value)}
            disabled={disabled}
            className="size-3.5 accent-primary"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

export default function E2PPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [nna, setNna] = useState<NNA | null>(null);
  const [familiares, setFamiliares] = useState<Familiar[]>([]);
  const [items, setItems] = useState<Instrumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [idFamiliar, setIdFamiliar] = useState("");
  const [observacion, setObservacion] = useState("");
  const [fechaEval, setFechaEval] = useState<Date | undefined>(undefined);
  const [fechaProx, setFechaProx] = useState<Date | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [version, setVersion] = useState<number | null>(null);
  const [questions, setQuestions] = useState<E2PQuestions | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [questionsLoading, setQuestionsLoading] = useState(false);

  // Edit form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editIdFamiliar, setEditIdFamiliar] = useState("");
  const [editObservacion, setEditObservacion] = useState("");
  const [editFechaEval, setEditFechaEval] = useState<Date | undefined>(undefined);
  const [editFechaProx, setEditFechaProx] = useState<Date | undefined>(undefined);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [editVersion, setEditVersion] = useState<number | null>(null);
  const [editQuestions, setEditQuestions] = useState<E2PQuestions | null>(null);
  const [editAnswers, setEditAnswers] = useState<Record<string, number>>({});
  const [editQuestionsLoading, setEditQuestionsLoading] = useState(false);

  // Puntaje per saved item
  const [puntajes, setPuntajes] = useState<Record<string, E2PPuntaje | null>>({});

  // Auto-detect version from NNA age
  const autoVersion = useMemo(() => {
    if (!nna?.fecha_nacimiento) return null;
    return ageToVersion(nna.fecha_nacimiento, new Date());
  }, [nna]);

  const loadItems = async () => {
    setLoading(true);
    try { setItems(await api.e2p.listByNna(id)); }
    catch { setItems([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    (async () => {
      try {
        const [nnaData, famList] = await Promise.all([api.nna.get(id), api.familiares.list()]);
        setNna(nnaData);
        setFamiliares(famList);
        await loadItems();
      } catch (e: any) { setError(e.message); setLoading(false); }
    })();
  }, [id]);

  // Fetch puntajes for items with respuestas
  useEffect(() => {
    (async () => {
      const newPuntajes: Record<string, E2PPuntaje | null> = {};
      for (const item of items) {
        if (item.respuestas && Object.keys(item.respuestas).length > 0) {
          try { newPuntajes[item.id_e2p] = await api.e2p.getPuntaje(item.id_e2p); }
          catch { newPuntajes[item.id_e2p] = null; }
        }
      }
      setPuntajes(newPuntajes);
    })();
  }, [items]);

  const loadVersion = async (ver: number) => {
    setQuestionsLoading(true);
    try { setQuestions(await api.e2p.getQuestions(ver)); }
    catch { setQuestions(null); setFormError("Error al cargar preguntas"); }
    finally { setQuestionsLoading(false); }
  };

  const resetCreate = () => {
    setIdFamiliar(""); setObservacion("");
    setFechaEval(undefined); setFechaProx(undefined);
    setVersion(null); setQuestions(null); setAnswers({});
  };

  const showCreate = () => {
    setShowForm(true);
    const v = autoVersion;
    if (v) { setVersion(v); loadVersion(v); }
  };

  const buildPayload = (ver: number | null, ans: Record<string, number>) => {
    const p: any = {};
    if (idFamiliar) p.id_familiar = idFamiliar;
    if (observacion) p.observacion = observacion;
    if (fechaEval) p.fecha_evaluacion = fechaEval.toISOString().split("T")[0];
    if (fechaProx) p.fecha_proxima_evaluacion = fechaProx.toISOString().split("T")[0];
    if (ver) p.version = ver;
    if (Object.keys(ans).length > 0) p.respuestas = ans;
    return p;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!version) { setFormError("No se pudo determinar la versión"); return; }
    setFormError(null); setSaving(true);
    try {
      const p = buildPayload(version, answers);
      const created = await api.e2p.createByNna(id, p);
      setItems((prev) => [...prev, created]);
      setShowForm(false); resetCreate();
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  };

  const startEdit = async (item: Instrumento) => {
    setEditingId(item.id_e2p);
    setEditIdFamiliar(item.id_familiar || "");
    setEditObservacion(item.observacion || "");
    setEditFechaEval(item.fecha_evaluacion ? new Date(item.fecha_evaluacion + "T00:00:00") : undefined);
    setEditFechaProx(item.fecha_proxima_evaluacion ? new Date(item.fecha_proxima_evaluacion + "T00:00:00") : undefined);
    setEditError(null);
    if (item.version) {
      setEditVersion(item.version);
      setEditAnswers(item.respuestas || {});
      setEditQuestionsLoading(true);
      try { setEditQuestions(await api.e2p.getQuestions(item.version)); }
      catch { setEditQuestions(null); }
      finally { setEditQuestionsLoading(false); }
    } else {
      setEditVersion(null); setEditQuestions(null); setEditAnswers({});
    }
  };

  const buildEditPayload = () => {
    const p: any = {};
    if (editIdFamiliar) p.id_familiar = editIdFamiliar;
    if (editObservacion) p.observacion = editObservacion;
    if (editFechaEval) p.fecha_evaluacion = editFechaEval.toISOString().split("T")[0];
    else p.fecha_evaluacion = null;
    if (editFechaProx) p.fecha_proxima_evaluacion = editFechaProx.toISOString().split("T")[0];
    else p.fecha_proxima_evaluacion = null;
    if (editVersion) p.version = editVersion;
    p.respuestas = Object.keys(editAnswers).length > 0 ? editAnswers : null;
    return p;
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setEditError(null); setEditSaving(true);
    try {
      const updated = await api.e2p.update(editingId, buildEditPayload());
      setItems((prev) => prev.map((i) => (i.id_e2p === editingId ? updated : i)));
      setEditingId(null);
    } catch (e: any) { setEditError(e.message); }
    finally { setEditSaving(false); }
  };

  const getFamiliarName = (idFamiliar: string | null) => {
    if (!idFamiliar) return "—";
    const f = familiares.find((x) => x.id_familiar === idFamiliar);
    return f?.nombre || idFamiliar.slice(0, 8);
  };

  // Group questions by category
  const grouped = useMemo(() => {
    if (!questions) return [];
    const cats: Record<string, typeof questions.preguntas> = {};
    for (const q of questions.preguntas) (cats[q.categoria] ??= []).push(q);
    return Object.entries(cats);
  }, [questions]);

  const editGrouped = useMemo(() => {
    if (!editQuestions) return [];
    const cats: Record<string, typeof editQuestions.preguntas> = {};
    for (const q of editQuestions.preguntas) (cats[q.categoria] ??= []).push(q);
    return Object.entries(cats);
  }, [editQuestions]);

  if (error || !nna) return <div className="max-w-5xl mx-auto px-4 py-8"><p className="text-destructive">{error || "NNA no encontrado"}</p></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="-ml-2 mb-4"><Link href={`/nna/${id}`}><ArrowLeftIcon /> Volver al resumen</Link></Button>
      <Card className="mb-4"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{nna.nombre}</CardTitle></CardHeader></Card>

      <h2 className="text-lg font-semibold mb-3">E2P</h2>

      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground">{items.length} registro{items.length !== 1 ? "s" : ""}</span>
        {!showForm && <Button size="sm" onClick={showCreate}><PlusIcon /> Nuevo E2P</Button>}
      </div>

      {showForm && (
        <Card className="mb-6 border-primary/30">
          <CardHeader className="pb-2"><CardTitle className="text-base">Nuevo E2P</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Familiar</Label>
                  <Select value={idFamiliar} onValueChange={setIdFamiliar}>
                    <SelectTrigger className="mt-1 w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">— Sin familiar —</SelectItem>
                        {familiares.map((f) => (
                          <SelectItem key={f.id_familiar} value={f.id_familiar}>{f.nombre || f.id_familiar.slice(0, 8)}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Versión</Label>
                  <p className="text-sm mt-1.5">
                    {version ? `Versión ${version} — ${questions?.edad || ""}` : "Calculando..."}
                  </p>
                </div>
                <div>
                  <Label className="text-xs">Fecha evaluación</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !fechaEval && "text-muted-foreground")}><CalendarIcon />{fechaEval ? fechaEval.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={fechaEval} onSelect={setFechaEval} /></PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-xs">Próxima evaluación</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !fechaProx && "text-muted-foreground")}><CalendarIcon />{fechaProx ? fechaProx.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={fechaProx} onSelect={setFechaProx} /></PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-xs">Observación</Label>
                  <Input className="mt-1" value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Observaciones" />
                </div>
              </div>

              {questionsLoading && <div className="flex items-center justify-center py-4"><Spinner className="size-5" /></div>}

              {questions && (
                <div className="max-h-[60vh] overflow-y-auto space-y-6">
                  {grouped.map(([cat, qs]) => (
                    <div key={cat} className={cn("border-l-4 rounded-r-md p-3", CATEGORY_COLORS[cat] || "")}>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{cat}</h4>
                      <div className="space-y-3">
                        {qs.map((q) => (
                          <div key={q.id} className="border-b last:border-0 pb-2 last:pb-0 border-border/50">
                            <p className="text-sm font-medium">
                              <span className="text-muted-foreground">{q.id}.</span> {q.texto}
                            </p>
                            {likertRadios(q.id, answers[String(q.id)], (qId, val) => setAnswers((prev) => ({ ...prev, [String(qId)]: val })), saving)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {formError && <p className="text-destructive text-sm">{formError}</p>}
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving || questionsLoading}>{saving ? "Guardando..." : "Guardar"}</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => { setShowForm(false); resetCreate(); }}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8"><Spinner className="size-5" /></div>
      ) : items.length === 0 ? (
        <Empty><p className="text-sm text-muted-foreground">Sin registros de E2P.</p></Empty>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id_e2p}>
              <CardContent className="pt-4">
                {editingId === item.id_e2p ? (
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Familiar</Label>
                        <Select value={editIdFamiliar} onValueChange={setEditIdFamiliar}>
                          <SelectTrigger className="mt-1 w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— Sin familiar —</SelectItem>
                            {familiares.map((f) => (
                              <SelectItem key={f.id_familiar} value={f.id_familiar}>{f.nombre || f.id_familiar.slice(0, 8)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Versión</Label>
                        <p className="text-sm mt-1.5">
                          {editVersion ? `Versión ${editVersion} — ${editQuestions?.edad || ""}` : "—"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs">Fecha evaluación</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !editFechaEval && "text-muted-foreground")}><CalendarIcon />{editFechaEval ? editFechaEval.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={editFechaEval} onSelect={setEditFechaEval} /></PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label className="text-xs">Próxima evaluación</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal mt-1", !editFechaProx && "text-muted-foreground")}><CalendarIcon />{editFechaProx ? editFechaProx.toLocaleDateString("es-CL") : "Seleccionar"}</Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={editFechaProx} onSelect={setEditFechaProx} /></PopoverContent>
                        </Popover>
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs">Observación</Label>
                        <Input className="mt-1" value={editObservacion} onChange={(e) => setEditObservacion(e.target.value)} />
                      </div>
                    </div>

                    {editQuestionsLoading && <div className="flex items-center justify-center py-4"><Spinner className="size-5" /></div>}

                    {editQuestions && (
                      <div className="max-h-[60vh] overflow-y-auto space-y-6">
                        {editGrouped.map(([cat, qs]) => (
                          <div key={cat} className={cn("border-l-4 rounded-r-md p-3", CATEGORY_COLORS[cat] || "")}>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{cat}</h4>
                            <div className="space-y-3">
                              {qs.map((q) => (
                                <div key={q.id} className="border-b last:border-0 pb-2 last:pb-0 border-border/50">
                                  <p className="text-sm font-medium">
                                    <span className="text-muted-foreground">{q.id}.</span> {q.texto}
                                  </p>
                                  {likertRadios(q.id, editAnswers[String(q.id)], (qId, val) => setEditAnswers((prev) => ({ ...prev, [String(qId)]: val })), editSaving)}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {editError && <p className="text-destructive text-sm">{editError}</p>}
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={editSaving || editQuestionsLoading}>{editSaving ? "Guardando..." : "Guardar"}</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setEditingId(null)}>Cancelar</Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      <div><span className="text-xs text-muted-foreground">Familiar: </span>{getFamiliarName(item.id_familiar)}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Resultado: </span>
                        {item.resultado ? (
                          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold", RESULTADO_STYLES[item.resultado] || "bg-muted border-muted-foreground/20")}>
                            {item.resultado}
                          </span>
                        ) : (
                          <span className="text-sm">—</span>
                        )}
                      </div>
                      <div><span className="text-xs text-muted-foreground">Evaluación: </span>{formatDate(item.fecha_evaluacion)}</div>
                      <div><span className="text-xs text-muted-foreground">Próxima: </span>{formatDate(item.fecha_proxima_evaluacion)}</div>
                      {item.version != null && (
                        <div><span className="text-xs text-muted-foreground">Versión: </span>{item.version}</div>
                      )}
                      {item.respuestas && (
                        <div><span className="text-xs text-muted-foreground">Respuestas: </span>{Object.keys(item.respuestas).length} preguntas</div>
                      )}
                      {item.observacion && <div className="col-span-2"><span className="text-xs text-muted-foreground">Obs: </span>{item.observacion}</div>}
                      {item.respuestas && puntajes[item.id_e2p] && (
                        <div className="col-span-2 mt-2 flex flex-wrap gap-1.5">
                          {puntajes[item.id_e2p]!.categorias.map((c) => (
                            <span key={c.categoria} className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium", ZONE_COLORS[c.zona] || "bg-muted")}>
                              {c.categoria} <span className="opacity-70">{c.puntaje_bruto}/{c.puntaje_max}</span>
                            </span>
                          ))}
                        </div>
                      )}

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
