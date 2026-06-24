import type { LucideIcon } from "lucide-react";

export function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | null;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex items-start gap-2">
      {Icon && (
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="size-3.5" />
        </div>
      )}
      <div>
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="text-sm font-medium">{value || "—"}</dd>
      </div>
    </div>
  );
}
