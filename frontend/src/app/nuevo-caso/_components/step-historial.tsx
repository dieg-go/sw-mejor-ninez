"use client";

import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { CATALOGO_PROGRAMAS_PREVIOS, CATALOGO_MOTIVO_EGRESO } from "@/lib/catalogos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateField } from "./date-field";
import type { WizardData } from "./types";

export function StepHistorial({ data, onData, onBack, onNext }: { data: WizardData; onData: (d: WizardData) => void; onBack: () => void; onNext: () => void }) {
  const addEntry = () => onData({
    ...data,
    historial: [...data.historial, { nombre_programa: "", nombre_programa_otro: "", fecha_ingreso: null, fecha_egreso: null, motivo_egreso: "", motivo_egreso_otro: "" }],
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
                  <Select value={h.nombre_programa || "none"} onValueChange={(v) => {
                    const hs = [...data.historial]; hs[i] = { ...hs[i], nombre_programa: v === "none" ? "" : v, nombre_programa_otro: v === "Otro" ? hs[i].nombre_programa_otro : "" }; onData({ ...data, historial: hs });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar programa..." /></SelectTrigger>
                    <SelectContent>
                      {CATALOGO_PROGRAMAS_PREVIOS.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {h.nombre_programa === "Otro" && (
                    <Input
                      className="mt-2"
                      placeholder="Especificar programa..."
                      value={h.nombre_programa_otro}
                      onChange={(e) => {
                        const hs = [...data.historial]; hs[i] = { ...hs[i], nombre_programa_otro: e.target.value }; onData({ ...data, historial: hs });
                      }}
                    />
                  )}
                </Field>
                <DateField label="Fecha de ingreso" value={h.fecha_ingreso} onChange={(d) => {
                  const hs = [...data.historial]; hs[i] = { ...hs[i], fecha_ingreso: d ?? null }; onData({ ...data, historial: hs });
                }} />
                <DateField label="Fecha de egreso" value={h.fecha_egreso} onChange={(d) => {
                  const hs = [...data.historial]; hs[i] = { ...hs[i], fecha_egreso: d ?? null }; onData({ ...data, historial: hs });
                }} />
                <Field className="sm:col-span-2">
                  <FieldLabel>Motivo de egreso</FieldLabel>
                  <Select value={h.motivo_egreso || "none"} onValueChange={(v) => {
                    const hs = [...data.historial]; hs[i] = { ...hs[i], motivo_egreso: v === "none" ? "" : v, motivo_egreso_otro: v === "Otro" ? hs[i].motivo_egreso_otro : "" }; onData({ ...data, historial: hs });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar motivo..." /></SelectTrigger>
                    <SelectContent>
                      {CATALOGO_MOTIVO_EGRESO.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {h.motivo_egreso === "Otro" && (
                    <Input
                      className="mt-2"
                      placeholder="Especificar motivo..."
                      value={h.motivo_egreso_otro}
                      onChange={(e) => {
                        const hs = [...data.historial]; hs[i] = { ...hs[i], motivo_egreso_otro: e.target.value }; onData({ ...data, historial: hs });
                      }}
                    />
                  )}
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
