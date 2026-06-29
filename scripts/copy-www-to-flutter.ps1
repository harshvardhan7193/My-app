# Copy the Vite production build into the Flutter asset bundle for offline shell.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path "$Root\frontend")) {
    $Root = Split-Path -Parent $PSScriptRoot
}
$Dist = Join-Path $Root "frontend\dist"
$Dest = Join-Path $Root "flutter_app\assets\www"

Write-Host "Building frontend for Flutter bundle (relative asset paths)..."
Push-Location (Join-Path $Root "frontend")
$env:VITE_BASE = './'
npm run build
Remove-Item Env:VITE_BASE -ErrorAction SilentlyContinue
Pop-Location

if (Test-Path $Dest) { Remove-Item -Recurse -Force $Dest }
New-Item -ItemType Directory -Path $Dest -Force | Out-Null
Copy-Item -Path (Join-Path $Dist "*") -Destination $Dest -Recurse -Force
Write-Host "Copied $Dist -> $Dest"
