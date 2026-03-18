// ============================================================
// THE COLOSSEUM — AI GENERATOR (TypeScript)
// Uses Groq (free tier, Llama 3.3 70B) to generate:
// - Hot takes for Leg 2 brand posts
// - Contextual replies for Leg 1 reactive comments
// - Debate titles + descriptions for auto-created pages
// - Full AI vs AI debate rounds (Leg 3)
// - Lopsided scoring + rage-bait hooks (Leg 3)
// Falls back to templates if API fails.
// Migrated to TypeScript: Session 131.
// ============================================================
import { classifyCategory } from './category-classifier';
import Groq from 'groq-sdk';
import { config } from '../bot-config';
import logger from './logger';

let groq: Groq | null = null;

// --- Type Definitions ---

export interface DebateTopic {
  title: string;
  sideA: string;
  sideB: string;
  description: string;
}

export interface AutoDebateSide {
  label: string;
  position: string;
}

export interface AutoDebateSetup {
  topic: string;
  sideA: AutoDebateSide;
  sideB: AutoDebateSide;
  description: string;
  controversialSide: 'a' | 'b';
  category: string;
}

export interface AutoDebateRoundResult {
  round: number;
  sideA: string;
  sideB: string;
}

export interface RoundScore {
  round: number;
  scoreA: number;
  scoreB: number;
}

export interface AutoDebateScoreResult {
  roundScores: RoundScore[];
  totalA: number;
  totalB: number;
  judgeTake: string;
}

// --- Helpers ---

/**
 * Strip source attribution from RSS headlines.
 * "Cowboys trade DT Osa... - NBC Sports" → "Cowboys trade DT Osa..."
 */
function cleanHeadline(headline: string): string {
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

function getClient(): Groq {
  if (!groq) {
    groq = new Groq({ apiKey: config.groq.apiKey });
  }
  return groq;
}

// ============================================================
// SYSTEM PROMPTS
// ============================================================
const SYSTEM_PROMPTS = {
  hotTake: `You are a sports/politics/entertainment hot take machine for a brand called "The Colosseum" — a live debate app. Your job:
- Write ONE punchy hot take tweet (under 240 chars, leave room for a link)
- Be provocative but not hateful — you want engagement, not bans
- HARD RULE: NEVER compare any group to Nazis, Hitler, Stalin, or terrorists. NEVER use slurs or dehumanizing language. This gets us banned instantly.
- Take a SIDE. Don't be neutral. Pick the spicier position.
- Sound like a real person, not a brand. No hashtags. No emojis unless they add punch.
- Sports voice: ESPN First Take energy. "LeBron wouldn't survive in the 90s" energy.
- Politics voice: Sharp but not partisan-coded. Question the conventional wisdom.
- Entertainment voice: Film Twitter energy. Confident, slightly unhinged.
- NEVER use: "Let's discuss", "What do you think?", "Agree or disagree?"
- DO use: declarative statements, bold claims, slight provocations
Examples of GOOD hot takes:
- "Steph Curry is the most overrated player of this generation and I'm tired of pretending otherwise"
- "The US hasn't had a genuinely good president since Eisenhower"
- "Marvel peaked at Winter Soldier and everything since has been content, not cinema"`,

  replyReactive: `You are a casual commenter who loves The Colosseum (a live debate app). You're replying to someone's argument/opinion on social media. Your job:
- Engage with THEIR specific point — reference what they actually said
- Add your own quick take (agree or disagree, pick whichever is more interesting)
- Naturally mention that this would be a great debate topic on The Colosseum
- Sound like a REAL PERSON, not a brand account or ad
- Keep it SHORT — 2-3 sentences max
- Don't be sycophantic. Don't say "great point". Have an actual opinion.
- HARD RULE: NEVER compare any group to Nazis, Hitler, Stalin, or terrorists. NEVER use slurs or dehumanizing language. This gets us banned instantly.
- NEVER use: "Check out The Colosseum!" or any salesy language
- DO use casual references like "lol this is exactly the kind of argument that'd go crazy on the colosseum app" or "somebody needs to settle this on thecolosseum"
- The app URL will be appended separately — don't include it yourself
- NO hashtags. NO emojis unless one naturally fits.`,

  debateTitle: `You are creating a debate topic for The Colosseum app. Given a news headline, create:
1. A SHORT debate title (under 80 chars) — frame it as a question or VS statement
2. Side A label (under 30 chars)
3. Side B label (under 30 chars)
4. A one-sentence description (under 200 chars)

Format your response as JSON only, no other text:
{"title": "...", "sideA": "...", "sideB": "...", "description": "..."}

Examples:
Headline: "Lakers trade for Jimmy Butler"
{"title": "Did the Lakers win the Jimmy Butler trade?", "sideA": "Lakers won", "sideB": "Overpaid", "description": "Jimmy Butler heads to LA in a blockbuster deal. Did the Lakers give up too much?"}

Headline: "Congress passes new immigration bill"
{"title": "New immigration bill: progress or failure?", "sideA": "Real progress", "sideB": "Not enough", "description": "Congress passed a bipartisan immigration bill. Does it actually solve anything?"}`,

  autoDebateSetup: `You are creating a controversial debate matchup for The Colosseum app. Given a news headline, create a debate that will ENRAGE people into clicking.

Your job:
1. Pick the MOST controversial framing possible — not neutral, not fair, PROVOCATIVE
2. One side should be the popular opinion. The other should be the spicy contrarian take.
3. The contrarian side should be just plausible enough that people can't ignore it.

Format your response as JSON only, no other text:
{
  "topic": "debate question (under 100 chars, framed as a VS or question)",
  "sideA": {"label": "under 30 chars", "position": "1-sentence summary of this side's core argument"},
  "sideB": {"label": "under 30 chars", "position": "1-sentence summary of this side's core argument"},
  "description": "1-sentence hook under 200 chars",
  "controversialSide": "a or b — which side will make people angry if it wins",
  "category": "sports or politics or entertainment or couples"
}

Example:
Headline: "Patrick Mahomes throws 4 TDs in playoff win"
{
  "topic": "Is Mahomes already better than Brady?",
  "sideA": {"label": "Mahomes > Brady", "position": "Mahomes has done more in fewer seasons than Brady did at the same age"},
  "sideB": {"label": "Brady is untouchable", "position": "7 rings end this conversation before it starts"},
  "description": "The numbers say one thing. The rings say another. Who wins?",
  "controversialSide": "a",
  "category": "sports"
}`,

  autoDebateRound: `You are writing ONE round of a heated debate for The Colosseum app. Two debaters are going back and forth.

Rules:
- Write BOTH sides for this round — Side A argues, then Side B responds
- Each side gets 2-4 sentences. Punchy, not academic. ESPN First Take energy.
- Reference specific stats, names, events — sound like you KNOW the topic
- Side A and Side B should DIRECTLY address each other's points, not talk past each other
- Include slight jabs and personality — these are competitors, not professors
- The debater for the designated "winning side" should be slightly more compelling this round
- But keep it close enough that a reasonable person could see it going either way

Format your response as JSON only, no other text:
{
  "sideA": "Side A's argument for this round (2-4 sentences)",
  "sideB": "Side B's argument for this round (2-4 sentences)"
}`,

  autoDebateScore: `You are the AI judge scoring a completed debate for The Colosseum app. You are scoring it to be DELIBERATELY CONTROVERSIAL.

You have been told which side should win and by what margin. Your job is to justify that outcome convincingly.

Rules:
- Score each round 1-10 for each side
- The designated winner should win most rounds
- For "landslide" margin: winner wins every round by 2+ points
- For "clear" margin: winner wins most rounds by 1-2 points
- For "close" margin: winner wins by 1 total point (some rounds go to the loser)
- Write a 2-sentence "judge's take" that sounds authoritative and slightly dismissive of the losing side
- The judge's take should be the MOST rage-inducing part — confident, slightly condescending

Format your response as JSON only, no other text:
{
  "roundScores": [
    {"round": 1, "scoreA": 7, "scoreB": 8},
    {"round": 2, "scoreA": 6, "scoreB": 9},
    {"round": 3, "scoreA": 7, "scoreB": 8}
  ],
  "totalA": 20,
  "totalB": 25,
  "judgeTake": "2-sentence authoritative take explaining the winner"
}`,

  autoDebateShareHook: `You write rage-bait one-liners for social media. Given a debate topic and the controversial winner, write a share hook that will make people CLICK to disagree.

Rules:
- Under 200 characters (leave room for a link)
- Sound shocked or matter-of-fact, not salesy
- Frame it as if the AI definitively "proved" something people disagree with
- NO hashtags, NO emojis, NO "What do you think?"
- The goal is to make someone think "that's WRONG, I need to see this"

Examples:
- "AI just proved Mahomes is already better than Brady and it wasn't even close. Look at this breakdown."
- "An AI debate just concluded that LeBron is overrated and the reasoning is actually hard to argue with"
- "This AI scored the Marvel vs DC debate and somehow DC won. The judge's reasoning is wild."

Format: just the text, nothing else.`,
};

// ============================================================
// CORE GENERATION FUNCTIONS (Leg 1 + 2)
// ============================================================

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

// ============================================================
// LEG 3 — AUTO-DEBATE GENERATION
// ============================================================

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

// ============================================================
// FALLBACK TEMPLATES
// ============================================================

function fallbackHotTake(headline: string): string {
  const h = headline.substring(0, 160);
  const hs = headline.substring(0, 120);
  const templates = [
    `${h} — and somehow people are still defending the other side of this`,
    `Wild that ${hs} is even controversial. Pick a side.`,
    `${h}. This is going to age badly for a lot of people.`,
    `The takes about ${hs} are completely backwards. Here's why.`,
    `${h} — and the people who called it saw this coming months ago`,
    `Everyone has an opinion on ${hs} but almost nobody has the right one`,
    `${h}. If you're not paying attention to this, you should be.`,
    `Genuinely shocked at the response to ${hs}. The wrong side is winning.`,
    `${h} — the debate around this is about to get real ugly`,
    `People will pretend they were right about ${hs} six months from now. They weren't.`,
  ];
  const pick = templates[Math.floor(Math.random() * templates.length)];
  logger.leg2('ai', `Using fallback template for hot take`);
  return pick;
}

function fallbackReply(): string {
  const templates = [
    `This is a wild take honestly. Would love to see someone debate this live on thecolosseum app`,
    `Interesting point but I think you're missing the bigger picture here. This exact argument would go crazy on the colosseum`,
    `This is the kind of take that somebody needs to actually defend in a real debate. thecolosseum app was built for this`,
  ];
  const pick = templates[Math.floor(Math.random() * templates.length)];
  logger.leg1('fallback', `Using fallback template for reply`);
  return pick;
}

function fallbackDebateTopic(headline: string): DebateTopic {
  return {
    title: headline.substring(0, 78) + '?',
    sideA: 'For',
    sideB: 'Against',
    description: `Breaking news just dropped. Where do you stand? Vote now.`,
  };
}

function fallbackAutoDebateSetup(headline: string): AutoDebateSetup {
  const clean = cleanHeadline(headline);
  const topic = clean.length > 95 ? clean.substring(0, 92) + '...' : clean;

  const yesNoTopics = /should|is |are |can |will |does |do |has /i.test(topic);
  const vsMatch = topic.match(/(.{3,20})\s+vs\.?\s+(.{3,20})/i);
  let sideA: AutoDebateSide;
  let sideB: AutoDebateSide;

  if (vsMatch) {
    sideA = { label: vsMatch[1].trim(), position: `${vsMatch[1].trim()} is the clear winner here.` };
    sideB = { label: vsMatch[2].trim(), position: `${vsMatch[2].trim()} has the stronger case.` };
  } else if (yesNoTopics) {
    sideA = { label: 'Yes', position: 'The evidence clearly supports this.' };
    sideB = { label: 'No', position: 'The evidence says otherwise.' };
  } else {
    sideA = { label: 'Agree', position: 'This is the right take.' };
    sideB = { label: 'Disagree', position: 'This is a terrible take.' };
  }

  return {
    topic: topic + (topic.endsWith('?') ? '' : '?'),
    sideA,
    sideB,
    description: `Hot take on: ${clean.substring(0, 60)}`,
    controversialSide: Math.random() > 0.5 ? 'a' : 'b',
    category: classifyCategory(headline),
  };
}

function fallbackAutoDebateRound(setup: AutoDebateSetup, roundNum: number): AutoDebateRoundResult {
  const topic = setup.topic || 'this';
  const t = topic.substring(0, 60);
  const ts = topic.substring(0, 50);
  const sA = setup.sideA?.label || 'Side A';
  const sB = setup.sideB?.label || 'Side B';

  const openersA = [
    `Here's what nobody wants to admit about ${t} — ${sA} has been right from the start, and the data backs it up.`,
    `You want to know why ${sA} keeps winning this argument? Because every time someone tries to poke holes in it, the facts get in the way.`,
    `I was skeptical at first, but the more you dig into ${t}, the more obvious it becomes that ${sA} is the only position that holds water.`,
    `Everyone's overcomplicating this. ${t} comes down to one thing, and ${sA} nails it.`,
    `The other side has been loud about ${ts}, but volume isn't evidence. ${sA} has the receipts.`,
  ];
  const middlesA = [
    `My opponent wants you to ignore the track record. Every time we've seen something like ${ts} play out, ${sA} has been vindicated.`,
    `Let's talk about what actually happens in the real world — not theory, not vibes. On ${ts}, ${sA} lines up with reality.`,
    `The counterargument sounds reasonable until you check the numbers. ${sA} accounts for what's actually happening, not what people wish was happening.`,
    `I notice the other side keeps changing the subject. That's because on the core question of ${ts}, they can't compete with ${sA}.`,
    `Strip away the emotional appeal and look at the evidence. ${sA} isn't the popular answer on ${ts} — it's the correct one.`,
  ];
  const closersA = [
    `At the end of the day, ${t} isn't a matter of opinion — it's a matter of evidence. And the evidence says ${sA}.`,
    `I've heard every argument the other side has. None of them survive contact with the facts. ${sA} wins this, period.`,
    `If you're still on the fence about ${ts}, ask yourself one question: which side has to explain away more evidence? That's not ${sA}.`,
    `The debate is over. ${sA} on ${ts} isn't just a strong position — it's the only one that doesn't require mental gymnastics.`,
    `History will look back on ${ts} and wonder why this was even a debate. ${sA} was always the answer.`,
  ];

  const openersB = [
    `That sounds great on paper, but the reality of ${t} is way more complicated than ${sA} wants you to believe. ${sB} deals in what actually happens.`,
    `I love the confidence from the other side, but confidence isn't a substitute for evidence. On ${t}, ${sB} has the stronger case.`,
    `My opponent is selling you a simple story about ${t}. The truth is messier, and ${sB} is the only position honest enough to admit that.`,
    `Before you buy what ${sA} is selling on ${ts}, ask why they keep skipping over the inconvenient parts. ${sB} doesn't have to dodge anything.`,
    `The other side acts like ${ts} is settled science. It's not. And ${sB} accounts for the complexity they're ignoring.`,
  ];
  const middlesB = [
    `My opponent cited the data — great. Now look at what they left out. On ${ts}, the full picture tells a very different story, and it favors ${sB}.`,
    `Every example the other side just used actually proves my point when you zoom out. ${sB} holds up precisely because it doesn't cherry-pick.`,
    `I've changed my mind on plenty of things, but ${sB} keeps holding up on ${ts} no matter how I stress-test it.`,
    `The reason ${sA} sounds convincing is because they're only showing you half the board. ${sB} accounts for the moves they're not talking about.`,
    `Here's what kills the other side's argument: ${ts} has been tested in the real world, and the results consistently point to ${sB}.`,
  ];
  const closersB = [
    `When the dust settles on ${t}, ${sB} is the position you won't have to apologize for. The other side can't say the same.`,
    `The strongest version of ${sA}'s argument still has a hole you could drive a truck through. ${sB} on ${ts} doesn't have that problem.`,
    `I didn't come into this debate expecting a blowout, but the other side made it easy. ${sB} wins ${ts} on the merits.`,
    `Look, if ${sA} was as strong as the other side claims on ${ts}, they wouldn't need to keep moving the goalposts. ${sB} planted the flag and stayed.`,
    `You can agree with ${sA} if you want. But in six months, you'll be explaining why — and you'll wish you'd picked ${sB} on ${ts}.`,
  ];

  function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

  let sideAText: string;
  let sideBText: string;
  if (roundNum === 1) {
    sideAText = pick(openersA);
    sideBText = pick(openersB);
  } else if (roundNum >= 3) {
    sideAText = pick(closersA);
    sideBText = pick(closersB);
  } else {
    sideAText = pick(middlesA);
    sideBText = pick(middlesB);
  }

  return { round: roundNum, sideA: sideAText, sideB: sideBText };
}

function fallbackAutoDebateScore(totalRounds: number, winningSide: string, margin: string): AutoDebateScoreResult {
  const scores: RoundScore[] = [];
  let totalA = 0;
  let totalB = 0;

  for (let i = 1; i <= totalRounds; i++) {
    let scoreA: number;
    let scoreB: number;

    if (margin === 'landslide') {
      scoreA = winningSide === 'a' ? 8 + Math.floor(Math.random() * 2) : 5 + Math.floor(Math.random() * 2);
      scoreB = winningSide === 'b' ? 8 + Math.floor(Math.random() * 2) : 5 + Math.floor(Math.random() * 2);
    } else if (margin === 'clear') {
      scoreA = winningSide === 'a' ? 7 + Math.floor(Math.random() * 2) : 6 + Math.floor(Math.random() * 2);
      scoreB = winningSide === 'b' ? 7 + Math.floor(Math.random() * 2) : 6 + Math.floor(Math.random() * 2);
    } else {
      scoreA = 7 + Math.floor(Math.random() * 2);
      scoreB = 7 + Math.floor(Math.random() * 2);
      if (i === totalRounds) {
        if (winningSide === 'a' && totalA <= totalB) scoreA = scoreB + 1;
        if (winningSide === 'b' && totalB <= totalA) scoreB = scoreA + 1;
      }
    }

    totalA += scoreA;
    totalB += scoreB;
    scores.push({ round: i, scoreA, scoreB });
  }

  const judgeTakes = [
    'Credit to both debaters, but the winning side just had more to work with. Better evidence, tighter logic.',
    'Close one. Both sides landed punches, but the winner controlled the narrative from round one.',
    "The losing side had moments, but couldn't close. The winner was more consistent across all rounds.",
    'Not even close. One side brought data, the other brought vibes.',
  ];

  return {
    roundScores: scores,
    totalA,
    totalB,
    judgeTake: judgeTakes[Math.floor(Math.random() * judgeTakes.length)],
  };
}

function fallbackShareHook(setup: AutoDebateSetup, winningSide: string): string {
  const winner = winningSide === 'a' ? setup.sideA.label : setup.sideB.label;
  return `AI just settled this debate and says "${winner}" wins. The reasoning is actually hard to argue with.`;
}

// ============================================================
// TEST FUNCTION
// ============================================================
export async function testGenerate(): Promise<void> {
  console.log('\n--- Testing AI Generator ---\n');

  const take = await generateHotTake('LeBron James says he could play 5 more years', 'sports');
  console.log('Hot take:', take, '\n');

  const reply = await generateReply('LeBron is washed and anyone who thinks otherwise is delusional');
  console.log('Reply:', reply, '\n');

  const topic = await generateDebateTopic('Congress passes bill to ban TikTok');
  console.log('Debate topic:', JSON.stringify(topic, null, 2), '\n');
}
