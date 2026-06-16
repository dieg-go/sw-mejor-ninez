"use client";

import { cn } from "@/lib/utils";

type StepNumber = 1 | 2 | 3;

function StepperTab({
  step,
  current,
  label,
  onClick,
  enabled,
}: {
  step: StepNumber;
  current: number;
  label: string;
  onClick: () => void;
  enabled: boolean;
}) {
  const active = current === step;
  return (
    <button
      onClick={() => { if (enabled) onClick(); }}
      disabled={!enabled}
      className={cn(
        "flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all",
        active
          ? "border-primary bg-primary/5 text-primary font-semibold shadow-sm"
          : enabled
            ? "border-muted-foreground/20 hover:border-primary/50 text-muted-foreground hover:text-foreground cursor-pointer"
            : "opacity-40 text-muted-foreground cursor-not-allowed bg-muted/10"
      )}
    >
      <span className="text-xs uppercase tracking-wider font-mono">Paso 0{step}</span>
      <span className="text-xs font-semibold hidden sm:inline mt-0.5">{label}</span>
    </button>
  );
}

export function StepperNav({
  activeStep,
  onStep,
  hasInforme,
  hasNotificaciones,
}: {
  activeStep: StepNumber;
  onStep: (step: StepNumber) => void;
  hasInforme: boolean;
  hasNotificaciones: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <StepperTab step={1} current={activeStep} label="1. Informe de Hijo" onClick={() => onStep(1)} enabled={true} />
      <StepperTab step={2} current={activeStep} label="2. Identificar Familia" onClick={() => onStep(2)} enabled={hasInforme} />
      <StepperTab step={3} current={activeStep} label="3. Cartas y Evaluación" onClick={() => onStep(3)} enabled={hasNotificaciones} />
    </div>
  );
}
