// Optimized Cloudflare Worker with Gemini 2.5 Flash for Enhanced RAG Chatbot
// Combines vector search, keyword matching, and advanced context management

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // API Routes
    if (url.pathname === '/api/health' && request.method === 'GET') {
      return handleHealthCheck(env);
    }

    if (url.pathname === '/api/chat' && request.method === 'POST') {
      return await handleChatRequest(request, env);
    }

    if (url.pathname === '/api/knowledge' && request.method === 'GET') {
      return await handleKnowledgeRequest(env);
    }

    if (url.pathname === '/api/embeddings/generate' && request.method === 'POST') {
      return await handleEmbeddingGeneration(request, env);
    }

    // Serve static files
    return env.ASSETS.fetch(request);
  }
};

// Health check with enhanced status
function handleHealthCheck(env) {
  return new Response(JSON.stringify({ 
    status: 'ok', 
    message: 'Gemini 2.5 Flash RAG Assistant Online',
    timestamp: new Date().toISOString(),
    version: '2.5-optimized'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  });
}

// Enhanced chat request handler
async function handleChatRequest(request, env) {
  try {
    const { message, sessionId, language = 'auto', forceLanguage = null } = await request.json();
    
    if (!message?.trim()) {
      return createErrorResponse('Message is required', 400);
    }

    console.log(`Processing chat request: ${message.substring(0, 100)}...`);
    console.log(`Message char codes: ${Array.from(message).map(c => c.charCodeAt(0)).join(',')}`);
    
    // Use frontend language detection if available, otherwise detect on backend
    const detectedLanguage = forceLanguage || detectLanguage(message);
    console.log(`Language detection - Frontend: ${forceLanguage}, Backend: ${detectLanguage(message)}, Final: ${detectedLanguage}`);

    // Pre-process Chinese queries: translate to English for better search
    let searchQuery = message;
    let shouldTranslateBack = false;
    
    if (detectedLanguage === 'zh') {
      console.log('Chinese query detected, translating to English for better search...');
      searchQuery = await translateQueryToEnglish(env, message);
      shouldTranslateBack = true;
      console.log(`Translated query: ${searchQuery}`);
    }

    // Enhanced knowledge retrieval with adaptive search (using English query)
    const relevantKnowledge = await adaptiveKnowledgeSearch(env, searchQuery, 'en');
    console.log(`Found ${relevantKnowledge.length} relevant knowledge items`);

    // Generate contextual response with Gemini 2.5 Flash
    // Use original language for response, but enhanced search results
    const response = await generateGemini25Response(env, message, relevantKnowledge, detectedLanguage, sessionId, searchQuery);

    // Store conversation asynchronously
    if (typeof ctx !== 'undefined' && ctx.waitUntil) {
      ctx.waitUntil(storeConversation(env, sessionId, message, response, detectedLanguage));
    } else {
      // Fallback for environments without ctx
      storeConversation(env, sessionId, message, response, detectedLanguage).catch(console.error);
    }

    return new Response(JSON.stringify({ 
      response: response,
      relevantSources: relevantKnowledge.slice(0, 3).map(item => ({
        category: item.category,
        title: item.title,
        confidence: Math.round(item.score * 100),
        source: item.source || 'knowledge_base'
      })),
      metadata: {
        language: detectedLanguage,
        processingTime: Date.now(),
        knowledgeItemsUsed: relevantKnowledge.length
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (error) {
    console.error('Chat request error:', error);
    return createErrorResponse('Failed to process chat request', 500, error.message);
  }
}

// Adaptive knowledge search combining multiple strategies
async function adaptiveKnowledgeSearch(env, userMessage, language = 'en', limit = 6) {
  try {
    console.log('Starting adaptive knowledge search...');
    
    // Strategy 1: Semantic/Vector search (if embeddings available)
    let vectorResults = [];
    try {
      const queryEmbedding = await getOrCreateEmbedding(env, userMessage);
      if (queryEmbedding) {
        vectorResults = await performVectorSearch(env, queryEmbedding, limit);
        console.log(`Vector search found ${vectorResults.length} results`);
      }
    } catch (e) {
      console.log('Vector search not available, falling back to keyword search');
    }

    // Strategy 2: Enhanced keyword and category search
    const keywordResults = await enhancedKeywordSearch(env, userMessage, language, limit);
    console.log(`Keyword search found ${keywordResults.length} results`);

    // Strategy 3: Context-aware fusion
    const fusedResults = fuseAndRankResults(vectorResults, keywordResults, userMessage, limit);
    
    // Strategy 4: Add conversation context if available
    // TODO: Implement conversation history context
    
    return fusedResults;
    
  } catch (error) {
    console.error('Adaptive search error:', error);
    // Fallback to basic keyword search
    return await basicKeywordSearch(env, userMessage, limit);
  }
}

// Enhanced keyword search with multi-language support
async function enhancedKeywordSearch(env, userMessage, language, limit = 10) {
  try {
    const message = userMessage.toLowerCase();
    
    // Enhanced category keywords with Chinese and English support
    const categoryKeywords = {
      'personal': {
        en: ['name', 'who', 'about', 'introduction', 'background', 'person'],
        zh: ['叫', '名字', '是谁', '介绍', '背景', '个人', '人', '李一鸣', '一鸣']
      },
      'education': {
        en: ['education', 'university', 'degree', 'study', 'academic', 'school', 'master', 'eit', 'digital', 'bachelor', 'undergraduate'],
        zh: ['教育', '大学', '学位', '学习', '学校', '硕士', '学历', '专业', '本科', '毕业', '毕业于', '哪里', '哪个大学', '什么大学', '学士']
      },
      'experience': {
        en: ['experience', 'work', 'job', 'career', 'professional', 'employment', 'position'],
        zh: ['经验', '工作', '职业', '就业', '实习', '经历', '岗位']
      },
      'projects': {
        en: ['project', 'built', 'developed', 'created', 'designed', 'implemented', 'portfolio', 'work'],
        zh: ['项目', '开发', '设计', '构建', '作品', '做过', '开发过']
      },
      'skills': {
        en: ['skill', 'technology', 'programming', 'language', 'framework', 'tool', 'expertise', 'c++', 'python'],
        zh: ['技能', '技术', '编程', '程序', '框架', '工具', '会', '掌握']
      },
      'awards': {
        en: ['award', 'scholarship', 'achievement', 'recognition', 'honor', 'prize', 'certificate'],
        zh: ['奖学金', '奖项', '荣誉', '获奖', '奖励', '成就', '拿过', '得过', '奖']
      },
      'contact': {
        en: ['contact', 'email', 'phone', 'reach', 'connect', 'location', 'address', 'hire'],
        zh: ['联系', '邮箱', '电话', '地址', '联系方式', '招聘']
      },
      'languages': {
        en: ['language', 'english', 'chinese', 'speak', 'fluent', 'proficiency'],
        zh: ['语言', '英语', '中文', '说', '流利', '会说']
      },
      'interests': {
        en: ['hobby', 'interest', 'personal', 'free', 'time', 'like', 'enjoy'],
        zh: ['爱好', '兴趣', '喜欢', '业余', '空闲', '个人']
      },
      'current_status': {
        en: ['looking', 'seeking', 'search', 'want', 'need', 'thesis', 'job', 'work', 'career', 'employment', 'opportunity'],
        zh: ['找', '寻找', '找工作', '求职', '论文', '毕业论文', '工作', '职业', '机会', '就业']
      },
      'career': {
        en: ['career', 'interested', 'passion', 'role', 'position', 'field', 'industry'],
        zh: ['职业', '兴趣', '热情', '角色', '职位', '领域', '行业', '感兴趣']
      }
    };
    
    let categoryScores = new Map();
    let results = [];
    
    // Calculate category relevance scores
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      let score = 0;
      const allKeywords = [...keywords.en, ...keywords.zh];
      
      for (const keyword of allKeywords) {
        if (message.includes(keyword.toLowerCase())) {
          score += keywords.zh.includes(keyword) ? 1.1 : 1.0; // Slight boost for Chinese matches
        }
      }
      
      if (score > 0) {
        categoryScores.set(category, score);
      }
    }
    
    // Search by top matching categories
    const sortedCategories = Array.from(categoryScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3); // Top 3 categories
    
    for (const [category, score] of sortedCategories) {
      const categoryResults = await env.DB.prepare(
        "SELECT * FROM knowledge_base WHERE is_active = 1 AND category = ? ORDER BY priority DESC"
      ).bind(category).all();
      
      if (categoryResults.results) {
        results.push(...categoryResults.results.map(item => ({
          ...item,
          score: score * 0.8 + (item.priority / 10) * 0.2,
          source: 'category_match'
        })));
      }
    }
    
    // Content-based search for additional context
    const searchTerms = extractSearchTerms(message);
    if (searchTerms.length > 0 && results.length < limit) {
      const contentResults = await performContentSearch(env, searchTerms);
      results.push(...contentResults.map(item => ({
        ...item,
        score: (item.score || 0.5) + (item.priority / 10) * 0.1,
        source: 'content_search'
      })));
    }
    
    // Remove duplicates and sort
    const uniqueResults = removeDuplicates(results);
    return uniqueResults
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
  } catch (error) {
    console.error('Enhanced keyword search error:', error);
    return [];
  }
}

// Perform content-based search
async function performContentSearch(env, searchTerms) {
  try {
    const searchPattern = searchTerms.map(term => `%${term}%`);
    const query = `
      SELECT *, 0.6 as base_score FROM knowledge_base 
      WHERE is_active = 1 AND (
        ${searchTerms.map(() => 'LOWER(content) LIKE ?').join(' OR ')} OR
        ${searchTerms.map(() => 'LOWER(keywords) LIKE ?').join(' OR ')} OR
        ${searchTerms.map(() => 'LOWER(title) LIKE ?').join(' OR ')}
      )
      ORDER BY priority DESC
      LIMIT 10
    `;
    
    const results = await env.DB.prepare(query)
      .bind(...searchPattern, ...searchPattern, ...searchPattern)
      .all();
    
    return results.results || [];
  } catch (error) {
    console.error('Content search error:', error);
    return [];
  }
}

// Vector search implementation
async function performVectorSearch(env, queryEmbedding, limit = 10) {
  try {
    if (!queryEmbedding) return [];
    
    const knowledgeWithEmbeddings = await env.DB.prepare(`
      SELECT kb.*, ke.embedding
      FROM knowledge_base kb
      JOIN knowledge_embeddings ke ON kb.id = ke.knowledge_id
      WHERE kb.is_active = 1
    `).all();
    
    const results = [];
    
    for (const item of knowledgeWithEmbeddings.results || []) {
      try {
        const itemEmbedding = JSON.parse(item.embedding);
        const similarity = cosineSimilarity(queryEmbedding, itemEmbedding);
        
        if (similarity > 0.3) { // Threshold for relevance
          results.push({
            ...item,
            score: similarity * 0.9 + (item.priority / 10) * 0.1,
            source: 'vector_search',
            similarity: similarity
          });
        }
      } catch (e) {
        console.error(`Error processing embedding for item ${item.id}:`, e);
      }
    }
    
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
  } catch (error) {
    console.error('Vector search error:', error);
    return [];
  }
}

// Translate Chinese query to English for better knowledge search
async function translateQueryToEnglish(env, chineseQuery) {
  try {
    const translationPrompt = `You are a query translator. Translate the following Chinese question about Yiming Li to English, keeping the same meaning and intent. Only return the English translation, nothing else.

Chinese question: ${chineseQuery}

English translation:`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ text: translationPrompt }] 
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 100,
        }
      })
    });

    if (!response.ok) {
      console.error('Translation API error:', response.status);
      return chineseQuery; // fallback to original
    }

    const data = await response.json();
    const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    return translatedText || chineseQuery;
    
  } catch (error) {
    console.error('Translation error:', error);
    return chineseQuery; // fallback to original
  }
}

// Generate response using Gemini 2.5 Flash with optimized prompting
async function generateGemini25Response(env, userMessage, relevantKnowledge, language, sessionId, searchQuery = null) {
  try {
    // Build context with relevance scoring
    let knowledgeContext = '';
    if (relevantKnowledge && relevantKnowledge.length > 0) {
      knowledgeContext = `\n## Available Information about Yiming:\n` +
        relevantKnowledge.map((item, index) => 
          `${index + 1}. **${item.category.toUpperCase()} - ${item.title}** (Confidence: ${Math.round(item.score * 100)}%)\n   ${item.content}\n`
        ).join('\n');
    }

    // Enhanced prompting with search context
    const searchContext = searchQuery && searchQuery !== userMessage ? 
      `\n## Search Context: The question was processed as: "${searchQuery}"` : '';

    // Language-specific system prompt
    const systemPrompt = language === 'zh' ? 
      `你是李一鸣(Yiming Li)的AI助手。请用中文专业、友善地回答关于李一鸣的问题。李一鸣的英文名是Yiming Li。` :
      `You are Yiming Li's AI assistant. Answer questions about Yiming professionally and helpfully in English.`;

    const responseGuidelines = language === 'zh' ?
      `回答指南：
1. 使用提供的相关信息准确回答问题
2. 保持对话式、友好和专业的语调
3. 如果信息不完整，建议直接联系李一鸣
4. 重点关注最相关的信息（根据置信度）
5. 保持回答简洁但有用
6. 记住李一鸣的中文名字是"李一鸣"，英文名是"Yiming Li"` :
      `Response Guidelines:
1. Use the provided relevant information to answer accurately
2. Be conversational, friendly, and professional
3. If information is incomplete, suggest contacting Yiming directly
4. Focus on the most relevant information based on confidence scores
5. Keep responses concise but informative`;

    // Check if we have relevant knowledge for this query
    const hasRelevantInfo = relevantKnowledge && relevantKnowledge.length > 0 && 
                           relevantKnowledge.some(item => item.score > 0.3);

    const prompt = `${systemPrompt}

${responseGuidelines}

## User Question: ${userMessage}${searchContext}
${knowledgeContext}

## Instructions:
${hasRelevantInfo ? 
  'Please provide a helpful response based on the available information above.' : 
  'The question asks for specific information that is not available in the knowledge base. Please politely explain that this specific information is not available and suggest contacting Yiming directly for such details. You can still mention general information about Yiming if relevant.'}

Please provide a helpful response:`;

    console.log('Calling Gemini 2.5 Flash API...');
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ text: prompt }] 
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
          candidateCount: 1,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH", 
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    });

    console.log(`Gemini 2.5 Flash API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return generateFallbackResponse(userMessage, relevantKnowledge, language);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      console.error('No text generated from Gemini response:', JSON.stringify(data));
      return generateFallbackResponse(userMessage, relevantKnowledge, language);
    }
    
    console.log('Successfully generated response with Gemini 2.5 Flash');
    return generatedText;

  } catch (error) {
    console.error('Gemini 2.5 response generation error:', error);
    return generateFallbackResponse(userMessage, relevantKnowledge, language);
  }
}

// Get or create embedding with caching
async function getOrCreateEmbedding(env, text) {
  try {
    const textHash = await hashText(text);
    
    // Check cache first
    const cached = await env.DB.prepare(
      "SELECT embedding FROM embedding_cache WHERE text_hash = ? AND created_at > datetime('now', '-7 days')"
    ).bind(textHash).first();
    
    if (cached) {
      return JSON.parse(cached.embedding);
    }
    
    // Generate new embedding
    const embedding = await generateEmbedding(env, text);
    
    if (embedding) {
      // Cache the embedding
      await env.DB.prepare(
        "INSERT OR REPLACE INTO embedding_cache (text_hash, text_snippet, embedding) VALUES (?, ?, ?)"
      ).bind(textHash, text.substring(0, 100), JSON.stringify(embedding)).run();
    }
    
    return embedding;
    
  } catch (error) {
    console.error('Error getting/creating embedding:', error);
    return null;
  }
}

// Generate embedding using Gemini embedding model
async function generateEmbedding(env, text) {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: {
          parts: [{ text: text }]
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.embedding && data.embedding.values) {
      return data.embedding.values;
    }
    
    throw new Error('Invalid embedding response');
    
  } catch (error) {
    console.error('Embedding generation error:', error);
    return null;
  }
}

// Utility functions
function detectLanguage(text) {
  // Robust Chinese detection with multiple strategies
  console.log(`Language detection for: "${text}" (length: ${text.length})`);
  
  // Strategy 1: Unicode range check
  const chineseRegex = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;
  if (chineseRegex.test(text)) {
    console.log('Strategy 1: Found Chinese characters via regex');
    return 'zh';
  }
  
  // Strategy 2: Common Chinese words/phrases
  const chineseWords = [
    '李一鸣', '一鸣', '你好', '什么', '哪里', '工作', '论文', '找', '在', '的', '是', '了', '和', '有', '他', '她', '我', '你',
    '毕业', '学位', '技能', '项目', '经验', '教育', '大学', '专业', '研究', '开发', '设计', '系统', '软件', '硬件'
  ];
  
  const hasChineseWords = chineseWords.some(word => text.includes(word));
  if (hasChineseWords) {
    console.log('Strategy 2: Found Chinese words');
    return 'zh';
  }
  
  // Strategy 3: Character code analysis
  let chineseCharCount = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0x4e00 && code <= 0x9fff) {
      chineseCharCount++;
      console.log(`Strategy 3: Found Chinese char at position ${i}: ${text[i]} (U+${code.toString(16)})`);
    }
  }
  
  if (chineseCharCount > 0) {
    console.log(`Strategy 3: Found ${chineseCharCount} Chinese characters`);
    return 'zh';
  }
  
  // Strategy 4: Check for specific patterns that might indicate encoding issues
  if (text.includes('？') || text.includes('，') || text.includes('。')) {
    console.log('Strategy 4: Found Chinese punctuation');
    return 'zh';
  }
  
  console.log('All strategies failed, defaulting to English');
  return 'en';
}

function extractSearchTerms(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fff]/g, ' ') // Keep Chinese characters
    .split(/\s+/)
    .filter(term => term.length > 1)
    .slice(0, 10);
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function fuseAndRankResults(vectorResults, keywordResults, userMessage, limit) {
  const resultMap = new Map();
  
  // Add vector results with weight
  vectorResults.forEach(item => {
    resultMap.set(item.id, {
      ...item,
      vector_score: item.score || 0,
      keyword_score: 0,
      final_score: (item.score || 0) * 0.6
    });
  });
  
  // Add/merge keyword results
  keywordResults.forEach(item => {
    if (resultMap.has(item.id)) {
      const existing = resultMap.get(item.id);
      existing.keyword_score = item.score || 0;
      existing.final_score = (existing.vector_score * 0.6) + (existing.keyword_score * 0.4);
    } else {
      resultMap.set(item.id, {
        ...item,
        vector_score: 0,
        keyword_score: item.score || 0,
        final_score: (item.score || 0) * 0.4
      });
    }
  });
  
  return Array.from(resultMap.values())
    .sort((a, b) => b.final_score - a.final_score)
    .slice(0, limit)
    .map(item => ({
      ...item,
      score: item.final_score
    }));
}

function removeDuplicates(results) {
  const seen = new Set();
  return results.filter(item => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

async function hashText(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Enhanced fallback response generator
function generateFallbackResponse(userMessage, relevantKnowledge, language) {
  const message = userMessage.toLowerCase();
  
  // Check for specific personal questions that we likely don't have answers for
  const personalQuestions = ['age', 'old', 'birthday', 'born', 'favorite', 'likes', 'hobbies', 'relationship', 'married', 'family', 'address', 'phone number', 'personal life'];
  const isPersonalQuestion = personalQuestions.some(word => message.includes(word));
  
  if (isPersonalQuestion) {
    return language === 'zh' ? 
      `抱歉，我没有关于李一鸣的这个具体信息。我主要了解他的教育背景、专业技能、项目经验和获奖情况。如需了解更多个人信息，建议直接通过网站联系他。` :
      `I don't have that specific information about Yiming. I have details about his education, professional skills, projects, and achievements, but not personal details like this. For such specific information, I'd recommend contacting Yiming directly through this website.`;
  }
  
  if (relevantKnowledge && relevantKnowledge.length > 0) {
    const firstResult = relevantKnowledge[0];
    
    if (language === 'zh') {
      const categoryMap = {
        'awards': '关于李一鸣的奖项和奖学金',
        'education': '关于李一鸣的教育背景',
        'experience': '关于李一鸣的专业经验',
        'projects': '关于李一鸣的项目',
        'skills': '关于李一鸣的技术技能',
        'contact': '联系李一鸣'
      };
      
      const categoryName = categoryMap[firstResult.category] || '关于李一鸣';
      return `${categoryName}：${firstResult.content}。如需了解更多信息，请通过网站联系他。`;
    } else {
      const categoryMap = {
        'awards': 'Regarding Yiming\'s awards and achievements',
        'education': 'About Yiming\'s educational background',
        'experience': 'Regarding Yiming\'s professional experience',
        'projects': 'About Yiming\'s projects',
        'skills': 'About Yiming\'s technical skills',
        'contact': 'Contacting Yiming'
      };
      
      const categoryName = categoryMap[firstResult.category] || 'About Yiming';
      return `${categoryName}: ${firstResult.content}. For more information, please contact him directly through this website.`;
    }
  }
  
  return language === 'zh' ? 
    "感谢您的问题！我可以为您提供李一鸣的教育背景、项目经验、技能和获奖情况等信息。请随时通过网站与他联系。" :
    "Thank you for your question! I have information about Yiming's education, projects, skills, and achievements. Please feel free to contact him directly through this website.";
}

// Basic keyword search fallback
async function basicKeywordSearch(env, userMessage, limit = 5) {
  try {
    const results = await env.DB.prepare(
      "SELECT * FROM knowledge_base WHERE is_active = 1 ORDER BY priority DESC LIMIT ?"
    ).bind(limit).all();
    
    return (results.results || []).map(item => ({
      ...item,
      score: 0.5,
      source: 'fallback'
    }));
  } catch (error) {
    console.error('Basic search error:', error);
    return [];
  }
}

// Store conversation with metadata
async function storeConversation(env, sessionId, userMessage, aiResponse, language) {
  try {
    await env.DB.prepare(
      "INSERT INTO conversations (session_id, role, content) VALUES (?, ?, ?)"
    ).bind(sessionId || 'anonymous', 'user', userMessage).run();
    
    await env.DB.prepare(
      "INSERT INTO conversations (session_id, role, content) VALUES (?, ?, ?)"
    ).bind(sessionId || 'anonymous', 'assistant', aiResponse).run();
    
    // Store analytics
    await env.DB.prepare(
      "INSERT INTO chat_analytics (session_id, event_type, event_data) VALUES (?, ?, ?)"
    ).bind(
      sessionId || 'anonymous', 
      'conversation', 
      JSON.stringify({ language, timestamp: new Date().toISOString() })
    ).run();
    
  } catch (error) {
    console.error('Error storing conversation:', error);
  }
}

// Handle embedding generation
async function handleEmbeddingGeneration(request, env) {
  try {
    const { action } = await request.json();
    
    if (action === 'generate_all') {
      await generateAllKnowledgeEmbeddings(env);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'All embeddings generated successfully' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    return createErrorResponse('Invalid action', 400);
    
  } catch (error) {
    return createErrorResponse('Failed to generate embeddings', 500, error.message);
  }
}

// Generate embeddings for all knowledge items
async function generateAllKnowledgeEmbeddings(env) {
  try {
    const itemsWithoutEmbeddings = await env.DB.prepare(`
      SELECT kb.id, kb.title, kb.content, kb.category 
      FROM knowledge_base kb 
      LEFT JOIN knowledge_embeddings ke ON kb.id = ke.knowledge_id 
      WHERE ke.knowledge_id IS NULL AND kb.is_active = 1
    `).all();
    
    for (const item of itemsWithoutEmbeddings.results || []) {
      const text = `${item.title}: ${item.content}`;
      const embedding = await generateEmbedding(env, text);
      
      if (embedding) {
        await env.DB.prepare(
          "INSERT OR REPLACE INTO knowledge_embeddings (knowledge_id, embedding) VALUES (?, ?)"
        ).bind(item.id, JSON.stringify(embedding)).run();
        
        console.log(`Generated embedding for: ${item.title}`);
      }
    }
    
  } catch (error) {
    console.error('Error generating all embeddings:', error);
    throw error;
  }
}

// Handle knowledge request
async function handleKnowledgeRequest(env) {
  try {
    const knowledge = await env.DB.prepare(
      "SELECT category, title, content, keywords, priority FROM knowledge_base WHERE is_active = 1 ORDER BY priority DESC, category ASC"
    ).all();

    return new Response(JSON.stringify(knowledge.results || []), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error) {
    console.error('Error fetching knowledge base:', error);
    return createErrorResponse('Failed to fetch knowledge base', 500);
  }
}

// Utility function to create error responses
function createErrorResponse(message, status = 500, details = null) {
  return new Response(JSON.stringify({ 
    error: message,
    ...(details && { details })
  }), {
    status,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  });
}