import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

import * as schema from './schema.ts'
import * as authSchema from './auth-schema.ts'

const databaseUrl = process.env.DATABASE_URL ?? ''

const sql = neon(databaseUrl)

export const db = drizzle(sql, { schema: { ...schema, ...authSchema } })
