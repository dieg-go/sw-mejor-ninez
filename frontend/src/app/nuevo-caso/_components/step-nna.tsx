"use client";

import { ArrowRightIcon } from "lucide-react";
import type { NNACreate } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { DateField } from "./date-field";
import type { WizardData } from "./types";

export function StepNNA({ data, onData, onNext }: { data: WizardData; onData: (d: WizardData) => void; onNext: () => void }) {
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
            {/* <Field>
              <FieldLabel htmlFor="nna-poblacion">Población o Villa</FieldLabel>
              <Input id="nna-poblacion" value={data.nna.poblacion_o_villa ?? ""} onChange={setField("poblacion_o_villa")} placeholder="Población o villa" />
            </Field> */}
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
