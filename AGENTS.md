# AGENTS.md

## Project

**SW Mejor Niñez** — monorepo: Next.js 16 frontend + FastAPI backend + PostgreSQL 17.

## Quickstart

```bash
# Database
docker compose up -d

# Backend (localhost:8000)
cd backend
python -m venv .venv
# Activate: .venv\Scripts\activate (Windows) or source .venv/bin/activate (Unix)
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend (localhost:3000)
cd frontend
pnpm install
pnpm dev
```

## Commands

| What | Command | Working dir |
|------|---------|-------------|
| Dev server | `pnpm dev` | `frontend/` |
| Production build | `pnpm build` | `frontend/` |
| Lint | `pnpm lint` | `frontend/` |
| Backend dev | `uvicorn main:app --reload` | `backend/` |
| Backend tests | `pytest` | `backend/` |
| Create migration | `python -m alembic revision --autogenerate -m "description"` | `backend/` |
| Apply migrations | `python -m alembic upgrade head` | `backend/` |

## Tech Stack

### Frontend
- **Next.js 16.2.6** (App Router, TypeScript)
- **React 19.2.4**
- **Tailwind CSS v4** — uses `@tailwindcss/postcss` (not the v3 `tailwindcss`/`autoprefixer` plugin pair)
- **pnpm** as package manager (v10+); `pnpm-workspace.yaml` exists but no workspace packages defined yet
- **ESLint 9** flat config (`eslint.config.mjs`), not `.eslintrc.*`
- **Geist** and **Geist Mono** fonts via `next/font/google`

### Backend
- **FastAPI 0.115.6** with async
- **SQLAlchemy 2.0.36** — async engine via `asyncpg`, sync via `psycopg2`
- **Pydantic v2** (2.10.4) + `pydantic-settings` for config from `.env`
- **Alembic 1.14.1** for migrations (listed in requirements but not yet configured — no `alembic.ini` or `migrations/` dir)
- **pytest 8.3.4** + `pytest-asyncio 0.25.0`

### Infrastructure
- **PostgreSQL 17** (Alpine) via Docker Compose
- Database: `sw_mejor_ninez`, user/pass: `postgres/postgres`, port `5432`

## Code Organization

```
backend/
├── main.py              # Re-export: from app.main import app
├── requirements.txt
├── .env                 # Not committed; contains DATABASE_URL
└── app/
    ├── main.py          # FastAPI app creation, CORS, /health endpoint
    ├── api/             # Route handlers (empty scaffolding)
    ├── models/          # SQLModel models (21 tables, split by domain)
    │   ├── __init__.py       # Re-exports all models
    │   ├── nna.py            # NNA (core child entity)
    │   ├── adulto.py         # AdultoSignificativo, AntecedentesPenales
    │   ├── consumo.py        # HistorialConsumoNNA, HistorialConsumoAdulto
    │   ├── discapacidad.py   # DiscapacidadNNA, DiscapacidadAdulto
    │   ├── ingreso.py        # AntecedenteIngreso, DocumentacionIngreso, RegistroCausalIngreso, RegistroDerechoVulnerado
    │   ├── historial.py      # HistorialRedProteccional, GestionBusquedaFamiliar, InformeTribunal
    │   ├── instrumentos.py   # E2P, PMF, NCFAS
    │   └── antecedentes.py   # AntecedenteSalud, AntecedenteEscolar, AntecedenteFamiliar, EntornoFamiliar
    ├── services/        # Business logic (empty scaffolding)
    └── core/
        ├── config.py    # Settings class (pydantic-settings) + singleton
        └── database.py  # Async engine, sessionmaker, get_db()

frontend/
├── src/app/
│   ├── layout.tsx       # Root layout (Geist fonts, dark mode support)
│   ├── page.tsx         # Default Next.js home page
│   └── globals.css      # Tailwind v4 imports + theme variables
├── package.json
├── tsconfig.json        # Path alias @/* → ./src/*
├── eslint.config.mjs    # Flat config with next/core-web-vitals + typescript
├── next.config.ts
└── postcss.config.mjs   # @tailwindcss/postcss plugin
```

## Architecture & Patterns

### Backend
- **Config**: `Settings` (in `app/core/config.py`) uses `pydantic-settings` to load from `.env`. The singleton `settings` is re-exported by `app/core/__init__.py`. `extra="allow"` in model_config so the `DATABASE_URL` in `.env` doesn't cause a validation error.
- **Database**: Async-only SQLAlchemy setup via SQLModel. `database_url` is `postgresql+asyncpg://…`. `get_db()` is a FastAPI dependency generator yielding `AsyncSession`. There is also a sync URL (`database_url_sync`) for Alembic.
- **Models**: 21 SQLModel classes split across 8 files in `app/models/`, organized by domain. All use UUID primary keys (`sa_type=UUID(as_uuid=True)` with `default_factory=uuid.uuid4`). Relationships are fully wired with `back_populates`. Spanish attribute names map directly to Spanish column names.
- **Entry point**: `backend/main.py` is a thin re-export (`from app.main import app`). The real app lives in `app/main.py`. Both `uvicorn main:app` and `uvicorn app.main:app` work.
- **CORS**: configured for `http://localhost:3000` only.
- **No API routes yet** — only `/health` exists in `app/main.py`.

### Frontend
- **Tailwind v4** uses the `@import "tailwindcss"` CSS directive (not `@tailwind base/components/utilities`). Theme is configured in CSS via `@theme inline {}` and CSS custom properties.
- **Dark mode** uses `prefers-color-scheme` media query in globals.css; no class-based toggle yet.
- **Path alias**: `@/` maps to `src/` — import as `@/app/...`, `@/components/...`, etc.
- **No components, hooks, or utilities yet** — project is in early scaffolding phase.
- **ESLint** is flat config only. To add custom rules, modify `eslint.config.mjs` using the `defineConfig` pattern.

## Gotchas

1. **Tailwind CSS v4, not v3** — many online examples use v3 syntax (`@tailwind base;`, `tailwind.config.js`). This project uses `@import "tailwindcss"` in CSS and `@tailwindcss/postcss` in PostCSS config. Theme is defined in CSS via `@theme inline`, not in a JS config file.

2. **ESLint flat config** — not `.eslintrc.json` or `.eslintrc.js`. Uses `eslint/config`'s `defineConfig` and `globalIgnores` helpers. Extends are flattenable arrays (`...nextVitals, ...nextTs`).

3. **Backend `.env` location** — the `.env` file lives in `backend/`, not at the repo root. When running `uvicorn main:app`, you must run it from the `backend/` directory so pydantic-settings can find it.

4. **Database URL format** — the `database_url` property returns `postgresql+asyncpg://…` (async driver). Alembic needs the sync version (`database_url_sync`: `postgresql+psycopg2://…`). Don't mix them up.

5. **pnpm workspaces** — `pnpm-workspace.yaml` exists but no packages are defined in it. `pnpm install` works in `frontend/` directly. This may change if the monorepo grows.

6. **CORS restricted** — only `http://localhost:3000` is allowed. If you change the frontend port, update `main.py`.

7. **`__init__.py` imports in `app/core/`** — `app/core/__init__.py` does `from app.core.config import settings`, which imports from its sibling module. This works because `settings` is instantiated at module level before the import chain resolves, but be careful adding imports that could create circular dependencies between core modules.

8. **UUID primary keys** — all tables use `uuid.UUID` with `default_factory=uuid.uuid4`. When creating records, omit the PK and let the factory generate it. In API routes, use `uuid.UUID` for path parameters: `/nna/{id_nna}` with `id_nna: uuid.UUID`.

9. **`tiene_antecedentes_penales`** on `AdultoSignificativo` is a denormalized boolean that duplicates the existence check on `AntecedentesPenales`. Keep it updated when adding/removing criminal records.

10. **Alembic** — use `python -m alembic` (not bare `alembic`, it's not on PATH). `--autogenerate` requires a running PostgreSQL (Docker), otherwise just create blank revisions. The initial migration uses `SQLModel.metadata.create_all()` / `drop_all()` rather than hand-written DDL.
