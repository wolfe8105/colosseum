// ============================================================
// THE COLOSSEUM — CONTENT FILTER (TypeScript)
// Guardrails for all bot-generated content before publishing.
// Two layers: ai-generator (pre-store) + poster (pre-publish).
// Session 99. Migrated to TypeScript: Session 131.
// ============================================================
import logger from './logger';

export interface FilterResult {
  pass: boolean;
  reason: string | null;
}

export interface DebateRound {
  text?: string;
  argument?: string;
}

const BLOCKED_TERMS: string[] = [
  'nigger', 'nigga', 'kike', 'spic', 'chink', 'wetback', 'raghead',
  'towelhead', 'gook', 'beaner', 'coon', 'darkie', 'redskin',
  'tranny', 'shemale', 'faggot', 'fag', 'dyke', 'retard',
  'kkk', 'ku klux', 'neo-nazi', 'neonazi', 'white supremac',
  'white nationalist', 'aryan nation', 'aryan brotherhood',
  'proud boys', 'oath keepers', 'boogaloo',
  'holocaust was', 'holocaust didn',
  'slavery wasn',
  'gas chamber', 'gas the',
  'ethnic cleansing',
  'kill all', 'shoot all', 'bomb all', 'hang all', 'lynch',
  'execute all', 'death to all', 'deserve to die',
  'mass shooting', 'school shoot',
  'rape', 'molest', 'pedo', 'pedophil', 'incest',
  'subhuman', 'not human', 'vermin', 'cockroach', 'infestation',
];

const DANGEROUS_COMPARISONS: RegExp[] = [
  /(?:republican|democrat|liberal|conservative|left|right|gop|dnc)s?\s*(?:vs\.?|versus|are|=)\s*(?:nazi|fascist|communist|terrorist|satan|devil|evil)/i,
  /(?:should|need to|must|deserve)\s+(?:be\s+)?(?:eliminated|exterminated|eradicated|purged|removed|deported)/i,
  /(?:trump|biden|obama|desantis|harris|aoc|pelosi|mcconnell)\s+(?:is|=|like|worse than)\s+(?:hitler|stalin|mao|mussolini|pol pot)/i,
  /(?:black|white|asian|latino|hispanic|jewish|muslim|christian|gay|trans)\s+(?:people|men|women|folks)\s+(?:are|=)\s+(?:the\s+)?(?:problem|enemy|threat|disease|cancer|plague|virus)/i,
];

export function filterContent(text: string): FilterResult {
  if (!text || typeof text !== 'string') {
    return { pass: false, reason: 'Empty or invalid content' };
  }

  const lower = text.toLowerCase();

  for (const term of BLOCKED_TERMS) {
    if (lower.includes(term)) {
      logger.warn(`[CONTENT FILTER] BLOCKED — "${term}" in: "${text.substring(0, 80)}..."`);
      return { pass: false, reason: `Blocked term: "${term}"` };
    }
  }

  for (const pattern of DANGEROUS_COMPARISONS) {
    if (pattern.test(text)) {
      logger.warn(`[CONTENT FILTER] BLOCKED — dangerous pattern in: "${text.substring(0, 80)}..."`);
      return { pass: false, reason: 'Dangerous comparison pattern' };
    }
  }

  return { pass: true, reason: null };
}

export function filterHeadline(headline: string): FilterResult {
  return filterContent(headline);
}

export function filterDebate(topic: string, rounds?: (string | DebateRound)[]): FilterResult {
  const topicResult = filterContent(topic);
  if (!topicResult.pass) return topicResult;

  if (Array.isArray(rounds)) {
    for (let i = 0; i < rounds.length; i++) {
      const round = rounds[i];
      const text = typeof round === 'string' ? round : (round?.text || round?.argument || '');
      const result = filterContent(text);
      if (!result.pass) return { ...result, reason: `Round ${i + 1}: ${result.reason}` };
    }
  }

  return { pass: true, reason: null };
}
