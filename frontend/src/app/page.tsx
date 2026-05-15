import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4">
      <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
        SW Mejor Niñez
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-center max-w-md">
        Sistema de gestión para el programa de protección de niños, niñas y adolescentes.
      </p>
      <Link
        href="/nna"
        className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
      >
        Ver registro NNA
      </Link>
    </div>
  );
}
