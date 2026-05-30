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

## Tech Stack

- **Frontend**: Next.js 16.2 (App Router, `use(params)` for async route params), React 19, Tailwind CSS v4, shadcn/ui (radix-nova), next-themes, pnpm. All data pages are client components (`useEffect` + `useState`).
- **Backend**: FastAPI 0.115 (async), SQLModel 0.0.22 (asyncpg + psycopg2), Pydantic v2, Alembic 1.14. Three-layer: Routes → Services → Models. Schemas separate from models.
- **DB**: PostgreSQL 17 (Alpine). DB `sw_mejor_ninez`, user/pass `postgres/postgres`, port **5433** (host-mapped from 5432). Inside Docker Compose, containers use `db:5432`.
- **Infra**: Docker Compose with three services (db/backend/frontend). Dockerfiles in both `backend/` and `frontend/`.

## Code Organization

```
backend/
  main.py → app/main.py    # FastAPI app, CORS (localhost:3000 only), /health
  app/
    api/routes/            # One file per domain; __init__.py aggregates all routers
    models/                # SQLModel tables (__tablename__ matches class name)
    schemas/               # Pydantic v2: *Base/*Create/*Update/*Read per entity
    services/__init__.py   # FamiliarService, NNAService + generic helper functions
    data/                  # e2p_questions.json, e2p_escala.json (loaded at runtime)
    core/                  # config.py (Settings), database.py (async engine)
  migrations/versions/     # Initial + rename + e2p normalization + FK column
  seed.py                  # Idempotent (skips if ≥2 NNA exist)

frontend/
  src/app/                 # App Router pages — all client components
    nna/[id]/              # Summary page + 13 sub-pages (each full CRUD)
    familiar/[id]/          # Familiar detail (tabs)
    nuevo-caso/            # 6-step wizard
  src/lib/api.ts           # Centralized API client + all TypeScript interfaces
  src/components/ui/       # 21 shadcn/ui components
```

## Key Conventions & Gotchas

### Renamed models (recent — verify code, not old docs)
- **`Familiar`** (table `Familiar`) replaces `AdultoSignificativo`. API prefix is `/api/familiares`. Service is `FamiliarService`.
- **`VinculoFamiliar`** (table `VinculoFamiliar`) replaces `EntornoFamiliar`.
- FK on instrumentos is `id_familiar` (not `id_adulto_significativo`).
- Frontend routes use `/familiar/` for Familiar pages. The API client uses `api.familiares.*`.

### Instrumentos (E2P, PMF, NCFAS)
- **Dual FK**: each has `id_nna` → NNA and `id_familiar` → Familiar. Routes for both parents: `/api/nna/{id}/e2p` and `/api/familiares/{id}/e2p`.
- **E2P specifics**: model has `version: int` (required, 1-8) and `respuestas: dict` (JSON, question ID → Likert 0-4). Questions loaded from `app/data/e2p_questions.json`, scoring from `e2p_escala.json` (resolved via `Path(__file__).resolve().parent.parent.parent / "data"`). GET `/api/e2p/versions/{n}` for questions, GET `/api/e2p/{id}/puntaje` for scores.
- **E2P version** is `Optional[int]` in schema but **not optional** at DB level. Frontend auto-detects version from NNA's age, but API calls must include it.
- **Frontend `Instrumento` interface** is reused for all three (E2P/PMF/NCFAS). PMF and NCFAS don't have `version`/`respuestas` — don't send those fields for them.

### Database
- Port **5433** locally (Docker maps 5433→5432). Inside Compose, hostname `db` on port 5432.
- Alembic: use `python -m alembic` (not bare `alembic`). Needs running PostgreSQL.
- **Auto-migration**: `backend/entrypoint.sh` runs `alembic upgrade head` before starting uvicorn, so `docker compose up -d --build` always syncs the DB.
- `.env` lives in `backend/`, not repo root. Run `uvicorn` from `backend/` so pydantic-settings finds it.
- All PKs are UUID (`default_factory=uuid.uuid4`). Omit when creating.
- `tiene_antecedentes_penales` on Familiar is **denormalized** — must update when adding/removing `AntecedentesPenales`.

### Migration chain
```
0b733fafb9a6 (initial) → ef7302f55ef1 (e2p_version+respuestas)
  → 20260526_2116 (rename Adulto→Familiar, Entorno→Vinculo) → 65efebdbb730 (rename FK column)
  → ae12f00b467b (normalize_e2p — PreguntaE2P, RespuestaE2P, BaremoE2P tables)
```
The rename migration (`20260526_2116`) is idempotent — skips if old table names don't exist.

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
cd backend; python seed.py

# 4. Verify sync
docker exec sw-mejor-ninez-db psql -U postgres -d sw_mejor_ninez \
  -c "SELECT version_num FROM alembic_version;"
```

### Backend patterns
- **Service helpers**: class-based for NNA/Familiar (`NNAService`, `FamiliarService`). Stateless generic functions for children: `list_nna_children()`, `create_nna_child()`, `get_nna_child()`, `update_child()`, plus `familiar`, `ingreso`, and `vinculo` variants.
- **Schema pattern**: Read schemas use `ConfigDict(from_attributes=True)`. Update schemas have all `Optional` fields (partial updates via `exclude_unset=True`). `NNAUpdate` intentionally duplicates fields (doesn't inherit from base) for `exclude_unset` to work correctly.
- **Router registration**: `api/routes/__init__.py` imports all routers into a flat list; `app/main.py` iterates with `include_router()`.
- **Alembic**: `env.py` does `import app.models` to register tables. New models must be added to `app/models/__init__.py`.
- **Pydantic config style**: Schemas use `model_config = ConfigDict(from_attributes=True)`; `Settings` uses dict-style `model_config = {"env_file": ".env", ...}`. Don't mix styles within one class.

### Frontend patterns
- **NNA sub-page pattern**: client component, `use(params)` for route param, `useEffect` fetch. "Nuevo" form toggles with `showForm`/`saving`/`formError`. "Editar" per-row with `editingId`/`editForm`/`editSaving`/`editError`. Dates: `Date | undefined` for Calendar → `"YYYY-MM-DD"` string for API. Display: `new Date(iso + "T00:00:00").toLocaleDateString("es-CL")` (the `T00:00:00` prevents timezone offset).
- **API client**: single `api` object in `src/lib/api.ts` with nested method groups. Base URL from `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000/api`). All TS interfaces are hand-maintained (not shared with backend).
- **`/nuevo-caso` wizard**: 6 steps, creates records sequentially (NNA first for `id_nna`). Only NNA is required.

### Environment & tooling
- **Tailwind CSS v4**: `@import "tailwindcss"` (NOT `@tailwind base`). Theme via `@theme inline {}` in CSS. No `tailwind.config.js`. PostCSS uses `@tailwindcss/postcss`.
- **ESLint 9 flat config**: `eslint.config.mjs` with `defineConfig`. Extends via spread: `...nextVitals, ...nextTs`.
- **Next.js 16 async params**: dynamic route params are `Promise<{ id: string }>`, consumed with `use(params)`.
- **CORS**: restricted to `http://localhost:3000` only.
- **pnpm `--ignore-scripts`** in Docker builds — skips postinstall hooks. If adding a dep needing postinstall, remove the flag.
- **No tests yet**: `pytest` is configured but `backend/tests/` is empty.
- **Seed is idempotent**: checks `≥2 NNA` before inserting.
- **Empty dirs**: `shared/` (intended for shared types) and `backend/app/instruments/` (stale pycache only). Don't add files without instruction.
- **No separate typecheck** command in frontend. `pnpm build` includes TS type-checking as part of the Next.js build.
- **`opencode.json`** is in `.gitignore` — local-only config, never committed.
- **Delegation**: `frontend/AGENTS.md` delegates to this root file with `@../AGENTS.md`. Update only this root file.
- **No `dev.ps1` needed**: services run via `docker compose up -d --build`. For quick frontend iteration, `cd frontend && pnpm dev` against the Docker backend.
