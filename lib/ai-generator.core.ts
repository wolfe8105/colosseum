// ============================================================
// THE MODERATOR — AI GENERATOR CORE (Leg 1 + 2)
// ============================================================
import type { DebateTopic } from './ai-generator.types';
import { SYSTEM_PROMPTS } from './ai-generator.prompts';
import { fallbackHotTake, fallbackReply, fallbackDebateTopic } from './ai-generator.fallbacks';
import Groq from 'groq-sdk';
import { config } from '../bot-config';
import logger from './logger';

let groq: Groq | null = null;

/**
 * Strip source attribution from RSS headlines.
 * "Cowboys trade DT Osa... - NBC Sports" → "Cowboys trade DT Osa..."
 */
export function cleanHeadline(headline: string): string {
  if (!headline) return '';
  let h = headline.trim();

  if (h.endsWith('?') && h.includes(' - ')) {
    const lastDash = h.lastIndexOf(' - ');
    const afterDash = h.substring(lastDash + 3).replace(/\?$/, '').trim();
    if (!afterDash.includes(' ') || afterDash.length < 30) {
      h = h.substring(0, lastDash).trim();
    }
  } else if (h.includes(' - ')) {
    const lastDash = h.lastIndexOf(' - ');
    const afterDash = h.substring(lastDash + 3).trim();
    if (!afterDash.includes(' ') || afterDash.length < 30) {
      h = h.substring(0, lastDash).trim();
    }
  }
  return h;
}

export function getClient(): Groq {
  if (!groq) {
    groq = new Groq({ apiKey: config.groq.apiKey });
  }
  return groq;
}

export async function generateHotTake(headline: string, category: string = 'general'): Promise<string> {
  headline = cleanHeadline(headline);
  try {
    const client = getClient();
    const response = await client.chat.completions.create({
      model: config.groq.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS.hotTake },
        { role: 'user', content: `News headline: "${headline}"\nCategory: ${category}\n\nWrite ONE hot take tweet. Under 240 characters. No hashtags.` },
      ],
      max_tokens: config.groq.maxTokens,
      temperature: 0.9,
    });

    const take = response.choices[0]?.message?.content?.trim();
    if (!take) throw new Error('Empty response from Groq');

    const cleaned = take.replace(/^["']|["']$/g, '').trim();
    logger.leg2('ai', `Generated hot take: "${cleaned.substring(0, 60)}..."`);
    return cleaned;
  } catch (err) {
    logger.error(`Hot take generation failed: ${(err as Error).message}`);
    return fallbackHotTake(headline);
  }
}

export async function generateReply(originalText: string, platform: string = 'reddit'): Promise<string> {
  try {
    const client = getClient();
    const charLimit = platform === 'twitter' ? 240 : 500;
    const response = await client.chat.completions.create({
      model: config.groq.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS.replyReactive },
        { role: 'user', content: `Platform: ${platform}\nTheir post/comment: "${originalText.substring(0, 500)}"\n\nWrite a reply under ${charLimit} characters. Reference their specific point. Naturally mention The Colosseum app.` },
      ],
      max_tokens: config.groq.maxTokens,
      temperature: 0.85,
    });

    const reply = response.choices[0]?.message?.content?.trim();
    if (!reply) throw new Error('Empty response from Groq');

    const cleaned = reply.replace(/^["']|["']$/g, '').trim();
    logger.leg1(platform, `Generated reply: "${cleaned.substring(0, 60)}..."`);
    return cleaned;
  } catch (err) {
    logger.error(`Reply generation failed: ${(err as Error).message}`);
    return fallbackReply();
  }
}

export async function generateDebateTopic(headline: string): Promise<DebateTopic> {
  headline = cleanHeadline(headline);
  try {
    const client = getClient();
    const response = await client.chat.completions.create({
      model: config.groq.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS.debateTitle },
        { role: 'user', content: `Headline: "${headline}"` },
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? '';
    const jsonStr = raw.replace(/```json\n?|```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr) as DebateTopic;

    if (!parsed.title || !parsed.sideA || !parsed.sideB) {
      throw new Error('Missing required fields in debate topic');
    }

    logger.leg2('ai', `Generated debate topic: "${parsed.title}"`);
    return parsed;
  } catch (err) {
    logger.error(`Debate topic generation failed: ${(err as Error).message}`);
    return fallbackDebateTopic(headline);
  }
}
