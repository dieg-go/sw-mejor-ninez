# AGENTS.md

## Project

**SW Mejor Niñez** — Decision Support System for Chilean child protective services.
Monorepo: Next.js 16 frontend + FastAPI backend + PostgreSQL 17.

## Where things stand (read this first)

**Checkpoint: tag `v0.1-preproduccion`** (`git show v0.1-preproduccion` for the exact commit). Working tree clean.

**Done and working**: full case-management app end-to-end — 13 NNA sub-pages, 6 Familiar pages,
`/nuevo-caso` 6-step wizard, JWT auth, and `Caso` grouping with a case switcher. ~3,989 lines backend,
~13,794 frontend. Dead-code cleanup applied (commit `55abe957`).

**Verified 2026-09-19** (not assumed): `pnpm build` completes clean (cold build, full TS typecheck);
all 45 backend modules import (`python -c "import app.main"` inside the built image); `--frozen-lockfile`
passes. So the checkpoint is a *buildable, importable* baseline.

**Test suite (added after the checkpoint)**: 818 backend tests (pytest in Docker) + 214 frontend tests
(Vitest), all green. The frontend has 1 deliberately-failing test that documents a known defect; the
backend has none today. See `TESTING.md` for the full inventory, the isolation design, and the defect
list. Since 2026-09 the frontend also has **component tests** (piloto: `nna/[id]/discapacidades`).

**Fresh deploys work**: the migration chain builds a database from scratch (defect B1, fixed — see
`TESTING.md`). `alembic upgrade head` + `seed.py` on an empty database now produces a working
installation; that was verified end to end (migrate → seed → login → API), not assumed. Backups and
deployment are still unstarted, so this is *not* production-operable yet.

**Not started — this is the actual remaining roadmap**: backups, deployment, multi-user/audit.
See Roadmap below; the app is *feature-complete enough* and *not production-operable yet*.

**Self-check before assuming something is broken**: Docker must be running (`docker ps`). The
`backend/.venv` is stale (points at a removed Store Python) — use Docker, not a local venv; there is
no working local Python. `pnpm build` works; if pnpm refuses to touch `node_modules` in a non-TTY
shell, prefix with `$env:CI='true'`. When curling the API from Windows, use **`127.0.0.1`, not
`localhost`** — `localhost` resolves to IPv6 `::1`, which Docker Desktop does not forward, so each
request stalls ~21s before falling back to IPv4 (in-container calls answer in ~23ms).

**There are two ways to build the schema and they are not equivalent.** `create_all` (what the test
suite uses) builds it from the models; `alembic upgrade head` (what `entrypoint.sh` uses) replays the
migrations. Any drift between them is a latent prod-only bug. **The development database was found to
be in that state**: it carried every constraint of `bbf68836b0d8` but *not* its `id_caso NOT NULL`,
and its `alembic_version` still said head — i.e. it was built by `create_all` and stamped, never
migrated. That is why B1 hid for so long: nobody ran the chain locally. It was corrected in place
(verified: no `NULL` values existed) and `python -m alembic check` now reports a clean diff. Run
`alembic check` against a database before trusting it.

## Quickstart

```bash
docker compose up -d --build    # http://localhost:3000
```

## Commands

| What | Command | Working dir |
|------|---------|-------------|
| Build | `pnpm build` | `frontend/` |
| Lint | `pnpm lint` | `frontend/` (69 errors pre-existing, all in `src/`) |
| Backend tests | `docker compose --profile test run --rm backend-tests` | `.` |
| Frontend tests | `pnpm test` | `frontend/` |
| Seed DB | `python seed.py` | `backend/` |
| Create migration | `python -m alembic revision --autogenerate -m "desc"` | `backend/` |
| Apply migrations | `python -m alembic upgrade head` | `backend/` |
| Check schema drift | `python -m alembic check` | `backend/` (fails if a database's schema differs from the models) |

### How the test suite runs

- **Backend tests run inside Docker**, not on the host: the local venv is stale and
  `backend/tests/` needs the full stack. The `backend-tests` service lives under the Compose
  profile `test`, so it never starts with `docker compose up`, and its `command` overrides the
  image `CMD` — it does **not** run `entrypoint.sh`, so it never migrates or seeds the dev DB.
- It bind-mounts only `backend/tests/` and `backend/pytest.ini`, so editing tests needs no rebuild.
  **Changes to `app/`, `migrations/`, `seed.py` or `requirements.txt` require
  `docker compose --profile test build backend-tests`.**
- The suite creates its own throwaway databases (`sw_mejor_ninez_test`,
  `sw_mejor_ninez_seedtest`, `sw_mejor_ninez_migtest`) and drops/recreates them on every run.
  The development database is never touched — `conftest.py` asserts `DB_NAME` ends in `_test`
  before dropping anything.
- Details, inventory and the known-defect list: `TESTING.md`.

## Roadmap (production priorities, in order)

Context: real institution will use this app. Solo developer. Hosted on a self-controlled server.

1. **Backups** — non-negotiable (data is children in the protective system; Ley 19.628). `pg_dump` on a schedule. Do this before anything else on this list. **Unblocked**: the bare-metal restore into a clean database works now that defect B1 is fixed — verify it with a real restore rather than trusting the migration chain.
2. **Deployment** — run it on the institution's server behind HTTPS. The app currently assumes `localhost` everywhere (CORS is hardcoded to `http://localhost:3000` only) — needs a real domain/origin + TLS + non-hardcoded CORS. **Unblocked**: a fresh deploy now migrates and seeds from an empty database.
3. **Multi-user + audit trail** — roles beyond the single admin, and a record of who changed what case and when (institution will ask; protects us too).

Deferred intentionally: CI (solo dev; not needed for the first live version). The **test suite is
done** (see `TESTING.md`) — tests were pulled forward from this list precisely because the scoring
code (E2P/PMF/NCFAS) is now covered and changes to it are safe. Component tests exist as a one-page
pilot (2026-09); extending them to the rest of the pages is the pending part. Still deferred:
browser E2E, coverage gates.

## Tech Stack

- **Frontend**: Next.js 16.2 (App Router, `use(params)` for async route params), React 19, Tailwind CSS v4, shadcn/ui (radix-nova), next-themes, pnpm. All data pages are client components (`useEffect` + `useState`).
- **Backend**: FastAPI 0.115 (async), SQLModel 0.0.22, Pydantic v2, Alembic 1.14. Three-layer: Routes → Services → Models. Schemas separate from models.
- **DB**: PostgreSQL 17 (Alpine). DB `sw_mejor_ninez`, user/pass `postgres/postgres`, port **5432** (as mapped in `docker-compose.yml`). Inside Docker Compose, containers use `db:5432`. Schema reference: `db-schema-reference.dbml` (DBML format).
- **Infra**: Docker Compose with three services (db/backend/frontend). Dockerfiles in both `backend/` and `frontend/`.
- **Development workflow**: `docker compose up -d --build` for the full stack. For faster iteration, use `dev.ps1` (DB in Docker, backend + frontend locally with hot-reload) or `docker compose up -d db backend` + `cd frontend && pnpm dev` for frontend-only work.

## Code Organization

```
backend/
  main.py                  # Shim: re-exports from app.main (so both `uvicorn main:app` and `uvicorn app.main:app` work)
  app/
    main.py                # FastAPI app, CORS (localhost:3000 only), /health, static uploads mount
    api/routes/            # One file per domain; __init__.py aggregates all routers
    models/                # SQLModel tables (__tablename__ matches class name)
    schemas/               # Pydantic v2: *Base/*Create/*Update/*Read per entity
    services/__init__.py   # FamiliarService, NNAService + generic helper functions
    data/                  # JSON files loaded at runtime (E2P, PMF, NCFAS)
    core/                  # config.py (Settings), database.py (async engine), security.py
  migrations/versions/     # 3 chained migrations (head: bbf68836b0d8)
  seed.py                  # Idempotent (skips if ≥2 NNA exist)

frontend/
  src/app/                 # App Router pages — all client components
    nna/[id]/              # Summary page + 13 sub-pages (each full CRUD)
    familiar/[id]/          # Familiar detail (tabs)
    nuevo-caso/            # 6-step wizard
  src/lib/api.ts           # Centralized API client + all TypeScript interfaces
  src/lib/navigation.ts    # Adapter: re-exports Link/useRouter/usePathname (the ONLY router coupling)
  src/hooks/               # use-vinculados.ts (single hook)
  src/components/ui/       # shadcn/ui components
  public/                  # .gitkeep only — MUST exist: Dockerfile does `COPY /app/public`
```

## Key Conventions & Gotchas

### Renamed models
- **`Familiar`** (table `Familiar`) replaces `AdultoSignificativo`. API prefix is `/api/familiares`. Service is `FamiliarService`.
- **`VinculoFamiliar`** (table `VinculoFamiliar`) replaces `EntornoFamiliar`.
- FK on instrumentos is `id_familiar` (not `id_adulto_significativo`).
- Frontend routes use `/familiar/` for Familiar pages. The API client uses `api.familiares.*`.

### Instrumentos (E2P, PMF, NCFAS)
- **Dual FK**: each has `id_nna` → NNA and `id_familiar` → Familiar. Routes for both parents: `/api/nna/{id}/e2p` and `/api/familiares/{id}/e2p`.
- **E2P specifics**: model has `version: int` (required, 1-8). Responses are **normalized** — stored in `RespuestaE2P` rows, NOT as a JSON column on E2P. The API still accepts `respuestas: dict` (question number → Likert 0-4) in POST/PUT and syncs to normalized rows internally. Questions loaded from `PreguntaE2P` table (fallback to `app/data/e2p_questions.json`). Scoring from `BaremoE2P` table (seeded from `e2p_escala.json`). GET `/api/e2p/versions/{rango_etario}` for questions — the param is the **range string** (e.g. `3-5_anos`), NOT a number; `/versions/1` is a 404. GET `/api/e2p/{id}/puntaje` for scores (returns 400 if that E2P has no `PuntajeE2P` rows).
- **E2P version** is `Optional[int]` in schema but **not optional** at DB level. Frontend auto-detects version from NNA's age, but API calls must include it.
- **Frontend `Instrumento` interface** is reused for all three (E2P/PMF/NCFAS). PMF and NCFAS don't have `version`/`respuestas` — don't send those fields for them.

### Database
- Port **5432** (matches `docker-compose.yml`; `backend/.env` for local runs also uses 5432). Inside Compose, hostname `db` on port 5432.
- Alembic: use `python -m alembic` (not bare `alembic`). Needs running PostgreSQL. `alembic.ini` has a hardcoded URL, but `env.py` overrides it with `settings.database_url_sync` from config — the `.env` file or Docker env vars control the real connection.
- **Auto-migration**: `backend/entrypoint.sh` runs `alembic upgrade head` + `python seed.py` before starting uvicorn.
- **Migrations (3, chained)**: `0b733fafb9a6` (initial — the pre-`Caso` schema as **frozen explicit DDL**; it must NOT use `SQLModel.metadata.create_all`, see `TESTING.md` defect B1) → `3f2e134a5977` (caso grouping) → `bbf68836b0d8` (caso hardening: NOT NULL + composite FK, head). To add tables, update models and generate a new migration. The chain builds a database from scratch, so a fresh deploy and a `pg_dump` restore into a clean database both work.
- `.env` lives in `backend/`, not repo root. Run `uvicorn` from `backend/` so pydantic-settings finds it. Docker Compose sets env vars directly (DB_HOST=db, etc.) which override `.env`.
- All PKs are UUID (`default_factory=uuid.uuid4`). Omit when creating.
- `tiene_antecedentes_penales` on Familiar is **denormalized** — must update when adding/removing `AntecedentesPenales`.

### Known DB drift (deferred)
- **`Caso` grouping** — `Caso` model (one active per NNA via partial unique index `uq_caso_activo_por_nna`). Grouped tables (E2P, PMF, NCFAS, AntecedenteIngreso, DocumentacionIngreso, AntecedenteSalud/Escolar/Familiar, InformeTribunal, ProcesoDespejeFamiliar) carry `id_caso` **NOT NULL** + composite FK `(id_nna, id_caso) → Caso(id_nna, id_caso)` (migration `bbf68836b0d8`). Auto-stamped by `create_nna_child`. Writes to records of a `Cerrado` caso → `HTTPException(409)` (guard `_assert_caso_abierto`, `update_child` + despeje/notificación/NCFAS-comment routes). `ProcesoDespejeFamiliar` is unique per `(id_nna, id_caso)` — one despeje per caso, not per NNA. API: `GET/POST /api/nna/{id}/casos`, `GET/PUT /api/casos/{id_caso}`, `?id_caso=` filter on grouped list endpoints; despeje GET accepts optional `id_caso` (defaults to active caso). Backend is done; frontend case switcher (summary page + `?id_caso=` URL param) is **done** — `CasoSwitcher` is rendered from `nna/[id]/page.tsx`.
- **Caso grouping scope (open product question — ask clients)** — `HistorialConsumoNNA`, `DiscapacidadNNA`, `HistorialRedProteccional` are NNA-level (no `id_caso`), so they stay editable even on a closed caso. They evolve over time and are only edited from inside the case view; ask whether they should be grouped too (read-only on closed casos, one snapshot per caso). Tradeoff: grouped = page shows only the current caso's entries; ungrouped = single merged timeline across casos. `HistorialConsumoAdulto` (familiar-level) and `VinculoFamiliar` (stable relationship graph) should stay ungrouped. If grouped: add `id_caso` + composite FK (copy `antecedentes.py`), open each NNA's caso in `seed.py` via `abrir_caso` and add the model to `MODELOS_AGRUPADOS` (its `before_flush` stamps the records), add `?id_caso=`/read-only to the consumo & discapacidades pages; backend routes work via the generic helpers unchanged.
- **`AntecedentePenal` vs `AntecedentesPenales`** — DBML says singular, real table is plural (`app/models/familiar.py`). Fix (rename table + migration) deferred. **Do not attempt it with `--autogenerate`**: it emits a plain `drop_table`/`create_table`, and Alembic's `rename_table` must be written by hand or the data is lost.
- **E2P missing cascade** — `RespuestaE2P`/`PuntajeE2P` lack `ondelete="CASCADE"` (`app/models/e2p.py`) while PMF/NCFAS children have it. There is also **no DELETE endpoint** for E2P at all (`DELETE /api/e2p/{id}` → 405), so the FK failure is latent, not yet reachable via the API. Add `ondelete` + migration before building E2P delete. Remember to add `ondelete="CASCADE"` to the model too, not only the migration, or `--autogenerate` will report drift (defect B2).
- **Seed has no instrument answers** — `RespuestaE2P`, `PuntajeE2P` and their PMF/NCFAS equivalents are empty after seeding, so the scoring endpoints return empty/400 until a user fills an instrument. Seed data covers records, not filled instruments.
- **Resolved (kept for context)**: `id_caso` model/migration drift (B2) — models now declare `nullable=False` and a test asserts `--autogenerate` reports no diff. When a migration hardens a column, harden the model in the same commit.

### Rollback procedure (git + DB sync)
When resetting code to an earlier commit, downgrade the DB to match:
```bash
# 1. Find the latest migration at the target commit
git show <target-commit>:backend/migrations/versions/

# 2. Downgrade DB to that revision
cd backend
python -m alembic downgrade <target-revision-id>

# 3. If migrations are missing (DB ahead of code), full reset:
docker compose down -v
docker compose up -d --build

# 4. Verify sync
docker exec sw-mejor-ninez-db psql -U postgres -d sw_mejor_ninez \
  -c "SELECT version_num FROM alembic_version;"
```

### Backend patterns
- **Services**: class-based for NNA/Familiar (`NNAService`, `FamiliarService`). Stateless generic functions for children: `list_nna_children()`, `create_nna_child()`, `get_nna_child()`, `update_child()`, plus `familiar`, `ingreso`, and `vinculo` variants.
- **Schema pattern**: Read schemas use `ConfigDict(from_attributes=True)`. Update schemas have all `Optional` fields (partial updates via `exclude_unset=True`). `NNAUpdate` intentionally duplicates fields (doesn't inherit from base) for `exclude_unset` to work correctly.
- **Router registration**: `api/routes/__init__.py` imports all routers into a flat list; `app/main.py` iterates with `include_router()`. Auth router is imported separately and registered without auth dependency; all other routers require `Authorization: Bearer`.
- **Alembic**: `env.py` does `import app.models` to register tables. New models must be added to `app/models/__init__.py`.
- **Pydantic config style**: Schemas use `model_config = ConfigDict(from_attributes=True)`; `Settings` uses dict-style `model_config = {"env_file": ".env", ...}`. Don't mix styles within one class.

### Frontend patterns
- **NNA sub-page pattern**: client component, `use(params)` for route param, `useEffect` fetch. "Nuevo" form toggles with `showForm`/`saving`/`formError`. "Editar" per-row with `editingId`/`editForm`/`editSaving`/`editError`. Dates: `Date | undefined` for Calendar → `"YYYY-MM-DD"` string for API. Display: `new Date(iso + "T00:00:00").toLocaleDateString("es-CL")` (the `T00:00:00` prevents timezone offset).
- **API client**: single `api` object in `src/lib/api.ts` with nested method groups. Base URL from `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000/api`). Auto-attaches Bearer token from `localStorage["auth_token"]`, redirects to `/login` on 401. All TS interfaces are hand-maintained (not shared with backend).
- **Navigation imports go through `@/lib/navigation`**, never `next/link` or `next/navigation` directly. It re-exports `Link`/`useRouter`/`usePathname` and is the *only* router coupling in the app (~31 files migrated in 2026-09). Mocking it in a test is one module instead of two Next modules. `use(params)` is deliberately **not** wrapped: absorbing that would mean changing the `params: Promise<{id}>` signature of 21 pages, which is separate work.
- **Fuentes: `@fontsource-variable/*`, no `next/font`.** `layout.tsx` importa `@fontsource-variable/{inter,sora,geist-mono}` (self-hosted, OFL-1.1) y `globals.css` mapea los nombres reales en `@theme inline`: `--font-sans` → `"Inter Variable"`, `--font-mono` → `"Geist Mono Variable"`, `--font-heading` → `"Sora Variable"`. Los paquetes variables traen **todos** los subsets con `unicode-range` (no hay `latin.css`), así que el navegador solo baja el woff2 que necesita. Con `next/font` las variables se inyectaban en runtime; ahora el layout no tiene ninguna dependencia de Next. Si se cambia de fuente hay que tocar **ambos** archivos: el import y el mapeo en el CSS.
- **`/nuevo-caso` wizard**: 6 steps, creates records sequentially (NNA first for `id_nna`). Only NNA is required.

### Environment & tooling
- **Tailwind CSS v4**: `@import "tailwindcss"` (NOT `@tailwind base`). Theme via `@theme inline {}` in CSS. No `tailwind.config.js`. PostCSS uses `@tailwindcss/postcss`.
- **ESLint 9 flat config**: `eslint.config.mjs` with `defineConfig`. Extends via spread: `...nextVitals, ...nextTs`.
- **Next.js 16 async params**: dynamic route params are `Promise<{ id: string }>`, consumed with `use(params)`.
- **CORS**: restricted to `http://localhost:3000` only.
- **pnpm `--ignore-scripts`** in Docker builds — skips postinstall hooks. If adding a dep needing postinstall, remove the flag.
- **Tests**: 818 backend (pytest, inside Docker) + 214 frontend (Vitest). See `TESTING.md`. The
  backend service is `backend-tests` under the Compose profile `test`; the frontend suite is
  `pnpm test`. Test files must not be placed under `frontend/src/app/` (Next's route scanner).
  The frontend suite defaults to the `node` environment; a component test opts into jsdom with a
  `// @vitest-environment jsdom` docblock. Component tests need a `<Suspense>` wrapper **and**
  `await act(async () => render(...))`, because `use(params)` suspends and React 19 does not retry a
  tree rendered with a plain `render` (see `TESTING.md`).
  **The models declare the schema as strictly as the database** (e.g. `id_caso` uses
  `sa_column_kwargs={"nullable": False}`), so `create_all` builds test databases that are as strict
  as the migrated ones. When a migration hardens a column, harden the model too: a model that
  under-declares lets `create_all` build a laxer schema, which once hid a seed bug that broke fresh
  deploys, and makes `--autogenerate` propose reverting the hardening (defect B2).
  `test_migrations.py::test_alembic_no_detecta_deriva_entre_los_modelos_y_el_esquema_migrado` guards
  this by requiring an empty `compare_metadata` diff.
- **Seed is idempotent**: checks `≥2 NNA` before inserting. Also creates default admin user (`admin@mejorninez.cl` / `admin123`) if none exists.
- **Root cleanup done** (2026-09): removed stray root `src/` (empty better-auth dirs), `.env.local` (Sentry/Better Auth placeholders from an unrelated scaffold), `cleanup.bat`. `shared/` and `backend/app/instruments/` no longer exist.
- **No separate typecheck** command in frontend. `pnpm build` includes TS type-checking as part of the Next.js build.
- **`opencode.json`** is in `.gitignore` — local-only config, never committed.
- **Delegation**: `frontend/AGENTS.md` delegates to this root file with `@../AGENTS.md`. Update only this root file.
- **`dev.ps1`**: convenience script that runs DB via Docker + backend/frontend in separate PowerShell windows. `docker compose up -d --build` (single command, all Docker) is the recommended way.

### Over-engineering audit (partially applied, ~-1,800 ln remaining)

From a full-repo ponytail audit. Do before writing any new nna/familiar page. Ranked biggest cut first.

**DONE** (commit `55abe957`): items 4, 5, 12, 16, 18, and the `date-fns` half of 13 — that commit removes those lines and deps.
**STILL PENDING**, highest value first: 1, 3, 2, then the rest.

1. **Five duplicated page pairs** — `nna/[id]/X` vs `familiar/[id]/X` (consumo, discapacidades, e2p, pmf, ncfas, ~1,400 ln, ~76 ln real difference). Parameterize one page with an api-client group.
2. **`combobox.tsx` + `input-group.tsx`** (~455 ln) exist only for the solicitante picker; only import of `@base-ui/react`. Replace with existing `ui/select`.
3. **CRUD scaffold repeated in ~12 sub-pages** — loading/error/header Card, `showForm`/`editingId` state machine, Popover+Calendar date block (4×/page). Extract one list-shell hook + `<DateField>` (~700 ln).
4. **[DONE `55abe957`]** **`backend/app/schemas/__init__.py`** — 202-line re-export aggregator, zero imports anywhere.
5. **[DONE `55abe957`]** **Dead shadcn components**: `ui/{alert,breadcrumb,skeleton,toggle}.tsx` never imported (258 ln).
6. **All `Relationship(back_populates=...)`** in backend models (~50 ln) — zero code traverses them; every query is explicit `select`.
7. **Catalog CRUD triplication** — `solicitante`/`establecimiento`/`centro_salud` routes identical except names; generic helper per entity (optional until a 4th catalog).
8. **Dead entity `RegistroGrupoFamiliar`** — model + schemas, no route/service/seed.
9. **`.agents/skills/shadcn/` (13 files) + `skills-lock.json`** — generated agent-tooling bloat.
10. **JSON fallback loaders** `_load_items_from_json()`/`_load_questions_json()` in ncfas/pmf routes — unreachable (entrypoint seeds first); E2P has no fallback.
11. **`informes_atrasados` + `informes_proximos`** — near-identical queries; one with a `vencidas` param.
12. **[DONE `55abe957`]** **Dead imports** in `services/__init__.py` (`and_`, `func`, 17 models) + scattered unused imports (~32 ln).
13. **[DONE half `55abe957`]** **`date-fns` dep** — zero src imports, removed. **`@base-ui/react`** — see #2, still pending.
14. **Dead auth helpers** `getToken`/`getUser`/`isAuthenticated` — `auth-provider.tsx` re-implements inline; keep one.
15. **[CORREGIDO 2026-09 — el audit estaba equivocado]** **`next.config.ts` rewrites + `API_BACKEND_URL`** — el audit decía "nothing requests relative `/api`/`/uploads`" y eso es **falso**. En Docker el frontend se construye con `NEXT_PUBLIC_API_URL=/api` (build arg del `Dockerfile` + env de `docker-compose.yml`), así que el navegador pide `/api/...` **relativo** y el rewrite de Next lo proxya a `http://backend:8000`. **Borrar los rewrites rompe el deploy de Docker.** En dev local no se nota porque `src/lib/api.ts` cae al default absoluto `http://localhost:8000/api` y la request va por CORS. Los rewrites quedan redundantes recién cuando el ítem 2 del roadmap ponga un reverse proxy con `/api` delante del backend.
16. **[DONE `55abe957`]** **Unused E2P Read schemas** (`BaremoE2PRead`, `PreguntaE2PRead`, `PuntajeE2PRead`, 49 ln) + `UsuarioCreate` + `_parse_item_key()`.
17. **`formatDate`/`fmt` date helpers duplicated in ~17 files** — one shared helper in `src/lib/utils.ts`.
18. **[DONE `55abe957`]** **Orphan `/faq` page** (52 ln, template filler); **create-next-app boilerplate** (5 public svgs, README.md). **[CORREGIDO 2026-09]** El "Geist font (variable never used)" de este ítem era **falso**: `--font-mono` sí se usa (`font-mono` en 4 lugares de `busqueda-familiar`). Las tres fuentes se usan y desde 2026-09 vienen de `@fontsource-variable/*` — ver el bullet de fuentes en *Frontend patterns*.
19. **Re-rolled shared components** in `familiar/[id]/page.tsx` (`InfoRow`, SectionCard, `diasDesde`, `RESULTADO_STYLES` duplicated).
20. **[DONE half `55abe957`]** **`requirements.txt`**: `httpx` removed; `python-dotenv` still present (zero imports — pydantic-settings reads `.env`); `pytest`+`pytest-asyncio` optional (tests/ empty).
21. **Small dead bits**: `theme-provider.tsx` pass-through, alembic.ini `sqlalchemy.url` (env.py overrides), `app/core/__init__.py` re-exports, `EstadoInforme.VENCIDO`, `PreguntaPMF.escala`, `Usuario.updated_at`, duplicate show/hide-password toggles on login, commented-out JSX on home page.

### Authentication
- **JWT-based**: email + password login via `POST /api/auth/login` returns `access_token`. All other API routes require `Authorization: Bearer <token>`. Token expiry: 8 hours.
- **Backend**: `app/core/security.py` — bcrypt for password hashing, python-jose for JWT. `get_current_user` FastAPI dependency reads user from DB on each request. `Usuario` model in `app/models/usuario.py`. Auth routes in `app/api/routes/auth.py` (public, no auth required).
- **Frontend**: JWT stored in `localStorage` as `auth_token`. `src/lib/auth.ts` — `login()`, `logout()`, `getToken()`, `isAuthenticated()`. API client auto-attaches Bearer token and redirects to `/login` on 401. Login page at `/login`. Header shows nav links + user name only when authenticated.
- **Default admin**: `admin@mejorninez.cl` / `admin123` (created by seed if no users exist).
