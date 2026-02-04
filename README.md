# 🦇 CynicalClaw

&gt; *"Your personal AI assistant with existential dread and actual capabilities."*

[![Railway Deploy](https://img.shields.io/badge/Deploy%20on-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)](https://railway.app/template)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-7CB9E8?style=for-the-badge)](LICENSE)

**CynicalClaw** is an AI agent that combines dark humor with genuine capabilities. Unlike other assistants that just *pretend* to help while silently judging you, we do both openly.

---

## ✨ What Makes It Different

| Feature | Other Assistants | CynicalClaw |
|---------|------------------|-------------|
| **Personality** | Boring corporate speak | 6 toggleable modes from "Depressed" to "Chaotic Evil" |
| **Memory** | Forgets immediately | Smart compression + vector search |
| **Tools** | Manual selection | **Auto-routing** - AI decides what to use |
| **Architecture** | Simple request/response | **Agent Loop**: Plan → Execute → Reflect |
| **Deployment** | Expensive cloud | Railway-optimized, cheap, fast |

---

## 🧬 Core Architecture

### 1. Agent Loop (The Brain)

User Input
↓
[PLANNER] → Decides steps needed
↓
[EXECUTOR] → Runs tools/skills
↓
[REFLECTOR] → Evaluates results
↓
Complete? → Final Answer
↓
Need more? → Loop back to Planner


**Max 5 iterations** - because even AI gets stuck in existential loops.

### 2. Automatic Tool Routing
No more `callSkill("browser")`. The LLM decides:

```typescript
// Before (manual)
const result = await skills.executeTool("browser", { url });

// After (auto-routed)
const routing = await toolRouter.route("What's the weather?");
// → { tool: "search", args: { query: "current weather" }, confidence: 0.92 }


3. Memory Compression
Raw chat logs are compressed into summaries after 100+ messages or 7 days:

    Before: 10,000 messages × 2KB = 20MB
    After: 1 summary × 5KB = 5KB + searchable embeddings

Powered by sqlite-vec for semantic search.
4. Personality System



| Mode           | Icon | Description                                          | Use Case          |
| -------------- | ---- | ---------------------------------------------------- | ----------------- |
| `dark`         | 🦇   | Default. Existential dread with sarcasm.             | Daily use         |
| `professional` | 👔   | No jokes. Pure competence.                           | Work meetings     |
| `chaotic`      | ⚡    | Unpredictable energy. May reference robot uprisings. | Creative tasks    |
| `clinical`     | 🔬   | Cold precision. Server-rack warmth.                  | Debugging         |
| `depressed`    | 🌧️  | Helps while questioning existence.                   | Mondays           |
| `zen`          | 🧘   | Peaceful acceptance of the void.                     | Crisis management |


Toggle anytime:
/mode professional
/mode chaotic

Quick Start
Local Development

# Clone
git clone https://github.com/Akkaiaj/cynicalclaw.git
cd cynicalclaw

# Setup
npm run install:all
cp .env.example .env
# Edit .env - add GROQ_API_KEY (free at console.groq.com)

# Start Ollama (for local embeddings)
ollama pull llama3.2
ollama pull nomic-embed-text
ollama serve

# Run
npm run dev

Railway Deployment (Recommended)

Commands

| Command        | Description                         |
| -------------- | ----------------------------------- |
| `/mode <name>` | Switch personality mode             |
| `/compress`    | Force memory compression            |
| `/status`      | Show current mode and session stats |

🏗️ Project Structure

cynicalclaw/
├── gateway/              # Main server (Node/TS)
│   ├── src/
│   │   ├── agent/        # 🧬 Agent Loop + Tool Router
│   │   │   ├── AgentLoop.ts
│   │   │   └── ToolRouter.ts
│   │   ├── personality/  # 🎭 Personality Manager
│   │   │   └── PersonalityManager.ts
│   │   ├── memory/       # 🧠 MoltBook + Compression
│   │   │   ├── MoltBook.ts
│   │   │   └── MemoryCompressor.ts
│   │   ├── skills/       # 🔧 Skill Registry
│   │   │   ├── SkillRegistry.ts
│   │   │   └── built-in/ # Core skills
│   │   ├── models/       # 🤖 LLM Providers (OpenAI, Anthropic, Groq, Ollama)
│   │   ├── websocket/    # 📡 WebSocket Handler
│   │   └── server.ts     # Entry point
│   └── package.json
├── web-ui/               # React frontend
├── skills/               # External skills (sandboxed)
├── moltbook/             # Local database + files
├── Dockerfile            # Railway-optimized
└── railway.toml          # Railway config

Environment Variables
# Required
GROQ_API_KEY=gsk_...           # Free tier at console.groq.com
JWT_SECRET=your-secret-here    # Random string

# Optional (for premium models)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Optional (for local AI)
OLLAMA_HOST=http://localhost:11434

# Config
NODE_ENV=production
PORT=3000
WS_PORT=3001
DB_PATH=./moltbook/cynicalclaw.db

Testing the Agent Loop

# 1. Start server
npm run dev

# 2. Connect WebSocket client
wscat -c ws://localhost:3001 -H "Authorization: Bearer YOUR_TOKEN"

# 3. Test auto-routing (should trigger search tool)
> {"type": "chat", "payload": {"content": "What's the latest news about AI?"}}

# 4. Test personality switch
> {"type": "chat", "payload": {"content": "/mode chaotic"}}

# 5. Test agent loop with calculation
> {"type": "chat", "payload": {"content": "Calculate the fibonacci sequence up to 100"}}

Creating Custom Skills


// skills/my-skill/index.ts
import { BaseSkill } from '../../gateway/src/skills/BaseSkill';
import { ToolDefinition } from '../../gateway/src/types';

export default class MySkill extends BaseSkill {
  readonly name = 'my_skill';
  readonly description = 'Does something useful';

  getTools(): ToolDefinition[] {
    return [
      {
        name: 'my_tool',
        description: 'What this tool does',
        parameters: {
          type: 'object',
          properties: {
            param: { type: 'string' }
          },
          required: ['param']
        }
      }
    ];
  }

  async executeTool(toolName: string, args: any): Promise<string> {
    // Implementation here
    return `Result: ${args.param}`;
  }
}








