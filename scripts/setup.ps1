Write-Host "🦞 Initializing CynicalClaw on Windows..." -ForegroundColor Cyan

if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js not found. Install it from nodejs.org" -ForegroundColor Red
    exit 1
}

New-Item -ItemType Directory -Force -Path "moltbook/sessions" | Out-Null
New-Item -ItemType Directory -Force -Path "logs" | Out-Null
New-Item -ItemType File -Force -Path "moltbook/.gitkeep" | Out-Null

Write-Host "Installing Gateway dependencies..." -ForegroundColor Yellow
Set-Location gateway
npm install
Set-Location ..

Write-Host "Installing Web UI dependencies..." -ForegroundColor Yellow
Set-Location web-ui
npm install
Set-Location ..

if (!(Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "⚠️  Created .env file. Please edit it and add your API keys!" -ForegroundColor Yellow
}

Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Edit .env file and add GROQ_API_KEY"
Write-Host "2. Start Ollama: ollama serve"
Write-Host "3. npm run dev"
