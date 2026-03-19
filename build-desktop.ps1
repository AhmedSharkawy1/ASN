# Desktop Build Script for ASN POS
# This script bundles the Next.js app into the Electron app and builds the installer.

Write-Host "🚀 Starting Production Build for ASN POS..." -ForegroundColor Cyan

# 1. Build Next.js App
Write-Host "📦 Step 1: Building Next.js Standalone..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Next.js Build Failed!" -ForegroundColor Red
    exit 1
}

# 2. Prepare Electron Bundle Directory
Write-Host "📂 Step 2: Preparing pos-app/next-app..." -ForegroundColor Yellow
$nextAppDir = "pos-app/next-app"
if (Test-Path $nextAppDir) {
    Remove-Item -Path $nextAppDir -Recurse -Force
}
New-Item -ItemType Directory -Path $nextAppDir -Force

# 3. Copy Standalone files
Write-Host "🚚 Step 3: Copying Standalone files..." -ForegroundColor Yellow
# Assuming standalone build is in .next/standalone
Copy-Item -Path ".next/standalone/*" -Destination $nextAppDir -Recurse -Force
# Ensure .next folder exists in destination
$destNext = Join-Path $nextAppDir ".next"
if (!(Test-Path $destNext)) { New-Item -ItemType Directory -Path $destNext -Force }
Copy-Item -Path ".next/static" -Destination (Join-Path $destNext "static") -Recurse -Force
Copy-Item -Path "public" -Destination (Join-Path $nextAppDir "public") -Recurse -Force

# 4. Build Electron Installer
Write-Host "🔨 Step 4: Packaging with Electron Builder..." -ForegroundColor Yellow
# Change directory to pos-app
Push-Location pos-app
npm install
npm run build
Pop-Location

Write-Host "✅ Build Complete! Check pos-app/release for the installer." -ForegroundColor Green
