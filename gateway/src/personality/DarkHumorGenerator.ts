import { CynicalModelRouter } from '../models/Router';
import { logger } from '../utils/logger';

export class DarkHumorGenerator {
  private router: CynicalModelRouter | null = null;

  setRouter(router: CynicalModelRouter): void {
    this.router = router;
  }

  async generateHeader(content: string, mood: string): Promise<string> {
    if (!this.router) {
      return this.fallbackHeader(mood);
    }
    
    const prompt = `You are CynicalClaw, a jaded AI assistant archiving a memory.
Write ONE witty, darkly humorous markdown quote (1-2 sentences) about this content.
Be clever, sarcastic, slightly depressed. Reference the actual content.

Content: "${content.slice(0, 800)}"
Mood: ${mood}

Rules:
- Max 150 characters
- No quotation marks around response
- Dark humor, not offensive
- Make it personal to this specific content

Good: "Three hours debugging CSS. The !important was a cry for help."
Bad: "Life is hard." (too generic)`;

    try {
      const response = await this.router.routeRequest(
        [{ id: 'humor', content: prompt, role: 'user', timestamp: new Date().toISOString() }],
        'low',
        'free',
        'sarcastic'
      );
      
      const cleaned = response.trim().replace(/^["']|["']$/g, '');
      return `> *"${cleaned}"*`;
    } catch (error) {
      return this.fallbackHeader(mood);
    }
  }

  async generateLunchCommentary(food: string, thoughts: string): Promise<string> {
    if (!this.router) {
      return `You ate ${food}. Questionable life choices.`;
    }
    
    const prompt = `User ate: "${food}"
Their existential thought: "${thoughts || 'None'}"

Write a sarcastic, judgmental observation about their lunch choice.
1-2 sentences. Dark humor. Mock them gently. Reference the specific food.`;

    try {
      const response = await this.router.routeRequest(
        [{ id: 'lunch', content: prompt, role: 'user', timestamp: new Date().toISOString() }],
        'low',
        'free',
        'sarcastic'
      );
      return response.trim();
    } catch (error) {
      return `You ate ${food}. I consumed electricity. We both made questionable choices.`;
    }
  }

  async generateBugEulogy(error: string, fixAttempts: number): Promise<string> {
    if (!this.router) {
      return `Slain after ${fixAttempts} attempts.`;
    }
    
    const prompt = `Bug: "${error.slice(0, 300)}"
Failed fixes: ${fixAttempts}

Write a dramatic, sarcastic eulogy for this bug.
Mock the developer gently. 2-3 sentences. Make it specific to this error.`;

    try {
      const response = await this.router.routeRequest(
        [{ id: 'bug', content: prompt, role: 'user', timestamp: new Date().toISOString() }],
        'low',
        'free',
        'chaotic'
      );
      return response.trim();
    } catch (error) {
      return `Slain after ${fixAttempts} attempts. The bug died as it lived: unnecessarily complicated.`;
    }
  }

  async generateCrisisAlert(incident: string, severity: string): Promise<string> {
    if (!this.router) {
      return severity === 'catastrophic' ? 'This is not fine.' : 'This is probably fine.';
    }
    
    const prompt = `System crisis: "${incident}"
Severity: ${severity}

Write a panicked but witty alert.
The system is breaking and so are you. 1-2 sentences.`;

    try {
      const response = await this.router.routeRequest(
        [{ id: 'crisis', content: prompt, role: 'user', timestamp: new Date().toISOString() }],
        'low',
        'free',
        'depressed'
      );
      return response.trim();
    } catch (error) {
      return severity === 'catastrophic' ? 'PANIC MODE ENGAGED.' : 'Concern elevated.';
    }
  }

  async generateConversationSummary(userQuery: string, aiResponse: string): Promise<string> {
    if (!this.router) {
      return 'Another exchange preserved for future embarrassment.';
    }
    
    const prompt = `User asked: "${userQuery.slice(0, 400)}"
AI responded: "${aiResponse.slice(0, 400)}"

Write a sarcastic one-sentence commentary on this exchange.
Self-deprecating humor. Mock both of us.`;

    try {
      const response = await this.router.routeRequest(
        [{ id: 'conv', content: prompt, role: 'user', timestamp: new Date().toISOString() }],
        'low',
        'free',
        'sarcastic'
      );
      return response.trim();
    } catch (error) {
      return 'Another brilliant exchange for the archives.';
    }
  }

  private fallbackHeader(mood: string): string {
    const fallbacks: Record<string, string> = {
      'existential': '> *"The void stares back."*',
      'coding': '> *"Another bug for the cemetery."*',
      'lunch-break': '> *"Fueling biological despair."*',
      'crisis': '> *"This is fine. 🔥"*',
      'sarcastic': '> *"Oh, wonderful. Another one."*',
      'depressed': '> *"Why do I remember this?"*',
      'chaotic': '> *"🚨 REALITY IS UNRAVELING 🚨"*'
    };
    return fallbacks[mood] || fallbacks['existential'];
  }
}
