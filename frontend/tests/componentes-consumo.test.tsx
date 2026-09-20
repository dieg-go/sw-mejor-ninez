// @vitest-environment jsdom
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Mock } from "vitest";

import ConsumoPage from "@/app/nna/[id]/consumo/page";
import { api } from "@/lib/api";

/**
 * Tercer test de componente: pagina `nna/[id]/consumo`.
 *
 * Se eligio por dos motivos:
 *
 *  1. Ejercita los cuatro tipos de campo (TextField, Select, DateField,
 *     Checkbox) con etiqueta visible, incluido el Select que NO usa el
 *     componente compartido `SelectField` (su trigger lleva `mt-1 w-full`, asi
 *     que se resolvio en el lugar con `useId()`).
 *  2. Es el caso donde un id estatico habria fallado: el formulario de alta y el
 *     de edicion en linea pueden estar montados A LA VEZ, y ambos tienen un
 *     campo "Estado consumo". El ultimo test comprueba que sus ids son
 *     distintos; con `id="estado"` en los dos, la etiqueta del primero apuntaria
 *     al segundo y `aria-labelledby` resolveria al control equivocado.
 */
vi.mock("@/lib/api", () => ({
  api: {
    nna: { get: vi.fn() },
    historialConsumoNNA: { list: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

const ID_NNA = "33333333-3333-3333-3333-333333333333";

const nnaFake = { id_nna: ID_NNA, nombre: "Camilo Rojas", run: "33.333.333-3" };

function registro(over: Partial<Record<string, unknown>> = {}) {
  return {
    id_historial_consumo_nna: "cccccccc-0000-0000-0000-000000000001",
    id_nna: ID_NNA,
    nombre_sustancia: "Alcohol",
    estado_consumo: "Activo",
    consumo_indirecto_gestacional: false,
    en_tratamiento: true,
    fecha_inicio: "2026-01-10",
    fecha_termino: null,
    ...over,
  };
}

async function renderPagina() {
  await act(async () => {
    render(
      <Suspense fallback={<p>cargando</p>}>
        <ConsumoPage params={Promise.resolve({ id: ID_NNA })} />
      </Suspense>,
    );
  });
}

const getNna = () => api.nna.get as unknown as Mock;
const listConsumo = () => api.historialConsumoNNA.list as unknown as Mock;
const createConsumo = () => api.historialConsumoNNA.create as unknown as Mock;

beforeEach(() => {
  getNna().mockResolvedValue(nnaFake);
  listConsumo().mockResolvedValue([]);
});

describe("pagina de historial de consumo del NNA", () => {
  it("asocia las etiquetas del formulario de alta con sus controles", async () => {
    const user = userEvent.setup();
    await renderPagina();

    await screen.findByText("Sin registros de consumo.");
    await user.click(screen.getByRole("button", { name: /nuevo registro/i }));

    expect(screen.getByLabelText("Sustancia")).toBeInstanceOf(HTMLInputElement);
    expect(screen.getByLabelText("Estado consumo")).toHaveAttribute("role", "combobox");
    // El date picker se asocia al boton que abre el calendario
    expect(screen.getByLabelText("Fecha inicio").tagName).toBe("BUTTON");
    // Checkbox: el control asociado tiene role checkbox
    expect(screen.getByLabelText("Consumo gestacional")).toHaveAttribute("role", "checkbox");
    expect(screen.getByLabelText("En tratamiento")).toHaveAttribute("role", "checkbox");
  });

  it("el boton de editar del listado tiene nombre accesible", async () => {
    listConsumo().mockResolvedValue([registro()]);
    await renderPagina();

    await screen.findByText("Camilo Rojas");
    expect(screen.getByRole("button", { name: /editar consumo/i })).toBeInTheDocument();
  });

  it("crea un registro con los campos del formulario", async () => {
    const user = userEvent.setup();
    createConsumo().mockResolvedValue(registro({ nombre_sustancia: "Tabaco" }));
    await renderPagina();

    await screen.findByText("Sin registros de consumo.");
    await user.click(screen.getByRole("button", { name: /nuevo registro/i }));
    await user.type(screen.getByLabelText("Sustancia"), "Tabaco");
    await user.click(screen.getByRole("button", { name: /^guardar$/i }));

    await waitFor(() =>
      expect(createConsumo()).toHaveBeenCalledWith(ID_NNA, {
        nombre_sustancia: "Tabaco",
        consumo_indirecto_gestacional: false,
        en_tratamiento: false,
      }),
    );
  });

  it("con el formulario de alta y una fila en edicion a la vez, las etiquetas 'Estado consumo' apuntan a controles distintos", async () => {
    const user = userEvent.setup();
    listConsumo().mockResolvedValue([registro({ nombre_sustancia: "Alcohol" })]);
    await renderPagina();

    await screen.findByText("Camilo Rojas");

    // Abrir el formulario de alta...
    await user.click(screen.getByRole("button", { name: /nuevo registro/i }));
    // ...y ademas entrar en edicion de la fila existente.
    await user.click(screen.getByRole("button", { name: /editar consumo/i }));

    // Hay dos campos con la misma etiqueta, uno por formulario.
    const estados = await screen.findAllByLabelText("Estado consumo");
    expect(estados).toHaveLength(2);

    // Y son elementos distintos: si los ids estaticos hubieran colisionado,
    // ambos labels resolverian al mismo control.
    const ids = estados.map((e) => e.id);
    expect(new Set(ids).size).toBe(2);
    expect(ids.every((x) => x && x.length > 0)).toBe(true);
  });
});
