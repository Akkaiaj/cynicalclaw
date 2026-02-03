#!/bin/bash

set -e

echo "🦞 Initializing CynicalClaw..."
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install Node 18+ first, human."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version too old. Need 18+. Current: $(node -v)"
    exit 1
fi

echo "✓ Node.js $(node -v) detected"

echo "Creating directory structure..."
mkdir -p moltbook/sessions
mkdir -p logs
mkdir -p screenshots
touch moltbook/.gitkeep

echo "Installing Gateway dependencies..."
cd gateway
npm install
cd ..

echo "Installing Web UI dependencies..."
cd web-ui
npm install
cd ..

if [ ! -f .env ]; then
    echo "Creating environment file..."
    cp .env.example .env
    echo "⚠️  Please edit .env file and add your API keys!"
fi

if command -v ollama &> /dev/null; then
    echo "✓ Ollama detected. Pulling models..."
    ollama pull llama3.2 || echo "⚠️  Failed to pull llama3.2"
    ollama pull nomic-embed-text || echo "⚠️  Failed to pull nomic-embed-text"
else
    echo "⚠️  Ollama not found. Install from https://ollama.ai for local AI"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file and add your GROQ_API_KEY (free at console.groq.com)"
echo "2. Start Ollama: ollama serve"
echo "3. Start dev server: npm run dev"
echo ""
echo "Or use Docker: docker-compose up -d"
