"use client";

import { useEffect, useState } from "react";
import { UsersIcon } from "lucide-react";
import { api, type ProcesoDespejeFamiliar, type NotificacionFamiliar } from "@/lib/api";
import { SectionCard } from "./section-card";
import { AlertaBadge } from "./alerta-badge";
import { getAlertaResumen } from "./utils";

export function BusquedaFamiliarSummaryCard({ idNna }: { idNna: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [despeje, setDespeje] = useState<ProcesoDespejeFamiliar | null>(null);
  const [alerta, setAlerta] = useState<"roja" | "naranja" | "verde" | null>(null);

useEffect(() => {
  (async () => {
    const des = await api.despeje.getByNna(idNna).catch(() => null);
    setDespeje(des);

    if (des) {
      const notifs = await api.notificacion.list(des.id_despeje).catch(() => [] as NotificacionFamiliar[]);
      setAlerta(getAlertaResumen(notifs));
    }
    setLoading(false);
  })();
}, [idNna]);

  return (
    <SectionCard
      href={`/nna/${idNna}/busqueda-familiar`}
      icon={UsersIcon}
      label="Búsqueda Familiar"
      loading={loading}
      error={error}
      isEmpty={!despeje}
    >
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground line-clamp-2">
          {despeje?.estado || "—"}
        </p>
        {alerta && <AlertaBadge tipo={alerta} />}
      </div>
    </SectionCard>
  );
}
