import { describe, expect, it } from "vitest";

import {
  CATALOGO_CAUSALES,
  CATALOGO_DERECHOS,
  CATALOGO_DOCUMENTACION_INGRESO,
  CATALOGO_MOTIVO_EGRESO,
  CATALOGO_PROGRAMAS_PREVIOS,
  detectTipoCausa,
} from "@/lib/catalogos";

describe("detectTipoCausa", () => {
  it("reconoce la causa proteccional", () => {
    expect(detectTipoCausa("P-5678-2025")).toBe("Proteccional (P)");
    expect(detectTipoCausa("p-5678-2025")).toBe("Proteccional (P)");
  });

  it("reconoce la causa de vulneracion", () => {
    expect(detectTipoCausa("X-1234-2025")).toBe("Vulneración (X)");
    expect(detectTipoCausa("x-1234-2025")).toBe("Vulneración (X)");
  });

  it("devuelve null para cualquier otra letra inicial", () => {
    for (const letra of ["A", "C", "O", "R", "Z", "9"]) {
      expect(detectTipoCausa(`${letra}-1234-2025`)).toBeNull();
    }
  });

  it("devuelve null sin RIT", () => {
    expect(detectTipoCausa("")).toBeNull();
  });

  it("solo mira el primer caracter", () => {
    expect(detectTipoCausa("PX-1234")).toBe("Proteccional (P)");
    expect(detectTipoCausa(" P-1234")).toBeNull();
  });

  it("ignora el formato del resto del RIT", () => {
    expect(detectTipoCausa("P")).toBe("Proteccional (P)");
    expect(detectTipoCausa("X")).toBe("Vulneración (X)");
  });
});

describe("catalogos", () => {
  it("el catalogo de causales no tiene entradas vacias ni repetidas", () => {
    expect(CATALOGO_CAUSALES.every((c) => c.trim().length > 0)).toBe(true);
    expect(new Set(CATALOGO_CAUSALES).size).toBe(CATALOGO_CAUSALES.length);
    expect(CATALOGO_CAUSALES.length).toBeGreaterThan(10);
  });

  it("el catalogo de causales cubre las causales de ingreso del dominio", () => {
    const esperadas = [
      "Negligencia parental o del adulto responsable",
      "Inhabilidad parental o del adulto responsable",
      "Violencia Intrafamiliar directa o vicaria",
      "Consumo de drogas",
      "Deserción escolar",
    ];
    for (const causal of esperadas) {
      expect(CATALOGO_CAUSALES).toContain(causal);
    }
  });

  it("el catalogo de derechos no tiene repetidos", () => {
    expect(new Set(CATALOGO_DERECHOS).size).toBe(CATALOGO_DERECHOS.length);
  });

  it("el catalogo de derechos incluye los derechos de la Convencion mas usados", () => {
    for (const derecho of ["Interés Superior", "No discriminación", "Ser oído", "Identidad"]) {
      expect(CATALOGO_DERECHOS).toContain(derecho);
    }
  });

  it("el catalogo de documentacion de ingreso es el esperado", () => {
    expect(CATALOGO_DOCUMENTACION_INGRESO).toEqual([
      "Constatación de Lesiones",
      "Orden Judicial de Ingreso",
      "Certificado de Nacimiento",
      "Otro",
    ]);
  });

  it("el catalogo de programas previos termina en Otro", () => {
    expect(CATALOGO_PROGRAMAS_PREVIOS.at(-1)).toBe("Otro");
  });

  it("el catalogo de motivos de egreso termina en Otro", () => {
    expect(CATALOGO_MOTIVO_EGRESO.at(-1)).toBe("Otro");
    expect(CATALOGO_MOTIVO_EGRESO).toContain(
      "Agravamiento o cronicidad de las vulneraciones",
    );
  });
});
