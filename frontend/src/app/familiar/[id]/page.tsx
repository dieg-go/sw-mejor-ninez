"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { api, type Familiar } from "@/lib/api";
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
import { Spinner } from "@/components/ui/spinner";
import { Empty } from "@/components/ui/empty";

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

export default function FamiliarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [familiar, setFamiliar] = useState<Familiar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.familiares
      .get(id)
      .then(setFamiliar)
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

  if (error || !familiar) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-destructive">{error || "Familiar no encontrado"}</p>
        <Button variant="outline" asChild className="mt-4">
          <Link href="/familiar">
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
        <Link href="/familiar">
          <ArrowLeftIcon />
          Volver al listado
        </Link>
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>{familiar.nombre}</CardTitle>
            {familiar.tiene_antecedentes_penales && (
              <Badge variant="destructive">Antecedentes penales</Badge>
            )}
          </div>
          <CardDescription>RUN: {familiar.run || "—"}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <InfoRow label="Fecha nacimiento" value={familiar.fecha_nacimiento} />
            <InfoRow label="Dirección" value={familiar.direccion} />
            <InfoRow label="Teléfono" value={familiar.numero_telefono} />
          </dl>
        </CardContent>
      </Card>

      <Tabs defaultValue="consumo">
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="consumo">Consumo</TabsTrigger>
          <TabsTrigger value="discapacidades">Discapacidades</TabsTrigger>
          <TabsTrigger value="penales">Antec. Penales</TabsTrigger>
          <TabsTrigger value="instrumentos">Instrumentos</TabsTrigger>
        </TabsList>

        <TabsContent value="consumo">
          <ConsumoTab idFamiliar={id} />
        </TabsContent>
        <TabsContent value="discapacidades">
          <DiscapacidadTab idFamiliar={id} />
        </TabsContent>
        <TabsContent value="penales">
          <PenalesTab idFamiliar={id} />
        </TabsContent>
        <TabsContent value="instrumentos">
          <InstrumentosTab idFamiliar={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConsumoTab({ idFamiliar }: { idFamiliar: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.historialConsumoAdulto
      .list(idFamiliar)
      .then(setData)
      .finally(() => setLoading(false));
  }, [idFamiliar]);

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

function DiscapacidadTab({ idFamiliar }: { idFamiliar: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.discapacidadAdulto
      .list(idFamiliar)
      .then(setData)
      .finally(() => setLoading(false));
  }, [idFamiliar]);

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

function PenalesTab({ idFamiliar }: { idFamiliar: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.antecedentesPenales
      .list(idFamiliar)
      .then(setData)
      .finally(() => setLoading(false));
  }, [idFamiliar]);

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
      {data.map((a: any) => (
        <Card key={a.id_antecedentes_penales}>
          <CardContent className="pt-4">
            <Badge variant="destructive" className="mb-2">
              Antecedente penal
            </Badge>
            <p className="text-sm">{a.descripcion || "Sin descripción"}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function InstrumentosTab({ idFamiliar }: { idFamiliar: string }) {
  const [e2p, setE2p] = useState<any[]>([]);
  const [pmf, setPmf] = useState<any[]>([]);
  const [ncfas, setNcfas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.e2p.listByFamiliar(idFamiliar),
      api.pmf.listByFamiliar(idFamiliar),
      api.ncfas.listByFamiliar(idFamiliar),
    ])
      .then(([e, p, n]) => {
        setE2p(e);
        setPmf(p);
        setNcfas(n);
      })
      .finally(() => setLoading(false));
  }, [idFamiliar]);

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
