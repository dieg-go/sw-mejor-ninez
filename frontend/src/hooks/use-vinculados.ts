"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type Familiar, type VinculoFamiliar } from "@/lib/api";

export function useVinculados(nnaId: string, familiares: Familiar[]) {
  const [vinculos, setVinculos] = useState<VinculoFamiliar[]>([]);

  useEffect(() => {
    let cancelled = false;
    api.vinculoFamiliar
      .list(nnaId)
      .then((data) => {
        if (!cancelled) setVinculos(data);
      })
      .catch(() => {
        if (!cancelled) setVinculos([]);
      });
    return () => {
      cancelled = true;
    };
  }, [nnaId]);

  const vinculados = useMemo(() => {
    const ids = new Set(vinculos.map((v) => v.id_familiar));
    return familiares.filter((f) => ids.has(f.id_familiar));
  }, [vinculos, familiares]);

  return { vinculados, vinculos };
}
