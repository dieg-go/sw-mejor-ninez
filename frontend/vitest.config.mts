import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

/**
 * Configuracion de Vitest.
 *
 * Entorno `node` por defecto: los tests de `src/lib` y los helpers de paginas
 * son logica pura y no necesitan DOM. Los tests de componente piden jsdom
 * archivo por archivo con el docblock:
 *
 *   // @vitest-environment jsdom
 *
 * Asi la suite de logica sigue siendo rapida y no cambia de comportamiento.
 * `@vitejs/plugin-react` hace falta para transformar JSX en los tests.
 *
 * Las pruebas viven en `frontend/tests/`, fuera de `src/app`, para no
 * interferir con el escaneo de rutas del App Router de Next.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    setupFiles: ["tests/setup.ts"],
    restoreMocks: true,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
