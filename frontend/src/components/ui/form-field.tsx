"use client";

import { useId } from "react";
import { CalendarIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * Campos de formulario con la etiqueta asociada al control.
 *
 * Por que existen: en las paginas de listado la etiqueta era un `<Label>` suelto
 * al lado del `<Input>`, sin `htmlFor` ni `id`. Eso rompe dos cosas: un lector de
 * pantalla no puede anunciar el campo, y los tests no pueden consultar por
 * etiqueta (`getByLabelText`) y tienen que caer a `getByPlaceholderText`.
 *
 * Por que `useId()` y no ids fijos: en estas paginas conviven dos formularios con
 * los mismos campos (el de alta y el de edicion en linea de cada fila). Un id
 * fijo como `id="tipo"` colisionaria entre ambos. `useId()` da un id unico por
 * instancia sin tener que inventar prefijos a mano. El `id` se aplica al control
 * (input, textarea, trigger del select, boton del calendario) y el mismo valor va
 * al `htmlFor` de la etiqueta: `button` es un elemento etiquetable, asi que la
 * asociacion funciona igual para el disparador del calendario.
 *
 * Las clases se mantienen identicas a las que ya usaban las paginas
 * (`Label className="text-xs"`, `Input className="mt-1"`) para que el cambio sea
 * solo de accesibilidad y no mueva nada visualmente.
 */

interface BaseFieldProps {
  label: string;
  /** Clases del contenedor: la pagina las usa para el grid (`sm:col-span-2`). */
  className?: string;
}

// ─── Texto ────────────────────────────────────────────────────────────────────

export function TextField({
  label,
  className,
  ...props
}: BaseFieldProps & React.ComponentProps<typeof Input>) {
  const id = useId();
  return (
    <div className={className}>
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input id={id} className="mt-1" {...props} />
    </div>
  );
}

export function TextareaField({
  label,
  className,
  ...props
}: BaseFieldProps & React.ComponentProps<typeof Textarea>) {
  const id = useId();
  return (
    <div className={className}>
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Textarea id={id} className="mt-1" {...props} />
    </div>
  );
}

// ─── Fecha ────────────────────────────────────────────────────────────────────

export function DateField({
  label,
  value,
  onChange,
  className,
  disabled,
}: BaseFieldProps & {
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className={className}>
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            size="sm"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal mt-1",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarIcon />
            {value ? value.toLocaleDateString("es-CL") : "Seleccionar"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value} onSelect={onChange} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────

export function SelectField({
  label,
  className,
  placeholder = "Seleccionar",
  children,
  ...props
}: BaseFieldProps &
  Omit<React.ComponentProps<typeof Select>, "children"> & {
    placeholder?: string;
    /** Los `<SelectItem>` (y opcionalmente `<SelectGroup>`) del desplegable. */
    children: React.ReactNode;
  }) {
  const id = useId();
  return (
    <div className={className}>
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Select {...props}>
        <SelectTrigger id={id} className="mt-1">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}
