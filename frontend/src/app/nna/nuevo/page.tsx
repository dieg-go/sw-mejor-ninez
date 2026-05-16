"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarIcon, Loader2 } from "lucide-react";
import { api, type NNACreate } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
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
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Volver
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo NNA</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  value={form.nombre ?? ""}
                  onChange={setField("nombre")}
                  placeholder="Nombre completo"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">RUN</label>
                <Input
                  value={form.run ?? ""}
                  onChange={setField("run")}
                  placeholder="12.345.678-9"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Fecha de Nacimiento</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 size-4" />
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
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Sexo</label>
                <Select
                  value={form.sexo ?? ""}
                  onValueChange={(v) =>
                    setForm((prev) => ({ ...prev, sexo: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Femenino">Femenino</SelectItem>
                    <SelectItem value="No especificado">No especificado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Etnia Declarada</label>
                <Input
                  value={form.etnia_declarada ?? ""}
                  onChange={setField("etnia_declarada")}
                  placeholder="Etnia"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nacionalidad</label>
                <Input
                  value={form.nacionalidad ?? ""}
                  onChange={setField("nacionalidad")}
                  placeholder="Nacionalidad"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-sm font-medium">Domicilio</label>
                <Input
                  value={form.domicilio ?? ""}
                  onChange={setField("domicilio")}
                  placeholder="Dirección"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Población o Villa</label>
                <Input
                  value={form.poblacion_o_villa ?? ""}
                  onChange={setField("poblacion_o_villa")}
                  placeholder="Población o villa"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Comuna</label>
                <Input
                  value={form.comuna ?? ""}
                  onChange={setField("comuna")}
                  placeholder="Comuna"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Región</label>
                <Input
                  value={form.region ?? ""}
                  onChange={setField("region")}
                  placeholder="Región"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                {saving ? "Guardando..." : "Guardar"}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/nna">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
