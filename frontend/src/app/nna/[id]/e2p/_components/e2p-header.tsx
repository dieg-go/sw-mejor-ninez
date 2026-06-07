"use client";

import Link from "next/link";
import { ArrowLeftIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

interface E2PHeaderProps {
  nnaId: string;
  nnaName: string | null;
  itemCount: number;
  onNew: () => void;
}

export function E2PHeader({ nnaId, nnaName, itemCount, onNew }: E2PHeaderProps) {
  return (
    <>
      <Button variant="ghost" asChild className="-ml-2 mb-4">
        <Link href={`/nna/${nnaId}`}><ArrowLeftIcon /> Volver al resumen</Link>
      </Button>
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{nnaName || "—"}</CardTitle>
        </CardHeader>
      </Card>
      <h2 className="text-lg font-semibold mb-3">E2P</h2>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground">{itemCount} registro{itemCount !== 1 ? "s" : ""}</span>
        <Button size="sm" onClick={onNew}><PlusIcon /> Nuevo E2P</Button>
      </div>
    </>
  );
}
