import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { getNnaSummary } from '#/lib/nna-functions'

export const Route = createFileRoute('/_auth/nna/$id')({
  loader: ({ params }) => getNnaSummary({ data: { id: params.id } }),
  component: NnaDetailPage,
})

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es-CL')
}

const sections = [
  { key: 'ingreso', label: 'Antecedentes de Ingreso', hint: 'registros' },
  { key: 'documentacion', label: 'Documentación', hint: 'documentos' },
  { key: 'consumo', label: 'Historial Consumo', hint: 'registros' },
  { key: 'discapacidades', label: 'Discapacidades', hint: 'registros' },
  { key: 'e2p', label: 'E2P', hint: 'evaluaciones' },
  { key: 'pmf', label: 'PMF', hint: 'evaluaciones' },
  { key: 'ncfas', label: 'NCFAS', hint: 'evaluaciones' },
  { key: 'historialRed', label: 'Historial Red Proteccional', hint: 'registros' },
  { key: 'despeje', label: 'Búsqueda Familiar', hint: 'proceso' },
  { key: 'informes', label: 'Informes Tribunal', hint: 'informes' },
  { key: 'salud', label: 'Antecedentes Salud', hint: 'registros' },
  { key: 'escolar', label: 'Antecedentes Escolar', hint: 'registros' },
  { key: 'familiar', label: 'Entorno Familiar', hint: 'registros' },
] as const

function NnaDetailPage() {
  const { nna, counts } = Route.useLoaderData()

  return (
    <div className="demo-page">
      <Link
        to="/nna"
        className="demo-muted -ml-2 mb-4 inline-flex items-center gap-2 text-sm transition hover:text-[var(--sea-ink)]"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Volver al listado
      </Link>

      <section className="demo-panel mb-6">
        <p className="island-kicker mb-2">Ficha NNA</p>
        <h1 className="demo-title mb-3 text-3xl">
          {nna.nombre || 'Sin nombre'}
        </h1>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
          <Detail label="RUN" value={nna.run} />
          <Detail label="Fecha nacimiento" value={formatDate(nna.fecha_nacimiento)} />
          <Detail label="Sexo" value={nna.sexo} />
          <Detail label="Nacionalidad" value={nna.nacionalidad} />
          <Detail label="Comuna" value={nna.comuna} />
          <Detail label="Región" value={nna.region} />
          <Detail label="Domicilio" value={nna.domicilio} />
          <Detail label="Población/Villa" value={nna.poblacion_o_villa} />
        </dl>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => {
          const value = counts[s.key as keyof typeof counts]
          return (
            <article key={s.key} className="demo-card">
              <p className="island-kicker mb-2">{s.hint}</p>
              <p className="text-lg font-semibold text-[var(--sea-ink)]">
                {s.label}
              </p>
              <p className="demo-muted mt-2 text-2xl font-bold">{value}</p>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="demo-muted text-xs">{label}</dt>
      <dd className="text-[var(--sea-ink)]">{value || '—'}</dd>
    </div>
  )
}
