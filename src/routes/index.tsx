import { createFileRoute, Link } from '@tanstack/react-router'
import { FilePlus2, ShieldCheck, Users } from 'lucide-react'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  return (
    <main className="demo-page demo-center flex flex-col items-center text-center">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(var(--sea-ink) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--chip-line)] bg-[var(--chip-bg)]">
        <ShieldCheck className="h-8 w-8 text-[var(--lagoon-deep)]" />
      </div>
      <h1 className="demo-title display-title mb-4">SW Mejor Niñez</h1>
      <p className="demo-muted mb-10 max-w-md text-lg">
        Sistema de gestión para el programa de protección de niños, niñas y
        adolescentes.
      </p>
      <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
        <Link to="/nuevo-caso" className="demo-button h-12 text-base">
          <FilePlus2 className="h-5 w-5" />
          Nuevo caso
        </Link>
        <Link to="/nna" className="demo-button demo-button-secondary h-12 text-base">
          <Users className="h-5 w-5" />
          Ver registro NNA
        </Link>
      </div>
    </main>
  )
}
