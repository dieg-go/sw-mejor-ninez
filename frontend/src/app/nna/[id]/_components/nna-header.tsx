"use client";

import {
  UserRoundIcon,
  IdCardIcon,
  CakeIcon,
  CalendarIcon,
  MapPinIcon,
  GlobeIcon,
  FlagIcon,
  Building2Icon,
  HomeIcon,
} from "lucide-react";
import type { NNA } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InfoRow } from "./info-row";
import { calcularEdad } from "./utils";

export function NNAHeader({ nna }: { nna: NNA }) {
  const edad = calcularEdad(nna.fecha_nacimiento);

  return (
    <Card className="mb-8 overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserRoundIcon className="size-7" />
            </div>
            <div>
              <CardTitle className="text-2xl leading-tight">{nna.nombre}</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-3 mt-1.5">
                <span className="inline-flex items-center gap-1">
                  <IdCardIcon className="size-3.5" />
                  RUN: {nna.run || "—"}
                </span>
                {edad !== null && (
                  <span className="inline-flex items-center gap-1">
                    <CakeIcon className="size-3.5" />
                    {edad} {edad === 1 ? "año" : "años"}
                  </span>
                )}
                {nna.sexo && (
                  <Badge variant="outline" className="text-xs font-normal">
                    {nna.sexo}
                  </Badge>
                )}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
          <InfoRow label="Fecha nacimiento" value={nna.fecha_nacimiento} icon={CalendarIcon} />
          <InfoRow label="Nacionalidad" value={nna.nacionalidad} icon={GlobeIcon} />
          <InfoRow label="Etnia" value={nna.etnia_declarada} icon={FlagIcon} />
          <InfoRow label="Región" value={nna.region} icon={MapPinIcon} />
          <InfoRow label="Comuna" value={nna.comuna} icon={Building2Icon} />
          <InfoRow label="Domicilio" value={nna.domicilio} icon={HomeIcon} />
          <InfoRow label="Población / Villa" value={nna.poblacion_o_villa} icon={MapPinIcon} />
        </dl>
      </CardContent>
    </Card>
  );
}
