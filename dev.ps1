param(
  [switch]$NoDb,
  [switch]$NoBackend,
  [switch]$NoFrontend
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"

if (-not $NoDb) {
  Write-Host "[db] checking PostgreSQL service..." -ForegroundColor Cyan
  $pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
  if (-not $pgService) {
    Write-Host "[db] ERROR: PostgreSQL service not found. Is PostgreSQL installed?" -ForegroundColor Red
  } elseif ($pgService.Status -ne "Running") {
    Write-Host "[db] PostgreSQL service is stopped. Starting..." -ForegroundColor Yellow
    try {
      Start-Service -Name $pgService.Name
      Write-Host "[db] PostgreSQL started on localhost:5432" -ForegroundColor Green
    } catch {
      Write-Host "[db] ERROR: Could not start PostgreSQL. Run as admin or start it manually via services.msc" -ForegroundColor Red
    }
  } else {
    Write-Host "[db] PostgreSQL already running on localhost:5432" -ForegroundColor Green
  }
}

if (-not $NoBackend) {
  Write-Host "[backend] starting locally..." -ForegroundColor Cyan
  $venvActivate = Join-Path $backendDir ".venv\Scripts\activate"
  if (-not (Test-Path $venvActivate)) {
    Write-Host "[backend] .venv not found. Creating virtual environment..." -ForegroundColor Yellow
    try {
      & python -m venv "$backendDir\.venv"
      Write-Host "[backend] .venv created" -ForegroundColor Green
    } catch {
      Write-Host "[backend] ERROR: Could not create .venv. Is Python installed?" -ForegroundColor Red
      return
    }
    Write-Host "[backend] installing dependencies..." -ForegroundColor Yellow
    & "$backendDir\.venv\Scripts\python.exe" -m pip install -r "$backendDir\requirements.txt"
    if ($LASTEXITCODE -ne 0) {
      Write-Host "[backend] ERROR: pip install failed." -ForegroundColor Red
      return
    }
    Write-Host "[backend] dependencies installed" -ForegroundColor Green
  }
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendDir'; .venv\Scripts\activate; uvicorn main:app --reload --port 8000" -WindowStyle Normal
  Write-Host "[backend] uvicorn starting on http://localhost:8000" -ForegroundColor Green
}

if (-not $NoFrontend) {
  Write-Host "[frontend] starting locally..." -ForegroundColor Cyan
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendDir'; pnpm dev" -WindowStyle Normal
  Write-Host "[frontend] Next.js starting on http://localhost:3000" -ForegroundColor Green
}
