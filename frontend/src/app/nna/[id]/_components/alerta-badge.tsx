import { AlertTriangleIcon, ClockIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AlertaBadge({ tipo }: { tipo: "roja" | "naranja" | "verde" }) {
  if (tipo === "roja") {
    return (
      <Badge variant="destructive" className="self-start text-xs gap-1">
        <AlertTriangleIcon className="h-3 w-3" />
        Plazos vencidos
      </Badge>
    );
  }
  if (tipo === "naranja") {
    return (
      <Badge variant="outline" className="self-start text-xs gap-1 border-orange-500 text-orange-600 bg-orange-50">
        <ClockIcon className="h-3 w-3" />
        Pendiente 2ª carta
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="self-start text-xs gap-1 bg-green-100 text-green-700">
      En evaluación
    </Badge>
  );
}
