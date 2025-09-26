// Chatbot Implementation
class ChatBot {
    constructor() {
        this.isOpen = false;
        this.isConnected = false;
        this.apiEndpoint = '/api/chat'; // Will be implemented in Cloudflare Worker
        this.geminiApiKey = null; // Will be set from environment
        this.sessionId = this.generateSessionId();
        this.init();
    }

    init() {
        this.createChatbotHTML();
        this.attachEventListeners();
        this.checkConnection();
        this.addWelcomeMessage();
    }

    createChatbotHTML() {
        const chatbotHTML = `
            <div class="chatbot-container">
                <button class="chatbot-toggle" id="chatbot-toggle">
                    <i class="fas fa-comments" id="chatbot-icon"></i>
                </button>
                <div class="chatbot-window" id="chatbot-window">
                    <div class="chatbot-header">
                        <div class="chatbot-title">
                            <div class="chatbot-status"></div>
                            Chat with Yiming
                        </div>
                        <button class="chatbot-close" id="chatbot-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="connection-status" id="connection-status">
                        Connecting to AI assistant...
                    </div>
                    <div class="chatbot-messages" id="chatbot-messages">
                    </div>
                    <div class="chatbot-input-area">
                        <div class="chatbot-input-container">
                            <textarea 
                                class="chatbot-input" 
                                id="chatbot-input" 
                                placeholder="Ask me anything about Yiming or his work..."
                                rows="1"
                            ></textarea>
                            <button class="chatbot-send" id="chatbot-send">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', chatbotHTML);
    }

    attachEventListeners() {
        const toggle = document.getElementById('chatbot-toggle');
        const close = document.getElementById('chatbot-close');
        const input = document.getElementById('chatbot-input');
        const send = document.getElementById('chatbot-send');

        toggle.addEventListener('click', () => this.toggleChatbot());
        close.addEventListener('click', () => this.closeChatbot());
        send.addEventListener('click', () => this.sendMessage());
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize textarea
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 100) + 'px';
        });
    }

    toggleChatbot() {
        const window = document.getElementById('chatbot-window');
        const toggle = document.getElementById('chatbot-toggle');
        const icon = document.getElementById('chatbot-icon');

        this.isOpen = !this.isOpen;
        
        if (this.isOpen) {
            window.classList.add('active');
            toggle.classList.add('active');
            icon.className = 'fas fa-times';
            this.focusInput();
        } else {
            window.classList.remove('active');
            toggle.classList.remove('active');
            icon.className = 'fas fa-comments';
        }
    }

    closeChatbot() {
        this.isOpen = false;
        const window = document.getElementById('chatbot-window');
        const toggle = document.getElementById('chatbot-toggle');
        const icon = document.getElementById('chatbot-icon');

        window.classList.remove('active');
        toggle.classList.remove('active');
        icon.className = 'fas fa-comments';
    }

    focusInput() {
        setTimeout(() => {
            document.getElementById('chatbot-input').focus();
        }, 300);
    }

    async checkConnection() {
        const statusElement = document.getElementById('connection-status');
        
        try {
            // Test connection to your API endpoint
            const response = await fetch('/api/health', { method: 'GET' });
            
            if (response.ok) {
                this.isConnected = true;
                statusElement.textContent = 'Connected to AI assistant';
                statusElement.className = 'connection-status connected';
                
                // Hide status after 2 seconds
                setTimeout(() => {
                    statusElement.style.display = 'none';
                }, 2000);
            } else {
                throw new Error('API not available');
            }
        } catch (error) {
            this.isConnected = false;
            statusElement.textContent = 'AI assistant offline - Demo mode';
            statusElement.className = 'connection-status error';
        }
    }

    addWelcomeMessage() {
        setTimeout(() => {
            this.addMessage(
                'bot',
                'Hi! I\'m Yiming\'s AI assistant. I can help you learn more about his background, projects, and experience. What would you like to know?'
            );
        }, 1000);
    }

    addMessage(type, content, timestamp = new Date()) {
        const messagesContainer = document.getElementById('chatbot-messages');
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        
        if (type === 'system') {
            messageElement.textContent = content;
        } else {
            messageElement.innerHTML = this.formatMessage(content);
        }

        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        return messageElement;
    }

    formatMessage(content) {
        // Basic markdown-like formatting
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    showTypingIndicator() {
        const messagesContainer = document.getElementById('chatbot-messages');
        const typingElement = document.createElement('div');
        typingElement.className = 'typing-indicator';
        typingElement.id = 'typing-indicator';
        typingElement.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;

        messagesContainer.appendChild(typingElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    hideTypingIndicator() {
        const typingElement = document.getElementById('typing-indicator');
        if (typingElement) {
            typingElement.remove();
        }
    }

    async sendMessage() {
        const input = document.getElementById('chatbot-input');
        const send = document.getElementById('chatbot-send');
        const message = input.value.trim();

        if (!message) return;

        // Add user message
        this.addMessage('user', message);
        
        // Clear input and disable send button
        input.value = '';
        input.style.height = 'auto';
        send.disabled = true;

        // Show typing indicator
        this.showTypingIndicator();

        try {
            let response;
            
            if (this.isConnected) {
                // Real API call
                response = await this.callGeminiAPI(message);
            } else {
                // Demo mode with mock responses
                response = await this.getMockResponse(message);
            }

            this.hideTypingIndicator();
            this.addMessage('bot', response);

        } catch (error) {
            console.error('Chat error:', error);
            this.hideTypingIndicator();
            this.addMessage('bot', 'Sorry, I encountered an error. Please try again.');
        } finally {
            send.disabled = false;
        }
    }

    async callGeminiAPI(message) {
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                sessionId: this.getSessionId()
            })
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();
        
        // Show relevance information if available
        if (data.relevantSources && data.relevantSources.length > 0) {
            console.log('📊 Search results:', data.relevantSources);
        }
        
        return data.response;
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getSessionId() {
        return this.sessionId;
    }

    getContextualInfo() {
        // Extract information from the current webpage to provide context
        return {
            name: 'Yiming Li',
            title: 'Embedded Systems Engineer & AI Enthusiast',
            education: 'Master\'s in Embedded Systems at EIT Digital',
            focus: 'IoT, AI agents, and real-time systems',
            currentPage: window.location.href,
            pageTitle: document.title
        };
    }

    async getMockResponse(message) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

        const responses = {
            greeting: [
                "Hello! I'm here to help you learn more about Yiming Li. What specific aspect of his work interests you?",
                "Hi there! Feel free to ask me anything about Yiming's background, projects, or experience.",
                "Welcome! I can tell you about Yiming's work in embedded systems, AI, and IoT. What would you like to know?"
            ],
            projects: [
                "Yiming has worked on several exciting projects including IoT systems, AI agent development, and real-time embedded applications. His work focuses on bridging hardware and software in innovative ways.",
                "Some of Yiming's notable projects involve developing intelligent IoT solutions and implementing AI algorithms on embedded platforms. He's particularly interested in edge computing applications."
            ],
            education: [
                "Yiming is currently pursuing a Master's degree in Embedded Systems at EIT Digital, where he's focusing on advanced IoT technologies and AI integration.",
                "His educational background combines computer science fundamentals with specialized training in embedded systems and artificial intelligence."
            ],
            experience: [
                "Yiming has experience in embedded systems development, IoT implementation, and AI/ML integration. He's worked on both hardware and software aspects of modern embedded systems.",
                "His professional experience spans embedded programming, system design, and the development of intelligent IoT solutions."
            ],
            skills: [
                "Yiming's technical skills include embedded programming, IoT development, AI/ML implementation, real-time systems, and cross-platform development.",
                "He's proficient in various programming languages and frameworks relevant to embedded systems and AI development."
            ],
            contact: [
                "You can reach Yiming through the contact section on this website. He's always interested in discussing new opportunities and collaborations in embedded systems and AI.",
                "Feel free to connect with Yiming via the contact information provided on his website. He welcomes professional inquiries and project discussions."
            ],
            default: [
                "That's an interesting question! While I'd love to provide more specific details, I'd recommend reaching out to Yiming directly for detailed information about that topic.",
                "I can provide general information about Yiming's background and work. For more specific details, please feel free to contact him directly through this website.",
                "That's a great question! For the most accurate and detailed information, I'd suggest contacting Yiming directly using the contact form on this website."
            ]
        };

        const lowerMessage = message.toLowerCase();
        let category = 'default';

        if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
            category = 'greeting';
        } else if (lowerMessage.includes('project') || lowerMessage.includes('work') || lowerMessage.includes('portfolio')) {
            category = 'projects';
        } else if (lowerMessage.includes('education') || lowerMessage.includes('study') || lowerMessage.includes('school') || lowerMessage.includes('university')) {
            category = 'education';
        } else if (lowerMessage.includes('experience') || lowerMessage.includes('job') || lowerMessage.includes('career')) {
            category = 'experience';
        } else if (lowerMessage.includes('skill') || lowerMessage.includes('technology') || lowerMessage.includes('programming')) {
            category = 'skills';
        } else if (lowerMessage.includes('contact') || lowerMessage.includes('reach') || lowerMessage.includes('email')) {
            category = 'contact';
        }

        const categoryResponses = responses[category];
        return categoryResponses[Math.floor(Math.random() * categoryResponses.length)];
    }
}

// Initialize chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🤖 Initializing chatbot...');
    try {
        const chatbot = new ChatBot();
        console.log('✅ Chatbot initialized successfully');
        
        // 验证chatbot元素是否创建
        setTimeout(() => {
            const container = document.querySelector('.chatbot-container');
            const toggle = document.getElementById('chatbot-toggle');
            
            if (container) {
                console.log('✅ Chatbot container created');
                console.log('Container position:', window.getComputedStyle(container).position);
                console.log('Container z-index:', window.getComputedStyle(container).zIndex);
            } else {
                console.error('❌ Chatbot container not found');
            }
            
            if (toggle) {
                console.log('✅ Chatbot toggle button created');
                console.log('Button visible:', toggle.offsetWidth > 0 && toggle.offsetHeight > 0);
            } else {
                console.error('❌ Chatbot toggle button not found');
            }
        }, 100);
        
    } catch (error) {
        console.error('❌ Failed to initialize chatbot:', error);
    }
});

// Export for potential external use
window.ChatBot = ChatBot;