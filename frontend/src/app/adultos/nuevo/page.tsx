"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, CalendarIcon } from "lucide-react";
import { api, type NNA } from "@/lib/api";
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
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

function fmt(d: Date | null): string | null {
  if (!d) return null;
  return d.toISOString().split("T")[0];
}

function DateField({ label, value, onChange }: { label?: string; value: Date | null; onChange: (d: Date | undefined) => void }) {
  return (
    <Field>
      {label && <FieldLabel>{label}</FieldLabel>}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}>
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

// ═══ Antecedentes penales ═══════════════════════════════════════════════════

function PenalesSection({
  items,
  onChange,
}: {
  items: string[];
  onChange: (d: string[]) => void;
}) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium">Antecedentes penales</h4>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, ""])}>
          + Agregar
        </Button>
      </div>
      {items.length === 0 && <p className="text-sm text-muted-foreground">Sin antecedentes.</p>}
      {items.map((desc, i) => (
        <div key={i} className="flex items-center gap-2 mb-2">
          <Input
            placeholder="Descripción del antecedente"
            value={desc}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
          <Button type="button" variant="ghost" size="sm" className="text-destructive shrink-0" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            ×
          </Button>
        </div>
      ))}
    </div>
  );
}

// ═══ Consumo ═════════════════════════════════════════════════════════════════

interface ConsumoEntry {
  nombre_sustancia: string;
  estado_consumo: string;
  fecha_inicio: Date | null;
  en_tratamiento: boolean;
}

function ConsumoSection({
  items,
  onChange,
}: {
  items: ConsumoEntry[];
  onChange: (d: ConsumoEntry[]) => void;
}) {
  const add = () => onChange([...items, { nombre_sustancia: "", estado_consumo: "", fecha_inicio: null, en_tratamiento: false }]);

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium">Historial de consumo</h4>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          + Agregar
        </Button>
      </div>
      {items.length === 0 && <p className="text-sm text-muted-foreground">Sin registros de consumo.</p>}
      {items.map((c, i) => (
        <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 p-3 border rounded-lg">
          <Input
            placeholder="Sustancia"
            value={c.nombre_sustancia}
            onChange={(e) => {
              const cs = [...items]; cs[i] = { ...cs[i], nombre_sustancia: e.target.value }; onChange(cs);
            }}
          />
          <Select value={c.estado_consumo} onValueChange={(v) => { const cs = [...items]; cs[i] = { ...cs[i], estado_consumo: v }; onChange(cs); }}>
            <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Activo">Activo</SelectItem>
              <SelectItem value="Inactivo">Inactivo</SelectItem>
              <SelectItem value="En tratamiento">En tratamiento</SelectItem>
            </SelectContent>
          </Select>
          <DateField value={c.fecha_inicio} onChange={(d) => { const cs = [...items]; cs[i] = { ...cs[i], fecha_inicio: d ?? null }; onChange(cs); }} />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={c.en_tratamiento} onCheckedChange={(v) => { const cs = [...items]; cs[i] = { ...cs[i], en_tratamiento: !!v }; onChange(cs); }} />
              En tratamiento
            </label>
            <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              ×
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══ Discapacidades ══════════════════════════════════════════════════════════

interface DiscapacidadEntry {
  tipo: string;
  porcentaje_grado: number;
  observacion: string;
}

function DiscapacidadSection({
  items,
  onChange,
}: {
  items: DiscapacidadEntry[];
  onChange: (d: DiscapacidadEntry[]) => void;
}) {
  const add = () => onChange([...items, { tipo: "", porcentaje_grado: 0, observacion: "" }]);

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium">Discapacidades</h4>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          + Agregar
        </Button>
      </div>
      {items.length === 0 && <p className="text-sm text-muted-foreground">Sin discapacidades registradas.</p>}
      {items.map((d, i) => (
        <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3 p-3 border rounded-lg">
          <Input
            placeholder="Tipo"
            value={d.tipo}
            onChange={(e) => {
              const ds = [...items]; ds[i] = { ...ds[i], tipo: e.target.value }; onChange(ds);
            }}
          />
          <Input
            type="number"
            placeholder="Porcentaje (%)"
            value={d.porcentaje_grado || ""}
            onChange={(e) => {
              const ds = [...items]; ds[i] = { ...ds[i], porcentaje_grado: Number(e.target.value) }; onChange(ds);
            }}
          />
          <div className="flex items-center gap-2">
            <Input
              placeholder="Observación"
              value={d.observacion}
              onChange={(e) => {
                const ds = [...items]; ds[i] = { ...ds[i], observacion: e.target.value }; onChange(ds);
              }}
            />
            <Button type="button" variant="ghost" size="sm" className="text-destructive shrink-0" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              ×
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══ Main Page ═══════════════════════════════════════════════════════════════

export default function NuevoAdultoPage() {
  const router = useRouter();

  // Form state
  const [nombre, setNombre] = useState("");
  const [run, setRun] = useState("");
  const [fechaNac, setFechaNac] = useState<Date | null>(null);
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [tienePenales, setTienePenales] = useState(false);
  const [penales, setPenales] = useState<string[]>([]);
  const [consumo, setConsumo] = useState<ConsumoEntry[]>([]);
  const [discapacidades, setDiscapacidades] = useState<DiscapacidadEntry[]>([]);

  // NNA linking
  const [nnaList, setNnaList] = useState<NNA[]>([]);
  const [linkNna, setLinkNna] = useState(false);
  const [nnaId, setNnaId] = useState<string>("");
  const [parentesco, setParentesco] = useState("");
  const [esResponsable, setEsResponsable] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.nna.list(0, 500).then(setNnaList).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // 1. Create familiar
      const familiar = await api.familiares.create({
        nombre: nombre || null,
        run: run || null,
        fecha_nacimiento: fmt(fechaNac),
        direccion: direccion || null,
        numero_telefono: telefono || null,
        tiene_antecedentes_penales: tienePenales || penales.length > 0,
      });
      const idFamiliar = familiar.id_familiar;

      // 2. Antecedentes penales
      for (const desc of penales) {
        if (desc.trim()) {
          await api.antecedentesPenales.create(idFamiliar, { descripcion: desc });
        }
      }

      // 3. Consumo
      for (const c of consumo) {
        if (c.nombre_sustancia.trim() || c.estado_consumo) {
          await api.historialConsumoAdulto.create(idFamiliar, {
            nombre_sustancia: c.nombre_sustancia || null,
            estado_consumo: c.estado_consumo || null,
            fecha_inicio: fmt(c.fecha_inicio),
            fecha_termino: null,
            en_tratamiento: c.en_tratamiento,
          });
        }
      }

      // 4. Discapacidades
      for (const d of discapacidades) {
        if (d.tipo.trim()) {
          await api.discapacidadAdulto.create(idFamiliar, {
            tipo: d.tipo || null,
            porcentaje_grado: d.porcentaje_grado || null,
            observacion: d.observacion || null,
          });
        }
      }

      // 5. Link to NNA if requested
      if (linkNna && nnaId) {
        const fam = await api.antecedenteFamiliar.create(nnaId, {
          fecha_antecedente_familiar: new Date().toISOString().split("T")[0],
        });
        await api.vinculoFamiliar.create(fam.id_antecedente_familiar, {
          id_familiar: idFamiliar,
          parentesco: parentesco || null,
          es_adulto_responsable: esResponsable,
        });
      }

      router.push(`/adultos/${idFamiliar}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el familiar");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-4">
        <Link href="/adultos" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeftIcon /> Volver al listado
        </Link>
      </div>

      <h1 className="text-2xl font-semibold mb-6">Nuevo familiar</h1>

      <form onSubmit={handleSubmit}>
        <FieldGroup>
          {/* Datos básicos */}
          <Card>
            <CardHeader>
              <CardTitle>Datos básicos</CardTitle>
              <CardDescription>Información del familiar.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="ad-nombre">Nombre</FieldLabel>
                  <Input id="ad-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="ad-run">RUN</FieldLabel>
                  <Input id="ad-run" value={run} onChange={(e) => setRun(e.target.value)} placeholder="12.345.678-9" />
                </Field>
                <DateField label="Fecha de nacimiento" value={fechaNac} onChange={(d) => setFechaNac(d ?? null)} />
                <Field>
                  <FieldLabel htmlFor="ad-tel">Teléfono</FieldLabel>
                  <Input id="ad-tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+569..." />
                </Field>
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="ad-dir">Dirección</FieldLabel>
                  <Input id="ad-dir" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Dirección" />
                </Field>
              </div>
            </CardContent>
          </Card>

          {/* Vincular a NNA */}
          <Card>
            <CardHeader>
              <CardTitle>Vincular a NNA</CardTitle>
              <CardDescription>Opcional — asocia este familiar a un niño, niña o adolescente existente.</CardDescription>
            </CardHeader>
            <CardContent>
              <label className="flex items-center gap-2 text-sm mb-4">
                <Checkbox checked={linkNna} onCheckedChange={(v) => setLinkNna(!!v)} />
                Vincular a un NNA al crear
              </label>
              {linkNna && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6 border-l-2">
                  <Field>
                    <FieldLabel>NNA</FieldLabel>
                    <Select value={nnaId} onValueChange={setNnaId}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar NNA" /></SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {nnaList.map((n) => (
                            <SelectItem key={n.id_nna} value={n.id_nna}>
                              {n.nombre || "Sin nombre"} {n.run ? `(${n.run})` : ""}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel>Parentesco</FieldLabel>
                    <Input value={parentesco} onChange={(e) => setParentesco(e.target.value)} placeholder="Madre / Padre / Tío..." />
                  </Field>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={esResponsable} onCheckedChange={(v) => setEsResponsable(!!v)} />
                    Es adulto responsable
                  </label>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Antecedentes penales */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Antecedentes penales</CardTitle>
                {tienePenales && <Badge variant="destructive">Sí</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              <label className="flex items-center gap-2 text-sm mb-4">
                <Checkbox checked={tienePenales} onCheckedChange={(v) => setTienePenales(!!v)} />
                Tiene antecedentes penales
              </label>
              {tienePenales && <PenalesSection items={penales} onChange={setPenales} />}
            </CardContent>
          </Card>

          {/* Consumo */}
          <Card>
            <CardHeader>
              <CardTitle>Historial de consumo</CardTitle>
              <CardDescription>Registro de consumo de sustancias.</CardDescription>
            </CardHeader>
            <CardContent>
              <ConsumoSection items={consumo} onChange={setConsumo} />
            </CardContent>
          </Card>

          {/* Discapacidades */}
          <Card>
            <CardHeader>
              <CardTitle>Discapacidades</CardTitle>
              <CardDescription>Registro de discapacidades del adulto.</CardDescription>
            </CardHeader>
            <CardContent>
              <DiscapacidadSection items={discapacidades} onChange={setDiscapacidades} />
            </CardContent>
          </Card>

          {error && <FieldError>{error}</FieldError>}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting && <Spinner data-icon="inline-start" />}
              {submitting ? "Guardando..." : "Guardar adulto"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/adultos">Cancelar</Link>
            </Button>
          </div>
        </FieldGroup>
      </form>
    </div>
  );
}
