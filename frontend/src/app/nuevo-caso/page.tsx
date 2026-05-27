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
  "Familiares",
  "Antecedentes",
  "Revisión",
] as const;

type StepIndex = 0 | 1 | 2 | 3 | 4 | 5;

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
interface AntecedenteAdulto {
  descripcion: string;
}
interface AdultoEntry {
  nombre: string;
  run: string;
  fecha_nacimiento: Date | null;
  direccion: string;
  numero_telefono: string;
  tiene_antecedentes_penales: boolean;
  antecedentes: AntecedenteAdulto[];
  parentesco: string;
  es_adulto_responsable: boolean;
}
interface ConsumoEntry {
  nombre_sustancia: string;
  consumo_indirecto_gestacional: boolean;
  estado_consumo: string;
  fecha_inicio: Date | null;
  en_tratamiento: boolean;
}
interface DiscapacidadEntry {
  tipo: string;
  porcentaje_grado: number;
  observacion: string;
}

interface WizardData {
  // Step 1
  nna: NNACreate;
  nnaDate: Date | null;
  // Step 2
  ingreso: {
    fecha_ingreso_residencia: Date | null;
    quien_solicita_ingreso: string;
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
  adultos: AdultoEntry[];
  // Step 5
  salud: {
    inscrito_en_consultorio: boolean;
    establecimiento: string;
    prevision: string;
  };
  escolar: {
    escolarizado: boolean;
    establecimiento: string;
    ultimo_ano_curso: string;
  };
  consumo: ConsumoEntry[];
  discapacidades: DiscapacidadEntry[];
}

function emptyWizard(): WizardData {
  return {
    nna: { nombre: "", run: "", sexo: "", etnia_declarada: "", nacionalidad: "", domicilio: "", poblacion_o_villa: "", comuna: "", region: "" },
    nnaDate: null,
    ingreso: {
      fecha_ingreso_residencia: null,
      quien_solicita_ingreso: "",
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
    adultos: [],
    salud: { inscrito_en_consultorio: false, establecimiento: "", prevision: "" },
    escolar: { escolarizado: false, establecimiento: "", ultimo_ano_curso: "" },
    consumo: [],
    discapacidades: [],
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
              <Input id="ing-quien" value={ing.quien_solicita_ingreso} onChange={(e) => set({ quien_solicita_ingreso: e.target.value })} placeholder="Nombre o entidad" />
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

// ═══ Step 4: Adultos ═════════════════════════════════════════════════════════

function StepAdultos({ data, onData, onBack, onNext }: { data: WizardData; onData: (d: WizardData) => void; onBack: () => void; onNext: () => void }) {
  const addAdulto = () => onData({
    ...data,
    adultos: [...data.adultos, { nombre: "", run: "", fecha_nacimiento: null, direccion: "", numero_telefono: "", tiene_antecedentes_penales: false, antecedentes: [], parentesco: "", es_adulto_responsable: false }],
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Adultos Significativos</CardTitle>
        <CardDescription>Personas relevantes en el entorno del NNA.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          {data.adultos.length === 0 && <p className="text-sm text-muted-foreground mb-4">Sin adultos registrados.</p>}
          {data.adultos.map((a, i) => (
            <div key={i} className="border rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium">Adulto {i + 1}</h4>
                <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => {
                  onData({ ...data, adultos: data.adultos.filter((_, j) => j !== i) });
                }}>Eliminar</Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Nombre</FieldLabel>
                  <Input value={a.nombre} onChange={(e) => {
                    const as = [...data.adultos]; as[i] = { ...as[i], nombre: e.target.value }; onData({ ...data, adultos: as });
                  }} placeholder="Nombre completo" />
                </Field>
                <Field>
                  <FieldLabel>RUN</FieldLabel>
                  <Input value={a.run} onChange={(e) => {
                    const as = [...data.adultos]; as[i] = { ...as[i], run: e.target.value }; onData({ ...data, adultos: as });
                  }} placeholder="12.345.678-9" />
                </Field>
                <DateField label="Fecha de nacimiento" value={a.fecha_nacimiento} onChange={(d) => {
                  const as = [...data.adultos]; as[i] = { ...as[i], fecha_nacimiento: d ?? null }; onData({ ...data, adultos: as });
                }} />
                <Field>
                  <FieldLabel>Dirección</FieldLabel>
                  <Input value={a.direccion} onChange={(e) => {
                    const as = [...data.adultos]; as[i] = { ...as[i], direccion: e.target.value }; onData({ ...data, adultos: as });
                  }} placeholder="Dirección" />
                </Field>
                <Field>
                  <FieldLabel>Teléfono</FieldLabel>
                  <Input value={a.numero_telefono} onChange={(e) => {
                    const as = [...data.adultos]; as[i] = { ...as[i], numero_telefono: e.target.value }; onData({ ...data, adultos: as });
                  }} placeholder="+569..." />
                </Field>
                <Field>
                  <FieldLabel>Parentesco con el NNA</FieldLabel>
                  <Input value={a.parentesco} onChange={(e) => {
                    const as = [...data.adultos]; as[i] = { ...as[i], parentesco: e.target.value }; onData({ ...data, adultos: as });
                  }} placeholder="Madre / Padre / Tío..." />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm mt-3">
                <Checkbox checked={a.tiene_antecedentes_penales} onCheckedChange={(v) => {
                  const as = [...data.adultos]; as[i] = { ...as[i], tiene_antecedentes_penales: !!v }; onData({ ...data, adultos: as });
                }} />
                Tiene antecedentes penales
              </label>
              <label className="flex items-center gap-2 text-sm mt-2">
                <Checkbox checked={a.es_adulto_responsable} onCheckedChange={(v) => {
                  const as = [...data.adultos]; as[i] = { ...as[i], es_adulto_responsable: !!v }; onData({ ...data, adultos: as });
                }} />
                Es adulto responsable
              </label>
              {a.tiene_antecedentes_penales && (
                <div className="mt-3 pl-4 border-l-2">
                  <h5 className="text-xs font-medium mb-2">Antecedentes penales</h5>
                  {a.antecedentes.map((ant, j) => (
                    <div key={j} className="flex items-center gap-2 mb-2">
                      <Input placeholder="Descripción del antecedente" value={ant.descripcion} onChange={(e) => {
                        const as = [...data.adultos];
                        const ants = [...as[i].antecedentes];
                        ants[j] = { ...ants[j], descripcion: e.target.value };
                        as[i] = { ...as[i], antecedentes: ants };
                        onData({ ...data, adultos: as });
                      }} />
                      <Button type="button" variant="ghost" size="sm" className="text-destructive shrink-0" onClick={() => {
                        const as = [...data.adultos];
                        as[i] = { ...as[i], antecedentes: as[i].antecedentes.filter((_, k) => k !== j) };
                        onData({ ...data, adultos: as });
                      }}>×</Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    const as = [...data.adultos];
                    as[i] = { ...as[i], antecedentes: [...as[i].antecedentes, { descripcion: "" }] };
                    onData({ ...data, adultos: as });
                  }}>+ Agregar antecedente</Button>
                </div>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addAdulto}>+ Agregar adulto</Button>

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button variant="outline" onClick={onBack}><ArrowLeftIcon /> Anterior</Button>
            <Button onClick={onNext}>Siguiente <ArrowRightIcon /></Button>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

// ═══ Step 5: Antecedentes ════════════════════════════════════════════════════

function StepAntecedentes({ data, onData, onBack, onNext }: { data: WizardData; onData: (d: WizardData) => void; onBack: () => void; onNext: () => void }) {
  const addConsumo = () => onData({
    ...data,
    consumo: [...data.consumo, { nombre_sustancia: "", consumo_indirecto_gestacional: false, estado_consumo: "", fecha_inicio: null, en_tratamiento: false }],
  });
  const addDisc = () => onData({
    ...data,
    discapacidades: [...data.discapacidades, { tipo: "", porcentaje_grado: 0, observacion: "" }],
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Antecedentes adicionales</CardTitle>
        <CardDescription>Salud, escolaridad, consumo y discapacidades del NNA.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          {/* Salud */}
          <div className="border rounded-lg p-4">
            <h4 className="text-sm font-medium mb-3">Salud</h4>
            <label className="flex items-center gap-2 text-sm mb-3">
              <Checkbox checked={data.salud.inscrito_en_consultorio} onCheckedChange={(v) => onData({ ...data, salud: { ...data.salud, inscrito_en_consultorio: !!v } })} />
              Inscrito en consultorio
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Establecimiento</FieldLabel>
                <Input value={data.salud.establecimiento} onChange={(e) => onData({ ...data, salud: { ...data.salud, establecimiento: e.target.value } })} placeholder="CESFAM / Hospital" />
              </Field>
              <Field>
                <FieldLabel>Previsión</FieldLabel>
                <Input value={data.salud.prevision} onChange={(e) => onData({ ...data, salud: { ...data.salud, prevision: e.target.value } })} placeholder="Fonasa / Isapre" />
              </Field>
            </div>
          </div>

          {/* Escolar */}
          <div className="border rounded-lg p-4">
            <h4 className="text-sm font-medium mb-3">Escolaridad</h4>
            <label className="flex items-center gap-2 text-sm mb-3">
              <Checkbox checked={data.escolar.escolarizado} onCheckedChange={(v) => onData({ ...data, escolar: { ...data.escolar, escolarizado: !!v } })} />
              Escolarizado
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Establecimiento</FieldLabel>
                <Input value={data.escolar.establecimiento} onChange={(e) => onData({ ...data, escolar: { ...data.escolar, establecimiento: e.target.value } })} placeholder="Nombre del establecimiento" />
              </Field>
              <Field>
                <FieldLabel>Último año cursado</FieldLabel>
                <Input value={data.escolar.ultimo_ano_curso} onChange={(e) => onData({ ...data, escolar: { ...data.escolar, ultimo_ano_curso: e.target.value } })} placeholder="Ej: 8" />
              </Field>
            </div>
          </div>

          {/* Consumo */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">Historial de consumo</h4>
              <Button type="button" variant="outline" size="sm" onClick={addConsumo}>+ Agregar</Button>
            </div>
            {data.consumo.length === 0 && <p className="text-sm text-muted-foreground">Sin registros de consumo.</p>}
            {data.consumo.map((c, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 p-3 border rounded-lg">
                <Input placeholder="Sustancia" value={c.nombre_sustancia} onChange={(e) => {
                  const cs = [...data.consumo]; cs[i] = { ...cs[i], nombre_sustancia: e.target.value }; onData({ ...data, consumo: cs });
                }} />
                <Select value={c.estado_consumo} onValueChange={(v) => { const cs = [...data.consumo]; cs[i] = { ...cs[i], estado_consumo: v }; onData({ ...data, consumo: cs }); }}>
                  <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Activo">Activo</SelectItem>
                    <SelectItem value="Inactivo">Inactivo</SelectItem>
                    <SelectItem value="En tratamiento">En tratamiento</SelectItem>
                  </SelectContent>
                </Select>
                <DateField value={c.fecha_inicio} onChange={(d) => {
                  const cs = [...data.consumo]; cs[i] = { ...cs[i], fecha_inicio: d ?? null }; onData({ ...data, consumo: cs });
                }} />
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={c.consumo_indirecto_gestacional} onCheckedChange={(v) => {
                      const cs = [...data.consumo]; cs[i] = { ...cs[i], consumo_indirecto_gestacional: !!v }; onData({ ...data, consumo: cs });
                    }} />
                    Indirecto gestacional
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={c.en_tratamiento} onCheckedChange={(v) => {
                      const cs = [...data.consumo]; cs[i] = { ...cs[i], en_tratamiento: !!v }; onData({ ...data, consumo: cs });
                    }} />
                    En tratamiento
                  </label>
                  <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => {
                    onData({ ...data, consumo: data.consumo.filter((_, j) => j !== i) });
                  }}>×</Button>
                </div>
              </div>
            ))}
          </div>

          {/* Discapacidades */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">Discapacidades</h4>
              <Button type="button" variant="outline" size="sm" onClick={addDisc}>+ Agregar</Button>
            </div>
            {data.discapacidades.length === 0 && <p className="text-sm text-muted-foreground">Sin discapacidades registradas.</p>}
            {data.discapacidades.map((d, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3 p-3 border rounded-lg">
                <Input placeholder="Tipo" value={d.tipo} onChange={(e) => {
                  const ds = [...data.discapacidades]; ds[i] = { ...ds[i], tipo: e.target.value }; onData({ ...data, discapacidades: ds });
                }} />
                <Input type="number" placeholder="Porcentaje (%)" value={d.porcentaje_grado || ""} onChange={(e) => {
                  const ds = [...data.discapacidades]; ds[i] = { ...ds[i], porcentaje_grado: Number(e.target.value) }; onData({ ...data, discapacidades: ds });
                }} />
                <div className="flex items-center gap-2">
                  <Input placeholder="Observación" value={d.observacion} onChange={(e) => {
                    const ds = [...data.discapacidades]; ds[i] = { ...ds[i], observacion: e.target.value }; onData({ ...data, discapacidades: ds });
                  }} />
                  <Button type="button" variant="ghost" size="sm" className="text-destructive shrink-0" onClick={() => {
                    onData({ ...data, discapacidades: data.discapacidades.filter((_, j) => j !== i) });
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

// ═══ Step 6: Review ══════════════════════════════════════════════════════════

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
    data.ingreso.quien_solicita_ingreso ||
    data.docs.length > 0 ||
    data.adultos.length > 0 ||
    data.consumo.length > 0 ||
    data.discapacidades.length > 0;

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

          {data.ingreso.quien_solicita_ingreso && (
            <section>
              <h4 className="text-sm font-medium mb-2">Ingreso</h4>
              <p className="text-sm text-muted-foreground">{data.ingreso.quien_solicita_ingreso} — {data.ingreso.tribunal || "Sin tribunal"} — {data.ingreso.causales.length} causales, {data.ingreso.derechos.length} derechos</p>
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

          {data.adultos.length > 0 && (
            <section>
              <h4 className="text-sm font-medium mb-2">Adultos ({data.adultos.length})</h4>
              <div className="flex flex-wrap gap-1">
                {data.adultos.map((a, i) => (
                  <Badge key={i} variant="secondary">
                    {a.nombre || "Sin nombre"}{a.parentesco ? ` (${a.parentesco})` : ""}
                    {a.es_adulto_responsable ? " · Responsable" : ""}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {(data.consumo.length > 0 || data.discapacidades.length > 0) && (
            <section>
              <h4 className="text-sm font-medium mb-2">Antecedentes</h4>
              <p className="text-sm text-muted-foreground">
                {[
                  data.salud.establecimiento && "Salud",
                  data.escolar.establecimiento && "Escolar",
                  data.consumo.length > 0 && `${data.consumo.length} consumo`,
                  data.discapacidades.length > 0 && `${data.discapacidades.length} discapacidades`,
                ].filter(Boolean).join(" · ") || "—"}
              </p>
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

  const goNext = () => setStep((s) => Math.min(s + 1, 5) as StepIndex);
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
      if (ing.quien_solicita_ingreso || ing.fecha_ingreso_residencia || ing.causales.length > 0 || ing.derechos.length > 0) {
        const ingreso = await api.antecedenteIngreso.create(idNna, {
          fecha_ingreso_residencia: fmt(ing.fecha_ingreso_residencia),
          quien_solicita_ingreso: ing.quien_solicita_ingreso || null,
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

      // 4. Create Familiares + link to NNA via VinculoFamiliar
      if (data.adultos.length > 0) {
        const fam = await api.antecedenteFamiliar.create(idNna, {
          fecha_antecedente_familiar: new Date().toISOString().split("T")[0],
        });
        for (const a of data.adultos) {
          const familiar = await api.familiares.create({
            nombre: a.nombre || null,
            run: a.run || null,
            fecha_nacimiento: fmt(a.fecha_nacimiento),
            direccion: a.direccion || null,
            numero_telefono: a.numero_telefono || null,
            tiene_antecedentes_penales: a.tiene_antecedentes_penales,
          });
          await api.vinculoFamiliar.create(fam.id_antecedente_familiar, {
            id_familiar: familiar.id_familiar,
            parentesco: a.parentesco || null,
            es_adulto_responsable: a.es_adulto_responsable,
          });
          for (const ant of a.antecedentes) {
            await api.antecedentesPenales.create(familiar.id_familiar, {
              descripcion: ant.descripcion || null,
            });
          }
        }
      }

      // 5. Create Antecedentes
      if (data.salud.establecimiento || data.salud.prevision || data.salud.inscrito_en_consultorio) {
        await api.antecedenteSalud.create(idNna, {
          fecha_antecedente_salud: new Date().toISOString().split("T")[0],
          inscrito_en_consultorio: data.salud.inscrito_en_consultorio,
          establecimiento: data.salud.establecimiento || null,
          prevision: data.salud.prevision || null,
        });
      }
      if (data.escolar.establecimiento || data.escolar.escolarizado) {
        await api.antecedenteEscolar.create(idNna, {
          fecha_antecedente_escolar: new Date().toISOString().split("T")[0],
          escolarizado: data.escolar.escolarizado,
          establecimiento: data.escolar.establecimiento || null,
          ultimo_ano_curso: data.escolar.ultimo_ano_curso ? Number(data.escolar.ultimo_ano_curso) : null,
        });
      }
      for (const c of data.consumo) {
        await api.historialConsumoNNA.create(idNna, {
          nombre_sustancia: c.nombre_sustancia || null,
          consumo_indirecto_gestacional: c.consumo_indirecto_gestacional,
          estado_consumo: c.estado_consumo || null,
          fecha_inicio: fmt(c.fecha_inicio),
          fecha_termino: null,
          en_tratamiento: c.en_tratamiento,
        });
      }
      for (const d of data.discapacidades) {
        await api.discapacidadNNA.create(idNna, {
          tipo: d.tipo || null,
          porcentaje_grado: d.porcentaje_grado || null,
          observacion: d.observacion || null,
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
      {step === 3 && <StepAdultos data={data} onData={setData} onBack={goBack} onNext={goNext} />}
      {step === 4 && <StepAntecedentes data={data} onData={setData} onBack={goBack} onNext={goNext} />}
      {step === 5 && <StepReview data={data} onBack={goBack} submitting={submitting} onSubmit={handleSubmit} error={error} />}
    </div>
  );
}
