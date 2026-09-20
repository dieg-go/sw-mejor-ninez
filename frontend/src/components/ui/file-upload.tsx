"use client";

import { useCallback, useId, useState } from "react";
import { useDropzone, type Accept } from "react-dropzone";
import { UploadCloudIcon, FileIcon, XIcon, CheckCircle2Icon, AlertTriangleIcon } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

const DEFAULT_ACCEPT: Accept = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
};

interface FileUploadProps {
  value: string | null;
  onUploadSuccess: (url: string, filename: string) => void;
  onClear: () => void;
  accept?: Accept;
  maxSize?: number;
  disabled?: boolean;
  dropzoneLabel?: string;
  dropzoneHint?: string;
  /**
   * Etiqueta visible del campo.
   *
   * Se asocia al `<input type="file">` con `htmlFor`/`id`, que es la forma
   * estandar y la unica que funciona de verdad: la zona de dropzone que genera
   * `getRootProps()` lleva `role="presentation"`, asi que queda fuera del arbol
   * de accesibilidad y un `aria-labelledby` sobre ella lo ignora el lector de
   * pantalla (aunque `getByLabelText` lo encuentre, porque es permisivo). El
   * input solo existe mientras no hay archivo subido; cuando ya hay uno, la
   * etiqueta se renderiza como texto sin `for`, porque no queda ningun control
   * de formulario que nombrar.
   */
  label?: string;
}

export function FileUpload({
  value,
  onUploadSuccess,
  onClear,
  accept = DEFAULT_ACCEPT,
  maxSize = 10 * 1024 * 1024,
  disabled = false,
  dropzoneLabel = "Arrastra el archivo aquí o haz clic para buscar",
  dropzoneHint = "PDF, imágenes o documentos (máx. 10 MB)",
  label,
}: FileUploadProps) {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasValue = !!value || !!file;

  const uploadFile = useCallback(async (acceptedFile: File) => {
    setFile(acceptedFile);
    setUploading(true);
    setError(null);
    try {
      const result = await api.upload.docs(acceptedFile);
      onUploadSuccess(result.url, result.filename);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al subir archivo";
      setError(msg);
    } finally {
      setUploading(false);
    }
  }, [onUploadSuccess]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    uploadFile(acceptedFiles[0]);
  }, [uploadFile]);

  const onDropRejected = useCallback(() => {
    setError("El archivo excede el tamaño máximo permitido o no es un formato válido.");
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept,
    maxSize,
    maxFiles: 1,
    disabled: disabled || uploading,
  });

  const handleRemove = () => {
    setFile(null);
    setError(null);
    onClear();
  };

  if (!hasValue && !uploading) {
    return (
      <div className="space-y-2 w-full">
        {label && (
          <Label htmlFor={inputId} className="text-xs">
            {label}
          </Label>
        )}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-primary bg-primary/5"
              : disabled
                ? "border-muted-foreground/10 bg-muted/5 cursor-not-allowed"
                : "border-muted-foreground/20 hover:border-primary/50 bg-background"
          }`}
        >
          <input {...getInputProps()} id={inputId} />
          <div className="flex flex-col items-center justify-center space-y-2">
            <UploadCloudIcon className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              {isDragActive ? "Suelte el archivo aquí" : dropzoneLabel}
            </p>
            <p className="text-xs text-muted-foreground">{dropzoneHint}</p>
          </div>
        </div>
        {error && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertTriangleIcon className="size-3" /> {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 w-full">
      {/* Con archivo ya subido no hay `<input type="file">`, asi que la etiqueta
          es texto: un `<Label htmlFor>` apuntaria a un control ausente. Se
          conservan las clases base de Label para no mover nada. */}
      {label && (
        <p className="flex items-center gap-2 text-xs leading-none font-medium select-none">
          {label}
        </p>
      )}
      <div className="border rounded-xl p-4 bg-muted/10 flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0">
          <FileIcon className="size-8 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {file ? file.name : value?.split("/").pop() || "Archivo"}
            </p>
            {uploading ? (
              <div className="flex items-center gap-2 mt-1">
                <Spinner className="size-3" />
                <span className="text-xs text-muted-foreground">Subiendo archivo...</span>
              </div>
            ) : error ? (
              <span className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                <AlertTriangleIcon className="size-3" /> {error}
              </span>
            ) : (
              <span className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                <CheckCircle2Icon className="size-3" /> Archivo cargado con éxito
              </span>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Quitar archivo"
          onClick={handleRemove}
          disabled={uploading}
          className="size-8 text-muted-foreground hover:text-destructive shrink-0"
        >
          <XIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
