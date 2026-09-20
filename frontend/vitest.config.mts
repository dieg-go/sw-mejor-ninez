import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Configuracion de Vitest para la logica pura del frontend.
 *
 * Entorno `node` a proposito: la suite cubre las funciones de `src/lib` y los
 * helpers de las paginas, no componentes React. Eso evita `jsdom` y
 * `@testing-library`, que no estan instalados, y deja la suite rapida.
 *
 * Las pruebas viven en `frontend/tests/`, fuera de `src/app`, para no
 * interferir con el escaneo de rutas del App Router de Next.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    restoreMocks: true,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
