Write-Host "======================================" -ForegroundColor Cyan
Write-Host " Starting KamiCode (Without Docker)   " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# 1. Start Convex Local Backend
Write-Host "`n[1/3] Starting Convex Local DB..." -ForegroundColor Yellow
Start-Process -FilePath "npx" -ArgumentList "convex dev" -WorkingDirectory "$PSScriptRoot\frontend" -NoNewWindow:$false

Start-Sleep -Seconds 3

# 2. Start FastAPI Backend
Write-Host "`n[2/3] Starting FastAPI Backend on http://localhost:8000..." -ForegroundColor Yellow
Start-Process -FilePath "$PSScriptRoot\backend\venv\Scripts\python.exe" -ArgumentList "-m uvicorn main:app --reload --port 8000" -WorkingDirectory "$PSScriptRoot\backend" -NoNewWindow:$false

Start-Sleep -Seconds 2

# 3. Start Next.js Frontend
Write-Host "`n[3/3] Starting Next.js Frontend on http://localhost:3000..." -ForegroundColor Yellow
Start-Process -FilePath "npm" -ArgumentList "run dev" -WorkingDirectory "$PSScriptRoot\frontend" -NoNewWindow:$false

Write-Host "`nAll services launched in separate windows!" -ForegroundColor Green
Write-Host "  - Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  - Backend API: http://localhost:8000 (Swagger docs: http://localhost:8000/docs)" -ForegroundColor Cyan
Write-Host "  - Convex DB: http://127.0.0.1:3210" -ForegroundColor Cyan
