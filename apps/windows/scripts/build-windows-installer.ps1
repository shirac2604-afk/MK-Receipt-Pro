$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step([string]$Text) {
    Write-Host "`n==> $Text" -ForegroundColor Cyan
}

if ($env:OS -ne "Windows_NT") {
    throw "The Windows installer can only be built on Windows."
}

Set-Location (Resolve-Path (Join-Path $PSScriptRoot ".."))

Write-Step "Checking Node.js"
$nodeVersionText = (& node -p "process.versions.node").Trim()
$nodeMajor = [int]($nodeVersionText.Split('.')[0])
if ($nodeMajor -lt 22) {
    throw "Node.js 22 or newer is required. Installed version: $nodeVersionText"
}
Write-Host "Node.js $nodeVersionText"

Write-Step "Checking project integrity"
& npm run check:project-integrity
if ($LASTEXITCODE -ne 0) {
    throw "Project integrity check failed."
}

Write-Step "Running TypeScript checks"
& npm run typecheck
if ($LASTEXITCODE -ne 0) {
    throw "TypeScript check failed."
}

Write-Step "Preparing release metadata"
& npm run release:prepare
if ($LASTEXITCODE -ne 0) {
    throw "Release metadata generation failed."
}

Write-Step "Building the application"
& npm run build
if ($LASTEXITCODE -ne 0) {
    throw "Application build failed."
}

Write-Step "Building the Windows installer"
& npx --no-install electron-builder --win nsis --x64
if ($LASTEXITCODE -ne 0) {
    throw "Windows installer build failed."
}

$setup = Get-ChildItem -Path "release" -Filter "*-Setup.exe" -File |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $setup) {
    throw "The build finished, but no Setup.exe file was found in the release folder."
}

Write-Host "`nInstaller created successfully:" -ForegroundColor Green
Write-Host $setup.FullName -ForegroundColor Green
Write-Host "`nInstall it on a test computer first and use sample data only." -ForegroundColor Yellow
