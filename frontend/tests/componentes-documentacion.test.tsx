// @vitest-environment jsdom
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Mock } from "vitest";

import DocumentacionPage from "@/app/nna/[id]/documentacion/page";
import { api } from "@/lib/api";

/**
 * Segundo test de componente: pagina `nna/[id]/documentacion`.
 *
 * Se eligio porque ejercita los cuatro tipos de campo a la vez (input, select,
 * date picker y subida de archivo) ademas del boton de edicion de solo icono.
 * El objetivo principal es la accesibilidad: cada campo tiene que poder
 * encontrarse por su etiqueta (`getByLabelText`), lo que falla si el `Label`
 * deja de estar asociado al control. Estos tests son la red que impide que la
 * regresion vuelva.
 */
vi.mock("@/lib/api", () => ({
  api: {
    nna: { get: vi.fn() },
    documentacionIngreso: { list: vi.fn(), create: vi.fn(), update: vi.fn() },
    casos: { get: vi.fn() },
    upload: { docs: vi.fn() },
  },
}));

const ID_NNA = "22222222-2222-2222-2222-222222222222";

const nnaFake = { id_nna: ID_NNA, nombre: "Belen Soto", run: "22.222.222-2" };

function documento(over: Partial<Record<string, unknown>> = {}) {
  return {
    id_documentacion: "dddddddd-1111-1111-1111-111111111111",
    id_nna: ID_NNA,
    tipo_documento: "Certificado de nacimiento",
    estado_recepcion: true,
    fecha_recepcion: "2026-03-04",
    observacion: null,
    url_documentacion_ingreso: null,
    ...over,
  };
}

/** La pagina recibe `params` y `searchParams` como Promise (API de Next 16). */
async function renderPagina() {
  await act(async () => {
    render(
      <Suspense fallback={<p>cargando</p>}>
        <DocumentacionPage
          params={Promise.resolve({ id: ID_NNA })}
          searchParams={Promise.resolve({})}
        />
      </Suspense>,
    );
  });
}

const getNna = () => api.nna.get as unknown as Mock;
const listDocs = () => api.documentacionIngreso.list as unknown as Mock;
const createDoc = () => api.documentacionIngreso.create as unknown as Mock;
const updateDoc = () => api.documentacionIngreso.update as unknown as Mock;

beforeEach(() => {
  getNna().mockResolvedValue(nnaFake);
  listDocs().mockResolvedValue([]);
});

describe("pagina de documentacion de ingreso", () => {
  it("muestra el NNA y sus documentos", async () => {
    listDocs().mockResolvedValue([documento()]);
    await renderPagina();

    expect(await screen.findByText("Belen Soto")).toBeInTheDocument();
    // El tipo se muestra en el listado (el nombre tambien aparece como opcion
    // del select, por eso se busca dentro del listado)
    expect(screen.getAllByText("Certificado de nacimiento").length).toBeGreaterThan(0);
  });

  it("asocia cada etiqueta con su control (regresion de accesibilidad)", async () => {
    const user = userEvent.setup();
    await renderPagina();

    await screen.findByText("Sin documentos registrados.");
    await user.click(screen.getByRole("button", { name: /nuevo documento/i }));

    // Input de texto
    const observacion = screen.getByLabelText("Observación");
    expect(observacion).toBeInstanceOf(HTMLInputElement);

    // Select: el control asociado es el disparador (role combobox)
    const tipo = screen.getByLabelText("Tipo documento");
    expect(tipo).toHaveAttribute("role", "combobox");

    // Date picker: el control asociado es el boton que abre el calendario
    const fecha = screen.getByLabelText("Fecha recepción");
    expect(fecha.tagName).toBe("BUTTON");

    // Subida de archivo: la etiqueta rotula la zona de dropzone
    expect(screen.getByText("Documento")).toBeInTheDocument();
  });

  it("crea un documento con los datos del formulario", async () => {
    const user = userEvent.setup();
    createDoc().mockResolvedValue(documento({ tipo_documento: "Certificado de nacimiento" }));
    await renderPagina();

    await screen.findByText("Sin documentos registrados.");
    await user.click(screen.getByRole("button", { name: /nuevo documento/i }));

    await user.type(screen.getByLabelText("Observación"), "Entregado en oficina");
    await user.click(screen.getByRole("button", { name: /^guardar$/i }));

    // `estado_recepcion` siempre se envia; los campos vacios se omiten
    await waitFor(() =>
      expect(createDoc()).toHaveBeenCalledWith(ID_NNA, {
        estado_recepcion: false,
        observacion: "Entregado en oficina",
      }),
    );
  });

  it("en el listado, el boton de editar tiene nombre accesible", async () => {
    listDocs().mockResolvedValue([documento()]);
    await renderPagina();

    await screen.findByText("Belen Soto");
    expect(
      screen.getByRole("button", { name: /editar documento/i }),
    ).toBeInTheDocument();
  });

  it("edita en linea y envia el payload actualizado", async () => {
    const user = userEvent.setup();
    listDocs().mockResolvedValue([documento({ observacion: "Original" })]);
    updateDoc().mockResolvedValue(documento({ observacion: "Corregido" }));
    await renderPagina();

    await screen.findByText("Belen Soto");
    await user.click(screen.getByRole("button", { name: /editar documento/i }));

    const observacion = await screen.findByLabelText("Observación");
    expect(observacion).toHaveValue("Original");
    await user.clear(observacion);
    await user.type(observacion, "Corregido");
    await user.click(screen.getByRole("button", { name: /^guardar$/i }));

    await waitFor(() =>
      expect(updateDoc()).toHaveBeenCalledWith("dddddddd-1111-1111-1111-111111111111", {
        tipo_documento: "Certificado de nacimiento",
        estado_recepcion: true,
        observacion: "Corregido",
        fecha_recepcion: "2026-03-04",
      }),
    );
  });
});
