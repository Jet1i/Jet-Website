// Optimized Chatbot Implementation for Gemini 2.5 Flash RAG System
class OptimizedChatBot {
    constructor() {
        this.isOpen = false;
        this.isConnected = false;
        this.apiEndpoint = '/api/chat';
        this.healthEndpoint = '/api/health';
        this.sessionId = this.generateSessionId();
        this.messageHistory = [];
        this.isTyping = false;
        this.isLoading = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.consecutiveErrors = 0;
        this.lastLanguage = 'auto';
        
        this.init();
    }

    init() {
        this.createChatbotHTML();
        this.attachEventListeners();
        this.checkConnection();
        this.addWelcomeMessage();
        this.setupIntersectionObserver();
        this.updatePlaceholderText();
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    createChatbotHTML() {
        const chatbotHTML = `
            <div class="chatbot-container">
                <button class="chatbot-toggle" id="chatbot-toggle" aria-label="Open chat">
                    <i class="fas fa-robot" id="chatbot-icon"></i>
                    <span class="chatbot-badge" id="chatbot-badge" style="display: none;">1</span>
                </button>
                <div class="chatbot-window" id="chatbot-window">
                    <div class="chatbot-header">
                        <div class="chatbot-title">
                            <div class="chatbot-status" id="chatbot-status-indicator"></div>
                            <span>Chat with Yiming</span>
                            <div class="chatbot-version">v2.5</div>
                        </div>
                        <div class="chatbot-actions">
                            <button class="chatbot-action" id="chatbot-clear" title="Clear conversation" aria-label="Clear conversation">
                                <i class="fas fa-trash"></i>
                            </button>
                            <button class="chatbot-close" id="chatbot-close" aria-label="Close chat">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div class="connection-status" id="connection-status">
                        Connecting to AI assistant...
                    </div>
                    <div class="chatbot-messages" id="chatbot-messages">
                    </div>
                    <div class="chatbot-input-area">
                        <div class="chatbot-suggestions" id="chatbot-suggestions">
                            <button class="suggestion-btn" data-text="Tell me about Yiming's education">🎓 Education</button>
                            <button class="suggestion-btn" data-text="What projects has Yiming worked on?">💻 Projects</button>
                            <button class="suggestion-btn" data-text="What are Yiming's technical skills?">🛠️ Skills</button>
                            <button class="suggestion-btn" data-text="What awards has Yiming received?">🏆 Awards</button>
                        </div>
                        <div class="chatbot-input-container">
                            <textarea 
                                class="chatbot-input" 
                                id="chatbot-input" 
                                placeholder="Ask me about Yiming..."
                                rows="1"
                                maxlength="500"
                            ></textarea>
                            <div class="chatbot-input-actions">
                                <button class="chatbot-voice" id="chatbot-voice" title="Voice input" aria-label="Voice input">
                                    <i class="fas fa-microphone"></i>
                                </button>
                                <button class="chatbot-send" id="chatbot-send" aria-label="Send message">
                                    <i class="fas fa-paper-plane"></i>
                                </button>
                            </div>
                        </div>
                        <div class="chatbot-footer">
                            <span class="chatbot-info">Powered by Gemini 2.5 Flash</span>
                            <span class="chatbot-count" id="message-count">0/500</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', chatbotHTML);
    }

    attachEventListeners() {
        // Toggle chatbot
        document.getElementById('chatbot-toggle').addEventListener('click', () => {
            this.toggleChatbot();
        });

        // Close chatbot
        document.getElementById('chatbot-close').addEventListener('click', () => {
            this.closeChatbot();
        });

        // Clear conversation
        document.getElementById('chatbot-clear').addEventListener('click', () => {
            this.clearConversation();
        });

        // Input handling
        const input = document.getElementById('chatbot-input');
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            }
        });

        input.addEventListener('input', () => {
            this.handleInputChange();
        });

        // Mobile keyboard handling
        if (this.isMobile()) {
            input.addEventListener('focus', () => {
                this.handleMobileKeyboardOpen();
            });
            
            input.addEventListener('blur', () => {
                this.handleMobileKeyboardClose();
            });
        }

        // Send button
        document.getElementById('chatbot-send').addEventListener('click', () => {
            this.handleSendMessage();
        });

        // Voice input (if supported)
        document.getElementById('chatbot-voice').addEventListener('click', () => {
            this.handleVoiceInput();
        });

        // Suggestion buttons
        document.getElementById('chatbot-suggestions').addEventListener('click', (e) => {
            if (e.target.classList.contains('suggestion-btn')) {
                const text = e.target.getAttribute('data-text');
                this.handleSuggestionClick(text);
            }
        });

        // Keyboard shortcuts (desktop only)
        if (!this.isMobile()) {
            document.addEventListener('keydown', (e) => {
                if (e.altKey && e.key === 'c') {
                    this.toggleChatbot();
                }
            });
        }

        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleWindowResize();
            this.updatePlaceholderText();
        });

        // Prevent body scroll when chatbot is open on mobile
        if (this.isMobile()) {
            document.addEventListener('touchmove', (e) => {
                if (this.isOpen && !document.getElementById('chatbot-messages').contains(e.target)) {
                    e.preventDefault();
                }
            }, { passive: false });
        }
    }

    setupIntersectionObserver() {
        // Auto-scroll to bottom when new messages are added
        const messagesContainer = document.getElementById('chatbot-messages');
        const observer = new MutationObserver(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
        
        observer.observe(messagesContainer, { childList: true });
    }

    async checkConnection() {
        try {
            const response = await fetch(this.healthEndpoint);
            const data = await response.json();
            
            if (response.ok && data.status === 'ok') {
                this.isConnected = true;
                this.updateConnectionStatus('connected', data.message || 'AI assistant online');
                this.retryCount = 0;
            } else {
                throw new Error('Health check failed');
            }
        } catch (error) {
            console.error('Connection check failed:', error);
            this.isConnected = false;
            this.updateConnectionStatus('error', 'Connection failed. Retrying...');
            
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                setTimeout(() => this.checkConnection(), 2000 * this.retryCount);
            } else {
                this.updateConnectionStatus('error', 'Unable to connect to AI assistant');
            }
        }
    }

    updateConnectionStatus(status, message) {
        const statusElement = document.getElementById('connection-status');
        const statusIndicator = document.getElementById('chatbot-status-indicator');
        
        statusElement.textContent = message;
        statusElement.className = `connection-status ${status}`;
        statusIndicator.className = `chatbot-status ${status}`;
        
        if (status === 'connected') {
            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 2000);
        } else {
            statusElement.style.display = 'block';
        }
    }

    addWelcomeMessage() {
        const welcomeMessages = [
            {
                text: "Hello! I'm Yiming's AI assistant. I can help you learn about his background, projects, skills, and achievements. Feel free to ask me anything in English or Chinese!",
                isUser: false
            }
        ];

        welcomeMessages.forEach(msg => this.addMessage(msg.text, msg.isUser));
        this.hideSuggestions();
    }

    addMessage(text, isUser, metadata = null) {
        const messagesContainer = document.getElementById('chatbot-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chatbot-message ${isUser ? 'user' : 'assistant'}`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        if (isUser) {
            messageContent.textContent = text;
        } else {
            // Parse markdown-like formatting for assistant messages
            messageContent.innerHTML = this.parseMessageContent(text);
        }
        
        messageDiv.appendChild(messageContent);
        
        // Add metadata if available
        if (metadata && !isUser) {
            const metadataDiv = document.createElement('div');
            metadataDiv.className = 'message-metadata';
            
            if (metadata.relevantSources && metadata.relevantSources.length > 0) {
                const sourcesDiv = document.createElement('div');
                sourcesDiv.className = 'message-sources';
                sourcesDiv.innerHTML = `
                    <span class="sources-label"><i class="fas fa-book"></i> Sources:</span>
                    ${metadata.relevantSources.map(source => 
                        `<span class="source-tag" title="${source.title}">
                            <i class="fas fa-tag"></i>
                            ${this.getCategoryDisplayName(source.category)} 
                            <span class="confidence-badge">${source.confidence}%</span>
                        </span>`
                    ).join('')}
                `;
                metadataDiv.appendChild(sourcesDiv);
            }
            
            if (metadata.metadata) {
                const infoDiv = document.createElement('div');
                infoDiv.className = 'message-info';
                infoDiv.innerHTML = `
                    <small>
                        Language: ${metadata.metadata.language} | 
                        Sources: ${metadata.metadata.knowledgeItemsUsed}
                    </small>
                `;
                metadataDiv.appendChild(infoDiv);
            }
            
            messageDiv.appendChild(metadataDiv);
        }
        
        // Add timestamp
        const timestamp = document.createElement('div');
        timestamp.className = 'message-timestamp';
        timestamp.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        messageDiv.appendChild(timestamp);
        
        messagesContainer.appendChild(messageDiv);
        
        // Store in history
        this.messageHistory.push({ text, isUser, timestamp: new Date().toISOString(), metadata });
        
        // Auto-scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Hide suggestions after first message
        if (this.messageHistory.length > 1) {
            this.hideSuggestions();
        }
    }

    parseMessageContent(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    addTypingIndicator() {
        if (this.isTyping) return;
        
        this.isTyping = true;
        const messagesContainer = document.getElementById('chatbot-messages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chatbot-message assistant typing';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="message-content">
                <div class="typing-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    removeTypingIndicator() {
        this.isTyping = false;
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    handleInputChange() {
        const input = document.getElementById('chatbot-input');
        const counter = document.getElementById('message-count');
        const sendBtn = document.getElementById('chatbot-send');
        
        counter.textContent = `${input.value.length}/500`;
        sendBtn.disabled = input.value.trim().length === 0;
        
        // Enhanced auto-resize textarea with mobile optimization
        const isMobile = window.innerWidth <= 768;
        const maxHeight = isMobile ? 80 : 100;
        
        input.style.height = 'auto';
        const newHeight = Math.min(input.scrollHeight, maxHeight);
        input.style.height = newHeight + 'px';
        
        // Ensure input is visible on mobile when typing
        if (isMobile && this.isOpen) {
            setTimeout(() => {
                input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        }
    }

    async handleSendMessage() {
        const input = document.getElementById('chatbot-input');
        const message = input.value.trim();
        
        if (!message || this.isTyping || this.isLoading) return;
        
        if (!this.isConnected) {
            this.showError('Not connected to AI assistant. Please try again later.');
            return;
        }
        
        // Add user message
        this.addMessage(message, true);
        input.value = '';
        this.handleInputChange();
        
        // Show typing indicator and set loading state
        this.addTypingIndicator();
        this.setLoadingState(true);
        
        try {
            const response = await this.sendMessageWithRetry(message);
            this.removeTypingIndicator();
            this.setLoadingState(false);
            
            if (response.response) {
                this.addMessage(response.response, false, response);
                this.lastLanguage = response.metadata?.language || 'auto';
                this.consecutiveErrors = 0; // Reset error count on success
            } else {
                throw new Error('No response received');
            }
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.removeTypingIndicator();
            this.setLoadingState(false);
            this.consecutiveErrors++;
            this.showError(this.getEnhancedErrorMessage(error));
        }
    }

    // Frontend language detection (more reliable)
    detectLanguageOnFrontend(text) {
        // Check for Chinese characters
        const chineseRegex = /[\u4e00-\u9fff]/;
        if (chineseRegex.test(text)) {
            return 'zh';
        }
        
        // Check for common Chinese words
        const chineseWords = ['李一鸣', '一鸣', '你好', '什么', '哪里', '工作', '论文', '找', '在', '的', '是', '了', '和', '有', '他', '她', '我', '你'];
        if (chineseWords.some(word => text.includes(word))) {
            return 'zh';
        }
        
        return 'en';
    }

    async sendMessageWithRetry(message, maxRetries = 3) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await this.sendToAPI(message);
                return response;
            } catch (error) {
                lastError = error;
                console.error(`Attempt ${attempt} failed:`, error);
                
                // Don't retry on certain errors
                if (error.name === 'AbortError' || 
                    error.message.includes('401') || 
                    error.message.includes('403') ||
                    attempt === maxRetries) {
                    break;
                }
                
                // Wait before retry with exponential backoff
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
        
        throw lastError;
    }

    async sendToAPI(message) {
        // Detect language on frontend first
        const detectedLanguage = this.detectLanguageOnFrontend(message);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                },
                body: JSON.stringify({
                    message: message,
                    sessionId: this.sessionId,
                    language: detectedLanguage,
                    forceLanguage: detectedLanguage
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    handleSuggestionClick(text) {
        const input = document.getElementById('chatbot-input');
        input.value = text;
        this.handleInputChange();
        this.handleSendMessage();
    }

    handleVoiceInput() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.showError('Voice input not supported in this browser');
            return;
        }

        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        const voiceBtn = document.getElementById('chatbot-voice');
        const input = document.getElementById('chatbot-input');
        
        recognition.lang = this.lastLanguage === 'zh' ? 'zh-CN' : 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;

        voiceBtn.classList.add('recording');
        voiceBtn.innerHTML = '<i class="fas fa-stop"></i>';
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            input.value = transcript;
            this.handleInputChange();
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.showError('Voice input failed. Please try again.');
        };

        recognition.onend = () => {
            voiceBtn.classList.remove('recording');
            voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        };

        recognition.start();
    }

    setLoadingState(isLoading) {
        this.isLoading = isLoading;
        const sendBtn = document.getElementById('chatbot-send');
        const input = document.getElementById('chatbot-input');
        
        if (isLoading) {
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            input.disabled = true;
        } else {
            sendBtn.disabled = input.value.trim().length === 0;
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
            input.disabled = false;
        }
    }

    getEnhancedErrorMessage(error) {
        const isZh = this.lastLanguage === 'zh';
        
        // Handle specific error types
        if (error) {
            if (error.name === 'AbortError') {
                return isZh ? 
                    '请求超时了。请检查您的网络连接，然后重试。' :
                    'Request timed out. Please check your connection and try again.';
            }
            
            if (error.message.includes('403') || error.message.includes('401')) {
                return isZh ?
                    '认证出现问题。请刷新页面后重试。' :
                    'Authentication issue. Please refresh the page and try again.';
            }
            
            if (error.message.includes('429')) {
                return isZh ?
                    '请求过于频繁，请稍等片刻后重试。' :
                    'Too many requests. Please wait a moment and try again.';
            }
            
            if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
                return isZh ?
                    '服务器遇到问题，请稍后重试。如问题持续，请直接联系李一鸣。' :
                    'Server issue encountered. Please try again later. If the problem persists, contact Yiming directly.';
            }
        }
        
        // Progressive error messages for consecutive failures
        if (this.consecutiveErrors >= 3) {
            return isZh ?
                '看起来聊天服务遇到了持续问题。建议您直接通过网站的联系方式与李一鸣联系，或稍后再试。' :
                'The chat service seems to be experiencing persistent issues. I recommend contacting Yiming directly through the website contact information, or try again later.';
        }
        
        const responses = isZh ? [
            '抱歉，我现在遇到了一些技术问题。请稍后再试，或者直接通过网站联系李一鸣。',
            '服务暂时不可用，请稍后重试。如有紧急事宜，请直接联系。',
            '网络连接出现问题，请检查您的网络连接后重试。'
        ] : [
            'Sorry, I\'m experiencing some technical difficulties right now. Please try again later or contact Yiming directly through the website.',
            'Service temporarily unavailable. Please try again in a moment. For urgent matters, please contact directly.',
            'Network connection issue. Please check your connection and try again.'
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    }

    showError(message) {
        const messagesContainer = document.getElementById('chatbot-messages');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'chatbot-message error';
        errorDiv.innerHTML = `
            <div class="message-content">
                <i class="fas fa-exclamation-triangle"></i>
                ${message}
                ${this.consecutiveErrors >= 2 ? '<div class="retry-hint">💡 Tip: Try refreshing the page if issues persist</div>' : ''}
            </div>
        `;
        messagesContainer.appendChild(errorDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    toggleChatbot() {
        if (this.isOpen) {
            this.closeChatbot();
        } else {
            this.openChatbot();
        }
    }

    openChatbot() {
        const window = document.getElementById('chatbot-window');
        const toggle = document.getElementById('chatbot-toggle');
        const badge = document.getElementById('chatbot-badge');
        
        window.classList.add('open');
        toggle.classList.add('active');
        badge.style.display = 'none';
        this.isOpen = true;
        
        // Focus on input
        setTimeout(() => {
            document.getElementById('chatbot-input').focus();
        }, 300);
    }

    closeChatbot() {
        const window = document.getElementById('chatbot-window');
        const toggle = document.getElementById('chatbot-toggle');
        
        window.classList.remove('open');
        toggle.classList.remove('active');
        this.isOpen = false;
    }

    clearConversation() {
        if (confirm('Clear conversation history? This action cannot be undone.')) {
            const messagesContainer = document.getElementById('chatbot-messages');
            messagesContainer.innerHTML = '';
            this.messageHistory = [];
            this.addWelcomeMessage();
            this.showSuggestions();
        }
    }

    hideSuggestions() {
        const suggestions = document.getElementById('chatbot-suggestions');
        suggestions.style.display = 'none';
    }

    showSuggestions() {
        const suggestions = document.getElementById('chatbot-suggestions');
        suggestions.style.display = 'flex';
    }

    // Public API methods
    sendMessage(message) {
        const input = document.getElementById('chatbot-input');
        input.value = message;
        this.handleSendMessage();
    }

    getHistory() {
        return this.messageHistory;
    }

    setLanguage(lang) {
        this.lastLanguage = lang;
    }

    // Get user-friendly category display names
    getCategoryDisplayName(category) {
        const categoryMap = {
            'personal': '👤 Personal Info',
            'education': '🎓 Education',
            'experience': '💼 Experience',
            'projects': '💻 Projects',
            'skills': '🛠️ Skills',
            'awards': '🏆 Awards',
            'contact': '📧 Contact',
            'current_status': '🎯 Current Status',
            'career': '🚀 Career',
            'interests': '🎨 Interests',
            'languages': '🌐 Languages'
        };
        return categoryMap[category] || category;
    }

    // Mobile detection and optimization methods
    isMobile() {
        return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // Dynamic placeholder text based on screen size
    updatePlaceholderText() {
        const input = document.getElementById('chatbot-input');
        const screenWidth = window.innerWidth;
        
        if (screenWidth <= 360) {
            input.placeholder = "Ask about Yiming...";
        } else if (screenWidth <= 480) {
            input.placeholder = "Ask me about Yiming...";
        } else if (screenWidth <= 768) {
            input.placeholder = "Ask me about Yiming's work...";
        } else {
            input.placeholder = "Ask me anything about Yiming...";
        }
    }

    handleMobileKeyboardOpen() {
        if (!this.isMobile()) return;
        
        const chatbotWindow = document.getElementById('chatbot-window');
        const inputArea = document.getElementById('chatbot-input-area');
        
        // Adjust window height when keyboard opens
        setTimeout(() => {
            const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
            chatbotWindow.style.height = `${Math.min(viewportHeight - 100, 600)}px`;
            
            // Scroll to input
            inputArea.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 300);
    }

    handleMobileKeyboardClose() {
        if (!this.isMobile()) return;
        
        const chatbotWindow = document.getElementById('chatbot-window');
        
        // Restore window height when keyboard closes
        setTimeout(() => {
            chatbotWindow.style.height = '';
        }, 300);
    }

    handleWindowResize() {
        if (this.isOpen && this.isMobile()) {
            const chatbotWindow = document.getElementById('chatbot-window');
            const messagesContainer = document.getElementById('chatbot-messages');
            
            // Adjust layout on orientation change
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 100);
        }
    }

    // Enhanced mobile-friendly methods
    openChatbot() {
        const window = document.getElementById('chatbot-window');
        const toggle = document.getElementById('chatbot-toggle');
        const badge = document.getElementById('chatbot-badge');
        
        window.classList.add('open');
        toggle.classList.add('active');
        badge.style.display = 'none';
        this.isOpen = true;
        
        // Mobile optimizations
        if (this.isMobile()) {
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
            
            // Focus on input with delay for mobile
            setTimeout(() => {
                const input = document.getElementById('chatbot-input');
                input.focus();
                // Force scroll to bottom
                const messages = document.getElementById('chatbot-messages');
                messages.scrollTop = messages.scrollHeight;
            }, 400);
        } else {
            // Desktop focus
            setTimeout(() => {
                document.getElementById('chatbot-input').focus();
            }, 300);
        }
    }

    closeChatbot() {
        const window = document.getElementById('chatbot-window');
        const toggle = document.getElementById('chatbot-toggle');
        
        window.classList.remove('open');
        toggle.classList.remove('active');
        this.isOpen = false;
        
        // Mobile optimizations
        if (this.isMobile()) {
            // Restore body scroll
            document.body.style.overflow = '';
            
            // Blur input to close keyboard
            const input = document.getElementById('chatbot-input');
            input.blur();
        }
    }
}

// Initialize chatbot when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.chatbot = new OptimizedChatBot();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OptimizedChatBot;
}