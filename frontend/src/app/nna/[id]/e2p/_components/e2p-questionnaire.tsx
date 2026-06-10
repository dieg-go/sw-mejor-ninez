"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { E2PQuestions } from "@/lib/api";
import { LIKERT_OPTIONS, CATEGORY_COLORS } from "./e2p-utils";

// 1. Convertido en un verdadero Componente Funcional de React
interface LikertRadiosProps {
  questionId: number;
  value: number | undefined;
  onChange: (qId: number, val: number) => void;
  disabled: boolean;
}

function LikertRadios({ questionId, value, onChange, disabled }: LikertRadiosProps) {
  return (
    <div className="flex gap-2 sm:gap-4 flex-wrap mt-2">
      {LIKERT_OPTIONS.map((opt) => (
        <label 
          key={opt.value} 
          // Se agregó padding (p-1 o py-1 px-2) para mejorar el área táctil en móviles
          className="flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer hover:bg-muted/50 rounded-md p-1 transition-colors"
        >
          <input
            type="radio"
            name={`q-${questionId}`}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(questionId, opt.value)}
            disabled={disabled}
            className="size-4 accent-primary" // Ligeramente más grande (size-4) para mejor usabilidad
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

interface E2PQuestionnaireProps {
  questions: E2PQuestions;
  answers: Record<string, number>;
  onChange: (qId: number, val: number) => void;
  disabled: boolean;
}

export function E2PQuestionnaire({ questions, answers, onChange, disabled }: E2PQuestionnaireProps) {
  const grouped = useMemo(() => {
    const cats: Record<string, typeof questions.preguntas> = {};
    for (const q of questions.preguntas) {
      (cats[q.categoria] ??= []).push(q);
    }
    return Object.entries(cats);
  }, [questions]);

  return (
    // Agregué 'pr-2' para que la barra de scroll (overflow-y) no se superponga visualmente al borde derecho
    <div className="max-h-[50vh] overflow-y-auto space-y-6 pr-2">
      {grouped.map(([cat, qs]) => (
        <div key={cat} className={cn("border-l-4 rounded-r-md p-4 bg-card", CATEGORY_COLORS[cat] || "border-border")}>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            {cat}
          </h4>
          <div className="space-y-4">
            {qs.map((q) => (
              // 2. Uso de fieldset y legend para Accesibilidad (a11y)
              <fieldset key={q.id} className="border-b last:border-0 pb-3 last:pb-0 border-border/50">
                <legend className="text-sm font-medium w-full">
                  <span className="text-muted-foreground mr-1">{q.id}.</span> 
                  {q.texto}
                </legend>
                <LikertRadios 
                  questionId={q.id} 
                  value={answers[String(q.id)]} 
                  onChange={onChange} 
                  disabled={disabled} 
                />
              </fieldset>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}