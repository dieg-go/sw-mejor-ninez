"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CalendarIcon, PlusIcon, PencilIcon } from "lucide-react";
import {
  api,
  type NNA,
  type Instrumento,
  type AdultoSignificativo,
  type E2PQuestions,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const LIKERT_OPTIONS = [
  { value: 1, label: "Nunca" },
  { value: 2, label: "Casi Nunca" },
  { value: 3, label: "A veces" },
  { value: 4, label: "Casi Siempre" },
  { value: 5, label: "Siempre" },
];

const E2P_VERSIONS = [
  { value: 1, label: "1 — 0 a 1 año 6 meses" },
  { value: 2, label: "2 — 1 año 7 meses a 3 años" },
  { value: 3, label: "3 — 4 a 5 años" },
  { value: 4, label: "4 — 6 a 7 años" },
  { value: 5, label: "5 — 8 a 9 años" },
  { value: 6, label: "6 — 10 a 11 años" },
  { value: 7, label: "7 — 12 a 14 años" },
  { value: 8, label: "8 — 15 a 17 años" },
];

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("es-CL");
}

function getLikertLabel(value: number) {
  const opt = LIKERT_OPTIONS.find((o) => o.value === value);
  return opt?.label ?? "—";
}

function likertRadios(
  questionId: number,
  value: number | undefined,
  onChange: (qId: number, val: number) => void,
  disabled: boolean,
) {
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
  const [adultos, setAdultos] = useState<AdultoSignificativo[]>([]);
  const [items, setItems] = useState<Instrumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [idAdulto, setIdAdulto] = useState("");
  const [resultado, setResultado] = useState("");
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
  const [editIdAdulto, setEditIdAdulto] = useState("");
  const [editResultado, setEditResultado] = useState("");
  const [editObservacion, setEditObservacion] = useState("");
  const [editFechaEval, setEditFechaEval] = useState<Date | undefined>(undefined);
  const [editFechaProx, setEditFechaProx] = useState<Date | undefined>(undefined);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [editVersion, setEditVersion] = useState<number | null>(null);
  const [editQuestions, setEditQuestions] = useState<E2PQuestions | null>(null);
  const [editAnswers, setEditAnswers] = useState<Record<string, number>>({});
  const [editQuestionsLoading, setEditQuestionsLoading] = useState(false);

  const loadItems = async () => {
    setLoading(true);
    try { setItems(await api.e2p.listByNna(id)); }
    catch { setItems([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    (async () => {
      try {
        const [nnaData, adList] = await Promise.all([api.nna.get(id), api.adultos.list()]);
        setNna(nnaData);
        setAdultos(adList);
        await loadItems();
      } catch (e: any) { setError(e.message); setLoading(false); }
    })();
  }, [id]);

  const handleVersionChange = async (v: string) => {
    const ver = parseInt(v);
    setVersion(ver);
    setAnswers({});
    if (ver) {
      setQuestionsLoading(true);
      try { setQuestions(await api.e2p.getQuestions(ver)); }
      catch { setQuestions(null); setFormError("Error al cargar preguntas"); }
      finally { setQuestionsLoading(false); }
    } else { setQuestions(null); }
  };

  const handleEditVersionChange = async (v: string) => {
    const ver = parseInt(v);
    setEditVersion(ver);
    setEditAnswers({});
    if (ver) {
      setEditQuestionsLoading(true);
      try { setEditQuestions(await api.e2p.getQuestions(ver)); }
      catch { setEditQuestions(null); setEditError("Error al cargar preguntas"); }
      finally { setEditQuestionsLoading(false); }
    } else { setEditQuestions(null); }
  };

  const resetCreate = () => {
    setIdAdulto(""); setResultado(""); setObservacion("");
    setFechaEval(undefined); setFechaProx(undefined);
    setVersion(null); setQuestions(null); setAnswers({});
  };

  const buildPayload = (ver: number | null, ans: Record<string, number>) => {
    const p: any = {};
    if (idAdulto) p.id_adulto_significativo = idAdulto;
    if (resultado) p.resultado = resultado;
    if (observacion) p.observacion = observacion;
    if (fechaEval) p.fecha_evaluacion = fechaEval.toISOString().split("T")[0];
    if (fechaProx) p.fecha_proxima_evaluacion = fechaProx.toISOString().split("T")[0];
    if (ver) p.version = ver;
    if (Object.keys(ans).length > 0) p.respuestas = ans;
    return p;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!version) { setFormError("Seleccione una versión"); return; }
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
    setEditingId(item.id_instrumento);
    setEditIdAdulto(item.id_adulto_significativo || "");
    setEditResultado(item.resultado || "");
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
    if (editIdAdulto) p.id_adulto_significativo = editIdAdulto;
    if (editResultado) p.resultado = editResultado;
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
      setItems((prev) => prev.map((i) => (i.id_instrumento === editingId ? updated : i)));
      setEditingId(null);
    } catch (e: any) { setEditError(e.message); }
    finally { setEditSaving(false); }
  };

  const getAdultoName = (idAdulto: string | null) => {
    if (!idAdulto) return "—";
    const a = adultos.find((x) => x.id_adulto_significativo === idAdulto);
    return a?.nombre || idAdulto.slice(0, 8);
  };

  if (error || !nna) return <div className="max-w-5xl mx-auto px-4 py-8"><p className="text-destructive">{error || "NNA no encontrado"}</p></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="-ml-2 mb-4"><Link href={`/nna/${id}`}><ArrowLeftIcon /> Volver al resumen</Link></Button>
      <Card className="mb-4"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{nna.nombre}</CardTitle></CardHeader></Card>

      <h2 className="text-lg font-semibold mb-3">E2P</h2>

      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground">{items.length} registro{items.length !== 1 ? "s" : ""}</span>
        {!showForm && <Button size="sm" onClick={() => setShowForm(true)}><PlusIcon /> Nuevo E2P</Button>}
      </div>

      {showForm && (
        <Card className="mb-6 border-primary/30">
          <CardHeader className="pb-2"><CardTitle className="text-base">Nuevo E2P</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Adulto Significativo</Label>
                  <Select value={idAdulto} onValueChange={setIdAdulto}>
                    <SelectTrigger className="mt-1 w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">— Sin adulto —</SelectItem>
                        {adultos.map((a) => (
                          <SelectItem key={a.id_adulto_significativo} value={a.id_adulto_significativo}>{a.nombre || a.id_adulto_significativo.slice(0, 8)}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Versión <span className="text-destructive">*</span></Label>
                  <Select value={version?.toString() || ""} onValueChange={handleVersionChange}>
                    <SelectTrigger className="mt-1 w-full"><SelectValue placeholder="Seleccionar versión" /></SelectTrigger>
                    <SelectContent>
                      {E2P_VERSIONS.map((v) => (
                        <SelectItem key={v.value} value={v.value.toString()}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Label className="text-xs">Resultado</Label>
                  <Input className="mt-1" value={resultado} onChange={(e) => setResultado(e.target.value)} placeholder="Resultado" />
                </div>
                <div>
                  <Label className="text-xs">Observación</Label>
                  <Input className="mt-1" value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Observaciones" />
                </div>
              </div>

              {questions && (
                <div className="border rounded-md p-4 max-h-[60vh] overflow-y-auto space-y-4">
                  <p className="text-sm font-medium text-muted-foreground">{questions.edad} — {questions.preguntas.length} preguntas</p>
                  {questions.preguntas.map((q) => (
                    <div key={q.id} className="border-b pb-3 last:border-0">
                      <p className="text-sm font-medium">
                        <span className="text-muted-foreground">{q.id}.</span> {q.texto}
                      </p>
                      {likertRadios(q.id, answers[String(q.id)], (qId, val) => setAnswers((prev) => ({ ...prev, [String(qId)]: val })), saving)}
                    </div>
                  ))}
                </div>
              )}
              {questionsLoading && <div className="flex items-center justify-center py-4"><Spinner className="size-5" /></div>}

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
            <Card key={item.id_instrumento}>
              <CardContent className="pt-4">
                {editingId === item.id_instrumento ? (
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Adulto</Label>
                        <Select value={editIdAdulto} onValueChange={setEditIdAdulto}>
                          <SelectTrigger className="mt-1 w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— Sin adulto —</SelectItem>
                            {adultos.map((a) => (
                              <SelectItem key={a.id_adulto_significativo} value={a.id_adulto_significativo}>{a.nombre || a.id_adulto_significativo.slice(0, 8)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Versión</Label>
                        <Select value={editVersion?.toString() || ""} onValueChange={handleEditVersionChange}>
                          <SelectTrigger className="mt-1 w-full"><SelectValue placeholder="Seleccionar versión" /></SelectTrigger>
                          <SelectContent>
                            {E2P_VERSIONS.map((v) => (
                              <SelectItem key={v.value} value={v.value.toString()}>{v.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                      <div>
                        <Label className="text-xs">Resultado</Label>
                        <Input className="mt-1" value={editResultado} onChange={(e) => setEditResultado(e.target.value)} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs">Observación</Label>
                        <Input className="mt-1" value={editObservacion} onChange={(e) => setEditObservacion(e.target.value)} />
                      </div>
                    </div>

                    {editQuestions && (
                      <div className="border rounded-md p-4 max-h-[60vh] overflow-y-auto space-y-4">
                        <p className="text-sm font-medium text-muted-foreground">{editQuestions.edad} — {editQuestions.preguntas.length} preguntas</p>
                        {editQuestions.preguntas.map((q) => (
                          <div key={q.id} className="border-b pb-3 last:border-0">
                            <p className="text-sm font-medium">
                              <span className="text-muted-foreground">{q.id}.</span> {q.texto}
                            </p>
                            {likertRadios(q.id, editAnswers[String(q.id)], (qId, val) => setEditAnswers((prev) => ({ ...prev, [String(qId)]: val })), editSaving)}
                          </div>
                        ))}
                      </div>
                    )}
                    {editQuestionsLoading && <div className="flex items-center justify-center py-4"><Spinner className="size-5" /></div>}

                    {editError && <p className="text-destructive text-sm">{editError}</p>}
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={editSaving || editQuestionsLoading}>{editSaving ? "Guardando..." : "Guardar"}</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setEditingId(null)}>Cancelar</Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      <div><span className="text-xs text-muted-foreground">Adulto: </span>{getAdultoName(item.id_adulto_significativo)}</div>
                      <div><span className="text-xs text-muted-foreground">Resultado: </span>{item.resultado || "—"}</div>
                      <div><span className="text-xs text-muted-foreground">Evaluación: </span>{formatDate(item.fecha_evaluacion)}</div>
                      <div><span className="text-xs text-muted-foreground">Próxima: </span>{formatDate(item.fecha_proxima_evaluacion)}</div>
                      {item.version != null && (
                        <div><span className="text-xs text-muted-foreground">Versión: </span>{item.version}</div>
                      )}
                      {item.respuestas && (
                        <div><span className="text-xs text-muted-foreground">Respuestas: </span>{Object.keys(item.respuestas).length} preguntas</div>
                      )}
                      {item.observacion && <div className="col-span-2"><span className="text-xs text-muted-foreground">Obs: </span>{item.observacion}</div>}
                      {item.respuestas && (
                        <div className="col-span-2 mt-1">
                          <details className="text-xs">
                            <summary className="text-muted-foreground cursor-pointer hover:text-foreground">Ver respuestas</summary>
                            <div className="mt-1 grid grid-cols-4 sm:grid-cols-6 gap-1">
                              {Object.entries(item.respuestas).map(([q, val]) => (
                                <div key={q} className="bg-muted/50 rounded px-1.5 py-0.5">
                                  <span className="text-muted-foreground">{q}:</span> {getLikertLabel(val as number)}
                                </div>
                              ))}
                            </div>
                          </details>
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
