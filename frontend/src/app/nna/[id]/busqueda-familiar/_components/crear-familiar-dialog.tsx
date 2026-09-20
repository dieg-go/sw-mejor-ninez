"use client";

import { useId, useState } from "react";
import { 
  CalendarIcon, 
  Plus, 
  Trash2, 
  UserPlus, 
  AlertCircle,
  Activity,
  User,
  ShieldAlert
} from "lucide-react";
import { api, type Familiar } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Field, FieldLabel, FieldGroup, FieldError } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { FileUpload } from "@/components/ui/file-upload";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Formateador de RUT chileno (asiste al usuario al escribir)
function formatRun(value: string) {
  const clean = value.replace(/[^0-9kK]/g, "");
  if (!clean) return "";
  const dv = clean.slice(-1).toUpperCase();
  const body = clean.slice(0, -1);
  if (!body) return dv;
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${formattedBody}-${dv}`;
}

function fmt(d: Date | null): string | null {
  if (!d) return null;
  return d.toISOString().split("T")[0];
}

function DateField({ label, value, onChange }: { label?: string; value: Date | null; onChange: (d: Date | undefined) => void }) {
  // No es el `DateField` compartido: conserva sus propias clases. El boton que
  // abre el calendario es el control etiquetable y recibe el id.
  const id = useId();
  return (
    <Field>
      {label && <FieldLabel htmlFor={id} className="text-sm font-medium mb-1">{label}</FieldLabel>}
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            id={id}
            variant="outline" 
            className={cn("w-full justify-start text-left font-normal border-input", !value && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
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

interface PenalEntry {
  descripcion: string;
  url_adjunto: string;
}

function PenalesSection({
  items,
  onChange,
}: {
  items: PenalEntry[];
  onChange: (d: PenalEntry[]) => void;
}) {
  return (
    <div className="space-y-3 bg-muted/30 border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Listado de Antecedentes</span>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={() => onChange([...items, { descripcion: "", url_adjunto: "" }])}
          className="gap-1"
        >
          <Plus className="h-4 w-4" /> Agregar detalle
        </Button>
      </div>
      
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4 bg-background border border-dashed rounded-md">
          Haga clic en agregar para registrar un antecedente penal.
        </p>
      )}

      {items.map((entry, i) => (
        <div key={i} className="space-y-3 p-3 bg-background border rounded-lg shadow-sm relative">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <Input
                placeholder="Descripción del antecedente (ej: Causa pendiente)"
                value={entry.descripcion}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], descripcion: e.target.value };
                  onChange(next);
                }}
              />
            </div>
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              aria-label={`Eliminar antecedente penal${entry.descripcion ? `: ${entry.descripcion}` : ""}`}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 h-9 w-9" 
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <FileUpload
            label="Documento de respaldo"
            value={entry.url_adjunto || null}
            onUploadSuccess={(url) => {
              const next = [...items];
              next[i] = { ...next[i], url_adjunto: url };
              onChange(next);
            }}
            onClear={() => {
              const next = [...items];
              next[i] = { ...next[i], url_adjunto: "" };
              onChange(next);
            }}
          />
        </div>
      ))}
    </div>
  );
}

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
  // Los registros no traen id propio (son filas locales del formulario), asi que
  // el id del checkbox se arma con el id unico de la seccion mas el indice.
  const tratamientoId = useId();
  const add = () => onChange([...items, { nombre_sustancia: "", estado_consumo: "", fecha_inicio: null, en_tratamiento: false }]);

  return (
    <div className="space-y-3 bg-muted/30 border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sustancias Registradas</span>
        <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1">
          <Plus className="h-4 w-4" /> Agregar registro
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4 bg-background border border-dashed rounded-md">
          Sin registros de consumo añadidos.
        </p>
      )}

      {items.map((c, i) => (
        <div key={i} className="p-3 bg-background border rounded-lg shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              placeholder="Sustancia (ej: Alcohol, Tabaco)"
              value={c.nombre_sustancia}
              onChange={(e) => {
                const cs = [...items]; cs[i] = { ...cs[i], nombre_sustancia: e.target.value }; onChange(cs);
              }}
            />
            <Select value={c.estado_consumo} onValueChange={(v) => { const cs = [...items]; cs[i] = { ...cs[i], estado_consumo: v }; onChange(cs); }}>
              <SelectTrigger><SelectValue placeholder="Estado de consumo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Activo">Activo</SelectItem>
                <SelectItem value="Inactivo">Inactivo</SelectItem>
                <SelectItem value="En tratamiento">En tratamiento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
            <DateField value={c.fecha_inicio} onChange={(d) => { const cs = [...items]; cs[i] = { ...cs[i], fecha_inicio: d ?? null }; onChange(cs); }} />
            <div className="flex items-center justify-between border rounded-md px-3 h-10 bg-muted/10">
              <label htmlFor={`${tratamientoId}-${i}`} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <Checkbox id={`${tratamientoId}-${i}`} checked={c.en_tratamiento} onCheckedChange={(v) => { const cs = [...items]; cs[i] = { ...cs[i], en_tratamiento: !!v }; onChange(cs); }} />
                En tratamiento activo
              </label>
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                aria-label={`Eliminar registro de consumo${c.nombre_sustancia ? `: ${c.nombre_sustancia}` : ""}`}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8" 
                onClick={() => onChange(items.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

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
    <div className="space-y-3 bg-muted/30 border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Discapacidades Declaradas</span>
        <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1">
          <Plus className="h-4 w-4" /> Agregar registro
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4 bg-background border border-dashed rounded-md">
          Sin discapacidades ingresadas.
        </p>
      )}

      {items.map((d, i) => (
        <div key={i} className="p-3 bg-background border rounded-lg shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <Input
                placeholder="Tipo de discapacidad (ej: Visual, Física)"
                value={d.tipo}
                onChange={(e) => {
                  const ds = [...items]; ds[i] = { ...ds[i], tipo: e.target.value }; onChange(ds);
                }}
              />
            </div>
            <Input
              type="number"
              placeholder="Grado (%)"
              max={100}
              min={0}
              value={d.porcentaje_grado || ""}
              onChange={(e) => {
                const ds = [...items]; ds[i] = { ...ds[i], porcentaje_grado: Number(e.target.value) }; onChange(ds);
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                placeholder="Observaciones adicionales"
                value={d.observacion}
                onChange={(e) => {
                  const ds = [...items]; ds[i] = { ...ds[i], observacion: e.target.value }; onChange(ds);
                }}
              />
            </div>
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              aria-label={`Eliminar discapacidad${d.tipo ? `: ${d.tipo}` : ""}`}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 h-9 w-9" 
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

interface CrearFamiliarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nnaId: string;
  onCreated: (familiar: Familiar, parentesco: string) => void;
}

export function CrearFamiliarDialog({ open, onOpenChange, nnaId, onCreated }: CrearFamiliarDialogProps) {
  const [nombre, setNombre] = useState("");
  const [run, setRun] = useState("");
  const [fechaNac, setFechaNac] = useState<Date | null>(null);
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [tienePenales, setTienePenales] = useState(false);
  const [penales, setPenales] = useState<PenalEntry[]>([]);
  const [consumo, setConsumo] = useState<ConsumoEntry[]>([]);
  const [discapacidades, setDiscapacidades] = useState<DiscapacidadEntry[]>([]);
  const [parentesco, setParentesco] = useState("");

  const penalesId = useId();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setNombre("");
    setRun("");
    setFechaNac(null);
    setDireccion("");
    setTelefono("");
    setTienePenales(false);
    setPenales([]);
    setConsumo([]);
    setDiscapacidades([]);
    setParentesco("");
    setError(null);
  };

  const handleRunChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRun(formatRun(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const familiar = await api.familiares.create({
        nombre: nombre || null,
        run: run || null,
        fecha_nacimiento: fmt(fechaNac),
        direccion: direccion || null,
        numero_telefono: telefono || null,
        tiene_antecedentes_penales: tienePenales || penales.length > 0,
      });
      const idFamiliar = familiar.id_familiar;

      for (const p of penales) {
        if (p.descripcion.trim() || p.url_adjunto) {
          await api.antecedentesPenales.create(idFamiliar, {
            descripcion: p.descripcion.trim() || null,
            url_documento_adjunto: p.url_adjunto || null,
          });
        }
      }

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

      for (const d of discapacidades) {
        if (d.tipo.trim()) {
          await api.discapacidadAdulto.create(idFamiliar, {
            tipo: d.tipo || null,
            porcentaje_grado: d.porcentaje_grado || null,
            observacion: d.observacion || null,
          });
        }
      }

      onCreated(familiar, parentesco);
      resetForm();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el familiar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl h-[90vh] md:h-auto max-h-[85vh] flex flex-col p-0 overflow-hidden">
        {/* Header Fijo */}
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <DialogTitle>Nuevo familiar</DialogTitle>
          </div>
          <DialogDescription>
            Complete los datos del familiar. Al guardar, quedará registrado y vinculado automáticamente a la búsqueda de este NNA.
          </DialogDescription>
        </DialogHeader>

        {/* Formulario con Scroll Interno */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <FieldGroup className="space-y-6">
            
            {/* Sección 1: Información de Identidad */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-medium text-sm">
                <User className="h-4 w-4" />
                <span>Información Personal y de Contacto</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/20 border rounded-lg p-4">
                <Field>
                  <FieldLabel htmlFor="cf-nombre">Nombre completo</FieldLabel>
                  <Input id="cf-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Juan Pérez" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="cf-run">RUN (RUT)</FieldLabel>
                  <Input id="cf-run" value={run} onChange={handleRunChange} placeholder="12.345.678-9" maxLength={12} />
                </Field>
                <DateField label="Fecha de nacimiento" value={fechaNac} onChange={(d) => setFechaNac(d ?? null)} />
                <Field>
                  <FieldLabel htmlFor="cf-tel">Teléfono</FieldLabel>
                  <Input id="cf-tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej: +56 9 1234 5678" />
                </Field>
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="cf-dir">Dirección particular</FieldLabel>
                  <Input id="cf-dir" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle, número, comuna" />
                </Field>
              </div>
            </div>

            {/* Sección 2: Relación */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-medium text-sm">
                <Activity className="h-4 w-4" />
                <span>Parentesco en el proceso</span>
              </div>
              <div className="bg-muted/20 border rounded-lg p-4">
                <Field>
                  <FieldLabel htmlFor="cf-parentesco">Parentesco declarado con el NNA</FieldLabel>
                  <Input id="cf-parentesco" value={parentesco} onChange={(e) => setParentesco(e.target.value)} placeholder="Ej: Abuelo materno, Tía paterna, Padre" />
                </Field>
              </div>
            </div>

            <Separator />

            {/* Sección 3: Antecedentes Penales */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary font-medium text-sm">
                  <ShieldAlert className="h-4 w-4" />
                  <span>Antecedentes Penales</span>
                </div>
                {tienePenales && <Badge variant="destructive">Registra Antecedentes</Badge>}
              </div>
              <div className="space-y-3">
                <label htmlFor={penalesId} className="flex items-center gap-2 text-sm font-medium border rounded-md p-3 cursor-pointer bg-muted/20 hover:bg-muted/30 transition-colors">
                  <Checkbox id={penalesId} checked={tienePenales} onCheckedChange={(v) => {
                    setTienePenales(!!v);
                    if (!v) setPenales([]); // Limpia la lista si se desmarca
                  }} />
                  ¿El familiar posee antecedentes penales vigentes?
                </label>
                {tienePenales && (
                  <PenalesSection items={penales} onChange={setPenales} />
                )}
              </div>
            </div>

            <Separator />

            {/* Sección 4: Historial de Consumo */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-medium text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>Historial de Consumo de Sustancias</span>
              </div>
              <ConsumoSection items={consumo} onChange={setConsumo} />
            </div>

            <Separator />

            {/* Sección 5: Discapacidades */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-medium text-sm">
                <Activity className="h-4 w-4" />
                <span>Discapacidades</span>
              </div>
              <DiscapacidadSection items={discapacidades} onChange={setDiscapacidades} />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
          </FieldGroup>
        </form>

        {/* Footer Fijo */}
        <div className="flex items-center justify-end gap-3 p-4 border-t bg-muted/10 shrink-0">
          <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" onClick={(e) => handleSubmit(e)} disabled={submitting} className="min-w-[140px]">
            {submitting ? (
              <>
                <Spinner className="mr-2 h-4 w-4" /> Guardando...
              </>
            ) : (
              "Guardar familiar"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}