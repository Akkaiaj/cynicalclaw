export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: string;
  metadata?: {
    model?: string;
    loading?: boolean;
    streaming?: boolean;
  };
}

export interface Memory {
  id: string;
  content: string;
  timestamp: string;
  mood: string;
}
