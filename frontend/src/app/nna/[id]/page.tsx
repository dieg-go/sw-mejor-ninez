"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { api, type NNA } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Empty } from "@/components/ui/empty";
import {
  Field,
  FieldLabel,
  FieldGroup,
} from "@/components/ui/field";

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || "—"}</dd>
    </div>
  );
}

function TabSpinner() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
      <Spinner /> Cargando...
    </div>
  );
}

export default function NNADetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [nna, setNna] = useState<NNA | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.nna
      .get(id)
      .then(setNna)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (error || !nna) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-destructive">{error || "NNA no encontrado"}</p>
        <Button variant="outline" asChild className="mt-4">
          <Link href="/nna">
            <ArrowLeftIcon />
            Volver
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="-ml-2 mb-4">
        <Link href="/nna">
          <ArrowLeftIcon />
          Volver al listado
        </Link>
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{nna.nombre}</CardTitle>
          <CardDescription>RUN: {nna.run || "—"}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <InfoRow label="Sexo" value={nna.sexo} />
            <InfoRow label="Fecha nacimiento" value={nna.fecha_nacimiento} />
            <InfoRow label="Nacionalidad" value={nna.nacionalidad} />
            <InfoRow label="Etnia" value={nna.etnia_declarada} />
            <InfoRow label="Región" value={nna.region} />
            <InfoRow label="Comuna" value={nna.comuna} />
            <InfoRow label="Domicilio" value={nna.domicilio} />
            <InfoRow label="Población / Villa" value={nna.poblacion_o_villa} />
          </dl>
        </CardContent>
      </Card>

      <Tabs defaultValue="ingreso">
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="ingreso">Ingreso</TabsTrigger>
          <TabsTrigger value="consumo">Consumo</TabsTrigger>
          <TabsTrigger value="discapacidades">Discapacidades</TabsTrigger>
          <TabsTrigger value="instrumentos">Instrumentos</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
          <TabsTrigger value="gestion">Gestión</TabsTrigger>
          <TabsTrigger value="informes">Informes</TabsTrigger>
          <TabsTrigger value="salud">Salud</TabsTrigger>
          <TabsTrigger value="escolar">Escolar</TabsTrigger>
          <TabsTrigger value="familiar">Familiar</TabsTrigger>
        </TabsList>

        <TabsContent value="ingreso">
          <IngresoTab idNna={id} />
        </TabsContent>
        <TabsContent value="consumo">
          <ConsumoTab idNna={id} />
        </TabsContent>
        <TabsContent value="discapacidades">
          <DiscapacidadTab idNna={id} />
        </TabsContent>
        <TabsContent value="instrumentos">
          <InstrumentosTab idNna={id} />
        </TabsContent>
        <TabsContent value="historial">
          <HistorialTab idNna={id} />
        </TabsContent>
        <TabsContent value="gestion">
          <GestionTab idNna={id} />
        </TabsContent>
        <TabsContent value="informes">
          <InformesTab idNna={id} />
        </TabsContent>
        <TabsContent value="salud">
          <SaludTab idNna={id} />
        </TabsContent>
        <TabsContent value="escolar">
          <EscolarTab idNna={id} />
        </TabsContent>
        <TabsContent value="familiar">
          <FamiliarTab idNna={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IngresoTab({ idNna }: { idNna: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    api.antecedenteIngreso
      .list(idNna)
      .then(setData)
      .finally(() => setLoading(false));
  }, [idNna]);

  if (loading) return <TabSpinner />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data.length} ingreso{data.length !== 1 && "s"}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "Cancelar" : "+ Agregar ingreso"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nuevo antecedente de ingreso</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Fecha de ingreso</FieldLabel>
                  <Input type="date" />
                </Field>
                <Field>
                  <FieldLabel>Quién solicita</FieldLabel>
                  <Input placeholder="Nombre o entidad" />
                </Field>
                <Field>
                  <FieldLabel>Tribunal</FieldLabel>
                  <Input placeholder="Tribunal" />
                </Field>
                <Field>
                  <FieldLabel>Materia</FieldLabel>
                  <Input placeholder="Materia" />
                </Field>
                <Field>
                  <FieldLabel>RIT</FieldLabel>
                  <Input placeholder="Código RIT" />
                </Field>
                <Field>
                  <FieldLabel>RUC</FieldLabel>
                  <Input placeholder="Código RUC" />
                </Field>
                <Field>
                  <FieldLabel>Fecha causa</FieldLabel>
                  <Input type="date" />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded" />
                Orden tribunal
              </label>
              <Button size="sm">Guardar (test)</Button>
            </FieldGroup>
          </CardContent>
        </Card>
      )}

      {data.length === 0 && !showForm ? (
        <Empty>
          <p className="text-muted-foreground text-sm">Sin registros.</p>
        </Empty>
      ) : (
        data.map((ingreso: any) => (
          <IngresoCard key={ingreso.id_antecedente_ingreso} ingreso={ingreso} />
        ))
      )}
    </div>
  );
}

function IngresoCard({ ingreso }: { ingreso: any }) {
  const [causales, setCausales] = useState<any[]>([]);
  const [derechos, setDerechos] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      api.causalIngreso.list(ingreso.id_antecedente_ingreso),
      api.derechoVulnerado.list(ingreso.id_antecedente_ingreso),
    ]).then(([c, d]) => {
      setCausales(c);
      setDerechos(d);
      setLoaded(true);
    });
  }, [ingreso.id_antecedente_ingreso]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">
            Ingreso {ingreso.fecha_ingreso_residencia || "—"}
          </CardTitle>
          {ingreso.orden_tribunal && <Badge>Orden Tribunal</Badge>}
        </div>
        <CardDescription>
          Solicitado por: {ingreso.quien_solicita_ingreso || "—"} | Tribunal:{" "}
          {ingreso.tribunal || "—"} | RIT: {ingreso.codigo_rit || "—"}
          {ingreso.codigo_ruc && <> | RUC: {ingreso.codigo_ruc}</>}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!loaded ? (
          <TabSpinner />
        ) : (
          <>
            <div>
              <h4 className="text-sm font-medium mb-2 border-b pb-1">
                Causales de ingreso
              </h4>
              {causales.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin causales registradas.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {causales.map((c: any) => (
                    <div
                      key={c.id_registro_causales}
                      className="rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {c.nombre_causal}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {c.estado}
                        </Badge>
                      </div>
                      {c.descripcion_detallada && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {c.descripcion_detallada}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2 border-b pb-1">
                Derechos vulnerados
              </h4>
              {derechos.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin derechos registrados.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {derechos.map((d: any) => (
                    <div
                      key={d.id_registro_derecho_vulnerado}
                      className="rounded-lg border p-3 flex items-center justify-between"
                    >
                      <span className="text-sm">{d.nombre_derecho}</span>
                      <Badge variant="outline" className="text-xs">
                        {d.estado}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DocTab idNna={ingreso.id_nna} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DocTab({ idNna }: { idNna: string }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.documentacionIngreso
      .list(idNna)
      .then(setDocs)
      .finally(() => setLoaded(true));
  }, [idNna]);

  if (!loaded) return <TabSpinner />;
  if (docs.length === 0) return null;

  return (
    <div>
      <h4 className="text-sm font-medium mb-2 border-b pb-1">
        Documentación de ingreso
      </h4>
      <div className="flex flex-col gap-2">
        {docs.map((d: any) => (
          <div
            key={d.id_documentacion}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <span className="text-sm">{d.tipo_documento}</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {d.fecha_recepcion || "—"}
              </span>
              <Badge
                variant={d.estado_recepcion ? "default" : "secondary"}
                className="text-xs"
              >
                {d.estado_recepcion ? "Recibido" : "Pendiente"}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConsumoTab({ idNna }: { idNna: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.historialConsumoNNA
      .list(idNna)
      .then(setData)
      .finally(() => setLoading(false));
  }, [idNna]);

  if (loading) return <TabSpinner />;
  if (data.length === 0) {
    return (
      <Empty>
        <p className="text-muted-foreground text-sm">Sin registros.</p>
      </Empty>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Sustancia</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="hidden sm:table-cell">
            Indirecto gestacional
          </TableHead>
          <TableHead className="hidden sm:table-cell">Inicio</TableHead>
          <TableHead>En tratamiento</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((c: any) => (
          <TableRow key={c.id_historial_consumo}>
            <TableCell className="font-medium">{c.nombre_sustancia}</TableCell>
            <TableCell>
              <Badge variant="outline">{c.estado_consumo || "—"}</Badge>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              {c.consumo_indirecto_gestacional ? "Sí" : "No"}
            </TableCell>
            <TableCell className="hidden sm:table-cell text-muted-foreground">
              {c.fecha_inicio || "—"}
            </TableCell>
            <TableCell>{c.en_tratamiento ? "Sí" : "No"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DiscapacidadTab({ idNna }: { idNna: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.discapacidadNNA
      .list(idNna)
      .then(setData)
      .finally(() => setLoading(false));
  }, [idNna]);

  if (loading) return <TabSpinner />;
  if (data.length === 0) {
    return (
      <Empty>
        <p className="text-muted-foreground text-sm">Sin registros.</p>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {data.map((d: any) => (
        <Card key={d.id_discapacidad}>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-sm">{d.tipo}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {d.observacion || "Sin observaciones"}
                </p>
              </div>
              <Badge>{d.porcentaje_grado}%</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function InstrumentosTab({ idNna }: { idNna: string }) {
  const [e2p, setE2p] = useState<any[]>([]);
  const [pmf, setPmf] = useState<any[]>([]);
  const [ncfas, setNcfas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.e2p.listByNna(idNna),
      api.pmf.listByNna(idNna),
      api.ncfas.listByNna(idNna),
    ])
      .then(([e, p, n]) => {
        setE2p(e);
        setPmf(p);
        setNcfas(n);
      })
      .finally(() => setLoading(false));
  }, [idNna]);

  if (loading) return <TabSpinner />;
  if (e2p.length === 0 && pmf.length === 0 && ncfas.length === 0) {
    return (
      <Empty>
        <p className="text-muted-foreground text-sm">Sin registros.</p>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <InstrumentoSection label="E2P" items={e2p} />
      <InstrumentoSection label="PMF" items={pmf} />
      <InstrumentoSection label="NCFAS" items={ncfas} />
    </div>
  );
}

function InstrumentoSection({
  label,
  items,
}: {
  label: string;
  items: any[];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="text-sm font-medium mb-2">{label}</h4>
      <div className="flex flex-col gap-2">
        {items.map((i: any) => (
          <Card key={i.id_instrumento}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Badge variant="outline" className="mb-1">
                    {i.resultado || "Pendiente"}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {i.observacion || "Sin observaciones"}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground text-right">
                  <p>Evaluado: {i.fecha_evaluacion || "—"}</p>
                  <p>Próxima: {i.fecha_proxima_evaluacion || "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function HistorialTab({ idNna }: { idNna: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.historialRed
      .list(idNna)
      .then(setData)
      .finally(() => setLoading(false));
  }, [idNna]);

  if (loading) return <TabSpinner />;
  if (data.length === 0) {
    return (
      <Empty>
        <p className="text-muted-foreground text-sm">Sin registros.</p>
      </Empty>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Programa</TableHead>
          <TableHead className="hidden sm:table-cell">Ingreso</TableHead>
          <TableHead className="hidden sm:table-cell">Egreso</TableHead>
          <TableHead>Motivo egreso</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((h: any) => (
          <TableRow key={h.id_historial_red}>
            <TableCell className="font-medium">{h.nombre_programa}</TableCell>
            <TableCell className="hidden sm:table-cell text-muted-foreground">
              {h.fecha_ingreso || "—"}
            </TableCell>
            <TableCell className="hidden sm:table-cell text-muted-foreground">
              {h.fecha_egreso || "—"}
            </TableCell>
            <TableCell>{h.motivo_egreso || "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function GestionTab({ idNna }: { idNna: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.gestionBusqueda
      .list(idNna)
      .then(setData)
      .finally(() => setLoading(false));
  }, [idNna]);

  if (loading) return <TabSpinner />;
  if (data.length === 0) {
    return (
      <Empty>
        <p className="text-muted-foreground text-sm">Sin registros.</p>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {data.map((g: any) => (
        <Card key={g.id_gestion_busqueda}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">{g.tipo_gestion}</h4>
              <Badge variant="outline">{g.resultado || "Pendiente"}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <p>Solicitud: {g.fecha_solicitud_envio || "—"}</p>
              <p>Respuesta: {g.fecha_respuesta_recepcion || "—"}</p>
              <p>Comprobante: {g.comprobante_adjunto ? "Adjunto" : "No"}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function InformesTab({ idNna }: { idNna: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.informeTribunal
      .list(idNna)
      .then(setData)
      .finally(() => setLoading(false));
  }, [idNna]);

  if (loading) return <TabSpinner />;
  if (data.length === 0) {
    return (
      <Empty>
        <p className="text-muted-foreground text-sm">Sin registros.</p>
      </Empty>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tipo</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="hidden sm:table-cell">Vencimiento</TableHead>
          <TableHead className="hidden sm:table-cell">Envío real</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((i: any) => (
          <TableRow key={i.id_informe}>
            <TableCell className="font-medium">{i.tipo_informe}</TableCell>
            <TableCell>
              <Badge variant="outline">{i.estado}</Badge>
            </TableCell>
            <TableCell className="hidden sm:table-cell text-muted-foreground">
              {i.fecha_vencimiento || "—"}
            </TableCell>
            <TableCell className="hidden sm:table-cell text-muted-foreground">
              {i.fecha_envio_real || "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SaludTab({ idNna }: { idNna: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.antecedenteSalud
      .list(idNna)
      .then(setData)
      .finally(() => setLoading(false));
  }, [idNna]);

  if (loading) return <TabSpinner />;
  if (data.length === 0) {
    return (
      <Empty>
        <p className="text-muted-foreground text-sm">Sin registros.</p>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {data.map((s: any) => (
        <Card key={s.id_antecedente_salud}>
          <CardContent className="pt-4">
            <dl className="grid grid-cols-2 gap-3">
              <InfoRow label="Establecimiento" value={s.establecimiento} />
              <InfoRow label="Previsión" value={s.prevision} />
              <InfoRow
                label="Inscrito en consultorio"
                value={s.inscrito_en_consultorio ? "Sí" : "No"}
              />
              <InfoRow label="Fecha" value={s.fecha_antecedente_salud} />
            </dl>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EscolarTab({ idNna }: { idNna: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.antecedenteEscolar
      .list(idNna)
      .then(setData)
      .finally(() => setLoading(false));
  }, [idNna]);

  if (loading) return <TabSpinner />;
  if (data.length === 0) {
    return (
      <Empty>
        <p className="text-muted-foreground text-sm">Sin registros.</p>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {data.map((e: any) => (
        <Card key={e.id_antecedente_escolar}>
          <CardContent className="pt-4">
            <dl className="grid grid-cols-2 gap-3">
              <InfoRow
                label="Escolarizado"
                value={e.escolarizado ? "Sí" : "No"}
              />
              <InfoRow
                label="Último año cursado"
                value={e.ultimo_ano_curso?.toString() ?? null}
              />
              <InfoRow label="Establecimiento" value={e.establecimiento} />
              <InfoRow label="Fecha" value={e.fecha_antecedente_escolar} />
            </dl>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function FamiliarTab({ idNna }: { idNna: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.antecedenteFamiliar
      .list(idNna)
      .then(setData)
      .finally(() => setLoading(false));
  }, [idNna]);

  if (loading) return <TabSpinner />;
  if (data.length === 0) {
    return (
      <Empty>
        <p className="text-muted-foreground text-sm">Sin registros.</p>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {data.map((f: any) => (
        <FamiliarCard key={f.id_antecedente_familiar} familiar={f} />
      ))}
    </div>
  );
}

function FamiliarCard({ familiar }: { familiar: any }) {
  const [entorno, setEntorno] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.entornoFamiliar
      .list(familiar.id_antecedente_familiar)
      .then(setEntorno)
      .finally(() => setLoaded(true));
  }, [familiar.id_antecedente_familiar]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Antecedente familiar</CardTitle>
        <CardDescription>
          Registrado: {familiar.fecha_antecedente_familiar || "—"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!loaded ? (
          <TabSpinner />
        ) : entorno.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin entorno familiar registrado.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {entorno.map((e: any) => (
              <div
                key={e.id_entorno_familiar}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {e.parentesco || "Sin parentesco"}
                  </p>
                  {e.id_adulto_significativo && (
                    <p className="text-xs text-muted-foreground">
                      Adulto ID: {e.id_adulto_significativo.slice(0, 8)}...
                    </p>
                  )}
                </div>
                <Badge
                  variant={e.es_adulto_responsable ? "default" : "outline"}
                >
                  {e.es_adulto_responsable
                    ? "Responsable"
                    : "No responsable"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
