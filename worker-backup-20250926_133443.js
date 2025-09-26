// Simplified Worker for debugging
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Health check
    if (url.pathname === '/api/health' && request.method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok', message: 'AI assistant online' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Chat endpoint
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      return await handleChatRequest(request, env);
    }

    // Serve static files
    return env.ASSETS.fetch(request);
  }
};

async function handleChatRequest(request, env) {
  try {
    const { message, sessionId } = await request.json();
    
    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    console.log('Processing message:', message);

    // Simple keyword search for now
    const relevantKnowledge = await keywordSearch(env, message);
    console.log('Found knowledge items:', relevantKnowledge.length);
    console.log('Knowledge categories found:', relevantKnowledge.map(k => k.category));

    // Generate response
    const response = await generateResponse(env, message, relevantKnowledge);
    console.log('Generated response length:', response.length);

    // Store conversation (simplified)
    try {
      await env.DB.prepare(
        "INSERT INTO conversations (session_id, role, content) VALUES (?, ?, ?)"
      ).bind(sessionId || 'anonymous', 'user', message).run();
      
      await env.DB.prepare(
        "INSERT INTO conversations (session_id, role, content) VALUES (?, ?, ?)"
      ).bind(sessionId || 'anonymous', 'assistant', response).run();
    } catch (dbError) {
      console.error('Database error (non-fatal):', dbError);
    }

    return new Response(JSON.stringify({ 
      response: response,
      relevantSources: relevantKnowledge.map(item => ({
        category: item.category,
        title: item.title,
        score: item.score || 1
      }))
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (error) {
    console.error('Chat request error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process chat request',
      details: error.message
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}

async function keywordSearch(env, userMessage) {
  try {
    const message = userMessage.toLowerCase();
    
    // Category mapping with Chinese support
    const categoryKeywords = {
      'education': ['education', 'university', 'degree', 'study', 'academic', 'school', 'master', '教育', '大学', '学位', '学习', '学校', '硕士'],
      'experience': ['experience', 'work', 'job', 'career', 'professional', 'employment', '经验', '工作', '职业', '就业', '实习'],
      'projects': ['project', 'built', 'developed', 'created', 'designed', 'portfolio', '项目', '开发', '设计', '构建', '作品'],
      'skills': ['skill', 'technology', 'programming', 'language', 'framework', 'tool', '技能', '技术', '编程', '程序', '框架', '工具'],
      'awards': ['award', 'scholarship', 'prize', 'achievement', 'recognition', 'honor', '奖学金', '奖项', '荣誉', '获奖', '奖励', '成就', '拿过', '得过'],
      'contact': ['contact', 'email', 'phone', 'reach', 'connect', 'location', '联系', '邮箱', '电话', '地址'],
      'personal': ['about', 'who', 'background', 'introduction', 'name', '关于', '介绍', '背景', '个人', '是谁'],
      'languages': ['language', 'english', 'chinese', 'speak', 'fluent', 'proficiency', '语言', '英语', '中文', '流利'],
      'interests': ['hobby', 'interest', 'swimming', 'photography', 'gym', 'personal', '爱好', '兴趣', '游泳', '摄影', '健身']
    };
    
    let results = [];
    
    // Search by categories first
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => message.includes(keyword))) {
        console.log('Searching category:', category);
        const categoryResults = await env.DB.prepare(
          "SELECT category, title, content, keywords, priority FROM knowledge_base WHERE is_active = 1 AND category = ? ORDER BY priority DESC"
        ).bind(category).all();
        
        if (categoryResults.results) {
          results.push(...categoryResults.results.map(item => ({
            ...item,
            score: 0.8
          })));
        }
      }
    }
    
    // Special handling for scholarship/award queries
    if (message.includes('奖学金') || message.includes('奖') || message.includes('拿过') || message.includes('得过') || message.includes('荣誉')) {
      console.log('Detected Chinese scholarship query');
      const awardResults = await env.DB.prepare(
        "SELECT category, title, content, keywords, priority FROM knowledge_base WHERE category = 'awards' ORDER BY priority DESC"
      ).all();
      
      if (awardResults.results) {
        results.push(...awardResults.results.map(item => ({
          ...item,
          score: 0.9
        })));
      }
    }
    
    // If no category matches, search content
    if (results.length === 0) {
      console.log('Fallback content search');
      const contentResults = await env.DB.prepare(
        "SELECT category, title, content, keywords, priority FROM knowledge_base WHERE is_active = 1 ORDER BY priority DESC LIMIT 3"
      ).all();
      
      if (contentResults.results) {
        results.push(...contentResults.results.map(item => ({
          ...item,
          score: 0.5
        })));
      }
    }
    
    return results.slice(0, 5); // Limit results
    
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

async function generateResponse(env, userMessage, relevantKnowledge) {
  try {
    // Build context from relevant knowledge
    let knowledgeContext = '';
    if (relevantKnowledge && relevantKnowledge.length > 0) {
      knowledgeContext = `\nRelevant Information about Yiming:\n` +
        relevantKnowledge.map((item, index) => 
          `${index + 1}. [${item.category.toUpperCase()}] ${item.title}: ${item.content}`
        ).join('\n\n');
    }

    // Check if question is about scholarships/awards in any language
    const isAwardQuery = /奖学金|奖项|荣誉|获奖|奖励|scholarship|award|prize|achievement|recognition/i.test(userMessage);
    
    let awardInfo = '';
    if (isAwardQuery) {
      awardInfo = `\n\nIMPORTANT SCHOLARSHIP/AWARD INFORMATION:
- EIT Digital Master School Scholarship (2024-2026): Merit-based award for top international candidates
- National Encouragement Scholarship (2021, 2022): Chinese national award for academic excellence  
- First Prize Academic Scholarship (2021): Top academic performance award`;
    }

    const prompt = `You are Yiming Li's AI assistant. Answer questions about Yiming professionally and helpfully.

INSTRUCTIONS:
1. Use the relevant information provided below to answer questions accurately
2. Be conversational, friendly, and professional
3. If asked about scholarships/awards, use the scholarship information provided
4. Focus on the most relevant information from the context
5. Keep responses concise but informative
6. Answer in the same language as the question when possible

USER QUESTION: ${userMessage}
${knowledgeContext}${awardInfo}

Please provide a helpful response based on the context above:`;

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
          maxOutputTokens: 1024
        }
      })
    });

    console.log('Gemini API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      
      // Fallback to template response
      return generateFallbackResponse(userMessage, relevantKnowledge);
    }

    const data = await response.json();
    console.log('Gemini response received successfully');
    
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      console.error('No text in Gemini response:', JSON.stringify(data));
      return generateFallbackResponse(userMessage, relevantKnowledge);
    }
    
    return generatedText;

  } catch (error) {
    console.error('Response generation error:', error);
    return generateFallbackResponse(userMessage, relevantKnowledge);
  }
}

// Fallback response function
function generateFallbackResponse(userMessage, relevantKnowledge) {
  const message = userMessage.toLowerCase();
  
  if (relevantKnowledge && relevantKnowledge.length > 0) {
    const firstResult = relevantKnowledge[0];
    
    if (firstResult.category === 'awards') {
      return `Regarding Yiming's awards and scholarships: ${firstResult.content}. He has received several prestigious recognitions for his academic excellence and achievements.`;
    } else if (firstResult.category === 'education') {
      return `Based on what I know about Yiming's education: ${firstResult.content}. He's focused on advancing his expertise in embedded systems and IoT technologies.`;
    } else if (firstResult.category === 'experience') {
      return `Regarding Yiming's professional experience: ${firstResult.content}. His work spans both hardware and software development in embedded systems.`;
    } else if (firstResult.category === 'projects') {
      return `About Yiming's projects: ${firstResult.content}. He's particularly passionate about bridging AI and embedded systems.`;
    } else if (firstResult.category === 'skills') {
      return `Yiming's technical expertise includes: ${firstResult.content}. He specializes in modern embedded development and IoT solutions.`;
    } else if (firstResult.category === 'languages') {
      return `Regarding Yiming's language abilities: ${firstResult.content}. This multilingual capability supports his international academic and professional endeavors.`;
    } else if (firstResult.category === 'interests') {
      return `About Yiming's personal interests: ${firstResult.content}. These activities reflect his well-rounded personality and commitment to personal development.`;
    } else if (firstResult.category === 'personal') {
      return `Let me tell you about Yiming: ${firstResult.content}. Feel free to ask about specific aspects of his work or background!`;
    } else if (firstResult.category === 'contact') {
      return `${firstResult.content}. You can reach out to discuss potential collaborations or opportunities in embedded systems and AI.`;
    }
  }
  
  if (message.includes('hello') || message.includes('hi')) {
    return "Hello! I'm Yiming's AI assistant. I can help you learn about his background in embedded systems, education at EIT Digital, projects in IoT and AI, awards and scholarships, or his professional experience. What would you like to know?";
  }
  
  return "Thank you for your question! I have information about Yiming's background including education, projects, awards, skills, and experience. Please feel free to ask specific questions or contact him directly through this website.";
}