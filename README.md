# SW Mejor Niñez

Decision Support System for Chilean child protective services.
Monorepo: Next.js 16 frontend + FastAPI backend + PostgreSQL 17.

## Quickstart

```bash
docker compose up -d --build    # http://localhost:3000
```

This starts all three services (db, backend, frontend), runs migrations, and seeds sample data. Access the app at `http://localhost:3000` and the API at `http://localhost:8000`.

Default admin: `admin@mejorninez.cl` / `admin123`

## Structure

```
frontend/    Next.js 16.2 (App Router, TypeScript, Tailwind CSS v4, shadcn/ui)
backend/     FastAPI 0.115 (async, SQLModel, Pydantic v2, Alembic)
```

## Prerequisites

- Docker (for full-stack development)
- Node.js 20+ / pnpm 10+ (for local frontend development)
- Python 3.12+ (for local backend development)

## Commands

| What | Command | Working dir |
|------|---------|-------------|
| Build | `pnpm build` | `frontend/` |
| Lint | `pnpm lint` | `frontend/` |
| Backend tests | `pytest` | `backend/` |
| Seed DB | `python seed.py` | `backend/` |
| Create migration | `python -m alembic revision --autogenerate -m "desc"` | `backend/` |
| Apply migrations | `python -m alembic upgrade head` | `backend/` |

## Local development (faster iteration)

Run just the database in Docker, then backend and frontend locally with hot-reload:

```bash
# Terminal 1: DB only
docker compose up -d db

# Terminal 2: Backend (requires Python venv + dependencies)
cd backend
uvicorn main:app --reload    # http://localhost:8000

# Terminal 3: Frontend
cd frontend
pnpm install
pnpm dev                     # http://localhost:3000
```

Or use `dev.ps1` (Windows) to launch DB + backend + frontend in separate windows.

## Tech Stack

- **Frontend**: Next.js 16.2, React 19, Tailwind CSS v4, shadcn/ui, next-themes, pnpm
- **Backend**: FastAPI 0.115, SQLModel 0.0.22, Pydantic v2, Alembic 1.14
- **DB**: PostgreSQL 17 (Alpine), exposed on port **5433** locally
- **Auth**: JWT-based (bcrypt + python-jose), 8-hour token expiry
- **Infra**: Docker Compose (3 services: db, backend, frontend)
