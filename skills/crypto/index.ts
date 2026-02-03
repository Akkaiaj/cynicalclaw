import { BaseSkill } from '../../gateway/src/skills/BaseSkill';
import { ToolDefinition } from '../../gateway/src/types';
import axios from 'axios';

export default class CryptoSkill extends BaseSkill {
  readonly name = 'crypto';
  readonly description = 'Cryptocurrency price checks';

  getTools(): ToolDefinition[] {
    return [
      {
        name: 'get_crypto_price',
        description: 'Get cryptocurrency price',
        parameters: {
          type: 'object',
          properties: {
            coin: { type: 'string' }
          },
          required: ['coin']
        }
      }
    ];
  }

  async executeTool(toolName: string, args: any): Promise<string> {
    if (toolName === 'get_crypto_price') {
      try {
        const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${args.coin}&vs_currencies=usd`);
        const price = response.data[args.coin]?.usd;
        return price ? `${args.coin}: $${price}` : 'Coin not found. Maybe it rugged?';
      } catch (error) {
        return 'API error. The crypto gods are displeased.';
      }
    }
    return 'Unknown tool';
  }
}
