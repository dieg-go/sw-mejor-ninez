# SW Mejor Niñez

Monorepo for SW Mejor Niñez — Next.js frontend + FastAPI backend + PostgreSQL.

## Structure

```
frontend/    Next.js 16 (App Router, TypeScript, Tailwind)
backend/     FastAPI (Python, SQLAlchemy, asyncpg)
```

## Getting started

### Prerequisites
- Node.js 20+
- pnpm 10+
- Python 3.12+
- Docker (for PostgreSQL)

### Database

```bash
docker compose up -d
```

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

The API runs at `http://localhost:8000`, the frontend at `http://localhost:3000`.
