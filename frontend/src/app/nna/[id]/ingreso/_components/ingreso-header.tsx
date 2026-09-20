import { Link } from "@/lib/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface IngresoHeaderProps {
  nnaId: string;
  nnaName: string | null;
  idCaso?: string;
}

export function IngresoHeader({ nnaId, nnaName, idCaso }: IngresoHeaderProps) {
  return (
    <>
      <Button variant="ghost" asChild className="-ml-2 mb-4">
        <Link href={`/nna/${nnaId}${idCaso ? `?id_caso=${idCaso}` : ""}`}>
          <ArrowLeftIcon /> Volver al resumen
        </Link>
      </Button>
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{nnaName}</CardTitle>
        </CardHeader>
      </Card>
    </>
  );
}
