#!/bin/bash

# Deployment script for Yiming's website with chatbot
echo "🚀 Deploying Yiming Li's website with AI chatbot..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Login to Cloudflare (if not already logged in)
echo "🔐 Checking Cloudflare authentication..."
wrangler whoami || wrangler login

# Create D1 database
echo "🗄️ Setting up D1 database..."
DB_OUTPUT=$(wrangler d1 create chatbot-db 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Database created successfully"
    echo "$DB_OUTPUT"
    echo ""
    echo "⚠️  IMPORTANT: Copy the database_id from above and update wrangler.jsonc"
    echo "   Replace 'your-database-id' with the actual database ID"
    read -p "Press Enter after updating wrangler.jsonc with the database ID..."
else
    echo "ℹ️  Database may already exist or check permissions"
fi

# Execute database schema
echo "📋 Setting up database schema..."
wrangler d1 execute chatbot-db --file=./schema.sql

# Set up secrets (if not already set)
echo "🔑 Setting up API secrets..."
echo "You'll need to set the following secrets:"
echo "1. GEMINI_API_KEY - Your Google Gemini API key"
echo "2. DATABASE_URL - (Optional, only if using external PostgreSQL)"

read -p "Do you want to set GEMINI_API_KEY now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    wrangler secret put GEMINI_API_KEY
fi

read -p "Do you want to set DATABASE_URL? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    wrangler secret put DATABASE_URL
fi

# Deploy the worker
echo "🚀 Deploying to Cloudflare..."
wrangler deploy

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Deployment successful!"
    echo ""
    echo "Your website with AI chatbot is now live!"
    echo "The chatbot will appear as a blue chat icon in the bottom-right corner."
    echo ""
    echo "Test the chatbot with these example messages:"
    echo "• 'Hello'"
    echo "• 'Tell me about Yiming's background'"
    echo "• 'What projects has he worked on?'"
    echo "• 'How can I contact him?'"
    echo ""
    echo "📊 Monitor your deployment:"
    echo "• Cloudflare Dashboard: https://dash.cloudflare.com"
    echo "• Worker logs: wrangler tail"
    echo "• D1 database: wrangler d1 info chatbot-db"
else
    echo "❌ Deployment failed. Check the errors above."
    exit 1
fi