"use client";

import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import type { SolicitanteIngreso } from "@/lib/api";
import {
  CATALOGO_CAUSALES,
  CATALOGO_DERECHOS,
  detectTipoCausa,
} from "@/lib/catalogos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { DateField } from "./date-field";
import type { WizardData } from "./types";

export function StepIngreso({
  data,
  onData,
  onBack,
  onNext,
  solicitantes,
}: {
  data: WizardData;
  onData: (d: WizardData) => void;
  onBack: () => void;
  onNext: () => void;
  solicitantes: SolicitanteIngreso[];
}) {
  const ing = data.ingreso;
  const set = (f: Partial<typeof ing>) =>
    onData({ ...data, ingreso: { ...ing, ...f } });

  const addCausal = () =>
    set({
      causales: [
        ...ing.causales,
        { nombre_causal: "", descripcion_detallada: "", estado: "Activo" },
      ],
    });
  const addDerecho = () =>
    set({
      derechos: [...ing.derechos, { nombre_derecho: "", estado: "Vulnerado" }],
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Antecedentes de Ingreso</CardTitle>
        <CardDescription>
          Información sobre cómo y por qué ingresó el NNA al sistema.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DateField
              label="Fecha de ingreso a residencia"
              value={ing.fecha_ingreso_residencia}
              onChange={(d) => set({ fecha_ingreso_residencia: d ?? null })}
            />
            <Field>
              <FieldLabel htmlFor="ing-quien">
                Quién solicita el ingreso
              </FieldLabel>
              <Select
                value={ing.id_solicitante_ingreso || "none"}
                onValueChange={(v) =>
                  set({ id_solicitante_ingreso: v === "none" ? "" : v })
                }
              >
                <SelectTrigger id="ing-quien">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguno</SelectItem>
                  {solicitantes.map((s) => (
                    <SelectItem
                      key={s.id_solicitante_ingreso}
                      value={s.id_solicitante_ingreso}
                    >
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <DateField
              label="Fecha de la causa"
              value={ing.fecha_causa}
              onChange={(d) => set({ fecha_causa: d ?? null })}
            />
            <Field>
              <FieldLabel htmlFor="ing-tribunal">Tribunal</FieldLabel>
              <Input
                id="ing-tribunal"
                value={ing.tribunal}
                onChange={(e) => set({ tribunal: e.target.value })}
                placeholder="Tribunal"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="ing-materia">Materia</FieldLabel>
              <Input
                id="ing-materia"
                value={ing.materia}
                onChange={(e) => set({ materia: e.target.value })}
                placeholder="Materia"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="ing-rit">Código RIT</FieldLabel>
              <Input
                id="ing-rit"
                value={ing.codigo_rit}
                onChange={(e) => set({ codigo_rit: e.target.value })}
                placeholder="RIT"
              />
              {detectTipoCausa(ing.codigo_rit) && (
                <p className="text-xs text-muted-foreground mt-1">
                  <Badge variant="secondary">
                    {detectTipoCausa(ing.codigo_rit)}
                  </Badge>
                </p>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="ing-ruc">Código RUC</FieldLabel>
              <Input
                id="ing-ruc"
                value={ing.codigo_ruc}
                onChange={(e) => set({ codigo_ruc: e.target.value })}
                placeholder="RUC"
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={ing.orden_tribunal}
              onCheckedChange={(v) => set({ orden_tribunal: !!v })}
            />
            Orden de tribunal
          </label>

          {/* Causales */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">Causales de ingreso</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCausal}
              >
                + Agregar
              </Button>
            </div>
            {ing.causales.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Sin causales registradas.
              </p>
            )}
            {ing.causales.map((c, i) => (
              <div
                key={i}
                className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3 p-3 border rounded-lg"
              >
                <Combobox
                  value={c.nombre_causal}
                  onValueChange={(v) => {
                    const cs = [...ing.causales];
                    cs[i] = { ...cs[i], nombre_causal: v ?? "" };
                    set({ causales: cs });
                  }}
                  items={["", ...CATALOGO_CAUSALES]}
                >
                  <ComboboxInput
                    showTrigger
                    showClear
                    placeholder="Seleccionar causal"
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                    <ComboboxList>
                      {(item: string) => (
                        <ComboboxItem key={item} value={item}>
                          {item === "" ? "Ninguna" : item}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
                <Input
                  placeholder="Descripción detallada"
                  value={c.descripcion_detallada}
                  onChange={(e) => {
                    const cs = [...ing.causales];
                    cs[i] = { ...cs[i], descripcion_detallada: e.target.value };
                    set({ causales: cs });
                  }}
                />
                <div className="flex items-center gap-2">
                  <Select
                    value={c.estado}
                    onValueChange={(v) => {
                      const cs = [...ing.causales];
                      cs[i] = { ...cs[i], estado: v };
                      set({ causales: cs });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Activo">Activo</SelectItem>
                      <SelectItem value="Inactivo">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      set({ causales: ing.causales.filter((_, j) => j !== i) });
                    }}
                  >
                    ×
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Derechos vulnerados */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">Derechos vulnerados</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addDerecho}
              >
                + Agregar
              </Button>
            </div>
            {ing.derechos.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Sin derechos registrados.
              </p>
            )}
            {ing.derechos.map((d, i) => (
              <div
                key={i}
                className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 p-3 border rounded-lg"
              >
                <Combobox
                  value={d.nombre_derecho}
                  onValueChange={(v) => {
                    const ds = [...ing.derechos];
                    ds[i] = { ...ds[i], nombre_derecho: v ?? "" };
                    set({ derechos: ds });
                  }}
                  items={["", ...CATALOGO_DERECHOS]}
                >
                  <ComboboxInput
                    showTrigger
                    showClear
                    placeholder="Seleccionar derecho"
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                    <ComboboxList>
                      {(item: string) => (
                        <ComboboxItem key={item} value={item}>
                          {item === "" ? "Ninguno" : item}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
                <div className="flex items-center gap-2">
                  <Select
                    value={d.estado}
                    onValueChange={(v) => {
                      const ds = [...ing.derechos];
                      ds[i] = { ...ds[i], estado: v };
                      set({ derechos: ds });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vulnerado">Vulnerado</SelectItem>
                      <SelectItem value="No vulnerado">No vulnerado</SelectItem>
                      <SelectItem value="En evaluación">
                        En evaluación
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      set({ derechos: ing.derechos.filter((_, j) => j !== i) });
                    }}
                  >
                    ×
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeftIcon /> Anterior
            </Button>
            <Button onClick={onNext}>
              Siguiente <ArrowRightIcon />
            </Button>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
