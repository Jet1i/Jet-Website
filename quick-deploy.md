# 🚀 快速部署指南

## 当前进度 ✅
- [x] Cloudflare已登录
- [x] D1数据库已创建 (chatbot-db)
- [x] 数据库schema已执行
- [x] wrangler.jsonc已更新

## 下一步：设置API密钥

### 1. 获取Gemini API密钥
访问：https://makersuite.google.com/app/apikey
- 点击"Create API Key"
- 复制API密钥（以AIzaSy开头）

### 2. 设置密钥（需要手动输入）
在PowerShell中运行：
```bash
wrangler secret put GEMINI_API_KEY
```
然后粘贴你的API密钥

### 3. 部署Worker
```bash
wrangler deploy
```

### 4. 测试API
部署后访问：`https://your-worker-name.your-account.workers.dev/api/health`

## 5. 更新网站
确保你的网站文件（包含chatbot）已上传到Cloudflare Pages

---

## 当前数据库信息
- 数据库名: chatbot-db
- 数据库ID: 43db68ad-b390-4db7-a776-74c42ae5ff81
- 区域: EEUR
- Schema: ✅ 已执行 (13条命令成功)

现在请继续执行步骤1-4！