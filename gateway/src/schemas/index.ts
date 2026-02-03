import { z } from 'zod';

export const ChatMessageSchema = z.object({
  content: z.string().min(1, 'Say something, coward').max(8000, 'Too long. My attention span is shorter than that.'),
  complexity: z.enum(['low', 'medium', 'high']).default('low'),
  budget: z.enum(['free', 'premium']).default('free'),
  personality: z.enum(['sarcastic', 'clinical', 'chaotic', 'depressed']).optional(),
  sessionId: z.string().optional(),
  useTools: z.boolean().default(false)
});

export const ToolCallSchema = z.object({
  tool: z.string(),
  args: z.record(z.any())
});

export const MemorySearchSchema = z.object({
  query: z.string(),
  mode: z.enum(['semantic', 'lexical', 'hybrid']).default('hybrid'),
  limit: z.number().min(1).max(50).default(10),
  mood: z.enum(['existential', 'coding', 'lunch-break', 'crisis']).optional()
});

export const DeviceRegistrationSchema = z.object({
  name: z.string().min(1).max(100),
  publicKey: z.string().optional()
});

export type ChatMessageInput = z.infer<typeof ChatMessageSchema>;
export type ToolCallInput = z.infer<typeof ToolCallSchema>;
export type MemorySearchInput = z.infer<typeof MemorySearchSchema>;
