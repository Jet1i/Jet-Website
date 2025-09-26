# Chatbot Setup Instructions

## Overview
This chatbot integration uses MCP (Model Context Protocol) + RAG (Retrieval-Augmented Generation) with Google's Gemini AI and PostgreSQL/D1 database for storing conversations and user information.

## Features
- ✅ Modern, responsive chatbot UI
- ✅ Integration with Google Gemini AI
- ✅ Conversation history storage
- ✅ User information collection
- ✅ RAG-based knowledge retrieval
- ✅ Real-time typing indicators
- ✅ Mobile-responsive design
- ✅ CORS-enabled API endpoints

## Setup Steps

### 1. Install Cloudflare Dependencies
```bash
npm install @cloudflare/workers-types
```

### 2. Set up Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key for Gemini
3. Add it to your Cloudflare Workers secrets:
```bash
npx wrangler secret put GEMINI_API_KEY
```

### 3. Database Setup

#### Option A: Use Cloudflare D1 (Recommended)
```bash
# Create D1 database
npx wrangler d1 create chatbot-db

# Update wrangler.jsonc with the database ID from the output above
# Execute schema
npx wrangler d1 execute chatbot-db --file=./schema.sql
```

#### Option B: Use External PostgreSQL
1. Set up a PostgreSQL database (Supabase, Neon, etc.)
2. Add connection string to secrets:
```bash
npx wrangler secret put DATABASE_URL
```

### 4. Update Configuration
Update `wrangler.jsonc` with your actual database ID:
```json
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "chatbot-db",
      "database_id": "YOUR_ACTUAL_DATABASE_ID"
    }
  ]
}
```

### 5. Deploy to Cloudflare
```bash
npx wrangler deploy
```

### 6. Test the Chatbot
1. Open your website
2. Click the chatbot icon in the bottom-right corner
3. Test with messages like:
   - "Hello"
   - "Tell me about Yiming's projects"
   - "What is his educational background?"

## API Endpoints

### `GET /api/health`
Health check endpoint
- Response: `{"status": "healthy", "timestamp": "..."}`

### `POST /api/chat`
Main chat endpoint
- Body: `{"message": "user message", "context": {...}, "sessionId": "optional"}`
- Response: `{"response": "AI response", "sessionId": "session_id"}`

### `POST /api/user-info`
Store user information
- Body: `{"sessionId": "...", "email": "...", "preferences": {...}}`
- Response: `{"success": true}`

### `GET /api/conversations?sessionId=xxx`
Get conversation history
- Response: `{"conversations": [...]}`

## Customization

### Adding More Context
Edit the `getYimingPersonalInfo()` function in `worker.js` to add more detailed information about Yiming.

### Updating Knowledge Base
Add more entries to the `knowledge_base` table in `schema.sql` or use the API to dynamically add content.

### Styling
Modify `chatbot.css` to match your website's design theme.

### Response Logic
Update the mock responses in `chatbot.js` for demo mode, or enhance the Gemini prompt in `worker.js`.

## Environment Variables

### Required Secrets
- `GEMINI_API_KEY`: Your Google Gemini API key
- `DATABASE_URL`: PostgreSQL connection string (if not using D1)

### Optional Variables
- `ENVIRONMENT`: Set to "production" or "development"

## Database Schema

The chatbot uses these tables:
- `conversations`: Store chat messages
- `user_info`: Store user contact information and preferences
- `chat_analytics`: Track usage analytics
- `knowledge_base`: RAG knowledge base for Yiming's information

## Troubleshooting

### Chatbot shows "offline"
- Check if worker.js is deployed correctly
- Verify API endpoints are accessible
- Check browser console for errors

### Gemini API errors
- Verify your API key is correct
- Check quota limits in Google AI Studio
- Ensure API key has proper permissions

### Database connection issues
- For D1: Verify database ID in wrangler.jsonc
- For PostgreSQL: Check DATABASE_URL format
- Run database migrations using schema.sql

### CORS issues
- Ensure your domain is properly configured in Cloudflare
- Check worker routes configuration

## Next Steps

1. **Enhanced RAG**: Implement vector embeddings for better context retrieval
2. **User Authentication**: Add user login/registration
3. **Admin Panel**: Create interface to manage knowledge base
4. **Analytics Dashboard**: Build analytics for chat interactions
5. **Multi-language Support**: Add internationalization
6. **Voice Integration**: Add speech-to-text capabilities

## Security Considerations

- API keys are stored as Cloudflare secrets
- CORS is configured for your domain
- Input sanitization is implemented
- Rate limiting can be added as needed
- User data is encrypted in transit

## Cost Considerations

- Cloudflare Workers: Free tier includes 100k requests/day
- Gemini API: Pay-per-use pricing
- D1: Free tier includes 5GB storage
- Monitor usage and set up alerts as needed