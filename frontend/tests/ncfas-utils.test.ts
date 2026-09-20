import { describe, expect, it } from "vitest";

import {
  buildEmptyRespuestas,
  DIMENSIONES_REUNIFICACION,
  DIMENSIONES_SERV_GENERALES,
  formatDate,
  isDimensionVisible,
  makeItemKey,
  MOMENTOS,
  PUNTAJE_OPCIONES,
} from "@/app/nna/[id]/ncfas/_components/ncfas-utils";

describe("MOMENTOS", () => {
  it("son los tres que acepta el backend", () => {
    expect([...MOMENTOS]).toEqual(["Ingreso", "Intermedio", "Cierre"]);
  });
});

describe("PUNTAJE_OPCIONES", () => {
  it("cubre el catalogo cerrado de puntajes", () => {
    expect(PUNTAJE_OPCIONES.map((o) => o.value)).toEqual([
      "+2",
      "+1",
      "0",
      "-1",
      "-2",
      "-3",
      "N/A",
      "DN",
    ]);
  });

  it("todas las opciones tienen etiqueta", () => {
    for (const opcion of PUNTAJE_OPCIONES) {
      expect(opcion.label, opcion.value).toBeTruthy();
      expect(opcion.label).toContain(opcion.value);
    }
  });
});

describe("dimensiones", () => {
  it("las de servicios generales son A a H", () => {
    expect(DIMENSIONES_SERV_GENERALES).toEqual(["A", "B", "C", "D", "E", "F", "G", "H"]);
  });

  it("las de reunificacion son I y J", () => {
    expect(DIMENSIONES_REUNIFICACION).toEqual(["I", "J"]);
  });

  it("no se solapan", () => {
    const comunes = DIMENSIONES_SERV_GENERALES.filter((d) =>
      DIMENSIONES_REUNIFICACION.includes(d),
    );
    expect(comunes).toEqual([]);
  });
});

describe("isDimensionVisible", () => {
  it("las dimensiones de servicios generales siempre se ven", () => {
    for (const letra of DIMENSIONES_SERV_GENERALES) {
      expect(isDimensionVisible(letra, false), letra).toBe(true);
      expect(isDimensionVisible(letra, true), letra).toBe(true);
    }
  });

  it("las de reunificacion solo se ven en un NCFAS de reunificacion", () => {
    for (const letra of DIMENSIONES_REUNIFICACION) {
      expect(isDimensionVisible(letra, true), letra).toBe(true);
      expect(isDimensionVisible(letra, false), letra).toBe(false);
    }
  });

  it("una letra desconocida nunca se ve", () => {
    for (const letra of ["K", "Z", "", "a", "AA"]) {
      expect(isDimensionVisible(letra, true), letra).toBe(false);
      expect(isDimensionVisible(letra, false), letra).toBe(false);
    }
  });

  it("distingue mayusculas de minusculas", () => {
    expect(isDimensionVisible("a", true)).toBe(false);
    expect(isDimensionVisible("i", true)).toBe(false);
  });
});

describe("makeItemKey", () => {
  it("une la letra y el numero con guion bajo", () => {
    expect(makeItemKey("A", 1)).toBe("A_1");
    expect(makeItemKey("J", 6)).toBe("J_6");
  });

  it("coincide con el formato que espera el backend", () => {
    // El backend construye la clave igual en `_make_item_key`.
    expect(makeItemKey("H", 8)).toBe("H_8");
  });

  it("acepta numeros de dos cifras", () => {
    expect(makeItemKey("A", 10)).toBe("A_10");
  });
});

describe("buildEmptyRespuestas", () => {
  it("inicializa los tres momentos vacios", () => {
    const vacio = buildEmptyRespuestas();
    expect(Object.keys(vacio)).toEqual(["Ingreso", "Intermedio", "Cierre"]);
    for (const momento of MOMENTOS) {
      expect(vacio[momento]).toEqual({});
    }
  });

  it("devuelve un objeto nuevo cada vez", () => {
    const primero = buildEmptyRespuestas();
    const segundo = buildEmptyRespuestas();
    expect(primero).not.toBe(segundo);
    primero.Ingreso.A_1 = "+2";
    expect(segundo.Ingreso).toEqual({});
  });

  it("los momentos internos tampoco se comparten", () => {
    const vacio = buildEmptyRespuestas();
    vacio.Ingreso.A_1 = "+1";
    expect(vacio.Intermedio).toEqual({});
    expect(vacio.Cierre).toEqual({});
  });
});

describe("formatDate", () => {
  it("devuelve un guion largo sin fecha", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("formatea en es-CL sin corrimiento de zona", () => {
    expect(formatDate("2024-01-01")).toBe("01-01-2024");
    expect(formatDate("2024-06-15")).toBe("15-06-2024");
  });
});
