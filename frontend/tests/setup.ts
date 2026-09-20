import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

/**
 * Setup comun a toda la suite.
 *
 * Corre tambien para los tests de entorno `node`, asi que nada de aca puede
 * tocar `document` al importarse. El cleanup de React Testing Library se carga
 * de forma diferida: en `node` no hace falta y `@testing-library/react` espera
 * un DOM.
 */
afterEach(async () => {
  if (typeof document === "undefined") return;
  const { cleanup } = await import("@testing-library/react");
  cleanup();
});
