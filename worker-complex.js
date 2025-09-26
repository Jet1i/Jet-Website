// Enhanced Cloudflare Worker with Vector + Keyword Fusion RAG
// Includes lazy embedding generation and hybrid search

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

    // API routes
    if (url.pathname === '/api/health' && request.method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok', message: 'AI assistant online' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
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

// Enhanced chat handler with vector + keyword fusion
async function handleChatRequest(request, env) {
  try {
    const { message, sessionId } = await request.json();
    
    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Enhanced knowledge retrieval with vector + keyword fusion
    const relevantKnowledge = await hybridSearchKnowledge(env, message);
    
    // Generate response with enhanced context
    const response = await generateEnhancedResponse(env, message, relevantKnowledge, sessionId);
    
    // Store conversation
    await storeConversation(env, sessionId, message, response);
    
    return new Response(JSON.stringify({ 
      response: response,
      relevantSources: relevantKnowledge.map(item => ({
        category: item.category,
        title: item.title,
        score: item.score
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
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({ 
      error: 'Failed to process chat request',
      details: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}

// Hybrid search: Vector + Keyword fusion with lazy embedding generation
async function hybridSearchKnowledge(env, userMessage, limit = 8) {
  try {
    console.log('Starting hybrid search for:', userMessage);
    
    // Step 1: Get or generate query embedding
    const queryEmbedding = await getOrGenerateEmbedding(env, userMessage);
    
    // Step 2: Ensure all knowledge base items have embeddings (lazy generation)
    await ensureKnowledgeEmbeddings(env);
    
    // Step 3: Perform vector search
    const vectorResults = await vectorSearch(env, queryEmbedding, limit * 2);
    
    // Step 4: Perform keyword search
    const keywordResults = await keywordSearch(env, userMessage, limit * 2);
    
    // Step 5: Fusion scoring (combine vector + keyword results)
    const fusedResults = await fuseSearchResults(vectorResults, keywordResults, limit);
    
    console.log(`Hybrid search returned ${fusedResults.length} results`);
    return fusedResults;
    
  } catch (error) {
    console.error('Hybrid search error:', error);
    // Fallback to keyword-only search
    return await keywordSearch(env, userMessage, limit);
  }
}

// Get or generate embedding for text (lazy generation)
async function getOrGenerateEmbedding(env, text, useCache = true) {
  try {
    const textHash = await hashText(text);
    
    // Check cache first
    if (useCache) {
      const cached = await env.DB.prepare(
        "SELECT embedding FROM embedding_cache WHERE text_hash = ? AND created_at > datetime('now', '-7 days')"
      ).bind(textHash).first();
      
      if (cached) {
        return JSON.parse(cached.embedding);
      }
    }
    
    // Generate new embedding using Gemini
    const embedding = await generateEmbedding(env, text);
    
    // Cache the embedding
    if (useCache && embedding) {
      await env.DB.prepare(
        "INSERT OR REPLACE INTO embedding_cache (text_hash, text_snippet, embedding) VALUES (?, ?, ?)"
      ).bind(textHash, text.substring(0, 100), JSON.stringify(embedding)).run();
    }
    
    return embedding;
    
  } catch (error) {
    console.error('Error getting/generating embedding:', error);
    return null;
  }
}

// Generate embedding using Gemini API
async function generateEmbedding(env, text) {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'models/embedding-001',
        content: {
          parts: [{ text: text }]
        }
      })
    });

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

// Ensure all knowledge base items have embeddings (lazy generation)
async function ensureKnowledgeEmbeddings(env) {
  try {
    // Get knowledge items without embeddings
    const itemsWithoutEmbeddings = await env.DB.prepare(`
      SELECT kb.id, kb.title, kb.content, kb.category 
      FROM knowledge_base kb 
      LEFT JOIN knowledge_embeddings ke ON kb.id = ke.knowledge_id 
      WHERE ke.knowledge_id IS NULL AND kb.is_active = 1
      LIMIT 10
    `).all();
    
    // Generate embeddings for items that don't have them
    for (const item of itemsWithoutEmbeddings.results || []) {
      const text = `${item.title}: ${item.content}`;
      const embedding = await generateEmbedding(env, text);
      
      if (embedding) {
        await env.DB.prepare(
          "INSERT OR REPLACE INTO knowledge_embeddings (knowledge_id, embedding) VALUES (?, ?)"
        ).bind(item.id, JSON.stringify(embedding)).run();
        
        console.log(`Generated embedding for knowledge item ${item.id}: ${item.title}`);
      }
    }
    
  } catch (error) {
    console.error('Error ensuring knowledge embeddings:', error);
  }
}

// Vector search using cosine similarity
async function vectorSearch(env, queryEmbedding, limit = 10) {
  try {
    if (!queryEmbedding) return [];
    
    // Get all knowledge items with embeddings
    const knowledgeWithEmbeddings = await env.DB.prepare(`
      SELECT kb.id, kb.category, kb.title, kb.content, kb.keywords, kb.priority,
             ke.embedding
      FROM knowledge_base kb
      JOIN knowledge_embeddings ke ON kb.id = ke.knowledge_id
      WHERE kb.is_active = 1
    `).all();
    
    const results = [];
    
    for (const item of knowledgeWithEmbeddings.results || []) {
      try {
        const itemEmbedding = JSON.parse(item.embedding);
        const similarity = cosineSimilarity(queryEmbedding, itemEmbedding);
        
        results.push({
          ...item,
          vector_score: similarity,
          score: similarity * 0.7 + (item.priority / 10) * 0.3 // Boost with priority
        });
      } catch (e) {
        console.error(`Error processing embedding for item ${item.id}:`, e);
      }
    }
    
    // Sort by similarity and return top results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
  } catch (error) {
    console.error('Vector search error:', error);
    return [];
  }
}

// Enhanced keyword search
async function keywordSearch(env, userMessage, limit = 10) {
  try {
    const message = userMessage.toLowerCase();
    const searchTerms = extractSearchTerms(message);
    
    // Category-based search with enhanced mapping
    const categoryKeywords = {
      'education': ['education', 'university', 'degree', 'study', 'academic', 'school', 'graduate'],
      'experience': ['experience', 'work', 'job', 'career', 'professional', 'employment', 'position'],
      'projects': ['project', 'built', 'developed', 'created', 'designed', 'implemented', 'portfolio'],
      'skills': ['skill', 'technology', 'programming', 'language', 'framework', 'tool', 'expertise'],
      'awards': ['award', 'achievement', 'recognition', 'honor', 'prize', 'certificate'],
      'contact': ['contact', 'email', 'phone', 'reach', 'connect', 'location', 'address']
    };
    
    let results = [];
    
    // Search by categories
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => message.includes(keyword))) {
        const categoryResults = await env.DB.prepare(
          "SELECT *, ? as keyword_score FROM knowledge_base WHERE is_active = 1 AND category = ? ORDER BY priority DESC"
        ).bind(0.8, category).all();
        
        results.push(...(categoryResults.results || []));
      }
    }
    
    // Content and keyword field search
    if (searchTerms.length > 0) {
      const searchPattern = searchTerms.map(term => `%${term}%`);
      const contentResults = await env.DB.prepare(`
        SELECT *, 0.6 as keyword_score FROM knowledge_base 
        WHERE is_active = 1 AND (
          ${searchTerms.map(() => 'LOWER(content) LIKE ?').join(' OR ')} OR
          ${searchTerms.map(() => 'LOWER(keywords) LIKE ?').join(' OR ')} OR
          ${searchTerms.map(() => 'LOWER(title) LIKE ?').join(' OR ')}
        )
        ORDER BY priority DESC
      `).bind(...searchPattern, ...searchPattern, ...searchPattern).all();
      
      results.push(...(contentResults.results || []));
    }
    
    // Remove duplicates and calculate final scores
    const uniqueResults = [];
    const seenIds = new Set();
    
    for (const item of results) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        uniqueResults.push({
          ...item,
          score: (item.keyword_score || 0.5) + (item.priority / 10) * 0.2
        });
      }
    }
    
    return uniqueResults
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
  } catch (error) {
    console.error('Keyword search error:', error);
    return [];
  }
}

// Fusion scoring: combine vector and keyword results
async function fuseSearchResults(vectorResults, keywordResults, limit = 8) {
  const resultMap = new Map();
  
  // Add vector results
  vectorResults.forEach(item => {
    resultMap.set(item.id, {
      ...item,
      vector_score: item.score || 0,
      keyword_score: 0,
      combined_score: item.score || 0
    });
  });
  
  // Add/update with keyword results
  keywordResults.forEach(item => {
    if (resultMap.has(item.id)) {
      const existing = resultMap.get(item.id);
      existing.keyword_score = item.score || 0;
      // Fusion formula: weighted combination
      existing.combined_score = (existing.vector_score * 0.6) + (existing.keyword_score * 0.4);
    } else {
      resultMap.set(item.id, {
        ...item,
        vector_score: 0,
        keyword_score: item.score || 0,
        combined_score: (item.score || 0) * 0.4
      });
    }
  });
  
  // Sort by combined score and return top results
  return Array.from(resultMap.values())
    .sort((a, b) => b.combined_score - a.combined_score)
    .slice(0, limit)
    .map(item => ({
      ...item,
      score: item.combined_score
    }));
}

// Utility functions
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

function extractSearchTerms(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(term => term.length > 2)
    .slice(0, 10); // Limit to 10 terms
}

async function hashText(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Enhanced response generation with better context
async function generateEnhancedResponse(env, userMessage, relevantKnowledge, sessionId) {
  try {
    // Build enhanced context
    let knowledgeContext = '';
    if (relevantKnowledge && relevantKnowledge.length > 0) {
      knowledgeContext = `\nRelevant Information (ordered by relevance):\n` +
        relevantKnowledge.map((item, index) => 
          `${index + 1}. [${item.category.toUpperCase()}] ${item.title}: ${item.content} (Relevance: ${(item.score * 100).toFixed(1)}%)`
        ).join('\n\n');
    }

    const prompt = `You are Yiming Li's AI assistant. Answer questions about Yiming professionally and helpfully.

INSTRUCTIONS:
1. Use information from the relevant context below to answer questions
2. Be conversational and helpful
3. If information isn't available, acknowledge limitations and suggest contacting Yiming directly
4. Focus on the most relevant information based on the relevance scores
5. Prioritize recent and high-relevance information

USER QUESTION: ${userMessage}
${knowledgeContext}

Please provide a helpful response:`;

    console.log('Calling Gemini API with prompt length:', prompt.length);
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    });

    console.log('Gemini API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Gemini API response data keys:', Object.keys(data));
    
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      console.error('No text generated from Gemini response:', JSON.stringify(data));
      throw new Error('No text generated from Gemini API');
    }
    
    return generatedText;

  } catch (error) {
    console.error('Enhanced response generation error:', error);
    return 'I apologize, but I encountered an issue. Please try again or contact Yiming directly.';
  }
}

// Handle embedding generation endpoint
async function handleEmbeddingGeneration(request, env) {
  try {
    const { action } = await request.json();
    
    if (action === 'generate_all') {
      await ensureKnowledgeEmbeddings(env);
      return new Response(JSON.stringify({ success: true, message: 'Embeddings generated successfully' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Store conversation (fixed schema)
async function storeConversation(env, sessionId, userMessage, aiResponse) {
  try {
    // Store user message
    await env.DB.prepare(
      "INSERT INTO conversations (session_id, role, content) VALUES (?, ?, ?)"
    ).bind(sessionId || 'anonymous', 'user', userMessage).run();
    
    // Store AI response
    await env.DB.prepare(
      "INSERT INTO conversations (session_id, role, content) VALUES (?, ?, ?)"
    ).bind(sessionId || 'anonymous', 'assistant', aiResponse).run();
  } catch (error) {
    console.error('Error storing conversation:', error);
  }
}

// Handle knowledge request (same as before)
async function handleKnowledgeRequest(env) {
  try {
    const knowledge = await env.DB.prepare(
      "SELECT category, title, content, keywords FROM knowledge_base WHERE is_active = 1 ORDER BY priority DESC, category ASC LIMIT ?"
    ).bind(20).all();

    return new Response(JSON.stringify(knowledge.results || []), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error) {
    console.error('Error fetching knowledge base:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch knowledge base' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}