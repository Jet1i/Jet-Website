# Gemini 2.5 Flash RAG 聊天机器人部署指南

## 概述

这个指南将帮你部署一个使用 Gemini 2.5 Flash API 的高性能 RAG（检索增强生成）聊天机器人，支持中英文双语，具备向量搜索、关键词匹配和智能融合等功能。

## 优化特性

### 🚀 Gemini 2.5 Flash 集成
- **最新 API**: 使用 `gemini-2.0-flash-exp` 模型
- **向量嵌入**: 使用 `text-embedding-004` 模型
- **智能缓存**: 嵌入向量缓存机制
- **多语言支持**: 中英文自动检测和响应

### 🔍 增强的 RAG 系统
- **混合搜索**: 向量搜索 + 关键词匹配
- **智能融合**: 多策略结果合并
- **上下文感知**: 基于相关性的动态上下文
- **延迟加载**: 按需生成嵌入向量

### 💬 用户体验优化
- **实时打字指示器**: 更好的交互反馈
- **语音输入支持**: Web Speech API 集成
- **建议快捷键**: 常用问题快速访问
- **响应式设计**: 移动端友好界面

## 部署步骤

### 1. 准备工作

#### 1.1 获取 Gemini API 密钥
```bash
# 访问 Google AI Studio
# https://makersuite.google.com/app/apikey
# 创建并复制你的 API 密钥
```

#### 1.2 设置环境变量
```bash
# 在 Cloudflare Workers 中设置
wrangler secret put GEMINI_API_KEY
# 输入你的 Gemini API 密钥
```

### 2. 文件替换

#### 2.1 替换 Worker 文件
```bash
# 备份当前文件
cp worker.js worker-backup-$(date +%Y%m%d).js

# 使用优化版本
cp worker-optimized.js worker.js
```

#### 2.2 更新前端文件
```bash
# 备份当前文件
cp chatbot.js chatbot-backup-$(date +%Y%m%d).js
cp chatbot.css chatbot-backup-$(date +%Y%m%d).css

# 使用优化版本
cp chatbot-optimized.js chatbot.js
cp chatbot-optimized.css chatbot.css
```

#### 2.3 更新 HTML 引用
在 `index.html` 中确保正确引用样式和脚本：

```html
<!-- 在 <head> 中添加 -->
<link rel="stylesheet" href="chatbot.css">

<!-- 在 </body> 前添加 -->
<script src="chatbot.js"></script>
```

### 3. 数据库设置

#### 3.1 确认数据库架构
```bash
# 检查 schema.sql 是否包含所有必要的表
wrangler d1 execute chatbot-db --file=schema.sql
```

#### 3.2 生成知识库嵌入向量
```bash
# 部署后调用 API 生成所有嵌入向量
curl -X POST https://your-domain.com/api/embeddings/generate \
  -H "Content-Type: application/json" \
  -d '{"action": "generate_all"}'
```

### 4. 部署到 Cloudflare

#### 4.1 更新 wrangler.jsonc
```jsonc
{
  "name": "jet-website",
  "compatibility_date": "2025-01-09",
  "main": "worker.js",
  "assets": {
    "directory": "."
  },
  "vars": {
    "ENVIRONMENT": "production"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "chatbot-db",
      "database_id": "your-database-id"
    }
  ]
}
```

#### 4.2 部署命令
```bash
# 部署到生产环境
wrangler deploy

# 查看部署日志
wrangler tail
```

### 5. 验证部署

#### 5.1 健康检查
```bash
# 检查 API 状态
curl https://your-domain.com/api/health

# 期望响应:
# {
#   "status": "ok",
#   "message": "Gemini 2.5 Flash RAG Assistant Online",
#   "timestamp": "2025-01-09T...",
#   "version": "2.5-optimized"
# }
```

#### 5.2 测试聊天功能
```bash
# 测试中文查询
curl -X POST https://your-domain.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "李意铭获得过什么奖学金？",
    "sessionId": "test-session"
  }'

# 测试英文查询
curl -X POST https://your-domain.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are Yiming'\''s technical skills?",
    "sessionId": "test-session"
  }'
```

## 配置优化

### 6. 性能调优

#### 6.1 Gemini API 参数优化
在 `worker.js` 中调整生成配置：

```javascript
generationConfig: {
  temperature: 0.7,        // 控制创造性 (0.0-1.0)
  topK: 40,               // 词汇选择范围
  topP: 0.95,             // 累积概率阈值
  maxOutputTokens: 1024,   // 最大输出长度
  candidateCount: 1,       // 候选响应数量
}
```

#### 6.2 搜索参数调优
```javascript
// 在 adaptiveKnowledgeSearch 函数中
const limit = 6;                    // 返回结果数量
const vectorWeight = 0.6;           // 向量搜索权重
const keywordWeight = 0.4;          // 关键词搜索权重
const relevanceThreshold = 0.3;     // 相关性阈值
```

#### 6.3 缓存策略优化
```javascript
// 嵌入向量缓存时间
"created_at > datetime('now', '-7 days')"  // 7天缓存

// 调整为更长缓存时间以提高性能
"created_at > datetime('now', '-30 days')" // 30天缓存
```

### 7. 监控和分析

#### 7.1 添加分析代码
```javascript
// 在聊天处理中添加分析
await env.DB.prepare(
  "INSERT INTO chat_analytics (session_id, event_type, event_data) VALUES (?, ?, ?)"
).bind(
  sessionId, 
  'chat_completed',
  JSON.stringify({
    language: detectedLanguage,
    response_time: processingTime,
    knowledge_items_used: relevantKnowledge.length,
    user_message_length: message.length,
    ai_response_length: response.length
  })
).run();
```

#### 7.2 查看使用统计
```sql
-- 查看聊天统计
SELECT 
  DATE(timestamp) as date,
  COUNT(*) as conversations,
  JSON_EXTRACT(event_data, '$.language') as language
FROM chat_analytics 
WHERE event_type = 'chat_completed'
GROUP BY date, language
ORDER BY date DESC;
```

## 故障排除

### 8. 常见问题

#### 8.1 Gemini API 错误
```javascript
// 检查 API 密钥
console.log('API Key exists:', !!env.GEMINI_API_KEY);

// 检查 API 响应
if (!response.ok) {
  const errorText = await response.text();
  console.error('Gemini API Error:', response.status, errorText);
}
```

#### 8.2 数据库连接问题
```javascript
// 测试数据库连接
try {
  const testQuery = await env.DB.prepare("SELECT 1").first();
  console.log('Database connected:', !!testQuery);
} catch (error) {
  console.error('Database error:', error);
}
```

#### 8.3 嵌入向量生成失败
```bash
# 手动重新生成嵌入向量
curl -X POST https://your-domain.com/api/embeddings/generate \
  -H "Content-Type: application/json" \
  -d '{"action": "generate_all"}'
```

### 9. 性能监控

#### 9.1 添加性能日志
```javascript
const startTime = Date.now();
// ... 处理逻辑 ...
const processingTime = Date.now() - startTime;
console.log(`Request processed in ${processingTime}ms`);
```

#### 9.2 使用 Cloudflare Analytics
- 访问 Cloudflare Dashboard
- 查看 Workers Analytics
- 监控请求数量、错误率、执行时间

## 进阶功能

### 10. 扩展功能

#### 10.1 添加新知识类别
```sql
-- 在 knowledge_base 表中添加新类别
INSERT INTO knowledge_base (category, title, content, keywords, priority) 
VALUES ('new_category', 'Title', 'Content', 'keywords', 5);
```

#### 10.2 自定义响应模板
```javascript
// 在 generateFallbackResponse 中添加新的响应模板
const responseTemplates = {
  'custom_category': {
    'zh': '关于新类别：{content}',
    'en': 'About new category: {content}'
  }
};
```

#### 10.3 集成外部 API
```javascript
// 在知识检索中集成外部数据源
async function fetchExternalKnowledge(query) {
  const response = await fetch('https://external-api.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  return await response.json();
}
```

## 维护建议

### 11. 定期维护

1. **更新知识库**: 定期添加新的项目、技能、经验信息
2. **清理缓存**: 定期清理过期的嵌入向量缓存
3. **分析用户查询**: 根据用户提问优化知识库内容
4. **监控 API 使用**: 跟踪 Gemini API 使用量和成本
5. **备份数据**: 定期备份对话历史和知识库

### 12. 安全考虑

1. **API 密钥安全**: 使用 Cloudflare Secrets 管理 API 密钥
2. **输入验证**: 验证用户输入防止注入攻击
3. **速率限制**: 实施请求频率限制
4. **数据隐私**: 遵守数据保护法规

---

## 总结

这个优化的 Gemini 2.5 Flash RAG 聊天机器人提供了：

- ✅ 最新的 Gemini 2.5 Flash API 集成
- ✅ 高性能向量搜索和关键词匹配
- ✅ 中英文双语支持
- ✅ 智能上下文管理
- ✅ 用户友好的界面
- ✅ 完整的错误处理和降级机制

部署完成后，你将拥有一个功能强大、响应快速的 AI 助手，能够智能地回答关于你的背景、技能、项目和经验的问题。

如果遇到任何问题，请检查 Cloudflare Workers 日志，或参考故障排除部分。