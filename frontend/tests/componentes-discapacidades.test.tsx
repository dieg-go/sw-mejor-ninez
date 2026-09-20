// @vitest-environment jsdom
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Mock } from "vitest";

import DiscapacidadesPage from "@/app/nna/[id]/discapacidades/page";
import { api } from "@/lib/api";

/**
 * Primer test de componente del proyecto: pagina `nna/[id]/discapacidades`.
 *
 * Se eligio como pagina piloto porque representa el patron clonado que repiten
 * las ~12 sub-paginas (fetch de NNA + lista, estado loading/error, alta y
 * edicion en linea). Si este test corre limpio, el mismo molde sirve para el
 * resto.
 *
 * `@/lib/api` se mockea: no hay red ni backend en la suite.
 */
vi.mock("@/lib/api", () => ({
  api: {
    nna: { get: vi.fn() },
    discapacidadNNA: { list: vi.fn(), create: vi.fn(), update: vi.fn(), get: vi.fn() },
  },
}));

const ID_NNA = "11111111-1111-1111-1111-111111111111";

const nnaFake = { id_nna: ID_NNA, nombre: "Ana Perez", run: "11.111.111-1" };

function discapacidad(over: Partial<Record<string, unknown>> = {}) {
  return {
    id_discapacidad_nna: "dddddddd-0000-0000-0000-000000000001",
    id_nna: ID_NNA,
    tipo: "Intelectual",
    porcentaje_grado: 40,
    observacion: null,
    ...over,
  };
}

/**
 * La pagina recibe `params` como Promise y lo lee con `use(params)` (API de
 * Next 16). `use` SUSPENDE mientras la promesa esta pendiente.
 *
 * Dos consecuencias al testear:
 *  1. Hace falta un `<Suspense>` explicito: en la app lo aporta el framework,
 *     en un test no existe y sin el no se renderiza nada.
 *  2. El `render` tiene que ir dentro de `await act(async () => ...)`. Con un
 *     `render` normal, React 19 no reintenta el arbol suspendido y el fallback
 *     queda pegado para siempre. Verificado aislando el mecanismo.
 */
async function renderPagina() {
  await act(async () => {
    render(
      <Suspense fallback={<p>cargando</p>}>
        <DiscapacidadesPage params={Promise.resolve({ id: ID_NNA })} />
      </Suspense>,
    );
  });
}

const getNna = () => api.nna.get as unknown as Mock;
const listDisc = () => api.discapacidadNNA.list as unknown as Mock;
const createDisc = () => api.discapacidadNNA.create as unknown as Mock;
const updateDisc = () => api.discapacidadNNA.update as unknown as Mock;

beforeEach(() => {
  getNna().mockResolvedValue(nnaFake);
  listDisc().mockResolvedValue([]);
});

describe("pagina de discapacidades del NNA", () => {
  it("muestra el nombre del NNA y sus discapacidades", async () => {
    listDisc().mockResolvedValue([discapacidad()]);
    await renderPagina();

    expect(await screen.findByText("Ana Perez")).toBeInTheDocument();
    expect(screen.getByText("Intelectual")).toBeInTheDocument();
    // El porcentaje se muestra como "Grado: 40%" dentro de un mismo div
    expect(screen.getByText(/Grado:/).parentElement).toHaveTextContent("40%");
  });

  it("pide los datos del NNA y la lista con el id de la ruta", async () => {
    await renderPagina();

    await waitFor(() => expect(getNna()).toHaveBeenCalledWith(ID_NNA));
    expect(listDisc()).toHaveBeenCalledWith(ID_NNA);
  });

  it("muestra el estado vacio cuando no hay registros", async () => {
    await renderPagina();

    expect(await screen.findByText("Sin discapacidades registradas.")).toBeInTheDocument();
  });

  it("muestra el error cuando falla la carga", async () => {
    getNna().mockRejectedValue(new Error("Fallo de red"));
    await renderPagina();

    expect(await screen.findByText("Fallo de red")).toBeInTheDocument();
  });

  it("crea una discapacidad enviando solo los campos completados", async () => {
    const user = userEvent.setup();
    const creada = discapacidad({ tipo: "Fisica", porcentaje_grado: 50, observacion: null });
    createDisc().mockResolvedValue(creada);
    await renderPagina();

    await screen.findByText("Sin discapacidades registradas.");
    await user.click(screen.getByRole("button", { name: /nueva discapacidad/i }));

    await user.type(screen.getByLabelText("Tipo"), "Fisica");
    await user.type(screen.getByLabelText("Porcentaje / Grado"), "50");
    await user.click(screen.getByRole("button", { name: /^guardar$/i }));

    // `porcentaje_grado` vacio se omite; el numero se manda como number, no string
    await waitFor(() =>
      expect(createDisc()).toHaveBeenCalledWith(ID_NNA, {
        tipo: "Fisica",
        porcentaje_grado: 50,
      }),
    );
    // El registro creado se agrega a la lista sin recargar
    expect(await screen.findByText("Fisica")).toBeInTheDocument();
  });

  it("omite los campos vacios al crear", async () => {
    const user = userEvent.setup();
    createDisc().mockResolvedValue(discapacidad());
    await renderPagina();

    await screen.findByText("Sin discapacidades registradas.");
    await user.click(screen.getByRole("button", { name: /nueva discapacidad/i }));
    await user.click(screen.getByRole("button", { name: /^guardar$/i }));

    await waitFor(() => expect(createDisc()).toHaveBeenCalledWith(ID_NNA, {}));
  });

  it("muestra el error de la API al crear y no cierra el formulario", async () => {
    const user = userEvent.setup();
    createDisc().mockRejectedValue(new Error("Tipo invalido"));
    await renderPagina();

    await screen.findByText("Sin discapacidades registradas.");
    await user.click(screen.getByRole("button", { name: /nueva discapacidad/i }));
    await user.click(screen.getByRole("button", { name: /^guardar$/i }));

    expect(await screen.findByText("Tipo invalido")).toBeInTheDocument();
    // El formulario sigue visible para corregir
    expect(screen.getByLabelText("Tipo")).toBeInTheDocument();
  });

  it("edita en linea y reemplaza el registro actualizado", async () => {
    const user = userEvent.setup();
    listDisc().mockResolvedValue([discapacidad({ tipo: "Intelectual" })]);
    updateDisc().mockResolvedValue(
      discapacidad({ tipo: "Intelectual leve", porcentaje_grado: 40 }),
    );
    await renderPagina();

    await screen.findByText("Intelectual");
    // El boton de editar es solo un icono, pero tiene nombre accesible
    await user.click(screen.getByRole("button", { name: /editar discapacidad/i }));

    const inputTipo = screen.getByLabelText("Tipo");
    expect(inputTipo).toHaveValue("Intelectual");
    await user.clear(inputTipo);
    await user.type(inputTipo, "Intelectual leve");
    await user.click(screen.getByRole("button", { name: /^guardar$/i }));

    await waitFor(() =>
      expect(updateDisc()).toHaveBeenCalledWith("dddddddd-0000-0000-0000-000000000001", {
        tipo: "Intelectual leve",
        porcentaje_grado: 40,
      }),
    );
    expect(await screen.findByText("Intelectual leve")).toBeInTheDocument();
  });
});

/**
 * Nota de accesibilidad: al escribir estos tests se detectaron dos problemas
 * reales en la pagina, y ambos se arreglaron (2026-09):
 *
 *  1. Los `<Label>` no estaban asociados a sus `<Input>` (faltaba
 *     `htmlFor`/`id`), asi que un lector de pantalla no podia anunciar el campo
 *     y los tests tenian que consultar por placeholder. Ahora los campos usan
 *     `TextField` (`@/components/ui/form-field`), que asocia etiqueta y control
 *     con un id unico de `useId()`. Por eso estos tests consultan con
 *     `getByLabelText(...)`: si la asociacion se rompe, fallan.
 *  2. El boton de editar era un icono sin nombre accesible. Ahora lleva
 *     `aria-label`, y el test lo ubica por rol + nombre.
 *
 * Esos tests son la red que impide que la regresion vuelva.
 */
