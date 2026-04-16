// ============================================================
// THE MODERATOR — AI GENERATOR (orchestrator)
// Sub-modules:
//   ai-generator.types.ts    — interfaces
//   ai-generator.prompts.ts  — SYSTEM_PROMPTS
//   ai-generator.fallbacks.ts — fallback template functions
//   ai-generator.core.ts     — Leg 1 + 2 generation + Groq client
//   ai-generator.leg3.ts     — Leg 3 auto-debate generation
//
// LANDMINE [LM-AIGEN-002]: lib/leg1-*.js, lib/leg2-*.js, lib/leg3-*.js use
// require('./ai-generator') which resolves to the compiled JS output of this
// orchestrator. No source lib/ai-generator.js exists in this repo; if one
// appears it may shadow the compiled output. Do not create one.
// ============================================================
export type {
  DebateTopic,
  AutoDebateSide,
  AutoDebateSetup,
  AutoDebateRoundResult,
  RoundScore,
  AutoDebateScoreResult,
} from './ai-generator.types';

export {
  generateHotTake,
  generateReply,
  generateDebateTopic,
} from './ai-generator.core';

export {
  generateAutoDebateSetup,
  generateAutoDebateRound,
  generateAutoDebateScore,
  generateShareHook,
} from './ai-generator.leg3';

// ============================================================
// TEST FUNCTION
// ============================================================
import { generateHotTake, generateReply, generateDebateTopic } from './ai-generator.core';

export async function testGenerate(): Promise<void> {
  console.log('\n--- Testing AI Generator ---\n');

  const take = await generateHotTake('LeBron James says he could play 5 more years', 'sports');
  console.log('Hot take:', take, '\n');

  const reply = await generateReply('LeBron is washed and anyone who thinks otherwise is delusional');
  console.log('Reply:', reply, '\n');

  const topic = await generateDebateTopic('Congress passes bill to ban TikTok');
  console.log('Debate topic:', JSON.stringify(topic, null, 2), '\n');
}
