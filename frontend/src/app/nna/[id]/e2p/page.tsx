"use client";

import { use, useEffect, useMemo, useState } from "react";
import { api, type AntecedenteFamiliar, type VinculoFamiliar, type NNA, type Familiar, type E2PEvaluacion, type E2PPuntaje } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import { Empty } from "@/components/ui/empty";
import { E2PHeader } from "./_components/e2p-header";
import { E2PFormDialog } from "./_components/e2p-form-dialog";
import { E2PItemCard } from "./_components/e2p-item-card";

export default function E2PPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [nna, setNna] = useState<NNA | null>(null);
  const [familiares, setFamiliares] = useState<Familiar[]>([]);
  const [items, setItems] = useState<E2PEvaluacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [puntajes, setPuntajes] = useState<Record<string, E2PPuntaje | null>>({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingItem, setEditingItem] = useState<E2PEvaluacion | undefined>(undefined);
  const [dialogKey, setDialogKey] = useState(0);
  const [vinculos, setVinculos] = useState<VinculoFamiliar[]>([]);
  const [antecedentes, setAntecedentes] = useState<AntecedenteFamiliar[]>([]);

  const fetchPuntaje = async (item: E2PEvaluacion) => {
    if (item.respuestas && Object.keys(item.respuestas).length > 0) {
      try {
        const p = await api.e2p.getPuntaje(item.id_e2p);
        setPuntajes((prev) => ({ ...prev, [item.id_e2p]: p }));
      } catch {
        setPuntajes((prev) => ({ ...prev, [item.id_e2p]: null }));
      }
    } else {
      setPuntajes((prev) => {
        const next = { ...prev };
        delete next[item.id_e2p];
        return next;
      });
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [nnaData, famList, vincList, antList] = await Promise.all([
          api.nna.get(id),
          api.familiares.list(),
          api.vinculoFamiliar.list(id).catch(() => [] as VinculoFamiliar[]),
          api.antecedenteFamiliar.list(id).catch(() => [] as AntecedenteFamiliar[]),
        ]);
        if (cancelled) return;
        setNna(nnaData);
        setFamiliares(famList);
        setVinculos(vincList);
        setAntecedentes(antList);
        setItems(await api.e2p.listByNna(id));
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error inesperado");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const newPuntajes: Record<string, E2PPuntaje | null> = {};
      for (const item of items) {
        if (cancelled) return;
        if (item.respuestas && Object.keys(item.respuestas).length > 0) {
          try {
            newPuntajes[item.id_e2p] = await api.e2p.getPuntaje(item.id_e2p);
          } catch {
            newPuntajes[item.id_e2p] = null;
          }
        }
      }
      if (!cancelled) setPuntajes(newPuntajes);
    })();
    return () => { cancelled = true; };
  }, [items]);

  const handleCreated = (item: E2PEvaluacion) => {
    setItems((prev) => [...prev, item]);
    fetchPuntaje(item);
  };

  const handleUpdated = (item: E2PEvaluacion) => {
    setItems((prev) => prev.map((i) => (i.id_e2p === item.id_e2p ? item : i)));
    fetchPuntaje(item);
  };

  const openCreate = () => {
    setEditingItem(undefined);
    setDialogMode("create");
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  };

  const openEdit = (item: E2PEvaluacion) => {
    setEditingItem(item);
    setDialogMode("edit");
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  };

  const vinculados = useMemo(() => {
    const ids = new Set(vinculos.map((v) => v.id_familiar));
    return familiares.filter((f) => ids.has(f.id_familiar));
  }, [vinculos, familiares]);

  const adultoResponsableId = useMemo(() => {
    const sorted = [...antecedentes]
      .filter((a) => a.id_adulto_responsable && a.fecha_antecedente_familiar)
      .sort((a, b) => b.fecha_antecedente_familiar!.localeCompare(a.fecha_antecedente_familiar!));
    return sorted[0]?.id_adulto_responsable ?? null;
  }, [antecedentes]);

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (loading || !nna) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="size-5" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <E2PHeader nnaId={id} nnaName={nna.nombre} itemCount={items.length} canCreate={vinculados.length > 0} onNew={openCreate} />

      <E2PFormDialog
        key={dialogKey}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        nnaId={id}
        nna={nna}
        familiares={familiares}
        vinculados={vinculados}
        idAdultoResponsable={adultoResponsableId}
        initialData={editingItem}
        existingPuntaje={editingItem ? puntajes[editingItem.id_e2p] ?? null : undefined}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
      />

      {items.length === 0 ? (
        <Empty><p className="text-sm text-muted-foreground">Sin registros de E2P.</p></Empty>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <E2PItemCard
              key={item.id_e2p}
              item={item}
              puntaje={puntajes[item.id_e2p] ?? null}
              familiares={familiares}
              onEdit={() => openEdit(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
