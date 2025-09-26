-- Database schema for chatbot with PostgreSQL/D1
-- This can be used for both PostgreSQL and Cloudflare D1

-- Conversations table to store chat history
CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User information table to store personal details collected during chat
CREATE TABLE IF NOT EXISTS user_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,
    email TEXT,
    name TEXT,
    preferences TEXT, -- JSON string for storing user preferences
    contact_reason TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Analytics table to track chatbot usage
CREATE TABLE IF NOT EXISTS chat_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'session_start', 'message_sent', 'session_end'
    event_data TEXT, -- JSON string for additional data
    user_agent TEXT,
    ip_address TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge base table for storing Yiming's information (RAG)
CREATE TABLE IF NOT EXISTS knowledge_base (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL, -- 'education', 'experience', 'projects', 'skills', etc.
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    keywords TEXT, -- Comma-separated keywords for search
    priority INTEGER DEFAULT 0, -- Higher priority content shown first
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Embeddings table for vector search (stores Gemini embeddings per knowledge item)
CREATE TABLE IF NOT EXISTS knowledge_embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    knowledge_id INTEGER UNIQUE NOT NULL,
    embedding TEXT NOT NULL, -- JSON array of floats as string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (knowledge_id) REFERENCES knowledge_base(id) ON DELETE CASCADE
);

-- Embedding cache table for lazy generation (stores query embeddings)
CREATE TABLE IF NOT EXISTS embedding_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text_hash TEXT UNIQUE NOT NULL,
    text_snippet TEXT NOT NULL, -- First 100 chars for reference
    embedding TEXT NOT NULL, -- JSON array of floats as string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 1
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_info_session_id ON user_info(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_analytics_session_id ON chat_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_keywords ON knowledge_base(keywords);
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_knowledge_id ON knowledge_embeddings(knowledge_id);
CREATE INDEX IF NOT EXISTS idx_embedding_cache_text_hash ON embedding_cache(text_hash);
CREATE INDEX IF NOT EXISTS idx_embedding_cache_created_at ON embedding_cache(created_at);

-- Sample data for knowledge base
INSERT OR IGNORE INTO knowledge_base (category, title, content, keywords, priority) VALUES
('personal', 'Basic Information', 'Yiming Li is an Embedded Systems Engineer and AI Enthusiast currently pursuing a Master''s degree in Embedded Systems at EIT Digital. He focuses on building the future with IoT, AI agents, and real-time systems.', 'name,education,background,introduction', 10),

('education', 'Current Studies', 'Currently pursuing Master''s in Embedded Systems at EIT Digital, focusing on advanced IoT technologies, real-time systems, and AI integration in embedded environments.', 'education,master,eit digital,embedded systems,iot', 9),

('skills', 'Technical Expertise', 'Expertise includes embedded programming, IoT development and protocols, AI/ML implementation on edge devices, real-time operating systems, and hardware-software integration.', 'skills,programming,iot,ai,embedded,real-time', 8),

('experience', 'Professional Background', 'Experience in embedded systems development, IoT implementation and integration, AI/ML applications in embedded contexts, real-time systems programming, and cross-platform development.', 'experience,embedded,iot,ai,real-time,development', 8),

('projects', 'Focus Areas', 'Current focus on building intelligent embedded systems, developing AI agents for IoT applications, research in edge computing, and creating innovative solutions that bridge hardware and software.', 'projects,iot,ai agents,edge computing,embedded', 7),

('contact', 'Getting in Touch', 'Available for professional inquiries, collaboration opportunities, and project discussions. Contact information can be found in the contact section of this website.', 'contact,email,collaboration,opportunities', 6);

-- Trigger to update updated_at timestamp (for databases that support triggers)
-- Note: D1 may not support all trigger features
CREATE TRIGGER IF NOT EXISTS update_user_info_timestamp 
    AFTER UPDATE ON user_info
    BEGIN
        UPDATE user_info SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_knowledge_base_timestamp 
    AFTER UPDATE ON knowledge_base
    BEGIN
        UPDATE knowledge_base SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;