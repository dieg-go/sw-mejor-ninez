import { describe, expect, it } from "vitest";

import {
  ageToRangoEtario,
  CATEGORY_COLORS,
  edadEnMeses,
  formatDate,
  formatRangoEtario,
  getLikertLabel,
  LIKERT_OPTIONS,
  RANGOS_ETARIOS,
  RESULTADO_STYLES,
  ZONE_COLORS,
} from "@/app/nna/[id]/e2p/_components/e2p-utils";

/**
 * `ageToRangoEtario` decide la version del cuestionario E2P. Un error de un mes
 * en los bordes entrega el instrumento equivocado, asi que se prueban todos los
 * limites de la tabla `RANGOS_ETARIOS`.
 */

function rangoPara(nacimiento: string, evaluacion: string): string | null {
  return ageToRangoEtario(nacimiento, new Date(`${evaluacion}T00:00:00`));
}

describe("RANGOS_ETARIOS", () => {
  it("cubre los ocho rangos sin huecos ni solapamientos", () => {
    expect(RANGOS_ETARIOS).toHaveLength(8);
    for (let i = 1; i < RANGOS_ETARIOS.length; i++) {
      expect(RANGOS_ETARIOS[i].minMeses).toBe(RANGOS_ETARIOS[i - 1].maxMeses + 1);
    }
    expect(RANGOS_ETARIOS[0].minMeses).toBe(0);
    expect(RANGOS_ETARIOS.at(-1)?.maxMeses).toBe(204);
  });

  it("sus nombres coinciden con los que acepta el backend", () => {
    expect(RANGOS_ETARIOS.map((r) => r.rango)).toEqual([
      "0-3_meses",
      "4-10_meses",
      "11-18_meses",
      "19-36_meses",
      "3-5_anos",
      "6-7_anos",
      "8-12_anos",
      "13-17_anos",
    ]);
  });
});

describe("ageToRangoEtario", () => {
  it("devuelve null sin fecha de nacimiento", () => {
    expect(ageToRangoEtario(null, new Date("2025-01-01T00:00:00"))).toBeNull();
  });

  it("con una fecha de nacimiento invalida devuelve null", () => {
    // Antes caia al ultimo rango (`13-17_anos`): `NaN` no entra en ningun rango
    // y tampoco es `< 0`, asi que llegaba al fallback. Era el peor fallback
    // posible — a un NNA con la fecha mal ingresada se le aplicaba el
    // instrumento de un adolescente, sin aviso (defecto F2).
    expect(ageToRangoEtario("no-es-fecha", new Date("2025-01-01T00:00:00"))).toBeNull();
    expect(ageToRangoEtario("2024-13-45", new Date("2025-01-01T00:00:00"))).toBeNull();
    expect(ageToRangoEtario("", new Date("2025-01-01T00:00:00"))).toBeNull();
  });

  it("con una fecha de evaluacion invalida devuelve null", () => {
    // Misma causa raiz por el otro lado del calculo.
    expect(ageToRangoEtario("2024-01-15", new Date("no-es-fecha"))).toBeNull();
  });

  describe("bordes de cada rango (nacimiento 2024-01-15)", () => {
    const casos: [string, string][] = [
      ["2024-01-15", "0-3_meses"], // 0 meses
      ["2024-04-15", "0-3_meses"], // 3 meses (maximo)
      ["2024-05-15", "4-10_meses"], // 4 meses (minimo)
      ["2024-11-15", "4-10_meses"], // 10 meses (maximo)
      ["2024-12-15", "11-18_meses"], // 11 meses (minimo)
      ["2025-07-15", "11-18_meses"], // 18 meses (maximo)
      ["2025-08-15", "19-36_meses"], // 19 meses (minimo)
      ["2027-01-15", "19-36_meses"], // 36 meses (maximo)
      ["2027-02-15", "3-5_anos"], // 37 meses (minimo)
      ["2029-01-15", "3-5_anos"], // 60 meses (maximo)
      ["2029-02-15", "6-7_anos"], // 61 meses (minimo)
      ["2031-01-15", "6-7_anos"], // 84 meses (maximo)
      ["2031-02-15", "8-12_anos"], // 85 meses (minimo)
      ["2036-01-15", "8-12_anos"], // 144 meses (maximo)
      ["2036-02-15", "13-17_anos"], // 145 meses (minimo)
      ["2041-01-15", "13-17_anos"], // 204 meses (maximo)
    ];

    it.each(casos)("nacido 2024-01-15 evaluado %s -> %s", (evaluacion, esperado) => {
      expect(rangoPara("2024-01-15", evaluacion)).toBe(esperado);
    });
  });

  it("por encima del ultimo rango se queda en 13-17_anos", () => {
    expect(rangoPara("2024-01-15", "2041-02-15")).toBe("13-17_anos");
    expect(rangoPara("2000-01-15", "2050-01-15")).toBe("13-17_anos");
  });

  it("con la evaluacion antes del nacimiento usa el primer rango", () => {
    expect(rangoPara("2025-06-01", "2025-01-01")).toBe("0-3_meses");
  });

  it("ignora el dia del mes: solo compara ano y mes", () => {
    // Mismo mes y ano -> 0 meses, aunque el dia de evaluacion sea anterior.
    expect(rangoPara("2024-03-31", "2024-03-01")).toBe("0-3_meses");
    // Un dia despues del nacimiento pero en el mes siguiente -> 1 mes.
    expect(rangoPara("2024-03-31", "2024-04-01")).toBe("0-3_meses");
  });

  it("cambia de rango al cambiar el mes, no el dia", () => {
    expect(rangoPara("2024-01-01", "2024-04-30")).toBe("0-3_meses");
    expect(rangoPara("2024-01-31", "2024-05-01")).toBe("4-10_meses");
  });

  it("cubre todos los meses de 0 a 204 con algun rango", () => {
    for (let meses = 0; meses <= 204; meses++) {
      const nacimiento = new Date(2020, 0, 15);
      const evaluacion = new Date(2020, meses, 15);
      const rango = ageToRangoEtario(
        `${nacimiento.getFullYear()}-01-15`,
        evaluacion,
      );
      expect(rango, `mes ${meses}`).not.toBeNull();
    }
  });
});

describe("edadEnMeses", () => {
  it("cuenta los meses entre nacimiento y evaluacion", () => {
    expect(edadEnMeses("2024-01-15", new Date("2024-01-15T00:00:00"))).toBe(0);
    expect(edadEnMeses("2024-01-15", new Date("2024-04-15T00:00:00"))).toBe(3);
    expect(edadEnMeses("2024-01-15", new Date("2026-01-15T00:00:00"))).toBe(24);
  });

  it("devuelve null sin fecha de nacimiento", () => {
    expect(edadEnMeses(null, new Date("2025-01-01T00:00:00"))).toBeNull();
    expect(edadEnMeses("", new Date("2025-01-01T00:00:00"))).toBeNull();
  });

  it("devuelve null con cualquier fecha invalida", () => {
    // Es la guarda que impide que un `NaN` llegue al payload como `null`
    // (el backend responde 422 porque `edad_meses_evaluacion` es `int`).
    expect(edadEnMeses("no-es-fecha", new Date("2025-01-01T00:00:00"))).toBeNull();
    expect(edadEnMeses("2024-01-15", new Date("no-es-fecha"))).toBeNull();
    expect(edadEnMeses("2024-13-45", new Date("2024-01-15T00:00:00"))).toBeNull();
  });

  it("devuelve negativo si la evaluacion es anterior al nacimiento", () => {
    expect(edadEnMeses("2025-06-01", new Date("2025-01-01T00:00:00"))).toBe(-5);
  });

  it("coincide con el rango que elige ageToRangoEtario", () => {
    // Las dos funciones comparten el calculo: si se separan, el rango y la edad
    // enviada al backend se contradicen.
    const meses = edadEnMeses("2024-01-15", new Date("2036-02-15T00:00:00"));
    expect(meses).toBe(145);
    expect(rangoPara("2024-01-15", "2036-02-15")).toBe("13-17_anos");
  });
});

describe("formatRangoEtario", () => {
  it("traduce los ocho rangos a etiquetas legibles", () => {
    expect(formatRangoEtario("0-3_meses")).toBe("0 a 3 meses");
    expect(formatRangoEtario("19-36_meses")).toBe("19 a 36 meses");
    expect(formatRangoEtario("3-5_anos")).toBe("3 a 5 años");
    expect(formatRangoEtario("13-17_anos")).toBe("13 a 17 años");
  });

  it("devuelve el valor original si no lo conoce", () => {
    expect(formatRangoEtario("99-100_anos")).toBe("99-100_anos");
    expect(formatRangoEtario("")).toBe("");
  });
});

describe("formatDate", () => {
  it("devuelve un guion largo sin fecha", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("formatea en es-CL sin corrimiento de zona", () => {
    // El 1 de enero no debe mostrarse como 31 de diciembre.
    expect(formatDate("2024-01-01")).toBe("01-01-2024");
    expect(formatDate("2024-12-31")).toBe("31-12-2024");
  });

  it("formatea correctamente el primer dia de cada mes", () => {
    for (let mes = 1; mes <= 12; mes++) {
      const iso = `2024-${String(mes).padStart(2, "0")}-01`;
      expect(formatDate(iso), iso).toBe(`01-${String(mes).padStart(2, "0")}-2024`);
    }
  });
});

describe("getLikertLabel", () => {
  it("traduce los cinco valores de la escala", () => {
    expect(getLikertLabel(0)).toBe("Nunca");
    expect(getLikertLabel(1)).toBe("Casi Nunca");
    expect(getLikertLabel(2)).toBe("A veces");
    expect(getLikertLabel(3)).toBe("Casi Siempre");
    expect(getLikertLabel(4)).toBe("Siempre");
  });

  it("devuelve un guion largo fuera de la escala", () => {
    expect(getLikertLabel(5)).toBe("—");
    expect(getLikertLabel(-1)).toBe("—");
    expect(getLikertLabel(1.5)).toBe("—");
  });

  it("LIKERT_OPTIONS tiene los cinco valores en orden", () => {
    expect(LIKERT_OPTIONS.map((o) => o.value)).toEqual([0, 1, 2, 3, 4]);
  });
});

describe("mapas de colores", () => {
  it("cubre las cuatro dimensiones del instrumento", () => {
    expect(Object.keys(CATEGORY_COLORS).sort()).toEqual([
      "Formativas",
      "Protectoras",
      "Reflexivas",
      "Vinculares",
    ]);
  });

  it("cubre las tres zonas de frecuencia", () => {
    expect(Object.keys(ZONE_COLORS).sort()).toEqual([
      "Alta frecuencia",
      "Baja frecuencia",
      "Frecuencia intermedia",
    ]);
  });

  it("cubre los tres perfiles de resultado global", () => {
    expect(Object.keys(RESULTADO_STYLES).sort()).toEqual(["Monitoreo", "Optimo", "Riesgo"]);
  });
});
