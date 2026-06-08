import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { STEPS, type StepIndex } from "./types";

export function StepIndicator({ current, onStep }: { current: StepIndex; onStep: (s: StepIndex) => void }) {
  return (
    <nav className="flex items-center justify-center gap-1 mb-8">
      {STEPS.map((label, i) => {
        const idx = i as StepIndex;
        const isCurrent = idx === current;
        const isPast = idx < current;
        return (
          <div key={label} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onStep(idx)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                isCurrent && "bg-primary text-primary-foreground",
                isPast && "bg-primary/10 text-primary hover:bg-primary/20",
                !isCurrent && !isPast && "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-xs",
                  isCurrent && "bg-primary-foreground text-primary",
                  isPast && "bg-primary text-primary-foreground",
                  !isCurrent && !isPast && "border border-muted-foreground/40 text-muted-foreground",
                )}
              >
                {isPast ? <CheckIcon className="size-3" /> : i + 1}
              </span>
              <span className="max-sm:hidden">{label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <span className={cn("w-6 h-px", idx < current ? "bg-primary/40" : "bg-border")} />
            )}
          </div>
        );
      })}
    </nav>
  );
}
