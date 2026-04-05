# Smart Health Kiosk - Install all dependencies
# Run: .\install-all.cmd   (or: powershell -ExecutionPolicy Bypass -File .\install-all.ps1)
#
# REQUIRED: Node.js 18+ (https://nodejs.org - get LTS). After installing Node, close and
#           reopen your terminal (or Cursor), then run this script.
# Backend seed also needs MongoDB running (or Atlas URI in backend\.env).
# Optional: Python 3.9+ (pi-firmware), Flutter (mobile_app).

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

# Refresh PATH so newly installed Node.js is visible
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

# If Node is not in PATH, try to find it in Downloads (e.g. extracted zip or folder named node*)
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    $downloads = [Environment]::GetFolderPath("UserProfile") + "\Downloads"
    $nodeDirs = Get-ChildItem -Path $downloads -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match "^node" }
    foreach ($d in $nodeDirs) {
        $nodeExe = Join-Path $d.FullName "node.exe"
        if (Test-Path $nodeExe) {
            $env:Path = $d.FullName + ";" + $env:Path
            break
        }
    }
}

Write-Host "=== Checking tools ===" -ForegroundColor Cyan
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js not found." -ForegroundColor Red
    Write-Host "  - If you have the INSTALLER (.msi) in Downloads: run it, then run this script again." -ForegroundColor Yellow
    Write-Host "  - If you have an EXTRACTED Node folder in Downloads: name it e.g. 'node' or 'node-v20...' so it contains node.exe." -ForegroundColor Yellow
    exit 1
}
Write-Host "Node: $(node -v)  npm: $(npm -v)" -ForegroundColor Green

Write-Host "`n=== Backend ===" -ForegroundColor Cyan
Set-Location $root\backend
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run seed
if ($LASTEXITCODE -ne 0) { Write-Host "Seed failed (e.g. MongoDB not running). Start MongoDB and run: cd backend && npm run seed" -ForegroundColor Yellow }

Write-Host "`n=== Super Admin Dashboard ===" -ForegroundColor Cyan
Set-Location $root\super-admin-dashboard
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n=== Hospital Dashboard ===" -ForegroundColor Cyan
Set-Location $root\hospital-dashboard
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# Optional: Pi firmware (Python). On Windows use requirements-windows.txt (no Pi-only lgpio).
if (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host "`n=== Pi Firmware (Python) ===" -ForegroundColor Cyan
    Set-Location $root\pi-firmware
    $reqFile = if ($env:OS -match "Windows") { "requirements-windows.txt" } else { "requirements.txt" }
    python -m pip install -r $reqFile --quiet
    if ($LASTEXITCODE -ne 0) { Write-Host "Pi firmware pip install had issues (optional)." -ForegroundColor Yellow }
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
    Write-Host "`n=== Pi Firmware (Python via py) ===" -ForegroundColor Cyan
    Set-Location $root\pi-firmware
    $reqFile = if ($env:OS -match "Windows") { "requirements-windows.txt" } else { "requirements.txt" }
    py -3 -m pip install -r $reqFile --quiet
    if ($LASTEXITCODE -ne 0) { Write-Host "Pi firmware pip install had issues (optional)." -ForegroundColor Yellow }
} else {
    Write-Host "`n=== Pi Firmware skipped (Python not in PATH) ===" -ForegroundColor Yellow
}

# Optional: Flutter
if (Get-Command flutter -ErrorAction SilentlyContinue) {
    Write-Host "`n=== Mobile App (Flutter) ===" -ForegroundColor Cyan
    Set-Location $root\mobile_app
    flutter pub get
    if ($LASTEXITCODE -ne 0) { Write-Host "Flutter pub get had issues." -ForegroundColor Yellow }
} else {
    Write-Host "`n=== Mobile App skipped (Flutter not in PATH). Install from https://docs.flutter.dev/get-started/install/windows ===" -ForegroundColor Yellow
}

Set-Location $root
Write-Host "`n=== Done ===" -ForegroundColor Green
Write-Host "Start backend:    cd backend && npm start" -ForegroundColor White
Write-Host "Super Admin:      cd super-admin-dashboard && npm run dev" -ForegroundColor White
Write-Host "Hospital:         cd hospital-dashboard && npm run dev" -ForegroundColor White
Write-Host "Flutter app:      cd mobile_app && flutter run -d chrome" -ForegroundColor White
