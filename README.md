# 🦞 CynicalClaw

Your personal AI assistant with multi-model support, dark humor, and existential dread.

## Features

- **Multi-Model Routing**: Free (Groq/Ollama) + Premium (Claude/GPT)
- **Dark Humor**: Time-aware sarcastic personality injection
- **MoltBook Memory**: File-based + SQLite vector search
- **Skill System**: Extensible sandboxed tools
- **Web UI**: React frontend with WebSocket streaming
- **Security**: JWT auth, rate limiting, input validation

## Quick Start

```bash
# Setup
npm run install:all
cp .env.example .env
# Edit .env - add GROQ_API_KEY

# Start Ollama (local AI)
ollama pull llama3.2
ollama serve

# Run dev
npm run dev
