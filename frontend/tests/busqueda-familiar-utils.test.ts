import { describe, expect, it } from "vitest";

import {
  diasDesde,
  formatDate,
  RESULTADOS_CONTACTO,
} from "@/app/nna/[id]/busqueda-familiar/_components/utils";

function iso(haceDias: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - haceDias);
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

describe("RESULTADOS_CONTACTO", () => {
  it("es el catalogo cerrado que usa el formulario de notificacion", () => {
    expect([...RESULTADOS_CONTACTO]).toEqual([
      "No responde",
      "Rechaza participación",
      "Acepta evaluación",
      "Fallecido",
    ]);
  });

  it("incluye el valor que dispara la alerta verde", () => {
    expect(RESULTADOS_CONTACTO).toContain("Acepta evaluación");
  });
});

describe("formatDate", () => {
  it("devuelve un guion largo sin fecha", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("")).toBe("—");
  });

  it("formatea en es-CL sin corrimiento de zona", () => {
    expect(formatDate("2024-01-01")).toBe("01-01-2024");
    expect(formatDate("2024-12-31")).toBe("31-12-2024");
  });
});

describe("diasDesde", () => {
  it("devuelve null sin fecha", () => {
    expect(diasDesde(null)).toBeNull();
    expect(diasDesde("")).toBeNull();
  });

  it("devuelve 0 para hoy", () => {
    expect(diasDesde(iso(0))).toBe(0);
  });

  it("cuenta los dias transcurridos", () => {
    expect(diasDesde(iso(1))).toBe(1);
    expect(diasDesde(iso(15))).toBe(15);
    expect(diasDesde(iso(30))).toBe(30);
  });

  it("devuelve negativo para una fecha futura", () => {
    expect(diasDesde(iso(-3))).toBe(-3);
  });
});
