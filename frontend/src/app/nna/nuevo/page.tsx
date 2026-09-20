"use client";

import { useId, useState } from "react";
import { Link, useRouter } from "@/lib/navigation";
import { ArrowLeftIcon, CalendarIcon } from "lucide-react";
import { api, type NNACreate } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import {
  Field,
  FieldLabel,
  FieldGroup,
  FieldError,
} from "@/components/ui/field";
import { cn } from "@/lib/utils";

export default function NewNNAPage() {
  const router = useRouter();
  const [form, setForm] = useState<NNACreate>({
    nombre: "",
    run: "",
    sexo: "",
    etnia_declarada: "",
    nacionalidad: "",
    domicilio: "",
    poblacion_o_villa: "",
    comuna: "",
    region: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  // Id unico para asociar la etiqueta "Fecha de Nacimiento" al boton del calendario.
  const fechaNacId = useId();

  const setField = (field: keyof NNACreate) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload: NNACreate = {};
    for (const [k, v] of Object.entries(form)) {
      if (v) (payload as Record<string, string>)[k] = v;
    }
    if (date) {
      payload.fecha_nacimiento = date.toISOString().split("T")[0];
    }

    setSaving(true);
    try {
      const created = await api.nna.create(payload);
      router.push(`/nna/${created.id_nna}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear NNA");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/nna"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon />
          Volver
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo NNA</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="nombre">Nombre</FieldLabel>
                  <Input
                    id="nombre"
                    value={form.nombre ?? ""}
                    onChange={setField("nombre")}
                    placeholder="Nombre completo"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="run">RUN</FieldLabel>
                  <Input
                    id="run"
                    value={form.run ?? ""}
                    onChange={setField("run")}
                    placeholder="12.345.678-9"
                  />
                </Field>

                <Field>
                  {/* Id unico por instancia y asociado al boton del calendario,
                      que es el control etiquetable de este campo. */}
                  <FieldLabel htmlFor={fechaNacId}>Fecha de Nacimiento</FieldLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id={fechaNacId}
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon data-icon="inline-start" />
                        {date
                          ? date.toLocaleDateString("es-CL")
                          : "Seleccionar fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                      />
                    </PopoverContent>
                  </Popover>
                </Field>

                <Field>
                  <FieldLabel htmlFor="sexo">Sexo</FieldLabel>
                  <Select
                    value={form.sexo ?? ""}
                    onValueChange={(v) =>
                      setForm((prev) => ({ ...prev, sexo: v }))
                    }
                  >
                    <SelectTrigger id="sexo">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
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
                  <FieldLabel htmlFor="etnia">Etnia Declarada</FieldLabel>
                  <Input
                    id="etnia"
                    value={form.etnia_declarada ?? ""}
                    onChange={setField("etnia_declarada")}
                    placeholder="Etnia"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="nacionalidad">Nacionalidad</FieldLabel>
                  <Input
                    id="nacionalidad"
                    value={form.nacionalidad ?? ""}
                    onChange={setField("nacionalidad")}
                    placeholder="Nacionalidad"
                  />
                </Field>

                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="domicilio">Domicilio</FieldLabel>
                  <Input
                    id="domicilio"
                    value={form.domicilio ?? ""}
                    onChange={setField("domicilio")}
                    placeholder="Dirección"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="poblacion">Población o Villa</FieldLabel>
                  <Input
                    id="poblacion"
                    value={form.poblacion_o_villa ?? ""}
                    onChange={setField("poblacion_o_villa")}
                    placeholder="Población o villa"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="comuna">Comuna</FieldLabel>
                  <Input
                    id="comuna"
                    value={form.comuna ?? ""}
                    onChange={setField("comuna")}
                    placeholder="Comuna"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="region">Región</FieldLabel>
                  <Input
                    id="region"
                    value={form.region ?? ""}
                    onChange={setField("region")}
                    placeholder="Región"
                  />
                </Field>
              </div>

              {error && <FieldError>{error}</FieldError>}

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={saving}>
                  {saving && <Spinner data-icon="inline-start" />}
                  {saving ? "Guardando..." : "Guardar"}
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/nna">Cancelar</Link>
                </Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
