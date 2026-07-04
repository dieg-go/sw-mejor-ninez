<!-- intent-skills:start -->
## Skill Loading

Before editing files for a substantial task:
- Run `pnpm dlx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

# SW Mejor Niñez — TanStack Start Migration

**Status:** Migration in progress. Fresh TanStack Start app scaffolded at the
repo root; the legacy Next.js + FastAPI app is preserved as reference material
in `./legacy-source/` (gitignored, not part of the new app). The first vertical
slice (auth + NNA list/new/detail) is ported and typechecks; the full Drizzle
schema for all 35 legacy business tables is ported with a generated migration.

## How this app was created

Scaffolded fresh (not mutated in place) with the TanStack CLI in a scratch dir,
then merged into the repo root:

```
npx @tanstack/cli@latest create my-tanstack-app --agent --package-manager pnpm --tailwind --add-ons neon,drizzle,sentry,better-auth,tanstack-query
```

Follow-up TanStack Intent commands (run from workspace root):

```
npx @tanstack/intent@latest install
npx @tanstack/intent@latest list
pnpm dlx @tanstack/intent@latest load @tanstack/react-start#lifecycle/migrate-from-nextjs
pnpm dlx @tanstack/intent@latest load @tanstack/start-client-core#start-core/server-functions
pnpm dlx @tanstack/intent@latest load @tanstack/start-client-core#start-core/middleware
```

The legacy repo was cloned into `./legacy-source` for reference only:

```
git clone https://github.com/dieg-go/sw-mejor-ninez.git legacy-source
```

The legacy `.git` was **not** copied into the new app; the repo's own `.git`
history is preserved at the root. `legacy-source/` is in `.gitignore`.

## Stack & integrations (all represented in the final project)

| Integration | How it's represented |
|---|---|
| **TanStack Start** (React) | `vite.config.ts` (`tanstackStart()`), `src/router.tsx`, file routes in `src/routes/` |
| **TanStack Router** | file-based routes + `routeTree.gen.ts` (`pnpm generate-routes`) |
| **TanStack Query** | `src/integrations/tanstack-query/` + SSR query integration in `src/router.tsx` |
| **Neon** (Postgres) | `src/db/index.ts` uses `@neondatabase/serverless` + `drizzle-orm/neon-http`; `neon-vite-plugin.ts` provisions a dev DB and seeds `db/init.sql` |
| **Drizzle ORM** | `src/db/schema.ts` (35 business tables) + `src/db/auth-schema.ts` (better-auth tables); `drizzle.config.ts`; `src/lib/nna-functions.ts` uses `db.query`/`db.insert` |
| **Better Auth** | `src/lib/auth.ts` (drizzle adapter, email/password), `src/lib/auth-client.ts`, `/api/auth/$` handler, login route, `requireAuth` middleware |
| **Sentry** | `instrument.server.mjs` (init from `VITE_SENTRY_DSN`) wired into dev/build/start scripts |

> The scaffold's `/demo/*` routes were removed: they referenced the demo
> `todos` table which was replaced by the real schema. Every integration is now
> exercised by real migrated code (see table above), so no partner integration
> was dropped.

## Environment variables (`.env.local`)

Copy `.env.example` to `.env.local` and fill in. Required for runtime:

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Neon/Postgres connection string (used by drizzle + neon plugin). Required to run the app. |
| `DATABASE_URL_POOLER` | Neon pooled connection (optional; scaffold placeholder) |
| `BETTER_AUTH_URL` | App base URL, e.g. `http://localhost:3000` |
| `BETTER_AUTH_SECRET` | Auth session secret. Generate: `pnpm dlx @better-auth/cli secret` |
| `VITE_SENTRY_DSN` | Sentry DSN (client + server). Sentry no-ops if empty. |
| `VITE_SENTRY_ORG` / `VITE_SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | Sentry release upload (optional) |

> The legacy app used `NEXT_PUBLIC_API_URL` / `API_BACKEND_URL` and a separate
> FastAPI process. These are **gone** — the TanStack Start app calls the DB
> directly via server functions. No `NEXT_*` vars are used.

## Commands

| What | Command |
|---|---|
| Dev server (port 3000) | `pnpm dev` |
| Generate route tree | `pnpm generate-routes` (run after adding/removing routes) |
| Build | `pnpm build` |
| Start production build | `pnpm start` |
| Typecheck | `npx tsc --noEmit` (no lint script configured by scaffold) |
| Tests | `pnpm test` (vitest — scaffold tests; need updating after migration) |
| Generate Drizzle migration | `pnpm db:generate` |
| Apply migrations | `pnpm db:migrate` (needs a live DB) |
| Push schema directly | `pnpm db:push` (needs a live DB; dev shortcut) |
| Drizzle Studio | `pnpm db:studio` |
| Regenerate better-auth schema | `pnpm dlx @better-auth/cli@latest generate` (already used to create `src/db/auth-schema.ts`) |

## Bringing up the database

No live DB is needed to typecheck or generate migrations. To actually run the
app end-to-end:

1. Set `DATABASE_URL` in `.env.local` to a Neon connection string (or a local
   Postgres, e.g. the legacy docker-compose DB on `postgresql://postgres:postgres@localhost:5433/sw_mejor_ninez`).
2. `pnpm db:push` (or `pnpm db:migrate` after `pnpm db:generate`) to create tables.
3. Create the admin user via better-auth sign-up, or seed (see below).
4. `pnpm dev`.

> **Seed data not yet ported:** the legacy `backend/seed.py` seeded the admin
> user, E2P preguntas/baremos, PMF afirmaciones, NCFAS items, and 3 demo NNA.
> The static JSON lives in `legacy-source/backend/app/data/`. Porting the
> instrument catalogs and a seed script is a pending slice (see Next steps). To
> log in today, create a user via `authClient.signUp.email` (the legacy admin
> `admin@mejorninez.cl` / `admin123` does **not** exist in better-auth yet).

## Project structure

```
src/
  routes/
    __root.tsx          # document shell: <AppHeader/>, devtools, theme, styles; title "SW Mejor Niñez", lang es
    index.tsx           # /  landing (Nuevo caso / Ver registro NNA)
    login.tsx           # /login (better-auth email/password; redirects to / if session)
    _auth.tsx           # pathless auth layout: beforeLoad calls getSession(), redirects to /login
    _auth/
      nna.tsx           # /nna  list (loader -> listNna server fn; client-side search)
      nna/nuevo.tsx     # /nna/nuevo  new NNA form (createNna server fn)
      nna/$id.tsx       # /nna/$id  detail dashboard (getNnaSummary: nna + per-section counts)
      nuevo-caso.tsx    # /nuevo-caso  STUB (wizard pending)
      familiar.tsx      # /familiar    STUB (familiar pages pending)
    api/auth/$.ts       # better-auth handler (GET/POST)
  lib/
    auth.ts             # betterAuth({ database: drizzleAdapter(db,...), emailAndPassword, tanstackStartCookies })
    auth-client.ts      # createAuthClient() (client; authClient.useSession / signIn / signOut)
    auth-middleware.ts  # requireAuth: createMiddleware({type:'function'}) -> reads session via getRequest(), throws redirect to /login
    auth-functions.ts   # getSession server fn (used by _auth beforeLoad + login beforeLoad)
    nna-functions.ts    # listNna / getNna / createNna / getNnaSummary (all .middleware([requireAuth]))
  db/
    index.ts            # drizzle(neon(DATABASE_URL), { schema: {...business, ...auth} })
    schema.ts           # 35 legacy business tables (snake_case cols, PascalCase table names matching legacy DB)
    auth-schema.ts      # better-auth user/session/account/verification (generated by @better-auth/cli)
  integrations/tanstack-query/   # QueryClient getContext + SSR integration + devtools
  components/app-header.tsx      # top nav + user + logout + theme (uses authClient.useSession)
  router.tsx            # getRouter() with QueryClient context + setupRouterSsrQueryIntegration
db/init.sql             # neon plugin seed (still the demo todos; replace with a real seed when porting)
drizzle/                # generated migrations (0000_plain_omega_sentinel.sql = all 39 tables)
```

## Key architectural decisions

- **Full-stack TS replaces the FastAPI backend.** The legacy was Next.js
  frontend + FastAPI/SQLModel/JWT backend. The requested stack (neon + drizzle +
  better-auth + tanstack-query) is a full-stack TS solution, so FastAPI routes
  become TanStack Start server functions (`createServerFn`), SQLModel becomes
  Drizzle, JWT becomes better-auth cookie sessions. The whole `api.ts` fetch
  layer disappears.
- **Schema ports from the SQLModel models, not the DBML.** The DBML is slightly
  stale (see tensions below). Table names are the legacy PascalCase (`NNA`,
  `Familiar`, `AntecedentesPenales`…) and columns are snake_case, so the new DB
  matches the legacy DB and the JSON contract matches the legacy frontend.
- **Auth = better-auth, not the legacy `Usuario` table.** better-auth uses its
  own `user`/`session`/`account`/`verification` tables (text IDs, snake_case
  columns — generated by `@better-auth/cli generate` into
  `src/db/auth-schema.ts`). The legacy `Usuario` table is **not** ported; its
  single admin user must be recreated via better-auth sign-up.
- **Auth has two boundaries, per TanStack Intent guidance:**
  - UX guard: `_auth` layout `beforeLoad` calls `getSession()` and redirects to
    `/login` (protects route UI).
  - Data boundary: **every** server function that touches private data uses
    `.middleware([requireAuth])`, which re-reads the session from the request
    cookie via `auth.api.getSession` and throws `redirect({ to: '/login' })`.
    Route guards do **not** protect the server-function RPC endpoints.
- **Server functions use `.inputValidator()` (not `.validator()`).** The
  installed `@tanstack/start-client-core` is v1.170, where `inputValidator` is
  the primary API (the migrate-from-nextjs skill doc, written for v1.166, says
  `.validator()` — that's stale for this version).
- **Design system:** the scaffold ships a custom "island/sea" theme
  (`src/styles.css` with `--sea-ink`, `--lagoon`, `.demo-panel`, `.demo-button`,
  `.demo-input`, `.demo-table`, `.nav-link`, …). The legacy used shadcn/ui +
  Tailwind tokens (`bg-background`, `text-muted-foreground`, …). We preserve
  **UX** (layout, nav, sections, forms, tables, cards) using the scaffold's
  design language rather than pulling in shadcn. Visual theme differs; behavior
  is preserved. (If pixel-matching is required later, add shadcn via its CLI.)
- **Typed `Link to=`** requires the target route to exist. That's why
  `/nuevo-caso` and `/familiar` currently resolve to stub routes — their real
  pages are pending migration.

## Migration progress

Done:
- Fresh TanStack Start app (saas starter) scaffolded, merged, typechecks (`npx tsc --noEmit` clean).
- Full Drizzle schema: all 35 legacy business tables + 4 better-auth tables,
  with enums (`tipo_informe`, `estado_informe`), check constraints
  (`chk_momento_ncfas`, `chk_puntaje_ncfas`, `chk_vinculo_nna_orden`), unique
  indexes, and FKs. Migration generated: `drizzle/0000_plain_omega_sentinel.sql`.
- better-auth wired to drizzle (email/password, TanStack Start cookies).
- Auth UX guard + data-boundary middleware (`requireAuth`).
- First vertical slice: `/` (home), `/login`, `/nna` (list + search),
  `/nna/nuevo` (create), `/nna/$id` (detail dashboard with per-section counts).
  All NNA server functions are auth-protected.

Pending (in suggested porting order — one vertical slice at a time):
1. **Familiar slice:** `/familiar` list, `/familiar/nuevo` (nested
   penales/consumo/discapacidad + NNA link), `/familiar/$id` detail + sub-pages
   (consumo, discapacidades, penales, e2p, pmf, ncfas). Port `Familiar`,
   `AntecedentesPenales`, `HistorialConsumoAdulto`, `DiscapacidadAdulto`. Keep
   the denormalized `tiene_antecedentes_penales` flag in sync.
2. **NNA sub-pages (CRUD):** ingreso (+causales+derechos, with the
   `create_diagnostico_informe` side-effect), documentacion, consumo,
   discapacidades, historial red, informes tribunal (with the
   `chain_next_informe` +3-month side-effect + `atrasados`/`proximos-a-vencer`
   alerts), salud, escolar, familiar (entorno + vinculos), busqueda-familiar
   (3-step wizard: despeje + notificaciones).
3. **Nuevo caso wizard** (5 steps, sequential creates).
4. **Instrumentos:** E2P (the hard one — port `_sync_respuestas`,
   `_calcular_puntajes`, `_determinar_resultado`, the `0-3_meses` special-case
   Likert remap, and the 8 rango_etario versions + baremo), PMF, NCFAS
   (per-item scores + per-dimension comments, A–H always / I–J if
   `es_reunificacion`). Extract scoring into `src/lib/instruments/` so it's
   testable (the legacy embeds it in route files).
5. **Catalogs:** solicitantes / establecimientos / centros-salud CRUD.
6. **Upload:** `/api/upload/docs` multipart + static serving (replace FastAPI
   `python-multipart` + `/uploads` mount).
7. **Seed:** port `backend/seed.py` (admin user, E2P/PMF/NCFAS catalogs from
   `legacy-source/backend/app/data/*.json`, demo NNA) to a drizzle seed script.

## Migration tensions (things that do NOT port 1:1)

From cross-reading the legacy models, DBML, migrations, and frontend (full
inventory in `legacy-source/AGENTS.md` + the migration notes below):

- **DBML is stale vs the models.** Port from the models. `NNA.poblacion_o_villa`,
  `Familiar.tiene_antecedentes_penales`, and `ItemNCFAS.definiciones` (jsonb)
  exist in the models but not the DBML. The DBML table `AntecedentePenal`
  (singular) is actually `AntecedentesPenales` (plural) in the DB. The Drizzle
  schema uses the model names. ✅ already handled.
- **Check constraints** for E2P tables (rango_etario enum, dimension enum,
  decil range, zona enum, valor 0–4) existed only as DBML docs / Python logic,
  not at the DB level. Decision: keep them as app-level validation in the E2P
  server functions (pending), not DB CHECKs, to match legacy behavior. NCFAS /
  VinculoNNA / InformeTribunal CHECKs **are** in the Drizzle schema. ✅
- **StrEnum stored as String** (`TipoInforme`, `EstadoInforme`) → ported as
  `pgEnum`. ✅
- **Normalized instrument responses:** E2P/PMF/NCFAS store responses as child
  rows but the API accepts/returns a `respuestas: dict` and the legacy route
  does delete-all + re-insert on every write. Preserve the dict contract in the
  server functions; consider intelligent upserts later. The `E2P` GET returns
  `valor_seleccionado` (not `puntaje_calculado`) in the dict — preserve that.
- **Side-effectful endpoints:** `POST antecedentes-ingreso` creates a
  Diagnóstico informe (+30d); `PUT informe-tribunal` to `Enviado` chains a
  Seguimiento (+3m). Make these explicit transactions in the server functions.
- **No DELETE anywhere** in the legacy. No delete UI ported either.
- **Auth model change:** JWT-in-localStorage (XSS-vulnerable, 8h token, per-request
  DB hit) → better-auth httpOnly cookie sessions. No roles in the legacy; single
  admin. better-auth's `user` table has no `nombre`/`is_active` — `name` is used
  in the header (`session.user.name || session.user.email`).
- **Date handling:** legacy repeats `new Date(iso + "T00:00:00")` and
  `toISOString().split("T")[0]` in every form. Centralize a date helper when
  porting forms (a `src/lib/dates.ts` is a good idea).
- **Frontend types** were hand-maintained in `api.ts`. We infer from Drizzle
  (`$inferSelect`/`$inferInsert`) and share via server functions — no `api.ts`.
- **Catalogs** (`CATALOGO_CAUSALES`, `CATALOGO_DERECHOS`, …) are hardcoded TS
  arrays in `legacy-source/frontend/src/lib/catalogos.ts`. Port them to a shared
  `src/lib/catalogos.ts` (or promote to DB tables) when porting ingreso/forms.
- **Next.js 16 `use(params)`** async params → TanStack `Route.useParams()`
  (sync). No `"use client"`/`"use server"` directives. All data fetching moves
  from `useEffect` to route `loader`s (the single biggest UX win: no more
  loading spinners on every page).

## Known gotchas

- `pnpm` v11.7 ignores the `pnpm` field in `package.json`; build approval lives
  in `pnpm-workspace.yaml` (`allowBuilds: { '@sentry/cli': true, esbuild: true }`).
- `src/db.ts` (scaffold neon `getClient`) was removed to avoid a name collision
  with the `src/db/` directory — import the drizzle instance from `#/db/index`,
  not `#/db`.
- `tsconfig.json` excludes `legacy-source/` (the old Next.js app has its own
  deps and would otherwise fail typecheck).
- `db/init.sql` is still the demo `todos` seed; replace with a real seed when
  porting instrument catalogs. The neon plugin seeds it on dev start.
- `routeTree.gen.ts` is generated (`@ts-nocheck`) — regenerate with
  `pnpm generate-routes` after touching `src/routes/`.
- Runtime verification requires a live `DATABASE_URL`; the app typechecks and
  migrations generate without one, but `pnpm dev` data pages need the DB.
- `pnpm build` outputs to `dist/` (not `.output/`): `dist/server/server.js` is a
  fetch-handler entry (`export default { fetch }`), not a `node ... .listen()`
  server. The build script was made cross-platform (a Node `copyFileSync` of
  `instrument.server.mjs` into `dist/server/`). The scaffold's `pnpm start`
  (which targeted `.output/server/index.mjs`) does **not** match this TanStack
  version's output — wiring a production Node server adapter is a deployment
  follow-up (see the `start-core/deployment` Intent skill).
