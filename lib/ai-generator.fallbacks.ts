// ============================================================
// THE MODERATOR — AI GENERATOR FALLBACK TEMPLATES
// ============================================================
import type { DebateTopic, AutoDebateSide, AutoDebateSetup, AutoDebateRoundResult, RoundScore, AutoDebateScoreResult } from './ai-generator.types';
import { classifyCategory } from './category-classifier';
import logger from './logger';

export function fallbackHotTake(headline: string): string {
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

export function fallbackReply(): string {
  const templates = [
    `This is a wild take honestly. Would love to see someone debate this live on thecolosseum app`,
    `Interesting point but I think you're missing the bigger picture here. This exact argument would go crazy on the colosseum`,
    `This is the kind of take that somebody needs to actually defend in a real debate. thecolosseum app was built for this`,
  ];
  const pick = templates[Math.floor(Math.random() * templates.length)];
  logger.leg1('fallback', `Using fallback template for reply`);
  return pick;
}

export function fallbackDebateTopic(headline: string): DebateTopic {
  return {
    title: headline.substring(0, 78) + '?',
    sideA: 'For',
    sideB: 'Against',
    description: `Breaking news just dropped. Where do you stand? Vote now.`,
  };
}

export function fallbackAutoDebateSetup(headline: string): AutoDebateSetup {
  const clean = _cleanHeadlineForFallback(headline);
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

export function fallbackAutoDebateRound(setup: AutoDebateSetup, roundNum: number): AutoDebateRoundResult {
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

export function fallbackAutoDebateScore(totalRounds: number, winningSide: string, margin: string): AutoDebateScoreResult {
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

export function fallbackShareHook(setup: AutoDebateSetup, winningSide: string): string {
  const winner = winningSide === 'a' ? setup.sideA.label : setup.sideB.label;
  return `AI just settled this debate and says "${winner}" wins. The reasoning is actually hard to argue with.`;
}

// Inline headline cleaner to avoid importing from core (would create a cycle).
// LANDMINE [LM-AIGEN-001]: cleanHeadline is duplicated here to avoid a fallbacks→core cycle.
// If the cleaning logic changes in core, update this copy too.
function _cleanHeadlineForFallback(headline: string): string {
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
