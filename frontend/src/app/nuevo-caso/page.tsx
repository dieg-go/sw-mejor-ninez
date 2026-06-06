"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon, CalendarIcon, CheckIcon } from "lucide-react";
import { api, type NNACreate } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

// ═══ Types ═══════════════════════════════════════════════════════════════════

const STEPS = [
  "NNA",
  "Ingreso",
  "Documentación",
  "Historial",
  "Revisión",
] as const;

type StepIndex = 0 | 1 | 2 | 3 | 4;

interface CausalEntry {
  nombre_causal: string;
  descripcion_detallada: string;
  estado: string;
}
interface DerechoEntry {
  nombre_derecho: string;
  estado: string;
}
interface DocEntry {
  tipo_documento: string;
  fecha_recepcion: Date | null;
  observacion: string;
}
interface HistorialEntry {
  nombre_programa: string;
  fecha_ingreso: Date | null;
  fecha_egreso: Date | null;
  motivo_egreso: string;
}

interface WizardData {
  // Step 1
  nna: NNACreate;
  nnaDate: Date | null;
  // Step 2
  ingreso: {
    fecha_ingreso_residencia: Date | null;
    id_solicitante_ingreso: string;
    orden_tribunal: boolean;
    fecha_causa: Date | null;
    tribunal: string;
    materia: string;
    codigo_rit: string;
    codigo_ruc: string;
    causales: CausalEntry[];
    derechos: DerechoEntry[];
  };
  // Step 3
  docs: DocEntry[];
  // Step 4
  historial: HistorialEntry[];
}

function emptyWizard(): WizardData {
  return {
    nna: { nombre: "", run: "", sexo: "", etnia_declarada: "", nacionalidad: "", domicilio: "", poblacion_o_villa: "", comuna: "", region: "" },
    nnaDate: null,
    ingreso: {
      fecha_ingreso_residencia: null,
      id_solicitante_ingreso: "",
      orden_tribunal: false,
      fecha_causa: null,
      tribunal: "",
      materia: "",
      codigo_rit: "",
      codigo_ruc: "",
      causales: [],
      derechos: [],
    },
    docs: [],
    historial: [],
  };
}

function fmt(d: Date | null): string | null {
  if (!d) return null;
  return d.toISOString().split("T")[0];
}

// ═══ Step Indicator ═════════════════════════════════════════════════════════

function StepIndicator({ current, onStep }: { current: StepIndex; onStep: (s: StepIndex) => void }) {
  return (
    <nav className="flex items-center justify-center gap-1 mb-8">
      {STEPS.map((label, i) => {
        const idx = i as StepIndex;
        const isCurrent = idx === current;
        const isPast = idx < current;
        return (
          <div key={label} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onStep(idx)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                isCurrent && "bg-primary text-primary-foreground",
                isPast && "bg-primary/10 text-primary hover:bg-primary/20",
                !isCurrent && !isPast && "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-xs",
                  isCurrent && "bg-primary-foreground text-primary",
                  isPast && "bg-primary text-primary-foreground",
                  !isCurrent && !isPast && "border border-muted-foreground/40 text-muted-foreground",
                )}
              >
                {isPast ? <CheckIcon className="size-3" /> : i + 1}
              </span>
              <span className="max-sm:hidden">{label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <span className={cn("w-6 h-px", idx < current ? "bg-primary/40" : "bg-border")} />
            )}
          </div>
        );
      })}
    </nav>
  );
}

// ═══ DateField ═══════════════════════════════════════════════════════════════

function DateField({ label, value, onChange }: { label?: string; value: Date | null; onChange: (d: Date | undefined) => void }) {
  return (
    <Field>
      {label && <FieldLabel>{label}</FieldLabel>}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}
          >
            <CalendarIcon data-icon="inline-start" />
            {value ? value.toLocaleDateString("es-CL") : "Seleccionar fecha"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value ?? undefined} onSelect={onChange} />
        </PopoverContent>
      </Popover>
    </Field>
  );
}

// ═══ Step 1: NNA ═════════════════════════════════════════════════════════════

function StepNNA({ data, onData, onNext }: { data: WizardData; onData: (d: WizardData) => void; onNext: () => void }) {
  const setField = (field: keyof NNACreate) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onData({ ...data, nna: { ...data.nna, [field]: e.target.value } });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos del NNA</CardTitle>
        <CardDescription>Información básica del niño, niña o adolescente.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="nna-nombre">Nombre completo *</FieldLabel>
              <Input id="nna-nombre" value={data.nna.nombre ?? ""} onChange={setField("nombre")} placeholder="Nombre completo" />
            </Field>
            <Field>
              <FieldLabel htmlFor="nna-run">RUN</FieldLabel>
              <Input id="nna-run" value={data.nna.run ?? ""} onChange={setField("run")} placeholder="12.345.678-9" />
            </Field>
            <DateField
              label="Fecha de nacimiento"
              value={data.nnaDate}
              onChange={(d) => onData({ ...data, nnaDate: d ?? null })}
            />
            <Field>
              <FieldLabel htmlFor="nna-sexo">Sexo</FieldLabel>
              <Select value={data.nna.sexo ?? ""} onValueChange={(v) => onData({ ...data, nna: { ...data.nna, sexo: v } })}>
                <SelectTrigger id="nna-sexo"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Femenino">Femenino</SelectItem>
                    <SelectItem value="No especificado">No especificado</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="nna-nacionalidad">Nacionalidad</FieldLabel>
              <Input id="nna-nacionalidad" value={data.nna.nacionalidad ?? ""} onChange={setField("nacionalidad")} placeholder="Nacionalidad" />
            </Field>
            <Field>
              <FieldLabel htmlFor="nna-etnia">Etnia declarada</FieldLabel>
              <Input id="nna-etnia" value={data.nna.etnia_declarada ?? ""} onChange={setField("etnia_declarada")} placeholder="Etnia" />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="nna-domicilio">Domicilio</FieldLabel>
              <Input id="nna-domicilio" value={data.nna.domicilio ?? ""} onChange={setField("domicilio")} placeholder="Dirección" />
            </Field>
            <Field>
              <FieldLabel htmlFor="nna-poblacion">Población o Villa</FieldLabel>
              <Input id="nna-poblacion" value={data.nna.poblacion_o_villa ?? ""} onChange={setField("poblacion_o_villa")} placeholder="Población o villa" />
            </Field>
            <Field>
              <FieldLabel htmlFor="nna-comuna">Comuna</FieldLabel>
              <Input id="nna-comuna" value={data.nna.comuna ?? ""} onChange={setField("comuna")} placeholder="Comuna" />
            </Field>
            <Field>
              <FieldLabel htmlFor="nna-region">Región</FieldLabel>
              <Input id="nna-region" value={data.nna.region ?? ""} onChange={setField("region")} placeholder="Región" />
            </Field>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button onClick={onNext}>Siguiente <ArrowRightIcon /></Button>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

// ═══ Step 2: Ingreso ═════════════════════════════════════════════════════════

function StepIngreso({ data, onData, onBack, onNext }: { data: WizardData; onData: (d: WizardData) => void; onBack: () => void; onNext: () => void }) {
  const ing = data.ingreso;
  const set = (f: Partial<typeof ing>) => onData({ ...data, ingreso: { ...ing, ...f } });

  const addCausal = () => set({ causales: [...ing.causales, { nombre_causal: "", descripcion_detallada: "", estado: "Activo" }] });
  const addDerecho = () => set({ derechos: [...ing.derechos, { nombre_derecho: "", estado: "Vulnerado" }] });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Antecedentes de Ingreso</CardTitle>
        <CardDescription>Información sobre cómo y por qué ingresó el NNA al sistema.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DateField label="Fecha de ingreso a residencia" value={ing.fecha_ingreso_residencia} onChange={(d) => set({ fecha_ingreso_residencia: d ?? null })} />
            <Field>
              <FieldLabel htmlFor="ing-quien">Quién solicita el ingreso</FieldLabel>
              <Input id="ing-quien" value={ing.id_solicitante_ingreso} onChange={(e) => set({ id_solicitante_ingreso: e.target.value })} placeholder="Nombre o entidad" />
            </Field>
            <DateField label="Fecha de la causa" value={ing.fecha_causa} onChange={(d) => set({ fecha_causa: d ?? null })} />
            <Field>
              <FieldLabel htmlFor="ing-tribunal">Tribunal</FieldLabel>
              <Input id="ing-tribunal" value={ing.tribunal} onChange={(e) => set({ tribunal: e.target.value })} placeholder="Tribunal" />
            </Field>
            <Field>
              <FieldLabel htmlFor="ing-materia">Materia</FieldLabel>
              <Input id="ing-materia" value={ing.materia} onChange={(e) => set({ materia: e.target.value })} placeholder="Materia" />
            </Field>
            <Field>
              <FieldLabel htmlFor="ing-rit">Código RIT</FieldLabel>
              <Input id="ing-rit" value={ing.codigo_rit} onChange={(e) => set({ codigo_rit: e.target.value })} placeholder="RIT" />
            </Field>
            <Field>
              <FieldLabel htmlFor="ing-ruc">Código RUC</FieldLabel>
              <Input id="ing-ruc" value={ing.codigo_ruc} onChange={(e) => set({ codigo_ruc: e.target.value })} placeholder="RUC" />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={ing.orden_tribunal} onCheckedChange={(v) => set({ orden_tribunal: !!v })} />
            Orden de tribunal
          </label>

          {/* Causales */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">Causales de ingreso</h4>
              <Button type="button" variant="outline" size="sm" onClick={addCausal}>+ Agregar</Button>
            </div>
            {ing.causales.length === 0 && <p className="text-sm text-muted-foreground">Sin causales registradas.</p>}
            {ing.causales.map((c, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3 p-3 border rounded-lg">
                <Input placeholder="Nombre de la causal" value={c.nombre_causal} onChange={(e) => {
                  const cs = [...ing.causales]; cs[i] = { ...cs[i], nombre_causal: e.target.value }; set({ causales: cs });
                }} />
                <Input placeholder="Descripción detallada" value={c.descripcion_detallada} onChange={(e) => {
                  const cs = [...ing.causales]; cs[i] = { ...cs[i], descripcion_detallada: e.target.value }; set({ causales: cs });
                }} />
                <div className="flex items-center gap-2">
                  <Select value={c.estado} onValueChange={(v) => { const cs = [...ing.causales]; cs[i] = { ...cs[i], estado: v }; set({ causales: cs }); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Activo">Activo</SelectItem>
                      <SelectItem value="Inactivo">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => {
                    set({ causales: ing.causales.filter((_, j) => j !== i) });
                  }}>×</Button>
                </div>
              </div>
            ))}
          </div>

          {/* Derechos vulnerados */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">Derechos vulnerados</h4>
              <Button type="button" variant="outline" size="sm" onClick={addDerecho}>+ Agregar</Button>
            </div>
            {ing.derechos.length === 0 && <p className="text-sm text-muted-foreground">Sin derechos registrados.</p>}
            {ing.derechos.map((d, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 p-3 border rounded-lg">
                <Input placeholder="Nombre del derecho" value={d.nombre_derecho} onChange={(e) => {
                  const ds = [...ing.derechos]; ds[i] = { ...ds[i], nombre_derecho: e.target.value }; set({ derechos: ds });
                }} />
                <div className="flex items-center gap-2">
                  <Select value={d.estado} onValueChange={(v) => { const ds = [...ing.derechos]; ds[i] = { ...ds[i], estado: v }; set({ derechos: ds }); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vulnerado">Vulnerado</SelectItem>
                      <SelectItem value="No vulnerado">No vulnerado</SelectItem>
                      <SelectItem value="En evaluación">En evaluación</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => {
                    set({ derechos: ing.derechos.filter((_, j) => j !== i) });
                  }}>×</Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button variant="outline" onClick={onBack}><ArrowLeftIcon /> Anterior</Button>
            <Button onClick={onNext}>Siguiente <ArrowRightIcon /></Button>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

// ═══ Step 3: Documentación ═══════════════════════════════════════════════════

function StepDocs({ data, onData, onBack, onNext }: { data: WizardData; onData: (d: WizardData) => void; onBack: () => void; onNext: () => void }) {
  const addDoc = () => onData({ ...data, docs: [...data.docs, { tipo_documento: "", fecha_recepcion: null, observacion: "" }] });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentación de Ingreso</CardTitle>
        <CardDescription>Documentos asociados al ingreso del NNA.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          {data.docs.length === 0 && <p className="text-sm text-muted-foreground">Sin documentos registrados.</p>}
          {data.docs.map((doc, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 mb-3 p-3 border rounded-lg items-center">
              <Input placeholder="Tipo de documento" value={doc.tipo_documento} onChange={(e) => {
                const ds = [...data.docs]; ds[i] = { ...ds[i], tipo_documento: e.target.value }; onData({ ...data, docs: ds });
              }} />
              <DateField value={doc.fecha_recepcion} onChange={(d) => {
                const ds = [...data.docs]; ds[i] = { ...ds[i], fecha_recepcion: d ?? null }; onData({ ...data, docs: ds });
              }} />
              <div className="flex items-center gap-2">
                <Input placeholder="Observación" value={doc.observacion} onChange={(e) => {
                  const ds = [...data.docs]; ds[i] = { ...ds[i], observacion: e.target.value }; onData({ ...data, docs: ds });
                }} />
                <Button type="button" variant="ghost" size="sm" className="text-destructive shrink-0" onClick={() => {
                  onData({ ...data, docs: data.docs.filter((_, j) => j !== i) });
                }}>×</Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addDoc}>+ Agregar documento</Button>

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button variant="outline" onClick={onBack}><ArrowLeftIcon /> Anterior</Button>
            <Button onClick={onNext}>Siguiente <ArrowRightIcon /></Button>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

// ═══ Step 4: Historial Red Proteccional ("Mochila") ══════════════════════════

function StepHistorial({ data, onData, onBack, onNext }: { data: WizardData; onData: (d: WizardData) => void; onBack: () => void; onNext: () => void }) {
  const addEntry = () => onData({
    ...data,
    historial: [...data.historial, { nombre_programa: "", fecha_ingreso: null, fecha_egreso: null, motivo_egreso: "" }],
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial en Red Proteccional</CardTitle>
        <CardDescription>Programas previos por los que ha pasado el NNA (&ldquo;mochila&rdquo;).</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          {data.historial.length === 0 && <p className="text-sm text-muted-foreground mb-4">Sin programas registrados.</p>}
          {data.historial.map((h, i) => (
            <div key={i} className="border rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium">Programa {i + 1}</h4>
                <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => {
                  onData({ ...data, historial: data.historial.filter((_, j) => j !== i) });
                }}>Eliminar</Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field className="sm:col-span-2">
                  <FieldLabel>Nombre del programa</FieldLabel>
                  <Input value={h.nombre_programa} onChange={(e) => {
                    const hs = [...data.historial]; hs[i] = { ...hs[i], nombre_programa: e.target.value }; onData({ ...data, historial: hs });
                  }} placeholder="PPF / PIE / DAM / PPE..." />
                </Field>
                <DateField label="Fecha de ingreso" value={h.fecha_ingreso} onChange={(d) => {
                  const hs = [...data.historial]; hs[i] = { ...hs[i], fecha_ingreso: d ?? null }; onData({ ...data, historial: hs });
                }} />
                <DateField label="Fecha de egreso" value={h.fecha_egreso} onChange={(d) => {
                  const hs = [...data.historial]; hs[i] = { ...hs[i], fecha_egreso: d ?? null }; onData({ ...data, historial: hs });
                }} />
                <Field className="sm:col-span-2">
                  <FieldLabel>Motivo de egreso</FieldLabel>
                  <Input value={h.motivo_egreso} onChange={(e) => {
                    const hs = [...data.historial]; hs[i] = { ...hs[i], motivo_egreso: e.target.value }; onData({ ...data, historial: hs });
                  }} placeholder="Éxito de la intervención / Abandono / Derivación..." />
                </Field>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addEntry}>+ Agregar programa</Button>

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button variant="outline" onClick={onBack}><ArrowLeftIcon /> Anterior</Button>
            <Button onClick={onNext}>Siguiente <ArrowRightIcon /></Button>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

// ═══ Step 5: Review ══════════════════════════════════════════════════════════

function StepReview({
  data,
  onBack,
  submitting,
  onSubmit,
  error,
}: {
  data: WizardData;
  onBack: () => void;
  submitting: boolean;
  onSubmit: () => void;
  error: string | null;
}) {
  const hasExtra =
    data.ingreso.id_solicitante_ingreso ||
    data.docs.length > 0 ||
    data.historial.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revisión del caso</CardTitle>
        <CardDescription>Verifica la información antes de crear el caso.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <section>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              NNA <Badge variant="outline">Requerido</Badge>
            </h4>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              <ReviewItem label="Nombre" value={data.nna.nombre || "—"} />
              <ReviewItem label="RUN" value={data.nna.run || "—"} />
              <ReviewItem label="Fecha nac." value={data.nnaDate?.toLocaleDateString("es-CL") || "—"} />
              <ReviewItem label="Sexo" value={data.nna.sexo || "—"} />
              <ReviewItem label="Nacionalidad" value={data.nna.nacionalidad || "—"} />
              <ReviewItem label="Etnia" value={data.nna.etnia_declarada || "—"} />
              <ReviewItem label="Comuna" value={data.nna.comuna || "—"} />
              <ReviewItem label="Región" value={data.nna.region || "—"} />
            </dl>
          </section>

          {data.ingreso.id_solicitante_ingreso && (
            <section>
              <h4 className="text-sm font-medium mb-2">Ingreso</h4>
              <p className="text-sm text-muted-foreground">{data.ingreso.id_solicitante_ingreso} — {data.ingreso.tribunal || "Sin tribunal"} — {data.ingreso.causales.length} causales, {data.ingreso.derechos.length} derechos</p>
            </section>
          )}

          {data.docs.length > 0 && (
            <section>
              <h4 className="text-sm font-medium mb-2">Documentación ({data.docs.length})</h4>
              <div className="flex flex-wrap gap-1">
                {data.docs.map((d, i) => <Badge key={i} variant="secondary">{d.tipo_documento || "Sin tipo"}</Badge>)}
              </div>
            </section>
          )}

          {data.historial.length > 0 && (
            <section>
              <h4 className="text-sm font-medium mb-2">Historial Red Proteccional ({data.historial.length})</h4>
              <div className="flex flex-wrap gap-1">
                {data.historial.map((h, i) => (
                  <Badge key={i} variant="secondary">
                    {h.nombre_programa || "Sin nombre"}{h.fecha_ingreso ? ` (desde ${h.fecha_ingreso.toLocaleDateString("es-CL")})` : ""}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {!hasExtra && <p className="text-sm text-muted-foreground italic">Solo se creará el registro del NNA. El resto de la información podrá agregarse desde la ficha.</p>}

          {error && <FieldError>{error}</FieldError>}

          <div className="flex items-center justify-between gap-3 pt-2 border-t">
            <Button variant="outline" onClick={onBack}><ArrowLeftIcon /> Anterior</Button>
            <Button onClick={onSubmit} disabled={submitting}>
              {submitting && <Spinner data-icon="inline-start" />}
              {submitting ? "Creando caso..." : "Crear caso"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

// ═══ Main Page ═══════════════════════════════════════════════════════════════

export default function NuevoCasoPage() {
  const router = useRouter();
  const [step, setStep] = useState<StepIndex>(0);
  const [data, setData] = useState<WizardData>(emptyWizard);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goNext = () => setStep((s) => Math.min(s + 1, 4) as StepIndex);
  const goBack = () => setStep((s) => Math.max(s - 1, 0) as StepIndex);
  const goStep = (s: StepIndex) => setStep(s);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);

    try {
      // 1. Create NNA
      const nnaPayload: NNACreate = {};
      for (const [k, v] of Object.entries(data.nna)) {
        if (v) (nnaPayload as Record<string, string>)[k] = v;
      }
      if (data.nnaDate) nnaPayload.fecha_nacimiento = fmt(data.nnaDate);

      const nna = await api.nna.create(nnaPayload);
      const idNna = nna.id_nna;

      // 2. Create Ingreso (if any field filled)
      const ing = data.ingreso;
      if (ing.id_solicitante_ingreso || ing.fecha_ingreso_residencia || ing.causales.length > 0 || ing.derechos.length > 0) {
        const ingreso = await api.antecedenteIngreso.create(idNna, {
          fecha_ingreso_residencia: fmt(ing.fecha_ingreso_residencia),
          id_solicitante_ingreso: ing.id_solicitante_ingreso || null,
          orden_tribunal: ing.orden_tribunal,
          fecha_causa: fmt(ing.fecha_causa),
          tribunal: ing.tribunal || null,
          materia: ing.materia || null,
          codigo_rit: ing.codigo_rit || null,
          codigo_ruc: ing.codigo_ruc || null,
        });
        const idIngreso = ingreso.id_antecedente_ingreso;

        for (const c of ing.causales) {
          await api.causalIngreso.create(idIngreso, {
            nombre_causal: c.nombre_causal || null,
            descripcion_detallada: c.descripcion_detallada || null,
            estado: c.estado || null,
          });
        }
        for (const d of ing.derechos) {
          await api.derechoVulnerado.create(idIngreso, {
            nombre_derecho: d.nombre_derecho || null,
            estado: d.estado || null,
          });
        }
      }

      // 3. Create Documentación
      for (const doc of data.docs) {
        await api.documentacionIngreso.create(idNna, {
          tipo_documento: doc.tipo_documento || null,
          estado_recepcion: !!doc.fecha_recepcion,
          fecha_recepcion: fmt(doc.fecha_recepcion),
          observacion: doc.observacion || null,
        });
      }

      // 4. Create Historial Red Proteccional (mochila)
      for (const h of data.historial) {
        await api.historialRed.create(idNna, {
          nombre_programa: h.nombre_programa || null,
          fecha_ingreso: fmt(h.fecha_ingreso),
          fecha_egreso: fmt(h.fecha_egreso),
          motivo_egreso: h.motivo_egreso || null,
        });
      }

      router.push(`/nna/${idNna}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el caso");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-4">
        <Link href="/nna" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeftIcon /> Volver al listado
        </Link>
      </div>

      <h1 className="text-2xl font-semibold mb-6">Nuevo caso</h1>

      <StepIndicator current={step} onStep={goStep} />

      {step === 0 && <StepNNA data={data} onData={setData} onNext={goNext} />}
      {step === 1 && <StepIngreso data={data} onData={setData} onBack={goBack} onNext={goNext} />}
      {step === 2 && <StepDocs data={data} onData={setData} onBack={goBack} onNext={goNext} />}
      {step === 3 && <StepHistorial data={data} onData={setData} onBack={goBack} onNext={goNext} />}
      {step === 4 && <StepReview data={data} onBack={goBack} submitting={submitting} onSubmit={handleSubmit} error={error} />}
    </div>
  );
}
