// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FileUpload } from "@/components/ui/file-upload";

/**
 * Test del componente compartido `FileUpload`.
 *
 * Existe por un hallazgo concreto: la primera version de la etiqueta usaba
 * `aria-labelledby` sobre la zona de dropzone, y ESO NO FUNCIONA. La zona que
 * genera `getRootProps()` lleva `role="presentation"`, que la saca del arbol de
 * accesibilidad, asi que el lector de pantalla ignora el `aria-labelledby`.
 * `getByLabelText` si la encontraba, porque es permisivo: el test habria pasado
 * mientras la accesibilidad real seguia rota.
 *
 * Por eso estos tests afirman sobre el ELEMENTO resuelto (debe ser el
 * `<input type="file">`), no solo sobre que la busqueda devuelva algo.
 */
vi.mock("@/lib/api", () => ({
  api: { upload: { docs: vi.fn() } },
}));

describe("FileUpload", () => {
  it("asocia la etiqueta al input file real, no a la zona de dropzone", () => {
    render(
      <FileUpload
        label="Documento del informe"
        value={null}
        onUploadSuccess={() => {}}
        onClear={() => {}}
      />,
    );

    const control = screen.getByLabelText("Documento del informe");
    // Si esto falla y devuelve un DIV, la asociacion volvio a ponerse en la zona
    // de dropzone (role="presentation"), que ningun lector de pantalla anuncia.
    expect(control.tagName).toBe("INPUT");
    expect(control).toHaveAttribute("type", "file");
  });

  it("con archivo ya subido, la etiqueta es texto y el boton de quitar tiene nombre", () => {
    const { container } = render(
      <FileUpload
        label="Documento adjunto"
        value="/uploads/acta.pdf"
        onUploadSuccess={() => {}}
        onClear={() => {}}
      />,
    );

    // Sin input file, la etiqueta no puede ser un <Label htmlFor>.
    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(screen.getByText("Documento adjunto")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /quitar archivo/i })).toBeInTheDocument();
  });

  it("sin label no renderiza etiqueta y no rompe", () => {
    render(<FileUpload value={null} onUploadSuccess={() => {}} onClear={() => {}} />);

    expect(screen.queryByText("Documento adjunto")).toBeNull();
  });
});
