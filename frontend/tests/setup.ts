import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

/**
 * Setup comun a toda la suite.
 *
 * Corre tambien para los tests de entorno `node`, asi que nada de aca puede
 * tocar `document`/`window` al importarse: todo va detras de un guard, y el
 * cleanup de React Testing Library se carga de forma diferida.
 */
afterEach(async () => {
  if (typeof document === "undefined") return;
  const { cleanup } = await import("@testing-library/react");
  cleanup();
});

/**
 * Shims de APIs de navegador que jsdom no implementa y que los primitivos de
 * Radix necesitan. Sin esto, montar un `Select`, un `Popover` o un `Calendar`
 * revienta con "ResizeObserver is not defined".
 */
if (typeof window !== "undefined") {
  if (!("ResizeObserver" in globalThis)) {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      ResizeObserverStub;
  }

  // Radix hace scroll al elemento activo del popover/select al abrirlo.
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }

  // Radix Select usa pointer capture para el manejo de teclado y raton.
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
    Element.prototype.setPointerCapture = () => {};
    Element.prototype.releasePointerCapture = () => {};
  }

  // next-themes consulta `prefers-color-scheme` al montar.
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }
}
