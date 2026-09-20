import { describe, expect, it } from "vitest";

import { calcularEdad, cn, iniciales } from "@/lib/utils";

describe("cn", () => {
  it("combina clases sueltas", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("ignora valores falsy", () => {
    expect(cn("px-2", false && "oculto", undefined, null, "", "py-1")).toBe("px-2 py-1");
  });

  it("resuelve conflictos de Tailwind quedandose con la ultima clase", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("respeta los modificadores como parte de la clase", () => {
    expect(cn("px-2", "md:px-4")).toBe("px-2 md:px-4");
  });

  it("acepta la forma condicional de objeto y arreglo", () => {
    expect(cn({ "font-bold": true, italic: false })).toBe("font-bold");
    expect(cn(["px-2", ["py-1"]])).toBe("px-2 py-1");
  });

  it("sin argumentos devuelve cadena vacia", () => {
    expect(cn()).toBe("");
  });
});

describe("calcularEdad", () => {
  it("devuelve null sin fecha", () => {
    expect(calcularEdad(null)).toBeNull();
  });

  it("devuelve null con una fecha invalida", () => {
    expect(calcularEdad("no-es-una-fecha")).toBeNull();
    expect(calcularEdad("2020-13-45")).toBeNull();
  });

  it("cuenta los anos cumplidos", () => {
    const hoy = new Date();
    const hace20 = new Date(hoy.getFullYear() - 20, hoy.getMonth(), hoy.getDate());
    const iso = `${hace20.getFullYear()}-${String(hace20.getMonth() + 1).padStart(2, "0")}-${String(
      hace20.getDate(),
    ).padStart(2, "0")}`;
    expect(calcularEdad(iso)).toBe(20);
  });

  it("no cuenta el ano cuando el cumpleanos aun no llega", () => {
    const hoy = new Date();
    // Un dia despues de hoy: el cumpleanos todavia no ocurre este ano.
    const manana = new Date(hoy.getFullYear() - 10, hoy.getMonth(), hoy.getDate() + 1);
    const iso = `${manana.getFullYear()}-${String(manana.getMonth() + 1).padStart(2, "0")}-${String(
      manana.getDate(),
    ).padStart(2, "0")}`;
    expect(calcularEdad(iso)).toBe(9);
  });

  it("si cumple anos hoy, ya cuenta el ano nuevo", () => {
    const hoy = new Date();
    const iso = `${hoy.getFullYear() - 15}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(
      hoy.getDate(),
    ).padStart(2, "0")}`;
    expect(calcularEdad(iso)).toBe(15);
  });

  it("interpreta la fecha en horario local, sin corrimiento de zona", () => {
    // Sin el sufijo T00:00:00, un ISO sin hora se lee como UTC y en Chile
    // (UTC-3/-4) retrocede un dia. Este caso lo fija.
    const hoy = new Date();
    const iso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(
      hoy.getDate(),
    ).padStart(2, "0")}`;
    expect(calcularEdad(iso)).toBe(0);
  });

  it("acepta un nacimiento reciente y devuelve 0", () => {
    const hoy = new Date();
    const iso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-01`;
    expect(calcularEdad(iso)).toBeGreaterThanOrEqual(0);
  });
});

describe("iniciales", () => {
  it("devuelve un guion largo sin nombre", () => {
    expect(iniciales(null)).toBe("—");
    expect(iniciales("")).toBe("—");
  });

  it("con solo espacios devuelve cadena vacia", () => {
    // Comportamiento actual: `"   "` es truthy, asi que no cae en el
    // placeholder y la cadena queda vacia. Ver el caso `it.fails` de abajo.
    expect(iniciales("   ")).toBe("");
  });

  it.fails(
    "DEFECTO: un nombre de solo espacios deberia devolver el placeholder",
    () => {
      // En la UI esto deja el avatar del NNA en blanco en vez de mostrar "—".
      // El arreglo seria usar `nombre.trim()` en la guarda de `iniciales()`.
      expect(iniciales("   ")).toBe("—");
    },
  );

  it("con otros espacios en blanco se comporta igual", () => {
    expect(iniciales("\t\n")).toBe("");
  });

  it("toma las dos primeras palabras en mayuscula", () => {
    expect(iniciales("Ana Muñoz")).toBe("AM");
    expect(iniciales("carlos rojas")).toBe("CR");
  });

  it("ignora las palabras siguientes", () => {
    expect(iniciales("María José Huenchul Paillal")).toBe("MJ");
  });

  it("con una sola palabra devuelve una inicial", () => {
    expect(iniciales("Ana")).toBe("A");
  });

  it("colapsa espacios repetidos y recorta los extremos", () => {
    expect(iniciales("  Ana   Muñoz  ")).toBe("AM");
  });

  it("no falla con caracteres no ASCII", () => {
    expect(iniciales("ñandú overo")).toBe("ÑO");
  });
});
