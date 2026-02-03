export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: string;
  metadata?: {
    model?: string;
    tokens?: number;
    mood?: string;
    latency?: number;
  };
}

export interface Session {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface MemoryEntry {
  id: string;
  content: string;
  embedding?: number[];
  timestamp: string;
  mood: 'existential' | 'coding' | 'lunch-break' | 'crisis' | 'sarcastic' | 'depressed' | 'chaotic' | 'clinical';
  sourceFile?: string;
  tags?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ModelConfig {
  id: string;
  provider: 'openai' | 'anthropic' | 'ollama' | 'groq';
  model: string;
  costPer1k: number;
  personality: 'sarcastic' | 'clinical' | 'chaotic' | 'depressed' | 'existential' | 'coding' | 'lunch-break' | 'crisis';
  maxTokens?: number;
}

export interface WSMessage {
  type: 'chat' | 'tool_call' | 'ping' | 'auth' | 'memory_search' | 'session_list';
  payload: any;
  id: string;
  timestamp?: string;
}

export interface WSResponse {
  type: 'chat_response' | 'tool_result' | 'error' | 'pong' | 'memory_result' | 'session_list';
  id: string;
  content?: any;
  error?: string;
  metadata?: any;
  timestamp: string;
}

export interface Device {
  id: string;
  name: string;
  token: string;
  createdAt: string;
  lastSeen?: string;
}
