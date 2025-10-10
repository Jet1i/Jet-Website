#!/usr/bin/env pwsh
# Modern Signature Deployment Script for Cloudflare Workers

Write-Host "🚀 Deploying Modern Interactive Signature to Cloudflare Workers..." -ForegroundColor Cyan

# Check if wrangler is installed
if (!(Get-Command "wrangler" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: Wrangler CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "npm install -g wrangler" -ForegroundColor Yellow
    exit 1
}

# Check if we're logged in to Cloudflare
try {
    $whoami = wrangler whoami 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error: Not logged in to Cloudflare. Please run:" -ForegroundColor Red
        Write-Host "wrangler login" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "✅ Authenticated with Cloudflare" -ForegroundColor Green
} catch {
    Write-Host "❌ Error checking Cloudflare authentication" -ForegroundColor Red
    exit 1
}

# Backup old files
Write-Host "📦 Creating backup of old signature files..." -ForegroundColor Yellow
$backupDir = "signature-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

if (Test-Path "optimized-signature.css") {
    Copy-Item "optimized-signature.css" "$backupDir/"
}
if (Test-Path "optimized-signature.js") {
    Copy-Item "optimized-signature.js" "$backupDir/"
}

Write-Host "✅ Backup created in: $backupDir" -ForegroundColor Green

# Validate new files exist
$requiredFiles = @("modern-signature.css", "modern-signature.js", "index.html", "wrangler.jsonc")
foreach ($file in $requiredFiles) {
    if (!(Test-Path $file)) {
        Write-Host "❌ Error: Required file missing: $file" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ All required files found" -ForegroundColor Green

# Clean up temporary files
Write-Host "🧹 Cleaning up temporary files..." -ForegroundColor Yellow
Get-ChildItem -Path "." -Name "tmp_rovodev_*" | ForEach-Object {
    Remove-Item $_ -Force
    Write-Host "   Removed: $_" -ForegroundColor Gray
}

# Validate wrangler.jsonc syntax
Write-Host "🔍 Validating wrangler configuration..." -ForegroundColor Yellow
try {
    $config = Get-Content "wrangler.jsonc" | ConvertFrom-Json
    Write-Host "✅ Wrangler configuration is valid" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Invalid wrangler.jsonc syntax" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Deploy to Cloudflare Workers
Write-Host "🌐 Deploying to Cloudflare Workers..." -ForegroundColor Cyan
Write-Host "This may take a few moments..." -ForegroundColor Gray

try {
    $deployResult = wrangler deploy 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Successfully deployed to Cloudflare Workers!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🎉 Modern Interactive Signature is now live!" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "New features include:" -ForegroundColor White
        Write-Host "  • Enhanced visual design with glassmorphism effects" -ForegroundColor Gray
        Write-Host "  • Improved particle interactions and animations" -ForegroundColor Gray
        Write-Host "  • Better mobile responsiveness" -ForegroundColor Gray
        Write-Host "  • Accessibility improvements (keyboard navigation)" -ForegroundColor Gray
        Write-Host "  • Performance optimizations with intersection observer" -ForegroundColor Gray
        Write-Host "  • Mouse trail and ripple effects" -ForegroundColor Gray
        Write-Host "  • Enhanced glow and sparkle effects" -ForegroundColor Gray
        Write-Host ""
        
        # Extract URL from deploy result if available
        $urlMatch = $deployResult | Select-String "https://.*\.workers\.dev"
        if ($urlMatch) {
            Write-Host "🔗 Your website is available at: $($urlMatch.Matches[0].Value)" -ForegroundColor Cyan
        }
        
        Write-Host ""
        Write-Host "💡 Tip: Test the signature by hovering and clicking on it!" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Deployment failed!" -ForegroundColor Red
        Write-Host $deployResult -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error during deployment:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Optional: Open browser to test
$openBrowser = Read-Host "Would you like to open your website in the browser to test? (y/n)"
if ($openBrowser -eq "y" -or $openBrowser -eq "Y") {
    $urlMatch = $deployResult | Select-String "https://.*\.workers\.dev"
    if ($urlMatch) {
        Start-Process $urlMatch.Matches[0].Value
    } else {
        Write-Host "⚠️  Could not extract URL from deployment output" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "🎯 Deployment Summary:" -ForegroundColor Cyan
Write-Host "  • Modern signature design: ✅ Deployed" -ForegroundColor Green
Write-Host "  • Enhanced interactivity: ✅ Active" -ForegroundColor Green
Write-Host "  • Mobile optimization: ✅ Enabled" -ForegroundColor Green
Write-Host "  • Performance improvements: ✅ Applied" -ForegroundColor Green
Write-Host ""
Write-Host "🔄 To rollback if needed, restore files from: $backupDir" -ForegroundColor Gray