"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { E2PQuestions } from "@/lib/api";
import { LIKERT_OPTIONS, CATEGORY_COLORS } from "./e2p-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      (cats[q.dimension] ??= []).push(q);
    }
    return Object.entries(cats);
  }, [questions]);

  return (
    <div className="max-h-[50vh] overflow-y-auto space-y-6 pr-2">
      {grouped.map(([cat, qs]) => (
        <div key={cat} className={cn("border-l-4 rounded-r-md p-4 bg-card", CATEGORY_COLORS[cat] || "border-border")}>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            {cat}
          </h4>
          <div className="space-y-2">
            {qs.map((q) => (
              <div key={q.id} className="flex items-center justify-between gap-3 border-b last:border-0 pb-2 last:pb-0 border-border/50">
                <span className="text-sm shrink min-w-0">
                  <span className="text-muted-foreground mr-1">{q.id}.</span>
                  {q.texto}
                </span>
                <Select
                  value={answers[String(q.id)] !== undefined ? String(answers[String(q.id)]) : undefined}
                  onValueChange={(v) => onChange(q.id, Number(v))}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-40 shrink-0">
                    <SelectValue placeholder="..." />
                  </SelectTrigger>
                  <SelectContent>
                    {LIKERT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}