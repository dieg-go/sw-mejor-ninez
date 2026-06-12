"use client";

import { useRef, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, UploadIcon } from "lucide-react";
import { CATALOGO_DOCUMENTACION_INGRESO } from "@/lib/catalogos";
import { api } from "@/lib/api";
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
import { DateField } from "./date-field";
import type { WizardData } from "./types";

export function StepDocs({ data, onData, onBack, onNext }: { data: WizardData; onData: (d: WizardData) => void; onBack: () => void; onNext: () => void }) {
  const addDoc = () => onData({ ...data, docs: [...data.docs, { tipo_documento: "", tipo_documento_otro: "", estado_recepcion: false, fecha_recepcion: null, observacion: "", url_documentacion_ingreso: "" }] });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingIdx, setPendingIdx] = useState<number | null>(null);

  const handleFileUpload = async (file: File, i: number) => {
    setUploadingIdx(i);
    setUploadError(null);
    try {
      const result = await api.upload.docs(file);
      const ds = [...data.docs];
      ds[i] = { ...ds[i], url_documentacion_ingreso: result.url };
      onData({ ...data, docs: ds });
    } catch (e: any) {
      setUploadError(e.message);
    } finally {
      setUploadingIdx(null);
      setPendingIdx(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentación de Ingreso</CardTitle>
        <CardDescription>Documentos asociados al ingreso del NNA.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          {uploadError && <p className="text-destructive text-sm">{uploadError}</p>}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && pendingIdx !== null) handleFileUpload(file, pendingIdx);
              e.target.value = "";
            }}
          />
          {uploadingIdx !== null && (
            <p className="text-sm text-muted-foreground">Subiendo archivo...</p>
          )}
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
                  <SelectTrigger><SelectValue placeholder="Tipo de documento" /></SelectTrigger>
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
                    placeholder="Especificar tipo de documento..."
                    value={doc.tipo_documento_otro}
                    onChange={(e) => {
                      const ds = [...data.docs]; ds[i] = { ...ds[i], tipo_documento_otro: e.target.value }; onData({ ...data, docs: ds });
                    }}
                  />
                )}
                <div className="flex gap-1">
                  <Button type="button" variant="outline" size="sm" disabled={uploadingIdx === i} onClick={() => { setPendingIdx(i); fileInputRef.current?.click(); }}>
                    <UploadIcon className="size-4 mr-1" />
                    {doc.url_documentacion_ingreso ? "Cambiar archivo" : "Subir archivo"}
                  </Button>
                  {doc.url_documentacion_ingreso && (
                    <span className="text-xs text-muted-foreground truncate self-center" title={doc.url_documentacion_ingreso}>
                      {doc.url_documentacion_ingreso.split("/").pop()}
                    </span>
                  )}
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
