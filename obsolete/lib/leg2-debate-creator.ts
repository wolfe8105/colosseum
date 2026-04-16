// ============================================================
// THE COLOSSEUM — LEG 2: DEBATE CREATOR (TypeScript)
// Takes a scored headline from the news scanner.
// Generates a debate topic via AI.
// Creates the hot take / debate entry in Supabase.
// Returns the shareable URL for the poster.
// The debate page EXISTS before anyone clicks the link.
// Migrated to TypeScript: Session 131.
// ============================================================
import { config } from '../bot-config';
import logger from './logger';
import { generateDebateTopic, generateHotTake, DebateTopic } from './ai-generator';
import { createHotTake, logBotAction } from './supabase-client';

export interface HeadlineInput {
  title: string;
  link: string;
  source: string;
  category?: string;
}

export interface DebateCreationResult {
  id: string;
  url: string;
  hotTakeText: string;
  debateTopic: DebateTopic;
  headline: string;
  category: string;
}

export async function createDebateFromHeadline(headline: HeadlineInput): Promise<DebateCreationResult | null> {
  if (!config.flags.leg2DebateCreator) {
    logger.debug('Leg 2 Debate Creator is disabled');
    return null;
  }

  try {
    logger.leg2('debate', `Creating debate from: "${headline.title.substring(0, 60)}..."`);

    // Step 1: Generate the hot take (for social post)
    const hotTakeText = await generateHotTake(headline.title, headline.category || 'general');

    // Step 2: Generate structured debate topic (for the app page)
    const debateTopic = await generateDebateTopic(headline.title);

    // Step 3: Create the hot take entry in Supabase
    const result = await createHotTake({
      content: hotTakeText,
      category: headline.category || 'general',
      sourceHeadline: headline.title,
      sourceUrl: headline.link,
    });

    if (!result) {
      logger.error(`Failed to create hot take in Supabase for: "${headline.title.substring(0, 50)}..."`);
      return null;
    }

    logger.leg2('debate', `✅ Debate created: ${result.url}`);

    return {
      id: result.id,
      url: result.url,
      hotTakeText,
      debateTopic,
      headline: headline.title,
      category: headline.category || 'general',
    };
  } catch (err) {
    logger.error(`Debate creation pipeline failed: ${(err as Error).message}`);

    await logBotAction({
      leg: 2,
      platform: 'supabase',
      type: 'debate_created',
      success: false,
      error: (err as Error).message,
      metadata: { headline: headline.title },
    });

    return null;
  }
}
