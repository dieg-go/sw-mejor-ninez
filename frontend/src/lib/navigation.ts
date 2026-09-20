/**
 * Adaptador de navegacion: unica costura entre la app y el framework.
 *
 * Toda la app importa `Link`, `useRouter` y `usePathname` desde aca, no desde
 * `next/link` o `next/navigation`. Son los UNICOS puntos de acoplamiento al
 * router del framework (36 imports en ~30 archivos), asi que centralizarlos
 * reduce un eventual cambio de router a este archivo.
 *
 * Para los tests, esto tambien significa que se mockea un solo modulo
 * (`@/lib/navigation`) en vez de repartir `vi.mock("next/link")` y
 * `vi.mock("next/navigation")` por cada archivo de prueba.
 *
 * Al migrar (p. ej. a Vite + React Router) este archivo pasa a ser, por ejemplo:
 *
 *   export { Link } from "react-router";
 *   export { useNavigate as useRouter, useLocation as usePathname } from "react-router";
 *
 * Nota deliberada: NO se reexporta `useParams`/`use(params)`. El parametro
 * dinamico se sigue leyendo con `use(params)` (API de Next 16) en las 21
 * paginas. Absorber tambien esa diferencia requiere cambiar la firma
 * `params: Promise<{ id: string }>` de cada pagina, y es trabajo aparte.
 */

export { default as Link } from "next/link";
export { usePathname, useRouter } from "next/navigation";
