// ============================================================
// THE MODERATOR — AI GENERATOR LEG 3 (Auto-Debate)
// ============================================================
import type { AutoDebateSetup, AutoDebateRoundResult, AutoDebateScoreResult } from './ai-generator.types';
import { SYSTEM_PROMPTS } from './ai-generator.prompts';
import { fallbackAutoDebateSetup, fallbackAutoDebateRound, fallbackAutoDebateScore, fallbackShareHook } from './ai-generator.fallbacks';
import { getClient, cleanHeadline } from './ai-generator.core';
import { config } from '../bot-config';
import logger from './logger';

export async function generateAutoDebateSetup(headline: string, category: string = 'general'): Promise<AutoDebateSetup> {
  headline = cleanHeadline(headline);
  try {
    const client = getClient();
    const response = await client.chat.completions.create({
      model: config.groq.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS.autoDebateSetup },
        { role: 'user', content: `Headline: "${headline}"\nCategory hint: ${category}` },
      ],
      max_tokens: 400,
      temperature: 0.85,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? '';
    const jsonStr = raw.replace(/```json\n?|```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr) as AutoDebateSetup;

    if (!parsed.topic || !parsed.sideA || !parsed.sideB || !parsed.controversialSide) {
      throw new Error('Missing required fields in auto-debate setup');
    }

    logger.leg3('ai', `Generated debate setup: "${parsed.topic}"`);
    return parsed;
  } catch (err) {
    logger.error(`Auto-debate setup generation failed: ${(err as Error).message}`);
    return fallbackAutoDebateSetup(headline);
  }
}

export async function generateAutoDebateRound(
  setup: AutoDebateSetup,
  roundNum: number,
  totalRounds: number,
  previousRounds: AutoDebateRoundResult[],
  winningSide: string,
): Promise<AutoDebateRoundResult> {
  try {
    const client = getClient();

    let context = `Debate topic: "${setup.topic}"\n`;
    context += `Side A (${setup.sideA.label}): ${setup.sideA.position}\n`;
    context += `Side B (${setup.sideB.label}): ${setup.sideB.position}\n`;
    context += `This is round ${roundNum} of ${totalRounds}.\n`;
    context += `The winning side this round should be: Side ${winningSide.toUpperCase()}\n`;

    if (previousRounds.length > 0) {
      context += `\nPrevious rounds for context:\n`;
      for (const prev of previousRounds) {
        context += `Round ${prev.round}:\n`;
        context += `  Side A: "${prev.sideA.substring(0, 150)}..."\n`;
        context += `  Side B: "${prev.sideB.substring(0, 150)}..."\n`;
      }
      context += `\nBuild on what was said. Don't repeat points. Escalate the intensity.`;
    } else {
      context += `\nThis is the opening round. Set the stage with strong opening arguments.`;
    }

    const response = await client.chat.completions.create({
      model: config.groq.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS.autoDebateRound },
        { role: 'user', content: context },
      ],
      max_tokens: 400,
      temperature: 0.85,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? '';
    const jsonStr = raw.replace(/```json\n?|```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr) as { sideA: string; sideB: string };

    if (!parsed.sideA || !parsed.sideB) {
      throw new Error('Missing side arguments in round');
    }

    logger.leg3('ai', `Generated round ${roundNum}: A=${parsed.sideA.length}chars, B=${parsed.sideB.length}chars`);
    return { round: roundNum, sideA: parsed.sideA, sideB: parsed.sideB };
  } catch (err) {
    logger.error(`Auto-debate round ${roundNum} generation failed: ${(err as Error).message}`);
    return fallbackAutoDebateRound(setup, roundNum);
  }
}

export async function generateAutoDebateScore(
  setup: AutoDebateSetup,
  rounds: AutoDebateRoundResult[],
  winningSide: string,
  margin: string,
): Promise<AutoDebateScoreResult> {
  try {
    const client = getClient();

    let context = `Debate topic: "${setup.topic}"\n`;
    context += `Side A (${setup.sideA.label}): ${setup.sideA.position}\n`;
    context += `Side B (${setup.sideB.label}): ${setup.sideB.position}\n`;
    context += `\nThe designated winner is: Side ${winningSide.toUpperCase()}\n`;
    context += `Desired margin: ${margin}\n`;
    context += `Total rounds: ${rounds.length}\n\n`;

    for (const r of rounds) {
      context += `Round ${r.round}:\n`;
      context += `  Side A: "${r.sideA.substring(0, 200)}"\n`;
      context += `  Side B: "${r.sideB.substring(0, 200)}"\n\n`;
    }

    context += `Score this debate. The winner MUST be Side ${winningSide.toUpperCase()} by a "${margin}" margin. Make the judge's take slightly condescending toward the loser.`;

    const response = await client.chat.completions.create({
      model: config.groq.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS.autoDebateScore },
        { role: 'user', content: context },
      ],
      max_tokens: 400,
      temperature: 0.7,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? '';
    const jsonStr = raw.replace(/```json\n?|```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr) as AutoDebateScoreResult;

    if (!parsed.roundScores || !parsed.judgeTake) {
      throw new Error('Missing required scoring fields');
    }

    logger.leg3('ai', `Scored debate: ${parsed.totalA}-${parsed.totalB}, winner=Side ${winningSide.toUpperCase()}`);
    return parsed;
  } catch (err) {
    logger.error(`Auto-debate scoring failed: ${(err as Error).message}`);
    return fallbackAutoDebateScore(rounds.length, winningSide, margin);
  }
}

export async function generateShareHook(setup: AutoDebateSetup, winningSide: string, margin: string): Promise<string> {
  try {
    const client = getClient();
    const winnerLabel = winningSide === 'a' ? setup.sideA.label : setup.sideB.label;
    const loserLabel = winningSide === 'a' ? setup.sideB.label : setup.sideA.label;

    const context = `Debate topic: "${setup.topic}"\nWinner: "${winnerLabel}"\nLoser: "${loserLabel}"\nMargin: ${margin}\n\nWrite a rage-bait one-liner under 200 chars that will make "${loserLabel}" fans click to disagree.`;

    const response = await client.chat.completions.create({
      model: config.groq.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS.autoDebateShareHook },
        { role: 'user', content: context },
      ],
      max_tokens: 120,
      temperature: 0.9,
    });

    const hook = response.choices[0]?.message?.content?.trim();
    if (!hook) throw new Error('Empty share hook');

    const cleaned = hook.replace(/^["']|["']$/g, '').trim();
    logger.leg3('ai', `Generated share hook: "${cleaned.substring(0, 60)}..."`);
    return cleaned;
  } catch (err) {
    logger.error(`Share hook generation failed: ${(err as Error).message}`);
    return fallbackShareHook(setup, winningSide);
  }
}
