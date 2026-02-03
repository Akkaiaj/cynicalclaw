import axios from 'axios';
import { CONFIG } from '../config/constants';
import { logger } from './logger';

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await axios.post(`${CONFIG.OLLAMA_HOST}/api/embeddings`, {
      model: 'nomic-embed-text',
      prompt: text
    }, { timeout: 10000 });
    
    return response.data.embedding;
  } catch (error) {
    logger.error('Local embedding failed. Text will be stored without semantic search.');
    return new Array(384).fill(0);
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
