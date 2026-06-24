import Link from "next/link";
import { ArrowRightIcon, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SectionCard({
  href,
  icon: Icon,
  label,
  loading,
  error,
  isEmpty,
  children,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="block group h-full">
      <Card className="h-full transition-all hover:border-primary/50 hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                <Icon className="size-4" />
              </div>
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
            </div>
            <ArrowRightIcon className="size-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-3 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
            </div>
          ) : error ? (
            <p className="text-xs text-destructive/80">Error al cargar</p>
          ) : isEmpty ? (
            <p className="text-xs text-muted-foreground/70 italic">Sin registros</p>
          ) : (
            children
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
