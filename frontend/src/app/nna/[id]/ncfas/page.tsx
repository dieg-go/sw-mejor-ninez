"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, PlusIcon } from "lucide-react";
import { api, type NNA, type NCFASEvaluacion, type Familiar } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Empty } from "@/components/ui/empty";
import { NcfasListCard } from "./_components/ncfas-list-card";
import { NcfasFormDialog } from "./_components/ncfas-form-dialog";

export default function NCFASPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [nna, setNna] = useState<NNA | null>(null);
  const [familiares, setFamiliares] = useState<Familiar[]>([]);
  const [evaluations, setEvaluations] = useState<NCFASEvaluacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingItem, setEditingItem] = useState<NCFASEvaluacion | undefined>(undefined);

  const loadEvaluations = async () => {
    setLoading(true);
    try { setEvaluations(await api.ncfas.listByNna(id)); }
    catch { setEvaluations([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [nnaData, famList] = await Promise.all([
          api.nna.get(id),
          api.familiares.list(),
        ]);
        if (cancelled) return;
        setNna(nnaData);
        setFamiliares(famList);
        await loadEvaluations();
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error inesperado");
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const openCreate = () => {
    setDialogMode("create");
    setEditingItem(undefined);
    setDialogOpen(true);
  };

  const openEdit = (item: NCFASEvaluacion) => {
    setDialogMode("edit");
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleSaved = (saved: NCFASEvaluacion) => {
    if (dialogMode === "create") {
      setEvaluations((prev) => [...prev, saved]);
    } else {
      setEvaluations((prev) =>
        prev.map((e) => (e.id_ncfas === saved.id_ncfas ? saved : e))
      );
    }
  };

  if (error || !nna) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-destructive">{error || "NNA no encontrado"}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="-ml-2 mb-4">
        <Link href={`/nna/${id}`}><ArrowLeftIcon /> Volver al resumen</Link>
      </Button>
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{nna.nombre}</CardTitle>
        </CardHeader>
      </Card>

      <h2 className="text-lg font-semibold mb-3">NCFAS</h2>

      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground">
          {evaluations.length} registro{evaluations.length !== 1 ? "s" : ""}
        </span>
        <Button size="sm" onClick={openCreate}>
          <PlusIcon /> Nuevo NCFAS
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8"><Spinner className="size-5" /></div>
      ) : evaluations.length === 0 ? (
        <Empty><p className="text-sm text-muted-foreground">Sin registros de NCFAS.</p></Empty>
      ) : (
        <div className="space-y-3">
          {evaluations.map((item) => (
            <NcfasListCard
              key={item.id_ncfas}
              item={item}
              familiares={familiares}
              onEdit={openEdit}
            />
          ))}
        </div>
      )}

      <NcfasFormDialog
        key={dialogMode + (editingItem?.id_ncfas || "new")}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        nnaId={id}
        familiares={familiares}
        evaluation={editingItem}
        onSaved={handleSaved}
      />
    </div>
  );
}
