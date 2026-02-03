#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Sets up the development environment for the Spelling Word Practice Game.
.DESCRIPTION
    Installs Node.js via winget (if not already installed), verifies npm,
    and runs npm install to pull project dependencies.
#>

$ErrorActionPreference = "Stop"

Write-Host "`n=== Spelling Word Practice Game - Environment Setup ===`n" -ForegroundColor Cyan

# --- Node.js ---
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
    $nodeVersion = & node --version
    Write-Host "[OK] Node.js already installed: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "[..] Installing Node.js via winget..." -ForegroundColor Yellow
    winget install --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to install Node.js. Install manually from https://nodejs.org" -ForegroundColor Red
        exit 1
    }

    # Refresh PATH so node/npm are available in this session
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path", "User")

    $nodeVersion = & node --version
    Write-Host "[OK] Node.js installed: $nodeVersion" -ForegroundColor Green
}

# --- npm ---
$npm = Get-Command npm -ErrorAction SilentlyContinue
if ($npm) {
    $npmVersion = & npm --version
    Write-Host "[OK] npm available: v$npmVersion" -ForegroundColor Green
} else {
    Write-Host "[ERROR] npm not found. Restart your terminal and try again." -ForegroundColor Red
    exit 1
}

# --- Project dependencies ---
$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$packageJson = Join-Path $projectDir "package.json"

if (-not (Test-Path $packageJson)) {
    Write-Host "[ERROR] package.json not found in $projectDir" -ForegroundColor Red
    exit 1
}

$nodeModules = Join-Path $projectDir "node_modules"
if (Test-Path $nodeModules) {
    Write-Host "[OK] node_modules already exists, running npm install to ensure up to date..." -ForegroundColor Green
} else {
    Write-Host "[..] Installing project dependencies..." -ForegroundColor Yellow
}

Push-Location $projectDir
try {
    & npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] npm install failed." -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Dependencies installed." -ForegroundColor Green
} finally {
    Pop-Location
}

# --- Done ---
Write-Host "`n=== Setup Complete ===" -ForegroundColor Cyan
Write-Host "To start the app:" -ForegroundColor White
Write-Host "  cd $projectDir" -ForegroundColor White
Write-Host "  npm start" -ForegroundColor White
Write-Host "Then open http://localhost:3000`n" -ForegroundColor White
