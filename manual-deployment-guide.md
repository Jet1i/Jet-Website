# 🔧 手动部署指南 - Chatbot with Gemini AI

由于Wrangler CLI登录遇到问题，以下是手动部署的完整步骤：

## 方法1：通过Cloudflare Dashboard手动部署

### 步骤1：获取Gemini API密钥
1. 访问：https://makersuite.google.com/app/apikey
2. 使用Google账号登录
3. 点击"Create API Key"按钮
4. 复制生成的API密钥（格式类似：AIzaSy...）

### 步骤2：在Cloudflare Dashboard创建Worker
1. 访问：https://dash.cloudflare.com
2. 登录你的账号
3. 点击左侧"Workers & Pages"
4. 点击"Create application" > "Create Worker"
5. 给Worker起名（如：yiming-chatbot-api）
6. 点击"Deploy"后点击"Edit code"

### 步骤3：上传Worker代码
1. 删除默认代码
2. 复制我们的 `worker.js` 文件内容并粘贴
3. 点击"Save and deploy"

### 步骤4：设置环境变量
1. 在Worker页面，点击"Settings"标签
2. 点击"Variables"
3. 添加以下环境变量：
   - `GEMINI_API_KEY`: 你的Gemini API密钥（选择"Encrypt"）
   - `ENVIRONMENT`: production

### 步骤5：设置数据库
#### 选项A：使用Cloudflare D1
1. 在Dashboard中，点击"D1" 
2. 点击"Create database"
3. 命名为 `chatbot-db`
4. 创建后，点击"Console"标签
5. 复制我们的 `schema.sql` 内容并执行

#### 选项B：使用外部数据库（如Supabase）
1. 注册 https://supabase.com
2. 创建新项目
3. 在SQL编辑器中运行我们的 `schema.sql`
4. 获取连接字符串，添加为环境变量 `DATABASE_URL`

### 步骤6：绑定数据库到Worker
1. 回到Worker的"Settings" > "Variables"
2. 在"D1 database bindings"部分
3. 添加绑定：Variable name: `DB`, Database: `chatbot-db`

### 步骤7：配置路由
1. 在Worker设置中，点击"Triggers"标签
2. 添加路由：`yourdomain.com/api/*`

## 方法2：修复Wrangler并使用CLI

### 步骤1：更新Wrangler
```bash
npm install -g wrangler@latest
```

### 步骤2：清除缓存并重试
```bash
# 清除Wrangler配置
rm -rf ~/.wrangler
# 或在Windows中删除: C:\Users\[用户名]\.wrangler

# 重新登录
npx wrangler login
```

### 步骤3：如果还是有问题，使用API Token
1. 访问：https://dash.cloudflare.com/profile/api-tokens
2. 点击"Create Token"
3. 使用"Edit Cloudflare Workers"模板
4. 设置环境变量：
```bash
export CLOUDFLARE_API_TOKEN=your_token_here
```

## 测试部署

### 1. 测试API端点
访问：`https://your-worker.your-subdomain.workers.dev/api/health`
应该返回：`{"status":"healthy","timestamp":"..."}`

### 2. 测试Chatbot
1. 确保你的网站文件已上传到Cloudflare Pages
2. 打开网站，查看右下角chatbot按钮
3. 点击并发送消息测试

## 更新网站文件

### 方法1：通过Cloudflare Pages Dashboard
1. 访问 Cloudflare Dashboard > Pages
2. 选择你的网站项目
3. 上传更新后的文件（包含chatbot.css, chatbot.js等）

### 方法2：通过Git（如果连接了GitHub）
1. 提交并推送代码到GitHub
2. Cloudflare Pages会自动部署

## 故障排除

### Chatbot不显示
- 检查浏览器控制台错误
- 确认 chatbot.css 和 chatbot.js 文件已上传
- 检查文件路径是否正确

### API调用失败
- 检查Worker部署状态
- 验证GEMINI_API_KEY是否正确设置
- 检查CORS设置

### 数据库连接问题
- 验证D1数据库绑定
- 检查schema.sql是否正确执行
- 查看Worker日志

## 下一步优化

一旦基本功能工作正常，你可以：
1. 添加更多个人信息到knowledge_base表
2. 优化Gemini提示词
3. 添加用户反馈功能
4. 实现对话历史管理
5. 添加分析和监控

需要我帮你执行任何特定步骤吗？