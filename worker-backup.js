// Cloudflare Worker for Chatbot Backend with Gemini AI and PostgreSQL
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    console.log('Request:', url.pathname, request.method);
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Add CORS headers to all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    try {
      // API routes
      if (url.pathname.startsWith('/api/')) {
        // Health check endpoint
        if (url.pathname === '/api/health') {
          return new Response(JSON.stringify({ 
            status: 'healthy', 
            timestamp: new Date().toISOString(),
            hasGeminiKey: !!env.GEMINI_API_KEY,
            hasDB: !!env.DB
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Chat endpoint
        if (url.pathname === '/api/chat' && request.method === 'POST') {
          return await handleChatRequest(request, env, corsHeaders);
        }

        // User info storage endpoint
        if (url.pathname === '/api/user-info' && request.method === 'POST') {
          return await handleUserInfoStorage(request, env, corsHeaders);
        }

        // Get conversation history
        if (url.pathname === '/api/conversations' && request.method === 'GET') {
          return await handleGetConversations(request, env, corsHeaders);
        }

        return new Response(JSON.stringify({ error: 'API endpoint not found' }), { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Serve static assets (index.html, css, js files)
      return env.ASSETS.fetch(request);

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

// Handle chat requests with Gemini AI
async function handleChatRequest(request, env, corsHeaders) {
  try {
    const { message, context, sessionId } = await request.json();
    
    // Validate required parameters
    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Check if API key exists
    if (!env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Gemini API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Generate session ID if not provided
    const currentSessionId = sessionId || generateSessionId();
    
    // Store user message in database
    await storeMessage(env, currentSessionId, 'user', message);
    
    // Get conversation context from database
    const conversationHistory = await getRecentConversation(env, currentSessionId);
    
    // Get relevant knowledge from CV database based on user question
    const relevantKnowledge = await searchRelevantKnowledge(env, message);
    
    // Prepare context for Gemini AI
    const yimingContext = await getYimingPersonalInfo(env, context);
    
    // Call Gemini AI with relevant knowledge
    console.log('About to call Gemini AI with message:', message);
    const aiResponse = await callGeminiAI(env, message, yimingContext, conversationHistory, relevantKnowledge);
    console.log('Gemini AI response received:', aiResponse);
    
    // Store AI response in database
    await storeMessage(env, currentSessionId, 'assistant', aiResponse);
    
    return new Response(JSON.stringify({ 
      response: aiResponse,
      sessionId: currentSessionId 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Chat request error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process chat request',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Call Gemini AI API
async function callGeminiAI(env, userMessage, context, conversationHistory, relevantKnowledge = []) {
  const apiKey = env.GEMINI_API_KEY;
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  // Build conversation context with relevant knowledge
  let knowledgeContext = '';
  if (relevantKnowledge && relevantKnowledge.length > 0) {
    knowledgeContext = `\nRelevant Information from Yiming's CV and Background:\n${relevantKnowledge.map(item => `${item.category.toUpperCase()} - ${item.title}: ${item.content}`).join('\n\n')}`;
  }
  
  let systemPrompt = `You are an AI assistant representing Yiming Li, a Master's Student in Embedded Systems. 

Basic Information:
${context}

${knowledgeContext}

Guidelines:
1. Answer questions about Yiming's background, experience, and projects based on the provided CV information
2. Use first person when speaking as Yiming's representative ("Yiming has...", "His experience includes...", etc.)
3. Be helpful, professional, and engaging
4. Provide specific details from his CV when relevant (projects, education, skills, experience)
5. If asked about information not in the CV, acknowledge limitations and suggest contacting Yiming directly
6. Keep responses informative but conversational
7. Highlight his expertise in embedded systems, IoT, AI, and machine learning

Conversation History:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Current Question: ${userMessage}`;

  const requestBody = {
    contents: [{
      parts: [{
        text: systemPrompt
      }]
    }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      }
    ]
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', response.status, errorText);
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Gemini API response:', data);
  
  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    console.error('Unexpected Gemini response structure:', data);
    throw new Error('Invalid response from Gemini API');
  }
  
  return data.candidates[0]?.content?.parts[0]?.text || 'I apologize, but I encountered an issue generating a response. Please try again.';
}

// Get Yiming's personal information from knowledge base
async function getYimingPersonalInfo(env, additionalContext = {}) {
  try {
    // Get relevant information from knowledge base
    const relevantInfo = await getRelevantKnowledge(env, 'general overview', 5);
    
    if (relevantInfo && relevantInfo.length > 0) {
      const contextInfo = relevantInfo.map(item => `${item.title}: ${item.content}`).join('\n\n');
      return contextInfo + (additionalContext ? `\nAdditional Context: ${JSON.stringify(additionalContext)}` : '');
    }
  } catch (error) {
    console.error('Error fetching knowledge base info:', error);
  }
  
  // Fallback to basic info if database query fails
  const baseInfo = `
Name: Yiming Li
Title: Master's Student in Embedded Systems
Education: Currently pursuing Master's in Embedded Systems at EIT Digital Master School (UNIBO & KTH)
Focus Areas: Embedded systems, IoT, AI agents, machine learning

Contact: liyiming-jet@outlook.com, +393349122167
LinkedIn: linkedin.com/in/yiming-li-206a08260
`;

  return baseInfo + (additionalContext ? `\nAdditional Context: ${JSON.stringify(additionalContext)}` : '');
}

// Get relevant knowledge from knowledge base based on query
async function getRelevantKnowledge(env, query, limit = 5) {
  if (!env.DB) {
    return [];
  }

  try {
    // Get all knowledge base entries ordered by priority
    const result = await env.DB.prepare(
      "SELECT category, title, content, keywords FROM knowledge_base WHERE is_active = 1 ORDER BY priority DESC, category ASC LIMIT ?"
    ).bind(limit).all();
    
    return result.results || [];
  } catch (error) {
    console.error('Error fetching knowledge base:', error);
    return [];
  }
}

// Search for relevant knowledge based on user question
async function searchRelevantKnowledge(env, userMessage, limit = 8) {
  if (!env.DB) {
    return [];
  }

  try {
    const messageLower = userMessage.toLowerCase();
    
    // Define keyword mappings for better search
    const searchKeywords = [];
    
    // Education related keywords
    if (messageLower.includes('education') || messageLower.includes('study') || messageLower.includes('school') || 
        messageLower.includes('university') || messageLower.includes('degree') || messageLower.includes('bachelor') || 
        messageLower.includes('master')) {
      searchKeywords.push('education');
    }
    
    // Project related keywords
    if (messageLower.includes('project') || messageLower.includes('work') || messageLower.includes('portfolio') || 
        messageLower.includes('experience') || messageLower.includes('built') || messageLower.includes('developed')) {
      searchKeywords.push('projects');
    }
    
    // Skills related keywords
    if (messageLower.includes('skill') || messageLower.includes('technology') || messageLower.includes('programming') || 
        messageLower.includes('language') || messageLower.includes('python') || messageLower.includes('c++') || 
        messageLower.includes('linux') || messageLower.includes('machine learning') || messageLower.includes('ai')) {
      searchKeywords.push('skills');
    }
    
    // Experience related keywords
    if (messageLower.includes('job') || messageLower.includes('internship') || messageLower.includes('company') || 
        messageLower.includes('career') || messageLower.includes('professional')) {
      searchKeywords.push('experience');
    }
    
    // Contact related keywords
    if (messageLower.includes('contact') || messageLower.includes('email') || messageLower.includes('phone') || 
        messageLower.includes('reach') || messageLower.includes('linkedin')) {
      searchKeywords.push('contact');
    }
    
    // Awards related keywords
    if (messageLower.includes('award') || messageLower.includes('scholarship') || messageLower.includes('achievement') || 
        messageLower.includes('honor')) {
      searchKeywords.push('awards');
    }
    
    // If specific categories are identified, search by category first
    if (searchKeywords.length > 0) {
      const categoryResults = await env.DB.prepare(
        "SELECT category, title, content, keywords FROM knowledge_base WHERE is_active = 1 AND category IN (" + 
        searchKeywords.map(() => '?').join(',') + ") ORDER BY priority DESC LIMIT ?"
      ).bind(...searchKeywords, limit).all();
      
      if (categoryResults.results && categoryResults.results.length > 0) {
        return categoryResults.results;
      }
    }
    
    // Fallback: search by keywords in content or keywords field
    const keywordSearch = await env.DB.prepare(
      `SELECT category, title, content, keywords FROM knowledge_base 
       WHERE is_active = 1 AND (
         content LIKE ? OR 
         keywords LIKE ? OR 
         title LIKE ?
       ) ORDER BY priority DESC LIMIT ?`
    ).bind(`%${messageLower}%`, `%${messageLower}%`, `%${messageLower}%`, limit).all();
    
    if (keywordSearch.results && keywordSearch.results.length > 0) {
      return keywordSearch.results;
    }
    
    // If no specific matches, return general overview
    const generalResults = await env.DB.prepare(
      "SELECT category, title, content, keywords FROM knowledge_base WHERE is_active = 1 ORDER BY priority DESC LIMIT ?"
    ).bind(Math.min(limit, 5)).all();
    
    return generalResults.results || [];
    
  } catch (error) {
    console.error('Error searching knowledge base:', error);
    return [];
  }
}

// Store message in PostgreSQL
async function storeMessage(env, sessionId, role, content) {
  if (!env.DATABASE_URL) {
    console.warn('DATABASE_URL not configured, skipping message storage');
    return;
  }

  try {
    // Note: In production, you'd use a proper PostgreSQL client
    // For now, we'll use a simple HTTP endpoint or D1 database
    const query = `
      INSERT INTO conversations (session_id, role, content, timestamp)
      VALUES ($1, $2, $3, $4)
    `;
    
    // If using Cloudflare D1 instead of PostgreSQL:
    if (env.DB) {
      await env.DB.prepare(
        "INSERT INTO conversations (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)"
      ).bind(sessionId, role, content, new Date().toISOString()).run();
    }
    
    // If using external PostgreSQL, you'd make an HTTP request to your database API
    
  } catch (error) {
    console.error('Error storing message:', error);
    // Don't throw - continue even if storage fails
  }
}

// Get recent conversation history
async function getRecentConversation(env, sessionId, limit = 10) {
  if (!env.DATABASE_URL && !env.DB) {
    return [];
  }

  try {
    if (env.DB) {
      const result = await env.DB.prepare(
        "SELECT role, content FROM conversations WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?"
      ).bind(sessionId, limit).all();
      
      return result.results.reverse(); // Reverse to get chronological order
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return [];
  }
}

// Handle user information storage
async function handleUserInfoStorage(request, env, corsHeaders) {
  try {
    const userInfo = await request.json();
    
    // Store user information (email, preferences, etc.)
    if (env.DB) {
      await env.DB.prepare(
        "INSERT OR REPLACE INTO user_info (session_id, email, preferences, timestamp) VALUES (?, ?, ?, ?)"
      ).bind(
        userInfo.sessionId,
        userInfo.email || null,
        JSON.stringify(userInfo.preferences || {}),
        new Date().toISOString()
      ).run();
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error storing user info:', error);
    return new Response(JSON.stringify({ error: 'Failed to store user information' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Handle getting conversation history
async function handleGetConversations(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    
    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Session ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const conversations = await getRecentConversation(env, sessionId, 50);
    
    return new Response(JSON.stringify({ conversations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch conversations' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Generate unique session ID
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}