import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/nuevo-caso')({
  component: NuevoCasoStub,
})

function NuevoCasoStub() {
  return (
    <div className="demo-page max-w-2xl">
      <section className="demo-panel">
        <p className="island-kicker mb-2">En migración</p>
        <h1 className="demo-section-title mb-3">Nuevo caso</h1>
        <p className="demo-muted text-sm">
          El asistente de nuevo caso (5 pasos: NNA, ingreso, documentación,
          historial red, revisión) está pendiente de migración desde la app
          Next.js original. Ver <code>AGENTS.md</code> para el orden de
          migración.
        </p>
      </section>
    </div>
  )
}
