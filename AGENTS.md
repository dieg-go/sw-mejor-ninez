# AGENTS.md

## Project

**SW Mejor Niñez** — monorepo: Next.js 16 frontend + FastAPI backend + PostgreSQL 17.

### Purpose
This project is a **Decision Support System (DSS)** developed for the Chilean National Specialized Protection Service for Children and Adolescents ("Mejor Niñez"). Its primary goal is to **automate the classification and prioritization of cases** to optimize the decision-making process of the psychosocial team in charge of protecting highly vulnerable children and adolescents (NNA - Niños, Niñas y Adolescentes).

Currently, the service faces severe saturation and delays due to the fragmentation of files in unstructured formats (PDFs/paper) and the multidimensional complexity of each case.

**Key Objectives & Features:**
- **Digitization & Centralization**: Transforms unstructured legal, clinical, and family backgrounds into a highly normalized relational database.
- **Transparent Risk Classification**: Utilizes a Business Rules Engine (Rule-Based System / Decision Trees) rather than opaque "black-box" AI algorithms. It evaluates a feature vector (e.g., age, legal cause severity, psychological instrument scores like PMF, E2P, NCFAS, history of substance abuse) to generate an automated, transparent, and legally auditable risk classification (Low, Medium, High).
- **Team Optimization**: Descongests the psychosocial team from manual, repetitive administrative tasks, giving them the time and data support needed to focus on direct, timely interventions to safeguard the well-being of the minors.

## Quickstart

```bash
# Database (port 5433)
docker compose up -d

# Seed data (optional — creates 3 NNA, 5 adultos, ~40 child records)
cd backend
python -m venv .venv
# Activate: .venv\Scripts\activate (Windows) or source .venv/bin/activate (Unix)
pip install -r requirements.txt
python seed.py

# Backend (localhost:8000)
uvicorn main:app --reload

# Frontend (localhost:3000)
cd frontend
pnpm install
pnpm dev
```

Alternative: use `dev.ps1` (Windows PowerShell) which starts DB, backend, and frontend in separate windows. Parameters: `-NoDb`, `-NoBackend`, `-NoFrontend`.

## Commands

| What | Command | Working dir |
|------|---------|-------------|
| Dev server | `pnpm dev` | `frontend/` |
| Production build | `pnpm build` | `frontend/` |
| Lint | `eslint` (via `pnpm lint`) | `frontend/` |
| Backend dev | `uvicorn main:app --reload` | `backend/` |
| Backend tests | `pytest` | `backend/` |
| Seed database | `python seed.py` | `backend/` |
| Create migration | `python -m alembic revision --autogenerate -m "description"` | `backend/` |
| Apply migrations | `python -m alembic upgrade head` | `backend/` |

## Tech Stack

### Frontend
- **Next.js 16.2.6** (App Router, TypeScript)
- **React 19.2.4**
- **Tailwind CSS v4** — uses `@import "tailwindcss"` (not `@tailwind base/components/utilities`). Theme via CSS `@theme inline {}`.
- **shadcn/ui** (radix-nova style via `npx shadcn@next add`). 20+ components installed. Default UI toolkit — use these over raw HTML elements.
- **next-themes** for class-based dark/light mode toggle
- **pnpm** as package manager (v10+); `pnpm-workspace.yaml` exists but no workspace packages defined yet
- **ESLint 9** flat config (`eslint.config.mjs`)
- **Geist**, **Geist Mono**, and **Inter** fonts via `next/font/google`
- Additional deps: `date-fns`, `lucide-react`, `react-day-picker`, `clsx` + `tailwind-merge`

### Backend
- **FastAPI 0.115.6** with async
- **SQLModel 0.0.22** — async engine via `asyncpg`, sync via `psycopg2`
- **Pydantic v2** (2.10.4) + `pydantic-settings` for config from `.env`
- **Alembic 1.14.1** configured with initial migration in `migrations/versions/`
- **pytest 8.3.4** + `pytest-asyncio 0.25.0` (no test files yet — `tests/__init__.py` is empty)

### Infrastructure
- **PostgreSQL 17** (Alpine) via Docker Compose
- Database: `sw_mejor_ninez`, user/pass: `postgres/postgres`, port **5433** (mapped from 5432)
- Volume: `pgdata` for persistent data

## Code Organization

```
backend/
├── main.py              # Re-export: from app.main import app
├── requirements.txt
├── .env                 # Not committed; contains DATABASE_URL
├── seed.py              # Creates 3 NNA, 5 adultos, ~40 child records
├── alembic.ini
├── migrations/
│   ├── env.py
│   └── versions/
│       └── 0b733fafb9a6_initial.py  # Uses SQLModel.metadata.create_all()
└── app/
    ├── __init__.py
    ├── main.py          # FastAPI app, CORS, registers all routers, /health
    ├── api/
    │   ├── __init__.py  # Empty
    │   └── routes/
    │       ├── __init__.py    # Imports all routers into `routers` list
    │       ├── nna.py         # NNA CRUD
    │       ├── adultos.py     # AdultoSignificativo CRUD + antecedentes penales
    │       ├── children.py    # HistorialConsumo, Discapacidad (NNA + Adulto), AntecedentesPenales item
    │       ├── ingreso.py     # AntecedenteIngreso, Causal, DerechoVulnerado, DocumentacionIngreso
    │       ├── instrumentos.py # E2P, PMF, NCFAS (NNA + Adulto routes)
    │       ├── antecedentes.py # AntecedenteSalud, Escolar, Familiar, EntornoFamiliar
    │       └── historial.py   # HistorialRedProteccional, GestionBusquedaFamiliar, InformeTribunal
    ├── models/           # SQLModel models (21 tables, split by domain)
    │   ├── __init__.py   # Re-exports all models + __all__
    │   ├── nna.py        # NNA (core child entity)
    │   ├── adulto.py     # AdultoSignificativo, AntecedentesPenales
    │   ├── consumo.py    # HistorialConsumoNNA, HistorialConsumoAdulto
    │   ├── discapacidad.py # DiscapacidadNNA, DiscapacidadAdulto
    │   ├── ingreso.py    # AntecedenteIngreso, DocumentacionIngreso, RegistroCausalIngreso, RegistroDerechoVulnerado
    │   ├── historial.py  # HistorialRedProteccional, GestionBusquedaFamiliar, InformeTribunal
    │   ├── instrumentos.py # E2P, PMF, NCFAS (dual FK: id_nna + id_adulto_significativo)
    │   └── antecedentes.py # AntecedenteSalud, AntecedenteEscolar, AntecedenteFamiliar, EntornoFamiliar
    ├── schemas/          # Pydantic v2 schemas (separate from models)
    │   ├── __init__.py   # Re-exports all schemas
    │   ├── nna.py        # NNARead (from_attributes), NNACreate, NNAUpdate
    │   ├── adulto.py     # AdultoSignificativo Read/Create/Update, AntecedentePenal Read/Create/Update
    │   ├── consumo.py
    │   ├── discapacidad.py
    │   ├── ingreso.py
    │   ├── historial.py
    │   ├── instrumentos.py # Unified InstrumentoCreate/Read/Update for E2P/PMF/NCFAS
    │   └── antecedentes.py
    ├── services/
    │   └── __init__.py   # NNAService, AdultoService + generic child helpers
    └── core/
        ├── __init__.py   # Re-exports `settings` from config
        ├── config.py     # Settings class (pydantic-settings), loads .env
        └── database.py   # Async engine, sessionmaker, get_db()

frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx   # Root layout (header nav, ThemeProvider, Geist+Inter fonts)
│   │   ├── page.tsx     # Home page (links to /nna)
│   │   ├── globals.css  # Tailwind v4 + shadcn + tw-animate-css imports, theme vars
│   │   ├── nna/
│   │   │   ├── page.tsx      # NNA list (client component, search, shadcn Table)
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx  # NNA detail (tabs: ingreso, consumo, discapacidades,
│   │   │   │                  #   instrumentos, historial, gestion, informes,
│   │   │   │                  #   salud, escolar, familiar)
│   │   │   └── nuevo/
│   │   │       └── page.tsx  # Create NNA form (shadcn Form, DatePicker)
│   │   └── adultos/
│   │       ├── page.tsx      # Adulto list (client component, search)
│   │       └── [id]/
│   │           └── page.tsx  # Adulto detail (tabs: consumo, discapacidades, penales, instrumentos)
│   ├── lib/
│   │   ├── api.ts        # Centralized API client with all endpoints + TypeScript types
│   │   └── utils.ts      # cn() helper (clsx + tailwind-merge)
│   └── components/
│       ├── theme-provider.tsx  # next-themes wrapper
│       ├── theme-toggle.tsx
│       └── ui/           # 20 shadcn/ui components
├── public/
├── package.json
├── tsconfig.json         # Path alias @/* → ./src/*
├── eslint.config.mjs
├── next.config.ts
└── postcss.config.mjs    # @tailwindcss/postcss plugin
```

## Architecture & Patterns

### Backend

**Three-layer architecture**: Routes → Services → Models. Schemas are Pydantic v2 classes with `ConfigDict(from_attributes=True)` for Read types (ORM mode).

**Route pattern**: Each domain file defines multiple `APIRouter`s:
- **Parent routes** (e.g., `GET /api/nna`, `POST /api/nna`) — list/create
- **Nested child routes** (e.g., `GET /api/nna/{id_nna}/historial-consumo`) — list/create children
- **Item routes** (e.g., `GET /api/historial-consumo-nna/{id_consumo}`) — get/update by PK

All routes call service functions that follow the pattern `service = SomeService(db)`, then `await service.list(...)` / `await service.create(...)`, etc.

**Service pattern**:
- `NNAService` and `AdultoService` are classes (instantiated per-request with an `AsyncSession`)
- Child entities use **generic stateless functions**: `create_nna_child()`, `list_nna_children()`, `get_nna_child()`, `update_child()`, and variants for `adulto`, `ingreso`, and `entorno` parents
- All service functions accept a `model` class as first argument and raw `dict` for data
- Updates use `setattr()` then `session.add()` + `commit()` + `refresh()`

**Schema pattern**: Read schemas use `ConfigDict(from_attributes=True)`. Create schemas inherit from a Base. Update schemas have all `Optional` fields (allowing partial updates via `model_dump(exclude_unset=True)`). There is a special case: `NNAUpdate` does NOT inherit from `NNABase` — it intentionally duplicates fields.

**Config**: `Settings` class uses `pydantic-settings` with `env_file = ".env"`. DB connection is built from individual fields (`DB_HOST`, `DB_PORT`, etc.), not a single URL. Properties `database_url` (async) and `database_url_sync` are derived. `extra="allow"` permits extra env vars.

**Models**: 21 SQLModel classes with UUID PKs (`sa_type=UUID(as_uuid=True)`, `default_factory=uuid.uuid4`). `TYPE_CHECKING` guards on relationship imports to avoid circular imports. Relationships use `back_populates` consistently.

**Instrumentos (E2P, PMF, NCFAS)**: Each has two foreign keys: `id_nna` → NNA and `id_adulto_significativo` → AdultoSignificativo. Relationships use explicit `sa_relationship_kwargs={"foreign_keys": "..."}` to disambiguate.

**Router registration**: `app/api/routes/__init__.py` imports all routers into a flat `routers` list. `app/main.py` iterates it with `app.include_router(router)`.

### Frontend

**Page pattern**: All data pages are **client components** (`"use client"`). They use `useEffect` + `useState` for data fetching via the centralized `api` object from `@/lib/api`. Loading/error/empty states are handled explicitly.

**API client** (`src/lib/api.ts`):
- Single `api` export object with nested method groups (e.g., `api.nna.list()`, `api.adultos.get(id)`)
- All methods go through a generic `request<T>()` function that sets `Content-Type: application/json`
- Base URL hardcoded: `http://localhost:8000/api`
- Contains full TypeScript interfaces for every entity (not shared with backend — hand-maintained)

**NNA detail page** (`/nna/[id]/page.tsx`): Monolithic file (~880 lines). Contains a main page component + 10+ tab sub-components defined in the same file. Tabs: Ingreso, Consumo, Discapacidades, Instrumentos, Historial, Gestión, Informes, Salud, Escolar, Familiar. Some tabs fetch child data lazily.

**Adulto detail page** (`/adultos/[id]/page.tsx`): Similar pattern, 4 tabs: Consumo, Discapacidades, Antec. Penales, Instrumentos.

**Create forms**: Only `/nna/nuevo` exists. Uses shadcn Form primitives (`Field`, `FieldLabel`, `FieldGroup`, `FieldError`) + `Calendar`/`Popover` for date picker. Client-side state, calls API on submit, redirects on success.

**No `/adultos/nuevo` page yet** — creation form does not exist.

**Dark mode**: Uses `next-themes` with `attribute="class"` — the `.dark` class is toggled on `<html>`. The `ThemeProvider` wraps the body. `ThemeToggle` component provides the toggle button. CSS uses `@custom-variant dark (&:is(.dark *))` selector.

**shadcn/ui components** (20 installed): alert, badge, button, calendar, card, dropdown-menu, empty, field, input, label, navigation-menu, popover, select, separator, skeleton, spinner, table, tabs, toggle, theme-provider, theme-toggle.

**Routing**: All navigation via `<Link href="...">`, no server-side redirects. Detail pages use `params: Promise<{ id: string }>` (Next.js 16 async params pattern).

**Navigation**: Header with `NavigationMenu` (Home, NNA, Adultos links) + ThemeToggle. Max width 5xl on all pages.

## Gotchas

1. **DB port is 5433, not 5432** — Docker maps 5433→5432. Both `alembic.ini` and `Settings` defaults use 5433. If you can't connect, check the port first.

2. **Tailwind CSS v4, not v3** — uses `@import "tailwindcss"` (not `@tailwind base`). Theme via `@theme inline {}` in CSS. No `tailwind.config.js`. PostCSS uses `@tailwindcss/postcss`.

3. **ESLint 9 flat config** — `eslint.config.mjs` with `defineConfig`, not `.eslintrc.*`. Extends use spread: `...nextVitals, ...nextTs`.

4. **Backend `.env` location** — lives in `backend/`, not repo root. Run `uvicorn` from `backend/` so pydantic-settings finds it.

5. **Database URL format** — `database_url` returns `postgresql+asyncpg://…` (async). `database_url_sync` returns `postgresql+psycopg2://…` (Alembic). Don't mix.

6. **Alembic** — use `python -m alembic` (not bare `alembic`). `--autogenerate` needs running PostgreSQL. The initial migration uses `SQLModel.metadata.create_all()` / `drop_all()` in `upgrade()`/`downgrade()`.

7. **UUID primary keys** — all tables use `uuid.UUID` with `default_factory=uuid.uuid4`. Omit PK when creating. API routes use `uuid.UUID` for path params: `/nna/{id_nna}` with `id_nna: uuid.UUID`.

8. **`tiene_antecedentes_penales`** on `AdultoSignificativo` is denormalized. Must update it when adding/removing `AntecedentesPenales` records.

9. **NNAUpdate schema** intentionally duplicates all fields (doesn't inherit from `NNABase`) — this is so `model_dump(exclude_unset=True)` works correctly for partial updates without accidentally including default values from a base class.

10. **Instrumentos dual FK** — E2P, PMF, NCFAS tables have BOTH `id_nna` and `id_adulto_significativo`. Routes exist for both `/nna/{id}/e2p` and `/adultos/{id}/e2p`. When creating, you pass the parent's ID based on which route you hit.

11. **No tests exist** — `backend/tests/` is empty. The `pytest` command exists but there's nothing to run.

12. **No `/adultos/nuevo` page** in frontend — the "Nuevo Adulto" button links to a non-existent route.

13. **Frontend detail pages are monolithic** — e.g., `nna/[id]/page.tsx` is ~880 lines with all tab components in one file. Tab components are not extracted to separate files, and they use shared `TabSpinner`/`InfoRow` helpers defined at file scope.

14. **All frontend data pages are client components** — there's no server-side data fetching. Every page uses `useEffect` + `useState` pattern.

15. **CORS restricted** to `http://localhost:3000` only.

16. **`pnpm workspaces`** file exists but has no packages defined — `pnpm install` works directly in `frontend/`.

17. **`__init__.py` imports in `app/core/`** — `app/core/__init__.py` does `from app.core.config import settings`, importing from a sibling. This works because `settings` is instantiated at module level first, but be careful adding new circular imports.

18. **Next.js 16 async params** — dynamic route params are `Promise<{ id: string }>`, consumed with `use(params)`.

19. **`dev.ps1` script** — Windows-only PowerShell launcher. Opens separate windows for DB, backend, and frontend.
