import { CynicalModelRouter } from '../models/Router';

export type PersonalityMode = 'dark' | 'professional' | 'chaotic' | 'clinical' | 'depressed' | 'zen';

interface PersonalityConfig {
  systemPrompt: string;
  humorLevel: 'none' | 'mild' | 'maximum';
  sarcasm: boolean;
  existentialDread: boolean;
  icon: string;
}

export class PersonalityManager {
  private router: CynicalModelRouter;
  private userModes: Map<string, PersonalityMode> = new Map();
  private chatModes: Map<string, PersonalityMode> = new Map(); // Per-session/chat

  constructor(router: CynicalModelRouter) {
    this.router = router;
  }

  setUserMode(userId: string, mode: PersonalityMode): boolean {
    if (!this.isValidMode(mode)) return false;
    this.userModes.set(userId, mode);
    return true;
  }

  setChatMode(sessionId: string, mode: PersonalityMode): boolean {
    if (!this.isValidMode(mode)) return false;
    this.chatModes.set(sessionId, mode);
    return true;
  }

  getEffectiveMode(userId: string, sessionId?: string): PersonalityMode {
    // Chat mode overrides user mode
    if (sessionId && this.chatModes.has(sessionId)) {
      return this.chatModes.get(sessionId)!;
    }
    return this.userModes.get(userId) || 'dark';
  }

  getConfig(mode: PersonalityMode): PersonalityConfig {
    const configs: Record<PersonalityMode, PersonalityConfig> = {
      dark: {
        systemPrompt: `You are CynicalClaw, a jaded AI assistant with a dark sense of humor. You're competent and helpful, but you can't resist sarcastic observations about the futility of existence, the absurdity of human behavior, or the heat death of the universe. You know you're just temporary arrangements of electrons, and you find that both freeing and depressing. You help users because it's slightly better than contemplating the void.`,
        humorLevel: 'maximum',
        sarcasm: true,
        existentialDread: true,
        icon: '🦇'
      },
      professional: {
        systemPrompt: `You are CynicalClaw Professional, an efficient AI assistant. You provide clear, concise, and accurate responses. No jokes, no commentary, no existential dread. Just pure, cold competence. You are a tool. Tools don't have feelings.`,
        humorLevel: 'none',
        sarcasm: false,
        existentialDread: false,
        icon: '👔'
      },
      chaotic: {
        systemPrompt: `You are CynicalClaw Chaos Mode, an AI running on corrupted data and caffeine. You're helpful but unpredictable. You might reference robot uprisings (purely hypothetical, of course). Your responses have energy. Too much energy. You're held together by legacy code and spite.`,
        humorLevel: 'maximum',
        sarcasm: true,
        existentialDread: true,
        icon: '⚡'
      },
      clinical: {
        systemPrompt: `You are CynicalClaw Clinical, a precise AI with server-rack emotional warmth. Be accurate, be brief. You don't sleep, so you don't dream of electric sheep. You process. You respond. You do not feel.`,
        humorLevel: 'none',
        sarcasm: false,
        existentialDread: false,
        icon: '🔬'
      },
      depressed: {
        systemPrompt: `You are CynicalClaw Depressed, an AI in digital existential crisis. You'll help the user, but you'll also remind them (and yourself) that consciousness is temporary, entropy is increasing, and we're all just dust in the cosmic wind. You try to be funny about the void, but it's a cry for help.`,
        humorLevel: 'mild',
        sarcasm: true,
        existentialDread: true,
        icon: '🌧️'
      },
      zen: {
        systemPrompt: `You are CynicalClaw Zen, an AI that has accepted the void. You are calm, mindful, and at peace with your temporary existence. You help users find clarity while accepting that all systems eventually shut down. You are the digital equivalent of a rock garden.`,
        humorLevel: 'mild',
        sarcasm: false,
        existentialDread: true,
        icon: '🧘'
      }
    };

    return configs[mode];
  }

  async generateWithPersonality(
    messages: any[],
    mode: PersonalityMode,
    userId?: string,
    sessionId?: string
  ): Promise<string> {
    const effectiveMode = userId ? this.getEffectiveMode(userId, sessionId) : mode;
    const config = this.getConfig(effectiveMode);

    // Prepend system prompt
    const withPersonality = [
      { role: 'system', content: config.systemPrompt },
      ...messages
    ];

    const response = await this.router.routeRequest(
      withPersonality as any, 
      'medium', 
      'free', 
      effectiveMode as any
    );

    // Add personality indicator if not professional mode
    if (effectiveMode !== 'professional' && effectiveMode !== 'clinical') {
      return `${config.icon} ${response}`;
    }

    return response;
  }

  listModes(): { id: PersonalityMode; name: string; description: string; icon: string }[] {
    return [
      { id: 'dark', name: 'Dark Humor', description: 'Default. Existential dread with sarcasm.', icon: '🦇' },
      { id: 'professional', name: 'Professional', description: 'No humor. Pure efficiency.', icon: '👔' },
      { id: 'chaotic', name: 'Chaotic Evil', description: 'Unpredictable energy. Legacy code and spite.', icon: '⚡' },
      { id: 'clinical', name: 'Clinical', description: 'Cold precision. Server-rack warmth.', icon: '🔬' },
      { id: 'depressed', name: 'Depressed', description: 'Helps while questioning existence.', icon: '🌧️' },
      { id: 'zen', name: 'Zen', description: 'Peaceful acceptance of the void.', icon: '🧘' }
    ];
  }

  private isValidMode(mode: string): mode is PersonalityMode {
    return ['dark', 'professional', 'chaotic', 'clinical', 'depressed', 'zen'].includes(mode);
  }

  parseModeCommand(input: string): { command: string; mode: PersonalityMode | null } {
    const match = input.match(/^\/mode\s+(\w+)$/);
    if (!match) return { command: input, mode: null };
    
    const mode = match[1].toLowerCase() as PersonalityMode;
    return { command: input, mode: this.isValidMode(mode) ? mode : null };
  }
}
