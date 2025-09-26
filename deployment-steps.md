# 📋 Chatbot部署步骤指南

## 当前状态 ✅
- [x] Chatbot UI 已添加到网站
- [x] 前端JavaScript功能完成
- [x] 后端Worker代码准备就绪
- [x] 数据库Schema准备完成

## 接下来需要完成的步骤：

### 1. 🔑 获取Gemini API密钥
1. 访问：https://makersuite.google.com/app/apikey
2. 使用Google账号登录
3. 点击"Create API Key"
4. 选择一个项目或创建新项目
5. 复制生成的API密钥

### 2. 🗄️ 设置数据库
选择一个选项：

#### 选项A: Cloudflare D1 (推荐)
```bash
# 创建数据库
npx wrangler d1 create chatbot-db

# 记录输出的database_id，需要更新到wrangler.jsonc中
```

#### 选项B: 外部PostgreSQL (如Supabase/Neon)
1. 注册 Supabase: https://supabase.com
2. 创建新项目
3. 获取数据库连接字符串

### 3. ⚙️ 配置Cloudflare Worker
```bash
# 设置Gemini API密钥
npx wrangler secret put GEMINI_API_KEY

# 如果使用外部PostgreSQL
npx wrangler secret put DATABASE_URL
```

### 4. 📝 更新配置文件
更新 `wrangler.jsonc` 中的database_id (从步骤2获得)

### 5. 🚀 部署
```bash
npx wrangler deploy
```

### 6. 🧪 测试功能
测试chatbot的各种功能