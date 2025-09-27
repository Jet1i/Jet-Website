# Cloudflare Pages 部署脚本
# 使用此脚本部署到 https://jet-website.liyimingjet.workers.dev/

Write-Host "正在部署到 Cloudflare Pages..." -ForegroundColor Green

# 部署到 Cloudflare Pages
wrangler pages deploy . --project-name jet-website

Write-Host "部署完成！" -ForegroundColor Green
Write-Host "你的网站将在以下地址可用:" -ForegroundColor Yellow
Write-Host "https://jet-website.liyimingjet.workers.dev/" -ForegroundColor Cyan