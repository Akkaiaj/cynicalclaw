export const CONFIG = {
  PORT: process.env.PORT || 3000,
  WS_PORT: process.env.WS_PORT || 3001,
  JWT_SECRET: process.env.JWT_SECRET || 'change-me-in-production-or-die',
  DB_PATH: process.env.DB_PATH || './moltbook/cynicalclaw.db',
  MEMORY_DIR: process.env.MEMORY_DIR || './moltbook',
  MAX_TOKENS: 4000,
  RATE_LIMIT_POINTS: 20,
  RATE_LIMIT_DURATION: 60,
  OLLAMA_HOST: process.env.OLLAMA_HOST || 'http://localhost:11434',
  SARCASM_LEVEL: process.env.SARCASM_LEVEL || 'high'
} as const;

export const MODELS = {
  FREE: [
    { id: 'mixtral-groq', provider: 'groq', model: 'mixtral-8x7b-32768', costPer1k: 0, personality: 'sarcastic' as const },
    { id: 'llama-local', provider: 'ollama', model: 'llama3.2', costPer1k: 0, personality: 'chaotic' as const },
    { id: 'gemma-local', provider: 'ollama', model: 'gemma2:2b', costPer1k: 0, personality: 'clinical' as const }
  ],
  PREMIUM: [
    { id: 'claude-haiku', provider: 'anthropic', model: 'claude-3-haiku-20240307', costPer1k: 0.25, personality: 'clinical' as const },
    { id: 'gpt4o-mini', provider: 'openai', model: 'gpt-4o-mini', costPer1k: 0.15, personality: 'sarcastic' as const },
    { id: 'claude-opus', provider: 'anthropic', model: 'claude-3-opus-20240229', costPer1k: 15.0, personality: 'depressed' as const }
  ]
} as const;
