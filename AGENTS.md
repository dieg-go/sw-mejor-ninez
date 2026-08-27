# AGENTS.md

## Project

**SW Mejor Niñez** — Decision Support System for Chilean child protective services.
Monorepo: Next.js 16 frontend + FastAPI backend + PostgreSQL 17.

## Quickstart

```bash
docker compose up -d --build    # http://localhost:3000
```

## Commands

| What | Command | Working dir |
|------|---------|-------------|
| Build | `pnpm build` | `frontend/` |
| Lint | `pnpm lint` | `frontend/` |
| Backend tests | `pytest` | `backend/` |
| Seed DB | `python seed.py` | `backend/` |
| Create migration | `python -m alembic revision --autogenerate -m "desc"` | `backend/` |
| Apply migrations | `python -m alembic upgrade head` | `backend/` |

## Roadmap (production priorities, in order)

Context: real institution will use this app. Solo developer. Hosted on a self-controlled server.

1. **Backups** — non-negotiable (data is children in the protective system; Ley 19.628). `pg_dump` on a schedule. Do this before anything else on this list.
2. **Deployment** — run it on the institution's server behind HTTPS. The app currently assumes `localhost` everywhere (CORS is hardcoded to `http://localhost:3000` only) — needs a real domain/origin + TLS + non-hardcoded CORS.
3. **Multi-user + audit trail** — roles beyond the single admin, and a record of who changed what case and when (institution will ask; protects us too).

Deferred intentionally: tests and CI (solo dev; not needed for the first live version). Revisit when changing old code risks breaking the E2P/PMF/NCFAS scoring, or when a second person joins.

## Tech Stack

- **Frontend**: Next.js 16.2 (App Router, `use(params)` for async route params), React 19, Tailwind CSS v4, shadcn/ui (radix-nova), next-themes, pnpm. All data pages are client components (`useEffect` + `useState`).
- **Backend**: FastAPI 0.115 (async), SQLModel 0.0.22, Pydantic v2, Alembic 1.14. Three-layer: Routes → Services → Models. Schemas separate from models.
- **DB**: PostgreSQL 17 (Alpine). DB `sw_mejor_ninez`, user/pass `postgres/postgres`, port **5433** (host-mapped from 5432). Inside Docker Compose, containers use `db:5432`. Schema reference: `db-schema-reference.dbml` (DBML format).
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
  migrations/versions/     # Single initial migration creates all tables via SQLModel.metadata
  seed.py                  # Idempotent (skips if ≥2 NNA exist)

frontend/
  src/app/                 # App Router pages — all client components
    nna/[id]/              # Summary page + 13 sub-pages (each full CRUD)
    familiar/[id]/          # Familiar detail (tabs)
    nuevo-caso/            # 6-step wizard
  src/lib/api.ts           # Centralized API client + all TypeScript interfaces
  src/components/ui/       # shadcn/ui components
```

## Key Conventions & Gotchas

### Renamed models
- **`Familiar`** (table `Familiar`) replaces `AdultoSignificativo`. API prefix is `/api/familiares`. Service is `FamiliarService`.
- **`VinculoFamiliar`** (table `VinculoFamiliar`) replaces `EntornoFamiliar`.
- FK on instrumentos is `id_familiar` (not `id_adulto_significativo`).
- Frontend routes use `/familiar/` for Familiar pages. The API client uses `api.familiares.*`.

### Instrumentos (E2P, PMF, NCFAS)
- **Dual FK**: each has `id_nna` → NNA and `id_familiar` → Familiar. Routes for both parents: `/api/nna/{id}/e2p` and `/api/familiares/{id}/e2p`.
- **E2P specifics**: model has `version: int` (required, 1-8). Responses are **normalized** — stored in `RespuestaE2P` rows, NOT as a JSON column on E2P. The API still accepts `respuestas: dict` (question number → Likert 0-4) in POST/PUT and syncs to normalized rows internally. Questions loaded from `PreguntaE2P` table (fallback to `app/data/e2p_questions.json`). Scoring from `BaremoE2P` table (seeded from `e2p_escala.json`). GET `/api/e2p/versions/{n}` for questions, GET `/api/e2p/{id}/puntaje` for scores.
- **E2P version** is `Optional[int]` in schema but **not optional** at DB level. Frontend auto-detects version from NNA's age, but API calls must include it.
- **Frontend `Instrumento` interface** is reused for all three (E2P/PMF/NCFAS). PMF and NCFAS don't have `version`/`respuestas` — don't send those fields for them.

### Database
- Port **5433** locally (Docker maps 5433→5432). Inside Compose, hostname `db` on port 5432.
- Alembic: use `python -m alembic` (not bare `alembic`). Needs running PostgreSQL. `alembic.ini` has a hardcoded URL, but `env.py` overrides it with `settings.database_url_sync` from config — the `.env` file or Docker env vars control the real connection.
- **Auto-migration**: `backend/entrypoint.sh` runs `alembic upgrade head` + `python seed.py` before starting uvicorn.
- There is a single initial migration (`0b733fafb9a6`) that creates all tables from SQLModel metadata. To add tables, update models and generate a new migration.
- `.env` lives in `backend/`, not repo root. Run `uvicorn` from `backend/` so pydantic-settings finds it. Docker Compose sets env vars directly (DB_HOST=db, etc.) which override `.env`.
- All PKs are UUID (`default_factory=uuid.uuid4`). Omit when creating.
- `tiene_antecedentes_penales` on Familiar is **denormalized** — must update when adding/removing `AntecedentesPenales`.

### Known DB drift (deferred)
- **`Caso` grouping** — `Caso` model (one active per NNA via partial unique index `uq_caso_activo_por_nna`). Grouped tables (E2P, PMF, NCFAS, AntecedenteIngreso, DocumentacionIngreso, AntecedenteSalud/Escolar/Familiar, InformeTribunal, ProcesoDespejeFamiliar) carry `id_caso` **NOT NULL** + composite FK `(id_nna, id_caso) → Caso(id_nna, id_caso)` (migration `bbf68836b0d8`). Auto-stamped by `create_nna_child`. Writes to records of a `Cerrado` caso → `HTTPException(409)` (guard `_assert_caso_abierto`, `update_child` + despeje/notificación/NCFAS-comment routes). `ProcesoDespejeFamiliar` is unique per `(id_nna, id_caso)` — one despeje per caso, not per NNA. API: `GET/POST /api/nna/{id}/casos`, `GET/PUT /api/casos/{id_caso}`, `?id_caso=` filter on grouped list endpoints; despeje GET accepts optional `id_caso` (defaults to active caso). Backend is done; frontend case switcher (summary page, `?id_caso=` URL param) was still in progress at the time of writing.
- **Caso grouping scope (open product question — ask clients)** — `HistorialConsumoNNA`, `DiscapacidadNNA`, `HistorialRedProteccional` are NNA-level (no `id_caso`), so they stay editable even on a closed caso. They evolve over time and are only edited from inside the case view; ask whether they should be grouped too (read-only on closed casos, one snapshot per caso). Tradeoff: grouped = page shows only the current caso's entries; ungrouped = single merged timeline across casos. `HistorialConsumoAdulto` (familiar-level) and `VinculoFamiliar` (stable relationship graph) should stay ungrouped. If grouped: add `id_caso` + composite FK (copy `antecedentes.py`), extend the seed stamping loop, add `?id_caso=`/read-only to the consumo & discapacidades pages; backend routes work via the generic helpers unchanged.
- **`AntecedentePenal` vs `AntecedentesPenales`** — DBML says singular, real table is plural (`app/models/familiar.py`). Fix (rename table + migration) deferred.
- **E2P missing cascade** — `RespuestaE2P`/`PuntajeE2P` lack `ondelete="CASCADE"` (`app/models/e2p.py`) while PMF/NCFAS children have it; deleting an E2P row fails on FK. Add `ondelete` + migration before building E2P delete.

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
- **`/nuevo-caso` wizard**: 6 steps, creates records sequentially (NNA first for `id_nna`). Only NNA is required.

### Environment & tooling
- **Tailwind CSS v4**: `@import "tailwindcss"` (NOT `@tailwind base`). Theme via `@theme inline {}` in CSS. No `tailwind.config.js`. PostCSS uses `@tailwindcss/postcss`.
- **ESLint 9 flat config**: `eslint.config.mjs` with `defineConfig`. Extends via spread: `...nextVitals, ...nextTs`.
- **Next.js 16 async params**: dynamic route params are `Promise<{ id: string }>`, consumed with `use(params)`.
- **CORS**: restricted to `http://localhost:3000` only.
- **pnpm `--ignore-scripts`** in Docker builds — skips postinstall hooks. If adding a dep needing postinstall, remove the flag.
- **No tests yet**: `pytest` is configured but `backend/tests/` is empty.
- **Seed is idempotent**: checks `≥2 NNA` before inserting. Also creates default admin user (`admin@mejorninez.cl` / `admin123`) if none exists.
- **Empty dirs**: `shared/` (intended for shared types) and `backend/app/instruments/` (stale pycache only). Don't add files without instruction.
- **No separate typecheck** command in frontend. `pnpm build` includes TS type-checking as part of the Next.js build.
- **`opencode.json`** is in `.gitignore` — local-only config, never committed.
- **Delegation**: `frontend/AGENTS.md` delegates to this root file with `@../AGENTS.md`. Update only this root file.
- **`dev.ps1`**: convenience script that runs DB via Docker + backend/frontend in separate PowerShell windows. `docker compose up -d --build` (single command, all Docker) is the recommended way.

### Over-engineering audit (deferred, ~-2,500 ln, -4 deps possible)

From a full-repo ponytail audit. Do before writing any new nna/familiar page. Ranked biggest cut first:

1. **Five duplicated page pairs** — `nna/[id]/X` vs `familiar/[id]/X` (consumo, discapacidades, e2p, pmf, ncfas, ~1,400 ln, ~76 ln real difference). Parameterize one page with an api-client group.
2. **`combobox.tsx` + `input-group.tsx`** (~455 ln) exist only for the solicitante picker; only import of `@base-ui/react`. Replace with existing `ui/select`.
3. **CRUD scaffold repeated in ~12 sub-pages** — loading/error/header Card, `showForm`/`editingId` state machine, Popover+Calendar date block (4×/page). Extract one list-shell hook + `<DateField>` (~700 ln).
4. **`backend/app/schemas/__init__.py`** — 202-line re-export aggregator, zero imports anywhere. Delete.
5. **Dead shadcn components**: `ui/{alert,breadcrumb,skeleton,toggle}.tsx` never imported (258 ln).
6. **All `Relationship(back_populates=...)`** in backend models (~50 ln) — zero code traverses them; every query is explicit `select`.
7. **Catalog CRUD triplication** — `solicitante`/`establecimiento`/`centro_salud` routes identical except names; generic helper per entity (optional until a 4th catalog).
8. **Dead entity `RegistroGrupoFamiliar`** — model + schemas, no route/service/seed.
9. **`.agents/skills/shadcn/` (13 files) + `skills-lock.json`** — generated agent-tooling bloat.
10. **JSON fallback loaders** `_load_items_from_json()`/`_load_questions_json()` in ncfas/pmf routes — unreachable (entrypoint seeds first); E2P has no fallback.
11. **`informes_atrasados` + `informes_proximos`** — near-identical queries; one with a `vencidas` param.
12. **Dead imports** in `services/__init__.py` (`and_`, `func`, 17 models) + scattered unused imports (~32 ln).
13. **`date-fns` dep** — zero src imports. **`@base-ui/react`** — see #2.
14. **Dead auth helpers** `getToken`/`getUser`/`isAuthenticated` — `auth-provider.tsx` re-implements inline; keep one.
15. **`next.config.ts` rewrites + `API_BACKEND_URL`** — nothing requests relative `/api`/`/uploads`.
16. **Unused E2P Read schemas** (`BaremoE2PRead`, `PreguntaE2PRead`, `PuntajeE2PRead`, 49 ln) + `UsuarioCreate` + `_parse_item_key()`.
17. **`formatDate`/`fmt` date helpers duplicated in ~17 files** — one shared helper in `src/lib/utils.ts`.
18. **Orphan `/faq` page** (52 ln, template filler); **create-next-app boilerplate** (5 public svgs, README.md); **Geist font** (variable never used).
19. **Re-rolled shared components** in `familiar/[id]/page.tsx` (`InfoRow`, SectionCard, `diasDesde`, `RESULTADO_STYLES` duplicated).
20. **`requirements.txt`**: `httpx`, `python-dotenv` unused; `pytest`+`pytest-asyncio` optional (tests/ empty).
21. **Small dead bits**: `theme-provider.tsx` pass-through, alembic.ini `sqlalchemy.url` (env.py overrides), `app/core/__init__.py` re-exports, `EstadoInforme.VENCIDO`, `PreguntaPMF.escala`, `Usuario.updated_at`, duplicate show/hide-password toggles on login, commented-out JSX on home page.

### Authentication
- **JWT-based**: email + password login via `POST /api/auth/login` returns `access_token`. All other API routes require `Authorization: Bearer <token>`. Token expiry: 8 hours.
- **Backend**: `app/core/security.py` — bcrypt for password hashing, python-jose for JWT. `get_current_user` FastAPI dependency reads user from DB on each request. `Usuario` model in `app/models/usuario.py`. Auth routes in `app/api/routes/auth.py` (public, no auth required).
- **Frontend**: JWT stored in `localStorage` as `auth_token`. `src/lib/auth.ts` — `login()`, `logout()`, `getToken()`, `isAuthenticated()`. API client auto-attaches Bearer token and redirects to `/login` on 401. Login page at `/login`. Header shows nav links + user name only when authenticated.
- **Default admin**: `admin@mejorninez.cl` / `admin123` (created by seed if no users exist).
