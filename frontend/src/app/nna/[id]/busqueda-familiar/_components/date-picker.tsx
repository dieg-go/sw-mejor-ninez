"use client";

import { useId } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDate } from "./utils";

export function DatePicker({
  value,
  onChange,
  label,
}: {
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
  label: string;
}) {
  // `id` unico por instancia: el selector de fecha se usa dos veces en el
  // formulario de envio de cartas y en el formulario de respuesta.
  const id = useId();
  return (
    <div className="space-y-1.5 w-full">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button id={id} variant="outline" className={cn("w-full justify-start text-left font-normal text-xs", !value && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {value ? formatDate(value.toISOString().split("T")[0]) : "Seleccionar fecha"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value} onSelect={onChange} />
        </PopoverContent>
      </Popover>
    </div>
  );
}
