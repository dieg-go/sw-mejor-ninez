"use client";

import {
  CakeIcon,
  IdCardIcon,
  MapPinIcon,
  Building2Icon,
  HomeIcon,
  GlobeIcon,
  FlagIcon,
  type LucideIcon,
} from "lucide-react";
import type { NNA } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { calcularEdad, iniciales } from "@/lib/utils";

function Chip({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | null;
}) {
  return (
    <div className="rounded-lg border bg-card/60 px-3 py-2">
      <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </span>
      <span className="mt-0.5 block truncate text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

export function NNAHeader({ nna }: { nna: NNA }) {
  const edad = calcularEdad(nna.fecha_nacimiento);

  return (
    <section className="overflow-hidden rounded-2xl border bg-gradient-to-b from-primary/15 via-primary/5 to-card shadow-sm">
      <div className="px-5 pb-6 pt-6 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-lg font-semibold text-primary-foreground shadow-sm">
            {iniciales(nna.nombre)}
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold leading-tight sm:text-3xl">
              {nna.nombre}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1 font-normal">
                <IdCardIcon className="size-3" />
                RUN: {nna.run || "—"}
              </Badge>
              {edad !== null && (
                <Badge variant="secondary" className="gap-1 font-normal">
                  <CakeIcon className="size-3" />
                  {edad} {edad === 1 ? "año" : "años"}
                </Badge>
              )}
              {nna.sexo && (
                <Badge variant="outline" className="font-normal">
                  {nna.sexo}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <Chip icon={CakeIcon} label="Nacimiento" value={nna.fecha_nacimiento} />
          <Chip icon={GlobeIcon} label="Nacionalidad" value={nna.nacionalidad} />
          <Chip icon={FlagIcon} label="Etnia" value={nna.etnia_declarada} />
          <Chip icon={MapPinIcon} label="Región" value={nna.region} />
          <Chip icon={Building2Icon} label="Comuna" value={nna.comuna} />
          <Chip icon={HomeIcon} label="Domicilio" value={nna.domicilio} />
          <Chip icon={MapPinIcon} label="Población / Villa" value={nna.poblacion_o_villa} />
        </div>
      </div>
    </section>
  );
}