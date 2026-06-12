"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, CalendarIcon, UploadIcon } from "lucide-react";
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

interface PenalEntry {
  descripcion: string;
  url_adjunto: string;
}

function PenalesSection({
  items,
  onChange,
  uploadingIdx,
  uploadError,
  onUpload,
}: {
  items: PenalEntry[];
  onChange: (d: PenalEntry[]) => void;
  uploadingIdx: number | null;
  uploadError: string | null;
  onUpload: (file: File, idx: number) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingIdx, setPendingIdx] = useState<number | null>(null);

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium">Antecedentes penales</h4>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { descripcion: "", url_adjunto: "" }])}>
          + Agregar
        </Button>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && pendingIdx !== null) onUpload(file, pendingIdx);
          e.target.value = "";
        }}
      />
      {items.length === 0 && <p className="text-sm text-muted-foreground">Sin antecedentes.</p>}
      {uploadError && <p className="text-destructive text-xs mb-2">{uploadError}</p>}
      {items.map((entry, i) => (
        <div key={i} className="space-y-2 mb-3 p-3 border rounded-lg">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Descripción del antecedente"
              value={entry.descripcion}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...next[i], descripcion: e.target.value };
                onChange(next);
              }}
            />
            <Button type="button" variant="ghost" size="sm" className="text-destructive shrink-0" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              ×
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadingIdx === i}
              onClick={() => { setPendingIdx(i); fileInputRef.current?.click(); }}
            >
              <UploadIcon className="size-4 mr-1" />
              {entry.url_adjunto ? "Cambiar archivo" : "Subir archivo"}
            </Button>
            {uploadingIdx === i && <Spinner className="size-4" />}
            {entry.url_adjunto && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={entry.url_adjunto}>
                {entry.url_adjunto.split("/").pop()}
              </span>
            )}
          </div>
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

export default function NuevoFamiliarPage() {
  const router = useRouter();

  // Form state
  const [nombre, setNombre] = useState("");
  const [run, setRun] = useState("");
  const [fechaNac, setFechaNac] = useState<Date | null>(null);
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [tienePenales, setTienePenales] = useState(false);
  const [penales, setPenales] = useState<PenalEntry[]>([]);
  const [penalesUploading, setPenalesUploading] = useState<number | null>(null);
  const [penalesUploadError, setPenalesUploadError] = useState<string | null>(null);
  const [consumo, setConsumo] = useState<ConsumoEntry[]>([]);
  const [discapacidades, setDiscapacidades] = useState<DiscapacidadEntry[]>([]);

  // NNA linking
  const [nnaList, setNnaList] = useState<NNA[]>([]);
  const [nnaId, setNnaId] = useState<string>("");
  const [parentesco, setParentesco] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.nna.list(0, 500).then(setNnaList).catch(() => {});
  }, []);

  const handlePenalUpload = async (file: File, idx: number) => {
    setPenalesUploading(idx);
    setPenalesUploadError(null);
    try {
      const result = await api.upload.docs(file);
      setPenales((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], url_adjunto: result.url };
        return next;
      });
    } catch (e: unknown) {
      setPenalesUploadError(e instanceof Error ? e.message : "Error al subir archivo");
    } finally {
      setPenalesUploading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (!nnaId) {
      setError("Debe seleccionar un NNA para vincular al familiar");
      setSubmitting(false);
      return;
    }

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
      for (const p of penales) {
        if (p.descripcion.trim() || p.url_adjunto) {
          await api.antecedentesPenales.create(idFamiliar, {
            descripcion: p.descripcion.trim() || null,
            url_documento_adjunto: p.url_adjunto || null,
          });
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

      // 5. Link to NNA
      await api.antecedenteFamiliar.create(nnaId, {
        fecha_antecedente_familiar: new Date().toISOString().split("T")[0],
        id_adulto_responsable: null,
        con_quien_vive: null,
        con_quien_vive_detalle: null,
      });
      await api.vinculoFamiliar.create(nnaId, {
        id_familiar: idFamiliar,
        parentesco: parentesco || null,
      });

      router.push(`/familiar/${idFamiliar}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el familiar");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-4">
        <Link href="/familiar" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
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
                  <FieldLabel htmlFor="fa-nombre">Nombre</FieldLabel>
                  <Input id="fa-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="fa-run">RUN</FieldLabel>
                  <Input id="fa-run" value={run} onChange={(e) => setRun(e.target.value)} placeholder="12.345.678-9" />
                </Field>
                <DateField label="Fecha de nacimiento" value={fechaNac} onChange={(d) => setFechaNac(d ?? null)} />
                <Field>
                  <FieldLabel htmlFor="fa-tel">Teléfono</FieldLabel>
                  <Input id="fa-tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+569..." />
                </Field>
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="fa-dir">Dirección</FieldLabel>
                  <Input id="fa-dir" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Dirección" />
                </Field>
              </div>
            </CardContent>
          </Card>

          {/* Vincular a NNA */}
          <Card>
            <CardHeader>
              <CardTitle>Vincular a NNA</CardTitle>
              <CardDescription>Asocia este familiar a un niño, niña o adolescente existente.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              </div>
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
              {tienePenales && (
                <PenalesSection
                  items={penales}
                  onChange={setPenales}
                  uploadingIdx={penalesUploading}
                  uploadError={penalesUploadError}
                  onUpload={handlePenalUpload}
                />
              )}
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
              <CardDescription>Registro de discapacidades del familiar.</CardDescription>
            </CardHeader>
            <CardContent>
              <DiscapacidadSection items={discapacidades} onChange={setDiscapacidades} />
            </CardContent>
          </Card>

          {error && <FieldError>{error}</FieldError>}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting && <Spinner data-icon="inline-start" />}
              {submitting ? "Guardando..." : "Guardar familiar"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/familiar">Cancelar</Link>
            </Button>
          </div>
        </FieldGroup>
      </form>
    </div>
  );
}
