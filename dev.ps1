param(
  [switch]$NoDb,
  [switch]$NoBackend,
  [switch]$NoFrontend
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"

if (-not $NoDb) {
  Write-Host "[db] starting..." -ForegroundColor Cyan
  docker compose up -d
  Write-Host "[db] running on localhost:5433" -ForegroundColor Green
}

if (-not $NoBackend) {
  Write-Host "[backend] starting..." -ForegroundColor Cyan
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendDir'; .venv\Scripts\activate; uvicorn main:app --reload" -WindowStyle Normal
}

if (-not $NoFrontend) {
  Write-Host "[frontend] starting..." -ForegroundColor Cyan
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendDir'; pnpm dev" -WindowStyle Normal
}
