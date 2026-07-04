import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { ArrowLeftIcon } from 'lucide-react'
import { createNna } from '#/lib/nna-functions'
import type { NNAInsert } from '#/db/schema'

export const Route = createFileRoute('/_auth/nna/nuevo')({
  component: NewNnaPage,
})

type FormState = {
  nombre: string
  run: string
  sexo: string
  etnia_declarada: string
  nacionalidad: string
  domicilio: string
  poblacion_o_villa: string
  comuna: string
  region: string
}

const emptyForm: FormState = {
  nombre: '',
  run: '',
  sexo: '',
  etnia_declarada: '',
  nacionalidad: '',
  domicilio: '',
  poblacion_o_villa: '',
  comuna: '',
  region: '',
}

function NewNnaPage() {
  const navigate = useNavigate()
  const createNnaFn = useServerFn(createNna)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setField =
    (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
    }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const payload: NNAInsert = {}
    for (const [k, v] of Object.entries(form)) {
      if (v) (payload as Record<string, string>)[k] = v
    }
    if (fechaNacimiento) {
      payload.fecha_nacimiento = fechaNacimiento
    }

    setSaving(true)
    try {
      const created = await createNnaFn({ data: payload })
      navigate({ to: '/nna/$id', params: { id: created.id_nna } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear NNA')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="demo-page max-w-2xl">
      <div className="mb-6">
        <Link
          to="/nna"
          className="demo-muted inline-flex items-center gap-2 text-sm transition hover:text-[var(--sea-ink)]"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Volver
        </Link>
      </div>

      <section className="demo-panel">
        <h1 className="demo-section-title mb-6">Nuevo NNA</h1>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre" id="nombre">
              <input
                id="nombre"
                className="demo-input"
                value={form.nombre}
                onChange={setField('nombre')}
                placeholder="Nombre completo"
              />
            </Field>

            <Field label="RUN" id="run">
              <input
                id="run"
                className="demo-input"
                value={form.run}
                onChange={setField('run')}
                placeholder="12.345.678-9"
              />
            </Field>

            <Field label="Fecha de Nacimiento" id="fecha_nacimiento">
              <input
                id="fecha_nacimiento"
                type="date"
                className="demo-input"
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
              />
            </Field>

            <Field label="Sexo" id="sexo">
              <select
                id="sexo"
                className="demo-select"
                value={form.sexo}
                onChange={(e) => setForm((p) => ({ ...p, sexo: e.target.value }))}
              >
                <option value="">Seleccionar</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="No especificado">No especificado</option>
              </select>
            </Field>

            <Field label="Etnia Declarada" id="etnia">
              <input
                id="etnia"
                className="demo-input"
                value={form.etnia_declarada}
                onChange={setField('etnia_declarada')}
                placeholder="Etnia"
              />
            </Field>

            <Field label="Nacionalidad" id="nacionalidad">
              <input
                id="nacionalidad"
                className="demo-input"
                value={form.nacionalidad}
                onChange={setField('nacionalidad')}
                placeholder="Nacionalidad"
              />
            </Field>

            <Field label="Domicilio" id="domicilio" className="sm:col-span-2">
              <input
                id="domicilio"
                className="demo-input"
                value={form.domicilio}
                onChange={setField('domicilio')}
                placeholder="Dirección"
              />
            </Field>

            <Field label="Población o Villa" id="poblacion">
              <input
                id="poblacion"
                className="demo-input"
                value={form.poblacion_o_villa}
                onChange={setField('poblacion_o_villa')}
                placeholder="Población o villa"
              />
            </Field>

            <Field label="Comuna" id="comuna">
              <input
                id="comuna"
                className="demo-input"
                value={form.comuna}
                onChange={setField('comuna')}
                placeholder="Comuna"
              />
            </Field>

            <Field label="Región" id="region">
              <input
                id="region"
                className="demo-input"
                value={form.region}
                onChange={setField('region')}
                placeholder="Región"
              />
            </Field>
          </div>

          {error && <div className="demo-alert demo-alert-danger text-sm">{error}</div>}

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving} className="demo-button">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <Link to="/nna" className="demo-button demo-button-secondary">
              Cancelar
            </Link>
          </div>
        </form>
      </section>
    </div>
  )
}

function Field({
  label,
  id,
  className,
  children,
}: {
  label: string
  id: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`grid gap-2 ${className ?? ''}`}>
      <label htmlFor={id} className="text-sm font-medium leading-none">
        {label}
      </label>
      {children}
    </div>
  )
}
