import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import { eq, count } from 'drizzle-orm'

import { db } from '#/db/index'
import {
  nna,
  antecedenteIngreso,
  documentacionIngreso,
  historialConsumoNNA,
  discapacidadNNA,
  e2p,
  pmf,
  ncfas,
  historialRedProteccional,
  procesoDespejeFamiliar,
  informeTribunal,
  antecedenteSalud,
  antecedenteEscolar,
  antecedenteFamiliar,
  vinculoFamiliar,
  type NNAInsert,
} from '#/db/schema'
import { requireAuth } from '#/lib/auth-middleware'

export const listNna = createServerFn({ method: 'GET' })
  .middleware([requireAuth])
  .handler(async () => {
    return db.query.nna.findMany({ limit: 100 })
  })

export const getNna = createServerFn({ method: 'GET' })
  .middleware([requireAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const row = await db.query.nna.findFirst({
      where: eq(nna.id_nna, data.id),
    })
    if (!row) throw notFound()
    return row
  })

export const createNna = createServerFn({ method: 'POST' })
  .middleware([requireAuth])
  .inputValidator((data: NNAInsert) => data)
  .handler(async ({ data }) => {
    const [created] = await db.insert(nna).values(data).returning()
    return created
  })

export const getNnaSummary = createServerFn({ method: 'GET' })
  .middleware([requireAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const id = data.id
    const row = await db.query.nna.findFirst({ where: eq(nna.id_nna, id) })
    if (!row) throw notFound()

    const [
      ingreso,
      documentacion,
      consumo,
      discapacidades,
      e2pCount,
      pmfCount,
      ncfasCount,
      historialRed,
      despeje,
      informes,
      salud,
      escolar,
      familiar,
      vinculos,
    ] = await Promise.all([
      db
        .select({ c: count() })
        .from(antecedenteIngreso)
        .where(eq(antecedenteIngreso.id_nna, id)),
      db
        .select({ c: count() })
        .from(documentacionIngreso)
        .where(eq(documentacionIngreso.id_nna, id)),
      db
        .select({ c: count() })
        .from(historialConsumoNNA)
        .where(eq(historialConsumoNNA.id_nna, id)),
      db
        .select({ c: count() })
        .from(discapacidadNNA)
        .where(eq(discapacidadNNA.id_nna, id)),
      db.select({ c: count() }).from(e2p).where(eq(e2p.id_nna, id)),
      db.select({ c: count() }).from(pmf).where(eq(pmf.id_nna, id)),
      db.select({ c: count() }).from(ncfas).where(eq(ncfas.id_nna, id)),
      db
        .select({ c: count() })
        .from(historialRedProteccional)
        .where(eq(historialRedProteccional.id_nna, id)),
      db
        .select({ c: count() })
        .from(procesoDespejeFamiliar)
        .where(eq(procesoDespejeFamiliar.id_nna, id)),
      db
        .select({ c: count() })
        .from(informeTribunal)
        .where(eq(informeTribunal.id_nna, id)),
      db
        .select({ c: count() })
        .from(antecedenteSalud)
        .where(eq(antecedenteSalud.id_nna, id)),
      db
        .select({ c: count() })
        .from(antecedenteEscolar)
        .where(eq(antecedenteEscolar.id_nna, id)),
      db
        .select({ c: count() })
        .from(antecedenteFamiliar)
        .where(eq(antecedenteFamiliar.id_nna, id)),
      db
        .select({ c: count() })
        .from(vinculoFamiliar)
        .where(eq(vinculoFamiliar.id_nna, id)),
    ])

    return {
      nna: row,
      counts: {
        ingreso: ingreso[0]?.c ?? 0,
        documentacion: documentacion[0]?.c ?? 0,
        consumo: consumo[0]?.c ?? 0,
        discapacidades: discapacidades[0]?.c ?? 0,
        e2p: e2pCount[0]?.c ?? 0,
        pmf: pmfCount[0]?.c ?? 0,
        ncfas: ncfasCount[0]?.c ?? 0,
        historialRed: historialRed[0]?.c ?? 0,
        despeje: despeje[0]?.c ?? 0,
        informes: informes[0]?.c ?? 0,
        salud: salud[0]?.c ?? 0,
        escolar: escolar[0]?.c ?? 0,
        familiar: familiar[0]?.c ?? 0,
        vinculos: vinculos[0]?.c ?? 0,
      },
    }
  })
