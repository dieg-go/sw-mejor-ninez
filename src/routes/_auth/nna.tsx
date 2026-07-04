import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { listNna } from '#/lib/nna-functions'

export const Route = createFileRoute('/_auth/nna')({
  loader: () => listNna(),
  component: NnaListPage,
})

function NnaListPage() {
  const nnas = Route.useLoaderData()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search) return nnas
    const q = search.toLowerCase()
    return nnas.filter(
      (n) =>
        n.nombre?.toLowerCase().includes(q) ||
        n.run?.toLowerCase().includes(q) ||
        n.comuna?.toLowerCase().includes(q),
    )
  }, [nnas, search])

  return (
    <div className="demo-page">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--sea-ink)]">NNA</h1>
        <Link to="/nuevo-caso" className="demo-button">
          + Nuevo caso
        </Link>
      </div>

      <div className="mb-4">
        <input
          placeholder="Buscar por nombre, RUN o comuna..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="demo-input"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="demo-muted py-12 text-center">
          {nnas.length === 0
            ? 'No hay NNA registrados.'
            : 'Sin resultados para esta búsqueda.'}
        </p>
      ) : (
        <div className="demo-table-shell">
          <table className="demo-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>RUN</th>
                <th>Comuna</th>
                <th>Sexo</th>
                <th>Región</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((nna) => (
                <tr key={nna.id_nna}>
                  <td>
                    <Link
                      to="/nna/$id"
                      params={{ id: nna.id_nna }}
                      className="font-medium no-underline"
                    >
                      {nna.nombre || 'Sin nombre'}
                    </Link>
                  </td>
                  <td className="demo-muted">{nna.run || '—'}</td>
                  <td className="demo-muted">{nna.comuna || '—'}</td>
                  <td className="demo-muted">{nna.sexo || '—'}</td>
                  <td className="demo-muted">{nna.region || '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} className="demo-muted text-xs">
                  {filtered.length} de {nnas.length} registros
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
