import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/familiar')({
  component: FamiliarStub,
})

function FamiliarStub() {
  return (
    <div className="demo-page max-w-2xl">
      <section className="demo-panel">
        <p className="island-kicker mb-2">En migración</p>
        <h1 className="demo-section-title mb-3">Familiares</h1>
        <p className="demo-muted text-sm">
          El listado y fichas de familiares están pendientes de migración desde
          la app Next.js original. Ver <code>AGENTS.md</code> para el orden de
          migración.
        </p>
      </section>
    </div>
  )
}
