/**
 * THE MODERATOR — Profile Depth Engine (TypeScript)
 *
 * Extracted from moderator-profile-depth.html inline script.
 * 20 sections, 100 questions, tier system integration, power-up + cosmetic rewards.
 *
 * Migration: Session 128 (Phase 4)
 */

// ES imports (replaces window globals)
import { ready, getCurrentUser, getIsPlaceholderMode, getSupabaseClient, safeRpc } from '../auth.ts';
import { checkProfileMilestones } from '../tokens.ts';
import { FEATURES } from '../config.ts';
import '../tiers.ts';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

interface QuestionBase {
  id: string;
  label: string;
}

interface InputQuestion extends QuestionBase {
  type: 'input';
  placeholder?: string;
}

interface ChipsQuestion extends QuestionBase {
  type: 'chips';
  options: string[];
  multi?: boolean;
  max?: number;
}

interface SliderQuestion extends QuestionBase {
  type: 'slider';
  min: number;
  max: number;
  labels: [string, string];
}

interface SelectQuestion extends QuestionBase {
  type: 'select';
  options: string[];
}

type Question = InputQuestion | ChipsQuestion | SliderQuestion | SelectQuestion;

interface SectionReward {
  type: 'powerup';
  text: string;
  powerUpId: string;
}

interface Section {
  id: string;
  icon: string;
  name: string;
  reward: SectionReward;
  questions: Question[];
}

type AnswerValue = string | number | string[];
type Answers = Record<string, AnswerValue>;

// ============================================================
// ESCAPE HTML (SESSION 64 — OWASP mandatory)
// ============================================================

function escHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ============================================================
// SECTIONS DATA
// ============================================================

const SECTIONS: Section[] = [
  // ── SECTION 1: THE BASICS (5 questions) ──
  {
    id: 'basics', icon: '👤', name: 'THE BASICS',
    reward: { type: 'powerup', text: 'Free Reveal power-up', powerUpId: 'reveal' },
    questions: [
      { id: 'b1', label: 'What should people call you?', type: 'input', placeholder: 'Display name' },
      { id: 'b2', label: 'Where are you from?', type: 'input', placeholder: 'City, State' },
      { id: 'b3', label: 'Gender', type: 'chips', options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'] },
      { id: 'b4', label: 'Age range', type: 'chips', options: ['16-18', '19-24', '25-34', '35-44', '45-54', '55+'] },
      { id: 'b5', label: 'Household income range', type: 'select', options: ['Under $25K', '$25-50K', '$50-75K', '$75-100K', '$100-150K', '$150K+', 'Prefer not to say'] },
    ]
  },
  // ── SECTION 2: POLITICS (5 questions) ──
  {
    id: 'politics', icon: '🏛️', name: 'POLITICS',
    reward: { type: 'powerup', text: 'Free 2x Multiplier power-up', powerUpId: 'multiplier_2x' },
    questions: [
      { id: 'p1', label: 'Where do you lean politically?', type: 'slider', min: 1, max: 10, labels: ['Far Left', 'Far Right'] },
      { id: 'p2', label: 'Top 3 political issues you care about', type: 'chips', multi: true, max: 3, options: ['Economy', 'Immigration', 'Healthcare', 'Climate', 'Education', 'Foreign Policy', 'Gun Rights', 'Social Justice', 'Tax Reform', 'Housing'] },
      { id: 'p3', label: 'How often do you discuss politics?', type: 'chips', options: ['Daily', 'Weekly', 'Monthly', 'Rarely'] },
      { id: 'p4', label: 'How do you feel about the current direction of the country?', type: 'slider', min: 1, max: 10, labels: ['Wrong track', 'Right direction'] },
      { id: 'p5', label: 'Which best describes your political identity?', type: 'chips', options: ['Party loyalist', 'Independent thinker', 'Single-issue voter', "Don't care about politics"] },
    ]
  },
  // ── SECTION 3: SPORTS (5 questions) ──
  {
    id: 'sports', icon: '🏟️', name: 'SPORTS',
    reward: { type: 'powerup', text: 'Free Silence power-up', powerUpId: 'silence' },
    questions: [
      { id: 's1', label: 'Favorite sports (pick up to 3)', type: 'chips', multi: true, max: 3, options: ['NFL', 'NBA', 'MLB', 'NHL', 'Soccer', 'MMA/UFC', 'Boxing', 'College FB', 'College BB', 'Tennis', 'Golf', 'F1'] },
      { id: 's2', label: 'Hottest take you believe about sports?', type: 'input', placeholder: 'e.g. MJ > LeBron, no debate' },
      { id: 's3', label: 'How deep is your sports knowledge?', type: 'slider', min: 1, max: 10, labels: ['Casual', 'Stat Nerd'] },
      { id: 's4', label: 'Do you bet on sports?', type: 'chips', options: ['Regularly', 'Sometimes', 'Rarely', 'Never'] },
      { id: 's5', label: 'How much do you spend on sports per month? (tickets, merch, streaming, betting)', type: 'select', options: ['$0', '$1-25', '$25-50', '$50-100', '$100-250', '$250+'] },
    ]
  },
  // ── SECTION 4: ENTERTAINMENT (5 questions) ──
  {
    id: 'entertainment', icon: '🎬', name: 'ENTERTAINMENT',
    reward: { type: 'powerup', text: 'Free Shield power-up', powerUpId: 'shield' },
    questions: [
      { id: 'e1', label: 'What do you watch/consume most?', type: 'chips', multi: true, max: 3, options: ['Movies', 'TV Series', 'YouTube', 'Podcasts', 'Anime', 'Reality TV', 'Documentaries', 'Live Sports'] },
      { id: 'e2', label: 'Most overrated movie or show?', type: 'input', placeholder: 'Name it...' },
      { id: 'e3', label: 'Music genre that defines you', type: 'chips', options: ['Hip Hop', 'Rock', 'Pop', 'Country', 'R&B', 'EDM', 'Jazz', 'Latin', 'Classical', 'Metal'] },
      { id: 'e4', label: 'How many streaming services do you pay for?', type: 'select', options: ['0', '1', '2', '3', '4', '5+'] },
      { id: 'e5', label: 'Would you pay $20/mo for one service that had everything?', type: 'chips', options: ['Absolutely', 'Probably', 'Maybe', 'No way'] },
    ]
  },
  // ── SECTION 5: DEBATE STYLE (5 questions) ──
  {
    id: 'debate_style', icon: '⚔️', name: 'DEBATE STYLE',
    reward: { type: 'powerup', text: 'Free Silence power-up', powerUpId: 'silence' },
    questions: [
      { id: 'd1', label: 'How do you argue?', type: 'chips', options: ['Facts & data', 'Emotion & passion', 'Humor & wit', 'Experience & stories'] },
      { id: 'd2', label: 'When you lose an argument, you...', type: 'chips', options: ['Accept it gracefully', 'Double down', 'Change the subject', 'Research more'] },
      { id: 'd3', label: 'Debate experience level', type: 'slider', min: 1, max: 10, labels: ['First timer', 'Veteran'] },
      { id: 'd4', label: 'What makes you change your mind on something?', type: 'chips', options: ['Strong evidence', 'Personal experience', 'Someone I respect', 'I rarely change my mind'] },
      { id: 'd5', label: 'Do you argue to win or to understand?', type: 'slider', min: 1, max: 10, labels: ['Win', 'Understand'] },
    ]
  },
  // ── SECTION 6: HOT OPINIONS (5 questions) ──
  {
    id: 'opinions', icon: '🔥', name: 'HOT OPINIONS',
    reward: { type: 'powerup', text: 'Free Reveal power-up', powerUpId: 'reveal' },
    questions: [
      { id: 'o1', label: 'AI will replace most jobs by 2035', type: 'slider', min: 1, max: 10, labels: ['Disagree', 'Agree'] },
      { id: 'o2', label: 'Social media does more harm than good', type: 'slider', min: 1, max: 10, labels: ['Disagree', 'Agree'] },
      { id: 'o3', label: 'College is still worth the cost', type: 'slider', min: 1, max: 10, labels: ['Disagree', 'Agree'] },
      { id: 'o4', label: 'What hill will you die on?', type: 'input', placeholder: 'Your #1 unpopular opinion' },
      { id: 'o5', label: 'The American Dream is still achievable', type: 'slider', min: 1, max: 10, labels: ['Disagree', 'Agree'] },
    ]
  },
  // ── SECTION 7: VALUES (5 questions) ──
  {
    id: 'values', icon: '⚖️', name: 'VALUES',
    reward: { type: 'powerup', text: 'Free 2x Multiplier power-up', powerUpId: 'multiplier_2x' },
    questions: [
      { id: 'v1', label: 'Freedom vs Security — where do you land?', type: 'slider', min: 1, max: 10, labels: ['Freedom', 'Security'] },
      { id: 'v2', label: 'Tradition vs Progress', type: 'slider', min: 1, max: 10, labels: ['Tradition', 'Progress'] },
      { id: 'v3', label: 'Individual vs Collective', type: 'slider', min: 1, max: 10, labels: ['Individual', 'Collective'] },
      { id: 'v4', label: 'Fairness means...', type: 'chips', options: ['Equal outcomes for all', 'Equal opportunity for all', 'People get what they earn', "Life isn't fair"] },
      { id: 'v5', label: 'What matters more in a leader?', type: 'chips', options: ['Strength', 'Empathy', 'Intelligence', 'Honesty'] },
    ]
  },
  // ── SECTION 8: MEDIA DIET (5 questions) ──
  {
    id: 'media', icon: '📱', name: 'MEDIA DIET',
    reward: { type: 'powerup', text: 'Free Silence power-up', powerUpId: 'silence' },
    questions: [
      { id: 'm1', label: 'Where do you get your news?', type: 'chips', multi: true, max: 3, options: ['TV News', 'Twitter/X', 'Reddit', 'Podcasts', 'Newspapers', 'YouTube', 'TikTok', 'Word of mouth'] },
      { id: 'm2', label: 'Daily screen time (hours)', type: 'slider', min: 1, max: 12, labels: ['1hr', '12hr'] },
      { id: 'm3', label: 'Do you trust mainstream media?', type: 'slider', min: 1, max: 10, labels: ['Not at all', 'Completely'] },
      { id: 'm4', label: 'How many podcasts do you follow regularly?', type: 'select', options: ['0', '1-2', '3-5', '6-10', '10+'] },
      { id: 'm5', label: 'Which platform do you open first in the morning?', type: 'chips', options: ['Instagram', 'Twitter/X', 'YouTube', 'TikTok', 'Reddit', 'Email', 'News app', 'None'] },
    ]
  },
  // ── SECTION 9: LIFESTYLE (5 questions) ──
  {
    id: 'lifestyle', icon: '🏠', name: 'LIFESTYLE',
    reward: { type: 'powerup', text: 'Free Shield power-up', powerUpId: 'shield' },
    questions: [
      { id: 'l1', label: 'Education level', type: 'select', options: ['High school', 'Some college', 'Associate', 'Bachelor', 'Master', 'Doctorate', 'Trade school', 'Self-taught'] },
      { id: 'l2', label: 'What field do you work in?', type: 'input', placeholder: 'e.g. Tech, Healthcare, Student...' },
      { id: 'l3', label: 'Urban, suburban, or rural?', type: 'chips', options: ['Urban', 'Suburban', 'Rural'] },
      { id: 'l4', label: 'Do you rent or own your home?', type: 'chips', options: ['Rent', 'Own', 'Live with family', 'Other'] },
      { id: 'l5', label: 'Relationship status', type: 'chips', options: ['Single', 'In a relationship', 'Married', 'Divorced', "It's complicated"] },
    ]
  },
  // ── SECTION 10: COMPETITIVE (5 questions) ──
  {
    id: 'competition', icon: '🏆', name: 'COMPETITIVE',
    reward: { type: 'powerup', text: 'Free Shield power-up', powerUpId: 'shield' },
    questions: [
      { id: 'c1', label: 'How competitive are you?', type: 'slider', min: 1, max: 10, labels: ['Chill', 'Win at all costs'] },
      { id: 'c2', label: 'Winning matters more than...', type: 'chips', options: ['Being liked', 'Being right', 'Having fun', 'Nothing — winning IS the point'] },
      { id: 'c3', label: 'Best debate strategy', type: 'chips', options: ['Let the facts speak', 'Quick wit', 'Stats & receipts', 'Read the room'] },
      { id: 'c4', label: 'Do you play competitive video games?', type: 'chips', options: ['Ranked grinder', 'Casual player', 'Sometimes', 'Never game'] },
      { id: 'c5', label: 'Ever played in an organized league or tournament?', type: 'chips', options: ['Currently active', 'Used to', "No but I'd try it", 'Not my thing'] },
    ]
  },
  // ── SECTION 11: SOCIAL (5 questions) ──
  {
    id: 'social', icon: '🤝', name: 'SOCIAL',
    reward: { type: 'powerup', text: 'Free Reveal power-up', powerUpId: 'reveal' },
    questions: [
      { id: 'x1', label: 'How did you hear about The Moderator?', type: 'chips', options: ['Friend', 'Social media', 'Search', 'Ad', 'Podcast', 'Other'] },
      { id: 'x2', label: 'Would you refer friends?', type: 'chips', options: ['Already did', 'Definitely', 'Maybe', 'Probably not'] },
      { id: 'x3', label: 'What would make this app essential?', type: 'input', placeholder: 'One feature that would hook you...' },
      { id: 'x4', label: 'How many close friends do you have?', type: 'select', options: ['0-1', '2-3', '4-6', '7-10', '10+'] },
      { id: 'x5', label: 'Introvert or extrovert?', type: 'slider', min: 1, max: 10, labels: ['Total introvert', 'Total extrovert'] },
    ]
  },
  // ── SECTION 12: IDENTITY (5 questions) ──
  {
    id: 'identity', icon: '🎭', name: 'IDENTITY',
    reward: { type: 'powerup', text: 'Free 2x Multiplier power-up', powerUpId: 'multiplier_2x' },
    questions: [
      { id: 'i1', label: 'Describe yourself in 3 words', type: 'input', placeholder: 'e.g. stubborn, funny, relentless' },
      { id: 'i2', label: 'Your debate walkout song would be...', type: 'input', placeholder: 'Name the track' },
      { id: 'i3', label: 'If you could debate anyone alive, who?', type: 'input', placeholder: 'Name them' },
      { id: 'i4', label: 'Why did you really download this app?', type: 'chips', options: ['Prove my point', 'Hear other sides', 'Entertainment', 'Get sharper', 'Talk my talk'] },
      { id: 'i5', label: 'People who disagree with you would say you\'re...', type: 'chips', options: ['Stubborn', 'Intimidating', 'Uninformed', 'Actually pretty fair'] },
    ]
  },
  // ── SECTION 13: MONEY (6 questions) — NEW ──
  {
    id: 'money', icon: '💰', name: 'MONEY',
    reward: { type: 'powerup', text: 'Free Silence power-up', powerUpId: 'silence' },
    questions: [
      { id: 'mn1', label: 'How would you describe your financial situation?', type: 'chips', options: ['Comfortable', 'Getting by', 'Struggling', 'Thriving'] },
      { id: 'mn2', label: 'Saver or spender?', type: 'slider', min: 1, max: 10, labels: ['Extreme saver', 'Extreme spender'] },
      { id: 'mn3', label: 'Do you invest?', type: 'chips', options: ['Stocks', 'Crypto', 'Real estate', 'Retirement only', 'No investing'] },
      { id: 'mn4', label: 'How much financial risk are you comfortable with?', type: 'slider', min: 1, max: 10, labels: ['Zero risk', 'YOLO'] },
      { id: 'mn5', label: 'Biggest financial priority right now?', type: 'chips', options: ['Paying off debt', 'Building savings', 'Investing', 'Living my life', 'Supporting family'] },
      { id: 'mn6', label: 'Do you trust banks and financial institutions?', type: 'slider', min: 1, max: 10, labels: ['Not at all', 'Completely'] },
    ]
  },
  // ── SECTION 14: HEALTH & WELLNESS (5 questions) — NEW ──
  {
    id: 'health', icon: '💪', name: 'HEALTH & WELLNESS',
    reward: { type: 'powerup', text: 'Free Shield power-up', powerUpId: 'shield' },
    questions: [
      { id: 'hw1', label: 'How would you rate your overall health?', type: 'slider', min: 1, max: 10, labels: ['Poor', 'Excellent'] },
      { id: 'hw2', label: 'How often do you exercise?', type: 'chips', options: ['Daily', 'Few times a week', 'Weekly', 'Rarely', 'Never'] },
      { id: 'hw3', label: 'Mental health is just as important as physical health', type: 'slider', min: 1, max: 10, labels: ['Disagree', 'Agree'] },
      { id: 'hw4', label: 'Do you trust doctors and the medical establishment?', type: 'slider', min: 1, max: 10, labels: ['Not at all', 'Completely'] },
      { id: 'hw5', label: 'What\'s your approach to wellness?', type: 'chips', options: ['Science-based', 'Natural/holistic', 'Mix of both', "Don't think about it"] },
    ]
  },
  // ── SECTION 15: TECHNOLOGY (5 questions) — NEW ──
  {
    id: 'technology', icon: '🤖', name: 'TECHNOLOGY',
    reward: { type: 'powerup', text: 'Free Reveal power-up', powerUpId: 'reveal' },
    questions: [
      { id: 'tc1', label: 'How do you feel about AI?', type: 'slider', min: 1, max: 10, labels: ['Terrified', 'Excited'] },
      { id: 'tc2', label: 'When it comes to new technology, you\'re a...', type: 'chips', options: ['First adopter', 'Early majority', 'Wait and see', 'Skeptic'] },
      { id: 'tc3', label: 'Phone ecosystem?', type: 'chips', options: ['iPhone', 'Android', "Don't care"] },
      { id: 'tc4', label: 'How much do you care about online privacy?', type: 'slider', min: 1, max: 10, labels: ['Not at all', 'Extremely'] },
      { id: 'tc5', label: 'Which tech company do you trust the most?', type: 'chips', options: ['Apple', 'Google', 'Microsoft', 'None of them'] },
    ]
  },
  // ── SECTION 16: FOOD & DRINK (5 questions) — NEW ──
  {
    id: 'food', icon: '🍔', name: 'FOOD & DRINK',
    reward: { type: 'powerup', text: 'Free Reveal power-up', powerUpId: 'reveal' },
    questions: [
      { id: 'fd1', label: 'Cook at home or eat out?', type: 'slider', min: 1, max: 10, labels: ['Always cook', 'Always eat out'] },
      { id: 'fd2', label: 'Do you drink alcohol?', type: 'chips', options: ['Regularly', 'Socially', 'Rarely', 'Never'] },
      { id: 'fd3', label: 'Any dietary preferences?', type: 'chips', multi: true, max: 2, options: ['No restrictions', 'Vegetarian', 'Vegan', 'Keto/low-carb', 'Gluten-free', 'Halal/Kosher'] },
      { id: 'fd4', label: 'How much do you spend on food delivery per month?', type: 'select', options: ['$0', '$1-25', '$25-50', '$50-100', '$100-200', '$200+'] },
      { id: 'fd5', label: 'Fast food: guilty pleasure or hard pass?', type: 'chips', options: ['Love it', 'Sometimes', 'Rarely', 'Never touch it'] },
    ]
  },
  // ── SECTION 17: SHOPPING & BRANDS (5 questions) — NEW ──
  {
    id: 'shopping', icon: '🛍️', name: 'SHOPPING & BRANDS',
    reward: { type: 'powerup', text: 'Free 2x Multiplier power-up', powerUpId: 'multiplier_2x' },
    questions: [
      { id: 'sh1', label: 'When you buy something, you...', type: 'chips', options: ['Research obsessively', 'Ask friends', 'Go with gut', 'Buy the cheapest', 'Buy the brand I know'] },
      { id: 'sh2', label: 'Where do you shop most?', type: 'chips', multi: true, max: 2, options: ['Amazon', 'In-store retail', 'Brand websites', 'TikTok/Instagram shops', 'Thrift/secondhand'] },
      { id: 'sh3', label: 'How brand-loyal are you?', type: 'slider', min: 1, max: 10, labels: ['Always switching', 'Ride or die'] },
      { id: 'sh4', label: 'What makes you try a new brand?', type: 'chips', options: ['Price', 'Friend recommendation', 'Online reviews', 'Ad that got me', 'Influencer'] },
      { id: 'sh5', label: 'Biggest purchase you\'re considering in the next 12 months?', type: 'chips', options: ['Car', 'Home/apartment', 'Electronics', 'Vacation', 'Nothing major'] },
    ]
  },
  // ── SECTION 18: TRUST (5 questions) — NEW ──
  {
    id: 'trust', icon: '🔒', name: 'TRUST',
    reward: { type: 'powerup', text: 'Free Silence power-up', powerUpId: 'silence' },
    questions: [
      { id: 'tr1', label: 'How much do you trust the government?', type: 'slider', min: 1, max: 10, labels: ['Not at all', 'Completely'] },
      { id: 'tr2', label: 'How much do you trust big corporations?', type: 'slider', min: 1, max: 10, labels: ['Not at all', 'Completely'] },
      { id: 'tr3', label: 'How much do you trust the court system?', type: 'slider', min: 1, max: 10, labels: ['Not at all', 'Completely'] },
      { id: 'tr4', label: 'How much do you trust science and research institutions?', type: 'slider', min: 1, max: 10, labels: ['Not at all', 'Completely'] },
      { id: 'tr5', label: 'Who do you trust most for information?', type: 'chips', options: ['Experts/academics', 'Friends and family', 'My own research', 'Nobody'] },
    ]
  },
  // ── SECTION 19: WHEELS (5 questions) — NEW ──
  {
    id: 'wheels', icon: '🚗', name: 'WHEELS',
    reward: { type: 'powerup', text: 'Free Shield power-up', powerUpId: 'shield' },
    questions: [
      { id: 'wh1', label: 'Do you own a car?', type: 'chips', options: ['Yes — own outright', 'Yes — making payments', "No — don't need one", "No — can't afford one"] },
      { id: 'wh2', label: 'EV, hybrid, or gas?', type: 'chips', options: ['Already drive EV', 'Considering EV', 'Hybrid', 'Gas forever', "Don't care"] },
      { id: 'wh3', label: 'What matters most in a vehicle?', type: 'chips', options: ['Reliability', 'Performance', 'Looks', 'Price', 'Fuel efficiency'] },
      { id: 'wh4', label: 'How do you get around most days?', type: 'chips', options: ['Personal car', 'Public transit', 'Rideshare', 'Bike/walk', 'Work from home'] },
      { id: 'wh5', label: 'When do you plan to buy your next vehicle?', type: 'select', options: ['Within 6 months', 'Within a year', '1-3 years', '3+ years', 'Not planning to'] },
    ]
  },
  // ── SECTION 20: PERSUASION (4 questions) — NEW ──
  {
    id: 'persuasion', icon: '🧠', name: 'PERSUASION',
    reward: { type: 'powerup', text: 'Free 2x Multiplier power-up', powerUpId: 'multiplier_2x' },
    questions: [
      { id: 'pr1', label: 'When someone disagrees with you, your first instinct is to...', type: 'chips', options: ['Listen and consider', 'Defend my position', 'Ask why', 'Disengage'] },
      { id: 'pr2', label: 'What kind of evidence do you find most convincing?', type: 'chips', options: ['Statistics and data', 'Expert testimony', 'Personal stories', 'Historical examples'] },
      { id: 'pr3', label: 'How often do you change your mind on important topics?', type: 'chips', options: ['Frequently', 'Sometimes', 'Rarely', 'Almost never'] },
      { id: 'pr4', label: 'Last time you changed your mind about something big, what caused it?', type: 'input', placeholder: 'What shifted your view?' },
    ]
  },
];

// ============================================================
// MILESTONE REWARDS (permanent cosmetic items at 25/50/75/100%)
// ============================================================

const DEPTH_MILESTONES = [
  { threshold: 25,  icon: '🏷️', name: 'Deep Diver',      desc: 'Unique title' },
  { threshold: 50,  icon: '🖼️', name: 'Insight Frame',    desc: 'Profile border' },
  { threshold: 75,  icon: '✨', name: "Scholar\u2019s Aura", desc: 'Profile background' },
  { threshold: 100, icon: '🎭', name: 'Grand Reveal',     desc: 'Entrance animation' },
];

// ============================================================
// STATE
// ============================================================

/** SESSION 64: Validate localStorage data */
function sanitizeAnswers(raw: unknown): Answers {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const clean: Answers = Object.create(null);
  const validIds = new Set<string>();
  SECTIONS.forEach(s => s.questions.forEach(q => validIds.add(q.id)));
  for (const key of Object.keys(raw as Record<string, unknown>)) {
    if (!validIds.has(key)) continue;
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === 'string' && v.length <= 500) clean[key] = v;
    else if (typeof v === 'number' && isFinite(v)) clean[key] = v;
    else if (Array.isArray(v) && v.length <= 20 && v.every((i: unknown) => typeof i === 'string' && (i as string).length <= 200)) clean[key] = v as string[];
  }
  return clean;
}

function sanitizeCompleted(raw: unknown): Set<string> {
  if (!Array.isArray(raw)) return new Set();
  const validIds = new Set(SECTIONS.map(s => s.id));
  return new Set(raw.filter((id: unknown) => typeof id === 'string' && validIds.has(id as string)) as string[]);
}

let answers: Answers;
try {
  answers = sanitizeAnswers(JSON.parse(localStorage.getItem('colosseum_profile_depth') || '{}'));
} catch {
  answers = {};
  localStorage.removeItem('colosseum_profile_depth');
}
let completedSections: Set<string>;
try {
  completedSections = sanitizeCompleted(JSON.parse(localStorage.getItem('colosseum_depth_complete') || '[]'));
} catch {
  completedSections = new Set();
  localStorage.removeItem('colosseum_depth_complete');
}
let activeSection: string | null = null;

// Session 117: Tier system state
let serverQuestionsAnswered = 0;
const previouslyAnsweredIds = new Set<string>();

// ============================================================
// TIER INTEGRATION (moderator-tiers.js globals)
// ============================================================

// These functions are loaded as globals from moderator-tiers.js <script> tag
const getTier = (window as unknown as Record<string, unknown>).getTier as
  ((qa: number) => { maxStake: number; slots: number; name: string }) | undefined;
const getNextTier = (window as unknown as Record<string, unknown>).getNextTier as
  ((qa: number) => { questionsNeeded: number; name: string } | null) | undefined;
const renderTierBadge = (window as unknown as Record<string, unknown>).renderTierBadge as
  ((qa: number) => string) | undefined;
const renderTierProgress = (window as unknown as Record<string, unknown>).renderTierProgress as
  ((qa: number) => string) | undefined;

// ============================================================
// HELPERS
// ============================================================

function hasAnswer(val: AnswerValue | undefined): boolean {
  if (val === undefined || val === '' || val === null) return false;
  if (Array.isArray(val) && val.length === 0) return false;
  return true;
}

function snapshotAnswered(): void {
  previouslyAnsweredIds.clear();
  SECTIONS.forEach(s => {
    s.questions.forEach(q => {
      if (hasAnswer(answers[q.id])) previouslyAnsweredIds.add(q.id);
    });
  });
}

function renderTierBannerUI(qa: number): void {
  if (!getTier) return;
  const banner = document.getElementById('tier-banner');
  if (!banner) return;

  const tier = getTier(qa);
  const next = getNextTier ? getNextTier(qa) : null;

  const perkText = tier.maxStake > 0
    ? 'Max stake: <span>' + (tier.maxStake === Infinity ? 'Unlimited' : tier.maxStake + ' tokens') + '</span>' +
      (tier.slots > 0 ? ' · Power-up slots: <span>' + tier.slots + '</span>' : '')
    : 'Answer ' + (next ? next.questionsNeeded : '10') + ' more questions to unlock token staking';

  banner.innerHTML =
    '<div class="tier-header">' +
      '<div class="tier-header-left">' +
        '<span class="tier-rank-label">RANK:</span>' +
        (renderTierBadge ? renderTierBadge(qa) : '') +
      '</div>' +
    '</div>' +
    (next
      ? '<div class="tier-unlock-hint">' +
          '<strong>' + escHtml(String(next.questionsNeeded)) + '</strong> more questions to unlock <strong>' + escHtml(next.name) + '</strong>' +
        '</div>'
      : '') +
    (renderTierProgress ? renderTierProgress(qa) : '') +
    '<div class="tier-perks">' + perkText + '</div>';

  banner.style.display = 'block';
}

function updateMilestoneBar(): void {
  const bar = document.getElementById('milestone-bar');
  if (!bar) return;
  const totalQ = 100;
  const answered = serverQuestionsAnswered;
  const pct = Math.min(100, Math.round((answered / totalQ) * 100));

  bar.innerHTML = `
    <div class="milestone-label">Profile Rewards</div>
    <div class="milestone-track">
      <div class="milestone-fill" style="width:${pct}%"></div>
      ${DEPTH_MILESTONES.map(m => {
        const earned = answered >= m.threshold;
        return `<div class="milestone-pip ${earned ? 'earned' : ''}" style="left:${m.threshold}%"
                     title="${escHtml(m.name)} — ${escHtml(m.desc)}">
          <span class="pip-icon">${earned ? '✅' : m.icon}</span>
          <span class="pip-label">${escHtml(m.name)}</span>
        </div>`;
      }).join('')}
    </div>
    <div class="milestone-pct">${answered} of ${totalQ} questions answered — ${pct}%</div>
  `;
}

function ringSVG(pct: number): string {
  const circumference = 2 * Math.PI * 9;
  const offset = circumference - (pct / 100) * circumference;
  return `<svg><circle class="ring-bg" cx="11" cy="11" r="9"/><circle class="ring-fill" cx="11" cy="11" r="9" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/></svg>`;
}

function sectionPct(section: Section): number {
  const total = section.questions.length;
  let answered = 0;
  section.questions.forEach(q => { if (hasAnswer(answers[q.id])) answered++; });
  return Math.round((answered / total) * 100);
}

// ============================================================
// RENDER
// ============================================================

function renderGrid(): void {
  const grid = document.getElementById('section-grid');
  if (!grid) return;

  grid.innerHTML = SECTIONS.map(s => {
    const done = completedSections.has(s.id);
    const pct = sectionPct(s);
    const isActive = activeSection === s.id;
    return `
      <div class="section-tile ${done ? 'complete' : ''} ${isActive ? 'active-section' : ''}" data-section="${escHtml(s.id)}">
        ${done ? '<span class="section-check">✅</span>' : `<div class="section-ring">${ringSVG(pct)}</div>`}
        <div class="section-icon">${escHtml(s.icon)}</div>
        <div class="section-name">${escHtml(s.name)}</div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.section-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      const sectionId = (tile as HTMLElement).dataset.section;
      if (sectionId) openSection(sectionId);
    });
  });
}

function renderQuestion(q: Question): string {
  const val = answers[q.id];

  if (q.type === 'input') {
    return `
      <div class="question-card">
        <div class="question-label">${escHtml(q.label)}</div>
        <input class="q-input" data-qid="${escHtml(q.id)}" type="text" placeholder="${escHtml(q.placeholder ?? '')}" value="${escHtml((val as string) ?? '')}" maxlength="500">
      </div>`;
  }

  if (q.type === 'chips') {
    const selected: string[] = q.multi ? (Array.isArray(val) ? val : []) : (val ? [val as string] : []);
    return `
      <div class="question-card">
        <div class="question-label">${escHtml(q.label)}${q.max ? ` (max ${q.max})` : ''}</div>
        <div class="chip-group" data-qid="${escHtml(q.id)}" data-multi="${!!q.multi}" data-max="${q.max ?? 99}">
          ${q.options.map(o => `<div class="chip ${selected.includes(o) ? 'selected' : ''}" data-val="${escHtml(o)}">${escHtml(o)}</div>`).join('')}
        </div>
      </div>`;
  }

  if (q.type === 'slider') {
    const current = val !== undefined ? Number(val) : Math.round((q.min + q.max) / 2);
    return `
      <div class="question-card">
        <div class="question-label">${escHtml(q.label)}</div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--white-dim);margin-bottom:4px;">
          <span>${escHtml(q.labels[0])}</span><span>${escHtml(q.labels[1])}</span>
        </div>
        <div class="slider-row">
          <input class="q-slider" data-qid="${escHtml(q.id)}" type="range" min="${q.min}" max="${q.max}" value="${current}">
          <span class="slider-val" id="slider-val-${escHtml(q.id)}">${current}</span>
        </div>
      </div>`;
  }

  if (q.type === 'select') {
    return `
      <div class="question-card">
        <div class="question-label">${escHtml(q.label)}</div>
        <select class="q-select" data-qid="${escHtml(q.id)}">
          <option value="" disabled ${!val ? 'selected' : ''}>Choose one...</option>
          ${q.options.map(o => `<option value="${escHtml(o)}" ${val === o ? 'selected' : ''}>${escHtml(o)}</option>`).join('')}
        </select>
      </div>`;
  }

  return '';
}

// ============================================================
// SECTION INTERACTION
// ============================================================

function openSection(sectionId: string): void {
  activeSection = sectionId;
  const section = SECTIONS.find(s => s.id === sectionId);
  if (!section) return;

  const panel = document.getElementById('question-panel');
  if (!panel) return;
  panel.classList.add('open');

  panel.innerHTML = `
    <div class="panel-header">
      <div class="panel-title">${escHtml(section.icon)} ${escHtml(section.name)}</div>
      <div class="panel-reward">⚡ ${escHtml(section.reward.text)}</div>
    </div>
    ${section.questions.map(q => renderQuestion(q)).join('')}
    <button class="save-section-btn" id="save-section-btn">SAVE & UNLOCK REWARD</button>
  `;

  wireQuestions();
  document.getElementById('save-section-btn')?.addEventListener('click', () => saveSection(section));
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  renderGrid();
}

function wireQuestions(): void {
  // Inputs
  document.querySelectorAll<HTMLInputElement>('.q-input').forEach(el => {
    el.addEventListener('input', () => {
      const qid = el.dataset.qid;
      if (qid) answers[qid] = el.value;
    });
  });

  // Chips
  document.querySelectorAll<HTMLElement>('.chip-group').forEach(group => {
    const isMulti = group.dataset.multi === 'true';
    const max = parseInt(group.dataset.max ?? '99') || 99;
    group.querySelectorAll<HTMLElement>('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const qid = group.dataset.qid;
        const val = chip.dataset.val;
        if (!qid || !val) return;
        if (isMulti) {
          let arr = Array.isArray(answers[qid]) ? [...(answers[qid] as string[])] : [];
          if (arr.includes(val)) {
            arr = arr.filter(v => v !== val);
            chip.classList.remove('selected');
          } else if (arr.length < max) {
            arr.push(val);
            chip.classList.add('selected');
          }
          answers[qid] = arr;
        } else {
          group.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
          chip.classList.add('selected');
          answers[qid] = val;
        }
      });
    });
  });

  // Sliders
  document.querySelectorAll<HTMLInputElement>('.q-slider').forEach(el => {
    el.addEventListener('input', () => {
      const qid = el.dataset.qid;
      if (!qid) return;
      answers[qid] = parseInt(el.value);
      const label = document.getElementById('slider-val-' + qid);
      if (label) label.textContent = el.value;
    });
  });

  // Selects
  document.querySelectorAll<HTMLSelectElement>('.q-select').forEach(el => {
    el.addEventListener('change', () => {
      const qid = el.dataset.qid;
      if (qid) answers[qid] = el.value;
    });
  });
}

// ============================================================
// SAVE SECTION
// ============================================================

async function saveSection(section: Section): Promise<void> {
  let allAnswered = true;
  section.questions.forEach(q => {
    if (!hasAnswer(answers[q.id])) allAnswered = false;
  });

  // Save to localStorage
  localStorage.setItem('colosseum_profile_depth', JSON.stringify(answers));

  if (allAnswered) {
    completedSections.add(section.id);
    localStorage.setItem('colosseum_depth_complete', JSON.stringify([...completedSections]));

    // Session 72: Token milestone check
    checkProfileMilestones(completedSections.size);

    showReward(section.reward);
  }

  // Save to Supabase
  const isPlaceholder = getIsPlaceholderMode();

  if (getCurrentUser() && !isPlaceholder) {
    try {
      const sectionAnswers: Record<string, AnswerValue> = {};
      section.questions.forEach(q => {
        if (answers[q.id] !== undefined) sectionAnswers[q.id] = answers[q.id];
      });

      const { error } = await safeRpc('save_profile_depth', {
        p_section_id: section.id,
        p_answers: sectionAnswers,
      });
      if (error) console.error('save_profile_depth error:', error);

      // Session 117: Increment questions_answered for newly answered questions
      let newCount = 0;
      section.questions.forEach(q => {
        if (hasAnswer(answers[q.id]) && !previouslyAnsweredIds.has(q.id)) {
          newCount++;
          previouslyAnsweredIds.add(q.id);
        }
      });

      if (newCount > 0) {
        const incResult = await safeRpc('increment_questions_answered', { p_count: newCount });
        const incData = incResult as { data?: { ok?: boolean; questions_answered?: number } | null; error?: unknown };
        if (incData.error) {
          console.error('increment_questions_answered error:', incData.error);
        } else if (incData.data?.ok) {
          serverQuestionsAnswered = incData.data.questions_answered ?? serverQuestionsAnswered;
          renderTierBannerUI(serverQuestionsAnswered);
          updateMilestoneBar();
        }
      }

      // Session 232: Claim free power-up reward for completing section
      if (allAnswered) {
        const claimResult = await safeRpc('claim_section_reward', { p_section_id: section.id });
        const claimData = claimResult as { data?: { success?: boolean; power_up_name?: string } | null; error?: unknown };
        if (claimData.data?.success) {
          console.log('Section reward claimed:', claimData.data.power_up_name);
        }
      }
    } catch (e) {
      console.error('save_profile_depth exception:', e);
    }
  }

  updateMilestoneBar();
  renderGrid();

  if (allAnswered) {
    setTimeout(() => {
      document.getElementById('question-panel')?.classList.remove('open');
      activeSection = null;
      renderGrid();
    }, 2000);
  }
}

// ============================================================
// REWARD TOAST
// ============================================================

function showReward(reward: SectionReward): void {
  const puIcons: Record<string, string> = { reveal: '👁️', multiplier_2x: '⚡', silence: '🤫', shield: '🛡️' };
  const iconEl = document.getElementById('reward-icon');
  if (iconEl) iconEl.textContent = puIcons[reward.powerUpId] ?? '⚡';
  const textEl = document.getElementById('reward-text');
  if (textEl) textEl.textContent = 'POWER-UP EARNED';
  const descEl = document.getElementById('reward-desc');
  if (descEl) descEl.textContent = reward.text;

  const toast = document.getElementById('reward-toast');
  if (toast) {
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }
}

// ============================================================
// INIT
// ============================================================

window.addEventListener('DOMContentLoaded', async () => {
  if (!FEATURES.profileDepth) return;
  const isPlaceholder = getIsPlaceholderMode();

  // SESSION 32: Members Zone auth gate
  await Promise.race([ready, new Promise<void>(r => setTimeout(r, 6000))]);
  if (!getCurrentUser() && !isPlaceholder) {
    window.location.href = 'moderator-plinko.html';
    return;
  }

  snapshotAnswered();
  renderGrid();
  updateMilestoneBar();

  // Session 117: Fetch questions_answered and render tier banner
  if (getCurrentUser() && !isPlaceholder) {
    try {
      const sb = getSupabaseClient() as { from: (t: string) => { select: (c: string) => { eq: (c: string, v: string) => { single: () => Promise<{ data: { questions_answered?: number } | null; error: unknown }> } } } } | null;
      const user = getCurrentUser() as { id: string };

      if (sb) {
        const { data: profile, error } = await sb
          .from('profiles')
          .select('questions_answered')
          .eq('id', user.id)
          .single();

        if (!error && profile) {
          serverQuestionsAnswered = profile.questions_answered ?? 0;

          // Migration sync: if server is 0 but user has local answers, catch up
          if (serverQuestionsAnswered === 0 && previouslyAnsweredIds.size > 0) {
            const syncResult = await safeRpc('increment_questions_answered', { p_count: previouslyAnsweredIds.size });
            const syncData = syncResult as { data?: { ok?: boolean; questions_answered?: number } | null };
            if (syncData.data?.ok) {
              serverQuestionsAnswered = syncData.data.questions_answered ?? serverQuestionsAnswered;
            }
          }

          renderTierBannerUI(serverQuestionsAnswered);
          updateMilestoneBar();
        }
      }
    } catch (e) {
      console.error('Tier fetch error:', e);
    }
  }
});
