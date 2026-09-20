import { CalendarIcon } from "lucide-react";
import type { SolicitanteIngreso } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface IngresoFormData {
  fecha_ingreso_residencia: string;
  id_solicitante_ingreso: string;
  orden_tribunal: boolean;
  fecha_causa: string;
  tribunal: string;
  materia: string;
  codigo_rit: string;
  codigo_ruc: string;
}

interface IngresoFormFieldsProps {
  form: IngresoFormData;
  setForm: (updater: (prev: IngresoFormData) => IngresoFormData) => void;
  fechaIngreso: Date | undefined;
  setFechaIngreso: (d: Date | undefined) => void;
  fechaCausa: Date | undefined;
  setFechaCausa: (d: Date | undefined) => void;
  solicitantes: SolicitanteIngreso[];
  idPrefix: string;
}

export function IngresoFormFields({
  form,
  setForm,
  fechaIngreso,
  setFechaIngreso,
  fechaCausa,
  setFechaCausa,
  solicitantes,
  idPrefix,
}: IngresoFormFieldsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <Label htmlFor={`${idPrefix}-fecha-ingreso-residencia`} className="text-xs">
          Fecha ingreso residencia
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id={`${idPrefix}-fecha-ingreso-residencia`}
              variant="outline"
              size="sm"
              className={cn(
                "w-full justify-start text-left font-normal mt-1",
                !fechaIngreso && "text-muted-foreground"
              )}
            >
              <CalendarIcon />
              {fechaIngreso ? fechaIngreso.toLocaleDateString("es-CL") : "Seleccionar"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={fechaIngreso} onSelect={setFechaIngreso} />
          </PopoverContent>
        </Popover>
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-solicitante`} className="text-xs">Quién solicita ingreso</Label>
        <Select
          value={form.id_solicitante_ingreso || "none"}
          onValueChange={(v) =>
            setForm((prev) => ({ ...prev, id_solicitante_ingreso: v === "none" ? "" : v }))
          }
        >
          <SelectTrigger id={`${idPrefix}-solicitante`} className="mt-1">
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Ninguno</SelectItem>
            {solicitantes.map((s) => (
              <SelectItem key={s.id_solicitante_ingreso} value={s.id_solicitante_ingreso}>
                {s.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2 pt-2">
        <Checkbox
          id={`${idPrefix}-orden-tribunal`}
          checked={form.orden_tribunal}
          onCheckedChange={(v) => setForm((prev) => ({ ...prev, orden_tribunal: !!v }))}
        />
        <Label htmlFor={`${idPrefix}-orden-tribunal`} className="text-xs cursor-pointer">
          Orden de tribunal
        </Label>
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-tribunal`} className="text-xs">Tribunal</Label>
        <Input
          id={`${idPrefix}-tribunal`}
          className="mt-1"
          value={form.tribunal}
          onChange={(e) => setForm((prev) => ({ ...prev, tribunal: e.target.value }))}
          placeholder="Tribunal"
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-fecha-causa`} className="text-xs">Fecha causa</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id={`${idPrefix}-fecha-causa`}
              variant="outline"
              size="sm"
              className={cn(
                "w-full justify-start text-left font-normal mt-1",
                !fechaCausa && "text-muted-foreground"
              )}
            >
              <CalendarIcon />
              {fechaCausa ? fechaCausa.toLocaleDateString("es-CL") : "Seleccionar"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={fechaCausa} onSelect={setFechaCausa} />
          </PopoverContent>
        </Popover>
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-materia`} className="text-xs">Materia</Label>
        <Input
          id={`${idPrefix}-materia`}
          className="mt-1"
          value={form.materia}
          onChange={(e) => setForm((prev) => ({ ...prev, materia: e.target.value }))}
          placeholder="Materia"
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-codigo-rit`} className="text-xs">Código RIT</Label>
        <Input
          id={`${idPrefix}-codigo-rit`}
          className="mt-1"
          value={form.codigo_rit}
          onChange={(e) => setForm((prev) => ({ ...prev, codigo_rit: e.target.value }))}
          placeholder="RIT"
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-codigo-ruc`} className="text-xs">Código RUC</Label>
        <Input
          id={`${idPrefix}-codigo-ruc`}
          className="mt-1"
          value={form.codigo_ruc}
          onChange={(e) => setForm((prev) => ({ ...prev, codigo_ruc: e.target.value }))}
          placeholder="RUC"
        />
      </div>
    </div>
  );
}
