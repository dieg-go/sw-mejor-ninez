import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getToken, getUser, isAuthenticated, login, logout } from "@/lib/auth";

/**
 * `src/lib/auth.ts` depende de `window.localStorage` y de `fetch`. En un
 * entorno `node` se simulan con `vi.stubGlobal`.
 */

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

class LocalStorageFalso {
  private datos = new Map<string, string>();

  getItem(clave: string): string | null {
    return this.datos.has(clave) ? (this.datos.get(clave) as string) : null;
  }

  setItem(clave: string, valor: string): void {
    this.datos.set(clave, String(valor));
  }

  removeItem(clave: string): void {
    this.datos.delete(clave);
  }

  clear(): void {
    this.datos.clear();
  }

  get largo(): number {
    return this.datos.size;
  }
}

function respuesta(cuerpo: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => cuerpo,
    text: async () => (typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo)),
  } as unknown as Response;
}

let storage: LocalStorageFalso;
let windowFalso: { location: { href: string } };

beforeEach(() => {
  storage = new LocalStorageFalso();
  windowFalso = { location: { href: "" } };
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", windowFalso);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getToken", () => {
  it("devuelve null sin token guardado", () => {
    expect(getToken()).toBeNull();
  });

  it("devuelve el token guardado", () => {
    storage.setItem(TOKEN_KEY, "abc.def.ghi");
    expect(getToken()).toBe("abc.def.ghi");
  });
});

describe("isAuthenticated", () => {
  it("es false sin token", () => {
    expect(isAuthenticated()).toBe(false);
  });

  it("es true con token", () => {
    storage.setItem(TOKEN_KEY, "abc");
    expect(isAuthenticated()).toBe(true);
  });

  it("es false con cadena vacia como token", () => {
    storage.setItem(TOKEN_KEY, "");
    // getToken devuelve "" (no null), pero el guard de auth usa la presencia.
    expect(getToken()).toBe("");
    expect(isAuthenticated()).toBe(true);
  });
});

describe("getUser", () => {
  it("devuelve null sin usuario guardado", () => {
    expect(getUser()).toBeNull();
  });

  it("devuelve el usuario guardado", () => {
    const usuario = {
      id_usuario: "1",
      email: "admin@mejorninez.cl",
      nombre: "Administrador",
      is_active: true,
    };
    storage.setItem(USER_KEY, JSON.stringify(usuario));
    expect(getUser()).toEqual(usuario);
  });

  it("devuelve null si el JSON guardado esta corrupto", () => {
    storage.setItem(USER_KEY, "{no es json");
    expect(getUser()).toBeNull();
  });

  it("devuelve null si el valor guardado es la cadena 'null'", () => {
    storage.setItem(USER_KEY, "null");
    expect(getUser()).toBeNull();
  });
});

describe("login", () => {
  it("guarda el token y luego el usuario", async () => {
    const usuario = {
      id_usuario: "u-1",
      email: "admin@mejorninez.cl",
      nombre: "Administrador",
      is_active: true,
    };
    const fetchFalso = vi
      .fn()
      .mockResolvedValueOnce(respuesta({ access_token: "token-123", token_type: "bearer" }))
      .mockResolvedValueOnce(respuesta(usuario));
    vi.stubGlobal("fetch", fetchFalso);

    await login("admin@mejorninez.cl", "admin123");

    expect(storage.getItem(TOKEN_KEY)).toBe("token-123");
    expect(storage.getItem(USER_KEY)).toBe(JSON.stringify(usuario));
    expect(fetchFalso).toHaveBeenCalledTimes(2);
  });

  it("manda las credenciales como JSON al endpoint de login", async () => {
    const fetchFalso = vi
      .fn()
      .mockResolvedValueOnce(respuesta({ access_token: "t" }))
      .mockResolvedValueOnce(respuesta({ id_usuario: "1" }));
    vi.stubGlobal("fetch", fetchFalso);

    await login("admin@mejorninez.cl", "secreta");

    const [url, opciones] = fetchFalso.mock.calls[0];
    expect(String(url)).toMatch(/\/auth\/login$/);
    expect(opciones.method).toBe("POST");
    expect(opciones.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(opciones.body)).toEqual({
      email: "admin@mejorninez.cl",
      password: "secreta",
    });
  });

  it("pide /auth/me con el Bearer recien obtenido", async () => {
    const fetchFalso = vi
      .fn()
      .mockResolvedValueOnce(respuesta({ access_token: "token-123" }))
      .mockResolvedValueOnce(respuesta({ id_usuario: "1" }));
    vi.stubGlobal("fetch", fetchFalso);

    await login("admin@mejorninez.cl", "secreta");

    const [url, opciones] = fetchFalso.mock.calls[1];
    expect(String(url)).toMatch(/\/auth\/me$/);
    expect(opciones.headers).toEqual({ Authorization: "Bearer token-123" });
  });

  it("lanza con el cuerpo del error cuando las credenciales fallan", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(respuesta('{"detail":"Email o contraseña incorrectos"}', false, 401)),
    );

    await expect(login("admin@mejorninez.cl", "mala")).rejects.toThrow(
      '{"detail":"Email o contraseña incorrectos"}',
    );
    expect(storage.getItem(TOKEN_KEY)).toBeNull();
  });

  it("lanza un mensaje generico si el error viene vacio", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respuesta("", false, 500)));

    await expect(login("a@b.cl", "x")).rejects.toThrow("Credenciales inválidas");
    expect(storage.getItem(TOKEN_KEY)).toBeNull();
  });

  it("guarda el token aunque /auth/me falle", async () => {
    const fetchFalso = vi
      .fn()
      .mockResolvedValueOnce(respuesta({ access_token: "token-123" }))
      .mockResolvedValueOnce(respuesta("boom", false, 500));
    vi.stubGlobal("fetch", fetchFalso);

    await login("admin@mejorninez.cl", "secreta");

    expect(storage.getItem(TOKEN_KEY)).toBe("token-123");
    expect(storage.getItem(USER_KEY)).toBeNull();
  });

  it("no borra un usuario previo si /auth/me falla", async () => {
    storage.setItem(USER_KEY, JSON.stringify({ id_usuario: "viejo" }));
    const fetchFalso = vi
      .fn()
      .mockResolvedValueOnce(respuesta({ access_token: "token-nuevo" }))
      .mockResolvedValueOnce(respuesta("boom", false, 500));
    vi.stubGlobal("fetch", fetchFalso);

    await login("admin@mejorninez.cl", "secreta");

    expect(JSON.parse(storage.getItem(USER_KEY) as string)).toEqual({ id_usuario: "viejo" });
  });
});

describe("logout", () => {
  it("limpia la sesion y redirige a /login", () => {
    storage.setItem(TOKEN_KEY, "token");
    storage.setItem(USER_KEY, '{"id_usuario":"1"}');

    logout();

    expect(storage.getItem(TOKEN_KEY)).toBeNull();
    expect(storage.getItem(USER_KEY)).toBeNull();
    expect(windowFalso.location.href).toBe("/login");
  });

  it("es idempotente sin sesion previa", () => {
    expect(() => logout()).not.toThrow();
    expect(windowFalso.location.href).toBe("/login");
  });
});
