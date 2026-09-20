import { Link } from "@/lib/navigation";
import { ArrowRightIcon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TONES = {
  neutral: {
    tile: "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
    bar: "bg-transparent",
  },
  ok: {
    tile: "bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:group-hover:bg-emerald-900",
    bar: "bg-emerald-500",
  },
  warn: {
    tile: "bg-amber-100 text-amber-700 group-hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:group-hover:bg-amber-900",
    bar: "bg-amber-500",
  },
  danger: {
    tile: "bg-alert/10 text-alert group-hover:bg-alert/20",
    bar: "bg-alert",
  },
  accent: {
    tile: "bg-primary/10 text-primary group-hover:bg-primary/20",
    bar: "bg-primary",
  },
} as const;

export type SectionTone = keyof typeof TONES;

export function SectionCard({
  href,
  icon: Icon,
  label,
  loading,
  error,
  isEmpty,
  tone = "neutral",
  children,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  tone?: SectionTone;
  children: React.ReactNode;
}) {
  const t = TONES[tone];

  return (
    <Link href={href} className="group block h-full">
      <Card className="relative h-full overflow-hidden transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
        <span className={cn("absolute inset-x-0 top-0 h-0.5", t.bar)} aria-hidden />
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-md transition-colors",
                  t.tile
                )}
              >
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
