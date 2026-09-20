"use client";

import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { CATALOGO_DOCUMENTACION_INGRESO } from "@/lib/catalogos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUpload } from "@/components/ui/file-upload";
import { DateField } from "./date-field";
import type { WizardData } from "./types";

export function StepDocs({ data, onData, onBack, onNext }: { data: WizardData; onData: (d: WizardData) => void; onBack: () => void; onNext: () => void }) {
  const addDoc = () => onData({ ...data, docs: [...data.docs, { tipo_documento: "", tipo_documento_otro: "", estado_recepcion: false, fecha_recepcion: null, observacion: "", url_documentacion_ingreso: "" }] });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentación de Ingreso</CardTitle>
        <CardDescription>Documentos asociados al ingreso del NNA.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          {data.docs.length === 0 && <p className="text-sm text-muted-foreground">Sin documentos registrados.</p>}
          {data.docs.map((doc, i) => (
            <div key={i} className="border rounded-lg p-3 mb-3 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={doc.estado_recepcion} onCheckedChange={(v) => {
                    const ds = [...data.docs]; ds[i] = { ...ds[i], estado_recepcion: !!v }; onData({ ...data, docs: ds });
                  }} />
                  Recibido
                </label>
                <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => {
                  onData({ ...data, docs: data.docs.filter((_, j) => j !== i) });
                }}>×</Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Select value={doc.tipo_documento || "none"} onValueChange={(v) => {
                  const ds = [...data.docs]; ds[i] = { ...ds[i], tipo_documento: v === "none" ? "" : v, tipo_documento_otro: v === "Otro" ? ds[i].tipo_documento_otro : "" }; onData({ ...data, docs: ds });
                }}>
                  <SelectTrigger aria-label={`Tipo de documento ${i + 1}`}><SelectValue placeholder="Tipo de documento" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguno</SelectItem>
                    {CATALOGO_DOCUMENTACION_INGRESO.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {doc.tipo_documento === "Otro" && (
                  <Input
                    className="sm:col-span-2"
                    aria-label={`Especificar tipo de documento ${i + 1}`}
                    placeholder="Especificar tipo de documento..."
                    value={doc.tipo_documento_otro}
                    onChange={(e) => {
                      const ds = [...data.docs]; ds[i] = { ...ds[i], tipo_documento_otro: e.target.value }; onData({ ...data, docs: ds });
                    }}
                  />
                )}
                <div className="sm:col-span-2 mt-1">
                  <FileUpload
                    label={`Documento del ingreso ${i + 1}`}
                    value={doc.url_documentacion_ingreso || null}
                    onUploadSuccess={(url) => {
                      const ds = [...data.docs];
                      ds[i] = { ...ds[i], url_documentacion_ingreso: url };
                      onData({ ...data, docs: ds });
                    }}
                    onClear={() => {
                      const ds = [...data.docs];
                      ds[i] = { ...ds[i], url_documentacion_ingreso: "" };
                      onData({ ...data, docs: ds });
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-center">
                <Input placeholder="Observación" value={doc.observacion} onChange={(e) => {
                  const ds = [...data.docs]; ds[i] = { ...ds[i], observacion: e.target.value }; onData({ ...data, docs: ds });
                }} />
                <DateField value={doc.fecha_recepcion} onChange={(d) => {
                  const ds = [...data.docs]; ds[i] = { ...ds[i], fecha_recepcion: d ?? null }; onData({ ...data, docs: ds });
                }} />
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addDoc}>+ Agregar documento</Button>

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button variant="outline" onClick={onBack}><ArrowLeftIcon /> Anterior</Button>
            <Button onClick={onNext}>Siguiente <ArrowRightIcon /></Button>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
