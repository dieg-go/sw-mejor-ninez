import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api";

/**
 * `src/lib/api.ts` construye la URL con `NEXT_PUBLIC_API_URL` (por defecto
 * `http://localhost:8000/api`) y lee el token de `localStorage`. Se simulan
 * `fetch`, `window` y `localStorage`.
 */

const API_BASE = "http://localhost:8000/api";

class LocalStorageFalso {
  private datos = new Map<string, string>();
  getItem(k: string) {
    return this.datos.has(k) ? (this.datos.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    this.datos.set(k, String(v));
  }
  removeItem(k: string) {
    this.datos.delete(k);
  }
  clear() {
    this.datos.clear();
  }
}

let storage: LocalStorageFalso;
let windowFalso: { location: { href: string } };

function ok(cuerpo: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => cuerpo,
    text: async () => JSON.stringify(cuerpo),
  } as unknown as Response;
}

function fallo(status: number, statusText: string, cuerpo: string): Response {
  return {
    ok: false,
    status,
    statusText,
    json: async () => ({}),
    text: async () => cuerpo,
  } as unknown as Response;
}

function espia(cuerpo: unknown = {}) {
  const fetchFalso = vi.fn().mockResolvedValue(ok(cuerpo));
  vi.stubGlobal("fetch", fetchFalso);
  return fetchFalso;
}

function llamada(fetchFalso: ReturnType<typeof vi.fn>, indice = 0) {
  const [url, opciones] = fetchFalso.mock.calls[indice];
  return { url: String(url), opciones: opciones as RequestInit & { headers: Record<string, string> } };
}

const ID = "00000000-0000-0000-0000-000000000001";

beforeEach(() => {
  storage = new LocalStorageFalso();
  windowFalso = { location: { href: "" } };
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", windowFalso);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("cabeceras y token", () => {
  it("adjunta el Bearer cuando hay token", async () => {
    storage.setItem("auth_token", "token-123");
    const fetchFalso = espia([]);

    await api.nna.list();

    const { opciones } = llamada(fetchFalso);
    expect(opciones.headers["Authorization"]).toBe("Bearer token-123");
  });

  it("no adjunta Authorization sin token", async () => {
    const fetchFalso = espia([]);

    await api.nna.list();

    const { opciones } = llamada(fetchFalso);
    expect(opciones.headers["Authorization"]).toBeUndefined();
  });

  it("manda Content-Type JSON siempre", async () => {
    const fetchFalso = espia([]);
    await api.nna.list();
    expect(llamada(fetchFalso).opciones.headers["Content-Type"]).toBe("application/json");
  });

  it("construye la URL sobre la base de la API", async () => {
    const fetchFalso = espia([]);
    await api.nna.list();
    expect(llamada(fetchFalso).url).toBe(`${API_BASE}/nna?skip=0&limit=100`);
  });
});

describe("manejo de errores", () => {
  it("lanza con el status, el statusText y el cuerpo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(fallo(404, "Not Found", '{"detail":"NNA no encontrado"}')),
    );

    await expect(api.nna.get(ID)).rejects.toThrow(
      '404 Not Found: {"detail":"NNA no encontrado"}',
    );
  });

  it("en 401 limpia la sesion y redirige a /login", async () => {
    storage.setItem("auth_token", "token-vencido");
    storage.setItem("auth_user", '{"id_usuario":"1"}');
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fallo(401, "Unauthorized", "expirado")));

    await expect(api.nna.list()).rejects.toThrow("Sesión expirada");

    expect(storage.getItem("auth_token")).toBeNull();
    expect(storage.getItem("auth_user")).toBeNull();
    expect(windowFalso.location.href).toBe("/login");
  });

  it("en 403 no redirige", async () => {
    storage.setItem("auth_token", "token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fallo(403, "Forbidden", "sin permisos")));

    await expect(api.nna.list()).rejects.toThrow("403 Forbidden");
    expect(windowFalso.location.href).toBe("");
    expect(storage.getItem("auth_token")).toBe("token");
  });

  it("propaga errores de red", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("sin red")));

    await expect(api.nna.list()).rejects.toThrow("sin red");
  });
});

/**
 * Tabla dirigida por datos: cada entrada fija la ruta y el metodo HTTP exactos
 * que el cliente debe usar. Es la red de seguridad contra un cambio de ruta en
 * el backend que el frontend no acompanaria.
 */
describe("contrato de rutas del cliente", () => {
  const CASOS: [string, () => Promise<unknown>, string, string][] = [
    ["nna.list", () => api.nna.list(10, 5), "GET", `/nna?skip=10&limit=5`],
    ["nna.get", () => api.nna.get(ID), "GET", `/nna/${ID}`],
    ["nna.update", () => api.nna.update(ID, { comuna: "Santiago" }), "PUT", `/nna/${ID}`],
    ["casos.list", () => api.casos.list(ID), "GET", `/nna/${ID}/casos`],
    ["casos.get", () => api.casos.get(ID), "GET", `/casos/${ID}`],
    ["casos.update", () => api.casos.update(ID, { estado: "Cerrado" }), "PUT", `/casos/${ID}`],
    ["familiares.list", () => api.familiares.list(), "GET", `/familiares?skip=0&limit=100`],
    ["familiares.get", () => api.familiares.get(ID), "GET", `/familiares/${ID}`],
    [
      "historialConsumoNNA.list",
      () => api.historialConsumoNNA.list(ID),
      "GET",
      `/nna/${ID}/historial-consumo`,
    ],
    [
      "historialConsumoNNA.update",
      () => api.historialConsumoNNA.update(ID, { estado_consumo: "Activo" }),
      "PUT",
      `/historial-consumo-nna/${ID}`,
    ],
    [
      "historialConsumoAdulto.list",
      () => api.historialConsumoAdulto.list(ID),
      "GET",
      `/familiares/${ID}/historial-consumo`,
    ],
    ["discapacidadNNA.list", () => api.discapacidadNNA.list(ID), "GET", `/nna/${ID}/discapacidades`],
    [
      "discapacidadAdulto.update",
      () => api.discapacidadAdulto.update(ID, { tipo: "Visual" }),
      "PUT",
      `/discapacidad-adulto/${ID}`,
    ],
    [
      "antecedentesPenales.list",
      () => api.antecedentesPenales.list(ID),
      "GET",
      `/familiares/${ID}/antecedentes-penales`,
    ],
    [
      "antecedenteIngreso.list",
      () => api.antecedenteIngreso.list(ID),
      "GET",
      `/nna/${ID}/antecedentes-ingreso`,
    ],
    [
      "antecedenteIngreso.list con caso",
      () => api.antecedenteIngreso.list(ID, "caso-9"),
      "GET",
      `/nna/${ID}/antecedentes-ingreso?id_caso=caso-9`,
    ],
    [
      "documentacionIngreso.list con caso",
      () => api.documentacionIngreso.list(ID, "caso-9"),
      "GET",
      `/nna/${ID}/documentacion-ingreso?id_caso=caso-9`,
    ],
    [
      "causalIngreso.list",
      () => api.causalIngreso.list(ID),
      "GET",
      `/antecedente-ingreso/${ID}/causales`,
    ],
    [
      "derechoVulnerado.list",
      () => api.derechoVulnerado.list(ID),
      "GET",
      `/antecedente-ingreso/${ID}/derechos-vulnerados`,
    ],
    ["historialRed.list", () => api.historialRed.list(ID), "GET", `/nna/${ID}/historial-red`],
    ["despeje.getByNna", () => api.despeje.getByNna(ID), "GET", `/nna/${ID}/despeje`],
    [
      "despeje.getByNna con caso",
      () => api.despeje.getByNna(ID, "caso-9"),
      "GET",
      `/nna/${ID}/despeje?id_caso=caso-9`,
    ],
    [
      "notificacion.list",
      () => api.notificacion.list(ID),
      "GET",
      `/despeje/${ID}/notificaciones`,
    ],
    [
      "informeTribunal.list con caso",
      () => api.informeTribunal.list(ID, "caso-9"),
      "GET",
      `/nna/${ID}/informes-tribunal?id_caso=caso-9`,
    ],
    ["informeTribunal.atrasados", () => api.informeTribunal.atrasados(), "GET", `/informes/atrasados`],
    [
      "informeTribunal.proximosAVencer",
      () => api.informeTribunal.proximosAVencer(),
      "GET",
      `/informes/proximos-a-vencer`,
    ],
    [
      "informeTribunal.proximosAVencer con dias",
      () => api.informeTribunal.proximosAVencer(30),
      "GET",
      `/informes/proximos-a-vencer?dias=30`,
    ],
    ["e2p.getQuestions", () => api.e2p.getQuestions("3-5_anos"), "GET", `/e2p/versions/3-5_anos`],
    ["e2p.get", () => api.e2p.get(ID), "GET", `/e2p/${ID}`],
    ["e2p.getPuntaje", () => api.e2p.getPuntaje(ID), "GET", `/e2p/${ID}/puntaje`],
    [
      "e2p.listByFamiliar",
      () => api.e2p.listByFamiliar(ID),
      "GET",
      `/familiares/${ID}/e2p`,
    ],
    ["pmf.getQuestions", () => api.pmf.getQuestions(), "GET", `/pmf/preguntas`],
    ["pmf.get", () => api.pmf.get(ID), "GET", `/pmf/${ID}`],
    ["ncfas.getItems", () => api.ncfas.getItems(), "GET", `/ncfas/items`],
    ["ncfas.get", () => api.ncfas.get(ID), "GET", `/ncfas/${ID}`],
    [
      "ncfas.getComentarios",
      () => api.ncfas.getComentarios(ID),
      "GET",
      `/ncfas/${ID}/comentarios`,
    ],
    [
      "ncfas.saveComentario",
      () => api.ncfas.saveComentario(ID, "A", "nota"),
      "PUT",
      `/ncfas/${ID}/comentarios/A`,
    ],
    [
      "antecedenteSalud.list",
      () => api.antecedenteSalud.list(ID, "caso-9"),
      "GET",
      `/nna/${ID}/antecedentes-salud?id_caso=caso-9`,
    ],
    [
      "antecedenteEscolar.list",
      () => api.antecedenteEscolar.list(ID),
      "GET",
      `/nna/${ID}/antecedentes-escolares`,
    ],
    [
      "antecedenteFamiliar.list",
      () => api.antecedenteFamiliar.list(ID),
      "GET",
      `/nna/${ID}/antecedentes-familiares`,
    ],
    ["vinculoFamiliar.list", () => api.vinculoFamiliar.list(ID), "GET", `/nna/${ID}/vinculos`],
    ["vinculoNNA.list", () => api.vinculoNNA.list(ID), "GET", `/nna/${ID}/vinculos-nna`],
    ["solicitanteIngreso.list", () => api.solicitanteIngreso.list(), "GET", `/solicitantes?skip=0&limit=100`],
    ["establecimientoEducacional.list", () => api.establecimientoEducacional.list(), "GET", `/establecimientos?skip=0&limit=100`],
    ["centroSalud.list", () => api.centroSalud.list(), "GET", `/centros-salud?skip=0&limit=100`],
  ];

  it.each(CASOS)("%s", async (_nombre, invocar, metodo, ruta) => {
    const fetchFalso = espia({});
    await invocar();

    const llamadaHecha = llamada(fetchFalso);
    expect(llamadaHecha.url).toBe(`${API_BASE}${ruta}`);
    expect(llamadaHecha.opciones.method ?? "GET").toBe(metodo);
  });
});

describe("altas (POST)", () => {
  it("nna.create manda el cuerpo y usa POST", async () => {
    const fetchFalso = espia({});
    await api.nna.create({ nombre: "Ana", comuna: "Santiago" });

    const { url, opciones } = llamada(fetchFalso);
    expect(url).toBe(`${API_BASE}/nna`);
    expect(opciones.method).toBe("POST");
    expect(JSON.parse(opciones.body as string)).toEqual({ nombre: "Ana", comuna: "Santiago" });
  });

  it("casos.create usa el endpoint del NNA y un cuerpo vacio por defecto", async () => {
    const fetchFalso = espia({});
    await api.casos.create(ID);

    const { url, opciones } = llamada(fetchFalso);
    expect(url).toBe(`${API_BASE}/nna/${ID}/casos`);
    expect(opciones.method).toBe("POST");
    expect(JSON.parse(opciones.body as string)).toEqual({});
  });

  it("e2p.createByNna usa el endpoint del NNA", async () => {
    const fetchFalso = espia({});
    await api.e2p.createByNna(ID, { rango_etario: "3-5_anos" });

    const { url, opciones } = llamada(fetchFalso);
    expect(url).toBe(`${API_BASE}/nna/${ID}/e2p`);
    expect(opciones.method).toBe("POST");
  });

  it("ncfas.saveComentario manda solo el campo comentario", async () => {
    const fetchFalso = espia({});
    await api.ncfas.saveComentario(ID, "B", "Fortaleza clara");

    const { opciones } = llamada(fetchFalso);
    expect(JSON.parse(opciones.body as string)).toEqual({ comentario: "Fortaleza clara" });
  });
});

describe("api.upload.docs", () => {
  it("manda FormData sin Content-Type explicito", async () => {
    storage.setItem("auth_token", "token-123");
    const fetchFalso = vi
      .fn()
      .mockResolvedValue(ok({ url: "/uploads/abc.pdf", filename: "informe.pdf" }));
    vi.stubGlobal("fetch", fetchFalso);

    const archivo = new File([new Uint8Array([1, 2, 3])], "informe.pdf", {
      type: "application/pdf",
    });
    await api.upload.docs(archivo);

    const { url, opciones } = llamada(fetchFalso);
    expect(url).toBe(`${API_BASE}/upload/docs`);
    expect(opciones.method).toBe("POST");
    expect(opciones.body).toBeInstanceOf(FormData);
    // El navegador debe fijar el boundary del multipart.
    expect(opciones.headers["Content-Type"]).toBeUndefined();
    expect(opciones.headers["Authorization"]).toBe("Bearer token-123");
  });

  it("devuelve la URL absoluta quitando el sufijo /api", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(ok({ url: "/uploads/abc.pdf", filename: "informe.pdf" })),
    );

    const resultado = await api.upload.docs(
      new File([new Uint8Array([1])], "informe.pdf", { type: "application/pdf" }),
    );

    expect(resultado).toEqual({
      url: "http://localhost:8000/uploads/abc.pdf",
      filename: "informe.pdf",
    });
  });

  it("en 401 limpia la sesion y redirige", async () => {
    storage.setItem("auth_token", "vencido");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fallo(401, "Unauthorized", "x")));

    await expect(
      api.upload.docs(new File([new Uint8Array([1])], "a.pdf", { type: "application/pdf" })),
    ).rejects.toThrow("Sesión expirada");

    expect(storage.getItem("auth_token")).toBeNull();
    expect(windowFalso.location.href).toBe("/login");
  });

  it("lanza con el status y el cuerpo ante un 400", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(fallo(400, "Bad Request", "Tipo de archivo no permitido: .exe")),
    );

    await expect(
      api.upload.docs(new File([new Uint8Array([1])], "a.exe")),
    ).rejects.toThrow("400: Tipo de archivo no permitido: .exe");
  });
});
